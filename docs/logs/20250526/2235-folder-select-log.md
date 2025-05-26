# Claude Code Folder Selection Implementation Log

## Date: 2025-05-26
## Time: 22:35

## Task Overview
Implemented a folder selection feature for the Claude Code CLI provider in the Agent Chat pane. This allows users to select an active project folder that will be passed to the Claude Code CLI for better context awareness.

## Implementation Details

### 1. IPC Channel and Type Definitions

#### Files Modified:
- `/src/helpers/ipc/claude_code/claude-code-channels.ts`
- `/src/types.d.ts`

#### Changes:
- Added new IPC channel constant: `CLAUDE_CODE_SELECT_FOLDER_CHANNEL`
- Updated `ClaudeExecParams` interface to include `activeFolder?: string` field
- Added `selectFolder()` method to `ClaudeCodeAPI` interface

### 2. IPC Implementation

#### Files Modified:
- `/src/helpers/ipc/claude_code/claude-code-context.ts`
- `/src/main-claude-websocket.ts`

#### Changes:
- Exposed `selectFolder` method in the renderer process context
- Added IPC handler for folder selection dialog in main process
- Used Electron's `dialog.showOpenDialog` with `openDirectory` property

### 3. State Management

#### Files Created:
- `/src/stores/ai/claudeCodeStore.ts`

#### Features:
- Created Zustand store for Claude Code settings
- Persists `activeFolderPath` to localStorage
- Provides `setActiveFolderPath` action

### 4. UI Updates

#### Files Modified:
- `/src/components/ai/AgentChatPane.tsx`

#### Changes:
- Added folder selection button (FolderOpen icon) that appears only when Claude Code provider is selected
- Button shows tooltip with current selected folder path
- Displays truncated folder path next to the button for quick reference
- Integrated with telemetry for tracking folder selection events

### 5. Chat Orchestration Integration

#### Files Modified:
- `/src/hooks/ai/useAgentChat.ts`
- `/src/services/ai/orchestration/ChatOrchestratorService.ts`

#### Changes:
- Modified `useAgentChat` to retrieve active folder from Claude Code store
- Added active folder to orchestrator options when Claude Code is selected
- Updated all three Claude Code methods (generateText, streamText, generateStructured) to pass activeFolder in IPC calls

### 6. Bridge Service Integration

#### Files Modified:
- `/src/main-claude-websocket.ts`
- `/src/services/claude-bridge-service.js`

#### Changes:
- Modified WebSocket message to include activeFolder parameter
- Updated bridge service to extract activeFolder from request
- Added `--project-path` flag to Claude CLI arguments when activeFolder is present

### 7. Documentation

#### Files Modified:
- `/README.md`

#### Changes:
- Added documentation about the new folder selection feature
- Explained that the folder path is passed as `--project-path` to Claude CLI

## Technical Implementation Notes

1. **IPC Communication Flow**:
   - Renderer → Main Process: Folder selection request
   - Main Process → Renderer: Selected folder path or null
   - Renderer → Main Process: Chat request with activeFolder
   - Main Process → Bridge Service: WebSocket message with activeFolder
   - Bridge Service → Claude CLI: Command with --project-path flag

2. **State Persistence**:
   - The selected folder path is persisted in localStorage via Zustand
   - Survives app restarts for better user experience

3. **UI/UX Considerations**:
   - Button only appears when Claude Code provider is selected
   - Visual feedback with folder icon and current path display
   - Tooltip provides full path on hover
   - Path truncation for long folder names

4. **Error Handling**:
   - Graceful handling of folder selection cancellation
   - Error telemetry for failed folder selections
   - Fallback behavior when IPC API is not available

## Testing Recommendations

1. Test folder selection dialog functionality
2. Verify folder path is correctly passed to Claude CLI
3. Test persistence across app restarts
4. Verify UI updates when switching providers
5. Test with various folder path lengths and special characters

## Future Enhancements

1. Add ability to clear selected folder
2. Show recent folders for quick selection
3. Validate folder exists before passing to CLI
4. Add workspace/project detection (e.g., git root, package.json location)