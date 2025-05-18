Okay, I will provide instructions for the coding agent to replace console logs with the telemetry service, and I will edit `docs/AGENTS.md` to reflect this new convention.

**Part 1: Instructions for the Coding Agent**

```markdown
**Goal:** Replace all `console.log`, `console.warn`, `console.error`, `console.info`, `console.debug` calls throughout the codebase (except in `src/services/telemetry/TelemetryServiceImpl.ts`) with calls to the `TelemetryService.trackEvent()` method using Effect.js.

**Files to Modify:** All `.ts` and `.tsx` files within the `src/` directory, **excluding** `src/services/telemetry/TelemetryServiceImpl.ts`.

**Prerequisites:**
*   The `TelemetryService` and `TelemetryServiceLive` layer are defined in `src/services/telemetry/`.
*   `Effect` and related primitives (`Layer`, `Cause`, `Exit`) are available from the `effect` package.

**Steps:**

1.  **Identify Console Calls:**
    Scan the specified files for any calls to:
    *   `console.log(...)`
    *   `console.warn(...)`
    *   `console.error(...)`
    *   `console.info(...)`
    *   `console.debug(...)`

2.  **Import Necessary Modules:**
    At the top of each file where a replacement occurs, ensure the following imports are present. Add them if they are missing:
    ```typescript
    import { Effect, Layer, Cause } from 'effect'; // Exit might not be needed if using .catch()
    import { TelemetryService, TelemetryServiceLive, type TelemetryEvent } from '@/services/telemetry';
    ```

3.  **Replace Console Calls:**
    For each identified console call:

    **3.1. Determine Telemetry Event Category:**
    Map the original console method to a telemetry category:
    *   `console.log` -> `category: "log:info"`
    *   `console.info` -> `category: "log:info"`
    *   `console.debug` -> `category: "log:debug"`
    *   `console.warn` -> `category: "log:warn"`
    *   `console.error` -> `category: "log:error"`

    **3.2. Construct Telemetry Event Payload:**
    Set the `action` field of the `TelemetryEvent` to `"generic_console_replacement"`.
    Derive the `label` and `value` fields from the arguments passed to the console function:

    *   **Single Argument `console.method(arg1)`:**
        *   If `arg1` is a string: `label: arg1`, `value: undefined`
        *   If `arg1` is not a string: `label: undefined`, `value: JSON.stringify(arg1)` (Handle potential primitive types directly if preferred, e.g., `value: arg1` if number/boolean). If `arg1` is an `Error` object, use `label: arg1.message`, `value: JSON.stringify({ name: arg1.name, message: arg1.message, stack: arg1.stack })`.
            *Example for `console.log("User logged in");`*
            ```typescript
            const eventData: TelemetryEvent = {
              category: "log:info",
              action: "generic_console_replacement",
              label: "User logged in"
            };
            ```
            *Example for `console.error(new Error("Something failed"));`*
            ```typescript
            const errorObj = new Error("Something failed"); // assuming errorObj is the argument
            const eventData: TelemetryEvent = {
              category: "log:error",
              action: "generic_console_replacement",
              label: errorObj.message,
              value: JSON.stringify({ name: errorObj.name, message: errorObj.message, stack: errorObj.stack })
            };
            ```

    *   **Multiple Arguments `console.method(arg1, arg2, ...argsN)`:**
        *   If `arg1` is a string: `label: arg1`.
        *   Combine `arg2` through `argsN` into the `value` field by stringifying an array of these arguments: `value: JSON.stringify([arg2, ..., argsN])`.
            *Example for `console.warn("Request failed:", requestId, details);`*
            ```typescript
            const originalArgs = [requestId, details]; // Assuming these were arg2, arg3
            const eventData: TelemetryEvent = {
              category: "log:warn",
              action: "generic_console_replacement",
              label: "Request failed:",
              value: JSON.stringify(originalArgs)
            };
            ```
        *   If `arg1` is NOT a string: `label: undefined`. Combine all arguments (`arg1` through `argsN`) into the `value` field: `value: JSON.stringify([arg1, ..., argsN])`.

    *   **Stringification:** Use `JSON.stringify(data, null, 2)` for readability if the value is complex. Be mindful of circular references; if `JSON.stringify` throws an error, the telemetry call will fail, which is acceptable and will be caught by the error handler below.

    **3.3. Create and Run the Effect Program:**
    Replace the console call (e.g., `console.log("Message:", data);`) with the following structure:
    ```typescript
    // Original: console.log("Message:", data);

    // Replacement:
    Effect.gen(function* (_) {
      const telemetryService = yield* _(TelemetryService);
      // Construct eventData based on rules in 3.1 and 3.2
      const eventData: TelemetryEvent = { /* ... populated ... */ };
      yield* _(telemetryService.trackEvent(eventData));
    }).pipe(
      Effect.provide(TelemetryServiceLive),
      // Run the effect asynchronously. Log telemetry system errors to console.
      (effect) => Effect.runPromise(effect).catch(err => {
        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.error("TelemetryService.trackEvent failed:", err);
      })
    );
    ```
    **Important for Agent:** The `console.error` call in the `.catch()` block is for reporting failures *of the telemetry system itself*. It **MUST NOT** be replaced by another telemetry call. Add the comment `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL` directly above this specific `console.error` line to mark it for exclusion during any future automated replacements.

4.  **Special Case: `src/services/telemetry/TelemetryServiceImpl.ts`**
    **DO NOT** replace any `console.log` or other console method calls within the file `src/services/telemetry/TelemetryServiceImpl.ts`. These are part of the service's current mock implementation.

5.  **Special Case: `src/tests/vitest.setup.ts`**
    **DO NOT** replace `console.log`, `console.info`, etc. calls in `src/tests/vitest.setup.ts`. These are used for test environment setup and teardown.

6.  **Example Transformation:**

    *   **Original Code in `someFile.ts`:**
        ```typescript
        function doSomething(user: string) {
          console.log("Processing user:", user);
          if (user === "error") {
            console.error("Error user encountered!", { userId: user });
          }
        }
        ```

    *   **Transformed Code in `someFile.ts`:**
        ```typescript
        import { Effect, Layer, Cause } from 'effect';
        import { TelemetryService, TelemetryServiceLive, type TelemetryEvent } from '@/services/telemetry';

        function doSomething(user: string) {
          const eventDataLog: TelemetryEvent = {
            category: "log:info",
            action: "generic_console_replacement",
            label: "Processing user:",
            value: JSON.stringify([user])
          };
          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(eventDataLog));
          }).pipe(
            Effect.provide(TelemetryServiceLive),
            (effect) => Effect.runPromise(effect).catch(err => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err);
            })
          );

          if (user === "error") {
            const eventDataError: TelemetryEvent = {
              category: "log:error",
              action: "generic_console_replacement",
              label: "Error user encountered!",
              value: JSON.stringify([{ userId: user }])
            };
            Effect.gen(function* (_) {
              const telemetryService = yield* _(TelemetryService);
              yield* _(telemetryService.trackEvent(eventDataError));
            }).pipe(
              Effect.provide(TelemetryServiceLive),
              (effect) => Effect.runPromise(effect).catch(err => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent failed:", err);
              })
            );
          }
        }
        ```

7.  **Final Review:**
    After the transformation, ensure the application still builds (`pnpm t`) and runs correctly (`pnpm start`). Manually verify a few diverse replacements.

```

