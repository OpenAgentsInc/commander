import { Effect, Layer, Schema } from "effect";
import {
  TelemetryService,
  TelemetryEvent,
  TelemetryEventSchema,
  TelemetryError,
  TrackEventError
} from "./TelemetryService";

/**
 * Create the Telemetry service implementation
 */
export function createTelemetryService(): TelemetryService {
  // Determine if telemetry should be enabled based on environment
  // Vite uses import.meta.env.MODE for 'development' or 'production' in client-side code.
  const isDevelopmentMode = import.meta.env.MODE === 'development';
  // Default behavior: full telemetry in dev, no telemetry in prod.
  let telemetryEnabled = isDevelopmentMode;

  const trackEvent = (event: TelemetryEvent): Effect.Effect<void, TrackEventError> => {
    return Effect.gen(function* (_) {
      yield* _(
        Schema.decodeUnknown(TelemetryEventSchema)(event),
        Effect.mapError(
          (error) => new TrackEventError({ message: "Invalid event format", cause: error })
        )
      );

      let currentIsEnabled = false;
      try {
        // Use a local variable to avoid race conditions if isEnabled() was async from storage
        currentIsEnabled = yield* _(isEnabled().pipe(
          Effect.mapError(error => new TrackEventError({
            message: `Error checking telemetry status: ${error.message}`,
            cause: error.cause
          }))
        ));
      } catch (error) {
         // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.error("TelemetryService: Error checking telemetry status in trackEvent:", error);
        // Default to not tracking if status check fails, but don't break the app
        currentIsEnabled = false;
      }

      if (!currentIsEnabled) {
        return; // Silently do nothing if telemetry is disabled
      }

      const eventWithTimestamp = {
        ...event,
        timestamp: event.timestamp || Date.now()
      };

      try {
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST !== undefined;
        if (!isTestEnv) {
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (This is the service's own logging mechanism)
          console.log("[Telemetry]", eventWithTimestamp);
        }
        return;
      } catch (cause) {
        // This throw will be caught by the Effect runtime if trackEvent is run within an Effect
        throw new TrackEventError({
          message: "Failed to track event via console.log",
          cause
        });
      }
    });
  };

  const isEnabled = (): Effect.Effect<boolean, TelemetryError> => {
    return Effect.try({
      try: () => telemetryEnabled,
      catch: (cause) => new TelemetryError({
        message: "Failed to check if telemetry is enabled",
        cause
      })
    });
  };

  const setEnabled = (enabled: boolean): Effect.Effect<void, TelemetryError> => {
    return Effect.try({
      try: () => {
        telemetryEnabled = enabled;
        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.log(`[TelemetryService] Telemetry explicitly set to: ${enabled}`);
        return;
      },
      catch: (cause) => new TelemetryError({
        message: "Failed to set telemetry enabled state",
        cause
      })
    });
  };

  return {
    trackEvent,
    isEnabled,
    setEnabled
  };
}

export const TelemetryServiceLive = Layer.succeed(
  TelemetryService,
  createTelemetryService()
);