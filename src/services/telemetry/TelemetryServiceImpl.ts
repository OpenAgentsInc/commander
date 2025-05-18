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
  // In-memory storage for enabled status (in a real app, this would be persistent storage)
  let telemetryEnabled = true; // Set default to true to avoid initial errors

  /**
   * Track a telemetry event 
   */
  const trackEvent = (event: TelemetryEvent): Effect.Effect<void, TrackEventError> => {
    return Effect.gen(function* (_) {
      // Validate the event using Schema
      yield* _(
        Schema.decodeUnknown(TelemetryEventSchema)(event),
        Effect.mapError(
          (error) => new TrackEventError({ message: "Invalid event format", cause: error })
        )
      );

      // Check if telemetry is enabled before tracking
      try {
        const enabled = yield* _(isEnabled().pipe(
          Effect.mapError(error => new TrackEventError({
            message: error.message, 
            cause: error.cause
          }))
        ));
        if (!enabled) {
          return; // Silently do nothing if telemetry is disabled
        }
      } catch (error) {
        console.error("Error checking telemetry status:", error);
        // Continue anyway to avoid breaking
      }

      // Add timestamp if not present
      const eventWithTimestamp = {
        ...event,
        timestamp: event.timestamp || Date.now()
      };

      // In a real implementation, this would send data to a telemetry service
      // This is a placeholder that just logs to console, but only if not running tests
      try {
        // Check if we're in test environment
        const isTestEnv = process.env.NODE_ENV === 'test' || 
                         process.env.VITEST !== undefined;
        
        // Only log if not in test environment
        if (!isTestEnv) {
          console.log("[Telemetry]", eventWithTimestamp);
        }
        return;
      } catch (cause) {
        throw new TrackEventError({ 
          message: "Failed to track event", 
          cause 
        });
      }
    });
  };

  /**
   * Check if telemetry is enabled
   */
  const isEnabled = (): Effect.Effect<boolean, TelemetryError> => {
    return Effect.try({
      try: () => telemetryEnabled,
      catch: (cause) => new TelemetryError({ 
        message: "Failed to check if telemetry is enabled", 
        cause 
      })
    });
  };

  /**
   * Enable or disable telemetry
   */
  const setEnabled = (enabled: boolean): Effect.Effect<void, TelemetryError> => {
    return Effect.try({
      try: () => {
        telemetryEnabled = enabled;
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

/**
 * Live implementation of the Telemetry service
 */
export const TelemetryServiceLive = Layer.succeed(
  TelemetryService,
  createTelemetryService()
);