import { Layer } from "effect";
import { TelemetryServiceConfig, TelemetryServiceConfigTag } from "./TelemetryService";

/**
 * Default telemetry configuration for CLI environments
 * Minimal logging to avoid cluttering CLI output
 */
export const TelemetryServiceCliConfigLayer = Layer.succeed(
  TelemetryServiceConfigTag,
  {
    enabled: true,
    logToConsole: false, // Don't clutter CLI output
    logLevel: "info",
    logToFile: true,
    logFilePath: "logs/swe-bench-run.log",
    logFileLevel: "debug",
  } satisfies TelemetryServiceConfig
);