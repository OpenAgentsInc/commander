Okay, Agent. Your task is to implement a development-mode-only toggle to disable/enable hot reloading for the OpenAgents Commander application. This will be controlled via an environment variable.

Here are the specific instructions:

**Goal:**
Modify the Vite configuration for the renderer process so that hot reloading (HMR) can be disabled by setting an environment variable. When disabled, changes to the source code should not automatically update or reload the running application.

**Affected Files:**
1.  `vite.renderer.config.mts`
2.  `README.md` (for documenting the feature)

---

**Implementation Steps:**

**Step 1: Modify `vite.renderer.config.mts` to Control Hot Reloading**

1.  **Open the file `vite.renderer.config.mts`.**

2.  **Read the Environment Variable:**
    At the top of the file, before the `export default defineConfig(...)` line, add the following code to read the `VITE_DISABLE_HOT_RELOAD` environment variable:

    ```typescript
    // At the top of vite.renderer.config.mts, after imports
    const disableHotReload = process.env.VITE_DISABLE_HOT_RELOAD === 'true';

    if (disableHotReload) {
      console.log('[Commander Dev] Hot Reloading is DISABLED for the renderer process via VITE_DISABLE_HOT_RELOAD.');
    }
    ```
    *Purpose: This line reads the environment variable. Vite automatically makes variables prefixed with `VITE_` available in its configuration file via `process.env`.*

3.  **Conditionally Disable Vite's HMR Server:**
    Locate the `export default defineConfig(...)` block. Inside the object passed to `defineConfig`, find or add the `server` property. Modify it as follows:

    ```typescript
    // Inside defineConfig({...})
    server: {
      hmr: disableHotReload ? false : undefined, // Disable HMR if disableHotReload is true
      strictPort: true, // Preserve any existing server options
      // ... any other existing server options
    },
    ```
    *Purpose: If `disableHotReload` is `true`, `server.hmr` is set to `false`, which completely disables Vite's HMR. If `false` or not set, `hmr` is `undefined`, letting Vite use its default (which is typically enabled in development).*

4.  **Conditionally Disable React Fast Refresh:**
    Inside the `defineConfig` object, locate the `plugins` array. Find the `react()` plugin call. Modify it to conditionally disable Fast Refresh:

    ```typescript
    // Inside defineConfig({ plugins: [...] })
    plugins: [
      // ... other plugins like TanStackRouterVite ...
      TanStackRouterVite({ /* ... your existing TanStackRouterVite config ... */ }),
      react({
        // Conditionally disable React Fast Refresh
        fastRefresh: !disableHotReload,
        // If you use React Compiler (babel plugin) ensure its HMR also respects this.
        // For example, for the version "babel-plugin-react-compiler": "^19.0.0-beta-714736e-20250131"
        // this is likely handled by disabling server.hmr globally.
        // If direct control is needed, you might need:
        // babel: {
        //   plugins: [
        //     ["babel-plugin-react-compiler", {/* compilerConfig */}, !disableHotReload && "react-compiler"]
        //   ].filter(Boolean) // Ensure only valid entries are passed
        // }
      }),
      // ... any other existing plugins
    ],
    ```
    *Purpose: This disables React's Fast Refresh, which is part of its HMR integration, when hot reloading is globally disabled. The `babel-plugin-react-compiler`'s HMR integration is usually tied to the global HMR setting, but if it causes issues, its HMR can also be conditionally disabled.*

**Step 2: Update `README.md` to Document the New Toggle**

1.  **Open the file `README.md`.**

2.  **Add Documentation for the Toggle:**
    Locate the section `## Running a dev build`. After the main instructions for running the development server, add a new subsection explaining how to use this hot reload toggle.

    Insert the following Markdown block:

    ```markdown
    ### Controlling Hot Reloading (Development Mode Only)

    Hot reloading (HMR - Hot Module Replacement) is enabled by default for the renderer process, allowing for fast updates when source code changes. In some debugging scenarios, you might want to temporarily disable hot reloading to prevent the app from automatically updating or reloading on code changes.

    You can control this behavior using the `VITE_DISABLE_HOT_RELOAD` environment variable.

    *   **To disable hot reloading:**
        Set the `VITE_DISABLE_HOT_RELOAD` environment variable to `true` before running the development server.
        ```bash
        VITE_DISABLE_HOT_RELOAD=true pnpm start
        ```
        or for app-only:
        ```bash
        VITE_DISABLE_HOT_RELOAD=true pnpm start:app-only
        ```
        With hot reloading disabled, changes to the source code will not trigger automatic updates in the running application. You will need to manually refresh the renderer (e.g., Ctrl+R/Cmd+R in the DevTools) or restart the application to see changes.

    *   **To enable hot reloading (default):**
        Either do not set the `VITE_DISABLE_HOT_RELOAD` variable, or set it to `false` (or any value other than `true`).
        ```bash
        pnpm start
        # OR
        VITE_DISABLE_HOT_RELOAD=false pnpm start
        ```

    **Note:** This toggle affects the Vite development server's HMR capabilities for the renderer process. Changes to the main process or preload scripts will still typically require an application restart, as managed by Electron Forge. This setting requires restarting the development server (`pnpm start` or `pnpm start:app-only`) to take effect.
    ```

---

**How to Use and Test This Feature:**

1.  **Default Behavior (Hot Reloading Enabled):**
    Run `pnpm start` or `pnpm start:app-only`.
    Make a change to a React component in `src/components/` or a page in `src/pages/`.
    Observe that the application updates automatically in the renderer process without a full reload (or with a fast refresh).

2.  **Disabled Hot Reloading:**
    Run `VITE_DISABLE_HOT_RELOAD=true pnpm start` (or `VITE_DISABLE_HOT_RELOAD=true pnpm start:app-only`).
    You should see the console log `[Commander Dev] Hot Reloading is DISABLED for the renderer process via VITE_DISABLE_HOT_RELOAD.` from Vite.
    Make a change to a React component or page.
    Observe that the application *does not* automatically update. You will need to manually refresh the Electron window (e.g., using Ctrl+R or Cmd+R in the DevTools) to see the changes.

**Optional Enhancement (UI Indication via Feature Flags):**

While the environment variable controls the HMR mechanism, if you want to provide a visual indication in the UI (for developers only) about the HMR status, you could:
1.  Define a new `Feature` enum in `src/services/featureflags/FeatureFlag.ts`, e.g., `DEV_HMR_STATUS_INDICATOR_ENABLED`.
2.  Enable this feature flag by adding it to `FEATURE_FLAGS_ENABLED_LIST` in `src/services/configuration/ConfigurationServiceImpl.ts` (for dev builds).
3.  In a development-only UI component (e.g., a debug panel):
    *   Use the `useFeatureFlag` hook to check if `DEV_HMR_STATUS_INDICATOR_ENABLED` is active.
    *   If active, read `import.meta.env.VITE_DISABLE_HOT_RELOAD` (this special Vite object exposes `VITE_` prefixed env vars to client-side code).
    *   Display a small text indicator: "HMR: Enabled" or "HMR: Disabled".

This optional step is purely for UI feedback and does not control the HMR itself; the environment variable and Vite config changes do.

---

Agent, please proceed with these modifications. Ensure all existing options in `vite.renderer.config.mts` are preserved unless explicitly changed by these instructions.
