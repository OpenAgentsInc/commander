Okay, Agent, the next phase of the `SELLING_COMPUTE` plan is to enable **Dynamic Relay Configuration for the Data Vending Machine (DVM)**.

Currently, the `Kind5050DVMService` implicitly uses the default relays configured in `NostrService`. We need to modify it so that when the DVM goes online, it subscribes to the relays specified in the user's DVM settings.

This will involve:

1.  Modifying the `NostrService.subscribeToEvents` method to accept an optional list of relays for a specific subscription.
2.  Updating `Kind5050DVMServiceImpl.ts` to fetch the user-configured relays from `useDVMSettingsStore` and pass them to `nostr.subscribeToEvents`.
3.  Ensuring appropriate telemetry and tests are updated.

Here are the specific instructions:

**I. Modify `NostrService` for Per-Subscription Relays**

1.  **File: `src/services/nostr/NostrService.ts`**

    - Update the `subscribeToEvents` method in the `NostrService` interface:
      - Add an optional `relays?: readonly string[]` parameter.

    ```typescript
    // src/services/nostr/NostrService.ts
    // ... (other imports and types)

    export interface NostrService {
      getPool(): Effect.Effect<SimplePool, NostrPoolError, never>;
      listEvents(
        filters: NostrFilter[],
      ): Effect.Effect<NostrEvent[], NostrRequestError, never>;
      publishEvent(
        event: NostrEvent,
      ): Effect.Effect<void, NostrPublishError, never>;
      cleanupPool(): Effect.Effect<void, NostrPoolError, never>;

      subscribeToEvents(
        filters: NostrFilter[],
        onEvent: (event: NostrEvent) => void,
        relays?: readonly string[], // <-- Add this optional parameter
        onEOSE?: () => void,
      ): Effect.Effect<Subscription, NostrRequestError, never>;
    }

    // ... (rest of the file)
    ```

2.  **File: `src/services/nostr/NostrServiceImpl.ts`**

    - Update the `subscribeToEvents` method implementation:
      - Accept the new optional `relays` parameter.
      - If `relays` are provided and not empty, use them for `pool.subscribe`. Otherwise, use `config.relays`.
      - Update telemetry to log which relays are being used for the subscription.

    ```typescript
    // src/services/nostr/NostrServiceImpl.ts
    // ... (imports)

    export function createNostrService(
      config: NostrServiceConfig,
    ): NostrService {
      // ... (getPoolEffect and other methods as before) ...

      return {
        // ... (getPool, listEvents, publishEvent, cleanupPool as before) ...

        subscribeToEvents: (
          filters: NostrFilter[],
          onEvent: (event: NostrEvent) => void,
          customRelays?: readonly string[], // <-- Add parameter here
          onEOSE?: () => void,
        ) =>
          Effect.gen(function* (_) {
            const pool = yield* _(
              getPoolEffect, // Assuming getPoolEffect is defined as in your provided file
              Effect.mapError(
                (error) =>
                  new NostrRequestError({
                    message: `Failed to initialize pool for subscription: ${error.message}`,
                    cause: error.cause,
                  }),
              ),
            );

            const relaysToUse =
              customRelays && customRelays.length > 0
                ? customRelays
                : config.relays;

            if (relaysToUse.length === 0) {
              return yield* _(
                Effect.fail(
                  new NostrRequestError({
                    message:
                      "No relays specified for subscription and no default relays configured.",
                  }),
                ),
              );
            }

            try {
              // Log which relays are being used
              Effect.runFork(
                Effect.provide(
                  Effect.flatMap(TelemetryService, (ts) =>
                    ts.trackEvent({
                      category: "nostr:subscribe",
                      action: "attempt_subscription",
                      label: `Filters: ${filters.length}, Relays: ${relaysToUse.join(", ")}`,
                    }),
                  ),
                  Layer.provide(
                    TelemetryServiceLive,
                    DefaultTelemetryConfigLayer,
                  ),
                ),
              );

              const subParams = {
                onevent: (event: any) => {
                  onEvent(event as NostrEvent);
                },
                oneose: onEOSE
                  ? () => {
                      onEOSE();
                    }
                  : undefined,
                // Optional: Add onclosed and onerror handlers if needed
              };

              const subCloser = pool.subscribe(
                relaysToUse as string[],
                filters[0],
                subParams,
              );

              Effect.runFork(
                Effect.provide(
                  Effect.flatMap(TelemetryService, (ts) =>
                    ts.trackEvent({
                      category: "nostr:subscribe",
                      action: "subscription_created",
                      label: `Subscription ID (client-side): ${subCloser.id ?? "unknown"}`,
                    }),
                  ),
                  Layer.provide(
                    TelemetryServiceLive,
                    DefaultTelemetryConfigLayer,
                  ),
                ),
              );

              return {
                unsub: () => {
                  Effect.runFork(
                    Effect.provide(
                      Effect.flatMap(TelemetryService, (ts) =>
                        ts.trackEvent({
                          category: "nostr:subscribe",
                          action: "unsubscribed",
                          label: `Subscription ID (client-side): ${subCloser.id ?? "unknown"}`,
                        }),
                      ),
                      Layer.provide(
                        TelemetryServiceLive,
                        DefaultTelemetryConfigLayer,
                      ),
                    ),
                  );
                  subCloser.close();
                },
              };
            } catch (error) {
              return yield* _(
                Effect.fail(
                  new NostrRequestError({
                    message: "Failed to create subscription via pool.subscribe",
                    cause: error,
                  }),
                ),
              );
            }
          }),
      };
    }

    // ... (NostrServiceLive as before) ...
    ```

**II. Update `Kind5050DVMService` to Use User-Configured Relays**

1.  **File: `src/services/dvm/Kind5050DVMServiceImpl.ts`**

    - In the `startListening` method:
      - Fetch `currentEffectiveConfig` using `useDVMSettingsStore.getState().getEffectiveConfig()`.
      - Pass `currentEffectiveConfig.relays` to the `nostr.subscribeToEvents` call as the new third argument.
      - Update the telemetry event for `start_listening_attempt` to include the specific relays being used from the effective config.

    ```typescript
    // src/services/dvm/Kind5050DVMServiceImpl.ts
    // ... (imports, including useDVMSettingsStore) ...

    export const Kind5050DVMServiceLive = Layer.scoped(
      Kind5050DVMService,
      Effect.gen(function* (_) {
        const defaultConfig = yield* _(Kind5050DVMServiceConfigTag); // Default config for fallbacks
        const telemetry = yield* _(TelemetryService);
        const nostr = yield* _(NostrService);
        const ollama = yield* _(OllamaService);
        const spark = yield* _(SparkService);
        const nip04 = yield* _(NIP04Service);

        let isActiveInternal = useDVMSettingsStore
          .getState()
          .getEffectiveConfig().active; // Initialize based on effective config
        let currentSubscription: Subscription | null = null;
        // currentDvmPublicKeyHex is already correctly initialized and updated in your existing code
        let currentDvmPublicKeyHex =
          useDVMSettingsStore.getState().getDerivedPublicKeyHex() ||
          defaultConfig.dvmPublicKeyHex;

        // ... (publishFeedback, processJobRequestInternal, createNip90FeedbackEvent, createNip90JobResultEvent as before,
        // ensuring they use dvmPrivateKeyHex from the effective config where needed) ...
        // Make sure processJobRequestInternal is using the LATEST effective config for things like pricing, private key
        // by calling useDVMSettingsStore.getState().getEffectiveConfig() at the start of that function.

        return {
          startListening: () =>
            Effect.gen(function* (_) {
              if (isActiveInternal) {
                yield* _(
                  telemetry
                    .trackEvent({
                      category: "dvm:status",
                      action: "start_listening_already_active",
                    })
                    .pipe(Effect.ignoreLogged),
                );
                return;
              }

              // Fetch the LATEST effective config when starting to listen
              const effectiveConfig = useDVMSettingsStore
                .getState()
                .getEffectiveConfig();
              currentDvmPublicKeyHex = effectiveConfig.dvmPublicKeyHex; // Update internal PK based on current settings

              if (!effectiveConfig.dvmPrivateKeyHex) {
                return yield* _(
                  Effect.fail(
                    new DVMConfigError({
                      message: "DVM private key not configured.",
                    }),
                  ),
                );
              }
              if (effectiveConfig.relays.length === 0) {
                return yield* _(
                  Effect.fail(
                    new DVMConfigError({
                      message: "No DVM relays configured.",
                    }),
                  ),
                );
              }

              yield* _(
                telemetry
                  .trackEvent({
                    category: "dvm:status",
                    action: "start_listening_attempt",
                    label: `Relays: ${effectiveConfig.relays.join(", ")}, Kinds: ${effectiveConfig.supportedJobKinds.join(", ")}`,
                  })
                  .pipe(Effect.ignoreLogged),
              );

              const jobRequestFilter: NostrFilter = {
                kinds: effectiveConfig.supportedJobKinds,
                since: Math.floor(Date.now() / 1000) - 300, // Start with recent jobs
              };

              const sub = yield* _(
                nostr
                  .subscribeToEvents(
                    [jobRequestFilter],
                    (event: NostrEvent) => {
                      const latestConfig = useDVMSettingsStore
                        .getState()
                        .getEffectiveConfig(); // Get latest config for this check
                      if (
                        event.pubkey === latestConfig.dvmPublicKeyHex &&
                        (event.kind === 7000 ||
                          (event.kind >= 6000 && event.kind <= 6999))
                      )
                        return;
                      Effect.runFork(processJobRequestInternal(event));
                    },
                    effectiveConfig.relays, // Pass the effective relays here
                    () => {
                      // onEOSE callback (optional)
                      Effect.runFork(
                        telemetry
                          .trackEvent({
                            category: "dvm:nostr",
                            action: "subscription_eose",
                            label: `EOSE received for DVM job kinds: ${effectiveConfig.supportedJobKinds.join(", ")}`,
                          })
                          .pipe(Effect.ignoreLogged),
                      );
                    },
                  )
                  .pipe(
                    Effect.mapError(
                      (e) =>
                        new DVMConnectionError({
                          message:
                            "Failed to subscribe to Nostr for DVM requests",
                          cause: e,
                        }),
                    ),
                  ),
              );

              currentSubscription = sub;
              isActiveInternal = true;
              yield* _(
                telemetry
                  .trackEvent({
                    category: "dvm:status",
                    action: "start_listening_success",
                  })
                  .pipe(Effect.ignoreLogged),
              );
            }),

          // ... (stopListening and isListening methods as before, they use isActiveInternal) ...
          stopListening: () =>
            Effect.gen(function* (_) {
              if (!isActiveInternal) {
                yield* _(
                  telemetry
                    .trackEvent({
                      category: "dvm:status",
                      action: "stop_listening_already_inactive",
                    })
                    .pipe(Effect.ignoreLogged),
                );
                return;
              }
              yield* _(
                telemetry
                  .trackEvent({
                    category: "dvm:status",
                    action: "stop_listening_attempt",
                  })
                  .pipe(Effect.ignoreLogged),
              );

              if (currentSubscription) {
                try {
                  currentSubscription.unsub();
                  currentSubscription = null;
                } catch (e) {
                  yield* _(
                    telemetry
                      .trackEvent({
                        category: "dvm:error",
                        action: "stop_listening_unsub_failure",
                        label: e instanceof Error ? e.message : String(e),
                      })
                      .pipe(Effect.ignoreLogged),
                  );
                }
              }
              isActiveInternal = false;
              yield* _(
                telemetry
                  .trackEvent({
                    category: "dvm:status",
                    action: "stop_listening_success",
                  })
                  .pipe(Effect.ignoreLogged),
              );
            }),

          isListening: () => Effect.succeed(isActiveInternal),
        };
      }),
    );
    ```

