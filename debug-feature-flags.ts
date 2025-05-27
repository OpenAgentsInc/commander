import { Effect, Layer, Runtime } from "effect";
import { FeatureFlagService } from "./src/services/featureflags/FeatureFlagService";
import { FeatureFlagServiceLive } from "./src/services/featureflags/FeatureFlagServiceImpl";
import { Feature } from "./src/services/featureflags/FeatureFlag";
import { ConfigurationService, ConfigError } from "./src/services/configuration";
import { TelemetryService } from "./src/services/telemetry";

async function debugFeatureFlags() {
  console.log("=== Starting Feature Flag Debug ===");
  
  let configGetCalls = 0;
  
  const mockConfigService = Layer.succeed(
    ConfigurationService,
    ConfigurationService.of({
      get: (key: string) => {
        configGetCalls++;
        console.log(`[${configGetCalls}] ConfigService.get called with: "${key}"`);
        if (key === "FEATURE_FLAGS_ENABLED_LIST") {
          console.log(`[${configGetCalls}] Returning: "CODER_PANE,WALLET_PANE"`);
          return Effect.succeed("CODER_PANE,WALLET_PANE");
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
      trackEvent: (event: any) => {
        console.log("TelemetryService.trackEvent called:", JSON.stringify(event));
        return Effect.succeed(undefined);
      },
      isEnabled: () => Effect.succeed(true),
      setEnabled: () => Effect.succeed(undefined),
    })
  );

  console.log("Creating service layers...");
  const dependencies = Layer.mergeAll(mockConfigService, mockTelemetryService);
  const serviceLayer = Layer.provide(FeatureFlagServiceLive, dependencies);
  
  console.log("Building runtime...");
  const runtime = await Effect.runPromise(
    Effect.runtime<FeatureFlagService>().pipe(Effect.provide(serviceLayer))
  );

  console.log("Runtime created, running test program...");

  const result = await Runtime.runPromise(runtime)(
    Effect.gen(function* (_) {
      console.log("Getting FeatureFlagService...");
      const service = yield* _(FeatureFlagService);
      console.log("Got service, checking CODER_PANE...");
      
      const coderEnabled = yield* _(service.isEnabled(Feature.CODER_PANE));
      console.log("CODER_PANE enabled:", coderEnabled);
      
      const walletEnabled = yield* _(service.isEnabled(Feature.WALLET_PANE));
      console.log("WALLET_PANE enabled:", walletEnabled);
      
      const allFeatures = yield* _(service.getEnabledFeatures());
      console.log("All enabled features:", allFeatures);
      
      return { coderEnabled, walletEnabled, allFeatures };
    })
  );

  console.log("\n=== Final Results ===");
  console.log("Result:", result);
  console.log("Config get calls:", configGetCalls);
  console.log("Expected CODER_PANE to be true, got:", result.coderEnabled);
  console.log("Expected WALLET_PANE to be true, got:", result.walletEnabled);
  console.log("Expected 2 features, got:", result.allFeatures.length);
}

debugFeatureFlags().catch(console.error);