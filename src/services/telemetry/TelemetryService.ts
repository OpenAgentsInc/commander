import { Effect, Context, Data, Schema, Layer } from "effect";

// --- Event Schema ---
export const TelemetryEventSchema = Schema.Struct({
  category: Schema.String,
  action: Schema.String,
  value: Schema.optional(
    Schema.Union(
      Schema.String,
      Schema.Number,
      Schema.Boolean,
      Schema.Undefined,
    ),
  ),
  label: Schema.optional(Schema.String),
  timestamp: Schema.optional(Schema.Number),
  context: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown,
    }),
  ),
});

export type TelemetryEvent = Schema.Schema.Type<typeof TelemetryEventSchema>;

// --- Telemetry Configuration ---
export interface TelemetryServiceConfig {
  enabled: boolean;
  logToConsole: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

export const TelemetryServiceConfigTag =
  Context.GenericTag<TelemetryServiceConfig>("TelemetryServiceConfig");

// Default configuration layer
export const DefaultTelemetryConfigLayer = Layer.succeed(
  TelemetryServiceConfigTag,
  {
    enabled: true,
    logToConsole: true,
    logLevel: "info",
  },
);

// --- Custom Error Types ---
export class TelemetryError extends Data.TaggedError("TelemetryError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}

export class TrackEventError extends Data.TaggedError("TrackEventError")<{
  readonly cause?: unknown;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}> {}

// --- Service Interface ---
export interface TelemetryService {
  /**
   * Track a telemetry event
   * @param event The event to track
   * @returns Effect with void on success or an error
   */
  trackEvent(event: TelemetryEvent): Effect.Effect<void, TrackEventError>;

  /**
   * Check if telemetry is enabled
   * @returns Effect with boolean indicating if telemetry is enabled
   */
  isEnabled(): Effect.Effect<boolean, TelemetryError>;

  /**
   * Enable or disable telemetry
   * @param enabled Whether to enable or disable telemetry
   * @returns Effect with void on success or an error
   */
  setEnabled(enabled: boolean): Effect.Effect<void, TelemetryError>;
}

// --- Service Tag ---
export const TelemetryService =
  Context.GenericTag<TelemetryService>("TelemetryService");