**III. Update Tests (Conceptual)**

- **`src/tests/unit/services/nostr/NostrService.test.ts`:**
  - Add test cases for `subscribeToEvents` to verify that if the `relays` argument is provided, `pool.subscribe` is called with those relays.
  - Verify that if `relays` argument is _not_ provided, `pool.subscribe` is called with `config.relays`.
- **`src/tests/unit/services/dvm/Kind5050DVMService.test.ts`:**
  - When testing `startListening`, mock `useDVMSettingsStore.getState().getEffectiveConfig()` to return a config with specific test relays.
  - Verify that `mockNostrService.subscribeToEvents` is called with these test relays as the third argument.

**IV. Manual Testing**

- After implementation, manually test by:
  1.  Starting the DVM with default relays (leave relays blank in settings). Check console/telemetry to see which relays it connects to for subscriptions.
  2.  Going offline.
  3.  Configuring a custom, different set of relays in the DVM settings dialog.
  4.  Going online again. Check console/telemetry to verify the DVM now subscribes to the new custom relays.

This set of instructions focuses on making the DVM service use the relays from user settings for its NIP-90 job subscriptions. It does not yet make `NostrService` itself fully dynamic in terms of its default pool relays for other potential subscribers within the app.```typescript
// File: src/services/nostr/NostrService.ts
import { Effect, Context, Data, Layer } from "effect";
import type { SimplePool } from "nostr-tools/pool";

// Define our own Sub type similar to nostr-tools
interface NostrToolsSub {
unsub: () => void;
// Add other properties from nostr-tools Sub if needed, like 'id'
id?: string;
}

// --- Custom Error Types ---
export class NostrPoolError extends Data.TaggedError("NostrPoolError")<{
message: string;
cause?: unknown;
}> {}

export class NostrRequestError extends Data.TaggedError("NostrRequestError")<{
message: string;
cause?: unknown;
}> {}

export class NostrPublishError extends Data.TaggedError("NostrPublishError")<{
message: string;
cause?: unknown;
}> {}

// --- NostrEvent Type (simplification of NostrToolsEvent) ---
export interface NostrEvent {
id: string;
kind: number;
tags: string[][];
content: string;
created_at: number;
pubkey: string;
sig: string;
}

// --- NostrFilter Type (simplification of NostrToolsFilter) ---
export interface NostrFilter {
ids?: string[];
kinds?: number[];
authors?: string[];
since?: number;
until?: number;
limit?: number;
search?: string;
[key: `#${string}`]: string[] | undefined;
}

// --- Subscription Type ---
export interface Subscription {
unsub: () => void;
}

// --- Service Configuration ---
export interface NostrServiceConfig {
readonly relays: readonly string[];
readonly requestTimeoutMs: number;
}

export const NostrServiceConfigTag = Context.GenericTag<NostrServiceConfig>("NostrServiceConfig");

// --- Default Configuration Layer ---
export const DefaultNostrServiceConfigLayer = Layer.succeed(
NostrServiceConfigTag,
{
relays: [
"wss://purplepag.es/",
"wss://nos.lol/",
"wss://relay.damus.io/",
"wss://relay.snort.social/",
"wss://offchain.pub/",
"wss://nostr-pub.wellorder.net/"
],
requestTimeoutMs: 10000 // 10 seconds
}
);

// --- Service Interface ---
export interface NostrService {
getPool(): Effect.Effect<SimplePool, NostrPoolError, never>;
listEvents(filters: NostrFilter[]): Effect.Effect<NostrEvent[], NostrRequestError, never>;
publishEvent(event: NostrEvent): Effect.Effect<void, NostrPublishError, never>;
cleanupPool(): Effect.Effect<void, NostrPoolError, never>;

subscribeToEvents(
filters: NostrFilter[],
onEvent: (event: NostrEvent) => void,
customRelays?: readonly string[], // <-- Updated: optional relays parameter
onEOSE?: () => void
): Effect.Effect<Subscription, NostrRequestError, never>;
}

export const NostrService = Context.GenericTag<NostrService>("NostrService");

// File: src/services/nostr/NostrServiceImpl.ts
import { Effect, Layer, Context, Cause } from "effect";
import { runPromise } from "effect/Effect"; // Import runPromise from Effect
import { provide } from "effect/Layer"; // Import provide from Layer
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer, type TelemetryEvent } from "@/services/telemetry";
import { SimplePool } from "nostr-tools";
import type { Filter as NostrToolsFilter } from "nostr-tools"; // Ensure NostrToolsFilter is imported
import {
NostrService,
NostrServiceConfigTag,
type NostrServiceConfig,
type NostrEvent,
type NostrFilter,
NostrPoolError,
NostrRequestError,
NostrPublishError,
type Subscription // Ensure Subscription type is imported or defined
} from "./NostrService";

// Real implementation that connects to actual Nostr relays
export function createNostrService(config: NostrServiceConfig): NostrService {
let poolInstance: SimplePool | null = null;

const getPoolEffect = Effect.try({
try: () => {
if (!poolInstance) {
poolInstance = new SimplePool();

        const initEvent: TelemetryEvent = {
          category: "log:info",
          action: "nostr_pool_initialize",
          label: "[Nostr] Pool initialized with relays",
          value: JSON.stringify(config.relays)
        };

        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(initEvent));
        }).pipe(
          provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
          (effect) => runPromise(effect).catch((err: unknown) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
      }
      return poolInstance;
    },
    catch: (error) => new NostrPoolError({ message: "Failed to initialize Nostr pool", cause: error }),

});

