Okay, I will provide instructions for the coding agent to implement a folder select button in the chat pane, specifically for the Claude Code CLI provider. This button will allow users to select an active folder, and this path will be passed as a parameter to the Claude Code CLI.

**Strategy:**

1.  **UI Enhancement:** Add a "Select Folder" button to the `AgentChatPane` component. This button will be visible and active only when "Claude Code (CLI)" is the selected AI provider.
2.  **IPC for Folder Dialog:** Implement Electron IPC to allow the renderer process to request a folder selection dialog from the main process.
3.  **State Management:** Create a new Zustand store to manage the currently selected active folder path for Claude Code. This path will be persisted.
4.  **Parameter Passing:**
    *   The `ClaudeCodeCliAgentLanguageModelLive` (or the `ChatOrchestratorService` when preparing parameters for it) will read the active folder path from the new store.
    *   This path will be included in the parameters sent via IPC to the main process.
    *   The main process IPC handler (`main-claude-websocket.ts`) will forward this path to the `Claude Bridge Service` via WebSocket.
    *   The `Claude Bridge Service` (`claude-bridge-service.js`) will append this path as a command-line argument (e.g., `--project-path <path>`) when spawning the `@anthropic-ai/claude-code` CLI.
5.  **Documentation Update:** Briefly update `README.md` about this new feature.

---

**Instructions for the Coding Agent:**

**Step 1: Define New IPC Channels and Update Types**

1.  **File:** `src/helpers/ipc/claude_code/claude-code-channels.ts`
    *   Add a new channel constant:
        ```typescript
        export const CLAUDE_CODE_SELECT_FOLDER_CHANNEL = "claude-code:select-folder";
        // Update the exported object:
        export const claudeCodeChannels = {
          chatCompletion: CLAUDE_CODE_CHAT_COMPLETION_CHANNEL,
          chatStream: CLAUDE_CODE_CHAT_STREAM_CHANNEL,
          selectFolder: CLAUDE_CODE_SELECT_FOLDER_CHANNEL, // Add this
        };
        ```

2.  **File:** `src/types.d.ts`
    *   Update the `ClaudeExecParams` interface to include the active folder path:
        ```typescript
        interface ClaudeExecParams {
          messages: Array<{role: string; content: string}>;
          model?: string;
          max_tokens?: number;
          temperature?: number;
          sessionId?: string;
          activeFolder?: string; // New field for the active folder path
          [key: string]: any;
        }
        ```
    *   Update the `ClaudeCodeAPI` interface in `ElectronAPI`:
        ```typescript
        interface ClaudeCodeAPI {
          // ... existing methods ...
          selectFolder: () => Promise<string | null>; // Add this method
        }
        ```

**Step 2: Implement IPC for Folder Selection**

1.  **File:** `src/helpers/ipc/claude_code/claude-code-context.ts`
    *   Update `exposeClaudeCodeContext` to include the `selectFolder` function:
        ```typescript
        // ... inside exposeClaudeCodeContext function, within the electronAPI.claudeCode object ...
        selectFolder: (): Promise<string | null> => // Add this method
          ipcRenderer.invoke(claudeCodeChannels.selectFolder),
        // ...
        ```

2.  **File:** `src/main-claude-websocket.ts`
    *   Import `dialog` from `electron`.
    *   Add a new IPC handler within the `setupClaudeWebSocketHandler` function (or if it's better placed, ensure it's registered when other Claude-related IPC handlers are set up in `main.ts`):
        ```typescript
        // At the top of main-claude-websocket.ts or in main.ts where IPC handlers are set up
        import { dialog } from 'electron'; // Add this import if not present
        // ...

        // Within setupClaudeWebSocketHandler or ensure it's registered similarly
        ipcMain.handle("claude-code:select-folder", async () => {
          console.log("[Main Process] Received claude-code:select-folder request");
          const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'dontAddToRecent']
          });
          if (!result.canceled && result.filePaths.length > 0) {
            console.log("[Main Process] Folder selected:", result.filePaths[0]);
            return result.filePaths[0];
          }
          console.log("[Main Process] Folder selection cancelled or no path selected.");
          return null;
        });
        ```

**Step 3: Create Zustand Store for Claude Code Settings**

