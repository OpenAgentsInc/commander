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
  // In actual client code, we'd use import.meta.env.MODE but 
  // for CommonJS compatibility in tests, we need to use process.env
  // We need to be careful with environment detection to avoid errors in different contexts
  let isDevelopmentMode = false;
  
  // Try to determine if we're in development mode
  try {
    // Check for browser/Electron renderer environment
    if (typeof window !== 'undefined' && window.location) {
      // Consider localhost or 127.0.0.1 to be development
      isDevelopmentMode = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:';
    }
    
    // Try to check Node.js environment, but handle if process is not defined
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.NODE_ENV === 'development' || 
          process.env.NODE_ENV === 'test' || 
          process.env.VITEST) {
        isDevelopmentMode = true;
      }
    }
  } catch (e) {
    // If there's any error in environment detection, default to enabled
    // to avoid breaking anything in unexpected environments
    isDevelopmentMode = true;
    
    // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
    console.warn('[TelemetryService] Error detecting environment, defaulting to enabled:', e);
  }
  
  // Default behavior: enabled in test/dev, disabled in prod
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
        // Check for test environment in a safe way that works in browser
        let isTestEnv = false;
        try {
          if (typeof process !== 'undefined' && process.env) {
            isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST !== undefined;
          }
        } catch (e) {
          // Ignore error checking test environment, assume not test
        }
        
        if (!isTestEnv) {
          try {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (This is the service's own logging mechanism)
            console.log("[Telemetry]", eventWithTimestamp);
          } catch (consoleError) {
            // Silently handle console.log errors - this can happen in certain environments
            // where console is limited or in certain test scenarios
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("Failed to log telemetry event to console, continuing silently:", consoleError);
          }
        }
        return;
      } catch (cause) {
        // In case other errors occur, we still want to avoid breaking the application
        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.error("Error in telemetry trackEvent:", cause);
        // Return instead of throwing to make telemetry more resilient
        return;
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