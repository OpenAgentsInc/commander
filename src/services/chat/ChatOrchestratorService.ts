import { Effect, Stream, pipe, Layer, Context } from "effect";
import { AgentLanguageModel } from "../ai/core/AgentLanguageModel";
import { AiProviderError } from "../ai/core/AiError";
import { AiResponse } from "../ai/core/AiResponse";

// Temporary stubs for missing chat modules
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
}

interface ChatSessionService {
  readonly _tag: "ChatSessionService";
  getSession(id: string): Effect.Effect<ChatSession, Error>;
  updateSession(id: string, messages: ChatMessage[]): Effect.Effect<void, Error>;
}

interface PromptService {
  readonly _tag: "PromptService";
  buildPrompt(messages: ChatMessage[]): Effect.Effect<string, Error>;
}

// Context tags for the stubbed services
const ChatSessionService = Context.GenericTag<ChatSessionService>("ChatSessionService");
const PromptService = Context.GenericTag<PromptService>("PromptService");

/**
 * Service for orchestrating chat interactions
 */
export interface ChatOrchestratorService {
  readonly _tag: "ChatOrchestratorService";

  /**
   * Stream a chat response
   */
  streamResponse(
    sessionId: string,
    message: string,
    signal?: AbortSignal
  ): Stream.Stream<AiResponse, AiProviderError>;

  /**
   * Generate a chat response
   */
  generateResponse(
    sessionId: string,
    message: string
  ): Effect.Effect<AiResponse, AiProviderError>;
}

/**
 * Context tag for ChatOrchestratorService
 */
export const ChatOrchestratorService = {
  Tag: Context.GenericTag<ChatOrchestratorService>("ChatOrchestratorService")
};

/**
 * Live implementation of ChatOrchestratorService
 */
export const ChatOrchestratorServiceLive = Effect.gen(function* (_) {
  const languageModel = yield* _(AgentLanguageModel.Tag);
  const sessionService = yield* _(ChatSessionService);
  const promptService = yield* _(PromptService);

  const buildPrompt = (session: ChatSession, message: string) =>
    promptService.buildPrompt(session.messages.concat([{
      role: "user",
      content: message
    }]));

  const updateSession = (session: ChatSession, message: string, response: string) =>
    sessionService.updateSession(session.id, [
      ...session.messages,
      { role: "user", content: message },
      { role: "assistant", content: response }
    ]);

  const streamResponse = (
    sessionId: string,
    message: string,
    signal?: AbortSignal
  ): Stream.Stream<AiTextChunk, AiProviderError> =>
    pipe(
      Effect.gen(function* (_) {
        const session = yield* _(sessionService.getSession(sessionId));
        const prompt = yield* _(buildPrompt(session, message));
        return { session, prompt };
      }),
      Effect.map(({ session, prompt }) =>
        pipe(
          languageModel.streamText({
            prompt,
            signal
          }),
          Stream.tap((chunk) =>
            Effect.sync(() => {
              if (chunk.text.trim()) {
                updateSession(session, message, chunk.text);
              }
            })
          )
        )
      ),
      Stream.unwrap
    );

  const generateResponse = (
    sessionId: string,
    message: string
  ): Effect.Effect<AiResponse, AiProviderError> =>
    pipe(
      Effect.gen(function* (_) {
        const session = yield* _(sessionService.getSession(sessionId));
        const prompt = yield* _(buildPrompt(session, message));
        const response = yield* _(
          languageModel.generateText({
            prompt
          })
        );
        yield* _(updateSession(session, message, response.text));
        return response;
      })
    );

  return {
    _tag: "ChatOrchestratorService",
    streamResponse,
    generateResponse
  };
});

export const ChatOrchestratorServiceLiveLayer = Layer.succeed(
  ChatOrchestratorService,
  ChatOrchestratorServiceLive
);
