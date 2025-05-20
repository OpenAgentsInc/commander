import { Context, Effect, Data, Schema, Layer } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { TrackEventError } from '@/services/telemetry/TelemetryService';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex } from '@noble/hashes/utils';
import type { JobHistoryEntry, JobStatistics } from '@/types/dvm';

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
  model: string;               // e.g., "LLaMA-2" or a model available via OllamaService
  max_tokens: number;          // e.g., 512
  temperature: number;         // e.g., 0.5
  top_k: number;               // e.g., 50
  top_p: number;               // e.g., 0.7
  frequency_penalty: number;   // e.g., 1
  // Pricing related
  minPriceSats: number;        // Minimum price in satoshis for any job
  pricePer1kTokens: number;    // Price per 1000 tokens (input + output) in satoshis
}

/**
 * DVM service configuration
 */
export interface Kind5050DVMServiceConfig {
  active: boolean;                             // Whether the DVM is active (listening for job requests)
  dvmPrivateKeyHex: string;                    // DVM's Nostr private key (hex)
  dvmPublicKeyHex: string;                     // DVM's Nostr public key (hex), derived from privateKey
  relays: string[];                            // Relays to listen on and respond to
  supportedJobKinds: number[];                 // e.g., [5100] for text generation
  defaultTextGenerationJobConfig: DefaultTextGenerationJobConfig;
}

export const Kind5050DVMServiceConfigTag = Context.GenericTag<Kind5050DVMServiceConfig>("Kind5050DVMServiceConfig");

// Generate a default development keypair
const devDvmSkBytes = generateSecretKey();
const devDvmSkHex = bytesToHex(devDvmSkBytes);
const devDvmPkHex = getPublicKey(devDvmSkBytes);

// Default configuration for development
export const DefaultKind5050DVMServiceConfigLayer = Layer.succeed(
  Kind5050DVMServiceConfigTag,
  {
    active: false,                // Start inactive by default
    dvmPrivateKeyHex: devDvmSkHex, // Use a default development SK
    dvmPublicKeyHex: devDvmPkHex,  // Corresponding PK
    relays: ["wss://relay.damus.io", "wss://relay.nostr.band", "wss://nos.lol"],
    supportedJobKinds: [5100],    // Support text generation (kind 5100)
    defaultTextGenerationJobConfig: {
      model: "gemma2:latest",     // Default model for Ollama
      max_tokens: 512,
      temperature: 0.7,
      top_k: 40,
      top_p: 0.9,
      frequency_penalty: 0.5,
      minPriceSats: 10,           // Minimum sats for any job
      pricePer1kTokens: 2         // e.g., 2 sats per 1000 tokens
    }
  }
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
   * Retrieves job history entries with pagination and optional filtering
   * @param options Pagination and filtering options
   * @returns A list of job history entries and total count
   */
  getJobHistory(options: { 
    page: number; 
    pageSize: number; 
    filters?: Partial<JobHistoryEntry> 
  }): Effect.Effect<
    { entries: JobHistoryEntry[]; totalCount: number }, 
    DVMError | TrackEventError, 
    never
  >;

  /**
   * Retrieves aggregated job statistics
   * @returns Statistics about processed jobs, revenue, etc.
   */
  getJobStatistics(): Effect.Effect<JobStatistics, DVMError | TrackEventError, never>;
}

export const Kind5050DVMService = Context.GenericTag<Kind5050DVMService>("Kind5050DVMService");