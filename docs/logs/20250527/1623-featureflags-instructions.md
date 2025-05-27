Okay, Agent, let's implement feature flag support using Effect. For v0.0.5, we want to enable only "Claude Code" (as an AI provider) and "Hand Tracking". All other features like Wallet, DVM provider ("Sell Compute"), DVM consumer tools (NIP-90 Dashboard, etc.), and NIP-28 Chat should be disabled and not appear in the Hotbar.

Here are the specific instructions:

**I. Define Feature Flags**

1.  Create a new directory: `src/services/featureflags/`
2.  Create `src/services/featureflags/FeatureFlag.ts`:
    ```typescript
    // src/services/featureflags/FeatureFlag.ts
    export enum Feature {
      // AI Providers (for AgentChatPane)
      CLAUDE_CODE_PROVIDER = "CLAUDE_CODE_PROVIDER",
      OLLAMA_PROVIDER = "OLLAMA_PROVIDER", // For local Ollama in AgentChat

      // Core Features
      HAND_TRACKING = "HAND_TRACKING",
      WALLET = "WALLET", // Wallet Pane & Functionality

      // DVM Features
      DVM_PROVIDER = "DVM_PROVIDER", // "Sell Compute" pane and functionality
      DVM_CONSUMER_TOOLS = "DVM_CONSUMER_TOOLS", // NIP-90 Dashboard, Consumer Chat, Global Feed

      // Other Chat Features
      NIP28_CHAT = "NIP28_CHAT", // For Nip28ChannelChat Pane (currently not in hotbar but good to flag)

      // Panes that might be features themselves
      PREVIOUS_CHATS_PANE = "PREVIOUS_CHATS_PANE", // If "Chat History" is a distinct feature
      CODER_PANE = "CODER_PANE", // The new Coder Mode pane
    }
    ```

**II. Create FeatureFlagService**

1.  Create `src/services/featureflags/FeatureFlagService.ts`:
    ```typescript
    // src/services/featureflags/FeatureFlagService.ts
    import { Context, Effect, Data } from "effect";
    import { ConfigurationService, ConfigError } from "@/services/configuration";
    import { Feature } from "./FeatureFlag";

    export class FeatureFlagError extends Data.TaggedError("FeatureFlagError")<{
      message: string;
      cause?: unknown;
    }> {}

    export interface FeatureFlagService {
      readonly isEnabled: (flag: Feature) => Effect.Effect<boolean, FeatureFlagError | ConfigError>;
      readonly getEnabledFeatures: () => Effect.Effect<Feature[], FeatureFlagError | ConfigError>;
    }

    export const FeatureFlagService = Context.GenericTag<FeatureFlagService>("FeatureFlagService");
    ```

2.  Create `src/services/featureflags/FeatureFlagServiceImpl.ts`:
    ```typescript
    // src/services/featureflags/FeatureFlagServiceImpl.ts
    import { Effect, Layer, Option } from "effect";
    import { FeatureFlagService, FeatureFlagError } from "./FeatureFlagService";
    import { ConfigurationService, ConfigError } from "@/services/configuration";
    import { Feature } from "./FeatureFlag";
    import { TelemetryService } from "@/services/telemetry"; // For logging

    export const FeatureFlagServiceLive = Layer.effect(
      FeatureFlagService,
      Effect.gen(function* (_) {
        const configService = yield* _(ConfigurationService);
        const telemetryService = yield* _(TelemetryService); // Inject TelemetryService
        let enabledFeaturesSet = new Set<Feature>();
        let initialized = false;

        const initialize = Effect.gen(function* (_) {
          if (initialized) return;
          const enabledFlagsString = yield* _(
            configService.get("FEATURE_FLAGS_ENABLED_LIST").pipe(
              Effect.orElseSucceed(() => "")
            )
          );
          const features = enabledFlagsString
            .split(',')
            .map(f => f.trim().toUpperCase() as Feature)
            .filter(f => Object.values(Feature).includes(f));
          enabledFeaturesSet = new Set(features);
          initialized = true;

          yield* _(telemetryService.trackEvent({
            category: "feature_flags",
            action: "initialized",
            label: "FeatureFlagService initialized",
            value: JSON.stringify(Array.from(enabledFeaturesSet))
          }).pipe(Effect.ignoreLogged));

        }).pipe(
          Effect.catchAll((e) => {
            const errorMessage = e instanceof Error ? e.message : String(e);
            // Log critical initialization failure via telemetry as well
            Effect.runFork(telemetryService.trackEvent({
              category: "feature_flags:error",
              action: "initialization_failed",
              label: errorMessage,
            }).pipe(Effect.ignoreLogged));
            return Effect.die(new FeatureFlagError({ message: `FeatureFlagService initialization failed: ${errorMessage}`, cause: e }));
          })
        );

        const ensureInitialized = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
          Effect.flatMap(initialize, () => effect);

        return FeatureFlagService.of({
          isEnabled: (flag: Feature) =>
            ensureInitialized(
              Effect.succeed(enabledFeaturesSet.has(flag))
            ),
          getEnabledFeatures: () =>
            ensureInitialized(
              Effect.succeed(Array.from(enabledFeaturesSet))
            ),
        });
      })
    );
    ```

3.  Create `src/services/featureflags/index.ts`:
    ```typescript
    // src/services/featureflags/index.ts
    export * from "./FeatureFlag";
    export * from "./FeatureFlagService";
    export * from "./FeatureFlagServiceImpl";
    ```

4.  Add `featureflags` to `src/services/index.ts`:
    ```typescript
    // src/services/index.ts
    // ... other exports
    export * from "./featureflags";
    ```

**III. Update Configuration**

1.  In `src/services/configuration/ConfigurationServiceImpl.ts` -> `DefaultDevConfigLayer`:
    Add:
    ```typescript
    yield* _(configService.set("FEATURE_FLAGS_ENABLED_LIST", "CLAUDE_CODE_PROVIDER,HAND_TRACKING,CODER_PANE,OLLAMA_PROVIDER")); // Ollama as default too
    ```
    *Note: `OLLAMA_PROVIDER` is added here as `AgentChatPane` is a general component and likely needs a default if Claude isn't chosen. `CODER_PANE` is added because "Claude Code" likely refers to the coding UI (CoderPane) which uses Claude as provider.*

**IV. Update Runtime**

1.  In `src/services/runtime.ts`:
    *   Add `FeatureFlagService`, `FeatureFlagServiceLive` imports.
    *   Add `FeatureFlagService` to `FullAppContext` type union.
    *   In `buildFullAppLayer()`, add the `FeatureFlagServiceLive` layer. It depends on `ConfigurationService` and `TelemetryService`, so provide `devConfigLayer` (which includes both):
        ```typescript
        // Inside buildFullAppLayer, before Layer.mergeAll
        const featureFlagLayer = FeatureFlagServiceLive.pipe(
          Layer.provide(devConfigLayer) // devConfigLayer provides ConfigService and TelemetryService
        );

        // Add featureFlagLayer to the Layer.mergeAll(...)
        // For example:
        // return Layer.mergeAll(
        //   baseLayer,
        //   // ... other layers ...
        //   featureFlagLayer, // Add this
        // );
        ```
        Ensure `devConfigLayer` is defined before `featureFlagLayer`.

**V. Create `useFeatureFlag` Hook**

1.  Create `src/hooks/useFeatureFlag.ts`:
    ```typescript
    // src/hooks/useFeatureFlag.ts
    import { useState, useEffect } from 'react';
    import { Effect, Cause } from 'effect';
    import { getMainRuntime } from '@/services/runtime';
    import { FeatureFlagService, FeatureFlagError } from '@/services/featureflags/FeatureFlagService';
    import { Feature } from '@/services/featureflags/FeatureFlag';
    import { ConfigError } from '@/services/configuration'; // Assuming ConfigError is exported

    export function useFeatureFlag(feature: Feature): [isEnabled: boolean, isLoading: boolean, error: FeatureFlagError | ConfigError | null] {
      const [isEnabled, setIsEnabled] = useState(false);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState<FeatureFlagError | ConfigError | null>(null);

      useEffect(() => {
        const runtime = getMainRuntime();
        if (!runtime) {
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.error("Runtime not available for useFeatureFlag hook. Feature flags will default to disabled.");
          setIsLoading(false);
          setError(new FeatureFlagError({ message: "Runtime not available for feature flag check" }));
          return;
        }

        const checkFeature = Effect.gen(function*(_) {
          const ffService = yield* _(FeatureFlagService);
          return yield* _(ffService.isEnabled(feature));
        }).pipe(
          Effect.provide(runtime),
          Effect.tapError((err) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error(`Error checking feature flag ${feature}:`, Cause.pretty(err))
          })
        );

        Effect.runPromise(checkFeature)
          .then(setIsEnabled)
          .catch(err => setError(Cause.squash(err) as FeatureFlagError | ConfigError))
          .finally(() => setIsLoading(false));
      }, [feature]);

      return [isEnabled, isLoading, error];
    }
    ```

**VI. Update Hotbar (`src/components/hud/Hotbar.tsx`)**

