// src/services/ai/core/AIError.ts
/**
 * Base error class for AI-related errors
 * Provides common fields for all AI errors
 */
export class AIGenericError extends Error {
  _tag: string;
  cause?: unknown;
  context?: Record<string, any>;

  constructor(options: {
    message: string;
    cause?: unknown;
    context?: Record<string, any>;
  }) {
    super(options.message);
    this.name = 'AIGenericError';
    this._tag = 'AIGenericError';
    this.cause = options.cause;
    this.context = options.context;
  }
}

/**
 * Error for issues specific to an LLM provider
 * Used for API errors, rate limits, etc. from specific providers
 */
export class AIProviderError extends AIGenericError {
  readonly provider: string;
  readonly isRetryable?: boolean;

  constructor(options: {
    message: string;
    provider: string;
    cause?: unknown;
    context?: Record<string, any>;
    isRetryable?: boolean;
  }) {
    super({
      message: options.message,
      cause: options.cause,
      context: options.context
    });
    this.name = 'AIProviderError';
    this._tag = 'AIProviderError';
    this.provider = options.provider;
    this.isRetryable = options.isRetryable;
  }
}

/**
 * Error for issues with AI service or provider configuration
 * Used for missing API keys, invalid URLs, etc.
 */
export class AIConfigurationError extends AIGenericError {
  
  constructor(options: {
    message: string;
    cause?: unknown;
    context?: Record<string, any>;
  }) {
    super(options);
    this.name = 'AIConfigurationError';
    this._tag = 'AIConfigurationError';
  }
}

/**
 * Error for issues during tool execution
 * Used when an AI-invoked tool fails
 */
export class AIToolExecutionError extends AIGenericError {
  readonly toolName: string;

  constructor(options: {
    message: string;
    toolName: string;
    cause?: unknown;
    context?: Record<string, any>;
  }) {
    super({
      message: options.message,
      cause: options.cause,
      context: options.context
    });
    this.name = 'AIToolExecutionError';
    this._tag = 'AIToolExecutionError';
    this.toolName = options.toolName;
  }
}

/**
 * Error for issues related to context window limits
 * Used when a prompt or conversation exceeds token limits
 */
export class AIContextWindowError extends AIGenericError {
  readonly limit?: number;
  readonly current?: number;

  constructor(options: {
    message: string;
    limit?: number;
    current?: number;
    cause?: unknown;
    context?: Record<string, any>;
  }) {
    super({
      message: options.message,
      cause: options.cause,
      context: options.context
    });
    this.name = 'AIContextWindowError';
    this._tag = 'AIContextWindowError';
    this.limit = options.limit;
    this.current = options.current;
  }
}

/**
 * Error for content policy violations
 * Used when AI content is flagged or rejected by provider
 */
export class AIContentPolicyError extends AIGenericError {
  readonly provider: string;
  readonly flaggedContent?: string;

  constructor(options: {
    message: string;
    provider: string;
    flaggedContent?: string;
    cause?: unknown;
    context?: Record<string, any>;
  }) {
    super({
      message: options.message,
      cause: options.cause,
      context: options.context
    });
    this.name = 'AIContentPolicyError';
    this._tag = 'AIContentPolicyError';
    this.provider = options.provider;
    this.flaggedContent = options.flaggedContent;
  }
}

/**
 * Create a more specific AIProviderError from a generic error
 * Useful for converting provider-specific errors to our error type
 */
export function fromProviderError(
  error: unknown, 
  provider: string, 
  isRetryable = false
): AIProviderError {
  if (error instanceof Error) {
    return new AIProviderError({
      message: error.message,
      provider,
      cause: error,
      isRetryable,
    });
  }
  
  return new AIProviderError({
    message: String(error),
    provider,
    cause: error,
    isRetryable,
  });
}