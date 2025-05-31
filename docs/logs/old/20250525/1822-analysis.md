# Claude Code Provider Analysis - Interactive Terminal Issue

**Date**: 2025-05-25 18:22  
**Analysis of**: 1821-log.md  
**Issue**: Claude Code CLI is running interactively instead of processing single requests

## Problem Diagnosis

### Root Cause: Interactive Terminal Mode

The Claude Code CLI is running in **interactive terminal mode** instead of processing single requests. This is evident from the streaming output:

```
╭───────────────────────────────────────────────────╮
│ ✻ Welcome to Claude Code research preview!        │
│                                                   │
│   /help for help, /status for your current setup  │
│                                                   │
│   cwd: /Users/christopherdavid/code/commander     │
╰───────────────────────────────────────────────────╯

╭──────────────────────────────────────────────────────────────────────────────╮
│ >                                                                            │
╰──────────────────────────────────────────────────────────────────────────────╯
  ? for shortcuts
```

### What's Happening

1. **Command**: `claude chat` launches the **interactive chat interface**
2. **User Input**: When we write "testing" to stdin, it appears in the interface as:
   ```
   > chat
     testing
   ```
3. **Processing Loop**: The CLI shows animated status:
   ```
   ✻ Processing… (0s · ↓ 0 tokens · esc to interrupt)
   ✽ Transmuting… (1s · ↑ 0 tokens · esc to interrupt)
   ✢ Transmuting… (2s · ↑ 0 tokens · esc to interrupt)
   ```
4. **Auto-update Issue**: The CLI tries to auto-update but fails:
   ```
   ✗ Auto-update failed · Try claude doctor or npm i -g @anthropic-ai/claude-code
   ```

### Technical Issues

#### 1. Interactive vs API Mode

- **Current**: `claude chat` = Interactive terminal session
- **Needed**: Non-interactive API call or proper argument format

#### 2. ANSI Escape Sequences Flooding

The log shows thousands of ANSI escape sequences:

- `\u001b[2K\u001b[1A` = Clear line and move cursor up
- `\u001b[G` = Move cursor to column 1
- These are terminal control codes for the animated UI

#### 3. No Token Progress

The status shows `↑ 0 tokens` and `↓ 0 tokens`, suggesting:

- No actual API communication happening
- The CLI might be stuck in setup/authentication
- Or waiting for proper input format

#### 4. Auto-update Failure

```
✗ Auto-update failed · Try claude doctor or npm i -g @anthropic-ai/claude-code
```

This suggests the CLI version might be outdated or improperly installed.

## Proposed Solutions

### Option 1: Non-Interactive Mode

Research the Claude CLI for non-interactive options:

```bash
claude --help
claude chat --help
```

Look for flags like:

- `--non-interactive`
- `--api-mode`
- `--single-request`
- `--message "prompt"`

### Option 2: Proper Input Format

The CLI might expect:

```bash
echo "user message" | claude chat
```

Or:

```bash
claude chat < input.txt
```

### Option 3: Direct API Call

Instead of the CLI, use Claude API directly:

```typescript
// Use @anthropic-ai/sdk instead of CLI
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Option 4: Fix CLI Setup

1. **Update Claude CLI**:

   ```bash
   npm install -g @anthropic-ai/claude-code@latest
   ```

2. **Run diagnostics**:

   ```bash
   claude doctor
   ```

3. **Check authentication**:
   ```bash
   claude auth status
   ```

## Immediate Fix Recommendation

### Fix the CLI Arguments

Based on the interactive nature, try:

```typescript
// Instead of:
const claudeProcess = spawn(claudePath, ["chat"], {
  stdio: ["pipe", "pipe", "pipe"],
});

// Try:
const claudeProcess = spawn(claudePath, ["chat", "--non-interactive"], {
  stdio: ["pipe", "pipe", "pipe"],
});

// Or use echo piping:
const claudeProcess = spawn(
  "bash",
  ["-c", `echo "${userMessage}" | ${claudePath} chat`],
  {
    stdio: ["pipe", "pipe", "pipe"],
  },
);
```

### Alternative: Filter ANSI Sequences

If we must use interactive mode, strip ANSI codes:

```typescript
claudeProcess.stdout.on("data", (data) => {
  // Strip ANSI escape sequences
  const chunk = data.toString().replace(/\x1b\[[0-9;]*[mGKHF]/g, "");

  // Only send meaningful content (not just cursor movements)
  if (
    chunk.trim() &&
    !chunk.includes("Processing…") &&
    !chunk.includes("Transmuting…")
  ) {
    console.log("[Main Process] Claude streaming chunk:", chunk);
    event.sender.send("claude-code:chat-stream:chunk", requestId, chunk);
  }
});
```

## Status Assessment

✅ **IPC Working**: Communication between renderer and main process is perfect  
✅ **CLI Found**: Claude CLI is installed and accessible  
❌ **CLI Mode**: Running in interactive mode instead of API mode  
❌ **Output Format**: Receiving terminal UI instead of clean responses  
❌ **Authentication**: Possibly not properly authenticated (0 tokens processed)

## Next Steps

1. **Research proper CLI usage**: `claude --help` and `claude chat --help`
2. **Check authentication**: `claude auth status`
3. **Try non-interactive flags** or alternative invocation methods
4. **Consider switching to direct API usage** if CLI proves too complex for programmatic use

The core integration is working - we just need to invoke the Claude CLI correctly for programmatic use rather than interactive terminal sessions.
