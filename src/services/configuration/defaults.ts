/**
 * Centralized default configuration values for all services
 * This is the single source of truth for all default configurations
 */

import { DEFAULT_RELAYS_ARRAY, DVM_RELAYS_ARRAY } from "@/services/relays";

/**
 * Service-specific default configurations
 */
export const DEFAULT_CONFIGURATIONS = {
  // Ollama Service
  ollama: {
    modelName: "gemma3:1b",
    modelEnabled: "true",
  },

  // NIP-90 Devstral DVM
  nip90Devstral: {
    pubkey: "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245",
    relays: JSON.stringify(DEFAULT_RELAYS_ARRAY),
    requestKind: "5050",
    requiresEncryption: "true",
    useEphemeralRequests: "true",
    modelIdentifier: "devstral",
    modelName: "Devstral (NIP-90)",
    enabled: "true",
  },

  // User-configurable NIP-90 DVM
  userNip90: {
    pubkey: "",
    relays: JSON.stringify(["wss://relay.damus.io", "wss://nostr.wine"]),
    requestKind: "5050",
    requiresEncryption: "false",
    useEphemeralRequests: "true",
    modelIdentifier: "default_user_model",
    name: "My Custom NIP-90 DVM",
    enabled: "false",
  },

  // Claude Code CLI Provider
  claudeCode: {
    apiKey: "YOUR_ANTHROPIC_API_KEY_HERE_OR_LEAVE_BLANK_FOR_ENV_VAR",
    cliPath: "",
    enabled: "true",
    defaultModel: "claude-sonnet",
    providerName: "Claude Code (CLI)",
  },

  // Database
  database: {
    dataDir: "commander-data/database/main_v1",
  },

  // Kind 5050 DVM Service
  kind5050DVM: {
    active: "false",
    // Use a hardcoded development keypair for consistency
    privateKeyHex: "5d5b1b3c4e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    supportedJobKinds: JSON.stringify([5050, 5100]),
    relays: JSON.stringify(DVM_RELAYS_ARRAY),
    // Text generation job config
    textGeneration: {
      model: "gemma2:latest",
      maxTokens: "512",
      temperature: "0.7",
      topK: "40",
      topP: "0.9",
      frequencyPenalty: "0.5",
      minPriceSats: "3",
      pricePer1kTokens: "2",
    },
  },
} as const;

/**
 * Configuration key constants for type safety
 */
export const CONFIG_KEYS = {
  // Ollama
  OLLAMA_MODEL_NAME: "OLLAMA_MODEL_NAME",
  OLLAMA_MODEL_ENABLED: "OLLAMA_MODEL_ENABLED",

  // NIP-90 Devstral DVM
  AI_PROVIDER_DEVSTRAL_DVM_PUBKEY: "AI_PROVIDER_DEVSTRAL_DVM_PUBKEY",
  AI_PROVIDER_DEVSTRAL_RELAYS: "AI_PROVIDER_DEVSTRAL_RELAYS",
  AI_PROVIDER_DEVSTRAL_REQUEST_KIND: "AI_PROVIDER_DEVSTRAL_REQUEST_KIND",
  AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION: "AI_PROVIDER_DEVSTRAL_REQUIRES_ENCRYPTION",
  AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS: "AI_PROVIDER_DEVSTRAL_USE_EPHEMERAL_REQUESTS",
  AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER: "AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER",
  AI_PROVIDER_DEVSTRAL_MODEL_NAME: "AI_PROVIDER_DEVSTRAL_MODEL_NAME",
  AI_PROVIDER_DEVSTRAL_ENABLED: "AI_PROVIDER_DEVSTRAL_ENABLED",

  // User NIP-90
  USER_NIP90_DVM_PUBKEY: "USER_NIP90_DVM_PUBKEY",
  USER_NIP90_RELAYS: "USER_NIP90_RELAYS",
  USER_NIP90_REQUEST_KIND: "USER_NIP90_REQUEST_KIND",
  USER_NIP90_REQUIRES_ENCRYPTION: "USER_NIP90_REQUIRES_ENCRYPTION",
  USER_NIP90_USE_EPHEMERAL_REQUESTS: "USER_NIP90_USE_EPHEMERAL_REQUESTS",
  USER_NIP90_MODEL_IDENTIFIER: "USER_NIP90_MODEL_IDENTIFIER",
  USER_NIP90_NAME: "USER_NIP90_NAME",
  USER_NIP90_ENABLED: "USER_NIP90_ENABLED",

  // Claude Code
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  CLAUDE_CODE_CLI_PATH: "CLAUDE_CODE_CLI_PATH",
  CLAUDE_CODE_PROVIDER_ENABLED: "CLAUDE_CODE_PROVIDER_ENABLED",
  CLAUDE_CODE_DEFAULT_MODEL: "CLAUDE_CODE_DEFAULT_MODEL",
  CLAUDE_CODE_PROVIDER_NAME: "CLAUDE_CODE_PROVIDER_NAME",

  // Database
  DB_DATA_DIR: "DB_DATA_DIR",

  // Kind 5050 DVM
  DVM_5050_ACTIVE: "DVM_5050_ACTIVE",
  DVM_5050_PRIVATE_KEY_HEX: "DVM_5050_PRIVATE_KEY_HEX",
  DVM_5050_SUPPORTED_JOB_KINDS: "DVM_5050_SUPPORTED_JOB_KINDS",
  DVM_5050_RELAYS: "DVM_5050_RELAYS",
  DVM_5050_TEXT_GEN_MODEL: "DVM_5050_TEXT_GEN_MODEL",
  DVM_5050_TEXT_GEN_MAX_TOKENS: "DVM_5050_TEXT_GEN_MAX_TOKENS",
  DVM_5050_TEXT_GEN_TEMPERATURE: "DVM_5050_TEXT_GEN_TEMPERATURE",
  DVM_5050_TEXT_GEN_TOP_K: "DVM_5050_TEXT_GEN_TOP_K",
  DVM_5050_TEXT_GEN_TOP_P: "DVM_5050_TEXT_GEN_TOP_P",
  DVM_5050_TEXT_GEN_FREQUENCY_PENALTY: "DVM_5050_TEXT_GEN_FREQUENCY_PENALTY",
  DVM_5050_TEXT_GEN_MIN_PRICE_SATS: "DVM_5050_TEXT_GEN_MIN_PRICE_SATS",
  DVM_5050_TEXT_GEN_PRICE_PER_1K_TOKENS: "DVM_5050_TEXT_GEN_PRICE_PER_1K_TOKENS",
} as const;