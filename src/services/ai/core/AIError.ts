// src/services/ai/core/AiError.ts
import { Data } from "effect";

/**
 * Base error type for AI-related operations
 */
export class AiError extends Data.TaggedError("AiError")<{
  message: string;
  cause?: unknown;
  context?: Record<string, any>;
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
export class AiProviderError extends Data.TaggedError("AiProviderError")<{
  message: string;
  cause?: unknown;
  isRetryable: boolean;
  provider: string;
  context?: Record<string, any>;
}> { }

/**
 * Configuration-related error type
 */
export class AiConfigurationError extends Data.TaggedError("AiConfigurationError")<{
  message: string;
  cause?: unknown;
  context?: Record<string, any>;
}> { }

/**
 * Maps an error to a provider-specific error
 */
export const mapToAiProviderError = (
  error: unknown,
  providerName: string,
  modelName: string,
  isRetryable = false
): AiProviderError => {
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

  return new AiProviderError({
    message: `Provider error for model ${modelName} (${providerName}): ${messageContent}`,
    provider: providerName,
    cause: causeContent,
    isRetryable,
    context: { model: modelName, originalError: String(error) }
  });
};

/**
 * Error for issues during tool execution
 * Used when an AI-invoked tool fails
 */
export class AiToolExecutionError extends Data.TaggedError("AiToolExecutionError")<{
  message: string;
  toolName: string;
  cause?: unknown;
  context?: Record<string, any>;
}> { }

/**
 * Error for issues related to context window limits
 * Used when a prompt or conversation exceeds token limits
 */
export class AiContextWindowError extends Data.TaggedError("AiContextWindowError")<{
  message: string;
  limit?: number;
  current?: number;
  cause?: unknown;
  context?: Record<string, any>;
}> { }

/**
 * Error for content policy violations
 * Used when AI content is flagged or rejected by provider
 */
export class AiContentPolicyError extends Data.TaggedError("AiContentPolicyError")<{
  message: string;
  provider: string;
  flaggedContent?: string;
  cause?: unknown;
  context?: Record<string, any>;
}> { }