**Part 2: Update `docs/AGENTS.MD`**

I will add a new section "11. Logging and Telemetry" to `docs/AGENTS.MD`.

```diff
--- a/docs/AGENTS.md
+++ b/docs/AGENTS.md
@@ -132,3 +132,40 @@
 This document should provide a solid foundation for understanding and working with the OpenAgents Commander codebase. For more specific details, refer to the individual configuration files mentioned and the original `README-template.md`.
+
+## 11. Logging and Telemetry
+
+For all application logging, event tracking, and diagnostics, the **`TelemetryService` MUST be used**. This ensures that we have a centralized and controllable way to manage what data is collected.
+
+**Key Guidelines:**
+
+*   **DO NOT USE `console.log()`, `console.warn()`, `console.error()`, `console.info()`, or `console.debug()` for application-level logging or diagnostics.**
+    *   These methods bypass our telemetry system and are not suitable for production code.
+    *   They may be used for *temporary, local debugging only* and **MUST be removed** before committing code.
+*   **USE `TelemetryService.trackEvent()` for all logging purposes.**
+    *   This includes informational messages, warnings, errors, and tracking of feature usage or significant application events.
+*   **Exception:** The `TelemetryServiceImpl.ts` itself uses `console.log()` for its current mock implementation. This is the ONLY place where direct `console.log()` usage related to telemetry is acceptable. Also, if `TelemetryService.trackEvent()` itself fails, the fallback error handler might use `console.error()` (marked with `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL`) to report the telemetry system failure. The file `src/tests/vitest.setup.ts` also uses console methods for test setup and should not be modified.
+
+**How to Use `TelemetryService`:**
+
+1.  **Import necessary modules:**
+    ```typescript
+    import { Effect, Layer, Cause } from 'effect'; // Or other Effect primitives as needed
+    import { TelemetryService, TelemetryServiceLive, type TelemetryEvent } from '@/services/telemetry';
+    ```
+
+2.  **Construct your event data:**
+    For general logs, map console levels to categories: `log:info`, `log:warn`, `log:error`, `log:debug`.
+    ```typescript
+    const eventData: TelemetryEvent = {
+      category: "log:info", // For general logs. For feature events, use categories like "ui", "feature_usage", etc.
+      action: "user_login_success", // Or "generic_console_replacement" if replacing an old console.log
+      label: "User successfully logged in", // Main message or context
+      value: JSON.stringify({ userId: "123" }) // Additional structured data, stringified
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
+        console.error("TelemetryService.trackEvent failed:", err); // Fallback for telemetry system errors
+      })
+    );
+    ```
+    *   The `.pipe(Effect.provide(TelemetryServiceLive), ...)` part is crucial if the code is not already running within an Effect context that has `TelemetryServiceLive` provided.
+    *   Using `Effect.runPromise(effect).catch(...)` ensures that telemetry operations are non-blocking.
+
+**Refer to `docs/TELEMETRY.md` for comprehensive documentation on the Telemetry Service, including standard event categories, schema details, and advanced usage.**

```
