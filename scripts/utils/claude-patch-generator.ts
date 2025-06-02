import { executeClaudeCli, ClaudeStreamMessage } from './claude-cli-executor';
import type { SWEBenchTask } from '../../src/services/swe_bench_harness/types';

export interface PatchGenerationOptions {
  maxRetries?: number;
  includeTestInfo?: boolean;
  streamingCallback?: (message: ClaudeStreamMessage) => void;
  debug?: boolean;
  timeout?: number;
}

export interface PatchGenerationResult {
  success: boolean;
  patch?: string;
  error?: string;
  attempts: number;
  duration: number;
}

/**
 * Build a comprehensive prompt for Claude to generate a patch for a SWE-bench task
 */
function buildPrompt(task: SWEBenchTask, previousAttempt?: { patch: string; error: string }): string {
  let prompt = `You are an expert software engineer tasked with fixing a bug in a repository.

Repository: ${task.repo}
Instance ID: ${task.instance_id}

Problem Statement:
${task.problem_statement}

`;

  if (task.hints_text) {
    prompt += `Hints:
${task.hints_text}

`;
  }

  if (previousAttempt) {
    prompt += `Previous Attempt:
The following patch was attempted but failed:

${previousAttempt.patch}

Error/Test Output:
${previousAttempt.error}

Please analyze why the previous patch failed and generate a corrected patch.

`;
  }

  prompt += `Instructions:
1. Analyze the problem statement carefully
2. Consider the repository structure and common patterns
3. Generate a minimal patch that fixes the issue
4. The patch should be in unified diff format (as produced by 'git diff')
5. Only include changes that are directly related to fixing the issue
6. Ensure the patch follows the coding style of the repository

Generate the patch now. Output ONLY the patch in unified diff format, starting with "diff --git" and nothing else.`;

  return prompt;
}

/**
 * Extract patch from Claude's response
 */
function extractPatch(response: string): string | null {
  // Look for unified diff format
  const diffPattern = /diff --git[\s\S]*$/;
  const match = response.match(diffPattern);
  
  if (match) {
    return match[0].trim();
  }
  
  // Sometimes the patch might be in a code block
  const codeBlockPattern = /```(?:diff|patch)?\n([\s\S]*?)\n```/;
  const codeBlockMatch = response.match(codeBlockPattern);
  
  if (codeBlockMatch && codeBlockMatch[1].includes('diff --git')) {
    return codeBlockMatch[1].trim();
  }
  
  // If the entire response looks like a patch, return it
  if (response.includes('diff --git') || response.includes('@@')) {
    return response.trim();
  }
  
  return null;
}

/**
 * Generate a patch for a SWE-bench task using Claude
 */
export async function generatePatchWithClaude(
  task: SWEBenchTask,
  options: PatchGenerationOptions = {}
): Promise<PatchGenerationResult> {
  const startTime = Date.now();
  const maxRetries = options.maxRetries || 1;
  let attempts = 0;
  let lastError = '';
  
  const systemPrompt = `You are Commander's AI Agent specialized in generating patches for software repositories. 
Be precise, minimal, and follow the repository's coding conventions.
When generating patches, ensure they are in proper unified diff format.`;
  
  while (attempts < maxRetries) {
    attempts++;
    
    if (options.debug) {
      console.log(`[Patch Generator] Attempt ${attempts}/${maxRetries} for ${task.instance_id}`);
    }
    
    try {
      const prompt = buildPrompt(
        task,
        attempts > 1 && lastError ? { patch: '', error: lastError } : undefined
      );
      
      const result = await executeClaudeCli({
        prompt,
        systemPrompt,
        outputFormat: 'stream-json',
        timeout: options.timeout || 60000, // 60 second timeout
        onStreamingData: options.streamingCallback,
        debug: options.debug
      });
      
      if (!result.success) {
        lastError = result.error || 'Unknown error';
        if (options.debug) {
          console.log(`[Patch Generator] Claude execution failed: ${lastError}`);
        }
        continue;
      }
      
      const patch = extractPatch(result.response || '');
      
      if (!patch) {
        lastError = 'No valid patch found in response';
        if (options.debug) {
          console.log(`[Patch Generator] Failed to extract patch from response`);
          console.log(`Response: ${result.response?.substring(0, 500)}...`);
        }
        continue;
      }
      
      if (options.debug) {
        console.log(`[Patch Generator] Successfully generated patch (${patch.length} chars)`);
      }
      
      return {
        success: true,
        patch,
        attempts,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (options.debug) {
        console.log(`[Patch Generator] Error in attempt ${attempts}: ${lastError}`);
      }
    }
  }
  
  return {
    success: false,
    error: lastError || 'Failed to generate patch after all attempts',
    attempts,
    duration: Date.now() - startTime
  };
}

/**
 * Generate an improved patch based on test failures
 */
export async function generateImprovedPatch(
  task: SWEBenchTask,
  previousPatch: string,
  testOutput: string,
  options: PatchGenerationOptions = {}
): Promise<PatchGenerationResult> {
  const improvedTask = {
    ...task,
    problem_statement: `${task.problem_statement}

IMPORTANT: A previous patch was attempted but failed. Here are the test results:

Previous Patch:
${previousPatch}

Test Output:
${testOutput}

Please analyze the test failures and generate an improved patch that addresses these specific issues.`
  };
  
  return generatePatchWithClaude(improvedTask, options);
}