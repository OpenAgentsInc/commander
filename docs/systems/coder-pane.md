# Coder Pane System Architecture

## Table of Contents
1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component & Module Breakdown](#component--module-breakdown)
    3.1. [Core Hook (`useCoderChat`)](#core-hook-usecoderchat)
    3.2. [Main Component (`CoderPane`)](#main-component-coderpane)
    3.3. [Input Component (`CoderProseMirrorInput`)](#input-component-coderprosemirrorinput)
    3.4. [Message Display Components](#message-display-components)
    3.5. [Tool Display Components](#tool-display-components)
4. [State Management & Data Flow](#state-management--data-flow)
    4.1. [Session Management](#session-management)
    4.2. [Message Streaming](#message-streaming)
    4.3. [Tool Call Handling](#tool-call-handling)
5. [User Interactions](#user-interactions)
    5.1. [Creating New Chat Sessions](#creating-new-chat-sessions)
    5.2. [Loading Chat History](#loading-chat-history)
    5.3. [Sending Messages](#sending-messages)
    5.4. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Database Integration](#database-integration)
7. [Styling and Appearance](#styling-and-appearance)
8. [Testing Considerations](#testing-considerations)
9. [Future Enhancements](#future-enhancements)

## 1. Overview

The Coder Pane is a specialized chat interface within OpenAgents Commander that provides an AI-powered coding assistant experience through Claude Code. It's designed as a draggable, resizable pane that can be opened multiple times with independent sessions, allowing users to maintain multiple coding conversations simultaneously.

**Key Features:**

- **AI-Powered Assistance:** Direct integration with Claude Code API for intelligent coding help
- **Tool Use Display:** Visual representation of Claude's tool calls (file operations, searches, etc.)
- **Session Persistence:** All conversations are saved to a local database and can be reloaded
- **Multi-Instance Support:** Multiple coder panes can run independently with different sessions
- **ProseMirror Editor:** Rich text input with multi-line support (Shift+Enter for new lines) and dynamic height resizing
- **History Management:** Dropdown menu showing recent chat sessions with quick-load functionality
- **Streaming Responses:** Real-time display of Claude's responses as they're generated
- **Keyboard Navigation:** Escape to close, Cmd/Ctrl+Click for opening in new panes

## 2. Architecture Diagram

```
+--------------------------------+      +--------------------------------+      +-----------------------------+
| User Actions                   |----->| CoderPane Component            |----->| useCoderChat Hook           |
| (Type message, click button,   |      | (UI orchestration,             |      | (Chat logic, state mgmt,    |
|  select from history, Esc key) |      |  menu handling, telemetry)     |      |  API calls, DB operations)  |
+--------------------------------+      +--------------------------------+      +-------------+---------------+
                                                    |                                         |
                                                    | Renders                                 | Updates
                                                    v                                         v
                                          +---------+----------+                    +---------+----------+
                                          | UI Components      |                    | Local State        |
                                          | - CoderMessageList |                    | - messages[]       |
                                          | - CoderMessage     |                    | - isLoading        |
                                          | - CoderProseMirror |                    | - focusKey         |
                                          +--------------------+                    | - sessionIdRef     |
                                                    |                               +--------------------+
                                                    | Displays                                |
                                                    v                                         v
                                          +--------------------+                    +--------------------+
                                          | Content Types      |                    | External Services  |
                                          | - Text messages    |<------------------>| - Claude Code API  |
                                          | - Tool calls       |                    | - DatabaseService  |
                                          | - Tool results     |                    | - TelemetryService |
                                          | - Streaming status |                    +--------------------+
                                          +--------------------+
```

## 3. Component & Module Breakdown

### 3.1. Core Hook (`useCoderChat`)

Located at `src/hooks/coder/useCoderChat.ts`, this custom hook encapsulates all chat-related logic:

```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // Full textual content for DB
  parts?: Array< // For UI rendering
    | { type: 'text'; text: string }
    | { type: 'tool_call'; id: string; name: string; input: Record<string, any> }
    | { type: 'tool_result'; tool_use_id: string; content: any; isError?: boolean; isLoading?: boolean }
  >;
  timestamp: number;
  isStreaming?: boolean;
}

interface UseCoderChatProps {
  paneId: string;
  initialSessionId?: string;
}

export function useCoderChat(props: UseCoderChatProps) {
  // Returns:
  // - messages: ChatMessage[]
  // - isLoading: boolean
  // - focusKey: number (for triggering editor re-focus)
  // - sendMessage: (content: string) => Promise<void>
  // - loadMessagesForSession: (sessionId: string) => Promise<void>
  // - clearMessagesAndSession: () => string (returns new session ID)
}
```

**Key Responsibilities:**

- **State Management:** Maintains local React state for messages, loading status, and focus control
- **Session Tracking:** Uses refs to track current session ID and prevent duplicate loads
- **Message Operations:** Provides functions to add, update, and clear messages
- **API Integration:** Handles streaming chat with Claude Code via `window.electronAPI.claudeCode.streamChat`
- **Database Operations:** Loads historical messages and saves new conversations using Effect and DatabaseService
- **Stream Management:** Tracks active streams with cancellation support

**Implementation Details:**

- Uses Effect library for functional programming patterns in database operations
- Implements intelligent message rehydration from database, handling both legacy and structured content formats
- Manages tool call/result pairing for proper UI display
- Provides automatic session ID generation with timestamp and random suffix pattern

### 3.2. Main Component (`CoderPane`)

Located at `src/components/coder/CoderPane.tsx`, this is the main orchestrator component:

```typescript
export interface CoderPaneProps {
  paneId: string;
  sessionId?: string; // Passed from pane content
  titleBarButtonsRef?: { current: any; set: (value: any) => void }; // For dynamic title bar
}
```

**Key Responsibilities:**

- **Hook Integration:** Uses `useCoderChat` for all chat functionality
- **UI Layout:** Structures the pane with message list and input areas
- **Menu Management:** Creates and manages the History dropdown menu in the title bar
- **Telemetry:** Tracks user interactions (opening, closing, new chats)
- **Keyboard Handling:** Implements Escape key to close functionality
- **Multi-Pane Support:** Handles Cmd/Ctrl+Click for opening items in new panes

**Title Bar Features:**

- **New Chat Button:** Creates fresh session, supports Cmd/Ctrl+Click for new pane
- **History Menu:** Shows 5 most recent sessions with timestamps and preview
  - Format: "MM/DD/YY HH:MM | session-id..."
  - Normal click: Load in current pane
  - Cmd/Ctrl+Click: Open in new pane

### 3.3. Input Component (`CoderProseMirrorInput`)

Located at `src/components/coder/CoderProseMirrorInput.tsx`, handles rich text input:

```typescript
interface CoderProseMirrorInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  focusKey?: number; // To trigger re-focus
}
```

**Key Features:**

- **ProseMirror Integration:** Lazy-loaded for performance
- **Multi-line Support:** Enter submits, Shift+Enter adds line break
- **Dynamic Height:** Starts at 1 line (44px), expands up to 5 lines (124px), then scrolls
- **Auto-focus:** Maintains focus after operations like new chat or history load
- **Text Serialization:** Preserves line breaks and formatting when extracting text
- **Visual Feedback:** Opacity changes when disabled during streaming

**Implementation Details:**

- Uses `@handlewithcare/react-prosemirror` for React integration
- Custom keymap for Enter/Shift+Enter handling
- Document serialization preserves paragraph structure and hard breaks
- RequestAnimationFrame used for reliable focus management
- Dynamic sizing: `minHeight: 44px`, `maxHeight: 124px`, `overflowY: auto`
- Height calculations based on line height (20px) + padding (24px total)

### 3.4. Message Display Components

#### CoderMessage (`src/components/coder/CoderMessage.tsx`)

Renders individual chat messages with appropriate formatting:

```typescript
interface CoderMessageProps {
  message: ChatMessage;
  index: number;
}
```

**Features:**

- **Part-based Rendering:** Handles text, tool calls, and tool results differently
- **Copy Functionality:** Hover-activated copy button for full message content
- **Streaming Indicator:** Shows "Claude Code is working" with spinner
- **Role-based Styling:** Different appearance for user vs assistant messages

#### CoderMessageList (`src/components/coder/CoderMessageList.tsx`)

Manages the scrollable message container:

```typescript
interface CoderMessageListProps {
  messages: ChatMessage[];
  containerRef: React.RefObject<HTMLDivElement>;
  handleScroll: () => void;
  handleTouchStart: () => void;
  isStreamingLastMessage: boolean;
}
```

**Features:**

- **Auto-scroll Integration:** Works with `useAutoScroll` hook
- **System Message Filtering:** Hides internal system messages from view
- **Responsive Layout:** Centers content with max-width constraint

### 3.5. Tool Display Components

#### ToolCallDisplay (`src/components/coder/ToolCallDisplay.tsx`)

Shows Claude's tool invocations:

- Displays tool name and parameters in a collapsible format
- Loading state with spinner while tool executes
- Syntax highlighting for JSON parameters

#### ToolResultDisplay (`src/components/coder/ToolResultDisplay.tsx`)

Shows results from tool executions:

- Success/error state visualization
- Collapsible content for large results
- Special formatting for different content types (file contents, errors, etc.)

## 4. State Management & Data Flow

### 4.1. Session Management

Sessions follow a specific lifecycle:

1. **Creation:** Generated with format `ui-coder-${timestamp}-${random}`
2. **Storage:** Saved in component refs and pane content
3. **Persistence:** Written to database after each message exchange
4. **Restoration:** Loaded from database with full message history and tool executions

**Session ID Flow:**
- `initialSessionId` (prop) → `sessionIdRef` (current) → `lastLoadedSessionIdRef` (tracking)
- Prevents duplicate loads and ensures consistent state

### 4.2. Message Streaming

The streaming process for Claude's responses:

1. **Initiation:** User message triggers `sendMessage()`
2. **Placeholder Creation:** Assistant message with `isStreaming: true`
3. **Chunk Processing:** 
   ```typescript
   // Chunks can be plain text or structured data
   { type: 'text', text: '...' }
   { type: 'tool_call', id: '...', name: '...', parameters: {...} }
   { type: 'tool_result', tool_use_id: '...', content: {...} }
   ```
4. **Message Updates:** Parts array built incrementally, content accumulated for DB
5. **Completion:** `isStreaming: false`, final state saved

### 4.3. Tool Call Handling

Tool calls follow a specific pattern:

1. **Tool Call Receipt:** Structured data with unique ID
2. **UI Update:** `ToolCallDisplay` shows immediately with loading state
3. **Result Association:** Results matched by `tool_use_id`
4. **Display Update:** `ToolResultDisplay` replaces loading state

**Database Storage:**
- Tool calls stored in `tool_calls_json` column
- Results stored in separate `tool_executions` table
- Rehydration reconstructs the full interaction

## 5. User Interactions

### 5.1. Creating New Chat Sessions

**Standard New Chat:**
1. Click "New Chat" button
2. Current session saved to `closedPanePositions`
3. New session ID generated
4. Messages cleared, editor focused

**New Chat in New Pane (Cmd/Ctrl+Click):**
1. Hold Cmd/Ctrl while clicking
2. New pane created at offset position
3. Fresh session started in new pane
4. Original pane unchanged

### 5.2. Loading Chat History

**From History Menu:**
1. Click "History" dropdown
2. Menu fetches 5 most recent sessions
3. Select session to load
4. Messages and tool executions restored
5. Scroll to bottom, focus editor

**Via Session ID (Programmatic):**
1. Pane created with specific `sessionId` in content
2. `useEffect` triggers load on mount
3. Full conversation restored

### 5.3. Sending Messages

1. Type in ProseMirror editor (multi-line supported)
2. Press Enter to send (Shift+Enter for new line)
3. Message added to UI immediately
4. Streaming response begins
5. Tool calls/results displayed as received
6. Final message saved to database

### 5.4. Keyboard Shortcuts

- **Escape:** Close the coder pane (when focused)
- **Enter:** Send message
- **Shift+Enter:** New line in message
- **Cmd/Ctrl+Click:** Open items in new pane (buttons and menu items)

## 6. Database Integration

The Coder Pane integrates deeply with the DatabaseService:

**Tables Used:**
- `sessions`: Stores session metadata
- `messages`: Stores all messages with role, content, and timestamps
- `tool_executions`: Stores tool call details and results

**Key Operations:**

```typescript
// Loading messages for a session
db.getMessagesForSession(sessionId, limit)

// Getting tool executions for messages
db.getToolCallsForMessage(messageId)

// Saving is handled by Claude Code bridge service
// which writes to DB after processing
```

**Message Content Formats:**

1. **Plain Text:** Simple string content
2. **Structured Parts:** JSON with `{ parts: [...] }` for complex messages
3. **Legacy Tool Calls:** Separate `tool_calls_json` column
4. **Modern Format:** Array of typed parts in content field

## 7. Styling and Appearance

The Coder Pane has distinct visual styling:

**Container:**
- Black background with high opacity
- Full height flex layout
- Custom scrollbar styling

**Messages:**
- User messages: 80% max width, white border
- Assistant messages: 100% width, no border
- Monospace font throughout
- White text on black background

**Tool Displays:**
- Muted borders and backgrounds
- Collapsible with smooth transitions
- Syntax highlighting for code/JSON

**Editor:**
- Dynamic height: starts at 44px (1 line), expands up to 124px (5 lines)
- Internal scrolling when content exceeds 5 lines
- White border
- 750px max width (matching message area)
- Opacity feedback when disabled

**CSS-in-JS Styles:**
The component includes embedded styles for prose formatting, ensuring consistent appearance across all message types.

## 8. Testing Considerations

**Unit Tests:**
- `useCoderChat` hook logic (state updates, API calls)
- Message parsing and formatting functions
- Session ID generation and validation

**Integration Tests:**
- Database operations (save/load cycles)
- Streaming message handling
- Tool call/result association

**E2E Tests:**
- Full conversation flow
- History menu interactions
- Multi-pane scenarios
- Keyboard shortcuts

**Key Test Scenarios:**
1. Create new chat → Send message → Receive response → Close → Reopen → Verify persistence
2. Open history → Load session → Verify content → Send follow-up
3. Cmd+Click new chat → Verify independent panes
4. Stream interruption → Verify graceful handling

## 9. Future Enhancements

**Potential Improvements:**

1. **Search Functionality:** Search across all chat history
2. **Export Options:** Save conversations as markdown/PDF
3. **Model Selection:** Choose between different Claude models
4. **Code Block Actions:** Copy, run, or save code snippets directly
5. **Collaborative Sessions:** Share sessions with team members
6. **Voice Input:** Dictate messages instead of typing
7. **Theme Customization:** Light mode support, font size options
8. **Performance Optimization:** Virtual scrolling for very long conversations
9. **Advanced Tool Displays:** Interactive file trees, inline editors
10. **Session Templates:** Pre-configured prompts for common tasks

**Technical Debt:**
- Consolidate message format handling (legacy vs modern)
- Optimize database queries for large histories
- Implement message pagination for performance
- Add retry logic for failed API calls

The Coder Pane represents a sophisticated integration of AI assistance, real-time streaming, persistent storage, and intuitive UI design, providing developers with a powerful tool for AI-assisted coding within the OpenAgents Commander environment.