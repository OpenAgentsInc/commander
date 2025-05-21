// src/services/ai/core/AgentChatSession.ts
import { Context, Effect } from "effect";
import type { AgentChatMessage } from "./AgentChatMessage";
import { AIContextWindowError } from "./AIError";

/**
 * Interface for managing conversation history and context
 * This service handles the management of conversation state for AI interactions
 */
export interface AgentChatSession {
  readonly _tag: "AgentChatSession";

  /**
   * Add a new message to the conversation history
   * @param message The message to add
   * @returns Effect representing success or failure of the operation
   */
  addMessage(
    message: AgentChatMessage
  ): Effect.Effect<void, AIContextWindowError>;

  /**
   * Retrieve conversation history
   * @param options Optional parameters for limiting the number of messages
   * @returns Effect containing the array of conversation messages
   */
  getHistory(
    options?: { limit?: number }
  ): Effect.Effect<AgentChatMessage[]>;

  /**
   * Clear the entire conversation history
   * @returns Effect representing success of the operation
   */
  clearHistory(): Effect.Effect<void>;

  /**
   * Prepare a conversation history for sending to an AI model
   * This handles adapting the internal message format to what the model expects
   * @param options Optional parameters for customizing the prepared messages
   * @returns Effect containing the prepared messages ready for the AI model
   */
  prepareMessagesForModel(
    options?: { 
      maxTokens?: number,
      includeSystemMessage?: boolean,
      systemMessage?: string
    }
  ): Effect.Effect<AgentChatMessage[], AIContextWindowError>;

  /**
   * Get the total estimated token count for the current conversation
   * This is useful for context window management
   * @returns Effect containing the estimated token count
   */
  getEstimatedTokenCount(): Effect.Effect<number>;
}

/**
 * Context tag for accessing the AgentChatSession service
 */
export const AgentChatSession = Context.GenericTag<AgentChatSession>("AgentChatSession");