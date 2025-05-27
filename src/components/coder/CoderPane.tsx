import React, { useState, useRef, useCallback, useEffect, lazy, Suspense, useMemo } from 'react';
import { Effect, Exit, Cause } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { getMainRuntime } from '@/services/runtime';
import { usePaneStore } from '@/stores/pane';
import { EditorState, Plugin } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";
import { history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { ChatMessage as UIChatMessage, type Message } from '@/components/ui/chat-message';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { ToolCallDisplay } from './ToolCallDisplay';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { DatabaseService, DBSession } from '@/services/db';
import { PaneDropdownItem } from '@/types/paneMenu';
import { CODER_PANE_ID } from '@/stores/panes/constants';

// Local message interface - each pane has its own messages
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: Array<
    | { type: 'text'; text: string }
    | { type: 'tool_call'; id: string; name: string; input: Record<string, any> }
    | { type: 'tool_result'; tool_use_id: string; content: any; isError?: boolean; isLoading?: boolean }
  >;
  timestamp: number;
  isStreaming?: boolean;
}

// ProseMirror Editor component that's loaded after the dynamic import
const ProseMirrorEditor: React.FC<{ onSubmit: (text: string) => void, disabled?: boolean, focusKey?: number }> = ({ onSubmit, disabled, focusKey }) => {
  const [components, setComponents] = useState<any>(null);

  useEffect(() => {
    // Load ProseMirror components
    import("@handlewithcare/react-prosemirror").then(module => {
      setComponents({
        ProseMirror: module.ProseMirror,
        ProseMirrorDoc: module.ProseMirrorDoc,
        reactKeys: module.reactKeys,
        useEditorEffect: module.useEditorEffect,
        useEditorEventListener: module.useEditorEventListener,
        useEditorState: module.useEditorState,
      });
    });
  }, []);

  if (!components) {
    return null;
  }

  const { ProseMirror, ProseMirrorDoc, reactKeys } = components;

  // Create custom keymap for handling Enter and Shift+Enter
  const customKeymap = keymap({
    "Enter": (state, dispatch, view) => {
      // Plain Enter submits
      return false; // Let our event listener handle it
    },
    "Shift-Enter": (state, dispatch) => {
      // Shift+Enter inserts a line break
      if (dispatch) {
        const br = schema.nodes.hard_break.create();
        const tr = state.tr.replaceSelectionWith(br).scrollIntoView();
        dispatch(tr);
      }
      return true;
    }
  });

  return (
    <ProseMirror
      defaultState={EditorState.create({
        schema,
        plugins: [
          history(),
          keymap(baseKeymap),
          customKeymap,
          reactKeys(),
        ],
      })}
    >
      <AutoFocusEditor
        onSubmit={onSubmit}
        disabled={disabled}
        components={components}
        focusKey={focusKey}
      />
    </ProseMirror>
  );
};