1.  Import `Feature` from `src/services/featureflags/FeatureFlag`.
2.  Import `useFeatureFlag` from `src/hooks/useFeatureFlag`.
3.  For each HotbarItem that corresponds to a feature:
    *   Call `useFeatureFlag` to get its enabled state.
    *   Conditionally render the `HotbarItem` based on this state.
    *   Adjust `numEmptySlots` logic based on the number of *actually rendered* items.

    Example for Coder Mode (Slot 1):
    ```typescript
    // At the top of Hotbar component
    const [isCoderPaneEnabled, isCoderPaneLoading] = useFeatureFlag(Feature.CODER_PANE);
    const [isSellComputeEnabled] = useFeatureFlag(Feature.DVM_PROVIDER);
    const [isWalletEnabled] = useFeatureFlag(Feature.WALLET);
    const [isDvmHistoryEnabled] = useFeatureFlag(Feature.DVM_CONSUMER_TOOLS);
    // const [isAgentChatEnabled] = useFeatureFlag(Feature.OLLAMA_PROVIDER); // AgentChat is always there, providers within it are flagged
    const [isPreviousChatsEnabled] = useFeatureFlag(Feature.PREVIOUS_CHATS_PANE);
    const [isHandTrackingEnabled] = useFeatureFlag(Feature.HAND_TRACKING);

    // In the JSX, for Coder Mode (Slot 1):
    {isCoderPaneEnabled && !isCoderPaneLoading && (
      <HotbarItem
        slotNumber={1}
        onClick={onToggleCoderPane} // Pass onToggleCoderPane from HomePage
        title={isCoderModeActive ? "Exit Coder Mode" : "Coder Mode"}
        isActive={isCoderModeActive}
      >
        <CodeXml className="text-muted-foreground h-5 w-5" />
      </HotbarItem>
    )}
    {/* Repeat this pattern for other feature-flagged items: */}
    {/* Sell Compute (DVM_PROVIDER), Wallet (WALLET), DVM Job History (DVM_CONSUMER_TOOLS), Previous Chats (PREVIOUS_CHATS_PANE) */}
    {/* Hand Tracking (HAND_TRACKING) */}

    // Update numActualItems and numEmptySlots based on how many features are enabled
    const hotbarItemsConfig = [
      { flag: isCoderPaneEnabled, component: "Coder Mode" },
      { flag: isSellComputeEnabled, component: "Sell Compute" },
      { flag: isWalletEnabled, component: "Wallet" },
      { flag: isDvmHistoryEnabled, component: "DVM Job History" },
      { flag: true, component: "Agent Chat" }, // Agent Chat pane always enabled for now
      { flag: onTogglePreviousChatsPane && isPreviousChatsEnabled, component: "Chat History" },
      // Slots 7, 8 empty
      { flag: isHandTrackingEnabled, component: "Hand Tracking" },
    ];

    const renderedItems = hotbarItemsConfig.filter(item => item.flag);
    const numActualItems = renderedItems.length;
    const numEmptySlots = Math.max(0, 9 - numActualItems); // Recalculate based on what's visible

    // Ensure the slotNumber prop for HotbarItem is dynamic based on rendered order
    // Or, keep fixed slot numbers and conditionally render, adjusting empty slots.
    // For now, let's use fixed slot numbers and conditional rendering for simplicity.
    // You'll need to carefully manage the empty slots.

    // A simpler way to handle empty slots for now: render them if their corresponding feature is disabled.
    // For example, if Coder Mode (slot 1) is disabled:
    // {!isCoderPaneEnabled && <HotbarItem slotNumber={1} isGhost><span className="h-5 w-5" /></HotbarItem>}
    // This will keep the layout consistent.
    ```

**VII. Update Keyboard Shortcuts (`src/pages/HomePage.tsx`)**

1.  Import `Feature` and `useFeatureFlag`.
2.  Inside `handleGlobalKeyDown` function within `useEffect`:
    *   Before calling a `toggle...Pane` function, check its corresponding feature flag.
    *   Example for `toggleSellComputePane` (now Ctrl+2):
        ```typescript
        case 2: // Was 1: Sell Compute
          if (sellComputeEnabled) { // Assuming sellComputeEnabled is from useFeatureFlag(Feature.DVM_PROVIDER)
            console.log("Keyboard: Toggle Sell Compute");
            toggleSellComputePane();
          } else {
            console.log("Keyboard: Sell Compute feature disabled.");
          }
          break;
        ```
    *   You'll need to call `useFeatureFlag` for each feature at the top of `HomePage` and use the boolean state.
    *   Add these boolean states to the `useEffect` dependency array.

**VIII. Update AI Provider Availability (`src/stores/ai/agentChatStore.ts`)**

1.  Modify `loadAvailableProviders` to accept `FeatureFlagService` as an argument:
    ```typescript
    loadAvailableProviders: (
      configService: ConfigurationService,
      featureFlagService: FeatureFlagService // Add this
    ): Effect.Effect<void, never, never> => /* ... */
    ```
2.  Inside `loadAvailableProviders`, use `featureFlagService.isEnabled(...)` instead of `configService.get("..._ENABLED")`:
    ```typescript
    // Example for Ollama provider
    const isOllamaEnabled = yield* _(featureFlagService.isEnabled(Feature.OLLAMA_PROVIDER));
    if (isOllamaEnabled) {
      const ollamaModelName = yield* _(safeGetConfig("OLLAMA_MODEL_NAME", "gemma3:1b"));
      providers.push({ key: "ollama_gemma3_1b", name: "Ollama (Local)", type: "ollama", modelName: ollamaModelName });
    }

    // Example for Claude Code CLI provider
    const isClaudeCodeEnabled = yield* _(featureFlagService.isEnabled(Feature.CLAUDE_CODE_PROVIDER));
    if (isClaudeCodeEnabled) {
      const claudeCodeProviderName = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_NAME", "Claude Code (CLI)"));
      const claudeCodeDefaultModel = yield* _(safeGetConfig("CLAUDE_CODE_DEFAULT_MODEL", "claude-sonnet"));
      providers.push({
        key: "claude_code",
        name: claudeCodeProviderName,
        type: "claude_code",
        modelName: claudeCodeDefaultModel,
      });
    }

    // For NIP-90 DVM providers (Devstral or Custom)
    const isNip90ConsumerToolsEnabled = yield* _(featureFlagService.isEnabled(Feature.DVM_CONSUMER_TOOLS));
    if (isNip90ConsumerToolsEnabled) {
      // Check Devstral config if it's specifically enabled (it might be flagged off by its own config too)
      const devstralConfigEnabled = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_ENABLED").pipe(Effect.map(val => val === "true"), Effect.orElseSucceed(() => false)));
      if(devstralConfigEnabled) {
        // ... add devstral provider
      }
      // Check User NIP-90 config
      // ... add custom NIP-90 provider if configured
    }
    ```

3.  Update `AgentChatPane.tsx` where `loadAvailableProviders` is called:
    ```typescript
    // AgentChatPane.tsx -> useEffect for loading providers
    Effect.runFork(
      Effect.gen(function*(_) {
        const cs = yield* _(ConfigurationService);
        const ffs = yield* _(FeatureFlagService); // Get FeatureFlagService
        yield* _(loadAvailableProviders(cs, ffs)); // Pass it
      }).pipe(Effect.provide(runtime)),
    );
    ```

**IX. Unit Tests**

1.  **Write tests for `FeatureFlagService`**:
    *   `src/tests/unit/services/featureflags/FeatureFlagService.test.ts`
    *   Cover scenarios: enabled features, disabled features, empty config, invalid config.
    *   Ensure `isEnabled` and `getEnabledFeatures` work correctly.
    *   Mock `ConfigurationService` and `TelemetryService`.

2.  **Update tests for `Hotbar.tsx`**:
    *   `src/tests/unit/components/hud/Hotbar.test.tsx`
    *   Mock the `useFeatureFlag` hook to simulate different feature states.
    *   Verify that only hotbar items for enabled features are rendered.

3.  **Update tests for `agentChatStore.ts`**:
    *   `src/tests/unit/stores/ai/agentChatStore.test.ts`
    *   Mock `ConfigurationService` and `FeatureFlagService`.
    *   Call `loadAvailableProviders` with different feature flag configurations.
    *   Assert that `availableProviders` in the store state is populated correctly.

**X. Final Checks**

1.  Run `pnpm run t` to ensure no TypeScript errors.
2.  Run `pnpm test` to ensure all tests pass.
3.  Manually test the application:
    *   Verify only "Coder" (assuming tied to Claude Code provider or `CODER_PANE` flag), "Agent Chat" (with only Claude provider available), and "Hand Tracking" buttons appear in the Hotbar.
    *   Verify other features (Wallet, Sell Compute, etc.) are not accessible via Hotbar or keyboard shortcuts.
    *   Verify that in `AgentChatPane`, only "Claude Code" is available as a provider (and potentially "Ollama" if `OLLAMA_PROVIDER` was included in the default enabled list).

This comprehensive plan should guide the agent in implementing the feature flag system as requested. Remember to adjust the `Feature` enum and default enabled list if "Claude Code" means the Coder Pane *itself* rather than just the provider within AgentChatPane, and if Ollama should also be disabled. The current instructions assume CoderPane is enabled if `CLAUDE_CODE_PROVIDER` is enabled (or via its own `CODER_PANE` flag which was added to the default list), and that AgentChatPane might still show Ollama if `OLLAMA_PROVIDER` is enabled. If "Claude Code and hand tracking" *only* means *only* these two, then `OLLAMA_PROVIDER` should be removed from the default `FEATURE_FLAGS_ENABLED_LIST`.Okay, Agent, let's implement feature flag support using Effect. For v0.0.5, we want to enable only features related to "Claude Code" (the AI provider and the "Coder" pane/mode) and "Hand Tracking". All other features like Wallet, DVM (Sell Compute, DVM consumer tools), and NIP-28 Chat should be disabled and not appear in the Hotbar. The main "Agent Chat" pane should still be available, but its provider list should be filtered by feature flags.

Here are the specific instructions:

**I. Define Feature Flags**

1.  Create `src/services/featureflags/` directory.
2.  Create `src/services/featureflags/FeatureFlag.ts`:
    ```typescript
    // src/services/featureflags/FeatureFlag.ts
    export enum Feature {
      // AI Providers for AgentChatPane
      CLAUDE_CODE_PROVIDER = "CLAUDE_CODE_PROVIDER",
      OLLAMA_PROVIDER = "OLLAMA_PROVIDER",

      // Panes / Modes
      CODER_PANE = "CODER_PANE", // Fullscreen Coder Mode/Pane
      HAND_TRACKING = "HAND_TRACKING",
      WALLET_PANE = "WALLET_PANE",
      DVM_PROVIDER_PANE = "DVM_PROVIDER_PANE", // "Sell Compute" pane
      DVM_JOB_HISTORY_PANE = "DVM_JOB_HISTORY_PANE",
      NIP90_CONSUMER_CHAT_PANE = "NIP90_CONSUMER_CHAT_PANE",
      NIP90_GLOBAL_FEED_PANE = "NIP90_GLOBAL_FEED_PANE",
      PREVIOUS_CHATS_PANE = "PREVIOUS_CHATS_PANE",
      // NIP28_CHAT_PANE - Not in hotbar, but could be a feature
    }
    ```

