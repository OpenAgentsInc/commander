Okay, this is a significant refactoring task. I'll provide detailed instructions for the coding agent, focusing on clarity and covering the specified requirements.

**Overall Goal:**
Replace all standard `console.*` calls (log, error, warn, info, debug) throughout the application with the new `TelemetryService`. This service will log to the actual console in development mode and do nothing in production, by default. The change must ensure existing tests pass (or are updated appropriately) and all type checks succeed. A specific diagnostic issue related to NIP-90 publish failures must be resolved by ensuring telemetry captures the necessary details.

---

**Phase 1: Modify `TelemetryServiceImpl.ts` for Dev/Prod Behavior**

1.  **File to Modify:** `src/services/telemetry/TelemetryServiceImpl.ts`
2.  **Task:** Update the service to enable telemetry logging by default in development mode and disable it in production mode.

    ```typescript
    // src/services/telemetry/TelemetryServiceImpl.ts
    import { Effect, Layer, Schema } from "effect";
    import {
      TelemetryService,
      TelemetryEvent,
      TelemetryEventSchema,
      TelemetryError,
      TrackEventError,
    } from "./TelemetryService";

    /**
     * Create the Telemetry service implementation
     */
    export function createTelemetryService(): TelemetryService {
      // Determine if telemetry should be enabled based on environment
      // Vite uses import.meta.env.MODE for 'development' or 'production' in client-side code.
      const isDevelopmentMode = import.meta.env.MODE === "development";
      // Default behavior: full telemetry in dev, no telemetry in prod.
      let telemetryEnabled = isDevelopmentMode;

      const trackEvent = (
        event: TelemetryEvent,
      ): Effect.Effect<void, TrackEventError> => {
        return Effect.gen(function* (_) {
          yield* _(
            Schema.decodeUnknown(TelemetryEventSchema)(event),
            Effect.mapError(
              (error) =>
                new TrackEventError({
                  message: "Invalid event format",
                  cause: error,
                }),
            ),
          );

          let currentIsEnabled = false;
          try {
            // Use a local variable to avoid race conditions if isEnabled() was async from storage
            currentIsEnabled = yield* _(
              isEnabled().pipe(
                Effect.mapError(
                  (error) =>
                    new TrackEventError({
                      message: `Error checking telemetry status: ${error.message}`,
                      cause: error.cause,
                    }),
                ),
              ),
            );
          } catch (error) {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error(
              "TelemetryService: Error checking telemetry status in trackEvent:",
              error,
            );
            // Default to not tracking if status check fails, but don't break the app
            currentIsEnabled = false;
          }

          if (!currentIsEnabled) {
            return; // Silently do nothing if telemetry is disabled
          }

          const eventWithTimestamp = {
            ...event,
            timestamp: event.timestamp || Date.now(),
          };

          try {
            const isTestEnv =
              process.env.NODE_ENV === "test" ||
              process.env.VITEST !== undefined;
            if (!isTestEnv) {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (This is the service's own logging mechanism)
              console.log("[Telemetry]", eventWithTimestamp);
            }
            return;
          } catch (cause) {
            // This throw will be caught by the Effect runtime if trackEvent is run within an Effect
            throw new TrackEventError({
              message: "Failed to track event via console.log",
              cause,
            });
          }
        });
      };

      const isEnabled = (): Effect.Effect<boolean, TelemetryError> => {
        return Effect.try({
          try: () => telemetryEnabled,
          catch: (cause) =>
            new TelemetryError({
              message: "Failed to check if telemetry is enabled",
              cause,
            }),
        });
      };

      const setEnabled = (
        enabled: boolean,
      ): Effect.Effect<void, TelemetryError> => {
        return Effect.try({
          try: () => {
            telemetryEnabled = enabled;
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log(
              `[TelemetryService] Telemetry explicitly set to: ${enabled}`,
            );
            return;
          },
          catch: (cause) =>
            new TelemetryError({
              message: "Failed to set telemetry enabled state",
              cause,
            }),
        });
      };

      return {
        trackEvent,
        isEnabled,
        setEnabled,
      };
    }

    export const TelemetryServiceLive = Layer.succeed(
      TelemetryService,
      createTelemetryService(),
    );
    ```

