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
      Effect.tapError((err) => {
        console.error(`Error checking feature flag ${feature}:`, err); // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        return Effect.void;
      })
    );

    Effect.runPromise(checkFeature)
      .then(setIsEnabled)
      .catch(err => {
        if (err instanceof FeatureFlagError || err._tag === "ConfigError") {
          setError(err as FeatureFlagError | ConfigError);
        } else {
          setError(new FeatureFlagError({ message: String(err), cause: err }));
        }
      })
      .finally(() => setIsLoading(false));
  }, [feature]);

  return [isEnabled, isLoading, error];
}