**II. Create `FeatureFlagService`**

1.  Create `src/services/featureflags/FeatureFlagService.ts`:
    ```typescript
    // src/services/featureflags/FeatureFlagService.ts
    import { Context, Effect, Data } from "effect";
    import { ConfigurationService, ConfigError } from "@/services/configuration";
    import { Feature } from "./FeatureFlag";

    export class FeatureFlagError extends Data.TaggedError("FeatureFlagError")<{
      message: string;
      cause?: unknown;
    }> {}

    export interface FeatureFlagService {
      readonly isEnabled: (flag: Feature) => Effect.Effect<boolean, FeatureFlagError | ConfigError>;
      readonly getEnabledFeatures: () => Effect.Effect<Feature[], FeatureFlagError | ConfigError>;
    }

    export const FeatureFlagService = Context.GenericTag<FeatureFlagService>("FeatureFlagService");
    ```

2.  Create `src/services/featureflags/FeatureFlagServiceImpl.ts`:
    ```typescript
    // src/services/featureflags/FeatureFlagServiceImpl.ts
    import { Effect, Layer } from "effect";
    import { FeatureFlagService, FeatureFlagError } from "./FeatureFlagService";
    import { ConfigurationService, ConfigError } from "@/services/configuration";
    import { Feature } from "./FeatureFlag";
    import { TelemetryService } from "@/services/telemetry";

    export const FeatureFlagServiceLive = Layer.effect(
      FeatureFlagService,
      Effect.gen(function* (_) {
        const configService = yield* _(ConfigurationService);
        const telemetryService = yield* _(TelemetryService);
        let enabledFeaturesSet = new Set<Feature>();
        let initialized = false;

        const initialize = Effect.gen(function* (_) {
          if (initialized) return;
          const enabledFlagsString = yield* _(
            configService.get("FEATURE_FLAGS_ENABLED_LIST").pipe(
              Effect.orElseSucceed(() => "")
            )
          );
          const features = enabledFlagsString
            .split(',')
            .map(f => f.trim().toUpperCase() as Feature)
            .filter(f => Object.values(Feature).includes(f));
          enabledFeaturesSet = new Set(features);
          initialized = true;

          yield* _(telemetryService.trackEvent({
            category: "feature_flags",
            action: "initialized",
            label: "FeatureFlagService initialized",
            value: JSON.stringify(Array.from(enabledFeaturesSet))
          }).pipe(Effect.ignoreLogged));

        }).pipe(
          Effect.catchAll((e) => {
            const errorMessage = e instanceof Error ? e.message : String(e);
            Effect.runFork(telemetryService.trackEvent({
              category: "feature_flags:error",
              action: "initialization_failed",
              label: errorMessage,
            }).pipe(Effect.ignoreLogged));
            return Effect.die(new FeatureFlagError({ message: `FeatureFlagService initialization failed: ${errorMessage}`, cause: e }));
          })
        );

        const ensureInitialized = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
          Effect.flatMap(initialize, () => effect);

        return FeatureFlagService.of({
          isEnabled: (flag: Feature) =>
            ensureInitialized(
              Effect.succeed(enabledFeaturesSet.has(flag))
            ),
          getEnabledFeatures: () =>
            ensureInitialized(
              Effect.succeed(Array.from(enabledFeaturesSet))
            ),
        });
      })
    );
    ```

3.  Create `src/services/featureflags/index.ts`:
    ```typescript
    // src/services/featureflags/index.ts
    export * from "./FeatureFlag";
    export * from "./FeatureFlagService";
    export * from "./FeatureFlagServiceImpl";
    ```

4.  Add to `src/services/index.ts`: `export * from "./featureflags";`

**III. Update Configuration**

1.  In `src/services/configuration/ConfigurationServiceImpl.ts` -> `DefaultDevConfigLayer`:
    Set the enabled features for v0.0.5. "Agent Chat" itself isn't a flag, but its providers are. The Coder Pane is a distinct feature.
    ```typescript
    // For v0.0.5: Enable Claude Code provider, Coder Pane, and Hand Tracking.
    // Also keep OLLAMA_PROVIDER enabled as a default fallback if AgentChatPane is always visible.
    // If AgentChatPane should ONLY show Claude, then remove OLLAMA_PROVIDER here.
    // For now, assume AgentChatPane is core and might have at least one local provider.
    yield* _(configService.set("FEATURE_FLAGS_ENABLED_LIST", "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING,OLLAMA_PROVIDER"));
    ```

**IV. Update Runtime**

1.  In `src/services/runtime.ts`:
    *   Import `FeatureFlagService`, `FeatureFlagServiceLive`.
    *   Add `FeatureFlagService` to `FullAppContext` type.
    *   In `buildFullAppLayer()`:
        ```typescript
        // Before Layer.mergeAll for the final app layer
        const featureFlagLayer = FeatureFlagServiceLive.pipe(
          Layer.provide(devConfigLayer) // devConfigLayer includes ConfigurationService & TelemetryService
        );

        // Add featureFlagLayer to the main Layer.mergeAll(...)
        // Example: Layer.mergeAll(..., featureFlagLayer, ...)
        ```

**V. Create `useFeatureFlag` Hook**

1.  Create `src/hooks/useFeatureFlag.ts`:
    ```typescript
    // src/hooks/useFeatureFlag.ts
    import { useState, useEffect } from 'react';
    import { Effect, Cause } from 'effect';
    import { getMainRuntime } from '@/services/runtime';
    import { FeatureFlagService, FeatureFlagError } from '@/services/featureflags/FeatureFlagService';
    import { Feature } from '@/services/featureflags/FeatureFlag';
    import { ConfigError } from '@/services/configuration'; // Ensure ConfigError is exported

    export function useFeatureFlag(feature: Feature): [isEnabled: boolean, isLoading: boolean, error: FeatureFlagError | ConfigError | null] {
      const [isEnabled, setIsEnabled] = useState(false);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState<FeatureFlagError | ConfigError | null>(null);

      useEffect(() => {
        const runtime = getMainRuntime();
        if (!runtime) {
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.error("Runtime not available for useFeatureFlag hook. Feature flags will default to disabled.");
          setIsLoading(false);
          setError(new FeatureFlagError({ message: "Runtime not available for feature flag check" }));
          return;
        }

        const checkFeature = Effect.gen(function*(_) {
          const ffService = yield* _(FeatureFlagService);
          return yield* _(ffService.isEnabled(feature));
        }).pipe(
          Effect.provide(runtime),
          Effect.tapError((err) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error(`Error checking feature flag ${feature}:`, Cause.pretty(err))
          })
        );

        Effect.runPromise(checkFeature)
          .then(setIsEnabled)
          .catch(err => setError(Cause.squash(err) as FeatureFlagError | ConfigError))
          .finally(() => setIsLoading(false));
      }, [feature]);

      return [isEnabled, isLoading, error];
    }
    ```

**VI. Update `Hotbar.tsx`**

1.  Import `Feature` and `useFeatureFlag`.
2.  Conditionally render `HotbarItem`s based on feature flags.
    ```typescript
    // src/components/hud/Hotbar.tsx
    // ...imports...
    import { Feature } from '@/services/featureflags/FeatureFlag';
    import { useFeatureFlag } from '@/hooks/useFeatureFlag';

    // ...
    export const Hotbar: React.FC<HotbarProps> = ({ /* ...props... */ }) => {
      // ...
      const [isCoderPaneEnabled] = useFeatureFlag(Feature.CODER_PANE);
      const [isSellComputeEnabled] = useFeatureFlag(Feature.DVM_PROVIDER_PANE);
      const [isWalletEnabled] = useFeatureFlag(Feature.WALLET_PANE);
      const [isDvmHistoryEnabled] = useFeatureFlag(Feature.DVM_JOB_HISTORY_PANE);
      // Agent Chat pane itself is always visible, but its content/providers are filtered.
      // const [isAgentChatEnabled] = useFeatureFlag(Feature.AGENT_CHAT_PANE); // Not a specific flag for the pane visibility
      const [isPreviousChatsEnabled] = useFeatureFlag(Feature.PREVIOUS_CHATS_PANE);
      const [isHandTrackingEnabled] = useFeatureFlag(Feature.HAND_TRACKING);

      // Slot 1: Coder Mode
      {isCoderPaneEnabled && (
        <HotbarItem slotNumber={1} onClick={onToggleCoderPane} title="Coder Mode" isActive={activePaneId === CODER_PANE_ID}>
          <CodeXml className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      )}

      {/* Slot 2: Sell Compute */}
      {isSellComputeEnabled && (
        <HotbarItem slotNumber={2} onClick={onToggleSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}>
          <Store className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      )}

      {/* Slot 3: Wallet */}
      {isWalletEnabled && (
        <HotbarItem slotNumber={3} onClick={onToggleWalletPane} title="Wallet" isActive={activePaneId === WALLET_PANE_ID}>
          <Wallet className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      )}

      {/* Slot 4: DVM Job History */}
      {isDvmHistoryEnabled && (
        <HotbarItem slotNumber={4} onClick={onToggleDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
          <History className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      )}

      {/* Slot 5: Agent Chat (Always visible, as it's the main chat interface) */}
      <HotbarItem slotNumber={5} onClick={onToggleAgentChatPane} title="Agent Chat" isActive={activePaneId === AGENT_CHAT_PANE_ID}>
        <Bot className="text-muted-foreground h-5 w-5" />
      </HotbarItem>

      {/* Slot 6: Previous Chats (Chat History) */}
      {onTogglePreviousChatsPane && isPreviousChatsEnabled && (
        <HotbarItem slotNumber={6} onClick={onTogglePreviousChatsPane} title="Chat History" isActive={activePaneId === PREVIOUS_CHATS_PANE_ID}>
          <MessageSquare className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      )}

      {/* Adjust empty slots based on enabled features. This is tricky.
          A simpler approach for now: if a feature is disabled, its HotbarItem is just not rendered.
          The `numEmptySlots` calculation will need to be dynamic or the layout might look gappy.
          For now, accept potential gaps or assume fixed positions and render empty slots for disabled features.
          Let's render ghost items for disabled features in their fixed slots.
      */}
      {!isCoderPaneEnabled && <HotbarItem slotNumber={1} isGhost><span className="h-5 w-5"/></HotbarItem>}
      {!isSellComputeEnabled && <HotbarItem slotNumber={2} isGhost><span className="h-5 w-5"/></HotbarItem>}
      {!isWalletEnabled && <HotbarItem slotNumber={3} isGhost><span className="h-5 w-5"/></HotbarItem>}
      {!isDvmHistoryEnabled && <HotbarItem slotNumber={4} isGhost><span className="h-5 w-5"/></HotbarItem>}
      {/* Slot 5 is always Agent Chat */}
      {onTogglePreviousChatsPane && !isPreviousChatsEnabled && <HotbarItem slotNumber={6} isGhost><span className="h-5 w-5"/></HotbarItem>}

      {/* Slots 7, 8 are typically empty for now */}
      {Array.from({ length: onTogglePreviousChatsPane && isPreviousChatsEnabled ? 2 : 3 }).map((_, i) => (
         <HotbarItem key={`empty-slot-${i}`} slotNumber={i + (onTogglePreviousChatsPane && isPreviousChatsEnabled ? 7 : 6)} isGhost>
           <span className="h-5 w-5" />
         </HotbarItem>
       ))}

      {/* Slot 9: Hand Tracking */}
      {isHandTrackingEnabled && (
        <HotbarItem slotNumber={9} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
          <Hand className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      )}
      {!isHandTrackingEnabled && <HotbarItem slotNumber={9} isGhost><span className="h-5 w-5"/></HotbarItem>}
    </div>
    );
    ```

