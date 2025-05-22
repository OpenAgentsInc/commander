import { Data, Option, Context, Schema } from "effect";
import { AiResponse as EffectAiResponse, TypeId as EffectAiResponseTypeId, PartTypeId, TextPart, FinishPart, Usage, FinishReason } from "@effect/ai/AiResponse";

/**
 * Our application's AiResponse class that extends @effect/ai's AiResponse
 * to maintain compatibility while adding our own convenience properties
 */
export class AiResponse extends EffectAiResponse {
  /**
   * TypeId for compatibility with @effect/ai
   */
  readonly [EffectAiResponseTypeId]: typeof EffectAiResponseTypeId = EffectAiResponseTypeId;

  /**
   * Convenience property for accessing text content
   */
  get text(): string {
    // Extract text from all TextPart elements in parts
    return this.parts
      .filter((part): part is typeof TextPart.Type => part._tag === "TextPart")
      .map(part => part.text)
      .join("");
  }

  /**
   * Convenience property for tool calls
   */
  get toolCalls(): Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }> {
    return this.parts
      .filter((part): part is typeof import("@effect/ai/AiResponse").ToolCallPart.Type => part._tag === "ToolCallPart")
      .map(part => ({
        id: part.id,
        name: part.name,
        arguments: part.params as Record<string, unknown>
      }));
  }

  /**
   * Convenience property for usage metadata
   */
  get metadata(): {
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  } | undefined {
    const finishPart = this.parts.find((part): part is typeof FinishPart.Type => part._tag === "FinishPart");
    if (!finishPart) return undefined;
    
    return {
      usage: {
        promptTokens: finishPart.usage.inputTokens,
        completionTokens: finishPart.usage.outputTokens,
        totalTokens: finishPart.usage.totalTokens
      }
    };
  }

  /**
   * Create an AiResponse from simple properties
   */
  static fromSimple(props: {
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
  }): AiResponse {
    const parts: any[] = [];
    
    // Add text part if text exists
    if (props.text) {
      parts.push(new TextPart({
        text: props.text,
        annotations: []
      }));
    }
    
    // Add tool call parts if they exist
    if (props.toolCalls) {
      for (const toolCall of props.toolCalls) {
        parts.push({
          _tag: "ToolCallPart" as const,
          [PartTypeId]: PartTypeId,
          id: toolCall.id,
          name: toolCall.name,
          params: toolCall.arguments
        });
      }
    }
    
    // Add finish part with usage information
    parts.push(new FinishPart({
      reason: "unknown" as FinishReason,
      usage: new Usage({
        inputTokens: props.metadata?.usage?.promptTokens || 0,
        outputTokens: props.metadata?.usage?.completionTokens || 0,
        totalTokens: props.metadata?.usage?.totalTokens || 0,
        reasoningTokens: 0,
        cacheReadInputTokens: 0,
        cacheWriteInputTokens: 0
      }),
      providerMetadata: {}
    }));
    
    return new AiResponse({ parts });
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
  
  return AiResponse.fromSimple({
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
