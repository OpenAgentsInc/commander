// src/services/configuration/ConfigurationServiceImpl.ts
import { Effect, Layer } from "effect";
import {
  ConfigurationService,
  ConfigError,
  SecretNotFoundError,
} from "./ConfigurationService";

/**
 * In-memory implementation of the ConfigurationService
 * In a real application, this would use secure storage for secrets
 * and persistent storage for configuration
 */
export const ConfigurationServiceLive = Layer.effect(
  ConfigurationService,
  Effect.gen(function* (_) {
    // In-memory storage for configuration values
    const configStore = new Map<string, string>();

    // In-memory storage for secrets (in a real app, use secure storage)
    const secretStore = new Map<string, string>();

    return ConfigurationService.of({
      get: (key: string): Effect.Effect<string, ConfigError> => {
        return Effect.try({
          try: () => {
            const value = configStore.get(key);
            if (value === undefined) {
              throw new ConfigError({
                message: `Configuration key not found: ${key}`,
              });
            }
            return value;
          },
          catch: (cause) =>
            new ConfigError({
              message: `Error retrieving configuration for key: ${key}`,
              cause,
            }),
        });
      },

      getSecret: (
        key: string,
      ): Effect.Effect<string, SecretNotFoundError | ConfigError> => {
        return Effect.try({
          try: () => {
            const value = secretStore.get(key);
            if (value === undefined) {
              throw new SecretNotFoundError({
                message: `Secret key not found: ${key}`,
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
              message: `Error retrieving secret for key: ${key}`,
              cause,
            });
          },
        });
      },

      set: (key: string, value: string): Effect.Effect<void, ConfigError> => {
        return Effect.try({
          try: () => {
            configStore.set(key, value);
            return;
          },
          catch: (cause) =>
            new ConfigError({
              message: `Error setting configuration for key: ${key}`,
              cause,
            }),
        });
      },

      delete: (key: string): Effect.Effect<void, ConfigError> => {
        return Effect.try({
          try: () => {
            configStore.delete(key);
            return;
          },
          catch: (cause) =>
            new ConfigError({
              message: `Error deleting configuration key: ${key}`,
              cause,
            }),
        });
      },
    });
  }),
);

/**
 * Prepopulate configuration with default values for development/testing
 */
export const DefaultDevConfigLayer = Layer.effect(
  ConfigurationService,
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigurationService);

    // Set default values for development
    yield* _(configService.set("OLLAMA_MODEL_NAME", "gemma3:1b"));
    yield* _(configService.set("OLLAMA_MODEL_ENABLED", "true"));

    // NIP-90 Devstral DVM configuration
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY", "714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827")); // Updated provider pubkey
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_RELAYS", JSON.stringify(["wss://nos.lol", "wss://relay.damus.io", "wss://relay.nostr.band"])));
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_REQUEST_KIND", "5050")); // Text-to-text kind
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION", "true")); // Enable encryption for privacy
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS", "true")); // Use ephemeral keys
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER", "devstral")); // Model identifier for the DVM
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_MODEL_NAME", "Devstral (NIP-90)")); // User-facing name
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_ENABLED", "true")); // Enable the provider

    return configService;
  })
);
