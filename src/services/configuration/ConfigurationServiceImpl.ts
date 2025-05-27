// src/services/configuration/ConfigurationServiceImpl.ts
import { Effect, Layer } from "effect";
import {
  ConfigurationService,
  ConfigError,
  SecretNotFoundError,
} from "./ConfigurationService";
import { DEFAULT_CONFIGURATIONS, CONFIG_KEYS } from "./defaults";

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
    const defaults = DEFAULT_CONFIGURATIONS;
    const keys = CONFIG_KEYS;

    // Ollama defaults
    yield* _(configService.set(keys.OLLAMA_MODEL_NAME, defaults.ollama.modelName));
    yield* _(configService.set(keys.OLLAMA_MODEL_ENABLED, defaults.ollama.modelEnabled));

    // NIP-90 Devstral DVM configuration
    yield* _(configService.set(keys.AI_PROVIDER_DEVSTRAL_DVM_PUBKEY, defaults.nip90Devstral.pubkey));
    yield* _(configService.set(keys.AI_PROVIDER_DEVSTRAL_RELAYS, defaults.nip90Devstral.relays));
    yield* _(configService.set(keys.AI_PROVIDER_DEVSTRAL_REQUEST_KIND, defaults.nip90Devstral.requestKind));
    yield* _(configService.set(keys.AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION, defaults.nip90Devstral.requiresEncryption));
    yield* _(configService.set(keys.AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS, defaults.nip90Devstral.useEphemeralRequests));
    yield* _(configService.set(keys.AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER, defaults.nip90Devstral.modelIdentifier));
    yield* _(configService.set(keys.AI_PROVIDER_DEVSTRAL_MODEL_NAME, defaults.nip90Devstral.modelName));
    yield* _(configService.set(keys.AI_PROVIDER_DEVSTRAL_ENABLED, defaults.nip90Devstral.enabled));

    // User-configurable NIP-90 DVM placeholders
    yield* _(configService.set(keys.USER_NIP90_DVM_PUBKEY, defaults.userNip90.pubkey));
    yield* _(configService.set(keys.USER_NIP90_RELAYS, defaults.userNip90.relays));
    yield* _(configService.set(keys.USER_NIP90_REQUEST_KIND, defaults.userNip90.requestKind));
    yield* _(configService.set(keys.USER_NIP90_REQUIRES_ENCRYPTION, defaults.userNip90.requiresEncryption));
    yield* _(configService.set(keys.USER_NIP90_USE_EPHEMERAL_REQUESTS, defaults.userNip90.useEphemeralRequests));
    yield* _(configService.set(keys.USER_NIP90_MODEL_IDENTIFIER, defaults.userNip90.modelIdentifier));
    yield* _(configService.set(keys.USER_NIP90_NAME, defaults.userNip90.name));
    yield* _(configService.set(keys.USER_NIP90_ENABLED, defaults.userNip90.enabled));

    // Claude Code CLI Provider
    yield* _(configService.set(keys.ANTHROPIC_API_KEY, defaults.claudeCode.apiKey));
    yield* _(configService.set(keys.CLAUDE_CODE_CLI_PATH, defaults.claudeCode.cliPath));
    yield* _(configService.set(keys.CLAUDE_CODE_PROVIDER_ENABLED, defaults.claudeCode.enabled));
    yield* _(configService.set(keys.CLAUDE_CODE_DEFAULT_MODEL, defaults.claudeCode.defaultModel));
    yield* _(configService.set(keys.CLAUDE_CODE_PROVIDER_NAME, defaults.claudeCode.providerName));

    // Database configuration
    yield* _(configService.set(keys.DB_DATA_DIR, defaults.database.dataDir));

    // Kind 5050 DVM defaults
    yield* _(configService.set(keys.DVM_5050_ACTIVE, defaults.kind5050DVM.active));
    yield* _(configService.set(keys.DVM_5050_PRIVATE_KEY_HEX, defaults.kind5050DVM.privateKeyHex));
    yield* _(configService.set(keys.DVM_5050_SUPPORTED_JOB_KINDS, defaults.kind5050DVM.supportedJobKinds));
    yield* _(configService.set(keys.DVM_5050_RELAYS, defaults.kind5050DVM.relays));
    yield* _(configService.set(keys.DVM_5050_TEXT_GEN_MODEL, defaults.kind5050DVM.textGeneration.model));
    yield* _(configService.set(keys.DVM_5050_TEXT_GEN_MAX_TOKENS, defaults.kind5050DVM.textGeneration.maxTokens));
    yield* _(configService.set(keys.DVM_5050_TEXT_GEN_TEMPERATURE, defaults.kind5050DVM.textGeneration.temperature));
    yield* _(configService.set(keys.DVM_5050_TEXT_GEN_TOP_K, defaults.kind5050DVM.textGeneration.topK));
    yield* _(configService.set(keys.DVM_5050_TEXT_GEN_TOP_P, defaults.kind5050DVM.textGeneration.topP));
    yield* _(configService.set(keys.DVM_5050_TEXT_GEN_FREQUENCY_PENALTY, defaults.kind5050DVM.textGeneration.frequencyPenalty));
    yield* _(configService.set(keys.DVM_5050_TEXT_GEN_MIN_PRICE_SATS, defaults.kind5050DVM.textGeneration.minPriceSats));
    yield* _(configService.set(keys.DVM_5050_TEXT_GEN_PRICE_PER_1K_TOKENS, defaults.kind5050DVM.textGeneration.pricePer1kTokens));

    return configService;
  })
);
