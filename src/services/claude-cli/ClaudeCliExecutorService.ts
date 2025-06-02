import { Effect, Context, Stream } from "effect";

/**
 * Error type for Claude CLI execution failures
 */
export class ClaudeCliError {
  readonly _tag = "ClaudeCliError";
  
  constructor(
    readonly message: string,
    readonly cause?: unknown,
    readonly isRetryable: boolean = false
  ) {}
}

/**
 * Represents a chunk of streaming output from Claude CLI
 */
export interface ClaudeCliChunk {
  readonly type: "system" | "assistant" | "result" | "content_block_delta" | "raw";
  readonly content?: string;
  readonly delta?: { text: string };
  readonly session_id?: string;
  readonly tools?: string[];
  readonly result?: string;
  readonly cost_usd?: number;
  readonly is_error?: boolean;
  readonly duration_ms?: number;
}

/**
 * Health status of Claude CLI
 */
export interface ClaudeHealthStatus {
  readonly available: boolean;
  readonly authenticated: boolean;
  readonly version?: string;
  readonly claudePath: string;
  readonly error?: string;
}

/**
 * Service for executing Claude CLI commands
 */
export interface ClaudeCliExecutorService {
  readonly _tag: "ClaudeCliExecutorService";
  
  /**
   * Execute a Claude CLI command and return the full response
   */
  execute(args: readonly string[]): Effect.Effect<string, ClaudeCliError>;
  
  /**
   * Execute a Claude CLI command and stream the output
   */
  executeStream(args: readonly string[]): Stream.Stream<ClaudeCliChunk, ClaudeCliError>;
  
  /**
   * Check if Claude CLI is available and authenticated
   */
  checkHealth(): Effect.Effect<ClaudeHealthStatus, ClaudeCliError>;
}

/**
 * Service tag for dependency injection
 */
export const ClaudeCliExecutorService = Context.GenericTag<ClaudeCliExecutorService>("ClaudeCliExecutorService");