**VII. Update Keyboard Shortcuts (`src/pages/HomePage.tsx`)**

1.  Import `Feature` and `useFeatureFlag`.
2.  In `handleGlobalKeyDown`, wrap `toggle...Pane()` calls with `if (featureEnabled)` checks.
    ```typescript
    // src/pages/HomePage.tsx
    // ...
    const [isCoderPaneEnabled] = useFeatureFlag(Feature.CODER_PANE);
    const [isSellComputeEnabled] = useFeatureFlag(Feature.DVM_PROVIDER_PANE);
    // ... get other flags ...
    const [isHandTrackingEnabled] = useFeatureFlag(Feature.HAND_TRACKING);

    useEffect(() => {
      const handleGlobalKeyDown = (event: KeyboardEvent) => {
        // ... (Escape logic) ...
        const modifier = isMacOs() ? event.metaKey : event.ctrlKey;
        if (!modifier) return;
        const digit = parseInt(event.key);
        if (isNaN(digit) || digit < 1 || digit > 9) return;
        event.preventDefault();

        switch (digit) {
          case 1: if (isCoderPaneEnabled) toggleCoderPane(); break;
          case 2: if (isSellComputeEnabled) toggleSellComputePane(); break;
          // ... other cases with their feature flag checks ...
          case 9: if (isHandTrackingEnabled) toggleHandTracking(); break;
        }
      };
      // ... (add event listener and cleanup) ...
    }, [
      // Add all feature flag boolean states and toggle functions to dependency array
      isCoderPaneEnabled, toggleCoderPane,
      isSellComputeEnabled, toggleSellComputePane,
      // ... etc. ...
      isHandTrackingEnabled, toggleHandTracking,
    ]);
    ```

**VIII. Update AI Provider Availability (`src/stores/ai/agentChatStore.ts`)**

1.  Modify `loadAvailableProviders` signature:
    ```typescript
    loadAvailableProviders: (
      configService: ConfigurationService,
      featureFlagService: FeatureFlagService // Add this
    ): Effect.Effect<void, never, never> => /* ... */
    ```
2.  Use `featureFlagService.isEnabled(...)` inside `loadAvailableProviders`:
    ```typescript
    // src/stores/ai/agentChatStore.ts
    // ...
    // Ollama provider
    const isOllamaProviderEnabled = yield* _(featureFlagService.isEnabled(Feature.OLLAMA_PROVIDER));
    if (isOllamaProviderEnabled && ollamaEnabledStr === "true") { /* ... add Ollama ... */ }

    // Claude Code provider
    const isClaudeCodeProviderEnabled = yield* _(featureFlagService.isEnabled(Feature.CLAUDE_CODE_PROVIDER));
    if (isClaudeCodeProviderEnabled && claudeCodeEnabledStr === "true") { /* ... add Claude Code ... */ }

    // NIP-90 DVM providers (Devstral or Custom)
    const isDvmConsumerToolsEnabled = yield* _(featureFlagService.isEnabled(Feature.DVM_CONSUMER_TOOLS));
    if (isDvmConsumerToolsEnabled) {
        // ... existing logic for Devstral DVM, checking its own config ...
        // ... existing logic for Custom DVM, checking its own config ...
    }
    // ...
    ```
3.  Update call site in `src/components/ai/AgentChatPane.tsx`:
    ```typescript
    // AgentChatPane.tsx -> useEffect for loading providers
    Effect.runFork(
      Effect.gen(function*(_) {
        const cs = yield* _(ConfigurationService);
        const ffs = yield* _(FeatureFlagService); // Get FeatureFlagService
        yield* _(loadAvailableProviders(cs, ffs)); // Pass it
      }).pipe(Effect.provide(runtime)),
    );
    ```

**IX. Update `App.tsx` (Wallet Setup)**

1.  The `checkWalletSetupNeeded` logic and the `useEffect` that calls it in `App.tsx` are related to the `WALLET` feature. This should be conditional.
    ```typescript
    // src/App.tsx
    import { useFeatureFlag } from '@/hooks/useFeatureFlag'; // Add this
    import { Feature } from '@/services/featureflags/FeatureFlag'; // Add this

    // ...
    // Inside App component:
    const [isWalletFeatureEnabled, , ] = useFeatureFlag(Feature.WALLET_PANE); // Or Feature.WALLET

    useEffect(() => {
      // Only check wallet setup if the feature is enabled
      if (isWalletFeatureEnabled) {
        checkWalletSetupNeeded(); // This function already exists and calls usePaneStore
      }
    }, [isWalletFeatureEnabled]); // Add isWalletFeatureEnabled to dependency array
    ```

**X. Unit Tests**

1.  **`src/tests/unit/services/featureflags/FeatureFlagService.test.ts`**:
    ```typescript
    import { Effect, Layer } from 'effect';
    import { FeatureFlagService, FeatureFlagServiceLive } from '@/services/featureflags/FeatureFlagService';
    import { Feature } from '@/services/featureflags/FeatureFlag';
    import { ConfigurationService } from '@/services/configuration';
    import { TelemetryService } from '@/services/telemetry';
    import { mock } from 'vitest-mock-extended';

    describe('FeatureFlagService', () => {
      const mockConfigService = mock<ConfigurationService>();
      const mockTelemetryService = mock<TelemetryService>();
      mockTelemetryService.trackEvent.mockReturnValue(Effect.void); // Mock trackEvent

      const buildTestLayer = (configValue: string) =>
        Layer.provide(
          FeatureFlagServiceLive,
          Layer.mergeAll(
            Layer.succeed(ConfigurationService, mockConfigService),
            Layer.succeed(TelemetryService, mockTelemetryService)
          )
        ).pipe(
          Layer.provide(Layer.succeed(ConfigurationService, {
            ...mockConfigService,
            get: vi.fn().mockImplementation((key: string) => {
              if (key === "FEATURE_FLAGS_ENABLED_LIST") return Effect.succeed(configValue);
              return Effect.fail({ _tag: "ConfigError", message: "Not found" });
            })
          }))
        );

      it('should correctly report enabled features: CLAUDE_CODE_PROVIDER, HAND_TRACKING, CODER_PANE, OLLAMA_PROVIDER', async () => {
        const testLayer = buildTestLayer("CLAUDE_CODE_PROVIDER,HAND_TRACKING,CODER_PANE,OLLAMA_PROVIDER");
        const program = Effect.gen(function*(_) {
          const ffService = yield* _(FeatureFlagService);
          const results = {
            isClaudeEnabled: yield* _(ffService.isEnabled(Feature.CLAUDE_CODE_PROVIDER)),
            isHandTrackingEnabled: yield* _(ffService.isEnabled(Feature.HAND_TRACKING)),
            isCoderPaneEnabled: yield* _(ffService.isEnabled(Feature.CODER_PANE)),
            isOllamaEnabled: yield* _(ffService.isEnabled(Feature.OLLAMA_PROVIDER)),
            isWalletEnabled: yield* _(ffService.isEnabled(Feature.WALLET_PANE)),
            enabledList: yield* _(ffService.getEnabledFeatures()),
          };
          return results;
        });

        const result = await Effect.runPromise(Effect.provide(program, testLayer));
        expect(result.isClaudeEnabled).toBe(true);
        expect(result.isHandTrackingEnabled).toBe(true);
        expect(result.isCoderPaneEnabled).toBe(true);
        expect(result.isOllamaEnabled).toBe(true);
        expect(result.isWalletEnabled).toBe(false);
        expect(result.enabledList).toEqual(expect.arrayContaining([
          Feature.CLAUDE_CODE_PROVIDER, Feature.HAND_TRACKING, Feature.CODER_PANE, Feature.OLLAMA_PROVIDER
        ]));
        expect(result.enabledList).toHaveLength(4);
        expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "initialized" }));
      });

      it('should handle empty config string (no features enabled)', async () => {
        const testLayer = buildTestLayer("");
        const program = Effect.flatMap(FeatureFlagService, ffService => ffService.getEnabledFeatures());
        const result = await Effect.runPromise(Effect.provide(program, testLayer));
        expect(result).toEqual([]);
      });
    });
    ```

