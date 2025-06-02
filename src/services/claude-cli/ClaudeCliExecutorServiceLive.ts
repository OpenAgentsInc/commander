import { Effect, Layer, Stream, Queue, Fiber, pipe, Chunk } from "effect";
import * as pty from 'node-pty';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ClaudeCliExecutorService, ClaudeCliError, ClaudeCliChunk, ClaudeHealthStatus } from "./ClaudeCliExecutorService";

/**
 * Find Claude CLI executable path
 */
const findClaudePath = Effect.gen(function* () {
  try {
    const claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
    return claudePath;
  } catch {
    // Try common locations
    const fallbacks = [
      '/Users/christopherdavid/.npm-global/bin/claude',
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      path.join(process.env.HOME || '', '.local/bin/claude'),
      path.join(process.env.HOME || '', 'node_modules/.bin/claude')
    ];
    
    for (const fallback of fallbacks) {
      if (fs.existsSync(fallback)) {
        return fallback;
      }
    }
    
    return yield* Effect.fail(new ClaudeCliError(
      'Could not find Claude CLI. Please ensure it is installed: npm install -g @anthropic-ai/claude'
    ));
  }
});

/**
 * Parse a line of JSON output from Claude CLI
 */
const parseClaudeJsonLine = (line: string): ClaudeCliChunk | null => {
  // Remove ANSI escape sequences
  const cleaned = line
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    .replace(/\x1b\[?[0-9;]*[hl]/g, '')
    .trim();
  
  if (!cleaned || !cleaned.startsWith('{')) {
    if (cleaned) {
      return { type: "raw", content: cleaned };
    }
    return null;
  }
  
  try {
    const parsed = JSON.parse(cleaned);
    
    // Handle different message types
    if (parsed.type === 'system' && parsed.subtype === 'init') {
      return {
        type: "system",
        session_id: parsed.session_id,
        tools: parsed.tools
      };
    } else if (parsed.type === 'assistant' && parsed.message) {
      const content = parsed.message.content?.[0]?.text || '';
      return {
        type: "assistant",
        content,
        session_id: parsed.session_id
      };
    } else if (parsed.type === 'result') {
      return {
        type: "result",
        result: parsed.result,
        cost_usd: parsed.cost_usd,
        is_error: parsed.is_error,
        duration_ms: parsed.duration_ms,
        session_id: parsed.session_id
      };
    } else if (parsed.type === 'content_block_delta') {
      return {
        type: "content_block_delta",
        delta: parsed.delta
      };
    }
    
    // Return raw chunk for unknown types
    return { type: "raw", content: cleaned };
  } catch {
    return { type: "raw", content: cleaned };
  }
};

/**
 * Live implementation of ClaudeCliExecutorService using node-pty
 */
export const ClaudeCliExecutorServiceLive = Layer.effect(
  ClaudeCliExecutorService,
  Effect.gen(function* () {
    // Find Claude CLI path once during service initialization
    const claudePath = yield* findClaudePath;
    
    return {
      _tag: "ClaudeCliExecutorService" as const,
      
      execute: (args) => 
        Effect.gen(function* () {
          return yield* Effect.async<string, ClaudeCliError>((resume) => {
            let outputBuffer = '';
            let hasReceivedData = false;
            let finalResponse = '';
            
            try {
              // Spawn Claude with PTY
              // Set environment to force non-interactive mode
              const env = {
                ...process.env,
                CI: 'true',
                TERM: 'dumb',
                NO_COLOR: '1',
                NODE_NO_READLINE: '1'
              } as { [key: string]: string };
              
              const ptyProcess = pty.spawn(claudePath, [...args], {
                name: 'dumb',
                cols: 120,
                rows: 30,
                cwd: process.cwd(),
                env
              });
              
              // Set up timeout - increase to 2 minutes for complex prompts
              const timeoutHandle = setTimeout(() => {
                if (!hasReceivedData) {
                  ptyProcess.kill();
                  resume(Effect.fail(new ClaudeCliError(
                    'Claude CLI timeout after 120s. This usually means:\n' +
                    '1. Not authenticated: run "claude auth"\n' +
                    '2. API key issues\n' +
                    '3. Network problems\n' +
                    '4. Very complex prompt requiring more processing time',
                    undefined,
                    false
                  )));
                }
              }, 120000);
              
              // Handle PTY data
              ptyProcess.onData((data: string) => {
                if (!hasReceivedData) {
                  hasReceivedData = true;
                  clearTimeout(timeoutHandle);
                }
                
                outputBuffer += data;
                
                // Process each line
                let newlineIndex: number;
                while ((newlineIndex = outputBuffer.indexOf('\n')) >= 0) {
                  const line = outputBuffer.substring(0, newlineIndex);
                  outputBuffer = outputBuffer.substring(newlineIndex + 1);
                  
                  const chunk = parseClaudeJsonLine(line);
                  if (chunk) {
                    if (chunk.type === 'assistant' && chunk.content) {
                      finalResponse = chunk.content;
                    } else if (chunk.type === 'result' && chunk.result) {
                      finalResponse = chunk.result;
                    } else if (chunk.type === 'raw' && chunk.content) {
                      // For text output format, accumulate raw content
                      finalResponse += chunk.content + '\n';
                    }
                  }
                }
              });
              
              // Handle PTY exit
              ptyProcess.onExit(({ exitCode }) => {
                clearTimeout(timeoutHandle);
                
                // Process any remaining data
                if (outputBuffer.trim()) {
                  const chunk = parseClaudeJsonLine(outputBuffer.trim());
                  if (chunk) {
                    if (chunk.type === 'assistant' && chunk.content) {
                      finalResponse = chunk.content;
                    } else if (chunk.type === 'result' && chunk.result) {
                      finalResponse = chunk.result;
                    } else if (chunk.type === 'raw' && chunk.content) {
                      finalResponse += chunk.content;
                    }
                  }
                }
                
                if (exitCode === 0 && finalResponse) {
                  resume(Effect.succeed(finalResponse.trim()));
                } else {
                  resume(Effect.fail(new ClaudeCliError(
                    `Claude CLI exited with code ${exitCode}`,
                    undefined,
                    false
                  )));
                }
              });
              
            } catch (error) {
              resume(Effect.fail(new ClaudeCliError(
                `Failed to spawn Claude CLI: ${error instanceof Error ? error.message : String(error)}`,
                error,
                false
              )));
            }
          });
        }),
        
      executeStream: (args) =>
        Stream.asyncScoped((emit) =>
          Effect.gen(function* () {
            // Set environment to force non-interactive mode
            const env = {
              ...process.env,
              CI: 'true',
              TERM: 'dumb',
              NO_COLOR: '1',
              NODE_NO_READLINE: '1'
            } as { [key: string]: string };
            
            const ptyProcess = yield* Effect.try({
              try: () => pty.spawn(claudePath, [...args], {
                name: 'dumb',
                cols: 120,
                rows: 30,
                cwd: process.cwd(),
                env
              }),
              catch: (error) => new ClaudeCliError(
                `Failed to spawn Claude CLI: ${error instanceof Error ? error.message : String(error)}`,
                error,
                false
              )
            });
            
            let outputBuffer = '';
            let hasEnded = false;
            
            // Set up data handler
            ptyProcess.onData((data: string) => {
              outputBuffer += data;
              
              // Process each line
              let newlineIndex: number;
              while ((newlineIndex = outputBuffer.indexOf('\n')) >= 0) {
                const line = outputBuffer.substring(0, newlineIndex);
                outputBuffer = outputBuffer.substring(newlineIndex + 1);
                
                const chunk = parseClaudeJsonLine(line);
                if (chunk && !hasEnded) {
                  emit.single(chunk);
                }
              }
            });
            
            // Set up exit handler
            ptyProcess.onExit(({ exitCode }) => {
              // Process any remaining data
              if (outputBuffer.trim() && !hasEnded) {
                const chunk = parseClaudeJsonLine(outputBuffer.trim());
                if (chunk) {
                  emit.single(chunk);
                }
              }
              
              if (exitCode !== 0 && !hasEnded) {
                emit.fail(new ClaudeCliError(
                  `Claude CLI exited with code ${exitCode}`,
                  undefined,
                  false
                ));
              } else {
                emit.end();
              }
              hasEnded = true;
            });
            
            // Return cleanup function
            return Effect.sync(() => {
              hasEnded = true;
              ptyProcess.kill();
            });
          })
        ),
        
      checkHealth: () =>
        Effect.gen(function* () {
          try {
            // Run claude --version
            const versionOutput = yield* Effect.try({
              try: () => execSync(`${claudePath} --version`, { encoding: 'utf8' }).trim(),
              catch: (error) => new ClaudeCliError(
                `Failed to check Claude version: ${error}`,
                error,
                false
              )
            });
            
            // Try a simple auth check by running version command
            // The --version flag should work without authentication issues
            const authCheckProcess = pty.spawn(claudePath, ['--version'], {
              name: 'dumb',
              cols: 80,
              rows: 24,
              cwd: process.cwd(),
              env: {
                ...process.env,
                CI: 'true',
                TERM: 'dumb',
                NO_COLOR: '1',
                NODE_NO_READLINE: '1'
              } as { [key: string]: string }
            });
            
            const authenticated = yield* Effect.async<boolean>((resume) => {
              let output = '';
              const timeout = setTimeout(() => {
                authCheckProcess.kill();
                resume(Effect.succeed(false));
              }, 5000);
              
              authCheckProcess.onData((data) => {
                output += data;
                // Version output indicates CLI is working
                if (output.includes('Claude Code') || output.includes('claude')) {
                  clearTimeout(timeout);
                  authCheckProcess.kill();
                  resume(Effect.succeed(true));
                }
              });
              
              authCheckProcess.onExit(() => {
                clearTimeout(timeout);
                // Check if we got version info
                resume(Effect.succeed(output.includes('Claude Code') || output.includes('claude')));
              });
            });
            
            return {
              available: true,
              authenticated,
              version: versionOutput,
              claudePath
            };
          } catch (error) {
            return {
              available: false,
              authenticated: false,
              claudePath,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        })
    };
  })
);