3.  **Verification:**
    - Manually confirm `import.meta.env.MODE` is correctly reflecting "development" when running `pnpm start` and "production" in a built app (if easy to check). The `telemetryEnabled` variable should initialize accordingly.

---

**Phase 2: Implement the Console Replacement Logic**

1.  **Files to Modify:** All `.ts` and `.tsx` files within `src/` directory, **EXCLUDING**:

    - `src/services/telemetry/TelemetryServiceImpl.ts`
    - `src/tests/vitest.setup.ts`
    - Any `console.error` calls that are specifically marked with `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL` (these are telemetry system's own fallbacks).

2.  **Iterate through each identified file and each `console.*` call:**

    **2.1. Add Imports:**
    At the top of the file, if not already present, add:

    ```typescript
    import { Effect, Layer, Cause, Exit } from "effect"; // Exit may not always be needed
    import {
      TelemetryService,
      TelemetryServiceLive,
      type TelemetryEvent,
    } from "@/services/telemetry";
    ```

    **2.2. Replace `console.*` calls:**
    For each call (e.g., `console.log(arg1, arg2, ...)`):

    **A. Determine Category:**

    ```typescript
    let telemetryCategory: string;
    // Example: if original was console.log
    // telemetryCategory = "log:info";
    // Example: if original was console.error
    // telemetryCategory = "log:error";
    ```

    Map as follows:

    - `console.log` -> `"log:info"`
    - `console.info` -> `"log:info"`
    - `console.debug` -> `"log:debug"`
    - `console.warn` -> `"log:warn"`
    - `console.error` -> `"log:error"`

    **B. Construct Payload (`label` and `value`):**
    Let `args` be the array of arguments passed to the original console call.

    ```typescript
    let telemetryLabel: string | undefined = undefined;
    let telemetryValue: any = undefined;

    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === "string") {
        telemetryLabel = firstArg;
        if (args.length > 1) {
          const remainingArgs = args.slice(1);
          if (remainingArgs.length === 1 && remainingArgs[0] instanceof Error) {
            const err = remainingArgs[0] as Error;
            telemetryValue = {
              name: err.name,
              message: err.message,
              stack: err.stack,
            };
          } else if (
            remainingArgs.length === 1 &&
            (typeof remainingArgs[0] === "string" ||
              typeof remainingArgs[0] === "number" ||
              typeof remainingArgs[0] === "boolean")
          ) {
            telemetryValue = remainingArgs[0];
          } else {
            telemetryValue = remainingArgs; // Store as an array
          }
        }
      } else if (firstArg instanceof Error) {
        const err = firstArg as Error;
        telemetryLabel = err.message || "Error object logged";
        telemetryValue = {
          name: err.name,
          message: err.message,
          stack: err.stack,
        };
        if (args.length > 1) {
          // If there are more args after an initial error object, append them to the value.
          // This is less common but good to handle.
          telemetryValue.additionalArgs = args.slice(1);
        }
      } else {
        // First arg is not a string and not an Error (e.g., an object or number)
        if (args.length === 1) {
          telemetryValue = firstArg;
        } else {
          telemetryValue = args; // Store all args as an array
        }
      }
    }

    // Ensure telemetryValue is stringified if it's an object or array
    if (
      telemetryValue !== undefined &&
      (typeof telemetryValue === "object" || Array.isArray(telemetryValue))
    ) {
      try {
        telemetryValue = JSON.stringify(telemetryValue);
      } catch (e) {
        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.error(
          "TelemetryService: Failed to stringify value for telemetry",
          e,
          telemetryValue,
        );
        telemetryValue = "[Unstringifiable Object]";
      }
    }

    const eventData: TelemetryEvent = {
      category: telemetryCategory,
      action: "generic_console_replacement", // Or a more specific action if discernible
      label: telemetryLabel,
      value: telemetryValue,
    };
    ```

    **C. Create and Run Effect Program:**
    Replace the original `console.*(...)` call with:

    ```typescript
    Effect.gen(function* (_) {
      const telemetryService = yield* _(TelemetryService);
      yield* _(telemetryService.trackEvent(eventData)); // eventData from step B
    }).pipe(Effect.provide(TelemetryServiceLive), (effect) =>
      Effect.runPromise(effect).catch((err) => {
        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.error(
          "TelemetryService.trackEvent failed:",
          err instanceof Error ? err.message : String(err),
          Cause.pretty(err),
        );
      }),
    );
    ```

    - **Note on `Cause.pretty(err)`:** If `err` is not an Effect `Cause` (e.g., a direct error from `JSON.stringify` if it were to throw before the Effect pipeline), `Cause.pretty(err)` might not be ideal. However, `Effect.runPromise` itself wraps promise rejections into `Cause.Die`.
    - The `(effect) => Effect.runPromise(effect).catch(...)` part is important. `Effect.runPromiseExit` or `Effect.catchAll` within the pipe are alternatives if more structured error handling of the telemetry effect itself is needed. `runPromise().catch()` is simple and effective for fire-and-forget.

    **Specific Example (Nostr Publish Failure in `Nip90RequestForm.tsx`):**

    - **Original:**
      ```typescript
      // console.error('Failed to publish NIP-90 request:', Cause.pretty(exit.cause));
      // const underlyingError = Cause.failureOption(exit.cause);
      // const errorMessage = underlyingError._tag === "Some" && underlyingError.value instanceof Error ?
      //                      underlyingError.value.message : "Unknown error during publishing.";
      // setPublishError(`Publishing failed: ${errorMessage}`);
      ```
    - The `console.error` line above will be replaced. `errorMessage` already holds the specific error like "Failed to publish to 2 out of 6 relays".
    - **Replacement:**

      ```typescript
      // const underlyingError = Cause.failureOption(exit.cause); // This line is still needed to get errorMessage
      // const errorMessage = ... // This line is still needed

      const telemetryDataForPublishFailure: TelemetryEvent = {
        category: "log:error",
        action: "nip90_publish_failure", // More specific action
        label: `Publishing NIP-90 request failed: ${errorMessage}`, // Use the already extracted message
        value: Cause.pretty(exit.cause), // Full cause for details
      };
      Effect.gen(function* (_) {
        const telemetry = yield* _(TelemetryService);
        yield* _(telemetry.trackEvent(telemetryDataForPublishFailure));
      }).pipe(Effect.provide(TelemetryServiceLive), (effect) =>
        Effect.runPromise(effect).catch((err) => {
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.error(
            "TelemetryService.trackEvent failed for NIP-90 publish error:",
            err,
          );
        }),
      );
      // setPublishError(`Publishing failed: ${errorMessage}`); // This line remains for UI
      ```

3.  **Review and Test:**
    - Run `pnpm t` to catch TypeScript errors.
    - Run `pnpm test`. Fix any test failures. Tests that were asserting `console.log` calls will need those assertions removed or adapted.
    - Manually run the application (`pnpm start`).
      - Verify that previously `console.log`'d messages now appear in the console prefixed with `[Telemetry]`.
      - Specifically test the NIP-90 encrypted event publishing failure scenario. Ensure the detailed error message (e.g., "Publishing failed: Failed to publish to 2 out of 6 relays. Reasons: ...") appears in the telemetry log on the console.
      - Test in a production-like environment (if possible by temporarily setting `isDevelopmentMode = false` in `TelemetryServiceImpl.ts`) to confirm no telemetry logs appear. (Then revert this temporary change).

---

**Phase 3: Update Documentation**

1.  **File to Modify:** `docs/AGENTS.md`
2.  **Action:** Add a new section detailing the logging and telemetry conventions.

    ````diff
    --- a/docs/AGENTS.md
    +++ b/docs/AGENTS.md
    @@ -132,3 +132,42 @@
     This document should provide a solid foundation for understanding and working with the OpenAgents Commander codebase. For more specific details, refer to the individual configuration files mentioned and the original `README-template.md`.
    +
    +## 11. Logging and Telemetry
    +
    +For all application logging, event tracking, and diagnostics, the **`TelemetryService` MUST be used**. This ensures a centralized and controllable way to manage diagnostic data. In development mode, the `TelemetryService` logs to the console. In production mode, it is silent by default.
    +
    +**Key Guidelines:**
    +
    +*   **DO NOT USE `console.log()`, `console.warn()`, `console.error()`, `console.info()`, or `console.debug()` directly for application-level logging or diagnostics.**
    +    *   These methods bypass our telemetry system.
    +    *   They may be used for *temporary, local debugging only* and **MUST be removed** before committing code.
    +*   **USE `TelemetryService.trackEvent()` for all logging purposes.**
    +    *   This includes informational messages, warnings, errors, and tracking of feature usage or significant application events.
    +*   **Exceptions:**
    +    *   The `TelemetryServiceImpl.ts` itself uses `console.log()` as its current output mechanism in development mode. This is the ONLY place where direct `console.log()` usage related to telemetry is acceptable.
    +    *   If `TelemetryService.trackEvent()` itself fails, the fallback error handler in the calling code might use `console.error()` (marked with `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL`) to report the telemetry system failure.
    +    *   The file `src/tests/vitest.setup.ts` also uses console methods for test environment setup and should not be modified.
    +
    +**How to Use `TelemetryService.trackEvent()`:**
    +
    +1.  **Import necessary modules:**
    +    ```typescript
    +    import { Effect, Layer, Cause, Exit } from 'effect'; // Or other Effect primitives as needed
    +    import { TelemetryService, TelemetryServiceLive, type TelemetryEvent } from '@/services/telemetry';
    +    ```
    +
    +2.  **Construct your event data:**
    +    For general logs (replacing old `console.*` calls), map console levels to categories (`log:info`, `log:warn`, `log:error`, `log:debug`) and use `action: "generic_console_replacement"`.
    +    ```typescript
    +    const eventData: TelemetryEvent = {
    +      category: "log:error", // e.g., for a console.error replacement
    +      action: "user_login_failure", // Or "generic_console_replacement"
    +      label: "User login failed for user_xyz", // Main message or context
    +      value: JSON.stringify({ reason: "Invalid password", attempt: 3 }) // Additional structured data, stringified
    +    };
    +    ```
    +
    +3.  **Create and run the Effect program:**
    +    ```typescript
    +    Effect.gen(function* (_) {
    +      const telemetryService = yield* _(TelemetryService);
    +      yield* _(telemetryService.trackEvent(eventData));
    +    }).pipe(
    +      Effect.provide(TelemetryServiceLive), // Provide the service layer
    +      (effect) => Effect.runPromise(effect).catch(err => {
    +        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
    +        console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err), Cause.pretty(err)); // Fallback for telemetry system errors
    +      })
    +    );
    +    ```
    +    *   The `.pipe(Effect.provide(TelemetryServiceLive), ...)` part is crucial if the code is not already running within an Effect context that has `TelemetryServiceLive` provided (e.g. at the root of your application or a major component).
    +    *   Using `Effect.runPromise(effect).catch(...)` ensures that telemetry operations are non-blocking and their errors don't crash the main application flow.
    +
    +**Refer to `docs/TELEMETRY.md` for comprehensive documentation on the Telemetry Service, including standard event categories, schema details, and advanced usage.**
    ````

This detailed plan should guide the agent through the refactoring process successfully. The key is systematic replacement and careful testing. The success criterion regarding the NIP-90 publish failure diagnostic is directly addressed by ensuring the error details are part of the telemetry event.
The telemetry system itself will log to console in dev mode, so the experience for developers regarding diagnostics should remain similar, just channeled through `TelemetryService`.Okay, this is a multi-faceted task. I will provide a set of instructions for the coding agent to follow.

**Phase 1: Modify `TelemetryServiceImpl.ts` for Dev/Prod Behavior**

1.  **File to Modify:** `src/services/telemetry/TelemetryServiceImpl.ts`
2.  **Objective:** Update the service to enable telemetry logging by default in development mode and disable it in production mode. The service should still allow its `setEnabled` method to override this default for the current session.

    **Instructions:**
    Modify `src/services/telemetry/TelemetryServiceImpl.ts` as follows:

    - At the beginning of the `createTelemetryService` function, determine `isDevelopmentMode` using `import.meta.env.MODE === 'development'`.
    - Initialize `telemetryEnabled` based on `isDevelopmentMode`.
    - The `isEnabled()` method should return the current value of `telemetryEnabled`.
    - The `setEnabled(enabled: boolean)` method should update `telemetryEnabled` and log this action to the console (this specific console log should be marked with `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL`).
    - The `trackEvent` method should:
      - First, check the current `telemetryEnabled` state (by calling `isEnabled()` internally or using the `telemetryEnabled` variable). If disabled, it should do nothing and return.
      - If enabled, it proceeds with schema validation and logging.
      - The `console.log("[Telemetry]", eventWithTimestamp);` call within `trackEvent` is part of the service's development logging mechanism and should remain, but also be marked with `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL` to prevent it from being replaced in the next phase.
      - Ensure any internal errors from checking `isEnabled()` within `trackEvent` are caught and logged to `console.error` (marked `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL`), and default to not tracking the event if this check fails.

    **Reference (Conceptual changes):**

    ```typescript
    // src/services/telemetry/TelemetryServiceImpl.ts
    // ... imports ...

    export function createTelemetryService(): TelemetryService {
      const isDevelopmentMode = import.meta.env.MODE === "development";
      let telemetryEnabled = isDevelopmentMode; // Default based on environment

      const isEnabled = (): Effect.Effect<boolean, TelemetryError> => {
        return Effect.succeed(telemetryEnabled); // Simplified for direct access
      };

      const trackEvent = (
        event: TelemetryEvent,
      ): Effect.Effect<void, TrackEventError> => {
        return Effect.gen(function* (_) {
          // Check if telemetry is enabled
          const currentIsEnabled = yield* _(
            isEnabled(),
            Effect.catchAll((err) => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error(
                "TelemetryService: Critical error in isEnabled() check within trackEvent",
                err,
              );
              return Effect.succeed(false); // Default to false if status check fails
            }),
          );

          if (!currentIsEnabled) {
            return; // Silently do nothing
          }

          // Validate the event using Schema (as before)
          yield* _(
            Schema.decodeUnknown(TelemetryEventSchema)(event),
            Effect.mapError(
              (parseError) =>
                new TrackEventError({
                  message: "Invalid event format",
                  cause: parseError,
                }),
            ),
          );

          const eventWithTimestamp = {
            /* ... as before ... */
          };

          try {
            const isTestEnv =
              process.env.NODE_ENV === "test" ||
              process.env.VITEST !== undefined;
            if (!isTestEnv) {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.log("[Telemetry]", eventWithTimestamp);
            }
          } catch (cause) {
            throw new TrackEventError({
              message: "Failed to track event via console.log",
              cause,
            });
          }
        });
      };

      const setEnabled = (
        enabled: boolean,
      ): Effect.Effect<void, TelemetryError> => {
        return Effect.sync(() => {
          telemetryEnabled = enabled;
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.log(
            `[TelemetryService] Telemetry explicitly set to: ${enabled}`,
          );
        });
      };

      return { trackEvent, isEnabled, setEnabled };
    }

    // ... TelemetryServiceLive ...
    ```

---

**Phase 2: Implement the Console Call Replacement**

1.  **Target Files:** All `.ts` and `.tsx` files within the `src/` directory.
2.  **Excluded Files:**

    - `src/services/telemetry/TelemetryServiceImpl.ts`
    - `src/tests/vitest.setup.ts`
    - Any `console.error` calls that are explicitly marked with the comment `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL` above them.

3.  **Procedure for each identified `console.*` call:**

    **A. Add Imports:**
    Ensure these imports are at the top of the file. Add them if missing:

    ```typescript
    import { Effect, Layer, Cause, Exit } from "effect";
    import {
      TelemetryService,
      TelemetryServiceLive,
      type TelemetryEvent,
    } from "@/services/telemetry";
    ```

    **B. Determine Telemetry Category:**
    Map the original console method to a `telemetryCategory` string:

    - `console.log` -> `"log:info"`
    - `console.info` -> `"log:info"`
    - `console.debug` -> `"log:debug"`
    - `console.warn` -> `"log:warn"`
    - `console.error` -> `"log:error"`

    **C. Construct Telemetry Payload:**
    Let `originalArgs` be the array of arguments from the console call (e.g., `console.log(arg1, arg2)` -> `originalArgs = [arg1, arg2]`).

    ```typescript
    let telemetryLabel: string | undefined = undefined;
    let telemetryValue: any = undefined;

    if (originalArgs.length > 0) {
      const firstArg = originalArgs[0];
      if (typeof firstArg === "string") {
        telemetryLabel = firstArg;
        if (originalArgs.length > 1) {
          const remainingArgs = originalArgs.slice(1);
          // If only one remaining arg and it's a primitive or Error, use it directly for value
          if (remainingArgs.length === 1) {
            if (remainingArgs[0] instanceof Error) {
              const err = remainingArgs[0] as Error;
              telemetryValue = {
                name: err.name,
                message: err.message,
                stack: err.stack,
              };
            } else if (
              typeof remainingArgs[0] === "string" ||
              typeof remainingArgs[0] === "number" ||
              typeof remainingArgs[0] === "boolean" ||
              remainingArgs[0] === null ||
              remainingArgs[0] === undefined
            ) {
              telemetryValue = remainingArgs[0];
            } else {
              telemetryValue = remainingArgs; // Array with one complex item
            }
          } else {
            telemetryValue = remainingArgs; // Array of remaining items
          }
        }
      } else if (firstArg instanceof Error) {
        const err = firstArg as Error;
        telemetryLabel = err.message || "Error object logged"; // Use error message as label
        telemetryValue = {
          name: err.name,
          message: err.message,
          stack: err.stack,
        };
        if (originalArgs.length > 1) {
          telemetryValue.additionalArgs = originalArgs.slice(1);
        }
      } else {
        // First arg is not a string and not an Error (e.g., an object or number)
        if (originalArgs.length === 1) {
          telemetryValue = firstArg;
        } else {
          telemetryLabel = "Multiple objects logged"; // Generic label
          telemetryValue = originalArgs;
        }
      }
    }

    // Smart stringification for telemetryValue
    if (
      telemetryValue !== undefined &&
      telemetryValue !== null &&
      !(
        typeof telemetryValue === "string" ||
        typeof telemetryValue === "number" ||
        typeof telemetryValue === "boolean"
      )
    ) {
      try {
        // For Cause objects, use Cause.pretty for better readability
        if (Cause && Cause.isCause(telemetryValue)) {
          telemetryValue = Cause.pretty(telemetryValue);
        } else {
          telemetryValue = JSON.stringify(telemetryValue);
        }
      } catch (e) {
        // Non-critical console call, if stringify fails, log a placeholder
        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.error(
          "TelemetryService Agent: Failed to stringify value for telemetry event",
          e,
          telemetryValue,
        );
        telemetryValue = "[Unstringifiable Value]";
      }
    }

    const eventData: TelemetryEvent = {
      category: telemetryCategory, // From step B
      action: "generic_console_replacement",
      label: telemetryLabel,
      value: telemetryValue,
    };
    ```

    **D. Replace with Effect Program:**
    Replace the original `console.*(...)` call with:

    ```typescript
    Effect.gen(function* (_) {
      const telemetryService = yield* _(TelemetryService);
      yield* _(telemetryService.trackEvent(eventData)); // eventData from step C
    }).pipe(Effect.provide(TelemetryServiceLive), (effect) =>
      Effect.runPromise(effect).catch((err) => {
        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.error(
          "TelemetryService.trackEvent failed:",
          err instanceof Error ? err.message : String(err),
          "\nCause:",
          Cause.isCause(err) ? Cause.pretty(err) : String(err),
        );
      }),
    );
    ```

    **E. Specific Handling for the NIP-90 Publish Failure Case:**
    Locate the `console.error` call in `src/components/nip90/Nip90RequestForm.tsx` within the `handlePublishRequest` function, specifically the one logging "Failed to publish NIP-90 request".
    The `errorMessage` variable already holds the detailed NIP-90 error message.
    The replacement should be:

    ```typescript
    // Original: console.error('Failed to publish NIP-90 request:', Cause.pretty(exit.cause));
    // Ensure 'errorMessage' and 'exit.cause' are in scope from the surrounding 'else' block.

    const telemetryDataForPublishFailure: TelemetryEvent = {
      category: "log:error",
      action: "nip90_publish_failure", // Specific action
      label: `Publishing NIP-90 request failed: ${errorMessage}`, // Use the specific UI error message
      value: Cause.isCause(exit.cause)
        ? Cause.pretty(exit.cause)
        : String(exit.cause), // Full cause for details
    };
    Effect.gen(function* (_) {
      const telemetry = yield* _(TelemetryService);
      yield* _(telemetry.trackEvent(telemetryDataForPublishFailure));
    }).pipe(Effect.provide(TelemetryServiceLive), (effect) =>
      Effect.runPromise(effect).catch((telemetryErr) => {
        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.error(
          "TelemetryService.trackEvent failed for NIP-90 publish error:",
          telemetryErr,
        );
      }),
    );
    // The setPublishError(`Publishing failed: ${errorMessage}`); line for UI update remains.
    ```

---

**Phase 3: Testing and Verification**

1.  **Run Type Checks:** Execute `pnpm run t`. Address any TypeScript errors.
2.  **Run Existing Tests:** Execute `pnpm test`.
    - Tests that were asserting `console.*` calls (e.g., by spying on `console.log`) will likely fail. These assertions should be removed or, if the log's content was critical to the test, the test should be adapted to verify the behavior in another way or mock `TelemetryService.trackEvent` if essential.
    - Fix any other test failures that arise due to the refactoring.
3.  **New Tests (Conceptual - for `TelemetryServiceImpl.ts` behavior):**

    - Verify that `createTelemetryService().isEnabled()` returns `true` when `import.meta.env.MODE` is `'development'`.
    - Verify that `createTelemetryService().isEnabled()` returns `false` when `import.meta.env.MODE` is `'production'`.
    - These tests might require mocking `import.meta.env.MODE`. Vitest provides ways to do this (e.g., `vi.stubEnv` or `vi.mock('vite', () => ({ importMetaEnv: { MODE: '...' } }))`). For simplicity, manual verification during development might suffice if full test setup is complex.

4.  **Manual Verification (Crucial for Success Criterion):**
    - Run the application using `pnpm start` (dev mode).
    - Trigger the NIP-90 encrypted event publishing scenario that previously showed the error "Publishing failed: Failed to publish to 2 out of 6 relays" on the UI but had no console logs.
    - **Expected:** In the developer console, you should now see a log from the `TelemetryService` (prefixed with `[Telemetry]`) containing:
      - `category: "log:error"`
      - `action: "nip90_publish_failure"`
      - `label` that includes "Publishing failed: Failed to publish to 2 out of 6 relays" (or similar, matching `errorMessage`).
      - `value` containing the pretty-printed `Cause` of the Nostr publish failure, which provides the detailed reasons.
    - Check a few other places in the app where console logs were common (e.g., `src/main.ts` during startup, component effects) to see if they are now logged via Telemetry.

---

**Phase 4: Update Documentation (`docs/AGENTS.md`)**

1.  **File to Modify:** `docs/AGENTS.md`
2.  **Action:** Add a new section (e.g., "11. Logging and Telemetry") to explain the new convention.

    **Content for the new section:**

    ````markdown
    ## 11. Logging and Telemetry

    For all application logging, event tracking, and diagnostics, the **`TelemetryService` MUST be used**. This ensures a centralized and controllable way to manage diagnostic data.

    **Key Principles:**

    - **Development Mode:** By default, the `TelemetryService` logs its events to the `console.log`. This provides immediate visibility for developers.
    - **Production Mode:** By default, the `TelemetryService` is silent and performs no logging operations.
    - **User Control (Future):** The `setEnabled` method on the service allows for future UI controls to override the default behavior if needed.

    **Usage Guidelines:**

    - **DO NOT USE `console.log()`, `console.warn()`, `console.error()`, `console.info()`, or `console.debug()` directly for application-level logging or diagnostics.**
      - These methods bypass our telemetry system.
      - They may be used for _temporary, local debugging only_ and **MUST be removed** before committing code.
    - **USE `TelemetryService.trackEvent()` for all logging purposes.**

      - This includes informational messages, warnings, errors, and tracking of feature usage or significant application events.

    - **Exceptions (Where `console.*` is still used):**
      - Inside `src/services/telemetry/TelemetryServiceImpl.ts` itself, for its own operational logging (e.g., the `[Telemetry]` prefix, or logging explicit calls to `setEnabled`).
      - In the fallback `.catch()` block when an attempt to call `TelemetryService.trackEvent()` itself fails. These specific calls are marked with `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL`.
      - In `src/tests/vitest.setup.ts` for test environment setup.

    **How to Use `TelemetryService.trackEvent()`:**

    1.  **Import necessary modules:**

        ```typescript
        import { Effect, Layer, Cause, Exit } from "effect";
        import {
          TelemetryService,
          TelemetryServiceLive,
          type TelemetryEvent,
        } from "@/services/telemetry";
        ```

    2.  **Construct your `TelemetryEvent` data:**
        When replacing old `console.*` calls, use the `category` mapping:
        - `console.log`/
    ````
