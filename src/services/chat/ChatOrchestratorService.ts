import { Effect, Stream, pipe, Layer, Context } from "effect";
import { AgentLanguageModel } from "../ai/core/AgentLanguageModel";
import { AiProviderError } from "../ai/core/AiError";
import { AiResponse } from "../ai/core/AiResponse";
import { AgentChatMessage, AgentChatSession } from "../ai/core";

// Simple session service interface - can be implemented later
interface SessionService {
  readonly _tag: "SessionService";
  getSession(id: string): Effect.Effect<AgentChatSession, Error>;
}

// Simple prompt service interface - can be implemented later  
interface PromptService {
  readonly _tag: "PromptService";
  buildPrompt(messages: AgentChatMessage[]): Effect.Effect<string, Error>;
}

// Context tags for the services
const SessionService = Context.GenericTag<SessionService>("SessionService");
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
  const sessionService = yield* _(SessionService);
  const promptService = yield* _(PromptService);

  const buildPrompt = (session: AgentChatSession, message: string) => {
    return Effect.gen(function* (_) {
      const history = yield* _(session.getHistory());
      const messages: AgentChatMessage[] = [...history, {
        role: "user",
        content: message,
        timestamp: Date.now()
      }];
      return yield* _(promptService.buildPrompt(messages));
    });
  };

  const updateSession = (session: AgentChatSession, message: string, response: string) => {
    return Effect.gen(function* (_) {
      yield* _(session.addMessage({
        role: "user",
        content: message,
        timestamp: Date.now()
      }));
      yield* _(session.addMessage({
        role: "assistant", 
        content: response,
        timestamp: Date.now()
      }));
    });
  };

  const streamResponse = (
    sessionId: string,
    message: string,
    signal?: AbortSignal
  ): Stream.Stream<AiResponse, AiProviderError> =>
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
                Effect.runFork(updateSession(session, message, chunk.text));
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

export const ChatOrchestratorServiceLiveLayer = Layer.effect(
  ChatOrchestratorService.Tag,
  ChatOrchestratorServiceLive
);
