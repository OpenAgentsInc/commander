import { Context, Effect, Data, Schema } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { TrackEventError } from '@/services/telemetry/TelemetryService';

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
 * DVM service configuration
 */
export interface Kind5050DVMServiceConfig {
  active: boolean; // Whether the DVM is active (listening for job requests)
  privateKey?: string; // Nostr private key for the DVM
  relays: string[]; // Relays to listen on and respond to
  defaultJobConfig: {
    model: string; // Default Ollama model to use
    minPriceSats: number; // Minimum price in satoshis
    maxPriceSats: number; // Maximum price in satoshis
    pricePerToken: number; // Price per token in satoshis
  };
}

export const Kind5050DVMServiceConfigTag = Context.GenericTag<Kind5050DVMServiceConfig>("Kind5050DVMServiceConfig");

// Default configuration for development
export const DefaultKind5050DVMServiceConfigLayer = Effect.succeed(Kind5050DVMServiceConfigTag).pipe(
  Effect.map(() => ({
    active: false, // Start inactive by default
    relays: ["wss://relay.damus.io", "wss://relay.nostr.band"],
    defaultJobConfig: {
      model: "gemma2:1b",
      minPriceSats: 10,
      maxPriceSats: 1000,
      pricePerToken: 0.1
    }
  }))
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
}

export const Kind5050DVMService = Context.GenericTag<Kind5050DVMService>("Kind5050DVMService");