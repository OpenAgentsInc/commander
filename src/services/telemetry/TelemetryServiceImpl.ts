import { Effect, Layer, Schema } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
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
    const fs = yield* _(Effect.serviceOption(FileSystem));

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

    // Set up file logging if enabled
    let resolvedLogFilePath: string | undefined = undefined;
    if (config.logToFile && fs._tag === "Some") {
      const fileSystem = fs.value;
      
      // Get app data directory path
      let appDataPath: string;
      
      // Check if we're in Electron main process
      if (typeof process !== "undefined" && process.type === "browser") {
        try {
          const { app } = require("electron");
          appDataPath = app.getPath("userData");
        } catch (e) {
          // Fallback to temp directory
          appDataPath = process.env.TEMP || process.env.TMP || "/tmp";
        }
      } else {
        // Fallback for non-Electron environments or renderer
        appDataPath = process.env.APPDATA || process.env.HOME || ".";
      }
      
      // Build the full path manually
      const logFilePath = `${appDataPath}/${config.logFilePath}`.replace(/\/+/g, '/');
      const logDir = logFilePath.substring(0, logFilePath.lastIndexOf('/'));
      
      const setupResult = yield* _(
        fileSystem.makeDirectory(logDir, { recursive: true }).pipe(
          Effect.flatMap(() => Effect.succeed(logFilePath)),
          Effect.catchAll((err) => {
            console.error(`[TelemetryService] Failed to create log directory: ${logDir}`, err); // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            return Effect.succeed(undefined);
          })
        )
      );
      
      resolvedLogFilePath = setupResult;
      
      if (resolvedLogFilePath) {
        console.log(`[TelemetryService] File logging enabled. Path: ${resolvedLogFilePath}`); // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
      }
    } else if (config.logToFile) {
      console.log(`[TelemetryService] File logging requested but FileSystem service not available`); // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
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
                // Disabled verbose telemetry logging
                // console.log("[Telemetry]", eventWithTimestamp);
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
            
            // File logging
            if (config.logToFile && resolvedLogFilePath && fs._tag === "Some") {
              const fileSystem = fs.value;
              const levelOrder = ["debug", "info", "warn", "error"];
              const eventLevel = event.level || "info";
              
              if (levelOrder.indexOf(eventLevel) >= levelOrder.indexOf(config.logFileLevel)) {
                // Format the log line
                const timestamp = new Date(eventWithTimestamp.timestamp).toISOString();
                const level = eventLevel.toUpperCase();
                const category = eventWithTimestamp.category;
                const action = eventWithTimestamp.action;
                const label = eventWithTimestamp.label || "";
                
                let valueStr = "";
                if (eventWithTimestamp.value !== undefined) {
                  const valueString = String(eventWithTimestamp.value);
                  valueStr = ` | Value: ${valueString.substring(0, 500)}`;
                }
                
                let contextStr = "";
                if (eventWithTimestamp.context) {
                  contextStr = ` | Context: ${JSON.stringify(eventWithTimestamp.context)}`;
                }
                
                const logLine = `${timestamp} [${level}] [${category}] (${action}) ${label}${valueStr}${contextStr}\n`;
                
                // Append to file (fire and forget)
                yield* _(
                  fileSystem.writeFileString(resolvedLogFilePath, logLine, { flag: "a" }).pipe(
                    Effect.catchAll((err) => {
                      console.error(`[TelemetryService] Error writing to log file ${resolvedLogFilePath}:`, err); // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                      return Effect.void;
                    })
                  )
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
