// src/services/ai/core/AIError.ts
import { Data } from "effect";

/**
 * Base error type for AI-related operations
 */
export class AiError extends Data.TaggedError("AiError")<{
  message: string;
  cause?: unknown;
}> { }

/**
 * Maps any error to an AiError
 */
export const mapErrorToAiError = (error: unknown): AiError => {
  if (error instanceof AiError) return error;

  if (error instanceof Error) {
    return new AiError({
      message: error.message,
      cause: error
    });
  }

  return new AiError({
    message: String(error)
  });
};

/**
 * Provider-specific error type
 */
export class AIProviderError extends Data.TaggedError("AIProviderError")<{
  message: string;
  cause?: unknown;
  isRetryable: boolean;
}> { }

/**
 * Configuration-related error type
 */
export class AIConfigurationError extends Data.TaggedError("AIConfigurationError")<{
  message: string;
  cause?: unknown;
}> { }

/**
 * Maps an error to a provider-specific error
 */
export const mapToAIProviderError = (
  error: unknown,
  contextAction: string,
  modelName: string,
  isRetryable = false
): AIProviderError => {
  let messageContent = "Unknown provider error";
  let causeContent: unknown = error;

  if (typeof error === 'object' && error !== null) {
    if ('_tag' in error && (error as any)._tag === "ResponseError") {
      const responseError = error as any;
      messageContent = `HTTP error ${responseError.response?.status}: ${responseError.response?.body || responseError.message || String(error)}`;
      causeContent = responseError.cause || error;
    } else if (error instanceof Error) {
      messageContent = error.message;
      causeContent = error.cause || error;
    } else {
      messageContent = String(error);
    }
  } else {
    messageContent = String(error);
  }

  return new AIProviderError({
    message: `Provider ${contextAction} error for model ${modelName}: ${messageContent}`,
    cause: causeContent,
    isRetryable
  });
};

/**
 * Error for issues with AI service or provider configuration
 * Used for missing API keys, invalid URLs, etc.
 */
export class AIConfigurationError extends AiError {
  constructor(options: {
    message: string;
    cause?: unknown;
  }) {
    super(options);
    this.name = "AIConfigurationError";
  }
}

/**
 * Error for issues during tool execution
 * Used when an AI-invoked tool fails
 */
export class AIToolExecutionError extends AiError {
  readonly toolName: string;

  constructor(options: {
    message: string;
    toolName: string;
    cause?: unknown;
  }) {
    super(options);
    this.name = "AIToolExecutionError";
    this.toolName = options.toolName;
  }
}

/**
 * Error for issues related to context window limits
 * Used when a prompt or conversation exceeds token limits
 */
export class AIContextWindowError extends AiError {
  readonly limit?: number;
  readonly current?: number;

  constructor(options: {
    message: string;
    limit?: number;
    current?: number;
    cause?: unknown;
  }) {
    super(options);
    this.name = "AIContextWindowError";
    this.limit = options.limit;
    this.current = options.current;
  }
}

/**
 * Error for content policy violations
 * Used when AI content is flagged or rejected by provider
 */
export class AIContentPolicyError extends AiError {
  readonly provider: string;
  readonly flaggedContent?: string;

  constructor(options: {
    message: string;
    provider: string;
    flaggedContent?: string;
    cause?: unknown;
  }) {
    super(options);
    this.name = "AIContentPolicyError";
    this.provider = options.provider;
    this.flaggedContent = options.flaggedContent;
  }
}