return {
getPool: () => getPoolEffect,

    listEvents: (filters: NostrFilter[]) =>
      Effect.gen(function*(_) {
        const pool = yield* _(
          getPoolEffect,
          Effect.mapError(error => new NostrRequestError({
            message: `Failed to initialize pool: ${error.message}`,
            cause: error.cause
          }))
        );

        const fetchingEvent: TelemetryEvent = {
          category: "log:info",
          action: "nostr_fetch_begin",
          label: "[Nostr] Fetching events with filters",
          value: JSON.stringify(filters)
        };

        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(fetchingEvent));
        }).pipe(
          provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
          (effect) => runPromise(effect).catch((err: unknown) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );

        try {
          const events = yield* _(
            Effect.tryPromise({
              try: () => pool.querySync(config.relays as string[], filters[0] as NostrToolsFilter, { maxWait: config.requestTimeoutMs / 2 }),
              catch: (error) => new NostrRequestError({ message: "Failed to fetch events from relays", cause: error }),
            }),
            Effect.timeout(config.requestTimeoutMs),
            Effect.mapError((e) => {
              if (e._tag === "TimeoutException") {
                return new NostrRequestError({ message: `Relay request timed out after ${config.requestTimeoutMs}ms` });
              }
              return e as NostrRequestError;
            })
          );

          const fetchSuccessEvent: TelemetryEvent = {
            category: "log:info",
            action: "nostr_fetch_success",
            label: `[Nostr] Fetched ${events.length} events`
          };

          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(fetchSuccessEvent));
          }).pipe(
            provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
            (effect) => runPromise(effect).catch((err: unknown) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
            })
          );

          return events.sort((a, b) => b.created_at - a.created_at) as NostrEvent[];
        } catch (error) {
          const fetchErrorEvent: TelemetryEvent = {
            category: "log:error",
            action: "nostr_fetch_error",
            label: "[Nostr] Error fetching events",
            value: error instanceof Error ?
              JSON.stringify({ message: error.message, stack: error.stack }) :
              String(error)
          };

          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(fetchErrorEvent));
          }).pipe(
            provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
            (effect) => runPromise(effect).catch((err: unknown) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
            })
          );

          throw new NostrRequestError({
            message: error instanceof Error ? error.message : "Unknown error fetching events",
            cause: error
          });
        }
      }),

    publishEvent: (event: NostrEvent) =>
      Effect.gen(function*(_) {
        if (config.relays.length === 0) {
          const noRelaysEvent: TelemetryEvent = {
            category: "log:error", action: "nostr_publish_no_relays",
            label: "[Nostr] Cannot publish event: No relays configured.", value: `Event ID: ${event.id}`
          };
          Effect.gen(function* (_telem) {
            const telemetryService = yield* _telem(TelemetryService);
            yield* _telem(telemetryService.trackEvent(noRelaysEvent));
          }).pipe(provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
            (effect) => runPromise(effect).catch((err: unknown) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent for no_relays failed:", err instanceof Error ? err.message : String(err));
            }));
          return yield* _(Effect.fail(new NostrPublishError({ message: "Cannot publish event: No relays configured." })));
        }
        const pool = yield* _(
          getPoolEffect,
          Effect.mapError(error => new NostrPublishError({ message: `Failed to initialize pool: ${error.message}`, cause: error.cause }))
        );
        const publishEventTelemetry: TelemetryEvent = {
          category: "log:info", action: "nostr_publish_begin",
          label: "[Nostr] Publishing event", value: event.id
        };
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(publishEventTelemetry));
        }).pipe(provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
          (effect) => runPromise(effect).catch((err: unknown) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          }));
        try {
          const results = yield* _(Effect.tryPromise({
            try: () => Promise.allSettled(pool.publish(config.relays as string[], event)),
            catch: (error) => new NostrPublishError({ message: "Failed to publish event", cause: error }),
          }));
          const successfulRelays = results.filter(r => r.status === 'fulfilled');
          const failedRelays = results.filter(r => r.status === 'rejected');
          const successfulCount = successfulRelays.length;
          const failedCount = failedRelays.length;
          if (successfulCount === 0 && failedCount > 0) {
            const totalFailureReasons = failedRelays.map(fr => (fr as PromiseRejectedResult).reason).join(", ");
            const totalFailureEvent: TelemetryEvent = {
              category: "log:error", action: "nostr_publish_total_failure",
              label: `[Nostr] Failed to publish event ${event.id} to all ${failedCount} configured relays.`,
              value: `Reasons: ${totalFailureReasons}`
            };
            Effect.gen(function* (_telem) {
              const telemetryService = yield* _telem(TelemetryService);
              yield* _telem(telemetryService.trackEvent(totalFailureEvent));
            }).pipe(provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent for total_failure failed:", err instanceof Error ? err.message : String(err));
              }));
            return yield* _(Effect.fail(new NostrPublishError({
              message: `Failed to publish event ${event.id} to any of the ${config.relays.length} configured relays. All ${failedCount} attempts failed.`,
              cause: totalFailureReasons
            })));
          } else if (successfulCount > 0 && failedCount > 0) {
            const partialFailureReasons = failedRelays.map(fr => (fr as PromiseRejectedResult).reason).join(", ");
            const publishWarningEvent: TelemetryEvent = {
              category: "log:warn", action: "nostr_publish_partial_failure",
              label: `[Nostr] Partially published event ${event.id}: ${successfulCount} succeeded, ${failedCount} failed.`,
              value: `Failures: ${partialFailureReasons}`
            };
            Effect.gen(function* (_telem) {
              const telemetryService = yield* _telem(TelemetryService);
              yield* _telem(telemetryService.trackEvent(publishWarningEvent));
            }).pipe(provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent for partial_failure failed:", err instanceof Error ? err.message : String(err));
              }));
            return Effect.void;
          } else if (successfulCount > 0 && failedCount === 0) {
            const publishSuccessEvent: TelemetryEvent = {
              category: "log:info", action: "nostr_publish_success",
              label: `[Nostr] Successfully published event ${event.id} to all ${successfulCount} relays.`
            };
            Effect.gen(function* (_telem) {
              const telemetryService = yield* _telem(TelemetryService);
              yield* _telem(telemetryService.trackEvent(publishSuccessEvent));
            }).pipe(provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent for success failed:", err instanceof Error ? err.message : String(err));
              }));
            return Effect.void;
          } else {
            const anomalousEvent: TelemetryEvent = {
              category: "log:error", action: "nostr_publish_anomalous_result",
              label: `[Nostr] Anomalous result for publishing event ${event.id}: 0 successful, 0 failed, with ${config.relays.length} relays configured.`
            };
            Effect.gen(function* (_telem) {
              const telemetryService = yield* _telem(TelemetryService);
              yield* _telem(telemetryService.trackEvent(anomalousEvent));
            }).pipe(provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent for anomalous_result failed:", err instanceof Error ? err.message : String(err));
              }));
            return yield* _(Effect.fail(new NostrPublishError({
              message: `Anomalous result from publishing event ${event.id}: No successes or failures reported from ${config.relays.length} relays.`
            })));
          }
        } catch (error) {
          const publishErrorEvent: TelemetryEvent = {
            category: "log:error", action: "nostr_publish_error",
            label: `[Nostr] Error during publish attempt for event ${event.id}`,
            value: error instanceof Error ? JSON.stringify({ message: error.message, stack: error.stack }) : String(error)
          };
          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(publishErrorEvent));
          }).pipe(provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
            (effect) => runPromise(effect).catch((err: unknown) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
            }));
          if (error instanceof NostrPublishError) return yield* _(Effect.fail(error));
          return yield* _(Effect.fail(new NostrPublishError({ message: `Unexpected error publishing event ${event.id}`, cause: error })));
        }
      }),

    subscribeToEvents: (
      filters: NostrFilter[],
      onEvent: (event: NostrEvent) => void,
      customRelays?: readonly string[], // <-- Updated: optional relays parameter
      onEOSE?: () => void
    ) =>
      Effect.gen(function* (_) {
        const pool = yield* _(
          getPoolEffect,
          Effect.mapError(error => new NostrRequestError({
            message: `Failed to initialize pool for subscription: ${error.message}`,
            cause: error.cause
          }))
        );

        const relaysToUse = (customRelays && customRelays.length > 0) ? customRelays : config.relays;

        if (relaysToUse.length === 0) {
          return yield* _(Effect.fail(new NostrRequestError({
            message: "No relays specified for subscription and no default relays configured."
          })));
        }

        try {
          Effect.runFork(Effect.provide(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({
              category: "nostr:subscribe",
              action: "attempt_subscription",
              label: `Filters: ${filters.length}, Relays: ${relaysToUse.join(', ')}`
            })),
            Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)
          ));

          const subParams = {
            onevent: (event: any) => { onEvent(event as NostrEvent); },
            oneose: onEOSE ? () => { onEOSE(); } : undefined,
          };

          const subCloser = pool.subscribe(relaysToUse as string[], filters[0] as NostrToolsFilter, subParams);

          Effect.runFork(Effect.provide(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({
              category: "nostr:subscribe",
              action: "subscription_created",
              label: `Subscription ID (client-side): ${subCloser.id ?? 'unknown'}`
            })),
            Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)
          ));

          return {
            unsub: () => {
              Effect.runFork(Effect.provide(
                Effect.flatMap(TelemetryService, ts => ts.trackEvent({
                  category: "nostr:subscribe",
                  action: "unsubscribed",
                  label: `Subscription ID (client-side): ${subCloser.id ?? 'unknown'}`
                })),
                Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)
              ));
              subCloser.close();
            }
          };
        } catch (error) {
          return yield* _(Effect.fail(new NostrRequestError({
            message: "Failed to create subscription via pool.subscribe",
            cause: error
          })));
        }
      }),

    cleanupPool: () =>
      Effect.try({
        try: () => {
          if (poolInstance) {
            poolInstance.close(config.relays as string[]);
            poolInstance = null;
            const poolCloseEvent: TelemetryEvent = {
              category: "log:info", action: "nostr_pool_close",
              label: "[Nostr] Pool connections closed"
            };
            Effect.gen(function* (_) {
              const telemetryService = yield* _(TelemetryService);
              yield* _(telemetryService.trackEvent(poolCloseEvent));
            }).pipe(provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)),
              (effect) => runPromise(effect).catch((err: unknown) => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
              }));
          }
        },
        catch: (error) => new NostrPoolError({ message: "Failed to clean up Nostr pool", cause: error }),
      }),

};
}

