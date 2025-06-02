import { Effect, Layer, Stream, pipe } from "effect";
import { 
  makeAgentLanguageModel, 
  AgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
  AiResponse,
  AiProviderError
} from "@/services/ai/core";
import { ClaudeCliExecutorService, type ClaudeCliChunk } from "@/services/claude-cli";

/**
 * Parse messages from the prompt string
 * The orchestrator sends messages as a JSON string
 */
const parseMessagesFromPrompt = (prompt: string): Array<{ role: string; content: string }> => {
  try {
    const parsed = JSON.parse(prompt);
    return parsed.messages || [];
  } catch {
    // Fallback for simple string prompts
    return [{ role: "user", content: prompt }];
  }
};

/**
 * Build Claude CLI arguments from options
 */
const buildClaudeArgs = (
  options: GenerateTextOptions | StreamTextOptions,
  outputFormat: "text" | "stream-json" = "text"
): string[] => {
  const messages = parseMessagesFromPrompt(options.prompt);
  
  // Format messages for Claude CLI
  // Claude CLI doesn't support system messages in "system: content" format
  // Instead, we prepend system messages to the first user message
  let formattedPrompt = '';
  let systemContent = '';
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemContent += msg.content + '\n\n';
    } else if (msg.role === 'user') {
      if (systemContent) {
        formattedPrompt += systemContent + msg.content;
        systemContent = '';
      } else {
        formattedPrompt += msg.content;
      }
    } else if (msg.role === 'assistant') {
      // For multi-turn conversations
      formattedPrompt += '\n\nAssistant: ' + msg.content + '\n\nHuman: ';
    }
  }
  
  const args = [
    '-p', formattedPrompt.trim(),
    '--output-format', outputFormat
  ];
  
  // Add verbose flag for streaming JSON
  if (outputFormat === 'stream-json') {
    args.push('--verbose');
  }
  
  // Add optional parameters
  if (options.model) {
    args.push('--model', options.model);
  }
  if (options.maxTokens) {
    args.push('--max-tokens', String(options.maxTokens));
  }
  if (options.temperature !== undefined) {
    args.push('--temperature', String(options.temperature));
  }
  if (options.stopSequences?.length) {
    // Claude CLI may not support stop sequences directly
    // This would need to be handled in post-processing
  }
  
  // Skip permissions to avoid interactive prompts
  args.push('--dangerously-skip-permissions');
  
  return args;
};

/**
 * Extract final response from Claude chunks
 */
const extractResponseFromChunks = (chunks: ClaudeCliChunk[]): {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
} => {
  let content = '';
  let usage = undefined;
  
  for (const chunk of chunks) {
    if (chunk.type === 'assistant' && chunk.content) {
      content = chunk.content;
    } else if (chunk.type === 'result') {
      if (chunk.result) {
        content = chunk.result;
      }
      // TODO: Extract usage from result if available
    }
  }
  
  return { content, usage };
};

/**
 * Claude Code provider implementation for Node.js/CLI environments
 * Uses direct PTY execution instead of WebSocket or IPC
 */
export const ClaudeCodeNodeProviderLive = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* () {
    const cliExecutor = yield* ClaudeCliExecutorService;
    
    // Check health on initialization
    const health = yield* cliExecutor.checkHealth();
    if (!health.available) {
      return yield* Effect.fail(new AiProviderError({
        message: `Claude CLI not available: ${health.error || 'Unknown error'}`,
        cause: health.error,
        isRetryable: false,
        provider: "claude_code"
      }));
    }
    
    if (!health.authenticated) {
      console.warn("[ClaudeCodeNodeProvider] Claude CLI may not be authenticated. Run 'claude auth' if you encounter errors.");
    }
    
    return makeAgentLanguageModel({
      generateText: (options: GenerateTextOptions) =>
        Effect.gen(function* () {
          const args = buildClaudeArgs(options, "text");
          
          const response = yield* cliExecutor.execute(args).pipe(
            Effect.mapError(error => new AiProviderError({
              message: `Claude CLI execution failed: ${error.message}`,
              cause: error,
              isRetryable: error.isRetryable,
              provider: "claude_code"
            }))
          );
          
          // Estimate token usage (rough approximation)
          const messages = parseMessagesFromPrompt(options.prompt);
          const promptTokens = messages.reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0);
          const completionTokens = Math.ceil(response.length / 4);
          
          return AiResponse.fromSimple({
            text: response,
            metadata: {
              usage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens
              }
            }
          });
        }),
        
      streamText: (options: StreamTextOptions) =>
        pipe(
          cliExecutor.executeStream(buildClaudeArgs(options, "stream-json")),
          Stream.mapError(error => new AiProviderError({
            message: `Claude CLI stream failed: ${error.message}`,
            cause: error,
            isRetryable: error.isRetryable,
            provider: "claude_code"
          })),
          Stream.map(chunk => {
            // Convert Claude chunks to AiResponse
            if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              return AiResponse.fromSimple({
                text: chunk.delta.text
              });
            } else if (chunk.type === 'assistant' && chunk.content) {
              // Some chunks may contain the full response
              return AiResponse.fromSimple({
                text: chunk.content
              });
            } else {
              // Empty response for non-content chunks
              return AiResponse.fromSimple({
                text: ''
              });
            }
          }),
          // Filter out empty responses
          Stream.filter(response => response.text.length > 0)
        ),
        
      generateStructured: (options: GenerateStructuredOptions) =>
        Effect.gen(function* () {
          // For structured output, we generate text and attempt to parse as JSON
          const args = buildClaudeArgs(options, "text");
          
          // Add instruction to output JSON
          const messages = parseMessagesFromPrompt(options.prompt);
          const enhancedMessages = [
            ...messages.slice(0, -1),
            {
              role: messages[messages.length - 1].role,
              content: messages[messages.length - 1].content + 
                "\n\nIMPORTANT: Output your response as valid JSON only, with no additional text or formatting."
            }
          ];
          
          const enhancedOptions = {
            ...options,
            prompt: JSON.stringify({ messages: enhancedMessages })
          };
          
          const enhancedArgs = buildClaudeArgs(enhancedOptions, "text");
          
          const response = yield* cliExecutor.execute(enhancedArgs).pipe(
            Effect.mapError(error => new AiProviderError({
              message: `Claude CLI execution failed: ${error.message}`,
              cause: error,
              isRetryable: error.isRetryable,
              provider: "claude_code"
            }))
          );
          
          // Try to extract JSON from the response
          let jsonStr = response.trim();
          
          // Handle common JSON extraction patterns
          const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonStr = jsonMatch[1];
          }
          
          // Try to parse as JSON
          try {
            JSON.parse(jsonStr);
          } catch {
            // If not valid JSON, wrap in a simple object
            jsonStr = JSON.stringify({ response: response });
          }
          
          return AiResponse.fromSimple({
            text: jsonStr,
            metadata: {
              usage: {
                promptTokens: Math.ceil(options.prompt.length / 4),
                completionTokens: Math.ceil(jsonStr.length / 4),
                totalTokens: 0
              }
            }
          });
        })
    });
  })
);