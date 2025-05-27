// src/services/featureflags/FeatureFlagServiceTestImpl.ts
import { Effect, Layer } from "effect";
import { FeatureFlagService } from "./FeatureFlagService";
import { Feature } from "./FeatureFlag";

/**
 * Test implementation of FeatureFlagService that avoids ECC library dependencies.
 * This mock implementation allows configuring enabled features directly.
 */
export const createFeatureFlagServiceTestLayer = (enabledFeatures: Feature[] = []) => {
  const enabledSet = new Set(enabledFeatures);
  
  return Layer.succeed(
    FeatureFlagService,
    FeatureFlagService.of({
      isEnabled: (flag: Feature) => Effect.succeed(enabledSet.has(flag)),
      getEnabledFeatures: () => Effect.succeed(enabledFeatures),
    })
  );
};

/**
 * Default test layer with v0.0.5 feature set
 */
export const FeatureFlagServiceTestLive = createFeatureFlagServiceTestLayer([
  Feature.CODER_PANE,
  Feature.DVM_PROVIDER_PANE,
  Feature.WALLET_PANE,
  Feature.DVM_JOB_HISTORY_PANE,
  Feature.PREVIOUS_CHATS_PANE,
  Feature.HAND_TRACKING
]);