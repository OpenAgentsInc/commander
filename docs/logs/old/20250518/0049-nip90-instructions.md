Okay, agent, here are the detailed coding instructions to implement Effect services for interacting with Nostr relays and displaying NIP-90 events on the UI.

**Goal:** Display a list of NIP-90 job request events (kinds 5000-5999) on the UI.

**Relay List to Use:**

```
wss://purplepag.es/
wss://nos.lol/
wss://relay.damus.io/
wss://relay.snort.social/
wss://offchain.pub/
wss://nostr-pub.wellorder.net/
```

---

**Phase 1: Define NostrService Interface, Types, Errors, and Configuration**

1.  **Create Directory Structure:**

    - `src/services/nostr/`

2.  **Create `src/services/nostr/NostrService.ts`:**
    This file will contain the service interface, related data types, custom error types, and the service tag.

    ```typescript
    import { Effect, Context, Data, Layer } from "effect";
    import type {
      Event as NostrToolsEvent,
      Filter as NostrToolsFilter,
      EventTemplate as NostrToolsEventTemplate,
    } from "nostr-tools/pure";
    import type { SimplePool } from "nostr-tools/pool";

    // --- Nostr Event Types (using nostr-tools types) ---
    export type NostrEvent = NostrToolsEvent;
    export type NostrFilter = NostrToolsFilter;
    export type NostrEventTemplate = NostrToolsEventTemplate;

    // --- Custom Error Types ---
    export class NostrPoolError extends Data.TaggedError("NostrPoolError")<{
      message: string;
      cause?: unknown;
    }> {}

    export class NostrRequestError extends Data.TaggedError(
      "NostrRequestError",
    )<{
      message: string;
      cause?: unknown;
    }> {}

    export class NostrPublishError extends Data.TaggedError(
      "NostrPublishError",
    )<{
      message: string;
      cause?: unknown;
    }> {}

    // --- Service Configuration ---
    export interface NostrServiceConfig {
      readonly relays: readonly string[];
      readonly requestTimeoutMs: number; // Timeout for requests like pool.list()
    }
    export const NostrServiceConfigTag =
      Context.GenericTag<NostrServiceConfig>("NostrServiceConfig");

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
          "wss://nostr-pub.wellorder.net/",
        ],
        requestTimeoutMs: 10000, // 10 seconds
      },
    );

    // --- Service Interface ---
    export interface NostrService {
      /**
       * Initializes (if not already) and returns the SimplePool instance.
       * Manages a single pool instance for the service lifetime.
       */
      getPool(): Effect.Effect<SimplePool, NostrPoolError>;

      /**
       * Fetches a list of events from the configured relays based on filters.
       * Sorts events by created_at descending.
       */
      listEvents(
        filters: NostrFilter[],
      ): Effect.Effect<
        NostrEvent[],
        NostrRequestError,
        SimplePool | NostrServiceConfig
      >; // Requires pool and config

      /**
       * Publishes an event to the configured relays.
       * Note: Event signing should happen before calling this.
       */
      publishEvent(
        event: NostrEvent, // nostr-tools Event is already signed and has an id
      ): Effect.Effect<
        void,
        NostrPublishError,
        SimplePool | NostrServiceConfig
      >; // Requires pool and config

      /**
       * Cleans up the pool, closing connections.
       */
      cleanupPool(): Effect.Effect<void, NostrPoolError>;
    }
    export const NostrService =
      Context.GenericTag<NostrService>("NostrService");
    ```

---

**Phase 2: Implement NostrService**

1.  **Create `src/services/nostr/NostrServiceImpl.ts`:**
    This file will contain the concrete implementation of the `NostrService`.

    ```typescript
    import { Effect, Layer, Context } from "effect";
    import { SimplePool } from "nostr-tools/pool";
    import type {
      Event as NostrToolsEvent,
      Filter as NostrToolsFilter,
    } from "nostr-tools/pure";
    import {
      NostrService,
      NostrServiceConfigTag,
      type NostrServiceConfig,
      type NostrEvent,
      type NostrFilter,
      NostrPoolError,
      NostrRequestError,
      NostrPublishError,
    } from "./NostrService";

    // Helper to ensure correct event type compatibility if needed
    const asNostrEventArray = (events: NostrToolsEvent[]): NostrEvent[] =>
      events as NostrEvent[];

    export function createNostrService(
      config: NostrServiceConfig,
    ): NostrService {
      let poolInstance: SimplePool | null = null;

      const getPoolEffect = Effect.try({
        try: () => {
          if (!poolInstance) {
            // nostr-tools SimplePool defaults, eoseSubTimeout might be relevant for subscriptions
            poolInstance = new SimplePool({
              eoseSubTimeout: 5000,
              getTimeout: config.requestTimeoutMs / 2,
            });
          }
          return poolInstance;
        },
        catch: (error) =>
          new NostrPoolError({
            message: "Failed to initialize Nostr pool",
            cause: error,
          }),
      });

      return {
        getPool: () => getPoolEffect,

        listEvents: (filters: NostrFilter[]) =>
          Effect.gen(function* (_) {
            const pool = yield* _(getPoolEffect);
            // pool.list can take a long time if relays are unresponsive.
            // We should implement a timeout mechanism. SimplePool's `getTimeout` option might help.
            // Effect.timeout can also be used here.
            const events = yield* _(
              Effect.tryPromise({
                try: () => pool.list(config.relays as string[], filters), // Cast because nostr-tools expects string[]
                catch: (error) =>
                  new NostrRequestError({
                    message: "Failed to list events from relays",
                    cause: error,
                  }),
              }),
              Effect.timeout(config.requestTimeoutMs), // Apply timeout
              Effect.mapError((e) => {
                // Handle timeout error specifically
                if (e._tag === "TimeoutException") {
                  return new NostrRequestError({
                    message: `Relay request timed out after ${config.requestTimeoutMs}ms`,
                  });
                }
                return e as NostrRequestError; // Should already be NostrRequestError if not timeout
              }),
            );

            // Sort events by created_at descending before returning
            return asNostrEventArray(events).sort(
              (a, b) => b.created_at - a.created_at,
            );
          }),

        publishEvent: (event: NostrEvent) =>
          Effect.gen(function* (_) {
            const pool = yield* _(getPoolEffect);
            // pool.publish returns Promise<void>[] in some versions, Promise<string>[] in others.
            // We'll assume Promise<string>[] where string is relay URL if successful, or throws.
            // nostr-tools: await Promise.any(pool.publish(relays, event)) -> resolves on first success, rejects if all fail.
            // Let's try to publish to all and report specific errors if any, or a general one.
            const results = yield* _(
              Effect.tryPromise({
                try: () =>
                  Promise.allSettled(
                    pool.publish(config.relays as string[], event),
                  ),
                catch: (error) =>
                  new NostrPublishError({
                    message: "Failed to publish event",
                    cause: error,
                  }),
              }),
            );

            const failedRelays = results.filter((r) => r.status === "rejected");
            if (failedRelays.length > 0) {
              // Simplified error, could be more granular
              return yield* _(
                Effect.fail(
                  new NostrPublishError({
                    message: `Failed to publish to ${failedRelays.length} relays.`,
                    cause: failedRelays
                      .map((fr) => (fr as PromiseRejectedResult).reason)
                      .join(", "),
                  }),
                ),
              );
            }
          }),

        cleanupPool: () =>
          Effect.try({
            try: () => {
              if (poolInstance) {
                poolInstance.close(config.relays as string[]);
                poolInstance = null;
              }
            },
            catch: (error) =>
              new NostrPoolError({
                message: "Failed to cleanup Nostr pool",
                cause: error,
              }),
          }),
      };
    }

    // Live Layer for NostrService
    export const NostrServiceLive = Layer.effect(
      NostrService,
      Effect.flatMap(NostrServiceConfigTag, (config) =>
        Effect.succeed(createNostrService(config)),
      ),
    );
    ```

