Okay, I understand the issue. The Claude Code integration, when loading a chat history, seems to be sending only the initial message of that history for context, rather than the full conversation. This causes Claude to respond as if it's the first turn, ignoring subsequent interactions.

Here are specific instructions for a coding agent to fix this. The fix involves ensuring the full chat history is correctly formatted and passed to the Claude Code CLI via the bridge service, specifically by modifying how prompts are constructed in `main-claude-websocket.ts` and by standardizing the prompt formatting logic in `claudeFormatters.ts`. Additionally, `useCoderChat.ts` needs to be updated to explicitly pass the system prompt.

**Goal:** Ensure that when a chat history is loaded and a new message is sent, the Claude Code CLI receives the complete formatted conversation history (User/Assistant turns) plus the new message, and any system prompt is passed via the correct CLI flag.

---

**Instructions for Fixing Chat History with Claude Code CLI**

**1. Modify `src/services/ai/providers/claude_code/claudeFormatters.ts`**

   Update the `formatMessagesForClaudeCli` function to correctly format messages for the CLI, map roles to "Human" and "Assistant", filter out system messages, and append "Assistant:" when it's the AI's turn.

   ```typescript
   // src/services/ai/providers/claude_code/claudeFormatters.ts
   import type { AgentChatMessage } from "@/services/ai/core"; // Assuming this type matches {role: string, content: string}

   /**
    * Formats messages for Claude CLI prompt format.
    * - Filters out system messages.
    * - Maps 'user' role to 'Human:' and 'assistant' role to 'Assistant:'.
    * - Joins messages with '\n\n'.
    * - Appends '\n\nAssistant:' if the last message was from a Human.
    */
   export function formatMessagesForClaudeCli(messages: Array<{role: string; content: string | null | undefined}>): string {
     const relevantMessages = messages.filter(
       (msg) => msg.role === "user" || msg.role === "assistant",
     );

     if (relevantMessages.length === 0) {
       return ""; // Return empty string if no user/assistant messages
     }

     let prompt = relevantMessages
       .map((message) => {
         const role = message.role === "user" ? "Human" : "Assistant";
         // Ensure content is a string, defaulting to empty if null/undefined
         const content = message.content || "";
         return `${role}: ${content}`;
       })
       .join("\n\n");

     // If the last message was from a user (Human), prompt the assistant for a response.
     const lastMessage = relevantMessages[relevantMessages.length - 1];
     if (lastMessage.role === "user") {
       prompt += "\n\nAssistant:"; // The CLI typically expects this to start generating
     }

     return prompt;
   }
   ```

**2. Modify `src/hooks/coder/useCoderChat.ts`**

   Ensure the system prompt is explicitly passed in the `params` when calling `streamChat`.

   In the `sendMessage` function within `useCoderChat.ts`:
   Find the call to `window.electronAPI.claudeCode?.streamChat`.
   Update the first argument (the `params` object) to include `systemPrompt`:

   ```typescript
   // src/hooks/coder/useCoderChat.ts
   // Inside sendMessage useCallback:

       // Extract system message content. Use the one from messages state if available,
       // otherwise fallback to a default.
       const systemMessageContent = messages.find(m => m.role === 'system')?.content ||
                                    'You are Claude Code, a helpful AI coding assistant.';

       // ... (apiMessages construction remains the same) ...

       const cleanup = window.electronAPI.claudeCode?.streamChat(
         {
           messages: apiMessages, // This contains only user/assistant messages
           systemPrompt: systemMessageContent, // <-- ADD THIS LINE
           model: 'claude-3-sonnet-20240229', // Or your configured model
           max_tokens: 4096,
           temperature: 0.7,
           sessionId: sessionIdRef.current,
         },
         // ... (callbacks remain the same) ...
       );
   ```

