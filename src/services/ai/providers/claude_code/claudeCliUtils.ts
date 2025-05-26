// src/services/ai/providers/claude_code/claudeCliUtils.ts
export type OutputFormat = 'text' | 'json' | 'stream-json';

export interface ClaudeExecOptions {
  cliPath?: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
}

export interface ClaudeExecParams {
  prompt?: string;
  outputFormat?: OutputFormat;
  systemPrompt?: string;
  continue?: boolean;
  resume?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  mcpConfig?: string;
  maxTurns?: number;
  // OpenAI/Anthropic style params, to be converted to CLI flags
  model?: string; // Will be used for --model if CLI supports, or just for logging
  temperature?: number;
  max_tokens?: number; // maps to --max-tokens-to-sample
  top_p?: number;
  stop?: string | string[]; // maps to --stop-sequences
  // Database integration
  sessionId?: string; // Session ID for database persistence
  // File context support
  contextFiles?: string[]; // Array of file paths to include as context
  contextDirectories?: string[]; // Array of directories to include as context
  // Add other params the CLI might support
  [key: string]: unknown; // Allow other params
}