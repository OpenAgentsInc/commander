#!/usr/bin/env tsx
/**
 * Test Claude Code message formatting fix
 */

import { spawn } from 'child_process';

async function testClaudeFormatting() {
  console.log("Testing Claude Code message formatting...\n");
  
  // Test 1: System message formatting
  console.log("Test 1: System message should be prepended to user message");
  const systemPrompt = "You are an expert software developer.";
  const userPrompt = "Write a simple hello world function in Python.";
  
  // Old format would be: "system: You are an expert...\nuser: Write a simple..."
  // New format should be: "You are an expert...\n\nWrite a simple..."
  
  const prompt = systemPrompt + '\n\n' + userPrompt;
  
  const claudeProcess = spawn('claude', [
    '-p', prompt,
    '--output-format', 'stream-json'
  ], {
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  let fullOutput = '';
  let fullError = '';
  let gotError = false;
  
  claudeProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    fullOutput += chunk;
    
    // Try to parse streaming JSON
    const lines = chunk.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.type === 'content_block_delta' && json.delta?.text) {
          process.stdout.write(json.delta.text);
        }
      } catch {
        // Not JSON
      }
    }
  });
  
  claudeProcess.stderr.on('data', (data) => {
    fullError += data.toString();
    gotError = true;
  });
  
  return new Promise((resolve) => {
    claudeProcess.on('close', (code) => {
      console.log("\n\n=== Test Result ===");
      console.log("Exit code:", code);
      
      if (gotError) {
        console.error("❌ Test FAILED - Got error:");
        console.error(fullError);
        
        if (fullError.includes("Invalid model name")) {
          console.error("\nThe 'Invalid model name' error suggests system message is still being misformatted");
        }
      } else if (code === 0) {
        console.log("✅ Test PASSED - Claude processed the message without 'Invalid model name' error");
      }
      
      resolve(code === 0 && !gotError);
    });
  });
}

testClaudeFormatting().catch(console.error);