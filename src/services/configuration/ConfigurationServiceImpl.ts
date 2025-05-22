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

    // Add development defaults
    // For OpenAI provider
    yield* _(configService.set("OPENAI_MODEL_NAME", "gpt-4o"));
    yield* _(configService.set("OPENAI_BASE_URL", "https://api.openai.com/v1"));

    // For Ollama provider
    yield* _(configService.set("OLLAMA_MODEL_NAME", "gemma3:1b"));
    yield* _(configService.set("OLLAMA_ENABLED", "true"));

    // For Devstral NIP-90 DVM provider
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_PUBKEY", "84dee6e676e5bb67b4ad4e042cf70cbd8681155614094f88a198d6f790605a67")); // Example pubkey
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_RELAYS", JSON.stringify([
      "wss://relay.damus.io",
      "wss://relay.nostr.band",
      "wss://nos.lol"
    ])));
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_REQUEST_KIND", "5050")); // Text-to-text kind
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION", "true")); // Enable encryption for privacy
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS", "true")); // Use ephemeral keys for safety
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER", "devstral")); // Model identifier for the DVM
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_MODEL_NAME", "Devstral (NIP-90)")); // User-facing name
    yield* _(configService.set("AI_PROVIDER_DEVSTRAL_ENABLED", "true"));

    // Add a dummy API key for development/testing (but print a warning)
    // In a real app, API keys should be added securely at runtime by the user
    // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
    console.warn(
      "[ConfigurationService] Using dummy API keys for development. Real keys should be added securely.",
    );

    // Mock the getSecret calls to return test keys
    const origGetSecret = configService.getSecret;
    const mockedService = {
      ...configService,
      getSecret: (
        key: string,
      ): Effect.Effect<string, SecretNotFoundError | ConfigError> => {
        if (key === "OPENAI_API_KEY") {
          return Effect.succeed("sk-test-dummy-key-for-development-only");
        }
        return origGetSecret(key);
      },
    };

    return mockedService;
  }),
);