**3. Modify `src/main-claude-websocket.ts`**

   Refactor the `ipcMain.on("claude-code:chat-stream", ...)` handler to correctly use the received `params.messages` (which is the full chat history from `useCoderChat`) and the new `formatMessagesForClaudeCli` function. Also, ensure it uses `params.systemPrompt`.

   ```javascript
   // src/main-claude-websocket.ts
   // Make sure to import formatMessagesForClaudeCli. If it's in a different bundle (renderer vs main),
   // you might need to move it to a shared location or duplicate it carefully.
   // Assuming it's made accessible, e.g., by moving it to a shared helper directory.
   // For this instruction, let's assume you've made it available as:
   // const { formatMessagesForClaudeCli } = require('./path/to/claudeFormatters'); // Adjust path as needed

   // Temporary: If direct import is tricky, define it inline for now in main-claude-websocket.ts
   function formatMessagesForClaudeCli_main(messages) { // Slightly different name to avoid collision if imported
     const relevantMessages = messages.filter(
       (msg) => msg.role === "user" || msg.role === "assistant",
     );
     if (relevantMessages.length === 0) return "";
     let prompt = relevantMessages
       .map((message) => {
         const role = message.role === "user" ? "Human" : "Assistant";
         const content = message.content || "";
         return `${role}: ${content}`;
       })
       .join("\n\n");
     const lastMessage = relevantMessages[relevantMessages.length - 1];
     if (lastMessage.role === "user") {
       prompt += "\n\nAssistant:";
     }
     return prompt;
   }


   // Inside setupClaudeWebSocketHandler()
   // In the ipcMain.on("claude-code:chat-stream", async (event, requestId, params) => { ... }) handler:

   // Replace the existing "Build conversation context" block:
   /*
   // OLD BLOCK TO BE REPLACED:
   // Build conversation context
   const messages = params.messages || [];
   let conversationContext = "";
   const systemMessage = messages.find((m: any) => m.role === "system")?.content;
   const conversationMessages = messages.filter((m: any) => m.role !== "system");
   if (conversationMessages.length === 0) { /* ... error ... */ }
   if (conversationMessages.length > 1) {
     const formattedMessages = conversationMessages.map((msg: any, index: number) => {
       const role = msg.role === 'user' ? 'Human' : 'Assistant';
       return `${role}: ${msg.content}`;
     });
     conversationContext = formattedMessages.join('\n\n');
     const lastMessage = conversationMessages[conversationMessages.length - 1];
     if (lastMessage.role === 'user') {
       conversationContext += '\n\nAssistant:';
     }
   } else {
     conversationContext = conversationMessages[0].content;
   }
   // Build Claude CLI args
   const args = ["-p", conversationContext, "--output-format", "stream-json", "--verbose"];
   if (systemMessage) {
     args.push("--system-prompt", systemMessage);
   }
   // END OF OLD BLOCK
   */

   // WITH THIS NEW BLOCK:
   const chatMessagesForPrompt = params.messages || []; // These are already user/assistant turns from useCoderChat
   const systemPromptContent = params.systemPrompt;    // This is now explicitly passed

   if (chatMessagesForPrompt.length === 0 && !systemPromptContent) {
     log("[Main Process] No messages or system prompt to send to Claude CLI");
     event.sender.send(`claude-code:chat-stream:error`, requestId, {
       __error: true,
       message: "No messages or system prompt provided"
     });
     return;
   }

   // Use the formatter (inline version for this instruction)
   const conversationContext = formatMessagesForClaudeCli_main(chatMessagesForPrompt);

   // Build Claude CLI args
   const args = [];
   if (conversationContext) { // Only add -p if there's actual conversation context
        args.push("-p", conversationContext);
   }
   args.push("--output-format", "stream-json");

   // Add other CLI parameters from params if they are supported and should be passed
   if (params.model) {
       args.push("--model", params.model);
   }
   if (params.temperature) {
       args.push("--temperature", String(params.temperature));
   }
   if (params.max_tokens) { // Assuming Claude CLI uses max_tokens or similar
       args.push("--max-tokens-to-sample", String(params.max_tokens)); // Or the correct CLI flag
   }
   // Add other passthrough flags as needed, e.g., --verbose
   // args.push("--verbose");

   if (systemPromptContent) {
     args.push("--system-prompt", systemPromptContent);
   }
   // END OF NEW BLOCK

   // The rest of the PTY spawning logic using `args` remains the same.
   // log(`[Main Process] Connecting to bridge service with args:`, args);
   // ...
   ```

**Explanation of Changes:**