2.  **Create `src/services/nostr/index.ts`:**

    ```typescript
    export * from "./NostrService";
    export * from "./NostrServiceImpl";
    ```

---

**Phase 3: Implement Unit Tests for NostrService**

1.  **Create `src/tests/unit/services/nostr/NostrService.test.ts`:**

    ```typescript
    import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
    import { Effect, Layer, Exit, Cause, Option } from "effect";
    import { SimplePool } from "nostr-tools/pool";
    import type {
      Event as NostrToolsEvent,
      Filter as NostrToolsFilter,
    } from "nostr-tools/pure";
    import {
      NostrService,
      NostrServiceLive,
      NostrServiceConfigTag,
      DefaultNostrServiceConfigLayer,
      NostrPoolError,
      NostrRequestError,
      NostrPublishError,
      type NostrEvent,
      type NostrFilter,
    } from "@/services/nostr";

    // Mock nostr-tools/pool
    vi.mock("nostr-tools/pool", () => {
      const mockPoolInstance = {
        list: vi.fn(),
        publish: vi.fn(),
        close: vi.fn(),
        // Add other methods if your service uses them, e.g., subscribeMany
      };
      return {
        SimplePool: vi.fn(() => mockPoolInstance),
        // Export other things if needed, like useWebSocketImplementation (not used here)
      };
    });

    const mockSimplePool = SimplePool as vi.MockedClass<typeof SimplePool>;
    let mockPoolListFn: vi.MockedFunction<any>;
    let mockPoolPublishFn: vi.MockedFunction<any>;
    let mockPoolCloseFn: vi.MockedFunction<any>;

    // Test Config Layer
    const TestNostrConfigLayer = Layer.succeed(
      NostrServiceConfigTag,
      { relays: ["wss://test.relay"], requestTimeoutMs: 500 }, // Short timeout for tests
    );

    const TestNostrServiceLayer = NostrServiceLive.pipe(
      Layer.provide(TestNostrConfigLayer),
    );

    beforeEach(() => {
      vi.clearAllMocks();
      // Get new mock instances for each test
      const poolInstance = new SimplePool();
      mockPoolListFn = poolInstance.list as vi.MockedFunction<any>;
      mockPoolPublishFn = poolInstance.publish as vi.MockedFunction<any>;
      mockPoolCloseFn = poolInstance.close as vi.MockedFunction<any>;
    });

    describe("NostrService", () => {
      describe("getPool", () => {
        it("should initialize and return a SimplePool instance", async () => {
          const program = Effect.service(NostrService).pipe(
            Effect.flatMap((s) => s.getPool()),
          );
          const pool = await Effect.runPromise(
            Effect.provide(program, TestNostrServiceLayer),
          );
          expect(pool).toBeInstanceOf(SimplePool);
          expect(mockSimplePool).toHaveBeenCalledTimes(1);
        });

        it("should return the same pool instance on subsequent calls", async () => {
          const program = Effect.gen(function* (_) {
            const service = yield* _(NostrService);
            const pool1 = yield* _(service.getPool());
            const pool2 = yield* _(service.getPool());
            return { pool1, pool2 };
          });
          const { pool1, pool2 } = await Effect.runPromise(
            Effect.provide(program, TestNostrServiceLayer),
          );
          expect(pool1).toBe(pool2);
          expect(mockSimplePool).toHaveBeenCalledTimes(1); // Constructor called only once
        });
      });

      describe("listEvents", () => {
        it("should fetch and sort events from relays", async () => {
          const mockEvents: NostrEvent[] = [
            {
              id: "ev2",
              kind: 1,
              content: "Event 2",
              created_at: 200,
              pubkey: "pk2",
              sig: "s2",
              tags: [],
            },
            {
              id: "ev1",
              kind: 1,
              content: "Event 1",
              created_at: 100,
              pubkey: "pk1",
              sig: "s1",
              tags: [],
            },
            {
              id: "ev3",
              kind: 1,
              content: "Event 3",
              created_at: 300,
              pubkey: "pk3",
              sig: "s3",
              tags: [],
            },
          ];
          mockPoolListFn.mockResolvedValue(mockEvents);

          const filters: NostrFilter[] = [{ kinds: [1] }];
          const program = Effect.service(NostrService).pipe(
            Effect.flatMap((s) => s.listEvents(filters)),
          );
          const events = await Effect.runPromise(
            Effect.provide(program, TestNostrServiceLayer),
          );

          expect(mockPoolListFn).toHaveBeenCalledWith(
            ["wss://test.relay"],
            filters,
          );
          expect(events).toHaveLength(3);
          expect(events[0].id).toBe("ev3"); // Sorted by created_at descending
          expect(events[1].id).toBe("ev2");
          expect(events[2].id).toBe("ev1");
        });

        it("should return NostrRequestError on pool.list failure", async () => {
          mockPoolListFn.mockRejectedValue(
            new Error("Relay connection failed"),
          );
          const filters: NostrFilter[] = [{ kinds: [1] }];
          const program = Effect.service(NostrService).pipe(
            Effect.flatMap((s) => s.listEvents(filters)),
          );

          const exit = await Effect.runPromiseExit(
            Effect.provide(program, TestNostrServiceLayer),
          );
          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            expect(
              Cause.failureOption(exit.cause).pipe(Option.getOrThrow),
            ).toBeInstanceOf(NostrRequestError);
            expect(
              Cause.failureOption(exit.cause).pipe(Option.getOrThrow).message,
            ).toBe("Failed to list events from relays");
          }
        });

        it("should timeout if pool.list takes too long", async () => {
          mockPoolListFn.mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve([]), 1000)),
          ); // Longer than test timeout

          const filters: NostrFilter[] = [{ kinds: [1] }];
          const program = Effect.service(NostrService).pipe(
            Effect.flatMap((s) => s.listEvents(filters)),
          );

          const exit = await Effect.runPromiseExit(
            Effect.provide(program, TestNostrServiceLayer),
          );
          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause).pipe(
              Option.getOrThrow,
            );
            expect(error).toBeInstanceOf(NostrRequestError);
            expect(error.message).toContain("Relay request timed out");
          }
        });
      });

      describe("publishEvent", () => {
        it("should publish an event to relays", async () => {
          const eventToPublish: NostrEvent = {
            id: "pub-ev1",
            kind: 1,
            content: "Publish test",
            created_at: 400,
            pubkey: "pk-pub",
            sig: "s-pub",
            tags: [],
          };
          // mockPoolPublishFn.mockResolvedValue(undefined); // SimplePool.publish returns Promise<string>[] or Promise<void>[]
          mockPoolPublishFn.mockImplementation(() => Promise.resolve()); // Simulate successful publish to one relay

          const program = Effect.service(NostrService).pipe(
            Effect.flatMap((s) => s.publishEvent(eventToPublish)),
          );
          await Effect.runPromise(
            Effect.provide(program, TestNostrServiceLayer),
          );

          expect(mockPoolPublishFn).toHaveBeenCalledWith(
            ["wss://test.relay"],
            eventToPublish,
          );
        });
      });

      describe("cleanupPool", () => {
        it("should close the pool connection", async () => {
          const program = Effect.gen(function* (_) {
            const service = yield* _(NostrService);
            yield* _(service.getPool()); // Initialize pool first
            yield* _(service.cleanupPool());
          });
          await Effect.runPromise(
            Effect.provide(program, TestNostrServiceLayer),
          );
          expect(mockPoolCloseFn).toHaveBeenCalledWith(["wss://test.relay"]);
        });
      });
    });
    ```

