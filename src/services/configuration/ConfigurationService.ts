// src/services/configuration/ConfigurationService.ts
import { Context, Effect, Data } from "effect";

// --- Custom Error Types ---
export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: Record<string, unknown>;
}> {}

export class SecretNotFoundError extends Data.TaggedError("SecretNotFoundError")<{
  readonly message: string;
  readonly keyName: string;
  readonly cause?: unknown;
}> {}

// --- Service Interface ---
export interface ConfigurationService {
  /**
   * Get a configuration value
   * @param key The configuration key
   * @returns Effect with the value or a ConfigError
   */
  get(key: string): Effect.Effect<string, ConfigError>;

  /**
   * Get a secret configuration value
   * @param key The secret key
   * @returns Effect with the secret value or a SecretNotFoundError
   */
  getSecret(key: string): Effect.Effect<string, SecretNotFoundError | ConfigError>;

  /**
   * Set a configuration value
   * @param key The configuration key
   * @param value The value to set
   * @returns Effect with void on success or a ConfigError
   */
  set(key: string, value: string): Effect.Effect<void, ConfigError>;

  /**
   * Delete a configuration value
   * @param key The configuration key to delete
   * @returns Effect with void on success or a ConfigError
   */
  delete(key: string): Effect.Effect<void, ConfigError>;
}

// --- Service Tag ---
export const ConfigurationService = Context.GenericTag<ConfigurationService>("ConfigurationService");