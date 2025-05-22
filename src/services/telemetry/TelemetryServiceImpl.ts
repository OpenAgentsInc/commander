import { Effect, Layer, Schema } from "effect";
import {
  TelemetryService,
  TelemetryEvent,
  TelemetryEventSchema,
  TelemetryError,
  TrackEventError,
  TelemetryServiceConfig,
  TelemetryServiceConfigTag,
} from "./TelemetryService";

/**
 * Create the Telemetry service implementation that uses the configuration
 */
export const TelemetryServiceLive = Layer.effect(
  TelemetryService,
  Effect.gen(function* (_) {
    const config = yield* _(TelemetryServiceConfigTag);

    // Start with the config's enabled value
    let telemetryEnabled = config.enabled;

    // Determine if telemetry should be enabled based on environment
    // This is a fallback if the configuration doesn't make sense for the environment
    let isDevelopmentMode = false;

    try {
      // Check for browser/Electron renderer environment
      if (typeof window !== "undefined" && window.location) {
        // Consider localhost or 127.0.0.1 to be development
        isDevelopmentMode =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.protocol === "file:";
      }

      // Try to check Node.js environment, but handle if process is not defined
      if (typeof process !== "undefined" && process.env) {
        if (
          process.env.NODE_ENV === "development" ||
          process.env.NODE_ENV === "test" ||
          process.env.VITEST
        ) {
          isDevelopmentMode = true;
        }
      }
    } catch (e) {
      // If there's any error in environment detection, default to enabled
      // to avoid breaking anything in unexpected environments
      isDevelopmentMode = true;

      // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
      console.warn(
        "[TelemetryService] Error detecting environment, defaulting to enabled:",
        e,
      );
    }

    // In production, only use the explicitly provided config value
    // In development, we can override with the environment defaults if needed
    if (isDevelopmentMode && config.enabled === false) {
      // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
      console.log(
        "[TelemetryService] Development mode detected, telemetry would be enabled by default but config overrides to:",
        config.enabled,
      );
    }

    return TelemetryService.of({
      trackEvent: (
        event: TelemetryEvent,
      ): Effect.Effect<void, TrackEventError> => {
        return Effect.gen(function* (_) {
          yield* _(
            Schema.decodeUnknown(TelemetryEventSchema)(event),
            Effect.mapError(
              (error) =>
                new TrackEventError({
                  message: "Invalid event format",
                  cause: error,
                }),
            ),
          );

          // Check if telemetry is currently enabled
          if (!telemetryEnabled) {
            return; // Silently do nothing if telemetry is disabled
          }

          const eventWithTimestamp = {
            ...event,
            timestamp: event.timestamp || Date.now(),
          };

          try {
            // Check for test environment in a safe way that works in browser
            let isTestEnv = false;
            try {
              if (typeof process !== "undefined" && process.env) {
                isTestEnv =
                  process.env.NODE_ENV === "test" ||
                  process.env.VITEST !== undefined;
              }
            } catch (e) {
              // Ignore error checking test environment, assume not test
            }

            if (!isTestEnv && config.logToConsole) {
              try {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (This is the service's own logging mechanism)
                console.log("[Telemetry]", eventWithTimestamp);
              } catch (consoleError) {
                // Silently handle console.log errors - this can happen in certain environments
                // where console is limited or in certain test scenarios
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error(
                  "Failed to log telemetry event to console, continuing silently:",
                  consoleError,
                );
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
      },

      isEnabled: (): Effect.Effect<boolean, TelemetryError> => {
        return Effect.try({
          try: () => telemetryEnabled,
          catch: (cause) =>
            new TelemetryError({
              message: "Failed to check if telemetry is enabled",
              cause,
            }),
        });
      },

      setEnabled: (enabled: boolean): Effect.Effect<void, TelemetryError> => {
        return Effect.try({
          try: () => {
            telemetryEnabled = enabled;
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log(
              `[TelemetryService] Telemetry explicitly set to: ${enabled}`,
            );
            return;
          },
          catch: (cause) =>
            new TelemetryError({
              message: "Failed to set telemetry enabled state",
              cause,
            }),
        });
      },
    });
  }),
);