---

**Phase 4: Integrate with UI to Display NIP-90 Events**

1.  **Create a new component `src/components/nip90/Nip90EventList.tsx`:**

    ```typescript
    import React from "react";
    import { useQuery } from "@tanstack/react-query";
    import { Effect } from "effect";
    import {
      NostrService,
      NostrServiceLive,
      DefaultNostrServiceConfigLayer, // Use default config
      type NostrEvent,
      type NostrFilter,
    } from "@/services/nostr";
    import { NIP19Service, NIP19ServiceLive, NIP19EncodeError } from "@/services/nip19"; // For encoding
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
    import { ScrollArea } from "@/components/ui/scroll-area";
    import { Badge } from "@/components/ui/badge";
    import { toHexString } from '@/utils/hex'; // Assuming you'll create this utility

    const NIP90_REQUEST_KINDS_MIN = 5000;
    const NIP90_REQUEST_KINDS_MAX = 5999;

    // Function to fetch NIP-90 events using the NostrService
    async function fetchNip90JobRequests(): Promise<NostrEvent[]> {
      const program = Effect.gen(function* (_) {
        const nostrService = yield* _(NostrService);
        // initializePool is now part of getPool or implicitly handled by listEvents needing the pool
        // The pool is created when NostrService is created by its Layer.

        const nip90RequestKinds = Array.from(
          { length: NIP90_REQUEST_KINDS_MAX - NIP90_REQUEST_KINDS_MIN + 1 },
          (_, i) => NIP90_REQUEST_KINDS_MIN + i
        );

        const filters: NostrFilter[] = [{ kinds: nip90RequestKinds, limit: 20 }]; // Get latest 20 NIP-90 job requests

        // listEvents now requires the pool and config to be in its context
        const events = yield* _(nostrService.listEvents(filters));
        return events;
      }).pipe(
        Effect.provide(NostrServiceLive.pipe(Layer.provide(DefaultNostrServiceConfigLayer))) // Provide full NostrService with its config
      );
      return Effect.runPromise(program);
    }

    // Helper to format event tags for display
    const formatTags = (tags: string[][]): string => {
      return tags.map(tag => `[${tag.map(t => `"${t}"`).join(', ')}]`).join('\n');
    };

    // NIP-19 Encoding hook
    const useNip19Encoding = (hexValue: string, type: 'npub' | 'note' | 'nsec') => {
      const { data: encodedValue, error } = useQuery<string, NIP19EncodeError>({
        queryKey: ['nip19Encode', type, hexValue],
        queryFn: async () => {
          const program = Effect.gen(function* (_) {
            const nip19 = yield* _(NIP19Service);
            switch (type) {
              case 'npub': return yield* _(nip19.encodeNpub(hexValue));
              case 'note': return yield* _(nip19.encodeNote(hexValue));
              case 'nsec':
                // This part needs hexValue to be Uint8Array for nsecEncode
                // For simplicity, we'll assume hexValue is already hex string for npub/note.
                // If you need to encode a secret key, convert hex to Uint8Array first.
                // This hook as is won't correctly encode nsec from hex without `hexToBytes`.
                // For now, this example is simplified.
                throw new Error("nsec encoding from hex not directly supported in this hook version");
            }
          }).pipe(Effect.provide(NIP19ServiceLive));
          return Effect.runPromise(program);
        },
        enabled: !!hexValue,
      });
      if (error) console.error(`Error encoding ${type} for ${hexValue}:`, error);
      return encodedValue || hexValue.substring(0, 12) + '...'; // Fallback or loading
    };

    const Nip90EventCard: React.FC<{ event: NostrEvent }> = ({ event }) => {
      const npub = useNip19Encoding(event.pubkey, 'npub');
      const noteId = useNip19Encoding(event.id, 'note');
      const eventDate = new Date(event.created_at * 1000).toLocaleString();

      return (
        <Card className="mb-4 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm break-all">Note ID: {noteId}</CardTitle>
            <CardDescription className="text-xs">
              Pubkey: {npub} <br />
              Kind: {event.kind} | Created: {eventDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-mono whitespace-pre-wrap break-all bg-muted p-2 rounded">
              <strong>Content:</strong><br/>
              {event.content || "(No content)"}
            </p>
            {event.tags.length > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer">Tags ({event.tags.length})</summary>
                <pre className="font-mono whitespace-pre-wrap break-all bg-muted p-2 rounded mt-1 text-[10px]">
                  {formatTags(event.tags)}
                </pre>
              </details>
            )}
          </CardContent>
          <CardFooter>
            {/* You can add actions or more details here */}
          </CardFooter>
        </Card>
      );
    };

    export default function Nip90EventList() {
      const { data: nip90Events, isLoading, error, refetch } = useQuery<NostrEvent[], Error>({
        queryKey: ['nip90JobRequests'],
        queryFn: fetchNip90JobRequests,
        staleTime: 1000 * 60 * 5, // 5 minutes
      });

      if (isLoading) return <div className="text-center p-4">Loading NIP-90 events...</div>;
      if (error) return <div className="text-center p-4 text-destructive">Error fetching events: {error.message}</div>;
      if (!nip90Events || nip90Events.length === 0) return <div className="text-center p-4">No NIP-90 job requests found.</div>;

      return (
        <div className="p-2 h-full flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">NIP-90 Job Requests</h2>
            <Button onClick={() => refetch()} size="sm">Refresh</Button>
          </div>
          <ScrollArea className="flex-grow">
            <div className="pr-4"> {/* Padding for scrollbar */}
              {nip90Events.map(event => (
                <Nip90EventCard key={event.id} event={event} />
              ))}
            </div>
          </ScrollArea>
        </div>
      );
    }

    ```

