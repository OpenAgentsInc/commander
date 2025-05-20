// src/services/nip90/NIP90Service.ts
import { Effect, Context, Data, Schema, Option } from "effect";
import type { NostrEvent, NostrFilter, Subscription, NostrPublishError, NostrRequestError } from '@/services/nostr';
import type { NIP04EncryptError, NIP04DecryptError } from '@/services/nip04';

// --- Custom Error Types ---
export class NIP90ServiceError extends Data.TaggedError("NIP90ServiceError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}

export class NIP90RequestError extends Data.TaggedError("NIP90RequestError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}

export class NIP90ResultError extends Data.TaggedError("NIP90ResultError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}

export class NIP90ValidationError extends Data.TaggedError("NIP90ValidationError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}

// --- Schemas and Types ---
export const NIP90InputTypeSchema = Schema.Union(
  Schema.Literal("url"),
  Schema.Literal("event"),
  Schema.Literal("job"),
  Schema.Literal("text")
);
export type NIP90InputType = Schema.Schema.Type<typeof NIP90InputTypeSchema>;

export const NIP90InputSchema = Schema.Tuple([
  Schema.String,
  NIP90InputTypeSchema,
  Schema.optional(Schema.String),
  Schema.optional(Schema.String)
]);
export type NIP90Input = Schema.Schema.Type<typeof NIP90InputSchema>;

export const NIP90JobParamSchema = Schema.Tuple([
  Schema.Literal("param"),
  Schema.String,
  Schema.String
]);
export type NIP90JobParam = Schema.Schema.Type<typeof NIP90JobParamSchema>;

export const CreateNIP90JobParamsSchema = Schema.Struct({
  kind: Schema.Number.pipe(Schema.filter(k => k >= 5000 && k <= 5999, { message: () => "Kind must be between 5000-5999" })),
  inputs: Schema.Array(NIP90InputSchema),
  outputMimeType: Schema.optional(Schema.String),
  additionalParams: Schema.optional(Schema.Array(NIP90JobParamSchema)),
  bidMillisats: Schema.optional(Schema.Number),
  targetDvmPubkeyHex: Schema.optional(Schema.String), // For encrypted requests to a specific DVM
  requesterSk: Schema.instanceOf(Uint8Array), // Customer's secret key (can be ephemeral)
  relays: Schema.optional(Schema.Array(Schema.String)) // Relays to publish the request to
});
export type CreateNIP90JobParams = Schema.Schema.Type<typeof CreateNIP90JobParamsSchema>;

export const NIP90JobResultSchema = Schema.Struct({
  id: Schema.String,
  pubkey: Schema.String,
  created_at: Schema.Number,
  kind: Schema.Number.pipe(Schema.filter(k => k >= 6000 && k <= 6999)),
  tags: Schema.Array(Schema.Array(Schema.String)),
  content: Schema.String, // This might be JSON or other data, possibly encrypted
  sig: Schema.String,
  // Parsed fields for convenience
  parsedRequest: Schema.optional(Schema.Any), // Will hold the parsed JSON from 'request' tag
  paymentAmount: Schema.optional(Schema.Number),
  paymentInvoice: Schema.optional(Schema.String),
  isEncrypted: Schema.optional(Schema.Boolean)
});
export type NIP90JobResult = Schema.Schema.Type<typeof NIP90JobResultSchema>;

export const NIP90JobFeedbackStatusSchema = Schema.Union(
  Schema.Literal("payment-required"),
  Schema.Literal("processing"),
  Schema.Literal("error"),
  Schema.Literal("success"),
  Schema.Literal("partial")
);
export type NIP90JobFeedbackStatus = Schema.Schema.Type<typeof NIP90JobFeedbackStatusSchema>;

// We need to define a separate schema for feedback rather than extending the result schema
// because the kind constraints conflict (kind 6000-6999 vs kind 7000)
export const NIP90JobFeedbackSchema = Schema.Struct({
  id: Schema.String,
  pubkey: Schema.String,
  created_at: Schema.Number,
  kind: Schema.Literal(7000),
  tags: Schema.Array(Schema.Array(Schema.String)),
  content: Schema.String,
  sig: Schema.String,
  // Parsed fields for convenience
  parsedRequest: Schema.optional(Schema.Any),
  paymentAmount: Schema.optional(Schema.Number),
  paymentInvoice: Schema.optional(Schema.String),
  isEncrypted: Schema.optional(Schema.Boolean),
  // Feedback-specific fields
  status: Schema.optional(NIP90JobFeedbackStatusSchema),
  statusExtraInfo: Schema.optional(Schema.String)
});
export type NIP90JobFeedback = Schema.Schema.Type<typeof NIP90JobFeedbackSchema>;

// --- Service Interface ---
export interface NIP90Service {
  /**
   * Creates and publishes a NIP-90 job request event.
   * If targetDvmPubkeyHex is provided, the request will be encrypted.
   * 
   * @param params Parameters for creating the job request
   * @returns Effect with the published NostrEvent
   */
  createJobRequest(
    params: CreateNIP90JobParams
  ): Effect.Effect<NostrEvent, NIP90RequestError | NIP04EncryptError | NostrPublishError | NIP90ValidationError, TelemetryService | NostrService | NIP04Service>;

  /**
   * Fetches and optionally decrypts a job result for a specific job request ID.
   * 
   * @param jobRequestEventId The ID of the job request event
   * @param dvmPubkeyHex Optional DVM public key to filter results
   * @param decryptionKey Optional key to decrypt results if encrypted
   * @returns Effect with the job result or null if not found
   */
  getJobResult(
    jobRequestEventId: string,
    dvmPubkeyHex?: string, // DVM who might have responded
    decryptionKey?: Uint8Array // Key to decrypt result if it's encrypted
  ): Effect.Effect<NIP90JobResult | null, NIP90ResultError | NIP04DecryptError, TelemetryService | NostrService | NIP04Service>;

  /**
   * Fetches and optionally decrypts all feedback events for a given job request.
   * 
   * @param jobRequestEventId The ID of the job request event
   * @param dvmPubkeyHex Optional DVM public key to filter feedback
   * @param decryptionKey Optional key to decrypt feedback if encrypted
   * @returns Effect with array of feedback events
   */
  listJobFeedback(
    jobRequestEventId: string,
    dvmPubkeyHex?: string,
    decryptionKey?: Uint8Array
  ): Effect.Effect<NIP90JobFeedback[], NIP90ResultError | NIP04DecryptError, TelemetryService | NostrService | NIP04Service>;

  /**
   * Subscribes to updates (results and feedback) for a specific job request.
   * 
   * @param jobRequestEventId The ID of the job request event
   * @param dvmPubkeyHex DVM public key to filter updates
   * @param decryptionKey Key to decrypt updates if encrypted
   * @param onUpdate Callback function for updates
   * @returns Effect with subscription object
   */
  subscribeToJobUpdates(
    jobRequestEventId: string,
    dvmPubkeyHex: string,
    decryptionKey: Uint8Array,
    onUpdate: (event: NIP90JobResult | NIP90JobFeedback) => void
  ): Effect.Effect<Subscription, NostrRequestError | NIP04DecryptError, TelemetryService | NostrService | NIP04Service>;
}

// --- Service Tag ---
export const NIP90Service = Context.GenericTag<NIP90Service>("NIP90Service");