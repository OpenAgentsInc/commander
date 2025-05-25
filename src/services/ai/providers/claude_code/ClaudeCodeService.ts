// src/services/ai/providers/claude_code/ClaudeCodeService.ts
import { Context, Effect, Stream } from "effect";
import type { ClaudeExecParams } from "./claudeCliUtils";
import { AiProviderError } from "@/services/ai/core/AIError";

export interface ClaudeCodeService {
  executeCommand(params: ClaudeExecParams, timeout?: number): Effect.Effect<string, AiProviderError>;
  streamCommand(params: ClaudeExecParams): Stream.Stream<string, AiProviderError>;
}

export const ClaudeCodeService = Context.GenericTag<ClaudeCodeService>("ClaudeCodeService");