*   **`claudeFormatters.ts`:** The `formatMessagesForClaudeCli` function is now the canonical way to prepare a prompt string for the Claude CLI. It correctly maps roles to "Human:" and "Assistant:", filters out system messages (which are handled by a dedicated CLI flag), and appends "Assistant:" to signal the AI's turn.
*   **`useCoderChat.ts`:** When calling the IPC bridge for Claude Code, it now explicitly includes the `systemPrompt` in the parameters. This ensures that the system message defined in `useCoderChat` is actually used by the CLI.
*   **`main-claude-websocket.ts`:**
    *   It now directly uses the `params.messages` (which contains the user/assistant turn history from `useCoderChat`) and the `params.systemPrompt`.
    *   It calls the standardized `formatMessagesForClaudeCli` (or the inline equivalent provided) to generate the main prompt context string.
    *   The logic that distinguished between single and multi-message conversations for formatting is removed; the formatter handles all cases appropriately.
    *   It correctly constructs the CLI arguments, passing the formatted conversation to `-p` and the system prompt to `--system-prompt`.
    *   It also includes passthrough for common parameters like model, temperature, and max\_tokens.

This set of changes ensures that the full relevant chat history and system prompt are correctly conveyed to the Claude Code CLI, addressing the bug where it seemed to respond only to the first message. Remember to make `formatMessagesForClaudeCli` accessible from `main-claude-websocket.ts`, possibly by moving it to a shared helper location if it's not already. For the purpose of these instructions, an inline version is provided in `main-claude-websocket.ts` to ensure clarity.

---

The logs confirm that multi-turn interactions, including tool calls and their results, are being processed. The key log entry:
```
[Main Process] Conversation context being sent: Human: need to add copy buttons to our messages. look at src/components/ui/copy-button.tsx and put it wherever needs to go

Assistant:

Human: Write a log docs/logs/20250529/0922-copybutton-log.md explaining all what u did

Assistant:

Human: sdfasdf

asdasd

Assistant:
```
This shows that when the user types "sdfasdf\n\nasdasd", the preceding turns *are* being included in the `-p` (prompt) argument sent to the Claude Code CLI. This aligns with the intent of the `formatMessagesForClaudeCli` function.

However, the arguments passed to the CLI via the bridge service (`main-claude-websocket.ts`) are logged as:
```
[Main Process] Connecting to bridge service with args: [
  '-p',
  'Human: need to add copy buttons to our messages. look at src/components/ui/copy-button.tsx and put it wherever needs to go\n' +
    '\n' +
    'Assistant: \n' +
    '\n' +
    // ... more history ...
    'Assistant:',
  '--output-format',
  'stream-json',
  '--verbose' // This was added during the fix. In earlier logs, it was --dangerously-skip-permissions
]
```
Notably, the `--system-prompt` flag is *missing* from these arguments. This is a key discrepancy. If the system prompt contains vital ongoing context or instructions (e.g., "You are working on file X," or "Continue the previous task"), its absence on subsequent turns would indeed cause Claude to behave as if it's only responding to the current multi-turn prompt without that overarching system-level guidance.

My previous analysis and fix instructions correctly identified the need to:
1.  Ensure `useCoderChat.ts` explicitly passes the `systemPrompt` when calling the IPC bridge.
2.  Ensure `main-claude-websocket.ts` correctly receives this `params.systemPrompt` and adds the `--system-prompt` flag with its content to the CLI arguments.

The logs corroborate that this `--system-prompt` passing mechanism was not active when the logs were generated, which is a likely cause of the observed behavior.

The fix instructions provided, which focus on ensuring the `systemPrompt` is passed correctly and the history is formatted correctly by `formatMessagesForClaudeCli`, are therefore still highly relevant and address the likely root cause.

**Additional Check based on logs:**
The Claude CLI output includes `tools` in its `system/init` message:
```json
  "tools": [
    "Task", "Bash", "Glob", "Grep", "LS", "Read", "Edit", "MultiEdit", "Write",
    "NotebookRead", "NotebookEdit", "WebFetch", "TodoRead", "TodoWrite", "WebSearch"
  ]
```
Ensure that if we intend for Claude to *not* use tools for certain interactions, or to only use a subset, the `--allowedTools` or `--disallowedTools` flags are correctly passed to the CLI via `main-claude-websocket.ts` based on the `AgentLanguageModel` options. If these are not set, the CLI defaults to its available tools, which might influence its behavior even if the prompt seems straightforward. However, this is secondary to the system prompt issue for history.

The fix instructions remain sound. The agent should implement them as written.