1.  **Create File:** `src/stores/ai/claudeCodeStore.ts`
    *   **Content:**
        ```typescript
        import { create } from "zustand";
        import { persist, createJSONStorage } from "zustand/middleware";

        interface ClaudeCodeState {
          activeFolderPath: string | null;
          setActiveFolderPath: (path: string | null) => void;
        }

        export const useClaudeCodeStore = create<ClaudeCodeState>()(
          persist(
            (set) => ({
              activeFolderPath: null,
              setActiveFolderPath: (path) => {
                console.log("[ClaudeCodeStore] Setting active folder path:", path);
                set({ activeFolderPath: path });
              },
            }),
            {
              name: "commander-claude-code-settings",
              storage: createJSONStorage(() => localStorage),
            }
          )
        );
        ```

**Step 4: Update UI (`AgentChatPane.tsx`)**

1.  **File:** `src/components/ai/AgentChatPane.tsx`
    *   Import `FolderOpen` icon from `lucide-react`.
    *   Import `useClaudeCodeStore`.
    *   Add state for the selected folder and UI logic for the button.

    ```typescript
    // ... other imports ...
    import { FolderOpen } from "lucide-react";
    import { useClaudeCodeStore } from "@/stores/ai/claudeCodeStore";
    import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // If not already imported

    // ... inside AgentChatPane component ...
    const { activeFolderPath, setActiveFolderPath } = useClaudeCodeStore();

    const handleSelectFolder = async () => {
      if (window.electronAPI?.claudeCode?.selectFolder) {
        try {
          const folderPath = await window.electronAPI.claudeCode.selectFolder();
          if (folderPath) {
            setActiveFolderPath(folderPath);
            Effect.runFork(
              Effect.flatMap(TelemetryService, (ts) =>
                ts.trackEvent({
                  category: "ui:agent_chat",
                  action: "claude_code_folder_selected",
                  label: folderPath,
                }),
              ).pipe(Effect.provide(runtime)), // Assuming runtime is available
            );
          }
        } catch (error) {
          console.error("Error selecting folder:", error);
          Effect.runFork(
            Effect.flatMap(TelemetryService, (ts) =>
              ts.trackEvent({
                category: "ui:agent_chat:error",
                action: "claude_code_folder_selection_failed",
                label: error instanceof Error ? error.message : String(error),
              }),
            ).pipe(Effect.provide(runtime)),
          );
        }
      } else {
        console.warn("selectFolder API not available on window.electronAPI.claudeCode");
      }
    };

    const isClaudeCodeProviderSelected = selectedProviderKey === "claude_code";

    // ... in the JSX, near the provider selection ...
    // Example location: inside the div with class "flex items-center gap-2 text-xs"

    {/* ... existing Provider Select and Model display ... */}
    {isClaudeCodeProviderSelected && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 ml-2"
              onClick={handleSelectFolder}
              title="Select Active Folder for Claude Code"
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select Active Folder for Claude Code</p>
            {activeFolderPath && <p className="text-xs text-muted-foreground mt-1">Current: {activeFolderPath.length > 30 ? `...${activeFolderPath.slice(-27)}` : activeFolderPath}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
    // Also, might want to display the selected folder path:
    {isClaudeCodeProviderSelected && activeFolderPath && (
      <div className="ml-2 text-[10px] text-muted-foreground truncate max-w-[150px]" title={activeFolderPath}>
        Folder: {activeFolderPath.length > 20 ? `...${activeFolderPath.slice(-17)}` : activeFolderPath}
      </div>
    )}
    ```

**Step 5: Pass `activeFolder` to `ChatOrchestratorService` and `ClaudeCodeCliAgentLanguageModelLive`**

1.  **File:** `src/hooks/ai/useAgentChat.ts`
    *   Import `useClaudeCodeStore`.
    *   When calling `chatOrchestrator.streamConversation` or `generateConversationResponse`, if the selected provider is `claude_code`, get `activeFolderPath` from the store and pass it in the `options` or as part of a modified `ClaudeExecParams` structure.

    ```typescript
    // ... in useAgentChat.ts ...
    const { activeFolderPath: claudeActiveFolder } = useClaudeCodeStore.getState(); // Get state directly

    // ... inside sendMessage function, before calling orchestrator ...
    const orchestratorOptions: Parameters<ChatOrchestratorService['streamConversation']>[0]['options'] = {
      temperature: 0.7, // Example option
      maxTokens: 2048,  // Example option
      sessionId: sessionId,
      // Add activeFolder if Claude Code is selected and folder is set
      ...(selectedProviderKey === "claude_code" && claudeActiveFolder && { activeFolder: claudeActiveFolder }),
    } as any; // Cast to any to allow extra properties for now
    ```