// Component that autofocuses the editor and fills container
const AutoFocusEditor: React.FC<{
  onSubmit: (text: string) => void,
  disabled?: boolean,
  components: any,
  focusKey?: number
}> = ({ onSubmit, disabled, components, focusKey }) => {
  const { useEditorState, useEditorEffect, useEditorEventListener, ProseMirrorDoc } = components;
  const editorState = useEditorState();

  useEditorEffect((view: any) => {
    if (view && !disabled) {
      view.focus();
    }
  }, [disabled]);

  // Re-focus when focusKey changes (e.g., after clicking New Chat or loading history)
  useEditorEffect((view: any) => {
    if (view && focusKey !== undefined && !disabled) {
      // Use requestAnimationFrame to ensure focus happens after any pending updates
      requestAnimationFrame(() => {
        if (view && view.focus) {
          view.focus();
          // Also ensure the view is scrolled into view if needed
          view.dom.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  }, [focusKey, disabled]);

  // Function to serialize document to text with line breaks
  const serializeDocToText = (doc: any) => {
    let text = "";
    let isFirstParagraph = true;

    doc.forEach((node: any, offset: number, index: number) => {
      if (node.type.name === "paragraph") {
        if (!isFirstParagraph) {
          text += "\n";
        }
        isFirstParagraph = false;

        node.forEach((child: any) => {
          if (child.isText) {
            text += child.text;
          } else if (child.type.name === "hard_break") {
            text += "\n";
          }
        });
      }
    });

    return text;
  };

  // Handle Enter (submit) - Shift+Enter is handled by the keymap
  useEditorEventListener("keydown", (view: any, event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && !disabled) {
      event.preventDefault();

      // Get the text content from the editor, preserving line breaks
      const text = serializeDocToText(view.state.doc);

      if (text.trim()) {
        // Submit the message
        onSubmit(text);

        // Clear the editor
        const tr = view.state.tr.delete(0, view.state.doc.content.size);
        view.dispatch(tr);
      }

      return true;
    }
    return false;
  });

  return (
    <ProseMirrorDoc
      as={
        <div
          className="p-4 prose prose-invert h-full w-full outline-none text-white box-border"
          spellCheck={false}
          style={{
            minHeight: '100%',
            padding: '12px',
            opacity: disabled ? 0.5 : 1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.875rem', // 14px - equivalent to text-sm
            lineHeight: '1.25rem' // 20px - matching text-sm line height
          }}
        />
      }
    />
  );
};

// Simple message interface for chat history
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // Holds full textual content for DB
  parts?: Array< // For UI rendering
    | { type: 'text'; text: string }
    | { type: 'tool_call'; id: string; name: string; input: Record<string, any> }
    | { type: 'tool_result'; tool_use_id: string; content: any; isError?: boolean; isLoading?: boolean }
  >;
  timestamp: number;
  isStreaming?: boolean;
}

// Custom styled ChatMessage component wrapper
const CoderChatMessage: React.FC<{ message: ChatMessage; index: number }> = ({ message, index }) => {
  // Extract text content for the content prop
  const textContent = React.useMemo(() => {
    if (!message.parts || message.parts.length === 0) return message.content;

    // When we have parts, only use text from the parts, not the accumulated content
    let textParts = message.parts
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('');

    // Remove [Result: ...] sections to avoid duplication
    textParts = textParts.replace(/\[Result:\s*[\s\S]*?\]/g, '').trim();

    return textParts; // Don't fall back to message.content when we have parts
  }, [message.parts, message.content]);

  // Create parts array for UIChatMessage - it expects a specific format
  const messageParts = React.useMemo(() => {
    if (!message.parts || message.parts.length === 0) return undefined;

    const parts: any[] = [];
    const toolCalls = new Map<string, any>();
    const toolResults = new Map<string, any>();

    // First pass: collect tool calls and results
    message.parts.forEach(part => {
      if (part.type === 'tool_call') {
        toolCalls.set(part.id, part);
      } else if (part.type === 'tool_result') {
        toolResults.set(part.tool_use_id, part);
      }
    });

    // Second pass: build parts array
    message.parts.forEach(part => {
      if (part.type === 'text') {
        // Filter out [Result: ...] sections from text parts
        const cleanedText = part.text.replace(/\[Result:\s*[\s\S]*?\]/g, '').trim();
        if (cleanedText) {
          parts.push({ type: 'text' as const, text: cleanedText });
        }
      } else if (part.type === 'tool_call') {
        // Check if we have a result for this tool call
        const hasResult = toolResults.has(part.id);
        const result = toolResults.get(part.id);

        parts.push({
          type: 'tool-invocation' as const,
          toolInvocation: {
            state: hasResult ? 'result' as const : 'call' as const,
            toolName: part.name,
            toolCallId: part.id,
            args: part.input,
            result: hasResult ? result.content : undefined
          }
        });
      }
      // Skip tool_result parts as they're already handled above
    });

    return parts.length > 0 ? parts : undefined;
  }, [message.parts]);

  // Get tool results map
  const toolResults = React.useMemo(() => {
    const results = new Map<string, any>();
    if (message.parts) {
      message.parts.forEach(part => {
        if (part.type === 'tool_result') {
          results.set(part.tool_use_id, part);
        }
      });
    }
    return results;
  }, [message.parts]);

  // Render custom tool displays for better UX
  const renderParts = () => {
    if (!message.parts || message.parts.length === 0) return null;

    return message.parts.map((part, idx) => {
      if (part.type === 'text' && part.text) {
        // Filter out [Result: ...] sections
        const cleanedText = part.text.replace(/\[Result:\s*[\s\S]*?\]/g, '').trim();
        if (!cleanedText) return null;

        return (
          <div key={`text-${idx}`} className="prose prose-invert max-w-none">
            <UIChatMessage
              id={`${message.id}-text-${idx}`}
              role={message.role === 'user' ? 'user' : 'assistant'}
              content={cleanedText}
              animation="none"
              showTimeStamp={false}
            />
          </div>
        );
      } else if (part.type === 'tool_call') {
        const hasResult = toolResults.has(part.id);
        const result = toolResults.get(part.id);

        return (
          <div key={`tool-${idx}`} className="space-y-1">
            <ToolCallDisplay
              toolName={part.name}
              args={part.input}
              isLoading={!hasResult}
            />
            {hasResult && result && (
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm ml-6">
                <div className="text-xs text-muted-foreground mb-1">Result:</div>
                <div className="whitespace-pre-wrap text-foreground">
                  {typeof result.content === 'string'
                    ? result.content
                    : JSON.stringify(result.content, null, 2)}
                </div>
              </div>
            )}
          </div>
        );
      } else if (part.type === 'tool_result') {
        // Tool results are shown with their corresponding tool call
        return null;
      }
      return null;
    });
  };

  // Use custom rendering if we have parts, otherwise use standard UIChatMessage
  if (message.parts && message.parts.length > 0) {
    return (
      <div className={`coder-chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'} space-y-2`}>
        {renderParts()}
        {message.isStreaming && message.role === 'assistant' && (
          <span className="inline-block w-2 h-4 ml-1 mt-2 bg-white animate-pulse" />
        )}
      </div>
    );
  }

  // Fallback to standard display for messages without parts
  return (
    <div className={`coder-chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
      <UIChatMessage
        id={message.id}
        role={message.role === 'user' ? 'user' : 'assistant'}
        content={textContent}
        animation="none"
        showTimeStamp={false}
      />
      {message.isStreaming && message.role === 'assistant' && (
        <span className="inline-block w-2 h-4 ml-1 mt-2 bg-white animate-pulse" />
      )}
    </div>
  );
};

export interface CoderPaneProps {
  paneId: string; // The pane's ID
  sessionId?: string; // Passed from pane content
  titleBarButtonsRef?: { current: any; set: (value: any) => void }; // Ref to set title bar buttons and menus
}

const CoderPane: React.FC<CoderPaneProps> = ({ paneId, sessionId: initialSessionId, titleBarButtonsRef }) => {
  const runtime = getMainRuntime(); // For telemetry
  const removePane = usePaneStore((state) => state.removePane);
  const updatePaneSize = usePaneStore((state) => state.updatePaneSize);
  const updatePaneContent = usePaneStore((state) => state.updatePaneContent);

  // This component doesn't need to find itself in panes - remove this line

  // Track the current session ID separately from initial
  const sessionIdRef = useRef<string>(initialSessionId || `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  const lastLoadedSessionIdRef = useRef<string | null>(null);
  
  // Local state for messages - each pane has its own
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'system',
      role: 'system',
      content: 'You are Claude Code, a helpful AI coding assistant.',
      timestamp: Date.now(),
    }
  ]);

  // Message management functions
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage> | ((prevMessage: ChatMessage) => Partial<ChatMessage>)) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === id) {
        const newUpdates = typeof updates === 'function' ? updates(msg) : updates;
        return { ...msg, ...newUpdates };
      }
      return msg;
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([{
      id: 'system',
      role: 'system',
      content: 'You are Claude Code, a helpful AI coding assistant.',
      timestamp: Date.now(),
    }]);
  }, []);

  // Local state for loading and focus
  const [isLoading, setIsLoading] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const streamCancelRef = useRef<(() => void) | null>(null);

  // Auto-scroll hook
  const {
    containerRef,
    scrollToBottom,
    handleScroll,
    shouldAutoScroll,
    handleTouchStart,
  } = useAutoScroll([messages]);


  const handleExitCoderMode = React.useCallback(() => {
    // Cancel any ongoing stream
    if (streamCancelRef.current) {
      streamCancelRef.current();
      streamCancelRef.current = null;
    }

    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: 'coder_mode',
          action: 'exit_coder_mode_escape',
        }),
      ).pipe(Effect.provide(runtime)),
    );
    // Close the coder pane
    removePane('coder_pane');
  }, [removePane, runtime]);

  const handleNewChat = React.useCallback(() => {
    // Cancel any ongoing stream
    if (streamCancelRef.current) {
      streamCancelRef.current();
      streamCancelRef.current = null;
    }

    // Generate new session ID
    const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionIdRef.current = newSessionId;

    // Clear all messages from the store
    clearMessages();

    // Track the new chat action
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: 'coder_mode',
          action: 'new_chat_started',
        }),
      ).pipe(Effect.provide(runtime)),
    );

    // Set loading state to false
    setIsLoading(false);

    // Trigger focus on the editor by updating focusKey
    setFocusKey(prev => prev + 1);
  }, [clearMessages, runtime]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleExitCoderMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleExitCoderMode]);

  // Track Coder Mode open event
  React.useEffect(() => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: 'coder_mode',
          action: 'coder_mode_opened',
        }),
      ).pipe(Effect.provide(runtime)),
    );
  }, [runtime]);

  // Send message to Claude Code
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message to UI state only
    const userMessageId = `ui-msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    addMessage(userMessage);
    setIsLoading(true);

    // Create assistant message placeholder
    const assistantMessageId = `ui-msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(assistantMessage);

    // Track assistant message content in a ref for streaming updates
    const assistantContentRef = { current: '' };

    try {
      // Use current messages from local state
      const currentMessages = messages;

      // Prepare messages for Claude Code API - only include messages from current session
      const apiMessages = currentMessages
        .filter(m => m.role !== 'system')
        .concat(userMessage)
        .map(m => ({ role: m.role, content: m.content }));

      // Stream response from Claude Code
      const cleanup = window.electronAPI.claudeCode?.streamChat(
        {
          messages: apiMessages,
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4096,
          temperature: 0.7,
          sessionId: sessionIdRef.current,
        },
        (chunk: string) => { // chunk is a string, potentially JSON from main process
          let parsedData;
          let isStructured = false;

          try {
            parsedData = JSON.parse(chunk);
            if (parsedData && (parsedData.type === 'tool_call' || parsedData.type === 'tool_result')) {
              isStructured = true;
            }
          } catch (e) {
            // Not JSON, assume it's a plain text chunk
            parsedData = { type: 'text', text: chunk };
          }

          updateMessage(assistantMessageId, (prevMessage) => {
            const newParts = prevMessage.parts ? [...prevMessage.parts] : [];
            let newContentForDb = prevMessage.content || ""; // For DB, accumulate textual representation

            if (isStructured) {
              if (parsedData.type === 'tool_call') {
                newParts.push({
                  type: 'tool_call',
                  id: parsedData.id || `tool_call_${Date.now()}`,
                  name: parsedData.name,
                  input: parsedData.parameters // Ensure 'parameters' matches what main sends
                });
                newContentForDb += `\n[Tool Call: ${parsedData.name} Args: ${JSON.stringify(parsedData.parameters)}]\n`;
              } else if (parsedData.type === 'tool_result') {
                // This typically comes from a User message, but handling if Assistant streams it
                newParts.push({
                  type: 'tool_result',
                  tool_use_id: parsedData.tool_use_id,
                  content: parsedData.content,
                  isError: parsedData.is_error,
                });
                newContentForDb += `\n[Tool Result for ${parsedData.tool_use_id}: ${JSON.stringify(parsedData.content)}]\n`;
              }
            } else { // Text chunk
              newContentForDb += parsedData.text;
              const lastPart = newParts.length > 0 ? newParts[newParts.length - 1] : null;
              if (lastPart && lastPart.type === 'text') {
                lastPart.text += parsedData.text;
              } else {
                newParts.push({ type: 'text', text: parsedData.text });
              }
            }
            return { ...prevMessage, content: newContentForDb, parts: newParts, isStreaming: true };
          });
        },
        async () => {
          // Stream completed - update UI state only
          updateMessage(assistantMessageId, {
            isStreaming: false
          });
          setIsLoading(false);
          streamCancelRef.current = null;
        },
        (error: any) => {
          // Stream error
          console.error('Claude Code stream error:', error);
          updateMessage(assistantMessageId, {
            content: `Error: ${error.message || 'Stream failed'}`,
            isStreaming: false
          });
          setIsLoading(false);
          streamCancelRef.current = null;
        }
      );

      streamCancelRef.current = cleanup || null;
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the assistant placeholder message by filtering it out
      setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
      setIsLoading(false);
    }
  }, [isLoading, messages, addMessage, updateMessage, setMessages]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (streamCancelRef.current) {
        streamCancelRef.current();
      }
    };
  }, []);

  // No need for initial scroll - flex-direction: column-reverse handles it

  // Extracted message loading logic as a callable function
  const loadMessagesForSessionInternal = useCallback(async (sessionIdToLoad: string) => {
    const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'NEW'}]`;
    console.log(`${componentName} Attempting to load messages for session: ${sessionIdToLoad}`);
    setIsLoading(true);
    clearMessages();

    try {
      const dbProgram = Effect.flatMap(DatabaseService, (db) =>
        db.getMessagesForSession(sessionIdToLoad, 500)
      );
      const exitResult = await Effect.runPromiseExit(Effect.provide(dbProgram, runtime));

      if (Exit.isSuccess(exitResult)) {
        const dbMessages = exitResult.value;
        console.log(`${componentName} Loaded ${dbMessages.length} messages from DB for session ${sessionIdToLoad}`);

        const newMessagesState: ChatMessage[] = [{
          id: 'system',
          role: 'system',
          content: 'You are Claude Code, a helpful AI coding assistant.',
          timestamp: Date.now(),
        }];

        dbMessages.forEach(dbMsg => {
          let parts;
          try {
            if (dbMsg.content && (dbMsg.content.startsWith('{"parts":') || (dbMsg.tool_calls_json && dbMsg.role === 'assistant'))) {
              // If content contains parts, or if it's an assistant message with tool_calls_json, parse parts.
              // Assistant messages from Claude Bridge store main text in content, and tool calls in tool_calls_json.
              // We need to reconstruct parts array for UI.
              if (dbMsg.role === 'assistant' && dbMsg.tool_calls_json) {
                parts = [];
                if (dbMsg.content) parts.push({type: 'text', text: dbMsg.content});
                const toolCalls = JSON.parse(dbMsg.tool_calls_json);
                toolCalls.forEach((tc: any) => parts.push({ type: 'tool_call', id: tc.id, name: tc.function.name, input: JSON.parse(tc.function.arguments)}));
              } else if (dbMsg.content) {
                const contentData = JSON.parse(dbMsg.content);
                if (contentData.parts) parts = contentData.parts;
              }
            }
          } catch (e) { /* content is plain text or not parsable as parts */ }

          newMessagesState.push({
            id: dbMsg.id,
            role: dbMsg.role as ChatMessage['role'],
            content: parts ? '' : (dbMsg.content || ''), // UI content is from parts if they exist
            parts: parts,
            timestamp: dbMsg.timestamp * 1000,
          });
        });

        setMessages(newMessagesState);
        lastLoadedSessionIdRef.current = sessionIdToLoad;
        sessionIdRef.current = sessionIdToLoad; // Ensure current session ID is also set
        updatePaneContent(paneId, { sessionId: sessionIdToLoad });
        console.log(`${componentName} Session ${sessionIdToLoad} loaded and pane content updated.`);
      } else {
        console.error(`${componentName} Failed to load messages for ${sessionIdToLoad}:`, Cause.pretty(exitResult.cause));
        addMessage({ id: `error-load-${Date.now()}`, role: 'system', content: `Error loading session ${sessionIdToLoad.substring(0,8)}...`, timestamp: Date.now() });
      }
    } catch (error) {
      console.error(`${componentName} Exception loading session ${sessionIdToLoad}:`, error);
      addMessage({ id: `error-load-exc-${Date.now()}`, role: 'system', content: `Critical error loading session.`, timestamp: Date.now() });
    } finally {
      setIsLoading(false);
      setFocusKey(prev => prev + 1);
    }
  }, [paneId, clearMessages, updatePaneContent, runtime, addMessage, setMessages, setIsLoading, setFocusKey]);

  // Legacy function for backward compatibility
  const loadSessionMessages = async (sessionId: string): Promise<boolean> => {
    await loadMessagesForSessionInternal(sessionId);
    return true; // The new function handles errors internally
  };

  // Load initial session if provided
  useEffect(() => {
    const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'NEW'}]`;
    console.log(`${componentName} Effect for session loading. initialSessionId: ${initialSessionId}, current sessionIdRef: ${sessionIdRef.current}, lastLoaded: ${lastLoadedSessionIdRef.current}`);

    if (initialSessionId && initialSessionId !== lastLoadedSessionIdRef.current) {
      loadMessagesForSessionInternal(initialSessionId);
    } else if (!initialSessionId && !sessionIdRef.current) {
      const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      console.log(`${componentName} No initial session, generated new: ${newSessionId}`);
      sessionIdRef.current = newSessionId;
      lastLoadedSessionIdRef.current = newSessionId;
      clearMessages();
      updatePaneContent(paneId, { sessionId: newSessionId });
      setIsLoading(false);
    } else if (initialSessionId && initialSessionId === lastLoadedSessionIdRef.current && messages.filter(m => m.role !== 'system').length === 0) {
      console.log(`${componentName} initialSessionId matches lastLoaded, but UI messages are empty. Forcing reload for ${initialSessionId}.`);
      loadMessagesForSessionInternal(initialSessionId);
    } else {
      console.log(`${componentName} No session load required by this effect run.`);
      setIsLoading(false); // Ensure loading is false if no load occurs
    }
  }, [initialSessionId, paneId, clearMessages, updatePaneContent, addMessage, messages.length, loadMessagesForSessionInternal]); // Use messages.length to detect if messages array was cleared

  // State for history menu
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);

  // Fetch chat history
  const { data: chatHistorySessions, refetch: refetchHistory } = useQuery<DBSession[], Error>({
    queryKey: ["allChatSessionsForCoderMenu"],
    queryFn: async () => {
      const dbProgram = Effect.flatMap(DatabaseService, (db) =>
        db.getAllSessions({ sortBy: "last_updated_at", sortOrder: "DESC", limit: 5 }),
      );
      const exitResult = await Effect.runPromiseExit(Effect.provide(dbProgram, runtime));
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      console.error("Failed to fetch chat history for menu:", Cause.pretty(exitResult.cause));
      throw Cause.squash(exitResult.cause);
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  // Refetch history when menu opens
  useEffect(() => {
    if (historyMenuOpen) {
      refetchHistory();
    }
  }, [historyMenuOpen, refetchHistory]);

  // Format session for menu display
  const formatSessionForMenu = (session: DBSession): string => {
    const date = new Date(session.last_updated_at * 1000);
    const dateStr = date.toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    // Don't show ui-coder sessions in the menu display
    if (session.id.startsWith('ui-coder-')) {
      return `${dateStr} ${timeStr}`;
    }
    const idPrefix = session.id.substring(0, 8);
    return `${dateStr} ${timeStr} | ${idPrefix}...`;
  };

  // Create history menu items
  const historyMenuItems: PaneDropdownItem[] = useMemo(() => {
    if (!chatHistorySessions || chatHistorySessions.length === 0) {
      return [{ label: "No recent chats", action: () => { }, disabled: true }];
    }
    return chatHistorySessions.map(session => ({
      label: formatSessionForMenu(session),
      action: async (event) => {
        console.log("Load chat session:", session.id);
        
        // Check if Cmd/Ctrl key is held
        const isModifierHeld = event && (event.metaKey || event.ctrlKey);

        // Track telemetry
        Effect.runFork(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: 'coder_mode',
              action: isModifierHeld ? 'history_menu_item_cmd_click' : 'history_menu_item_click',
              label: session.id,
            }),
          ).pipe(Effect.provide(runtime)),
        );

        if (isModifierHeld) {
          // Open in new pane
          const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
          
          // Create a new coder pane with the messages from the selected session
          const openCoderPane = usePaneStore.getState().addPane;
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          
          // Position new pane offset from current one
          const currentPanes = usePaneStore.getState().panes;
          const currentCoderPane = currentPanes.find(p => p.id === CODER_PANE_ID);
          const offsetX = 50;
          const offsetY = 50;
          
          openCoderPane({
            id: `coder_pane_${Date.now()}`,
            type: "coder",
            title: `Coder`,
            x: currentCoderPane ? Math.min(currentCoderPane.x + offsetX, screenWidth - 600) : Math.floor((screenWidth - 569) / 2),
            y: currentCoderPane ? Math.min(currentCoderPane.y + offsetY, screenHeight - 400) : 30,
            width: 569,
            height: Math.floor(screenHeight * 0.85),
            dismissable: true,
            content: { sessionId: session.id }, // Pass the existing session ID
          });
        } else {
          const newSessionId = session.id;
          const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'HIST'}]`;
          console.log(`${componentName} History item clicked, preparing to load session: ${newSessionId}`);

          sessionIdRef.current = newSessionId; // Update current session ID
          lastLoadedSessionIdRef.current = null; // Reset last loaded to force reload by useEffect OR call directly

          // Call the extracted loading function
          await loadMessagesForSessionInternal(newSessionId);

          setHistoryMenuOpen(false);
        }
      },
    }));
  }, [chatHistorySessions, runtime, paneId, loadMessagesForSessionInternal]);

  // Create title bar buttons with history menu
  const titleBarButtons = useMemo(() => (
    <>
      {/* New Chat Button - will be on right side */}
      <Button
        onClick={handleNewChat}
        variant="outline"
        size="sm"
        className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors h-6 px-2 text-xs"
        title="Start new chat session"
      >
        <MessageSquarePlus className="h-3 w-3 mr-1" />
        New Chat
      </Button>
    </>
  ), [handleNewChat]);

  // Create header menus for left side
  const headerMenus = useMemo(() => [
    {
      id: "coderHistoryMenu",
      triggerLabel: "History",
      items: historyMenuItems,
    }
  ], [historyMenuItems]);

  // Handle menu open state changes
  const handleMenuOpenChange = useCallback((menuId: string, open: boolean) => {
    if (menuId === 'coderHistoryMenu') {
      setHistoryMenuOpen(open);
    }
  }, []);

  // Set title bar buttons in ref if provided
  useEffect(() => {
    if (titleBarButtonsRef && titleBarButtonsRef.set) {
      titleBarButtonsRef.set({
        buttons: titleBarButtons,
        menus: headerMenus,
        menuOpenState: historyMenuOpen,
        onMenuOpenChange: handleMenuOpenChange
      });
    }
  }, [titleBarButtons, headerMenus, historyMenuOpen, handleMenuOpenChange, titleBarButtonsRef]);

  return (
    <div className="h-full w-full flex flex-col bg-black relative">
      <style>{`
        /* Custom styles for Coder pane messages */
        .coder-chat-message .group\\/message {
          background-color: transparent !important;
          color: white !important;
          border-radius: 0 !important;
        }

        .coder-chat-message.user-message .group\\/message {
          max-width: 80% !important;
          border: 1px solid white !important;
        }

        .coder-chat-message.assistant-message .group\\/message {
          max-width: 100% !important;
          border: none !important;
        }

        /* Style the markdown content */
        .coder-chat-message .prose {
          color: white !important;
          max-width: none !important;
        }

        .coder-chat-message .prose p {
          margin-bottom: 0.5em !important;
          line-height: 1.5 !important;
          white-space: pre-wrap !important;
        }

        /* Ensure markdown content in our messages preserves whitespace */
        .coder-chat-message div[class*="whitespace-pre-wrap"] {
          white-space: pre-wrap !important;
        }

        /* Force pre-wrap on all paragraph elements in messages */
        .coder-chat-message p {
          white-space: pre-wrap !important;
        }

        .coder-chat-message .prose pre {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: white !important;
          margin: 0.5em 0 !important;
        }

        .coder-chat-message .prose code {
          color: white !important;
          background-color: rgba(255, 255, 255, 0.1) !important;
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
        }

        .coder-chat-message .prose pre code {
          background-color: transparent !important;
          padding: 0 !important;
        }

        /* Headings */
        .coder-chat-message .prose h1,
        .coder-chat-message .prose h2,
        .coder-chat-message .prose h3,
        .coder-chat-message .prose h4,
        .coder-chat-message .prose h5,
        .coder-chat-message .prose h6 {
          color: white !important;
          font-weight: bold !important;
          margin-top: 1em !important;
          margin-bottom: 0.5em !important;
        }

        /* Lists */
        .coder-chat-message .prose ul,
        .coder-chat-message .prose ol {
          color: white !important;
          margin: 0.5em 0 !important;
          padding-left: 1.5em !important;
        }

        .coder-chat-message .prose li {
          color: white !important;
          margin: 0.25em 0 !important;
        }

        /* Links */
        .coder-chat-message .prose a {
          color: #60a5fa !important;
          text-decoration: underline !important;
        }

        .coder-chat-message .prose a:hover {
          color: #93bbfc !important;
        }

        /* Strong and emphasis */
        .coder-chat-message .prose strong {
          color: white !important;
          font-weight: bold !important;
        }

        .coder-chat-message .prose em {
          color: white !important;
          font-style: italic !important;
        }

        /* Blockquotes */
        .coder-chat-message .prose blockquote {
          border-left: 4px solid rgba(255, 255, 255, 0.3) !important;
          padding-left: 1em !important;
          color: rgba(255, 255, 255, 0.8) !important;
          margin: 0.5em 0 !important;
        }

        /* Copy button in code blocks */
        .coder-chat-message .copy-button {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: white !important;
        }

        .coder-chat-message .copy-button:hover {
          background-color: rgba(255, 255, 255, 0.2) !important;
        }
      `}</style>
      {/* Chat messages area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex flex-col-reverse"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
      >
        <div className="max-w-[750px] mx-auto w-full">
          <div className="flex flex-col gap-4">
            {messages
              .filter(msg => msg.role !== 'system') // Don't show system messages
              .map((message, idx) => (
                <CoderChatMessage key={message.id || idx} message={message} index={idx} />
              ))}
          </div>
        </div>
      </div>
      {/* ProseMirror editor at the bottom */}
      <div className="flex items-center justify-center pb-4 px-4">
        <div className="h-[100px] w-[750px] overflow-auto rounded border border-white bg-black">
          <ProseMirrorEditor onSubmit={sendMessage} disabled={isLoading} focusKey={focusKey} />
        </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedCoderPane = React.memo(CoderPane, (prevProps, nextProps) => {
  // Only re-render if props actually changed
  return prevProps.paneId === nextProps.paneId &&
         prevProps.sessionId === nextProps.sessionId && 
         prevProps.titleBarButtonsRef === nextProps.titleBarButtonsRef;
});

export default MemoizedCoderPane;
