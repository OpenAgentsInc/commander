import { Context, Data, Effect, Schema, Layer } from "effect";
import { TelemetryService } from "@/services/telemetry";
import { TrackEventError } from "@/services/telemetry/TelemetryService";

/**
 * Spark service error types
 */
export class SparkServiceError extends Data.TaggedError("SparkServiceError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}

export class SparkConfigError extends SparkServiceError {}
export class SparkConnectionError extends SparkServiceError {}
export class SparkAuthenticationError extends SparkServiceError {}
export class SparkLightningError extends SparkServiceError {}
export class SparkTransactionError extends SparkServiceError {}
export class SparkBalanceError extends SparkServiceError {}
export class SparkValidationError extends SparkServiceError {}
export class SparkRPCError extends SparkServiceError {}
export class SparkNotImplementedError extends SparkServiceError {}

/**
 * Union type of all possible SparkService errors
 */
export type SparkError =
  | SparkConfigError
  | SparkConnectionError
  | SparkAuthenticationError
  | SparkLightningError
  | SparkTransactionError
  | SparkBalanceError
  | SparkValidationError
  | SparkRPCError
  | SparkNotImplementedError;

/**
 * Spark service configuration
 */
export interface SparkServiceConfig {
  network: "REGTEST" | "MAINNET" | "LOCAL";
  mnemonicOrSeed?: string | Uint8Array;
  /**
   * The account number to use for Spark wallet initialization.
   * IMPORTANT: Must be 2 or higher. Values 0 and 1 are not allowed by the SDK and
   * will cause a ValidationError when initializing the wallet.
   */
  accountNumber?: number;
  sparkSdkOptions?: Record<string, unknown>; // Will refine based on actual SDK types
}

export const SparkServiceConfigTag =
  Context.GenericTag<SparkServiceConfig>("SparkServiceConfig");

// Default configuration for development environments
export const DefaultSparkServiceConfigLayer = Layer.succeed(
  SparkServiceConfigTag,
  {
    network: "MAINNET",
    mnemonicOrSeed:
      "test test test test test test test test test test test junk", // Development only
    accountNumber: 2, // Must be ≥ 2 per SDK validation
    sparkSdkOptions: {
      // The SDK will use its built-in MAINNET endpoints when these are not specified
      // grpcUrl: "http://localhost:8080",  // Uncomment for local development
      // authToken: "dev_token",             // Uncomment for local development
    },
  },
);

/**
 * Lightning invoice creation parameters
 */
export const CreateLightningInvoiceParamsSchema = Schema.Struct({
  amountSats: Schema.Number,
  memo: Schema.optional(Schema.String),
  expirySeconds: Schema.optional(Schema.Number),
});
export type CreateLightningInvoiceParams = Schema.Schema.Type<
  typeof CreateLightningInvoiceParamsSchema
>;

/**
 * Lightning invoice payment parameters
 */
export const PayLightningInvoiceParamsSchema = Schema.Struct({
  invoice: Schema.String,
  maxFeeSats: Schema.Number,
  timeoutSeconds: Schema.optional(Schema.Number),
});
export type PayLightningInvoiceParams = Schema.Schema.Type<
  typeof PayLightningInvoiceParamsSchema
>;

/**
 * Balance information returned by the Spark SDK
 */
export interface BalanceInfo {
  balance: bigint;
  tokenBalances: Map<
    string,
    {
      balance: bigint;
      tokenInfo: {
        tokenId: string;
        name: string;
        symbol: string;
        decimals: number;
      };
    }
  >;
}

/**
 * Lightning invoice result type
 */
export interface LightningInvoice {
  invoice: {
    encodedInvoice: string;
    paymentHash: string;
    amountSats: number;
    createdAt: number;
    expiresAt: number;
    memo?: string;
  };
}

/**
 * Lightning payment result type
 */
export interface LightningPayment {
  payment: {
    id: string;
    paymentHash: string;
    amountSats: number;
    feeSats: number;
    createdAt: number;
    status: "SUCCESS" | "FAILED" | "PENDING";
    destination?: string;
  };
}

/**
 * Spark service interface
 */
export interface SparkService {
  createLightningInvoice(
    params: CreateLightningInvoiceParams,
  ): Effect.Effect<LightningInvoice, SparkError | TrackEventError, never>;

  payLightningInvoice(
    params: PayLightningInvoiceParams,
  ): Effect.Effect<LightningPayment, SparkError | TrackEventError, never>;

  getBalance(): Effect.Effect<BalanceInfo, SparkError | TrackEventError, never>;

  getSingleUseDepositAddress(): Effect.Effect<
    string,
    SparkError | TrackEventError,
    never
  >;

  /**
   * Checks if the wallet is initialized and connected.
   * Returns true if the wallet is connected and ready to use, false otherwise.
   */
  checkWalletStatus(): Effect.Effect<
    boolean,
    SparkError | TrackEventError,
    never
  >;

  /**
   * Checks the status of a Lightning invoice by its BOLT11 string.
   * @param invoiceBolt11 The BOLT11 encoded invoice string
   * @returns An Effect with the invoice status ('pending', 'paid', 'expired', or 'error')
   *          and optionally the amount paid in millisatoshis if paid
   */
  checkInvoiceStatus(
    invoiceBolt11: string,
  ): Effect.Effect<
    {
      status: "pending" | "paid" | "expired" | "error";
      amountPaidMsats?: number;
    },
    SparkError | TrackEventError,
    never
  >;

  // Additional methods could be added based on Spark SDK capabilities
}

export const SparkService = Context.GenericTag<SparkService>("SparkService");