2.  **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`
    *   The `getProviderLanguageModel` (or `getResolvedAiModelProvider`) helper for the `"claude_code"` case needs to accept and use the `activeFolder` from the options.
    *   The `makeAgentLanguageModel` for Claude Code CLI will receive this `activeFolder` in its `options` and should pass it in the IPC call.

    ```typescript
    // ... Inside ChatOrchestratorServiceLive -> getProviderLanguageModel -> case "claude_code": ...
    // The `options` parameter passed to `streamConversation` or `generateConversationResponse`
    // might now contain `activeFolder`. Extract it.
    // Example: options.activeFolder if it's directly passed
    // ...

    // Modify the IPC call within claudeCodeAgentLM to include activeFolder:
    // generateText and generateStructured would be similar
    streamText: (options: StreamTextOptions) => {
      // ... parse messages ...
      const ipcParams: ClaudeExecParams = {
        messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
        model: options.model || "claude-sonnet", // Or your configured default
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        sessionId: (options as any).sessionId, // Assuming sessionId is passed in options
        activeFolder: (options as any).activeFolder, // <<< Pass it here
      };
      // ... rest of streamText implementation using window.electronAPI.claudeCode.streamChat(ipcParams, ...)
    }
    ```

**Step 6: Modify Main Process IPC Handler and Bridge Service**

1.  **File:** `src/main-claude-websocket.ts` (`setupClaudeWebSocketHandler`)
    *   The handler for `"claude-code:chat-stream"` receives `params: ClaudeExecParams` which now may contain `activeFolder`.
    *   When sending the message to the `Claude Bridge Service` via WebSocket, include this `activeFolder`.

    ```javascript
    // ... inside ipcMain.on("claude-code:chat-stream", ...) handler ...
    // The `params` object from the renderer now includes `activeFolder`
    ws.send(JSON.stringify({
      id: requestId,
      args, // existing args array
      activeFolder: params.activeFolder // Forward the activeFolder
    }));
    ```

2.  **File:** `src/services/claude-bridge-service.js`
    *   The WebSocket server needs to parse `activeFolder` from the incoming message.
    *   When spawning the `@anthropic-ai/claude-code` CLI with `node-pty`, if `activeFolder` is present, add it as a command-line argument. Let's assume the CLI flag is `--project-path`.

    ```javascript
    // ... inside ws.on('message', ...) handler ...
    const { id, args, activeFolder } = request; // Destructure activeFolder

    // ...
    const claudeArgs = [...args]; // These are the args like ["-p", prompt, ...]
    if (activeFolder) {
      claudeArgs.push("--project-path", activeFolder); // Add the project path flag
      log(`Using active folder for Claude CLI: ${activeFolder}`);
    }
    // ...
    const ptyProcess = pty.spawn(claudePath, claudeArgs, { /* ... existing options ... */ });
    ```

**Step 7: Update Documentation (`README.md`)**

1.  **File:** `README.md`
    *   Under the "Claude Code Integration" section, add a point about the new folder selection feature:
        ```markdown
        ### Claude Code Integration

        To use Claude Code as an AI provider, you need to:

        1. Install the Claude CLI: `npm install -g @anthropic-ai/claude-code`
        2. Authenticate: `claude auth`
        3. **(New)** When "Claude Code (CLI)" is selected in the `AgentChatPane`, a folder icon button will appear. Click this to select an active project folder. This folder path will be passed to the Claude Code CLI (as `--project-path <path>`) for context.

        The bridge service (`claude-bridge-service.js`) is automatically started when you run `pnpm start` if you want to use Claude Code as a provider.
        ...
        ```

---

This set of instructions covers the necessary changes from UI to CLI execution for the folder selection feature. The coding agent will need to carefully implement the IPC message passing, state management, and CLI argument modification. The specific CLI flag (`--project-path`) is assumed; if the actual Claude Code CLI uses a different flag or mechanism for project context, that should be used instead.
