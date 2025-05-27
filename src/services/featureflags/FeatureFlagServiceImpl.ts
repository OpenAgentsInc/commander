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
    
    // Create a reference to hold the state
    const stateRef = yield* _(Effect.sync(() => ({
      enabledFeaturesSet: new Set<Feature>(),
      initialized: false
    })));

    const initialize = Effect.gen(function* (_) {
      if (stateRef.initialized) return;
      const enabledFlagsString = yield* _(
        configService.get("FEATURE_FLAGS_ENABLED_LIST").pipe(
          Effect.orElseSucceed(() => "")
        )
      );
      const features = enabledFlagsString
        .split(',')
        .map(f => f.trim().toUpperCase() as Feature)
        .filter(f => f && Object.values(Feature).includes(f));
      stateRef.enabledFeaturesSet = new Set(features);
      stateRef.initialized = true;

      yield* _(telemetryService.trackEvent({
        category: "feature_flags",
        action: "initialized",
        label: "FeatureFlagService initialized",
        value: JSON.stringify(Array.from(stateRef.enabledFeaturesSet))
      }).pipe(Effect.ignoreLogged));
    }).pipe(
      Effect.catchAll((e: unknown) => {
        const errorMessage = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : String(e);
        // Log error without using runFork (which requires a scope)
        console.error(`FeatureFlagService initialization failed: ${errorMessage}`, e);
        return Effect.die(new FeatureFlagError({ message: `FeatureFlagService initialization failed: ${errorMessage}`, cause: e }));
      })
    );

    const ensureInitialized = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      Effect.flatMap(initialize, () => effect);

    return FeatureFlagService.of({
      isEnabled: (flag: Feature) =>
        ensureInitialized(
          Effect.succeed(stateRef.enabledFeaturesSet.has(flag))
        ),
      getEnabledFeatures: () =>
        ensureInitialized(
          Effect.succeed(Array.from(stateRef.enabledFeaturesSet))
        ),
    });
  })
);