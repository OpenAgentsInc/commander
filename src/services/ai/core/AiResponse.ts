import { Effect } from "effect";

export interface AiResponse {
  readonly text: string;
  readonly imageUrl: null;
  readonly withToolCallsJson: () => Effect.Effect<AiResponse, never>;
  readonly withToolCallsUnknown: () => Effect.Effect<AiResponse, never>;
  readonly withFunctionCallJson: () => Effect.Effect<AiResponse, never>;
  readonly withFunctionCallUnknown: () => Effect.Effect<AiResponse, never>;
  readonly withJsonMode: () => Effect.Effect<AiResponse, never>;
}

export function createAiResponse(text: string): AiResponse {
  const response: AiResponse = {
    text,
    imageUrl: null,
    withToolCallsJson: () => Effect.succeed(response),
    withToolCallsUnknown: () => Effect.succeed(response),
    withFunctionCallJson: () => Effect.succeed(response),
    withFunctionCallUnknown: () => Effect.succeed(response),
    withJsonMode: () => Effect.succeed(response),
  };
  return response;
}
