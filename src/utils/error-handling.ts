import { Effect, Console } from "effect";
import { TelemetryService } from "@/services/telemetry";
import { toast } from "sonner";

/**
 * Maps error types to user-friendly messages
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  // AI Errors
  "AiProviderError": "Failed to communicate with AI service. Please try again.",
  "AiConfigurationError": "AI service is not configured properly. Please check settings.",
  "AiContextWindowError": "Message is too long. Please shorten and try again.",
  "AiContentPolicyError": "Content was flagged by the AI service. Please rephrase.",
  "AiToolExecutionError": "Failed to execute AI tool. Please try again.",
  
  // Nostr Errors
  "NostrConnectionError": "Failed to connect to Nostr relay. Please check your connection.",
  "NostrPublishError": "Failed to publish to Nostr. Please try again.",
  "NostrSubscriptionError": "Failed to subscribe to events. Please try again.",
  
  // Database Errors
  "DatabaseConnectionError": "Failed to connect to database. Please restart the app.",
  "DatabaseQueryError": "Database operation failed. Please try again.",
  
  // NIP Errors
  "NIP04EncryptError": "Failed to encrypt message. Please check your keys.",
  "NIP04DecryptError": "Failed to decrypt message. The message may be corrupted.",
  "NIP19InvalidInput": "Invalid Nostr identifier format.",
  "NIP28InvalidInputError": "Invalid channel input. Please check your data.",
  
  // Spark/Lightning Errors
  "SparkInitError": "Failed to initialize wallet. Please check your seed phrase.",
  "SparkBalanceError": "Failed to fetch balance. Please try again.",
  "SparkInvoiceError": "Failed to create invoice. Please try again.",
  "SparkPaymentError": "Payment failed. Please check your balance.",
  
  // Configuration Errors
  "ConfigurationNotFoundError": "Configuration not found. Using default values.",
  "ConfigurationSetError": "Failed to save configuration. Please try again.",
  
  // Generic fallback
  "Error": "An unexpected error occurred. Please try again."
};

/**
 * Error context for debugging and telemetry
 */
export interface ErrorContext {
  operation: string;
  category: string;
  metadata?: Record<string, any>;
}

/**
 * Get user-friendly error message for an error
 */
export const getUserFriendlyMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && '_tag' in error) {
    const errorTag = (error as any)._tag;
    return ERROR_MESSAGE_MAP[errorTag] || ERROR_MESSAGE_MAP["Error"];
  }
  
  if (error instanceof Error) {
    // Check if it matches any known error patterns
    for (const [key, message] of Object.entries(ERROR_MESSAGE_MAP)) {
      if (error.constructor.name === key || error.message.includes(key)) {
        return message;
      }
    }
  }
  
  return ERROR_MESSAGE_MAP["Error"];
};

/**
 * Extract error details for logging/debugging
 */
export const getErrorDetails = (error: unknown): Record<string, any> => {
  const details: Record<string, any> = {
    timestamp: new Date().toISOString()
  };
  
  if (typeof error === 'object' && error !== null) {
    if ('_tag' in error) {
      details.type = (error as any)._tag;
    }
    if ('message' in error) {
      details.message = (error as any).message;
    }
    if ('cause' in error) {
      details.cause = String((error as any).cause);
    }
    if ('context' in error) {
      details.context = (error as any).context;
    }
    if ('stack' in error) {
      details.stack = (error as any).stack;
    }
  } else {
    details.message = String(error);
  }
  
  return details;
};

/**
 * Report error with telemetry and optional user notification
 */
export const reportError = (
  error: unknown,
  context: ErrorContext,
  options?: {
    showToast?: boolean;
    toastMessage?: string;
    logToConsole?: boolean;
  }
) => Effect.gen(function* (_) {
  const telemetry = yield* _(TelemetryService);
  const errorDetails = getErrorDetails(error);
  
  // Track error in telemetry
  yield* _(telemetry.trackEvent({
    category: `error_${context.category}`,
    action: context.operation,
    label: errorDetails.type || "unknown_error",
    value: 1,
    metadata: {
      ...errorDetails,
      ...context.metadata
    }
  }));
  
  // Log to console if requested
  if (options?.logToConsole !== false) {
    yield* _(Console.error(`[${context.category}] ${context.operation} failed:`, errorDetails));
  }
  
  // Show toast notification if requested
  if (options?.showToast) {
    const message = options.toastMessage || getUserFriendlyMessage(error);
    yield* _(Effect.sync(() => toast.error(message)));
  }
});

/**
 * Wrap an Effect with error reporting
 */
export const withErrorReporting = <R, E, A>(
  effect: Effect.Effect<A, E, R>,
  context: ErrorContext,
  options?: {
    showToast?: boolean;
    toastMessage?: string;
    logToConsole?: boolean;
  }
) => 
  effect.pipe(
    Effect.tapError((error) => 
      reportError(error, context, options).pipe(
        Effect.catchAll(() => Effect.void) // Don't fail if error reporting fails
      )
    )
  );

/**
 * Create a user-friendly error handler for UI components
 */
export const createErrorHandler = (
  context: ErrorContext,
  options?: {
    showToast?: boolean;
    customMessages?: Record<string, string>;
  }
) => (error: unknown) => {
  const runtime = window.effectRuntime;
  if (!runtime) {
    console.error("Effect runtime not available for error reporting", error);
    return;
  }
  
  Effect.runFork(
    reportError(error, context, {
      showToast: options?.showToast,
      toastMessage: options?.customMessages?.[getErrorDetails(error).type || ""] || undefined
    }),
    runtime
  );
};

/**
 * Helper to wrap async operations with error handling
 */
export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  options?: {
    showToast?: boolean;
    fallbackValue?: T;
  }
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (error) {
    createErrorHandler(context, options)(error);
    return options?.fallbackValue;
  }
};