# Claude Code Provider Initialization & Execution Flow

## Overview

This document comprehensively describes how the Claude Code provider is initialized and executed within the OpenAgents Commander Electron application using the Effect functional programming framework.

## Architecture Layers

### 1. Frontend Layer (React Components)

**File**: `src/components/ai/AgentChatPane.tsx`

- Uses `useAgentChat` hook to interact with AI providers
- Selects "claude_code" as provider from dropdown
- Sends messages through the chat interface

### 2. React Hook Layer

**File**: `src/hooks/ai/useAgentChat.ts`

- Manages chat state and streaming
- Calls `ChatOrchestratorService.sendMessage()` when user sends a message
- Handles streaming responses and error states

### 3. Service Orchestration Layer

**File**: `src/services/ai/orchestration/ChatOrchestratorService.ts`

```typescript
// Provider selection logic
const getProviderService = (provider: string) => {
  switch (provider) {
    case "claude_code":
      return ClaudeCodeService;
    // ... other providers
  }
};

// Message sending with streaming
export const sendMessage = (
  provider: string,
  messages: AgentChatMessage[],
): Stream<AiResponse, AiProviderError> => {
  return pipe(
    getProviderService(provider),
    Effect.flatMap((service) =>
      service.streamGenerateResponse({
        messages,
        model: "claude-sonnet", // Updated from claude-3-opus-20240229
        stream: true,
      }),
    ),
    Stream.fromEffect,
    Stream.catchAll((error: any) => {
      // Fixed error serialization here
      const errorMessage =
        error && typeof error === "object" && error.message
          ? error.message
          : String(error);
      return Stream.fail(
        new AiProviderError({
          message: `Claude Code stream error: ${errorMessage}`,
          cause: error, // Still shows [object Object] in logs
          isRetryable: false,
          provider: "claude_code",
        }),
      );
    }),
  );
};
```

### 4. Claude Code Service Layer

**File**: `src/services/ai/providers/claude_code/ClaudeCodeService.ts`

```typescript
export const ClaudeCodeService = {
  streamGenerateResponse: (request: any) =>
    pipe(
      // Get ClaudeCodeService from Effect context
      ClaudeCodeService,
      Effect.flatMap((service) => service.streamGenerateResponse(request)),
    ),
};
```

### 5. Claude Code Service Implementation

**File**: `src/services/ai/providers/claude_code/ClaudeCodeServiceLive.ts`

```typescript
export const ClaudeCodeServiceLive = Layer.effect(
  ClaudeCodeService,
  Effect.gen(function* () {
    return {
      streamGenerateResponse: (request: StreamGenerateRequest) =>
        Effect.gen(function* () {
          // Create message content from request.messages
          const lastMessage = request.messages[request.messages.length - 1];
          const userMessage = lastMessage?.content || "Hello";

          // Call IPC to execute Claude CLI in main process
          const response = yield* Effect.tryPromise({
            try: () => window.electronAPI.claudeCode.execute(userMessage),
            catch: (error) =>
              new AiProviderError({
                message: `Claude CLI execution failed: ${error}`,
                cause: error,
                isRetryable: false,
                provider: "claude_code",
              }),
          });

          // Parse streaming JSON response
          return {
            content: response.content,
            role: "assistant" as const,
            usage: response.usage,
          };
        }),
    };
  }),
);
```

### 6. IPC Communication Layer

**File**: `src/helpers/ipc/claude_code/claude-code-context.ts`

```typescript
// Exposes Claude Code API to renderer process
export const claudeCodeContextBridge = {
  claudeCode: {
    execute: (userMessage: string): Promise<any> =>
      ipcRenderer.invoke("claude-code:execute", userMessage),
  },
};
```

### 7. Main Process Execution Layer

**File**: `src/main.ts`

```typescript
// IPC handler for Claude CLI execution
ipcMain.handle("claude-code:execute", async (event, userMessage: string) => {
  console.log("[Claude Code] Executing with message:", userMessage);

  return new Promise((resolve, reject) => {
    // Construct CLI arguments - THIS IS THE CRITICAL PART
    const args = [
      "-p",
      userMessage, // Non-interactive prompt mode
      "--output-format",
      "stream-json", // Streaming JSON output
      "--verbose", // Required for stream-json to work
    ];

    console.log("[Claude Code] Running command: claude", args.join(" "));

    // Spawn Claude CLI subprocess
    const claudeProcess = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      env: {
        ...process.env,
        // Inherits environment variables including Claude auth
      },
    });

    let outputBuffer = "";
    let hasReceivedData = false;

    // Set up 30-second timeout
    const timeout = setTimeout(() => {
      if (!hasReceivedData) {
        claudeProcess.kill();
        reject(
          new Error(`Claude CLI timeout. This usually means:
1. Not authenticated: run 'claude auth'
2. API key issues  
3. Network problems

Try running this command manually in terminal:
claude -p "${userMessage}" --output-format stream-json --verbose`),
        );
      }
    }, 30000);

    // Handle stdout data (streaming JSON chunks)
    claudeProcess.stdout.on("data", (data) => {
      hasReceivedData = true;
      clearTimeout(timeout);
      outputBuffer += data.toString();

      // Try to parse accumulated JSON
      try {
        const parsed = JSON.parse(outputBuffer);
        resolve({
          content: parsed.content || parsed.text || "Response received",
          usage: parsed.usage || { total_tokens: 0 },
        });
      } catch (e) {
        // Continue accumulating if JSON is incomplete
      }
    });

    // Handle process errors
    claudeProcess.on("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`Claude CLI process error: ${error.message}`));
    });

    claudeProcess.on("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(
          new Error(`Claude CLI exited with code ${code}, signal ${signal}`),
        );
      }
    });
  });
});
```

## Current Issues

### 1. Error Serialization Problem

The error `cause` field still shows `[object Object]` in telemetry logs because:

- AiProviderError objects are being nested as causes
- JSON.stringify() can't properly serialize Error objects
- Need to extract error.message recursively for proper logging

### 2. CLI Execution Context Mismatch

The CLI works when run manually in terminal but fails in Electron subprocess:

- **Manual execution**: `claude -p "hi" --output-format stream-json --verbose` ✅ Works
- **Subprocess execution**: Same command times out ❌ Fails

**Potential causes**:

- Environment variable differences (PATH, authentication tokens)
- TTY vs non-TTY execution context
- Different working directory
- Authentication state not inherited by subprocess

### 3. Authentication Flow

Claude CLI uses OAuth flow that may require:

- Interactive browser authentication (`claude auth`)
- Stored tokens in user's home directory
- Specific environment variables for token access

## Effect Runtime Integration

The Claude Code provider integrates with the Effect runtime through:

1. **Service Pattern**: ClaudeCodeService is provided through Effect Layer system
2. **Error Handling**: Uses Effect.tryPromise for async operations with typed errors
3. **Streaming**: Converts Promise-based IPC to Effect Stream for reactive UI updates
4. **Context Management**: Services are injected through Effect context system

## Next Steps for Debugging

1. **Fix error serialization** to see actual error messages in logs
2. **Add environment debugging** to compare subprocess vs manual execution context
3. **Implement authentication detection** to provide better error messages
4. **Add CLI output parsing** to handle partial JSON streaming properly

## CLI Command Analysis

**Working manual command**:

```bash
claude -p "hi" --output-format stream-json --verbose
```

**Current subprocess arguments**:

```javascript
["-p", userMessage, "--output-format", "stream-json", "--verbose"];
```

The arguments are identical, suggesting the issue is in execution context, not command construction.