export const NostrServiceLive = Layer.effect(
NostrService,
Effect.flatMap(NostrServiceConfigTag, (config) => Effect.succeed(createNostrService(config)))
);

// File: src/services/dvm/Kind5050DVMServiceImpl.ts
// ... (imports, including useDVMSettingsStore, Kind5050DVMServiceConfigTag from './Kind5050DVMService') ...

export const Kind5050DVMServiceLive = Layer.scoped(
Kind5050DVMService,
Effect.gen(function* (\_) {
const defaultConfig = yield* _(Kind5050DVMServiceConfigTag); // Default config for fallbacks
const telemetry = yield\* _(TelemetryService);
const nostr = yield* \_(NostrService);
const ollama = yield* _(OllamaService);
const spark = yield\* _(SparkService);
const nip04 = yield\* \_(NIP04Service);

    let isActiveInternal = useDVMSettingsStore.getState().getEffectiveConfig().active;
    let currentSubscription: Subscription | null = null;
    let currentDvmPublicKeyHex = useDVMSettingsStore.getState().getDerivedPublicKeyHex() || defaultConfig.dvmPublicKeyHex;

    yield* _(telemetry.trackEvent({
      category: 'dvm:init',
      action: 'kind5050_dvm_service_init',
      label: `Initial state: ${isActiveInternal ? 'active' : 'inactive'}`,
    }).pipe(Effect.ignoreLogged));

    const publishFeedback = (feedbackEvent: NostrEvent) =>
      nostr.publishEvent(feedbackEvent).pipe(
        Effect.tapErrorTag("NostrPublishError", err =>
          telemetry.trackEvent({
            category: "dvm:error", action: "publish_feedback_failure",
            label: `Failed to publish feedback for ${feedbackEvent.tags.find(t=>t[0]==='e')?.[1]}`,
            value: err.message
          })
        ),
        Effect.ignoreLogged
      );

    // processJobRequestInternal needs to get the latest effective config inside itself
    const processJobRequestInternal = (jobRequestEvent: NostrEvent): Effect.Effect<void, DVMError, never> =>
      Effect.gen(function* (_) {
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig(); // Get latest settings
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig;

        // ... (rest of processJobRequestInternal logic as provided in the prompt,
        // ensuring all `config.dvmPrivateKeyHex` are replaced with `dvmPrivateKeyHex`
        // and `config.defaultTextGenerationJobConfig` with `textGenConfig`)
        // The existing logic for processJobRequestInternal is largely fine, just ensure it uses
        // the `effectiveConfig` obtained at the start of this function.
        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_received", label: jobRequestEvent.id, value: `Kind: ${jobRequestEvent.kind}` }).pipe(Effect.ignoreLogged));

        let inputsSource = jobRequestEvent.tags;
        let isRequestEncrypted = false;

        if (jobRequestEvent.tags.some(t => t[0] === "encrypted")) {
          isRequestEncrypted = true;
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          const decryptedContentStr = yield* _(nip04.decrypt(dvmSkBytes, jobRequestEvent.pubkey, jobRequestEvent.content).pipe(
            Effect.mapError(e => new DVMJobRequestError({ message: "Failed to decrypt NIP-90 request content", cause: e}))
          ));
          try {
            inputsSource = JSON.parse(decryptedContentStr) as Array<[string, ...string[]]>;
          } catch (e) {
            return yield* _(Effect.fail(new DVMJobRequestError({ message: "Failed to parse decrypted JSON tags", cause: e})));
          }
        }

        const inputs: NIP90Input[] = [];
        const paramsMap = new Map<string, string>();
        inputsSource.forEach(tag => {
            if (tag[0] === 'i' && tag.length >= 3) inputs.push([tag[1], tag[2] as NIP90InputType, tag[3], tag[4]] as NIP90Input);
            if (tag[0] === 'param' && tag.length >= 3) paramsMap.set(tag[1], tag[2]);
        });

        if (inputs.length === 0) {
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "error", "No inputs provided.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No inputs provided" })));
        }
        const textInput = inputs.find(inp => inp[1] === "text");
        if (!textInput || !textInput[0]) {
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "error", "No 'text' input found for text generation job.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No text input found" })));
        }
        const prompt = textInput[0];

        const processingFeedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "processing");
        yield* _(publishFeedback(processingFeedback));

        const ollamaModel = paramsMap.get("model") || textGenConfig.model;
        const ollamaRequest: OllamaChatCompletionRequest = {
          model: ollamaModel,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        };

        // Log intended Ollama parameters
        yield* _(telemetry.trackEvent({
            category: "dvm:job", action: "ollama_params_intended",
            label: `Job ID: ${jobRequestEvent.id}`, value: JSON.stringify({
                requestParams: Object.fromEntries(paramsMap),
                ollamaModelUsed: ollamaRequest.model,
                defaultJobConfigParams: textGenConfig
            })
        }).pipe(Effect.ignoreLogged));


        const ollamaResult = yield* _(ollama.generateChatCompletion(ollamaRequest).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Ollama inference failed", cause: e }))
        ));
        const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
        const usage = ollamaResult.usage || { prompt_tokens: Math.ceil(prompt.length / 4), completion_tokens: Math.ceil(ollamaOutput.length / 4), total_tokens: Math.ceil((prompt.length + ollamaOutput.length) / 4) };
        const totalTokens = usage.total_tokens;

        const priceSats = Math.max(
          textGenConfig.minPriceSats,
          Math.ceil((totalTokens / 1000) * textGenConfig.pricePer1kTokens)
        );
        const invoiceAmountMillisats = priceSats * 1000;

        const invoiceSDKResult = yield* _(spark.createLightningInvoice({ amountSats: priceSats, memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0,8)}`}).pipe(
          Effect.mapError(e => new DVMPaymentError({ message: "Spark invoice creation failed", cause: e }))
        ));
        const bolt11Invoice = invoiceSDKResult.invoice.encodedInvoice;

        let finalOutputContent = ollamaOutput;
        if (isRequestEncrypted) {
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          finalOutputContent = yield* _(nip04.encrypt(dvmSkBytes, jobRequestEvent.pubkey, ollamaOutput).pipe(
            Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to encrypt NIP-90 job result", cause: e }))
          ));
        }

        const jobResultEvent = createNip90JobResultEvent(
          dvmPrivateKeyHex, jobRequestEvent, finalOutputContent,
          invoiceAmountMillisats, bolt11Invoice, isRequestEncrypted
        );
        yield* _(nostr.publishEvent(jobResultEvent).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to publish job result event", cause: e }))
        ));

        const successFeedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "success");
        yield* _(publishFeedback(successFeedback));

        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_processed_success", label: jobRequestEvent.id }).pipe(Effect.ignoreLogged));

      }).pipe(
        Effect.catchAllCause(cause => {
          const effectiveConfigForError = useDVMSettingsStore.getState().getEffectiveConfig();
          const dvmPrivateKeyHexForError = effectiveConfigForError.dvmPrivateKeyHex;

          const dvmError = Option.getOrElse(Cause.failureOption(cause), () =>
            new DVMJobProcessingError({ message: "Unknown error during DVM job processing", cause })
          );
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHexForError, jobRequestEvent, "error", dvmError.message);
          Effect.runFork(publishFeedback(feedback));
          return telemetry.trackEvent({
            category: "dvm:error", action: "job_request_processing_failure",
            label: jobRequestEvent.id, value: dvmError.message
          }).pipe(Effect.ignoreLogged, Effect.andThen(Effect.fail(dvmError as DVMError)));
        })
      );

    return {
      startListening: () => Effect.gen(function* (_) {
        if (isActiveInternal) {
          yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_already_active' }).pipe(Effect.ignoreLogged));
          return;
        }

        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        currentDvmPublicKeyHex = effectiveConfig.dvmPublicKeyHex;

        if (!effectiveConfig.dvmPrivateKeyHex) {
          return yield* _(Effect.fail(new DVMConfigError({ message: "DVM private key not configured." })));
        }
        if (effectiveConfig.relays.length === 0) {
          return yield* _(Effect.fail(new DVMConfigError({ message: "No DVM relays configured." })));
        }

        yield* _(telemetry.trackEvent({
          category: 'dvm:status',
          action: 'start_listening_attempt',
          label: `Relays: ${effectiveConfig.relays.join(', ')}, Kinds: ${effectiveConfig.supportedJobKinds.join(', ')}`
        }).pipe(Effect.ignoreLogged));

        const jobRequestFilter: NostrFilter = {
          kinds: effectiveConfig.supportedJobKinds,
          since: Math.floor(Date.now() / 1000) - 300,
        };

        const sub = yield* _(nostr.subscribeToEvents(
          [jobRequestFilter],
          (event: NostrEvent) => {
            const latestConfig = useDVMSettingsStore.getState().getEffectiveConfig();
            if (event.pubkey === latestConfig.dvmPublicKeyHex && (event.kind === 7000 || (event.kind >= 6000 && event.kind <= 6999))) return;
            Effect.runFork(processJobRequestInternal(event));
          },
          effectiveConfig.relays, // Pass effective relays here
          () => {
            Effect.runFork(telemetry.trackEvent({
              category: "dvm:nostr",
              action: "subscription_eose",
              label: `EOSE received for DVM job kinds: ${effectiveConfig.supportedJobKinds.join(', ')}`
            }).pipe(Effect.ignoreLogged));
          }
        ).pipe(Effect.mapError(e => new DVMConnectionError({ message: "Failed to subscribe to Nostr for DVM requests", cause: e }))));

        currentSubscription = sub;
        isActiveInternal = true;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_success' }).pipe(Effect.ignoreLogged));
      }),

      stopListening: () => Effect.gen(function* (_) {
        if (!isActiveInternal) {
          yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_already_inactive'}).pipe(Effect.ignoreLogged));
          return;
        }
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_attempt'}).pipe(Effect.ignoreLogged));

        if (currentSubscription) {
          try {
            currentSubscription.unsub();
            currentSubscription = null;
          } catch(e) {
            yield* _(telemetry.trackEvent({ category: 'dvm:error', action: 'stop_listening_unsub_failure', label: e instanceof Error ? e.message : String(e) }).pipe(Effect.ignoreLogged));
          }
        }
        isActiveInternal = false;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_success'}).pipe(Effect.ignoreLogged));
      }),

      isListening: () => Effect.succeed(isActiveInternal),
    };

})
);

// File: src/services/dvm/index.ts
// No change needed, already exports Kind5050DVMService and Kind5050DVMServiceImpl

// File: src/services/runtime.ts
// No change needed, already includes Kind5050DVMServiceLive with its dependencies.

// File: src/components/sell-compute/SellComputePane.tsx
// Update handleGoOnlineToggle to correctly update `isOnline` state based on DVM service.
// Add loading state `isDvmLoading` for DVM start/stop operations.

```typescript
// src/components/sell-compute/SellComputePane.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HelpCircle, Zap, ZapOff, Wifi, WifiOff, RefreshCcw, Loader2, Cog } from 'lucide-react'; // Added Cog, Loader2
import { SparkService } from '@/services/spark';
import { OllamaService } from '@/services/ollama';
import { Kind5050DVMService } from '@/services/dvm';
import { getMainRuntime } from '@/services/runtime';
import { Effect } from 'effect';
import { runPromiseExit, Exit, Cause } from 'effect/Effect';
import { cn } from '@/utils/tailwind';
import { DVMSettingsDialog } from '@/components/dvm'; // Import settings dialog

const SellComputePane: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false); // Reflects actual DVM service status
  const [statusLoading, setStatusLoading] = useState({ wallet: false, ollama: false });
  const [isDvmLoading, setIsDvmLoading] = useState(false);

  const runtime = getMainRuntime();

  const checkWalletStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, wallet: true }));
    const walletProgram = Effect.flatMap(SparkService, s => s.checkWalletStatus());
    runPromiseExit(Effect.provide(walletProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsWalletConnected(exit.value);
      else {
        console.error("Wallet status check failed:", Cause.squash(exit.cause));
        setIsWalletConnected(false);
      }
      setStatusLoading(s => ({ ...s, wallet: false }));
    });
  }, [runtime]);

  const checkOllamaStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, ollama: true }));
    const ollamaProgram = Effect.flatMap(OllamaService, s => s.checkOllamaStatus());
    runPromiseExit(Effect.provide(ollamaProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsOllamaConnected(exit.value);
      else {
        console.error("Ollama status check failed:", Cause.squash(exit.cause));
        setIsOllamaConnected(false);
      }
      setStatusLoading(s => ({ ...s, ollama: false }));
    });
  }, [runtime]);

  const checkDVMStatus = useCallback(async () => {
    // Don't set isDvmLoading true here initially, as it can be called after an action.
    // The action handler will set isDvmLoading.
    const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, s => s.isListening());
    runPromiseExit(Effect.provide(dvmStatusProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) {
        setIsOnline(exit.value);
      } else {
        console.error("Failed to check DVM status:", Cause.squash(exit.cause));
        setIsOnline(false);
      }
      // Only set DVM loading to false if it was true (i.e., if checkDVMStatus was called after an action)
      // This prevents jitter if it's called on initial load.
      // The action handlers will set isDvmLoading to true before calling this.
    });
  }, [runtime]);

  useEffect(() => {
    checkWalletStatus();
    checkOllamaStatus();
    checkDVMStatus(); // Check DVM status on mount
  }, [checkWalletStatus, checkOllamaStatus, checkDVMStatus]);

  const handleGoOnlineToggle = async () => {
    if ((!isWalletConnected || !isOllamaConnected) && !isOnline) {
      alert("Please ensure your wallet and Ollama are connected to go online.");
      return;
    }

    setIsDvmLoading(true); // Start loading for DVM operation

    const dvmAction = isOnline
      ? Effect.flatMap(Kind5050DVMService, s => s.stopListening())
      : Effect.flatMap(Kind5050DVMService, s => s.startListening());

    const exit = await runPromiseExit(Effect.provide(dvmAction, runtime));

    if (Exit.isSuccess(exit)) {
      console.log(`DVM Service ${isOnline ? 'stop' : 'start'} command successful.`);
    } else {
      console.error(`Failed to ${isOnline ? 'stop' : 'start'} DVM:`, Cause.squash(exit.cause));
      alert(`Failed to ${isOnline ? 'stop' : 'start'} the service. Check console for details.`);
    }
    // Always re-check DVM status from the service to update UI and clear loading state
    await checkDVMStatus(); // This will also set isDvmLoading to false after it completes.
    // To ensure isDvmLoading is false immediately after this handler, we can set it here,
    // but checkDVMStatus might be async and set it again. Best to rely on checkDVMStatus final.
    // However, for immediate UI feedback:
    setIsDvmLoading(false);
  };

  const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
  const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="text-center flex-grow">
            <CardTitle className="text-lg">Sell Compute Power</CardTitle>
          </div>
          <DVMSettingsDialog />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
              {isWalletConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Wallet</p>
                <p className={cn("text-xs", walletStatusColor)}>{walletStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Wallet Status" onClick={checkWalletStatus} disabled={statusLoading.wallet}>
                 {statusLoading.wallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Wallet Info (Not Implemented)"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
             {isOllamaConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Ollama</p>
                <p className={cn("text-xs", ollamaStatusColor)}>{ollamaStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Ollama Status" onClick={checkOllamaStatus} disabled={statusLoading.ollama}>
                 {statusLoading.ollama ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Ollama Info (Not Implemented)"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <CardDescription className="text-center text-xs px-2 pt-2">
            Ensure your wallet and Ollama are connected before going online. User settings (keys, relays, pricing) are used by the DVM.
          </CardDescription>

          <Button
            onClick={handleGoOnlineToggle}
            className="w-full py-3 text-base"
            variant={isOnline ? "outline" : "default"}
            disabled={isDvmLoading || ((!isWalletConnected || !isOllamaConnected) && !isOnline)}
          >
            {isDvmLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />)}
            {isDvmLoading ? (isOnline ? 'Stopping...' : 'Starting...') : (isOnline ? 'GO OFFLINE' : 'GO ONLINE')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellComputePane;
```

Note on `processJobRequestInternal` in `Kind5050DVMServiceImpl.ts`:
The placeholder comments like `// ... (rest of parsing and validation logic using dvmPrivateKeyHex and textGenConfig) ...` mean that the agent should ensure the logic within that function (which was already implemented in the previous step `1334-instructions.md`) is now using `dvmPrivateKeyHex` and `textGenConfig` variables that are derived from `useDVMSettingsStore.getState().getEffectiveConfig()` at the _beginning of `processJobRequestInternal` itself_, rather than from a `config` variable passed down or from the initial config of the service. This ensures each job request uses the latest settings. The provided solution above already reflects this.

The logic for `OllamaChatCompletionRequest` parameters (like `max_tokens`, `temperature`) is still logged via telemetry as a placeholder, as `OllamaService` does not yet accept an `options` field for these. This is fine for this phase.Okay, Agent, this is the next major phase for the `SELLING_COMPUTE` feature. We will implement the core logic for the `Kind5050DVMService`. This service will listen for NIP-90 job requests (kind 5000-5999, specifically 5100 for text generation in this phase), process them using Ollama and Spark, and respond with results and feedback. We will also integrate this service with the `SellComputePane` UI.

**I. Refine `Kind5050DVMService` Configuration and Identity**

1.  **File: `src/services/dvm/Kind5050DVMService.ts`**
    - Modify the `Kind5050DVMServiceConfig` interface to include `dvmPrivateKeyHex` (for the DVM's Nostr identity) and `dvmPublicKeyHex` (derived from the private key).
    - Update `defaultJobConfig` within `Kind5050DVMServiceConfig` to `defaultTextGenerationJobConfig`, making it specific for text generation tasks, referencing parameters from `docs/dvm-kind-5050.md`.
    - Adjust `DefaultKind5050DVMServiceConfigLayer` to provide a default development private key (generate one using `nostr-tools/pure`) and derive the public key.

**II. Implement Core DVM Logic in `src/services/dvm/Kind5050DVMServiceImpl.ts`**

- Inject dependencies: `NostrService`, `OllamaService`, `SparkService`, `NIP04Service`, `TelemetryService`, and now use `useDVMSettingsStore` to get the effective DVM configuration at runtime.
- Implement `startListening()`:
  - Fetch the effective DVM configuration (identity, relays, supported kinds) from `useDVMSettingsStore`.
  - Subscribe to Nostr events matching `effectiveConfig.supportedJobKinds` on `effectiveConfig.relays`. The `onEvent` callback should fork `processJobRequestInternal`.
- Implement `stopListening()`: Unsubscribe from Nostr events.
- Implement `isListening()`: Return the internal active state.
- Implement `processJobRequestInternal(jobRequestEvent: NostrEvent)`:
  - Fetch the current effective DVM configuration (especially `dvmPrivateKeyHex` and `defaultTextGenerationJobConfig` which includes pricing) from `useDVMSettingsStore` at the beginning of _each_ job processing.
  - Parse and validate the request. Handle NIP-04 decryption if the "encrypted" tag is present, using the effective DVM private key.
  - Send "processing" feedback (Kind 7000) signed with the effective DVM private key.
  - Perform inference using `OllamaService`. Map NIP-90 parameters (e.g., `max_tokens`) to `OllamaChatCompletionRequest` using the effective text generation config.
  - Generate a Lightning invoice using `SparkService` and the effective pricing model.
  - Encrypt the result using NIP-04 (with effective DVM private key) if the original request was encrypted.
  - Publish the job result (Kind 6xxx) with the invoice, signed by the effective DVM private key.
  - Publish final "success" or "error" feedback (Kind 7000), signed by the effective DVM private key.
  - Ensure robust error handling and telemetry throughout the process.
- Create helper functions for NIP-90 event creation (`createNip90FeedbackEvent`, `createNip90JobResultEvent`) that take the DVM private key as an argument.

**III. Update `src/services/runtime.ts`**

- Ensure `Kind5050DVMServiceLive` is added to `FullAppLayer` and its dependencies (including `NIP04Service` for the DVM layer) are correctly provided. The `Kind5050DVMServiceConfigTag` will now provide the _default_ application-level config, which the service implementation uses as a fallback if user settings are absent.

**IV. Update `src/components/sell-compute/SellComputePane.tsx`**

- Connect the "GO ONLINE" / "GO OFFLINE" button to `Kind5050DVMService.startListening()` and `stopListening()`.
- Update the `isOnline` state in the UI by calling `Kind5050DVMService.isListening()` after start/stop actions and on component mount to reflect the actual service state.
- Add a loading state (`isDvmLoading`) to the "GO ONLINE" / "GO OFFLINE" button to indicate when DVM operations are in progress.

```typescript
// File: src/services/dvm/Kind5050DVMService.ts
import { Context, Effect, Data, Schema, Layer } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { TrackEventError } from '@/services/telemetry/TelemetryService';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex } from '@noble/hashes/utils';

// DVM service errors
export class DVMServiceError extends Data.TaggedError("DVMServiceError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}
export class DVMConfigError extends DVMServiceError {}
export class DVMConnectionError extends DVMServiceError {}
export class DVMJobRequestError extends DVMServiceError {}
export class DVMJobProcessingError extends DVMServiceError {}
export class DVMPaymentError extends DVMServiceError {}
export class DVMInvocationError extends DVMServiceError {}
export type DVMError = DVMConfigError | DVMConnectionError | DVMJobRequestError | DVMJobProcessingError | DVMPaymentError | DVMInvocationError;

// Default Text Generation Job Parameters based on docs/dvm-kind-5050.md
export interface DefaultTextGenerationJobConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  top_k: number;
  top_p: number;
  frequency_penalty: number;
  // Pricing related
  minPriceSats: number;
  pricePer1kTokens: number; // Price per 1000 tokens (input + output) in satoshis
}

export interface Kind5050DVMServiceConfig {
  active: boolean;
  dvmPrivateKeyHex: string;
  dvmPublicKeyHex: string;
  relays: string[];
  supportedJobKinds: number[]; // e.g., [5100] for text generation (Kind 5000-5999 for requests)
  defaultTextGenerationJobConfig: DefaultTextGenerationJobConfig;
}

export const Kind5050DVMServiceConfigTag = Context.GenericTag<Kind5050DVMServiceConfig>("Kind5050DVMServiceConfig");

// Generate a default dev keypair
const devDvmSkBytes = generateSecretKey();
const devDvmSkHex = bytesToHex(devDvmSkBytes);
const devDvmPkHex = getPublicKey(devDvmSkBytes);

export const DefaultKind5050DVMServiceConfigLayer = Layer.succeed(
  Kind5050DVMServiceConfigTag,
  {
    active: false,
    dvmPrivateKeyHex: devDvmSkHex,
    dvmPublicKeyHex: devDvmPkHex,
    relays: ["wss://relay.damus.io", "wss://relay.nostr.band", "wss://nos.lol"],
    supportedJobKinds: [5100], // Example: Text Generation as per docs/dvm-kind-5050.md (NIP-90 range 5000-5999)
    defaultTextGenerationJobConfig: {
      model: "gemma2:latest", // Ensure this model is available in your Ollama instance
      max_tokens: 512,
      temperature: 0.7,
      top_k: 40,
      top_p: 0.9,
      frequency_penalty: 0.5,
      minPriceSats: 10,
      pricePer1kTokens: 2,
    }
  }
);

export interface Kind5050DVMService {
  startListening(): Effect.Effect<void, DVMError | TrackEventError, never>;
  stopListening(): Effect.Effect<void, DVMError | TrackEventError, never>;
  isListening(): Effect.Effect<boolean, DVMError | TrackEventError, never>;
}
export const Kind5050DVMService = Context.GenericTag<Kind5050DVMService>("Kind5050DVMService");

// File: src/services/dvm/Kind5050DVMServiceImpl.ts
import { Effect, Layer, Schema, Option, Cause } from 'effect';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import { TelemetryService } from '@/services/telemetry';
import { NostrService, type NostrEvent, type NostrFilter, type Subscription, NostrPublishError } from '@/services/nostr';
import { OllamaService, type OllamaChatCompletionRequest, OllamaError } from '@/services/ollama';
import { SparkService, type CreateLightningInvoiceParams, SparkError, LightningInvoice } from '@/services/spark';
import { NIP04Service, NIP04DecryptError, NIP04EncryptError } from '@/services/nip04';
import { useDVMSettingsStore } from '@/stores/dvmSettingsStore';
import {
  NIP90Input,
  NIP90JobParam,
  NIP90InputType
} from '@/services/nip90';
import {
  Kind5050DVMService,
  Kind5050DVMServiceConfig, // This is the type for the default config
  Kind5050DVMServiceConfigTag, // Tag for injecting the default config
  DVMConfigError, DVMConnectionError, DVMJobRequestError, DVMJobProcessingError, DVMPaymentError, DVMError
} from './Kind5050DVMService';
// import * as ParseResult from "@effect/schema/ParseResult"; // Not used for now

// Helper to create NIP-90 feedback events (Kind 7000)
function createNip90FeedbackEvent(
  dvmPrivateKeyHex: string,
  requestEvent: NostrEvent,
  status: "payment-required" | "processing" | "error" | "success" | "partial",
  contentOrExtraInfo?: string,
  amountDetails?: { amountMillisats: number; invoice?: string }
): NostrEvent {
  const tags: string[][] = [
    ["e", requestEvent.id],
    ["p", requestEvent.pubkey],
  ];

  const statusTagPayload = [status];
  if (contentOrExtraInfo && (status === "error" || status === "processing" || status === "payment-required")) {
    statusTagPayload.push(contentOrExtraInfo.substring(0, 256));
  }
  tags.push(statusTagPayload);

  if (amountDetails) {
    const amountTag = ["amount", amountDetails.amountMillisats.toString()];
    if (amountDetails.invoice) amountTag.push(amountDetails.invoice);
    tags.push(amountTag);
  }

  const template: EventTemplate = {
    kind: 7000,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: (status === "partial" || (status === "error" && contentOrExtraInfo && contentOrExtraInfo.length > 256)) ? (contentOrExtraInfo || "") : "",
  };
  return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
}

// Helper to create NIP-90 job result events (Kind 6xxx)
function createNip90JobResultEvent(
  dvmPrivateKeyHex: string,
  requestEvent: NostrEvent,
  jobOutputContent: string,
  invoiceAmountMillisats: number,
  bolt11Invoice: string,
  outputIsEncrypted: boolean
): NostrEvent {
  const tags: string[][] = [
    ["request", JSON.stringify(requestEvent)],
    ["e", requestEvent.id],
    ["p", requestEvent.pubkey],
    ["amount", invoiceAmountMillisats.toString(), bolt11Invoice]
  ];

  if (outputIsEncrypted) tags.push(["encrypted"]);
  requestEvent.tags.filter(t => t[0] === 'i').forEach(t => tags.push(t));

  const resultKind = requestEvent.kind + 1000;
  if (resultKind < 6000 || resultKind > 6999) {
    console.error(`Calculated result kind ${resultKind} is out of NIP-90 range for request kind ${requestEvent.kind}. Defaulting to 6000.`);
  }

  const template: EventTemplate = {
    kind: Math.max(6000, Math.min(6999, resultKind)),
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: jobOutputContent,
  };
  return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
}


export const Kind5050DVMServiceLive = Layer.scoped(
  Kind5050DVMService,
  Effect.gen(function* (_) {
    const defaultConfig = yield* _(Kind5050DVMServiceConfigTag); // For fallback defaults
    const telemetry = yield* _(TelemetryService);
    const nostr = yield* _(NostrService);
    const ollama = yield* _(OllamaService);
    const spark = yield* _(SparkService);
    const nip04 = yield* _(NIP04Service);

    let isActiveInternal = useDVMSettingsStore.getState().getEffectiveConfig().active;
    let currentSubscription: Subscription | null = null;
    let currentDvmPublicKeyHex = useDVMSettingsStore.getState().getDerivedPublicKeyHex() || defaultConfig.dvmPublicKeyHex;

    yield* _(telemetry.trackEvent({
      category: 'dvm:init',
      action: 'kind5050_dvm_service_init',
      label: `Initial state: ${isActiveInternal ? 'active' : 'inactive'}`,
    }).pipe(Effect.ignoreLogged));

    const publishFeedback = (feedbackEvent: NostrEvent) =>
      nostr.publishEvent(feedbackEvent).pipe(
        Effect.tapErrorTag("NostrPublishError", err =>
          telemetry.trackEvent({
            category: "dvm:error", action: "publish_feedback_failure",
            label: `Failed to publish feedback for ${feedbackEvent.tags.find(t=>t[0]==='e')?.[1]}`,
            value: err.message
          })
        ),
        Effect.ignoreLogged
      );

    const processJobRequestInternal = (jobRequestEvent: NostrEvent): Effect.Effect<void, DVMError, never> =>
      Effect.gen(function* (_) {
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig(); // Get latest settings for this job
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig; // This is now the effective text gen config

        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_received", label: jobRequestEvent.id, value: `Kind: ${jobRequestEvent.kind}` }).pipe(Effect.ignoreLogged));

        let inputsSource = jobRequestEvent.tags;
        let isRequestEncrypted = false;

        if (jobRequestEvent.tags.some(t => t[0] === "encrypted")) {
          isRequestEncrypted = true;
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          const decryptedContentStr = yield* _(nip04.decrypt(dvmSkBytes, jobRequestEvent.pubkey, jobRequestEvent.content).pipe(
            Effect.mapError(e => new DVMJobRequestError({ message: "Failed to decrypt NIP-90 request content", cause: e}))
          ));
          try {
            inputsSource = JSON.parse(decryptedContentStr) as Array<[string, ...string[]]>;
          } catch (e) {
            return yield* _(Effect.fail(new DVMJobRequestError({ message: "Failed to parse decrypted JSON tags", cause: e})));
          }
        }

        const inputs: NIP90Input[] = [];
        const paramsMap = new Map<string, string>();
        inputsSource.forEach(tag => {
            if (tag[0] === 'i' && tag.length >= 2) { // NIP-90 'i' tag needs at least value and type
              const value = tag[1];
              const type = tag[2] as NIP90InputType; // Assume second element is type
              const opt1 = tag.length > 3 ? tag[3] : undefined;
              const opt2 = tag.length > 4 ? tag[4] : undefined;
              inputs.push([value, type, opt1, opt2] as NIP90Input);
            }
            if (tag[0] === 'param' && tag.length >= 3) paramsMap.set(tag[1], tag[2]);
        });

        if (inputs.length === 0) {
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "error", "No inputs provided.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No inputs provided" })));
        }
        const textInput = inputs.find(inp => inp[1] === "text");
        if (!textInput || !textInput[0]) {
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "error", "No 'text' input found for text generation job.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No text input found" })));
        }
        const prompt = textInput[0];

        const processingFeedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "processing");
        yield* _(publishFeedback(processingFeedback));

        const ollamaModel = paramsMap.get("model") || textGenConfig.model;
        const ollamaRequest: OllamaChatCompletionRequest = {
          model: ollamaModel,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        };

        yield* _(telemetry.trackEvent({
            category: "dvm:job", action: "ollama_params_intended",
            label: `Job ID: ${jobRequestEvent.id}`, value: JSON.stringify({
                requestParams: Object.fromEntries(paramsMap),
                ollamaModelUsed: ollamaRequest.model,
                jobConfigParamsApplied: { // These are from the effective textGenConfig
                    max_tokens: textGenConfig.max_tokens,
                    temperature: textGenConfig.temperature,
                    top_k: textGenConfig.top_k,
                    top_p: textGenConfig.top_p,
                    frequency_penalty: textGenConfig.frequency_penalty
                }
            })
        }).pipe(Effect.ignoreLogged));


        const ollamaResult = yield* _(ollama.generateChatCompletion(ollamaRequest).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Ollama inference failed", cause: e }))
        ));
        const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
        const usage = ollamaResult.usage || { prompt_tokens: Math.ceil(prompt.length / 4), completion_tokens: Math.ceil(ollamaOutput.length / 4), total_tokens: Math.ceil((prompt.length + ollamaOutput.length) / 4) };
        const totalTokens = usage.total_tokens;

        const priceSats = Math.max(
          textGenConfig.minPriceSats,
          Math.ceil((totalTokens / 1000) * textGenConfig.pricePer1kTokens)
        );
        const invoiceAmountMillisats = priceSats * 1000;

        const invoiceSDKResult = yield* _(spark.createLightningInvoice({ amountSats: priceSats, memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0,8)}`}).pipe(
          Effect.mapError(e => new DVMPaymentError({ message: "Spark invoice creation failed", cause: e }))
        ));
        const bolt11Invoice = invoiceSDKResult.invoice.encodedInvoice;

        let finalOutputContent = ollamaOutput;
        if (isRequestEncrypted) {
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          finalOutputContent = yield* _(nip04.encrypt(dvmSkBytes, jobRequestEvent.pubkey, ollamaOutput).pipe(
            Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to encrypt NIP-90 job result", cause: e }))
          ));
        }

        const jobResultEvent = createNip90JobResultEvent(
          dvmPrivateKeyHex, jobRequestEvent, finalOutputContent,
          invoiceAmountMillisats, bolt11Invoice, isRequestEncrypted
        );
        yield* _(nostr.publishEvent(jobResultEvent).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to publish job result event", cause: e }))
        ));

        const successFeedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "success");
        yield* _(publishFeedback(successFeedback));

        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_processed_success", label: jobRequestEvent.id }).pipe(Effect.ignoreLogged));

      }).pipe(
        Effect.catchAllCause(cause => {
          const effectiveConfigForError = useDVMSettingsStore.getState().getEffectiveConfig();
          const dvmPrivateKeyHexForError = effectiveConfigForError.dvmPrivateKeyHex;

          const dvmError = Option.getOrElse(Cause.failureOption(cause), () =>
            new DVMJobProcessingError({ message: "Unknown error during DVM job processing", cause })
          );
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHexForError, jobRequestEvent, "error", dvmError.message);
          Effect.runFork(publishFeedback(feedback));
          return telemetry.trackEvent({
            category: "dvm:error", action: "job_request_processing_failure",
            label: jobRequestEvent.id, value: dvmError.message
          }).pipe(Effect.ignoreLogged, Effect.andThen(Effect.fail(dvmError as DVMError)));
        })
      );

    return {
      startListening: () => Effect.gen(function* (_) {
        if (isActiveInternal) {
          yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_already_active' }).pipe(Effect.ignoreLogged));
          return;
        }

        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        currentDvmPublicKeyHex = effectiveConfig.dvmPublicKeyHex; // Update based on current settings

        if (!effectiveConfig.dvmPrivateKeyHex) {
          return yield* _(Effect.fail(new DVMConfigError({ message: "DVM private key not configured." })));
        }
        if (effectiveConfig.relays.length === 0) {
          return yield* _(Effect.fail(new DVMConfigError({ message: "No DVM relays configured." })));
        }

        yield* _(telemetry.trackEvent({
          category: 'dvm:status',
          action: 'start_listening_attempt',
          label: `Relays: ${effectiveConfig.relays.join(', ')}, Kinds: ${effectiveConfig.supportedJobKinds.join(', ')}`
        }).pipe(Effect.ignoreLogged));

        const jobRequestFilter: NostrFilter = {
          kinds: effectiveConfig.supportedJobKinds,
          since: Math.floor(Date.now() / 1000) - 300,
        };

        const sub = yield* _(nostr.subscribeToEvents(
          [jobRequestFilter],
          (event: NostrEvent) => {
            const latestConfig = useDVMSettingsStore.getState().getEffectiveConfig();
            if (event.pubkey === latestConfig.dvmPublicKeyHex && (event.kind === 7000 || (event.kind >= 6000 && event.kind <= 6999))) return;
            Effect.runFork(processJobRequestInternal(event));
          },
          effectiveConfig.relays, // Pass effective relays
          () => {
            Effect.runFork(telemetry.trackEvent({
              category: "dvm:nostr",
              action: "subscription_eose",
              label: `EOSE received for DVM job kinds: ${effectiveConfig.supportedJobKinds.join(', ')}`
            }).pipe(Effect.ignoreLogged));
          }
        ).pipe(Effect.mapError(e => new DVMConnectionError({ message: "Failed to subscribe to Nostr for DVM requests", cause: e }))));

        currentSubscription = sub;
        isActiveInternal = true;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_success' }).pipe(Effect.ignoreLogged));
      }),

      stopListening: () => Effect.gen(function* (_) {
        if (!isActiveInternal) {
          yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_already_inactive'}).pipe(Effect.ignoreLogged));
          return;
        }
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_attempt'}).pipe(Effect.ignoreLogged));

        if (currentSubscription) {
          try {
            currentSubscription.unsub();
            currentSubscription = null;
          } catch(e) {
            yield* _(telemetry.trackEvent({ category: 'dvm:error', action: 'stop_listening_unsub_failure', label: e instanceof Error ? e.message : String(e) }).pipe(Effect.ignoreLogged));
          }
        }
        isActiveInternal = false;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_success'}).pipe(Effect.ignoreLogged));
      }),

      isListening: () => Effect.succeed(isActiveInternal),
    };
  })
);

