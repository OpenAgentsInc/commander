import { Effect, Layer } from "effect";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryServiceConfig, TelemetryServiceConfigTag } from "./TelemetryService";

/**
 * Creates a TelemetryServiceConfig layer that reads configuration from ConfigurationService
 */
export const TelemetryServiceConfigFromConfigurationLayer = Layer.effect(
  TelemetryServiceConfigTag,
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigurationService);
    
    // Read telemetry configuration from ConfigurationService with defaults
    const enabled = yield* _(
      configService.get("TELEMETRY_ENABLED").pipe(
        Effect.map((value) => value === "true"),
        Effect.orElse(() => Effect.succeed(true))
      )
    );
    
    const logToConsole = yield* _(
      configService.get("TELEMETRY_LOG_TO_CONSOLE").pipe(
        Effect.map((value) => value === "true"),
        Effect.orElse(() => Effect.succeed(true))
      )
    );
    
    const logLevel = yield* _(
      configService.get("TELEMETRY_LOG_LEVEL").pipe(
        Effect.map((value) => value as "debug" | "info" | "warn" | "error"),
        Effect.orElse(() => Effect.succeed("info" as const))
      )
    );
    
    const logToFile = yield* _(
      configService.get("TELEMETRY_LOG_TO_FILE").pipe(
        Effect.map((value) => value === "true"),
        Effect.orElse(() => Effect.succeed(true))
      )
    );
    
    const logFilePath = yield* _(
      configService.get("TELEMETRY_LOG_FILE_PATH").pipe(
        Effect.orElse(() => Effect.succeed("logs/commander-run.log"))
      )
    );
    
    const logFileLevel = yield* _(
      configService.get("TELEMETRY_LOG_FILE_LEVEL").pipe(
        Effect.map((value) => value as "debug" | "info" | "warn" | "error"),
        Effect.orElse(() => Effect.succeed("info" as const))
      )
    );
    
    const config: TelemetryServiceConfig = {
      enabled,
      logToConsole,
      logLevel,
      logToFile,
      logFilePath,
      logFileLevel,
    };
    
    return config;
  })
);