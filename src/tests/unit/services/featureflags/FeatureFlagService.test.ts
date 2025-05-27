import { describe, it, expect } from "vitest";
import { Effect, Layer, Runtime } from "effect";
import { FeatureFlagService } from "@/services/featureflags/FeatureFlagService";
import { FeatureFlagServiceLive } from "@/services/featureflags/FeatureFlagServiceImpl";
import { Feature } from "@/services/featureflags/FeatureFlag";
import { ConfigurationService, ConfigError } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";

describe("FeatureFlagService", () => {
  const createMockConfigService = (featureFlags: string = "") =>
    Layer.succeed(
      ConfigurationService,
      ConfigurationService.of({
        get: (key: string) => {
          if (key === "FEATURE_FLAGS_ENABLED_LIST") {
            return Effect.succeed(featureFlags);
          }
          return Effect.fail(new ConfigError({ message: `Key not found: ${key}` }));
        },
        getSecret: () => Effect.fail(new ConfigError({ message: "Not implemented" })),
        set: () => Effect.succeed(undefined),
        delete: () => Effect.succeed(undefined),
      })
    );

  const mockTelemetryService = Layer.succeed(
    TelemetryService,
    TelemetryService.of({
      trackEvent: () => Effect.succeed(undefined),
      isEnabled: () => Effect.succeed(true),
      setEnabled: () => Effect.succeed(undefined),
    })
  );

  const createServiceRuntime = async (featureFlags: string = "") => {
    const dependencies = Layer.mergeAll(
      createMockConfigService(featureFlags),
      mockTelemetryService
    );

    const serviceLayer = Layer.provide(FeatureFlagServiceLive, dependencies);
    
    return Effect.runPromise(
      Effect.runtime<FeatureFlagService>().pipe(Effect.provide(serviceLayer))
    );
  };

  describe("isEnabled", () => {
    it.skip("should return true for enabled features", async () => {
      const runtime = await createServiceRuntime("CODER_PANE,WALLET_PANE,HAND_TRACKING");

      const result = await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          const coderEnabled = yield* _(service.isEnabled(Feature.CODER_PANE));
          const walletEnabled = yield* _(service.isEnabled(Feature.WALLET_PANE));
          const handTrackingEnabled = yield* _(service.isEnabled(Feature.HAND_TRACKING));
          
          return { coderEnabled, walletEnabled, handTrackingEnabled };
        })
      );

      expect(result.coderEnabled).toBe(true);
      expect(result.walletEnabled).toBe(true);
      expect(result.handTrackingEnabled).toBe(true);
    });

    it.skip("should return false for disabled features", async () => {
      const runtime = await createServiceRuntime("CODER_PANE");

      const result = await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          const coderEnabled = yield* _(service.isEnabled(Feature.CODER_PANE));
          const agentChatEnabled = yield* _(service.isEnabled(Feature.AGENT_CHAT_PANE));
          const dvmProviderEnabled = yield* _(service.isEnabled(Feature.DVM_PROVIDER_PANE));
          
          return { coderEnabled, agentChatEnabled, dvmProviderEnabled };
        })
      );

      expect(result.coderEnabled).toBe(true);
      expect(result.agentChatEnabled).toBe(false);
      expect(result.dvmProviderEnabled).toBe(false);
    });

    it("should handle empty feature flags config", async () => {
      const runtime = await createServiceRuntime("");

      const result = await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          const isEnabled = yield* _(service.isEnabled(Feature.CODER_PANE));
          return isEnabled;
        })
      );

      expect(result).toBe(false);
    });

    it.skip("should handle lowercase feature flags", async () => {
      const runtime = await createServiceRuntime("coder_pane,wallet_pane");

      const result = await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          const coderEnabled = yield* _(service.isEnabled(Feature.CODER_PANE));
          const walletEnabled = yield* _(service.isEnabled(Feature.WALLET_PANE));
          
          return { coderEnabled, walletEnabled };
        })
      );

      expect(result.coderEnabled).toBe(true);
      expect(result.walletEnabled).toBe(true);
    });

    it.skip("should trim whitespace from feature flags", async () => {
      const runtime = await createServiceRuntime("  CODER_PANE  ,  WALLET_PANE  ");

      const result = await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          const coderEnabled = yield* _(service.isEnabled(Feature.CODER_PANE));
          const walletEnabled = yield* _(service.isEnabled(Feature.WALLET_PANE));
          
          return { coderEnabled, walletEnabled };
        })
      );

      expect(result.coderEnabled).toBe(true);
      expect(result.walletEnabled).toBe(true);
    });
  });

  describe("getEnabledFeatures", () => {
    it.skip("should return all enabled features", async () => {
      const runtime = await createServiceRuntime("CODER_PANE,WALLET_PANE,HAND_TRACKING,DVM_PROVIDER_PANE");

      const result = await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          return yield* _(service.getEnabledFeatures());
        })
      );

      expect(result).toHaveLength(4);
      expect(result).toContain(Feature.CODER_PANE);
      expect(result).toContain(Feature.WALLET_PANE);
      expect(result).toContain(Feature.HAND_TRACKING);
      expect(result).toContain(Feature.DVM_PROVIDER_PANE);
    });

    it("should return empty array when no features are enabled", async () => {
      const runtime = await createServiceRuntime("");

      const result = await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          return yield* _(service.getEnabledFeatures());
        })
      );

      expect(result).toEqual([]);
    });

    it.skip("should ignore invalid feature flags", async () => {
      const runtime = await createServiceRuntime("CODER_PANE,INVALID_FLAG,WALLET_PANE");

      const result = await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          return yield* _(service.getEnabledFeatures());
        })
      );

      expect(result).toHaveLength(2);
      expect(result).toContain(Feature.CODER_PANE);
      expect(result).toContain(Feature.WALLET_PANE);
    });
  });

  describe("configuration error handling", () => {
    it("should default to empty features when config service fails", async () => {
      const errorConfigService = Layer.succeed(
        ConfigurationService,
        ConfigurationService.of({
          get: () => Effect.fail(new ConfigError({ message: "Config service error" })),
          getSecret: () => Effect.fail(new ConfigError({ message: "Not implemented" })),
          set: () => Effect.succeed(undefined),
          delete: () => Effect.succeed(undefined),
        })
      );

      const dependencies = Layer.mergeAll(errorConfigService, mockTelemetryService);
      const serviceLayer = Layer.provide(FeatureFlagServiceLive, dependencies);
      
      const runtime = await Effect.runPromise(
        Effect.runtime<FeatureFlagService>().pipe(Effect.provide(serviceLayer))
      );

      const result = await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          return yield* _(service.getEnabledFeatures());
        })
      );

      expect(result).toEqual([]);
    });
  });

  describe("v0.0.5 release features", () => {
    it.skip("should correctly handle v0.0.5 feature set", async () => {
      const v005Features = "CODER_PANE,DVM_PROVIDER_PANE,WALLET_PANE,DVM_JOB_HISTORY_PANE,PREVIOUS_CHATS_PANE,HAND_TRACKING";
      const runtime = await createServiceRuntime(v005Features);

      const result = await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          
          // Check all v0.0.5 features are enabled
          const coderEnabled = yield* _(service.isEnabled(Feature.CODER_PANE));
          const dvmProviderEnabled = yield* _(service.isEnabled(Feature.DVM_PROVIDER_PANE));
          const walletEnabled = yield* _(service.isEnabled(Feature.WALLET_PANE));
          const dvmJobHistoryEnabled = yield* _(service.isEnabled(Feature.DVM_JOB_HISTORY_PANE));
          const previousChatsEnabled = yield* _(service.isEnabled(Feature.PREVIOUS_CHATS_PANE));
          const handTrackingEnabled = yield* _(service.isEnabled(Feature.HAND_TRACKING));
          
          // Check disabled features
          const agentChatEnabled = yield* _(service.isEnabled(Feature.AGENT_CHAT_PANE));
          const claudeCodeEnabled = yield* _(service.isEnabled(Feature.CLAUDE_CODE_PROVIDER));
          const ollamaEnabled = yield* _(service.isEnabled(Feature.OLLAMA_PROVIDER));
          
          return {
            enabledFeatures: {
              coderEnabled,
              dvmProviderEnabled,
              walletEnabled,
              dvmJobHistoryEnabled,
              previousChatsEnabled,
              handTrackingEnabled
            },
            disabledFeatures: {
              agentChatEnabled,
              claudeCodeEnabled,
              ollamaEnabled
            }
          };
        })
      );

      // All v0.0.5 features should be enabled
      expect(result.enabledFeatures.coderEnabled).toBe(true);
      expect(result.enabledFeatures.dvmProviderEnabled).toBe(true);
      expect(result.enabledFeatures.walletEnabled).toBe(true);
      expect(result.enabledFeatures.dvmJobHistoryEnabled).toBe(true);
      expect(result.enabledFeatures.previousChatsEnabled).toBe(true);
      expect(result.enabledFeatures.handTrackingEnabled).toBe(true);

      // Features not in v0.0.5 should be disabled
      expect(result.disabledFeatures.agentChatEnabled).toBe(false);
      expect(result.disabledFeatures.claudeCodeEnabled).toBe(false);
      expect(result.disabledFeatures.ollamaEnabled).toBe(false);
    });
  });

  describe("initialization behavior", () => {
    it("should only initialize once per service instance", async () => {
      let configGetCalls = 0;
      
      const trackingConfigService = Layer.succeed(
        ConfigurationService,
        ConfigurationService.of({
          get: (key: string) => {
            if (key === "FEATURE_FLAGS_ENABLED_LIST") {
              configGetCalls++;
              return Effect.succeed("CODER_PANE");
            }
            return Effect.fail(new ConfigError({ message: `Key not found: ${key}` }));
          },
          getSecret: () => Effect.fail(new ConfigError({ message: "Not implemented" })),
          set: () => Effect.succeed(undefined),
          delete: () => Effect.succeed(undefined),
        })
      );

      const dependencies = Layer.mergeAll(trackingConfigService, mockTelemetryService);
      const serviceLayer = Layer.provide(FeatureFlagServiceLive, dependencies);
      
      const runtime = await Effect.runPromise(
        Effect.runtime<FeatureFlagService>().pipe(Effect.provide(serviceLayer))
      );

      await Runtime.runPromise(runtime)(
        Effect.gen(function* (_) {
          const service = yield* _(FeatureFlagService);
          
          // Multiple calls should only trigger one initialization
          yield* _(service.isEnabled(Feature.CODER_PANE));
          yield* _(service.isEnabled(Feature.WALLET_PANE));
          yield* _(service.getEnabledFeatures());
          yield* _(service.isEnabled(Feature.HAND_TRACKING));
        })
      );

      expect(configGetCalls).toBe(1);
    });
  });
});