// File: src/services/dvm/index.ts
// No changes needed.

// File: src/services/runtime.ts
// No changes needed, as Kind5050DVMServiceLive and its config layer are already correctly integrated.

// File: src/components/sell-compute/SellComputePane.tsx
// Update handleGoOnlineToggle to use isListening for UI state and show loading.
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HelpCircle, Zap, ZapOff, Wifi, WifiOff, RefreshCcw, Loader2, Cog } from 'lucide-react';
import { SparkService } from '@/services/spark';
import { OllamaService } from '@/services/ollama';
import { Kind5050DVMService } from '@/services/dvm';
import { getMainRuntime } from '@/services/runtime';
import { Effect } from 'effect';
import { runPromiseExit, Exit, Cause } from 'effect/Effect';
import { cn } from '@/utils/tailwind';
import { DVMSettingsDialog } from '@/components/dvm';

const SellComputePane: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false); // Reflects actual DVM service status
  const [statusLoading, setStatusLoading] = useState({ wallet: false, ollama: false });
  const [isDvmLoading, setIsDvmLoading] = useState(false);

  const runtime = getMainRuntime();

  const checkWalletStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, wallet: true }));
    const walletProgram = Effect.flatMap(SparkService, s => s.checkWalletStatus());
    runPromiseExit(Effect.provide(walletProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsWalletConnected(exit.value);
      else {
        console.error("Wallet status check failed:", Cause.squash(exit.cause));
        setIsWalletConnected(false);
      }
      setStatusLoading(s => ({ ...s, wallet: false }));
    });
  }, [runtime]);

  const checkOllamaStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, ollama: true }));
    const ollamaProgram = Effect.flatMap(OllamaService, s => s.checkOllamaStatus());
    runPromiseExit(Effect.provide(ollamaProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsOllamaConnected(exit.value);
      else {
        console.error("Ollama status check failed:", Cause.squash(exit.cause));
        setIsOllamaConnected(false);
      }
      setStatusLoading(s => ({ ...s, ollama: false }));
    });
  }, [runtime]);

  const checkDVMStatus = useCallback(async () => {
    // No need to set isDvmLoading here; it's handled by the toggle function
    const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, s => s.isListening());
    runPromiseExit(Effect.provide(dvmStatusProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) {
        setIsOnline(exit.value);
      } else {
        console.error("Failed to check DVM status:", Cause.squash(exit.cause));
        setIsOnline(false);
      }
    });
  }, [runtime]);

  useEffect(() => {
    checkWalletStatus();
    checkOllamaStatus();
    checkDVMStatus();
  }, [checkWalletStatus, checkOllamaStatus, checkDVMStatus]);

  const handleGoOnlineToggle = async () => {
    if ((!isWalletConnected || !isOllamaConnected) && !isOnline) {
      alert("Please ensure your wallet and Ollama are connected to go online.");
      return;
    }

    setIsDvmLoading(true);

    // Fetch current DVM status before deciding action
    const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, s => s.isListening());
    const currentDvmIsOnline = await Effect.runPromise(Effect.provide(dvmStatusProgram, runtime));


    const dvmAction = currentDvmIsOnline // Use the fetched status for decision
      ? Effect.flatMap(Kind5050DVMService, s => s.stopListening())
      : Effect.flatMap(Kind5050DVMService, s => s.startListening());

    const exit = await runPromiseExit(Effect.provide(dvmAction, runtime));

    if (Exit.isSuccess(exit)) {
      // After action, re-check actual DVM status to update UI
      // This call will update setIsOnline
      console.log(`DVM Service ${currentDvmIsOnline ? 'stop' : 'start'} command successful.`);
    } else {
      console.error(`Failed to ${currentDvmIsOnline ? 'stop' : 'start'} DVM:`, Cause.squash(exit.cause));
      alert(`Failed to ${currentDvmIsOnline ? 'stop' : 'start'} the service. Check console for details.`);
    }
    // Re-check DVM status to update UI and implicitly finish loading state
    await checkDVMStatus();
    setIsDvmLoading(false); // Ensure loading state is reset
  };

  const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
  const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="text-center flex-grow">
            <CardTitle className="text-lg">Sell Compute Power</CardTitle>
          </div>
          <DVMSettingsDialog />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
              {isWalletConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Wallet</p>
                <p className={cn("text-xs", walletStatusColor)}>{walletStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Wallet Status" onClick={checkWalletStatus} disabled={statusLoading.wallet}>
                 {statusLoading.wallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Wallet Info (Not Implemented)"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
             {isOllamaConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Ollama</p>
                <p className={cn("text-xs", ollamaStatusColor)}>{ollamaStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Ollama Status" onClick={checkOllamaStatus} disabled={statusLoading.ollama}>
                 {statusLoading.ollama ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Ollama Info (Not Implemented)"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <CardDescription className="text-center text-xs px-2 pt-2">
            Ensure your wallet and Ollama are connected before going online. User settings (keys, relays, pricing) are used by the DVM.
          </CardDescription>

          <Button
            onClick={handleGoOnlineToggle}
            className="w-full py-3 text-base"
            variant={isOnline ? "outline" : "default"}
            disabled={isDvmLoading || ((!isWalletConnected || !isOllamaConnected) && !isOnline)}
          >
            {isDvmLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />)}
            {isDvmLoading ? (isOnline ? 'Stopping...' : 'Starting...') : (isOnline ? 'GO OFFLINE' : 'GO ONLINE')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellComputePane;
```
