import React, { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { Effect } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { getMainRuntime } from '@/services/runtime';
import { usePaneStore } from '@/stores/pane';
import { useCoderChatStore } from '@/stores/coderChatStore';
import { EditorState, Plugin } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";
import { history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { ChatMessage as UIChatMessage, type Message } from '@/components/ui/chat-message';


// ProseMirror Editor component that's loaded after the dynamic import
const ProseMirrorEditor: React.FC<{ onSubmit: (text: string) => void, disabled?: boolean }> = ({ onSubmit, disabled }) => {
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
      />
    </ProseMirror>
  );
};

// Component that autofocuses the editor and fills container
const AutoFocusEditor: React.FC<{
  onSubmit: (text: string) => void,
  disabled?: boolean,
  components: any
}> = ({ onSubmit, disabled, components }) => {
  const { useEditorState, useEditorEffect, useEditorEventListener, ProseMirrorDoc } = components;
  const editorState = useEditorState();

  useEditorEffect((view: any) => {
    if (view && !disabled) {
      view.focus();
    }
  }, [disabled]);

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
          style={{ 
            minHeight: '100%', 
            padding: '12px', 
            opacity: disabled ? 0.5 : 1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
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
    const textParts = message.parts
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('');
    
    return textParts; // Don't fall back to message.content when we have parts
  }, [message.parts, message.content]);

  // Create parts array for UIChatMessage - it expects a specific format
  const messageParts = React.useMemo(() => {
    if (!message.parts || message.parts.length === 0) return undefined;
    
    const parts = message.parts.map(part => {
      if (part.type === 'text') {
        return { type: 'text' as const, text: part.text };
      } else if (part.type === 'tool_call') {
        return {
          type: 'tool-invocation' as const,
          toolInvocation: {
            state: 'call' as const,
            toolName: part.name,
            toolCallId: part.id,
            args: part.input
          }
        };
      } else if (part.type === 'tool_result') {
        return {
          type: 'tool-invocation' as const,
          toolInvocation: {
            state: 'result' as const,
            toolName: 'Tool',
            toolCallId: part.tool_use_id,
            result: part.content
          }
        };
      }
      return null;
    }).filter(Boolean) as any[];
    
    return parts;
  }, [message.parts, textContent, message.content]);

  // Use the rich ChatMessage component for better formatting
  return (
    <div className={`coder-chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
      <UIChatMessage
        id={message.id}
        role={message.role === 'user' ? 'user' : 'assistant'}
        content={messageParts && messageParts.length > 0 ? '' : textContent}  // Empty content if we have parts
        parts={messageParts}  // Use parts instead of toolInvocations
        createdAt={new Date(message.timestamp)}
        animation="none"
        showTimeStamp={false}
      />
      {message.isStreaming && message.role === 'assistant' && (
        <span className="inline-block w-2 h-4 ml-1 bg-white animate-pulse" />
      )}
    </div>
  );
};

interface CoderPaneProps {
  sessionId?: string; // Passed from pane content
}

const CoderPane: React.FC<CoderPaneProps> = ({ sessionId: initialSessionId }) => {
  const runtime = getMainRuntime(); // For telemetry
  const removePane = usePaneStore((state) => state.removePane);
  const panes = usePaneStore((state) => state.panes);
  const updatePaneSize = usePaneStore((state) => state.updatePaneSize);

  // Find the coder pane to persist session ID
  const coderPane = panes.find(p => p.id === 'coder_pane');

  // Use provided session ID or generate new one with ui- prefix to avoid conflicts
  const sessionIdRef = useRef<string>(initialSessionId || `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);

  // Get messages from Zustand store
  const { messages, addMessage, updateMessage } = useCoderChatStore();
  
  // Local state for loading
  const [isLoading, setIsLoading] = useState(false);
  const streamCancelRef = useRef<(() => void) | null>(null);

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
      // Prepare messages for Claude Code API
      const apiMessages = messages
        .filter(m => m.role !== 'system')
        .concat(userMessage)
        .map(m => ({ role: m.role, content: m.content }));

      // Add system message at the beginning
      apiMessages.unshift({
        role: 'system',
        content: messages.find(m => m.role === 'system')?.content || 'You are Claude Code, a helpful AI coding assistant.'
      });

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
      const { messages: currentMessages, setMessages } = useCoderChatStore.getState();
      setMessages(currentMessages.filter(m => m.id !== assistantMessageId));
      setIsLoading(false);
    }
  }, [messages, isLoading, addMessage, updateMessage]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (streamCancelRef.current) {
        streamCancelRef.current();
      }
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-black">
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
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-[750px] mx-auto space-y-4">
          {messages
            .filter(msg => msg.role !== 'system') // Don't show system messages
            .map((message, idx) => (
              <CoderChatMessage key={message.id || idx} message={message} index={idx} />
            ))}
        </div>
      </div>
      {/* ProseMirror editor at the bottom */}
      <div className="flex items-center justify-center pb-4 px-4">
        <div className="h-[100px] w-[750px] overflow-auto rounded border border-white bg-black">
          <ProseMirrorEditor onSubmit={sendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default CoderPane;