2.  **Update `src/tests/unit/components/hud/Hotbar.test.tsx`** as shown in the thought process, mocking `useFeatureFlag`.

3.  **Update `src/tests/unit/stores/ai/agentChatStore.test.ts`**:
    *   Mock `FeatureFlagService` in addition to `ConfigurationService`.
    *   Test `loadAvailableProviders` with different feature flags.

**XI. Final Checks**

1.  Run `pnpm run t` for type checking.
2.  Run `pnpm test` for unit tests.
3.  Manually test the application with the `FEATURE_FLAGS_ENABLED_LIST` in `DefaultDevConfigLayer` set to `"CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING"`.
    *   **Hotbar:** Should only show Coder Mode (slot 1) and Hand Tracking (slot 9). Agent Chat (slot 5) should be present. Other slots should be empty/ghosts.
    *   **Keyboard Shortcuts:** Ctrl+1 should toggle Coder Pane. Ctrl+9 for Hand Tracking. Others (2,3,4,6) for disabled features should do nothing.
    *   **AgentChatPane:** Provider dropdown should only list "Claude Code (CLI)".
    *   **Wallet Setup:** The initial wallet setup prompt from `App.tsx` should NOT appear if `WALLET_PANE` is disabled.

This should effectively disable the unwanted features for v0.0.5 by hiding their UI entry points.

```

In the previous response, I updated the default feature flags in `DefaultDevConfigLayer` to:
`yield* _(configService.set("FEATURE_FLAGS_ENABLED_LIST", "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING,OLLAMA_PROVIDER"));`

To strictly adhere to "only do Claude Code and hand tracking" and disable "all the other shit", Ollama provider should also be disabled.

**Correction for `DefaultDevConfigLayer` in `src/services/configuration/ConfigurationServiceImpl.ts`:**
Change the line to:
`yield* _(configService.set("FEATURE_FLAGS_ENABLED_LIST", "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING"));`

This ensures that `Feature.OLLAMA_PROVIDER` will be false, and thus Ollama won't appear in the `AgentChatPane`'s provider list. The "Agent Chat" pane itself (Hotbar item 5) should remain, as it's the container for any active AI provider. If Claude Code is the only one, it will default to that.

**Further clarification for Hotbar:**
The logic for `numEmptySlots` and rendering ghost items in `Hotbar.tsx` needs to be robust. The current example might need refinement to correctly calculate and place empty slots if features are disabled. A more robust way would be to create an array of `HotbarItem` configurations, filter it based on enabled features, and then render the filtered array, padding with ghost items at the end if needed to maintain a fixed Hotbar size (e.g., 9 slots).

For now, the provided conditional rendering with ghost items for *specific fixed slots* is a simpler first pass. The main impact will be that disabled features don't show their icons.

```

Ensure that in `src/components/hud/Hotbar.tsx`, the `onToggle...` props passed to `<HotbarItem>` are only called if the feature is enabled. The current instructions correctly conditionally render the entire `<HotbarItem>`, which implicitly handles this.

The keyboard shortcuts in `HomePage.tsx` are also correctly wrapped with feature flag checks.

One final check for `useFeatureFlag.ts`:
The `useEffect` dependency array is `[feature]`. This is correct. The runtime is fetched via `getMainRuntime()` which should return the singleton instance.

Consider the case where `getMainRuntime()` might not be initialized when `useFeatureFlag` first runs. The current code handles this by setting an error and returning `isLoading: false`, `isEnabled: false`. This seems like a reasonable fallback. The service initialization sequence in `renderer.ts` (`initializeMainRuntime()` before `createRoot().render(<App />)`) should ensure the runtime is available by the time hooks in `App` and its children run.

