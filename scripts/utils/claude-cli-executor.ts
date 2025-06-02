import * as pty from 'node-pty';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ClaudeStreamMessage {
  type: string;
  subtype?: string;
  message?: any;
  session_id?: string;
  tools?: string[];
  mcp_servers?: string[];
  result?: string;
  cost_usd?: number;
  is_error?: boolean;
  duration_ms?: number;
  duration_api_ms?: number;
  num_turns?: number;
}

export interface ClaudeExecutionOptions {
  prompt: string;
  systemPrompt?: string;
  outputFormat?: 'stream-json' | 'text' | 'json';
  cwd?: string;
  timeout?: number;
  onStreamingData?: (message: ClaudeStreamMessage) => void;
  debug?: boolean;
  skipPermissions?: boolean;
}

export interface ClaudeExecutionResult {
  success: boolean;
  response?: string;
  messages?: ClaudeStreamMessage[];
  error?: string;
  exitCode?: number;
  duration?: number;
}

/**
 * Find Claude CLI executable path
 */
function findClaudePath(): string {
  try {
    return execSync('which claude', { encoding: 'utf8' }).trim();
  } catch (e) {
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
    
    throw new Error('Could not find Claude CLI. Please ensure it is installed: npm install -g @anthropic-ai/claude');
  }
}

/**
 * Execute Claude CLI with direct PTY control
 */
export async function executeClaudeCli(options: ClaudeExecutionOptions): Promise<ClaudeExecutionResult> {
  const startTime = Date.now();
  const claudePath = findClaudePath();
  
  if (options.debug) {
    console.log(`[Claude CLI] Found Claude at: ${claudePath}`);
  }
  
  // Build command arguments
  const args: string[] = ['-p', options.prompt];
  
  // Handle output format
  const outputFormat = options.outputFormat || 'stream-json';
  args.push('--output-format', outputFormat);
  
  // Add --verbose for stream-json to work properly
  if (outputFormat === 'stream-json') {
    args.push('--verbose');
  }
  
  // Add system prompt if provided
  if (options.systemPrompt) {
    args.push('--system-prompt', options.systemPrompt);
  }
  
  // Skip permissions to avoid interactive prompts
  if (options.skipPermissions !== false) {
    args.push('--dangerously-skip-permissions');
  }
  
  if (options.debug) {
    console.log(`[Claude CLI] Running command: claude ${args.join(' ')}`);
  }
  
  return new Promise((resolve) => {
    let outputBuffer = '';
    let hasReceivedData = false;
    const messages: ClaudeStreamMessage[] = [];
    let finalResponse = '';
    let hasError = false;
    let errorMessage = '';
    
    try {
      // Spawn Claude with PTY
      const ptyProcess = pty.spawn(claudePath, args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: options.cwd || process.cwd(),
        env: process.env as { [key: string]: string }
      });
      
      if (options.debug) {
        console.log(`[Claude CLI] PTY process spawned with PID: ${ptyProcess.pid}`);
      }
      
      // Set up timeout if specified
      let timeoutHandle: NodeJS.Timeout | undefined;
      if (options.timeout) {
        timeoutHandle = setTimeout(() => {
          if (!hasReceivedData) {
            ptyProcess.kill();
            resolve({
              success: false,
              error: `Claude CLI timeout after ${options.timeout}ms. This usually means:\n` +
                     '1. Not authenticated: run "claude auth"\n' +
                     '2. API key issues\n' +
                     '3. Network problems',
              exitCode: -1,
              duration: Date.now() - startTime
            });
          }
        }, options.timeout);
      }
      
      // Handle PTY data
      ptyProcess.onData((data: string) => {
        if (!hasReceivedData) {
          hasReceivedData = true;
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }
        
        outputBuffer += data;
        
        // Process each line for streaming JSON
        let newlineIndex: number;
        while ((newlineIndex = outputBuffer.indexOf('\n')) >= 0) {
          const line = outputBuffer.substring(0, newlineIndex).trim();
          outputBuffer = outputBuffer.substring(newlineIndex + 1);
          
          if (line) {
            // Remove ANSI escape sequences
            const cleaned = line
              .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
              .replace(/\x1b\[?[0-9;]*[hl]/g, '');
            
            if (cleaned && cleaned.startsWith('{')) {
              try {
                const message: ClaudeStreamMessage = JSON.parse(cleaned);
                messages.push(message);
                
                if (options.debug) {
                  console.log(`[Claude CLI] Parsed message: type=${message.type}, subtype=${message.subtype}`);
                }
                
                // Extract the response content
                if (message.type === 'assistant' && message.message?.content) {
                  const content = message.message.content;
                  if (Array.isArray(content)) {
                    for (const item of content) {
                      if (item.type === 'text' && item.text) {
                        finalResponse += item.text;
                      }
                    }
                  }
                }
                
                // Check for result message
                if (message.type === 'result') {
                  if (message.is_error) {
                    hasError = true;
                    errorMessage = message.result || 'Unknown error';
                  } else if (message.result) {
                    finalResponse = message.result;
                  }
                }
                
                // Call streaming callback if provided
                if (options.onStreamingData) {
                  options.onStreamingData(message);
                }
              } catch (e) {
                if (options.debug) {
                  console.log(`[Claude CLI] Failed to parse JSON: ${cleaned}`);
                }
              }
            } else if (outputFormat === 'text') {
              // For text output, accumulate all non-JSON lines
              finalResponse += cleaned + '\n';
            }
          }
        }
      });
      
      // Handle PTY exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        
        if (options.debug) {
          console.log(`[Claude CLI] Process exited with code: ${exitCode}, signal: ${signal}`);
        }
        
        // Process any remaining data in buffer
        if (outputBuffer.trim()) {
          const cleaned = outputBuffer.trim()
            .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
            .replace(/\x1b\[?[0-9;]*[hl]/g, '');
          
          if (cleaned && cleaned.startsWith('{')) {
            try {
              const message: ClaudeStreamMessage = JSON.parse(cleaned);
              messages.push(message);
              
              if (message.type === 'result' && message.result) {
                finalResponse = message.result;
              }
            } catch (e) {
              // Ignore parse errors for final buffer
            }
          } else if (outputFormat === 'text') {
            finalResponse += cleaned;
          }
        }
        
        // Determine success and prepare result
        const success = exitCode === 0 && !hasError;
        
        resolve({
          success,
          response: finalResponse.trim() || undefined,
          messages: messages.length > 0 ? messages : undefined,
          error: hasError ? errorMessage : (exitCode !== 0 ? `Process exited with code ${exitCode}` : undefined),
          exitCode,
          duration: Date.now() - startTime
        });
      });
      
    } catch (error) {
      resolve({
        success: false,
        error: `Failed to spawn Claude CLI: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: -1,
        duration: Date.now() - startTime
      });
    }
  });
}

/**
 * Simple wrapper for quick Claude queries
 */
export async function askClaude(prompt: string, systemPrompt?: string): Promise<string> {
  const result = await executeClaudeCli({
    prompt,
    systemPrompt,
    outputFormat: 'stream-json',
    timeout: 30000
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Claude execution failed');
  }
  
  return result.response || '';
}