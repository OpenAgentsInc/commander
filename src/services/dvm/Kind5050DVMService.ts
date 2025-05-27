import { Context, Effect, Data, Schema, Layer } from "effect";
import { TelemetryService } from "@/services/telemetry";
import { TrackEventError } from "@/services/telemetry/TelemetryService";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { DVM_RELAYS_ARRAY } from "@/services/relays";
import type { JobHistoryEntry, JobStatistics } from "@/types/dvm";
import { OllamaError } from "@/services/ollama";
import { SparkError } from "@/services/spark";
import { NIP04EncryptError, NIP04DecryptError } from "@/services/nip04";
import { ConfigurationService } from "@/services/configuration";
import { CONFIG_KEYS, DEFAULT_CONFIGURATIONS } from "@/services/configuration/defaults";

/**
 * DVM service errors
 */
export class DVMServiceError extends Data.TaggedError("DVMServiceError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}

export class DVMConfigError extends DVMServiceError {}
export class DVMConnectionError extends DVMServiceError {}
export class DVMJobRequestError extends DVMServiceError {}
export class DVMJobProcessingError extends DVMServiceError {}
export class DVMPaymentError extends DVMServiceError {}
export class DVMInvocationError extends DVMServiceError {}

export type DVMError =
  | DVMConfigError
  | DVMConnectionError
  | DVMJobRequestError
  | DVMJobProcessingError
  | DVMPaymentError
  | DVMInvocationError;

/**
 * Default Text Generation Job Configuration
 * Based on NIP-90 parameters described in docs/dvm-kind-5050.md
 */
export interface DefaultTextGenerationJobConfig {
  model: string; // e.g., "LLaMA-2" or a model available via OllamaService
  max_tokens: number; // e.g., 512
  temperature: number; // e.g., 0.5
  top_k: number; // e.g., 50
  top_p: number; // e.g., 0.7
  frequency_penalty: number; // e.g., 1
  // Pricing related
  minPriceSats: number; // Minimum price in satoshis for any job
  pricePer1kTokens: number; // Price per 1000 tokens (input + output) in satoshis
}

/**
 * DVM service configuration
 */
export interface Kind5050DVMServiceConfig {
  active: boolean; // Whether the DVM is active (listening for job requests)
  dvmPrivateKeyHex: string; // DVM's Nostr private key (hex)
  dvmPublicKeyHex: string; // DVM's Nostr public key (hex), derived from privateKey
  relays: string[]; // Relays to listen on and respond to
  supportedJobKinds: number[]; // e.g., [5100] for text generation
  defaultTextGenerationJobConfig: DefaultTextGenerationJobConfig;
}

export const Kind5050DVMServiceConfigTag =
  Context.GenericTag<Kind5050DVMServiceConfig>("Kind5050DVMServiceConfig");

// Export the default configuration values for UI components and tests
// These come from the centralized defaults but are exposed as a constant
// for convenience when not using the Effect layer
const DEV_DVM_PRIVATE_KEY_HEX = DEFAULT_CONFIGURATIONS.kind5050DVM.privateKeyHex;
const devDvmSkBytes = hexToBytes(DEV_DVM_PRIVATE_KEY_HEX);
const devDvmPkHex = getPublicKey(devDvmSkBytes);

export const defaultKind5050DVMServiceConfig: Kind5050DVMServiceConfig = {
  active: false, // From DEFAULT_CONFIGURATIONS.kind5050DVM.active
  dvmPrivateKeyHex: DEV_DVM_PRIVATE_KEY_HEX,
  dvmPublicKeyHex: devDvmPkHex,
  relays: JSON.parse(DEFAULT_CONFIGURATIONS.kind5050DVM.relays),
  supportedJobKinds: JSON.parse(DEFAULT_CONFIGURATIONS.kind5050DVM.supportedJobKinds),
  defaultTextGenerationJobConfig: {
    model: DEFAULT_CONFIGURATIONS.kind5050DVM.textGeneration.model,
    max_tokens: Number(DEFAULT_CONFIGURATIONS.kind5050DVM.textGeneration.maxTokens),
    temperature: Number(DEFAULT_CONFIGURATIONS.kind5050DVM.textGeneration.temperature),
    top_k: Number(DEFAULT_CONFIGURATIONS.kind5050DVM.textGeneration.topK),
    top_p: Number(DEFAULT_CONFIGURATIONS.kind5050DVM.textGeneration.topP),
    frequency_penalty: Number(DEFAULT_CONFIGURATIONS.kind5050DVM.textGeneration.frequencyPenalty),
    minPriceSats: Number(DEFAULT_CONFIGURATIONS.kind5050DVM.textGeneration.minPriceSats),
    pricePer1kTokens: Number(DEFAULT_CONFIGURATIONS.kind5050DVM.textGeneration.pricePer1kTokens),
  },
};

/**
 * Creates a Kind5050DVMServiceConfig from ConfigurationService
 * This ensures all defaults come from the centralized configuration
 */
export const DefaultKind5050DVMServiceConfigLayer = Layer.effect(
  Kind5050DVMServiceConfigTag,
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigurationService);
    const keys = CONFIG_KEYS;
    
    // Fetch all configuration values
    const privateKeyHex = yield* _(configService.get(keys.DVM_5050_PRIVATE_KEY_HEX));
    const publicKeyHex = getPublicKey(hexToBytes(privateKeyHex));
    
    const active = yield* _(configService.get(keys.DVM_5050_ACTIVE)
      .pipe(Effect.map(val => val === "true")));
    
    const supportedJobKinds = yield* _(configService.get(keys.DVM_5050_SUPPORTED_JOB_KINDS)
      .pipe(Effect.map(val => JSON.parse(val) as number[])));
    
    const relays = yield* _(configService.get(keys.DVM_5050_RELAYS)
      .pipe(Effect.map(val => JSON.parse(val) as string[])));
    
    // Text generation config
    const textGenConfig: DefaultTextGenerationJobConfig = {
      model: yield* _(configService.get(keys.DVM_5050_TEXT_GEN_MODEL)),
      max_tokens: yield* _(configService.get(keys.DVM_5050_TEXT_GEN_MAX_TOKENS)
        .pipe(Effect.map(Number))),
      temperature: yield* _(configService.get(keys.DVM_5050_TEXT_GEN_TEMPERATURE)
        .pipe(Effect.map(Number))),
      top_k: yield* _(configService.get(keys.DVM_5050_TEXT_GEN_TOP_K)
        .pipe(Effect.map(Number))),
      top_p: yield* _(configService.get(keys.DVM_5050_TEXT_GEN_TOP_P)
        .pipe(Effect.map(Number))),
      frequency_penalty: yield* _(configService.get(keys.DVM_5050_TEXT_GEN_FREQUENCY_PENALTY)
        .pipe(Effect.map(Number))),
      minPriceSats: yield* _(configService.get(keys.DVM_5050_TEXT_GEN_MIN_PRICE_SATS)
        .pipe(Effect.map(Number))),
      pricePer1kTokens: yield* _(configService.get(keys.DVM_5050_TEXT_GEN_PRICE_PER_1K_TOKENS)
        .pipe(Effect.map(Number))),
    };
    
    const config: Kind5050DVMServiceConfig = {
      active,
      dvmPrivateKeyHex: privateKeyHex,
      dvmPublicKeyHex: publicKeyHex,
      relays,
      supportedJobKinds,
      defaultTextGenerationJobConfig: textGenConfig,
    };
    
    return config;
  })
);