```
The instruction "Slot 1: Coder Mode" for Hotbar.tsx in the thought process, but CoderPane.tsx has `handleExitCoderMode` which calls `removePane('coder_pane');`. This implies the coder pane ID is fixed as `coder_pane`. In `src/stores/panes/constants.ts`, ensure `CODER_PANE_ID` is defined and used consistently when toggling/opening this pane. The `onToggleCoderPane` prop for Hotbar should come from `HomePage.tsx` and use `toggleAllCoderPanesAction` which handles `CODER_PANE_ID` correctly. The current `Hotbar.tsx` uses `onToggleCoderPane` passed as a prop, which is correct.

The instruction for `Hotbar.tsx` to render ghost items:
`{!isCoderPaneEnabled && <HotbarItem slotNumber={1} isGhost><span className="h-5 w-5"/></HotbarItem>}`
This correctly renders a ghost item if the feature for that slot is disabled, maintaining the slot numbering for keyboard shortcuts. The `numEmptySlots` calculation then becomes less critical if we always render 9 items (either real or ghost).

The logic for `numActualItems` and `numEmptySlots` in the provided instructions for Hotbar.tsx needs to be re-evaluated if we're using fixed slots with ghost items.
If using fixed slots with ghost items, the `Array.from({ length: ... })` for empty slots might be redundant or needs to be adjusted based on which *middle* slots (6,7,8) are actual features vs empty.

For the current requirement of v0.0.5 (Claude Code, Hand Tracking ONLY), the Hotbar should visually simplify:
- Slot 1: Coder (if `CODER_PANE` enabled) or Ghost
- Slot 2-4: Ghosts (Sell Compute, Wallet, DVM History disabled)
- Slot 5: Agent Chat (always there, but internal provider list filtered)
- Slot 6: Ghost (Previous Chats disabled)
- Slot 7-8: Ghosts (empty by design)
- Slot 9: Hand Tracking (if `HAND_TRACKING` enabled) or Ghost

This makes the `numEmptySlots` logic simple: count how many of the *potential* feature slots (1,2,3,4,6,9) are disabled, and add that to the count of inherently empty slots (7,8). This is getting overly complex for the agent. The simpler "render ghost if disabled" for each slot is better.

The `Hotbar.tsx` code in the instructions should be:
```typescript
    // src/components/hud/Hotbar.tsx
    // ...
    export const Hotbar: React.FC<HotbarProps> = ({ /* ...props... */ }) => {
      // ... (activePaneId, routerState, runtime, feature flag hooks) ...
      const isCoderModeActive = routerState.location.pathname === '/coder'; // This is fine

      const handleCoderModeClick = () => {
        // ... (telemetry, navigate logic) ...
        // This implies Coder Mode is a route, not just a pane.
        // The CODER_PANE flag is for the Hotbar button visibility for this route.
        // The keyboard shortcut for this should also use onToggleCoderPane or similar.
        // The current Hotbar.tsx (from 0047-coder-setup-instructions.md) has logic for /coder route.
        // This is fine. We use CODER_PANE flag for the button visibility.
        // The onToggleCoderPane prop for this button will handle navigation.
      };

      return (
        <div /* ...Hotbar container classes... */ >
          {/* Slot 1: Coder Mode (Route to /coder) */}
          {isCoderPaneEnabled ? (
            <HotbarItem slotNumber={1} onClick={onToggleCoderPane} title={isCoderModeActive ? "Exit Coder Mode" : "Coder Mode"} isActive={isCoderModeActive}>
              <CodeXml className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={1} isGhost><span className="h-5 w-5"/></HotbarItem>}

          {/* Slot 2: Sell Compute */}
          {isSellComputeEnabled ? (
            <HotbarItem slotNumber={2} onClick={onToggleSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}>
              <Store className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={2} isGhost><span className="h-5 w-5"/></HotbarItem>}

          {/* Slot 3: Wallet */}
          {isWalletEnabled ? (
            <HotbarItem slotNumber={3} onClick={onToggleWalletPane} title="Wallet" isActive={activePaneId === WALLET_PANE_ID}>
              <Wallet className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={3} isGhost><span className="h-5 w-5"/></HotbarItem>}

          {/* Slot 4: DVM Job History */}
          {isDvmHistoryEnabled ? (
            <HotbarItem slotNumber={4} onClick={onToggleDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
              <History className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={4} isGhost><span className="h-5 w-5"/></HotbarItem>}

          {/* Slot 5: Agent Chat (Always visible) */}
          <HotbarItem slotNumber={5} onClick={onToggleAgentChatPane} title="Agent Chat" isActive={activePaneId === AGENT_CHAT_PANE_ID}>
            <Bot className="text-muted-foreground h-5 w-5" />
          </HotbarItem>

          {/* Slot 6: Previous Chats */}
          {onTogglePreviousChatsPane && isPreviousChatsEnabled ? (
            <HotbarItem slotNumber={6} onClick={onTogglePreviousChatsPane} title="Chat History" isActive={activePaneId === PREVIOUS_CHATS_PANE_ID}>
              <MessageSquare className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={6} isGhost><span className="h-5 w-5"/></HotbarItem>}

          {/* Slot 7 & 8: Always Ghost/Empty */}
          <HotbarItem slotNumber={7} isGhost><span className="h-5 w-5"/></HotbarItem>
          <HotbarItem slotNumber={8} isGhost><span className="h-5 w-5"/></HotbarItem>

          {/* Slot 9: Hand Tracking */}
          {isHandTrackingEnabled ? (
            <HotbarItem slotNumber={9} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
              <Hand className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={9} isGhost><span className="h-5 w-5"/></HotbarItem>}
        </div>
      );
    };
```
This approach for `Hotbar.tsx` is clearer: always render 9 slots, but the content of the slot (actual item or ghost) depends on the feature flag. This keeps keyboard shortcuts consistent and the UI layout stable.

The `onToggleCoderPane` prop in `HomePage.tsx` should handle the navigation to `/coder` or `/`.
```typescript
// In HomePage.tsx
const navigate = useNavigate(); // From @tanstack/react-router
const routerState = useRouterState();

const handleToggleCoderPane = useCallback(() => {
  const isCurrentlyCoderMode = routerState.location.pathname === '/coder';
  Effect.runFork(
    Effect.flatMap(TelemetryService, (ts) =>
      ts.trackEvent({
        category: 'coder_mode',
        action: 'hotbar_button_click_toggle_coder_pane', // More specific action
        label: isCurrentlyCoderMode ? "exit_coder_mode" : "enter_coder_mode",
      }),
    ).pipe(Effect.provide(getMainRuntime())),
  );
  if (isCurrentlyCoderMode) {
    navigate({ to: '/' });
  } else {
    navigate({ to: '/coder' });
  }
}, [navigate, routerState.location.pathname]);

// Then pass this handleToggleCoderPane to Hotbar as onToggleCoderPane
// <Hotbar ... onToggleCoderPane={handleToggleCoderPane} ... />
```
This ensures the Coder pane button in Hotbar correctly toggles the Coder mode route.
And the keyboard shortcut `Ctrl+1` in `HomePage.tsx` for `toggleCoderPane()` will also use this navigation logic.

The `DefaultDevConfigLayer` should be:
`yield* _(configService.set("FEATURE_FLAGS_ENABLED_LIST", "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING"));`
This will disable Ollama from the AgentChatPane dropdown. If `AgentChatPane` is still shown (Hotbar slot 5), it will use Claude Code as the only available provider. If no providers are enabled, `AgentChatPane` might show an empty state or a message. This behavior depends on `agentChatStore` and `AgentChatPane`'s logic when `availableProviders` is empty or only has Claude.

Final check on Feature enum:
`DVM_CONSUMER_TOOLS` is for panes like `Nip90Dashboard`, `Nip90ConsumerChatPane`, `Nip90GlobalFeedPane`.
`DVM_JOB_HISTORY_PANE` is a specific pane, perhaps it can be part of `DVM_PROVIDER_PANE` or `DVM_CONSUMER_TOOLS` or its own. Let's make it distinct for now.
`WALLET_PANE` is correct for the Wallet pane.

The release notes for v0.0.5 will need to reflect these changes.
- `v0.0.5 - Feature Flags & Focus Build`
- `Enabled features: Claude Code provider in Agent Chat, Coder Mode, Hand Tracking.`
- `Disabled features (not shown in Hotbar): Wallet, Sell Compute (DVM Provider), DVM Job History, NIP-90 Consumer Tools, Previous Chats.`

This fulfills the user's request to "only do Claude Code and hand tracking" and disable "wallet and DVM and all the other shit".Okay, Agent, here are the specific instructions to implement feature flag support using Effect, tailored for the v0.0.5 release requirements.

**I. Define Feature Flags**

1.  Ensure the directory `src/services/featureflags/` exists.
2.  Create/Update `src/services/featureflags/FeatureFlag.ts`:
    ```typescript
    // src/services/featureflags/FeatureFlag.ts
    export enum Feature {
      // AI Providers for AgentChatPane
      CLAUDE_CODE_PROVIDER = "CLAUDE_CODE_PROVIDER",
      OLLAMA_PROVIDER = "OLLAMA_PROVIDER",

      // Panes / UI Modes
      CODER_PANE = "CODER_PANE", // The fullscreen Coder Mode/Pane, toggled by Hotbar 1
      HAND_TRACKING = "HAND_TRACKING", // Hand tracking system & Hotbar 9 toggle
      WALLET_PANE = "WALLET_PANE", // Wallet pane, toggled by Hotbar 3
      DVM_PROVIDER_PANE = "DVM_PROVIDER_PANE", // "Sell Compute" pane, toggled by Hotbar 2
      DVM_JOB_HISTORY_PANE = "DVM_JOB_HISTORY_PANE", // DVM Job History pane, toggled by Hotbar 4
      PREVIOUS_CHATS_PANE = "PREVIOUS_CHATS_PANE", // Chat History pane, toggled by Hotbar 6

      // These are specific NIP-90 tool panes, not directly on hotbar usually,
      // but good to have flags if they are accessed differently.
      // For now, their visibility can be tied to a general DVM_CONSUMER_TOOLS or similar if needed,
      // or just implicitly disabled if their entry points are removed.
      // For v0.0.5, these are disabled by disabling their access points.
      // NIP90_DASHBOARD_PANE = "NIP90_DASHBOARD_PANE",
      // NIP90_CONSUMER_CHAT_PANE = "NIP90_CONSUMER_CHAT_PANE",
      // NIP90_GLOBAL_FEED_PANE = "NIP90_GLOBAL_FEED_PANE",

      // NIP28_CHAT_PANE - Not directly on hotbar, related to NIP-28 functionality.
    }
    ```

**II. Create `FeatureFlagService`**

1.  Create/Update `src/services/featureflags/FeatureFlagService.ts`:
    ```typescript
    // src/services/featureflags/FeatureFlagService.ts
    import { Context, Effect, Data } from "effect";
    import { ConfigurationService, ConfigError } from "@/services/configuration";
    import { Feature } from "./FeatureFlag";

    export class FeatureFlagError extends Data.TaggedError("FeatureFlagError")<{
      message: string;
      cause?: unknown;
    }> {}

    export interface FeatureFlagService {
      readonly isEnabled: (flag: Feature) => Effect.Effect<boolean, FeatureFlagError | ConfigError>;
      readonly getEnabledFeatures: () => Effect.Effect<Feature[], FeatureFlagError | ConfigError>;
    }

    export const FeatureFlagService = Context.GenericTag<FeatureFlagService>("FeatureFlagService");
    ```

2.  Create/Update `src/services/featureflags/FeatureFlagServiceImpl.ts`:
    ```typescript
    // src/services/featureflags/FeatureFlagServiceImpl.ts
    import { Effect, Layer } from "effect";
    import { FeatureFlagService, FeatureFlagError } from "./FeatureFlagService";
    import { ConfigurationService } from "@/services/configuration";
    import { Feature } from "./FeatureFlag";
    import { TelemetryService } from "@/services/telemetry";

    export const FeatureFlagServiceLive = Layer.effect(
      FeatureFlagService,
      Effect.gen(function* (_) {
        const configService = yield* _(ConfigurationService);
        const telemetryService = yield* _(TelemetryService);
        let enabledFeaturesSet = new Set<Feature>();
        let initialized = false;

        const initialize = Effect.gen(function* (_) {
          if (initialized) return;
          const enabledFlagsString = yield* _(
            configService.get("FEATURE_FLAGS_ENABLED_LIST").pipe(
              Effect.orElseSucceed(() => "")
            )
          );
          const features = enabledFlagsString
            .split(',')
            .map(f => f.trim().toUpperCase() as Feature)
            .filter(f => Object.values(Feature).includes(f));
          enabledFeaturesSet = new Set(features);
          initialized = true;

          yield* _(telemetryService.trackEvent({
            category: "feature_flags",
            action: "initialized",
            label: "FeatureFlagService initialized",
            value: JSON.stringify(Array.from(enabledFeaturesSet))
          }).pipe(Effect.ignoreLogged));

        }).pipe(
          Effect.catchAll((e) => {
            const errorMessage = e instanceof Error ? e.message : String(e);
            Effect.runFork(telemetryService.trackEvent({
              category: "feature_flags:error",
              action: "initialization_failed",
              label: errorMessage,
            }).pipe(Effect.ignoreLogged));
            return Effect.die(new FeatureFlagError({ message: `FeatureFlagService initialization failed: ${errorMessage}`, cause: e }));
          })
        );

        const ensureInitialized = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
          Effect.flatMap(initialize, () => effect);

        return FeatureFlagService.of({
          isEnabled: (flag: Feature) =>
            ensureInitialized(
              Effect.succeed(enabledFeaturesSet.has(flag))
            ),
          getEnabledFeatures: () =>
            ensureInitialized(
              Effect.succeed(Array.from(enabledFeaturesSet))
            ),
        });
      })
    );
    ```

3.  Create/Update `src/services/featureflags/index.ts`:
    ```typescript
    // src/services/featureflags/index.ts
    export * from "./FeatureFlag";
    export * from "./FeatureFlagService";
    export * from "./FeatureFlagServiceImpl";
    ```

4.  In `src/services/index.ts`, add: `export * from "./featureflags";`

**III. Update Configuration**

1.  In `src/services/configuration/ConfigurationServiceImpl.ts` within `DefaultDevConfigLayer`:
    Set the `FEATURE_FLAGS_ENABLED_LIST` for v0.0.5.
    ```typescript
    // For v0.0.5: Enable Claude Code provider, Coder Pane, and Hand Tracking.
    // AgentChatPane needs at least one provider; Claude Code will be it.
    yield* _(configService.set("FEATURE_FLAGS_ENABLED_LIST", "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING"));
    ```

**IV. Update Runtime**

1.  In `src/services/runtime.ts`:
    *   Import `FeatureFlagService`, `FeatureFlagServiceLive` from `@/services/featureflags`.
    *   Add `FeatureFlagService` to the `FullAppContext` type union.
    *   In `buildFullAppLayer()`:
        *   Define `featureFlagLayer`:
            ```typescript
            const featureFlagLayer = FeatureFlagServiceLive.pipe(
              Layer.provide(devConfigLayer) // devConfigLayer provides Config & Telemetry
            );
            ```
        *   Add `featureFlagLayer` to the final `Layer.mergeAll(...)` arguments.

**V. Create `useFeatureFlag` Hook**

1.  Create `src/hooks/useFeatureFlag.ts`:
    ```typescript
    // src/hooks/useFeatureFlag.ts
    import { useState, useEffect } from 'react';
    import { Effect, Cause } from 'effect';
    import { getMainRuntime } from '@/services/runtime';
    import { FeatureFlagService, FeatureFlagError } from '@/services/featureflags/FeatureFlagService';
    import { Feature } from '@/services/featureflags/FeatureFlag';
    import { ConfigError } from '@/services/configuration';

    export function useFeatureFlag(feature: Feature): [isEnabled: boolean, isLoading: boolean, error: FeatureFlagError | ConfigError | null] {
      const [isEnabled, setIsEnabled] = useState(false);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState<FeatureFlagError | ConfigError | null>(null);

      useEffect(() => {
        const runtime = getMainRuntime();
        if (!runtime) {
          console.error("Runtime not available for useFeatureFlag hook. Feature flags will default to disabled."); // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          setIsLoading(false);
          setError(new FeatureFlagError({ message: "Runtime not available for feature flag check" }));
          return;
        }

        const checkFeature = Effect.gen(function*(_) {
          const ffService = yield* _(FeatureFlagService);
          return yield* _(ffService.isEnabled(feature));
        }).pipe(
          Effect.provide(runtime),
          Effect.tapError((err) => console.error(`Error checking feature flag ${feature}:`, Cause.pretty(err))) // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        );

        Effect.runPromise(checkFeature)
          .then(setIsEnabled)
          .catch(err => setError(Cause.squash(err) as FeatureFlagError | ConfigError))
          .finally(() => setIsLoading(false));
      }, [feature]);

      return [isEnabled, isLoading, error];
    }
    ```

**VI. Update `Hotbar.tsx`**

1.  Import `Feature` and `useFeatureFlag`.
2.  Conditionally render `HotbarItem`s or ghost placeholders.
    ```typescript
    // src/components/hud/Hotbar.tsx
    import React from "react";
    import { cn } from "@/utils/tailwind";
    import { HotbarItem } from "./HotbarItem";
    import { Store, History, Hand, Wallet, Bot, MessageSquare, CodeXml } from "lucide-react";
    import { usePaneStore } from "@/stores/pane";
    import { useShallow } from "zustand/react/shallow";
    import { useRouterState } from "@tanstack/react-router";
    import { Feature } from '@/services/featureflags/FeatureFlag';
    import { useFeatureFlag } from '@/hooks/useFeatureFlag';
    import {
      SELL_COMPUTE_PANE_ID_CONST,
      WALLET_PANE_ID,
      AGENT_CHAT_PANE_ID,
      PREVIOUS_CHATS_PANE_ID,
      CODER_PANE_ID,
      DVM_JOB_HISTORY_PANE_ID,
    } from "@/stores/panes/constants";

    interface HotbarProps {
      className?: string;
      isHandTrackingActive: boolean;
      onToggleHandTracking: () => void;
      onToggleSellComputePane: () => void;
      onToggleWalletPane: () => void;
      onToggleDvmJobHistoryPane: () => void;
      onToggleAgentChatPane: () => void;
      onTogglePreviousChatsPane?: () => void;
      onToggleCoderPane: () => void; // Added for Coder pane route toggle
    }

    export const Hotbar: React.FC<HotbarProps> = ({
      className,
      isHandTrackingActive,
      onToggleHandTracking,
      onToggleSellComputePane,
      onToggleWalletPane,
      onToggleDvmJobHistoryPane,
      onToggleAgentChatPane,
      onTogglePreviousChatsPane,
      onToggleCoderPane,
    }) => {
      const { activePaneId } = usePaneStore(
        useShallow((state) => ({ activePaneId: state.activePaneId })),
      );
      const routerState = useRouterState();
      const isCoderModeActive = routerState.location.pathname === '/coder';

      const [isCoderPaneEnabled] = useFeatureFlag(Feature.CODER_PANE);
      const [isSellComputeEnabled] = useFeatureFlag(Feature.DVM_PROVIDER_PANE);
      const [isWalletEnabled] = useFeatureFlag(Feature.WALLET_PANE);
      const [isDvmHistoryEnabled] = useFeatureFlag(Feature.DVM_JOB_HISTORY_PANE);
      const [isPreviousChatsEnabled] = useFeatureFlag(Feature.PREVIOUS_CHATS_PANE);
      const [isHandTrackingEnabled] = useFeatureFlag(Feature.HAND_TRACKING);

      return (
        <div
          className={cn(
            "bg-background/50 border-border/30 fixed bottom-4 left-1/2 z-[10000] flex -translate-x-1/2 transform space-x-1 rounded-md border p-1 shadow-lg backdrop-blur-sm",
            className,
          )}
        >
          {/* Slot 1: Coder Mode */}
          {isCoderPaneEnabled ? (
            <HotbarItem slotNumber={1} onClick={onToggleCoderPane} title={isCoderModeActive ? "Exit Coder Mode" : "Coder Mode"} isActive={isCoderModeActive}>
              <CodeXml className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={1} isGhost><span className="h-5 w-5"/></HotbarItem>}

          {/* Slot 2: Sell Compute */}
          {isSellComputeEnabled ? (
            <HotbarItem slotNumber={2} onClick={onToggleSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}>
              <Store className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={2} isGhost><span className="h-5 w-5"/></HotbarItem>}

          {/* Slot 3: Wallet */}
          {isWalletEnabled ? (
            <HotbarItem slotNumber={3} onClick={onToggleWalletPane} title="Wallet" isActive={activePaneId === WALLET_PANE_ID}>
              <Wallet className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={3} isGhost><span className="h-5 w-5"/></HotbarItem>}

          {/* Slot 4: DVM Job History */}
          {isDvmHistoryEnabled ? (
            <HotbarItem slotNumber={4} onClick={onToggleDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
              <History className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={4} isGhost><span className="h-5 w-5"/></HotbarItem>}

          {/* Slot 5: Agent Chat (Always visible as the main chat interface) */}
          <HotbarItem slotNumber={5} onClick={onToggleAgentChatPane} title="Agent Chat" isActive={activePaneId === AGENT_CHAT_PANE_ID}>
            <Bot className="text-muted-foreground h-5 w-5" />
          </HotbarItem>

          {/* Slot 6: Previous Chats */}
          {onTogglePreviousChatsPane && isPreviousChatsEnabled ? (
            <HotbarItem slotNumber={6} onClick={onTogglePreviousChatsPane} title="Chat History" isActive={activePaneId === PREVIOUS_CHATS_PANE_ID}>
              <MessageSquare className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={6} isGhost><span className="h-5 w-5"/></HotbarItem>}

          {/* Slot 7 & 8: Always Ghost/Empty by current design */}
          <HotbarItem slotNumber={7} isGhost><span className="h-5 w-5"/></HotbarItem>
          <HotbarItem slotNumber={8} isGhost><span className="h-5 w-5"/></HotbarItem>

          {/* Slot 9: Hand Tracking */}
          {isHandTrackingEnabled ? (
            <HotbarItem slotNumber={9} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
              <Hand className="text-muted-foreground h-5 w-5" />
            </HotbarItem>
          ) : <HotbarItem slotNumber={9} isGhost><span className="h-5 w-5"/></HotbarItem>}
        </div>
      );
    };
    ```

**VII. Update Keyboard Shortcuts (`src/pages/HomePage.tsx`)**

1.  Import `Feature` and `useFeatureFlag`.
2.  Inside `HomePage` component, get all relevant feature flag states using `useFeatureFlag`.
3.  In `handleGlobalKeyDown`, wrap `toggle...Pane()` calls or navigation logic with `if (featureFlagState)` checks.
    ```typescript
    // src/pages/HomePage.tsx
    // ...
    import { useNavigate, useRouterState } from '@tanstack/react-router';
    import { Feature } from '@/services/featureflags/FeatureFlag';
    import { useFeatureFlag } from '@/hooks/useFeatureFlag';

    export default function HomePage() {
      const navigate = useNavigate();
      const routerState = useRouterState();
      // ... (other state and store hooks) ...

      const [isCoderPaneEnabled] = useFeatureFlag(Feature.CODER_PANE);
      const [isSellComputeEnabled] = useFeatureFlag(Feature.DVM_PROVIDER_PANE);
      const [isWalletEnabled] = useFeatureFlag(Feature.WALLET_PANE);
      const [isDvmHistoryEnabled] = useFeatureFlag(Feature.DVM_JOB_HISTORY_PANE);
      const [isPreviousChatsEnabled] = useFeatureFlag(Feature.PREVIOUS_CHATS_PANE);
      const [isHandTrackingEnabled] = useFeatureFlag(Feature.HAND_TRACKING);

      // Memoize the onToggleCoderPane to pass to Hotbar
      const handleToggleCoderPane = useCallback(() => {
        if (!isCoderPaneEnabled) return; // Respect flag for direct calls if any
        const isCurrentlyCoderMode = routerState.location.pathname === '/coder';
        // ... (telemetry and navigate logic from previous step) ...
        if (isCurrentlyCoderMode) {
          navigate({ to: '/' });
        } else {
          navigate({ to: '/coder' });
        }
      }, [isCoderPaneEnabled, navigate, routerState.location.pathname /*, add runtime if telemetry uses it */]);

      useEffect(() => {
        const handleGlobalKeyDown = (event: KeyboardEvent) => {
          // ... (Escape logic as before) ...
          const modifier = isMacOs() ? event.metaKey : event.ctrlKey;
          if (!modifier) return;
          const digit = parseInt(event.key);
          if (isNaN(digit) || digit < 1 || digit > 9) return;
          event.preventDefault();

          switch (digit) {
            case 1: if (isCoderPaneEnabled) handleToggleCoderPane(); break;
            case 2: if (isSellComputeEnabled) toggleSellComputePane(); break;
            case 3: if (isWalletEnabled) toggleWalletPane(); break;
            case 4: if (isDvmHistoryEnabled) toggleDvmJobHistoryPane(); break;
            case 5: toggleAgentChatPane(); break; // Agent Chat pane always active
            case 6: if (togglePreviousChatsPane && isPreviousChatsEnabled) togglePreviousChatsPane(); break;
            case 9: if (isHandTrackingEnabled) toggleHandTracking(); break;
          }
        };
        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
      }, [
        // Dependency array needs all feature flags and toggle functions
        isCoderPaneEnabled, handleToggleCoderPane,
        isSellComputeEnabled, toggleSellComputePane,
        isWalletEnabled, toggleWalletPane,
        isDvmHistoryEnabled, toggleDvmJobHistoryPane,
        toggleAgentChatPane, // AgentChatPane always active
        isPreviousChatsEnabled, togglePreviousChatsPane,
        isHandTrackingEnabled, toggleHandTracking,
      ]);
      // ... rest of HomePage component, passing handleToggleCoderPane to Hotbar
      // <Hotbar {...props} onToggleCoderPane={handleToggleCoderPane} />
    }
    ```

**VIII. Update AI Provider Availability (`src/stores/ai/agentChatStore.ts`)**

1.  Modify `loadAvailableProviders` signature to accept `featureFlagService: FeatureFlagService`.
2.  Inside `loadAvailableProviders`, use `featureFlagService.isEnabled()` for each provider.
    ```typescript
    // src/stores/ai/agentChatStore.ts
    import { FeatureFlagService } from '@/services/featureflags/FeatureFlagService';
    import { Feature } from '@/services/featureflags/FeatureFlag';
    // ...

    export const useAgentChatStore = create<AgentChatState>()(
      persist(
        (set) => ({
          // ...
          loadAvailableProviders: (
            configService: ConfigurationService,
            featureFlagService: FeatureFlagService // Add this
          ): Effect.Effect<void, never, never> =>
            Effect.gen(function* (_) {
              const providers: AIProvider[] = [];
              const safeGetConfig = /* ... (as before) ... */ ;

              // Ollama provider
              const isOllamaProviderEnabled = yield* _(featureFlagService.isEnabled(Feature.OLLAMA_PROVIDER));
              if (isOllamaProviderEnabled) {
                const ollamaEnabledStr = yield* _(safeGetConfig("OLLAMA_MODEL_ENABLED", "true")); // Check individual config too
                if (ollamaEnabledStr === "true") {
                  const ollamaModelName = yield* _(safeGetConfig("OLLAMA_MODEL_NAME", "gemma3:1b"));
                  providers.push({ key: "ollama_gemma3_1b", name: "Ollama (Local)", type: "ollama", modelName: ollamaModelName });
                }
              }

              // Claude Code provider
              const isClaudeCodeProviderEnabled = yield* _(featureFlagService.isEnabled(Feature.CLAUDE_CODE_PROVIDER));
              if (isClaudeCodeProviderEnabled) {
                const claudeCodeEnabledStr = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_ENABLED", "true")); // Check individual config too
                if (claudeCodeEnabledStr === "true") {
                  const claudeCodeProviderName = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_NAME", "Claude Code (CLI)"));
                  const claudeCodeDefaultModel = yield* _(safeGetConfig("CLAUDE_CODE_DEFAULT_MODEL", "claude-sonnet"));
                  providers.push({
                    key: "claude_code",
                    name: claudeCodeProviderName,
                    type: "claude_code",
                    modelName: claudeCodeDefaultModel,
                  });
                }
              }

              // NIP-90 DVM Providers
              // This flag covers all DVM consumer tools including selecting them as providers
              const isDvmConsumerToolsEnabled = yield* _(featureFlagService.isEnabled(Feature.DVM_CONSUMER_TOOLS));
              if (isDvmConsumerToolsEnabled) {
                const devstralEnabledStr = yield* _(safeGetConfig("AI_PROVIDER_DEVSTRAL_ENABLED", "true"));
                if (devstralEnabledStr === "true") { /* ... add devstral ... */ }

                const userNip90EnabledStr = yield* _(safeGetConfig("USER_NIP90_ENABLED", "false"));
                if (userNip90EnabledStr === "true") { /* ... add custom NIP-90 DVM ... */ }
              }

              set({ availableProviders: providers });
            }).pipe( /* ... (catchAll as before) ... */ ),
        }),
        // ... (persist options) ...
      ),
    );
    ```
3.  Update call site in `src/components/ai/AgentChatPane.tsx`'s `useEffect`:
    ```typescript
    // AgentChatPane.tsx -> useEffect for loading providers
    Effect.runFork(
      Effect.gen(function*(_) {
        const cs = yield* _(ConfigurationService);
        const ffs = yield* _(FeatureFlagService); // Get FeatureFlagService
        yield* _(loadAvailableProviders(cs, ffs)); // Pass it
      }).pipe(Effect.provide(runtime)),
    );
    ```

**IX. Update `App.tsx` (Wallet Setup)**

1.  Conditionally run `checkWalletSetupNeeded` based on `Feature.WALLET_PANE`.
    ```typescript
    // src/App.tsx
    import { useFeatureFlag } from '@/hooks/useFeatureFlag';
    import { Feature } from '@/services/featureflags/FeatureFlag';
    // ...

    export default function App() {
      const { i18n } = useTranslation();
      const [isWalletFeatureEnabled] = useFeatureFlag(Feature.WALLET_PANE);

      useEffect(() => {
        syncThemeWithLocal();
        updateAppLanguage(i18n);
      }, [i18n]);

      useEffect(() => {
        if (isWalletFeatureEnabled) {
          checkWalletSetupNeeded();
        }
      }, [isWalletFeatureEnabled]); // Re-run if flag changes (e.g. hot-reloading config)

      // ... (return JSX)
    }
    ```

**X. Unit Tests**

1.  **`src/tests/unit/services/featureflags/FeatureFlagService.test.ts`**:
    Create this file and add test cases.
    ```typescript
    import { Effect, Layer } from 'effect';
    import { FeatureFlagService, FeatureFlagServiceLive } from '@/services/featureflags/FeatureFlagService';
    import { Feature } from '@/services/featureflags/FeatureFlag';
    import { ConfigurationService } from '@/services/configuration';
    import { TelemetryService } from '@/services/telemetry';
    import { mock } from 'vitest-mock-extended';

    describe('FeatureFlagService', () => {
      const mockConfigService = mock<ConfigurationService>();
      const mockTelemetryService = mock<TelemetryService>();
      mockTelemetryService.trackEvent.mockReturnValue(Effect.void);

      const buildTestLayer = (configValue: string) =>
        Layer.provide(
          FeatureFlagServiceLive,
          Layer.mergeAll(
            Layer.succeed(ConfigurationService, mockConfigService),
            Layer.succeed(TelemetryService, mockTelemetryService)
          )
        ).pipe(
          Layer.provide(Layer.succeed(ConfigurationService, {
            ...mockConfigService,
            get: vi.fn().mockImplementation((key: string) => {
              if (key === "FEATURE_FLAGS_ENABLED_LIST") return Effect.succeed(configValue);
              return Effect.fail({ _tag: "ConfigError", message: "Not found" });
            })
          }))
        );

      it('v0.0.5: should enable CLAUDE_CODE_PROVIDER, CODER_PANE, HAND_TRACKING and disable others', async () => {
        const testLayer = buildTestLayer("CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING");
        const program = Effect.gen(function*(_) {
          const ffService = yield* _(FeatureFlagService);
          const results = {
            isClaudeProviderEnabled: yield* _(ffService.isEnabled(Feature.CLAUDE_CODE_PROVIDER)),
            isCoderPaneEnabled: yield* _(ffService.isEnabled(Feature.CODER_PANE)),
            isHandTrackingEnabled: yield* _(ffService.isEnabled(Feature.HAND_TRACKING)),
            isOllamaEnabled: yield* _(ffService.isEnabled(Feature.OLLAMA_PROVIDER)),
            isWalletEnabled: yield* _(ffService.isEnabled(Feature.WALLET_PANE)),
            isDvmProviderEnabled: yield* _(ffService.isEnabled(Feature.DVM_PROVIDER_PANE)),
            enabledList: yield* _(ffService.getEnabledFeatures()),
          };
          return results;
        });

        const result = await Effect.runPromise(Effect.provide(program, testLayer));
        expect(result.isClaudeProviderEnabled).toBe(true);
        expect(result.isCoderPaneEnabled).toBe(true);
        expect(result.isHandTrackingEnabled).toBe(true);
        expect(result.isOllamaEnabled).toBe(false);
        expect(result.isWalletEnabled).toBe(false);
        expect(result.isDvmProviderEnabled).toBe(false);
        expect(result.enabledList).toEqual(expect.arrayContaining([
          Feature.CLAUDE_CODE_PROVIDER, Feature.CODER_PANE, Feature.HAND_TRACKING
        ]));
        expect(result.enabledList).toHaveLength(3);
      });
    });
    ```
2.  Update `src/tests/unit/components/hud/Hotbar.test.tsx` to mock `useFeatureFlag` and test conditional rendering.
3.  Update `src/tests/unit/stores/ai/agentChatStore.test.ts` to mock `FeatureFlagService` and test `loadAvailableProviders`.

**XI. Final Checks**
1.  Run `pnpm run t`. Fix any TypeScript errors.
2.  Run `pnpm test`. Fix any failing tests.
3.  Manually test with `FEATURE_FLAGS_ENABLED_LIST` set to `"CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING"` in `DefaultDevConfigLayer`.
    *   **Hotbar:** Should show "Coder" (slot 1), "Agent Chat" (slot 5, with Claude as only provider), "Hand Tracking" (slot 9). Other feature slots (2,3,4,6) should be ghosts. Slots 7,8 remain ghosts.
    *   **Keyboard Shortcuts:** Only active feature shortcuts should work.
    *   **AgentChatPane:** Provider dropdown should list only "Claude Code (CLI)".
    *   **Wallet Setup:** Should not appear automatically.


This should set up the feature flag system correctly for v0.0.5. Remember to adjust the default enabled flags in `ConfigurationServiceImpl.ts` based on the exact interpretation of "only Claude Code and hand tracking". The current setting also enables `CODER_PANE`. If `OLLAMA_PROVIDER` should absolutely be off, remove it from the default feature flags in step III.
