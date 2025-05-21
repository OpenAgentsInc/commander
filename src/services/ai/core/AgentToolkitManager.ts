// src/services/ai/core/AgentToolkitManager.ts
import { Context, Effect } from "effect";

// Define our own types mirroring @effect/ai
export interface Tool<I = any, S = any, E = any> {
  readonly _tag: string;
  readonly description?: string;
}

export interface AiToolkit<Tools extends Tool = Tool> {
  readonly tools: Record<string, Tools>;
}

/**
 * Interface for managing an AI model's toolkit of available tools
 * This service handles registration and access to tools that an AI can use
 */
export interface AgentToolkitManager {
  readonly _tag: "AgentToolkitManager";

  /**
   * Get the complete toolkit of available tools
   * This will be passed to AI models that support tool use
   * @returns Effect containing the toolkit
   */
  getToolkit(): Effect.Effect<AiToolkit<Tool>>;

  /**
   * Register a new tool to be available for AI use
   * @param tool The tool definition to add to the toolkit
   * @returns Effect representing success of the operation
   */
  registerTool<I, S, E>(
    tool: Tool<I, S, E>
  ): Effect.Effect<void>;

  /**
   * Execute a specific tool with given arguments
   * @param toolName The name of the tool to execute
   * @param args Arguments for the tool in the format expected by the tool
   * @returns Effect containing either the success result or failure error from the tool
   */
  executeTool(
    toolName: string, 
    args: unknown
  ): Effect.Effect<unknown, unknown>;

  /**
   * Check if a specific tool is registered
   * @param toolName The name of the tool to check
   * @returns Effect containing boolean indicating if the tool exists
   */
  hasTool(
    toolName: string
  ): Effect.Effect<boolean>;
}

/**
 * Context tag for accessing the AgentToolkitManager service
 */
export const AgentToolkitManager = Context.GenericTag<AgentToolkitManager>("AgentToolkitManager");