/**
 * Interface for the Kind5050DVMService (Data Vending Machine Service)
 * This service handles NIP-90 kind 5050 job requests for selling compute
 */
export interface Kind5050DVMService {
  /**
   * Starts listening for kind 5050 job requests on connected relays
   */
  startListening(): Effect.Effect<void, DVMError | TrackEventError, never>;

  /**
   * Stops listening for kind 5050 job requests
   */
  stopListening(): Effect.Effect<void, DVMError | TrackEventError, never>;

  /**
   * Returns the current listening status
   */
  isListening(): Effect.Effect<boolean, DVMError | TrackEventError, never>;

  /**
   * Processes a local test job without involving Nostr network
   * This method is used for testing the DVM functionality locally
   *
   * @param prompt The text prompt to process
   * @param requesterPkOverride Optional: simulates a request from a specific pubkey
   * @returns The processed job result text or error
   */
  processLocalTestJob(
    prompt: string,
    requesterPkOverride?: string,
  ): Effect.Effect<
    string,
    DVMError | OllamaError | SparkError | NIP04EncryptError | NIP04DecryptError
  >;

  /**
   * Retrieves job history entries with pagination and optional filtering
   * @param options Pagination and filtering options
   * @returns A list of job history entries and total count
   */
  getJobHistory(options: {
    page: number;
    pageSize: number;
    filters?: Partial<JobHistoryEntry>;
  }): Effect.Effect<
    { entries: JobHistoryEntry[]; totalCount: number },
    DVMError | TrackEventError,
    never
  >;

  /**
   * Retrieves aggregated job statistics
   * @returns Statistics about processed jobs, revenue, etc.
   */
  getJobStatistics(): Effect.Effect<
    JobStatistics,
    DVMError | TrackEventError,
    never
  >;
}

export const Kind5050DVMService =
  Context.GenericTag<Kind5050DVMService>("Kind5050DVMService");
