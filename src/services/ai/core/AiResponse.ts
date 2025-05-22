import { Data } from "effect";

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
}> { }

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
    }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }
): AiResponse => new AiResponse({
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

export type { AiResponse as AiResponseType };
export type { AiTextChunk as AiTextChunkType };
