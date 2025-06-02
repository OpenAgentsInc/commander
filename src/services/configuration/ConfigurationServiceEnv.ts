import { Effect, Layer } from "effect";
import {
  ConfigurationService,
  ConfigError,
  SecretNotFoundError,
} from "./ConfigurationService";

/**
 * Environment-based implementation of ConfigurationService for CLI usage
 */
export const ConfigurationServiceEnvLive = Layer.succeed(
  ConfigurationService,
  ConfigurationService.of({
    get: (key: string): Effect.Effect<string, ConfigError> => {
      return Effect.try({
        try: () => {
          const value = process.env[key];
          if (value === undefined) {
            throw new ConfigError({
              message: `Environment variable not found: ${key}`,
            });
          }
          return value;
        },
        catch: (cause) =>
          new ConfigError({
            message: `Error retrieving environment variable: ${key}`,
            cause,
          }),
      });
    },

    getSecret: (key: string): Effect.Effect<string, SecretNotFoundError | ConfigError> => {
      return Effect.try({
        try: () => {
          const value = process.env[key];
          if (value === undefined) {
            throw new SecretNotFoundError({
              message: `Secret environment variable not found: ${key}`,
              keyName: key,
            });
          }
          return value;
        },
        catch: (cause) => {
          if (cause instanceof SecretNotFoundError) {
            return cause;
          }
          return new ConfigError({
            message: `Error retrieving secret environment variable: ${key}`,
            cause,
          });
        },
      });
    },

    set: (_key: string, _value: string): Effect.Effect<void, ConfigError> => {
      // Setting environment variables at runtime is not recommended
      return Effect.fail(
        new ConfigError({
          message: "Cannot set environment variables at runtime",
        })
      );
    },


    delete: (_key: string): Effect.Effect<void, ConfigError> => {
      // Deleting environment variables at runtime is not recommended
      return Effect.fail(
        new ConfigError({
          message: "Cannot delete environment variables at runtime",
        })
      );
    },
  })
);