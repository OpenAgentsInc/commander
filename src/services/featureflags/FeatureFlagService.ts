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

// Re-export for tests
export { FeatureFlagServiceLive } from "./FeatureFlagServiceImpl";