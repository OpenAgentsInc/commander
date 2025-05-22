import { Data, Effect, Option, Context } from "effect";
import { AiError } from "./AiError";

/**
 * TypeId for AiResponse
 */
export const TypeId: unique symbol = Symbol.for("@commander/AiResponse");
export type TypeId = typeof TypeId;

/**
 * Represents the reason why a model finished generation of a response.
 */
export type FinishReason = "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other" | "unknown";

/**
 * Base response type for AI-related operations
 */
export class AiResponse extends Data.TaggedClass("AiResponse")<{
  text: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  metadata?: {
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}> {
  /**
   * TypeId for AiResponse
   */
  readonly [TypeId]: TypeId = TypeId;

  /**
   * Returns the finish reason for the response, or "unknown" if not provided
   */
  get finishReason(): FinishReason {
    return "unknown";
  }

  /**
   * Attempts to retrieve provider-specific response metadata
   */
  getProviderMetadata<I, S>(tag: Context.Tag<I, S>): Option.Option<S> {
    return Option.none();
  }

  /**
   * Get the parts of the response (compatibility with @effect/ai)
   */
  get parts(): ReadonlyArray<any> {
    return [{
      _tag: "TextPart",
      text: this.text
    }, {
      _tag: "FinishPart",
      reason: this.finishReason,
      usage: {
        inputTokens: this.metadata?.usage?.promptTokens || 0,
        outputTokens: this.metadata?.usage?.completionTokens || 0,
        totalTokens: this.metadata?.usage?.totalTokens || 0,
        reasoningTokens: 0,
        cacheReadInputTokens: 0,
        cacheWriteInputTokens: 0
      }
    }];
  }

  /**
   * Adds tool calls to the response
   */
  withToolCallsJson(toolCalls: Iterable<{
    readonly id: string;
    readonly name: string;
    readonly params: string;
  }>): Effect.Effect<AiResponse, AiError> {
    try {
      const toolCallsArray = Array.from(toolCalls).map(call => ({
        id: call.id,
        name: call.name,
        arguments: JSON.parse(call.params)
      }));
      
      return Effect.succeed(new AiResponse({
        ...this,
        toolCalls: [...(this.toolCalls || []), ...toolCallsArray]
      }));
    } catch (error) {
      return Effect.fail(new AiError({
        message: `Failed to parse tool call arguments: ${error instanceof Error ? error.message : String(error)}`,
        cause: error
      }));
    }
  }

  /**
   * Adds tool calls with already parsed arguments to the response
   */
  withToolCallsUnknown(toolCalls: Iterable<{
    readonly id: string;
    readonly name: string;
    readonly params: unknown;
  }>): Effect.Effect<AiResponse, AiError> {
    try {
      const toolCallsArray = Array.from(toolCalls).map(call => ({
        id: call.id,
        name: call.name,
        arguments: call.params as Record<string, unknown>
      }));
      
      return Effect.succeed(new AiResponse({
        ...this,
        toolCalls: [...(this.toolCalls || []), ...toolCallsArray]
      }));
    } catch (error) {
      return Effect.fail(new AiError({
        message: `Failed to add tool calls: ${error instanceof Error ? error.message : String(error)}`,
        cause: error
      }));
    }
  }

  /**
   * Adds function call to the response (compatibility with @effect/ai)
   */
  withFunctionCallJson(): Effect.Effect<AiResponse> {
    return Effect.succeed(this);
  }

  /**
   * Adds function call to the response (compatibility with @effect/ai)
   */
  withFunctionCallUnknown(): Effect.Effect<AiResponse> {
    return Effect.succeed(this);
  }

  /**
   * Enables JSON mode (compatibility with @effect/ai)
   */
  withJsonMode(): Effect.Effect<AiResponse> {
    return Effect.succeed(this);
  }
}

/**
 * Response type for streaming text chunks
 */
export class AiTextChunk extends Data.TaggedClass("AiTextChunk")<{
  text: string;
}> { }

/**
 * Maps a provider response to our AiResponse type
 */
export const mapProviderResponseToAiResponse = (
  response: {
    choices?: Array<{
      message?: {
        content?: string;
        tool_calls?: Array<{
          id: string;
          function: {
            name: string;
            arguments: string;
          };
        }>;
      };
      finish_reason?: string;
    }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }
): AiResponse => {
  const finishReason = response.choices?.[0]?.finish_reason as FinishReason || "unknown";
  
  return new AiResponse({
    text: response.choices?.[0]?.message?.content || "",
    toolCalls: response.choices?.[0]?.message?.tool_calls?.map(call => ({
      id: call.id,
      name: call.function.name,
      arguments: JSON.parse(call.function.arguments)
    })),
    metadata: {
      usage: response.usage && {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      }
    }
  });
};

/**
 * Guard function to check if a value is an AiResponse
 */
export const isAiResponse = (value: unknown): value is AiResponse => {
  return value instanceof AiResponse;
};

export type { AiResponse as AiResponseType };
export type { AiTextChunk as AiTextChunkType };