2.  **Create `src/utils/hex.ts` (if it doesn't exist):**

    ```typescript
    // src/utils/hex.ts
    export const toHexString = (bytes: Uint8Array): string => {
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    };

    // You might already have hexToBytes from @noble/hashes/utils if used elsewhere
    // If not, and you need it for nsec encoding:
    // import { hexToBytes as nobleHexToBytes } from "@noble/hashes/utils";
    // export const hexToBytes = nobleHexToBytes;
    ```

3.  **Add `Nip90EventList` to `src/pages/HomePage.tsx`:**
    Make a section in `HomePage.tsx` to render this list. For example, put it in a new tab or a dedicated area.

    ```typescript
    // src/pages/HomePage.tsx
    // ... other imports ...
    import Nip90EventList from "@/components/nip90/Nip90EventList"; // Add this
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Add this

    // Create a client (typically at the root of your app)
    const queryClient = new QueryClient();

    export default function HomePage() {
      // ... existing state and hooks ...

      return (
        // Wrap with QueryClientProvider if not already done at a higher level
        <QueryClientProvider client={queryClient}>
          <div className="flex flex-col h-full w-full relative overflow-hidden bg-black">
            {/* ... existing canvas and hand tracking UI ... */}

            {/* Pinnable chat window can be one element */}
            {/* <PinnableChatWindow ... /> */}

            {/* Example: Add NIP-90 list next to or below chat */}
            <div className="absolute top-16 left-4 w-[calc(50%-2rem)] h-[calc(100%-8rem)] z-20" style={{ pointerEvents: 'auto' }}>
              {/* Chat Window */}
              <div className="h-full border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden">
                 <ChatContainer
                    className="bg-transparent !h-full"
                    systemMessage="You are an AI agent named 'Agent' inside an app used by a human called Commander. Respond helpfully but concisely, in 2-3 sentences."
                    model="gemma3:1b"
                  />
              </div>
            </div>

            <div className="absolute top-16 right-4 w-[calc(50%-2rem)] h-[calc(100%-8rem)] z-20" style={{ pointerEvents: 'auto' }}>
              {/* NIP-90 Event List */}
              <div className="h-full border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden text-foreground">
                <Nip90EventList />
              </div>
            </div>


            {/* ... existing test buttons ... */}
          </div>
        </QueryClientProvider>
      );
    }
    ```

    - **Important**: Ensure `QueryClientProvider` wraps your application, typically in `App.tsx` or `renderer.ts`. If it's not already there, you can add it in `HomePage.tsx` as shown for this specific feature, or move it higher up.

---

**Phase 5: Testing and Verification**

1.  **Run Unit Tests:**
    `pnpm test "NostrService"`
    Ensure all tests for `NostrService` pass.

2.  **Run Type Checks:**
    `pnpm t`
    Ensure no TypeScript errors.

3.  **Run Application:**
    `pnpm start`
    - Navigate to the `HomePage`.
    - Open the developer console to check for logs or errors.
    - Verify that the list of NIP-90 events is displayed.
    - Check formatting of pubkeys (npub), event IDs (note), and timestamps.
    - Test the "Refresh" button.

---

This set of instructions covers creating the Nostr service with EffectJS, unit testing it, and integrating it into the React UI using React Query to display NIP-90 events. The UI component provides a basic display; you can enhance it further as needed (e.g., parsing NIP-90 specific tags more deeply). Remember to install `nostr-tools` if it's not already a dependency (`pnpm i nostr-tools`). The `@noble/hashes` package should be a sub-dependency of `nostr-tools`.

The focus is on displaying _job requests_ (kinds 5000-5999). You can expand the filters to include job results (6000-6999) and feedback (7000) if required later.Okay, I will provide detailed coding instructions for implementing the Effect services required to interact with Nostr relays, retrieve NIP-90 events, and prepare for displaying them. This will focus on creating the `NostrService`.

**Goal:** Create the `NostrService` (and its tests) to fetch NIP-90 job request events (kinds 5000-5999). The UI integration part will be handled by another agent, but this service will provide the data.

**Relay List to Use:**

```
wss://purplepag.es/
wss://nos.lol/
wss://relay.damus.io/
wss://relay.snort.social/
wss://offchain.pub/
wss://nostr-pub.wellorder.net/
```

---

**Phase 1: Define NostrService Interface, Types, Errors, and Configuration**

1.  **Create Directory Structure:**

    - If it doesn't exist, create: `src/services/nostr/`

2.  **Create `src/services/nostr/NostrService.ts`:**
    This file will contain the service interface, related data types, custom error types, and the service tag.

    ```typescript
    // src/services/nostr/NostrService.ts
    import { Effect, Context, Data, Layer } from "effect";
    import type {
      Event as NostrToolsEvent,
      Filter as NostrToolsFilter,
      EventTemplate as NostrToolsEventTemplate,
    } from "nostr-tools/pure";
    import type { SimplePool } from "nostr-tools/pool";

    // --- Nostr Event Types (using nostr-tools types) ---
    export type NostrEvent = NostrToolsEvent;
    export type NostrFilter = NostrToolsFilter;
    export type NostrEventTemplate = NostrToolsEventTemplate;

    // --- Custom Error Types ---
    export class NostrPoolError extends Data.TaggedError("NostrPoolError")<{
      message: string;
      cause?: unknown;
    }> {}

    export class NostrRequestError extends Data.TaggedError(
      "NostrRequestError",
    )<{
      message: string;
      cause?: unknown;
    }> {}

    export class NostrPublishError extends Data.TaggedError(
      "NostrPublishError",
    )<{
      message: string;
      cause?: unknown;
    }> {}

    // --- Service Configuration ---
    export interface NostrServiceConfig {
      readonly relays: readonly string[];
      readonly requestTimeoutMs: number; // Timeout for requests like pool.list()
    }
    export const NostrServiceConfigTag =
      Context.GenericTag<NostrServiceConfig>("NostrServiceConfig");

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
          "wss://nostr-pub.wellorder.net/",
        ],
        requestTimeoutMs: 10000, // 10 seconds
      },
    );

    // --- Service Interface ---
    export interface NostrService {
      /**
       * Initializes (if not already) and returns the SimplePool instance.
       * Manages a single pool instance for the service lifetime.
       */
      getPool(): Effect.Effect<SimplePool, NostrPoolError>;

      /**
       * Fetches a list of events from the configured relays based on filters.
       * Sorts events by created_at descending.
       */
      listEvents(
        filters: NostrFilter[],
      ): Effect.Effect<
        NostrEvent[],
        NostrRequestError,
        NostrServiceConfig | SimplePool
      >; // Explicitly list dependencies

      /**
       * Publishes an event to the configured relays.
       * Note: Event signing should happen before calling this.
       */
      publishEvent(
        event: NostrEvent, // nostr-tools Event is already signed and has an id
      ): Effect.Effect<
        void,
        NostrPublishError,
        NostrServiceConfig | SimplePool
      >; // Explicitly list dependencies

      /**
       * Cleans up the pool, closing connections.
       */
      cleanupPool(): Effect.Effect<void, NostrPoolError>;
    }
    export const NostrService =
      Context.GenericTag<NostrService>("NostrService");
    ```

    - **Action**: Create this file with the above content.
    - **Note**: The `listEvents` and `publishEvent` methods require `NostrServiceConfig` and `SimplePool` (implicitly via `getPool`). The `R` (Requirement) type in Effect indicates these dependencies. When we provide the `NostrServiceLive` layer, we'll ensure these are satisfied.

---

**Phase 2: Implement NostrService**

1.  **Create `src/services/nostr/NostrServiceImpl.ts`:**
    This file will contain the concrete implementation of the `NostrService`.

    ```typescript
    // src/services/nostr/NostrServiceImpl.ts
    import { Effect, Layer } from "effect";
    import { SimplePool } from "nostr-tools/pool";
    import type {
      Event as NostrToolsEvent,
      Filter as NostrToolsFilter,
    } from "nostr-tools/pure";
    import {
      NostrService,
      NostrServiceConfigTag, // Import the tag
      type NostrServiceConfig,
      type NostrEvent,
      type NostrFilter,
      NostrPoolError,
      NostrRequestError,
      NostrPublishError,
    } from "./NostrService";

    // Helper to ensure correct event type compatibility if needed
    const asNostrEventArray = (events: NostrToolsEvent[]): NostrEvent[] =>
      events as NostrEvent[];

    // This function creates the service implementation. It will be wrapped in an Effect for the Layer.
    function createNostrServiceInternal(
      config: NostrServiceConfig,
    ): NostrService {
      let poolInstance: SimplePool | null = null;

      const getPoolEffect = Effect.try({
        try: () => {
          if (!poolInstance) {
            poolInstance = new SimplePool({
              eoseSubTimeout: 5000,
              getTimeout: config.requestTimeoutMs / 2,
            });
          }
          return poolInstance;
        },
        catch: (error) =>
          new NostrPoolError({
            message: "Failed to initialize Nostr pool",
            cause: error,
          }),
      });

      return {
        getPool: () => getPoolEffect,

        listEvents: (filters: NostrFilter[]) =>
          Effect.gen(function* (_) {
            const pool = yield* _(getPoolEffect);
            const events = yield* _(
              Effect.tryPromise({
                try: () => pool.list(config.relays as string[], filters),
                catch: (error) =>
                  new NostrRequestError({
                    message: "Failed to list events from relays",
                    cause: error,
                  }),
              }),
              Effect.timeout(config.requestTimeoutMs),
              Effect.mapError((e) => {
                if (e._tag === "TimeoutException") {
                  return new NostrRequestError({
                    message: `Relay request timed out after ${config.requestTimeoutMs}ms`,
                    cause: e,
                  });
                }
                return e as NostrRequestError;
              }),
            );
            return asNostrEventArray(events).sort(
              (a, b) => b.created_at - a.created_at,
            );
          }),

        publishEvent: (event: NostrEvent) =>
          Effect.gen(function* (_) {
            const pool = yield* _(getPoolEffect);
            const publishPromises = pool.publish(
              config.relays as string[],
              event,
            );
            // Promise.allSettled is better to know which relays succeeded/failed
            const results = yield* _(
              Effect.tryPromise({
                try: () => Promise.allSettled(publishPromises),
                catch: (error) =>
                  new NostrPublishError({
                    message: "Failed to publish event due to underlying error",
                    cause: error,
                  }),
              }),
            );

            const failedRelays = results.filter((r) => r.status === "rejected");
            if (failedRelays.length > 0) {
              const reasons = failedRelays
                .map(
                  (fr) =>
                    (fr as PromiseRejectedResult).reason?.toString() ||
                    "unknown error",
                )
                .join(", ");
              return yield* _(
                Effect.fail(
                  new NostrPublishError({
                    message: `Failed to publish to ${failedRelays.length} out of ${config.relays.length} relays. Reasons: ${reasons}`,
                    cause: failedRelays.map(
                      (fr) => (fr as PromiseRejectedResult).reason,
                    ),
                  }),
                ),
              );
            }
            // If all settled promises are fulfilled, it means success or individual relays handled their errors internally.
            // nostr-tools' publish returns Promise<string> for failure reason, or Promise<void> for success for each relay.
            // For simplicity, we assume if no Promise.allSettled rejections, it's broadly successful.
            // A more granular success/failure per relay could be returned.
          }),

        cleanupPool: () =>
          Effect.try({
            try: () => {
              if (poolInstance) {
                poolInstance.close(config.relays as string[]);
                poolInstance = null;
              }
            },
            catch: (error) =>
              new NostrPoolError({
                message: "Failed to cleanup Nostr pool",
                cause: error,
              }),
          }),
      };
    }

    // Live Layer for NostrService
    export const NostrServiceLive = Layer.effect(
      NostrService,
      Effect.flatMap(NostrServiceConfigTag, (config) =>
        Effect.succeed(createNostrServiceInternal(config)),
      ),
    );
    ```

    - **Action**: Create this file with the above content.
    - **Note**: The `publishEvent` implementation with `Promise.allSettled` is a robust way to handle multiple relay publish attempts.

2.  **Create `src/services/nostr/index.ts`:**

    ```typescript
    // src/services/nostr/index.ts
    export * from "./NostrService";
    export * from "./NostrServiceImpl";
    ```

    - **Action**: Create this file.

---

**Phase 3: Implement Unit Tests for NostrService**

1.  **Create Directory Structure:**

    - If it doesn't exist, create: `src/tests/unit/services/nostr/`

2.  **Create `src/tests/unit/services/nostr/NostrService.test.ts`:**

    ```typescript
    // src/tests/unit/services/nostr/NostrService.test.ts
    import { describe, it, expect, vi, beforeEach } from "vitest";
    import { Effect, Layer, Exit, Cause, Option } from "effect";
    import { SimplePool } from "nostr-tools/pool";
    import type {
      Event as NostrToolsEvent,
      Filter as NostrToolsFilter,
    } from "nostr-tools/pure";
    import {
      NostrService,
      NostrServiceLive,
      NostrServiceConfigTag,
      // DefaultNostrServiceConfigLayer, // We'll use a specific test config
      NostrPoolError,
      NostrRequestError,
      NostrPublishError,
      type NostrEvent,
      type NostrFilter,
    } from "@/services/nostr";

    // Mock nostr-tools/pool
    vi.mock("nostr-tools/pool", () => {
      // This is the mock constructor for SimplePool
      const MockSimplePool = vi.fn();
      MockSimplePool.prototype.list = vi.fn();
      MockSimplePool.prototype.publish = vi.fn();
      MockSimplePool.prototype.close = vi.fn();
      // Add other methods if your service uses them, e.g., subscribeMany
      return { SimplePool: MockSimplePool };
    });

    // Get typed instances of the mocks
    const MockedSimplePool = SimplePool as vi.MockedClass<typeof SimplePool>;
    let mockPoolListFn: vi.Mocked<InstanceType<typeof SimplePool>["list"]>;
    let mockPoolPublishFn: vi.Mocked<
      InstanceType<typeof SimplePool>["publish"]
    >;
    let mockPoolCloseFn: vi.Mocked<InstanceType<typeof SimplePool>["close"]>;

    // Test Config Layer
    const TestNostrConfigLayer = Layer.succeed(
      NostrServiceConfigTag,
      { relays: ["wss://test.relay"], requestTimeoutMs: 500 }, // Short timeout for tests
    );

    // Test Service Layer (provides NostrService with test config)
    const TestNostrServiceLayer = NostrServiceLive.pipe(
      Layer.provide(TestNostrConfigLayer),
    );

    beforeEach(() => {
      // Clears all previous mock history and implementations
      MockedSimplePool.mockClear();
      // Re-assign mocked methods for each test to ensure clean state
      // This requires an instance of the mocked SimplePool
      // The constructor is mocked, so `new SimplePool()` returns the mocked instance.
      const poolInstance = new MockedSimplePool();
      mockPoolListFn = poolInstance.list as vi.Mocked<typeof poolInstance.list>;
      mockPoolPublishFn = poolInstance.publish as vi.Mocked<
        typeof poolInstance.publish
      >;
      mockPoolCloseFn = poolInstance.close as vi.Mocked<
        typeof poolInstance.close
      >;
    });

    describe("NostrService", () => {
      describe("getPool", () => {
        it("should initialize and return a SimplePool instance", async () => {
          const program = Effect.flatMap(NostrService, (s) => s.getPool());
          const pool = await Effect.runPromise(
            Effect.provide(program, TestNostrServiceLayer),
          );

          expect(MockedSimplePool).toHaveBeenCalledTimes(1); // Constructor called
          expect(pool).toBeInstanceOf(MockedSimplePool); // Returns an instance of our mock
        });

        it("should return the same pool instance on subsequent calls", async () => {
          const program = Effect.gen(function* (_) {
            const service = yield* _(NostrService);
            const pool1 = yield* _(service.getPool());
            const pool2 = yield* _(service.getPool());
            return { pool1, pool2 };
          });
          const { pool1, pool2 } = await Effect.runPromise(
            Effect.provide(program, TestNostrServiceLayer),
          );
          expect(pool1).toBe(pool2);
          expect(MockedSimplePool).toHaveBeenCalledTimes(1); // Constructor called only once
        });
      });

      describe("listEvents", () => {
        it("should fetch and sort events from relays", async () => {
          const mockEventsInput: NostrToolsEvent[] = [
            // Use NostrToolsEvent for mocking
            {
              id: "ev2",
              kind: 1,
              content: "Event 2",
              created_at: 200,
              pubkey: "pk2",
              sig: "s2",
              tags: [],
            },
            {
              id: "ev1",
              kind: 1,
              content: "Event 1",
              created_at: 100,
              pubkey: "pk1",
              sig: "s1",
              tags: [],
            },
            {
              id: "ev3",
              kind: 1,
              content: "Event 3",
              created_at: 300,
              pubkey: "pk3",
              sig: "s3",
              tags: [],
            },
          ];
          mockPoolListFn.mockResolvedValue(mockEventsInput);

          const filters: NostrFilter[] = [{ kinds: [1] }];
          const program = Effect.flatMap(NostrService, (s) =>
            s.listEvents(filters),
          );
          const events = await Effect.runPromise(
            Effect.provide(program, TestNostrServiceLayer),
          );

          expect(mockPoolListFn).toHaveBeenCalledWith(
            ["wss://test.relay"],
            filters,
          );
          expect(events).toHaveLength(3);
          expect(events[0].id).toBe("ev3"); // Sorted by created_at descending
          expect(events[1].id).toBe("ev2");
          expect(events[2].id).toBe("ev1");
        });

        it("should return NostrRequestError on pool.list failure", async () => {
          mockPoolListFn.mockRejectedValue(
            new Error("Relay connection failed"),
          );
          const filters: NostrFilter[] = [{ kinds: [1] }];
          const program = Effect.flatMap(NostrService, (s) =>
            s.listEvents(filters),
          );

          const exit = await Effect.runPromiseExit(
            Effect.provide(program, TestNostrServiceLayer),
          );
          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause).pipe(
              Option.getOrThrow,
            );
            expect(error).toBeInstanceOf(NostrRequestError);
            expect(error.message).toBe("Failed to list events from relays");
          }
        });

        it("should timeout if pool.list takes too long", async () => {
          mockPoolListFn.mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve([]), 1000)),
          );

          const filters: NostrFilter[] = [{ kinds: [1] }];
          const program = Effect.flatMap(NostrService, (s) =>
            s.listEvents(filters),
          );

          const exit = await Effect.runPromiseExit(
            Effect.provide(program, TestNostrServiceLayer),
          );
          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause).pipe(
              Option.getOrThrow,
            );
            expect(error).toBeInstanceOf(NostrRequestError);
            expect(error.message).toContain(
              "Relay request timed out after 500ms",
            );
          }
        });
      });

      describe("publishEvent", () => {
        const eventToPublish: NostrEvent = {
          id: "pub-ev1",
          kind: 1,
          content: "Publish test",
          created_at: 400,
          pubkey: "pk-pub",
          sig: "s-pub",
          tags: [],
        };

        it("should publish an event to relays successfully", async () => {
          mockPoolPublishFn.mockReturnValue([
            Promise.resolve("wss://test.relay/success" as any),
          ]); // Simulate success from one relay

          const program = Effect.flatMap(NostrService, (s) =>
            s.publishEvent(eventToPublish),
          );
          const exit = await Effect.runPromiseExit(
            Effect.provide(program, TestNostrServiceLayer),
          );

          expect(Exit.isSuccess(exit)).toBe(true);
          expect(mockPoolPublishFn).toHaveBeenCalledWith(
            ["wss://test.relay"],
            eventToPublish,
          );
        });

        it("should return NostrPublishError if all relays fail to publish", async () => {
          mockPoolPublishFn.mockReturnValue([
            Promise.reject("Failed at wss://test.relay") as any,
          ]);

          const program = Effect.flatMap(NostrService, (s) =>
            s.publishEvent(eventToPublish),
          );
          const exit = await Effect.runPromiseExit(
            Effect.provide(program, TestNostrServiceLayer),
          );

          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause).pipe(
              Option.getOrThrow,
            );
            expect(error).toBeInstanceOf(NostrPublishError);
            expect(error.message).toContain(
              "Failed to publish to 1 out of 1 relays",
            );
          }
        });
      });

      describe("cleanupPool", () => {
        it("should close the pool connection if initialized", async () => {
          // First, ensure the pool is "initialized" by calling getPool
          await Effect.runPromise(
            Effect.provide(
              Effect.flatMap(NostrService, (s) => s.getPool()),
              TestNostrServiceLayer,
            ),
          );

          const program = Effect.flatMap(NostrService, (s) => s.cleanupPool());
          await Effect.runPromise(
            Effect.provide(program, TestNostrServiceLayer),
          );

          expect(mockPoolCloseFn).toHaveBeenCalledWith(["wss://test.relay"]);
        });

        it("should not throw if pool was not initialized", async () => {
          const program = Effect.flatMap(NostrService, (s) => s.cleanupPool());
          const exit = await Effect.runPromiseExit(
            Effect.provide(program, TestNostrServiceLayer),
          );
          expect(Exit.isSuccess(exit)).toBe(true);
          expect(mockPoolCloseFn).not.toHaveBeenCalled();
        });
      });
    });
    ```

    - **Action**: Create this file with the above content.
    - **Note**: The mock for `nostr-tools/pool` is crucial. We mock the `SimplePool` class and its methods. `beforeEach` ensures mocks are reset.

---

**Phase 4: Preliminary UI Integration (Conceptual - for the UI agent)**

The UI agent will perform the actual integration. However, here's how the service would typically be used in a React component with `@tanstack/react-query` to fetch NIP-90 job requests. This is for your context.

1.  **Modify `src/pages/HomePage.tsx` or create `src/components/nip90/Nip90EventList.tsx`:**

    ```tsx
    // Example conceptual usage in a React component (e.g., Nip90EventList.tsx)
    import React from "react";
    import { useQuery } from "@tanstack/react-query";
    import { Effect, Layer } from "effect";
    import {
      NostrService,
      NostrServiceLive,
      DefaultNostrServiceConfigLayer, // Provides default relay list
      type NostrEvent,
      type NostrFilter,
    } from "@/services/nostr"; // Assuming index exports
    import { NIP19Service, NIP19ServiceLive } from "@/services/nip19"; // For encoding pubkeys/ids

    const NIP90_REQUEST_KINDS_MIN = 5000;
    const NIP90_REQUEST_KINDS_MAX = 5999;

    async function fetchNip90JobRequests(): Promise<NostrEvent[]> {
      const nip90RequestKinds = Array.from(
        { length: NIP90_REQUEST_KINDS_MAX - NIP90_REQUEST_KINDS_MIN + 1 },
        (_, i) => NIP90_REQUEST_KINDS_MIN + i,
      );
      const filters: NostrFilter[] = [{ kinds: nip90RequestKinds, limit: 20 }];

      // Create the full layer for NostrService including its config dependency
      const fullNostrServiceLayer = NostrServiceLive.pipe(
        Layer.provide(DefaultNostrServiceConfigLayer),
      );

      const program = Effect.gen(function* (_) {
        const nostr = yield* _(NostrService);
        // getPool() is called implicitly by listEvents if needed, or can be called explicitly
        // yield* _(nostr.getPool()); // Ensure pool is ready
        return yield* _(nostr.listEvents(filters));
      }).pipe(Effect.provide(fullNostrServiceLayer));

      return Effect.runPromise(program);
    }

    // A simple component to display one event (conceptual)
    const EventItem: React.FC<{ event: NostrEvent }> = ({ event }) => {
      // Example: use NIP19Service to encode pubkey
      const { data: npub } = useQuery({
        queryKey: ["npub", event.pubkey],
        queryFn: () =>
          Effect.runPromise(
            Effect.provide(
              Effect.flatMap(NIP19Service, (nip19) =>
                nip19.encodeNpub(event.pubkey),
              ),
              NIP19ServiceLive,
            ),
          ),
      });

      return (
        <div
          style={{ border: "1px solid #ccc", margin: "8px", padding: "8px" }}
        >
          <p>
            <strong>ID:</strong> {event.id.substring(0, 10)}...
          </p>
          <p>
            <strong>Pubkey:</strong>{" "}
            {npub || event.pubkey.substring(0, 10) + "..."}
          </p>
          <p>
            <strong>Kind:</strong> {event.kind}
          </p>
          <p>
            <strong>Created:</strong>{" "}
            {new Date(event.created_at * 1000).toLocaleString()}
          </p>
          <p>
            <strong>Content:</strong> <pre>{event.content}</pre>
          </p>
          <details>
            <summary>Tags ({event.tags.length})</summary>
            <pre>{JSON.stringify(event.tags, null, 2)}</pre>
          </details>
        </div>
      );
    };

    export function Nip90EventListDisplay() {
      const {
        data: events,
        isLoading,
        error,
        refetch,
      } = useQuery<NostrEvent[], Error>({
        queryKey: ["nip90JobRequests"],
        queryFn: fetchNip90JobRequests,
        staleTime: 1000 * 60 * 1, // 1 minute
      });

      if (isLoading) return <p>Loading NIP-90 events...</p>;
      if (error) return <p>Error fetching events: {error.message}</p>;

      return (
        <div>
          <button onClick={() => refetch()}>Refresh NIP-90 Events</button>
          {events && events.length > 0 ? (
            events.map((event) => <EventItem key={event.id} event={event} />)
          ) : (
            <p>No NIP-90 job requests found.</p>
          )}
        </div>
      );
    }
    ```

    - **UI Agent Task**: The UI agent will integrate `Nip90EventListDisplay` (or similar logic) into `HomePage.tsx` or another appropriate place, ensuring `QueryClientProvider` is set up.

---

**Phase 5: Final Checks**

1.  **Run All Unit Tests:**
    `pnpm test`
    Ensure all tests pass, including the new `NostrService.test.ts`.

2.  **Run Type Checks:**
    `pnpm t`
    Ensure no TypeScript errors.

This set of instructions provides a well-structured, testable `NostrService` using EffectJS for interacting with Nostr relays. The next step for the UI agent will be to consume this service and display the data. Remember to `pnpm i nostr-tools` if it's not already in `package.json`.
