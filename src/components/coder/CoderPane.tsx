import React, { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { Effect } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { getMainRuntime } from '@/services/runtime';
import { usePaneStore } from '@/stores/pane';
import { EditorState } from "prosemirror-state";
import { schema } from "prosemirror-schema-basic";
import { DatabaseService } from '@/services/db';
import type { DBMessage, DBSession } from '@/services/db';
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
    return <div className="h-full w-full flex items-center justify-center text-gray-500">Loading editor...</div>;
  }

  const { ProseMirror, ProseMirrorDoc, reactKeys } = components;

  return (
    <ProseMirror
      defaultState={EditorState.create({
        schema,
        plugins: [reactKeys()],
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

  // Handle Enter (submit) and Shift+Enter (new line)
  useEditorEventListener("keydown", (view: any, event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && !disabled) {
      event.preventDefault();
      
      // Get the text content from the editor
      const text = editorState?.doc.textContent || "";
      
      if (text.trim()) {
        // Submit the message
        onSubmit(text);
        
        // Clear the editor
        if (view) {
          const tr = view.state.tr.delete(0, view.state.doc.content.size);
          view.dispatch(tr);
        }
      }
      
      return true;
    }
    // Shift+Enter will naturally create a new line, no need to handle
    return false;
  });

  return (
    <ProseMirrorDoc
      as={
        <div
          className="p-4 prose prose-invert h-full w-full outline-none text-white box-border"
          style={{ minHeight: '100%', padding: '12px', opacity: disabled ? 0.5 : 1 }}
        />
      }
    />
  );
};

// Simple message interface for chat history
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  id?: string; // Add ID for database tracking
}

// Custom styled ChatMessage component wrapper
const CoderChatMessage: React.FC<{ message: ChatMessage; index: number }> = ({ message, index }) => {
  // Use the rich ChatMessage component for better formatting
  return (
    <div className={`coder-chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
      <UIChatMessage
        id={message.id || `msg-${index}`}
        role={message.role === 'user' ? 'user' : 'assistant'}
        content={message.content}
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
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content: 'You are Claude Code, a helpful AI coding assistant.',
      timestamp: Date.now(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
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

  // Track Coder Mode open event and load messages
  React.useEffect(() => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: 'coder_mode',
          action: 'coder_mode_opened',
        }),
      ).pipe(Effect.provide(runtime)),
    );
    
    // Load messages from database
    if (!messagesLoaded) {
      const loadMessages = async () => {
        try {
          const program = Effect.gen(function* (_) {
            const dbService = yield* _(DatabaseService);
            
            // Check if session exists
            const session = yield* _(dbService.getSession(sessionIdRef.current));
            
            if (session) {
              // Load messages for existing session
              const dbMessages = yield* _(dbService.getMessagesForSession(sessionIdRef.current, 500));
              
              // Convert DB messages to UI messages
              const uiMessages: ChatMessage[] = dbMessages.map(dbMsg => ({
                id: dbMsg.id,
                role: dbMsg.role as 'user' | 'assistant' | 'system',
                content: dbMsg.content || '',
                timestamp: dbMsg.timestamp * 1000, // Convert seconds to milliseconds
              }));
              
              // Keep system message at beginning if messages exist
              if (uiMessages.length > 0) {
                const systemMsg = messages.find(m => m.role === 'system');
                const nonSystemMessages = uiMessages.filter(m => m.role !== 'system');
                setMessages([systemMsg!, ...nonSystemMessages]);
              }
            }
            
            setMessagesLoaded(true);
          });
          
          await Effect.runPromise(program.pipe(Effect.provide(runtime)));
        } catch (error) {
          console.error('Failed to load coder messages:', error);
          setMessagesLoaded(true);
        }
      };
      
      loadMessages();
    }
  }, [runtime, messagesLoaded, messages]);

  // Send message to Claude Code
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const sessionId = sessionIdRef.current;
    const now = Math.floor(Date.now() / 1000);

    // First ensure our UI session exists
    try {
      const ensureSession = Effect.gen(function* (_) {
        const dbService = yield* _(DatabaseService);
        
        // Check if session exists
        const existingSession = yield* _(dbService.getSession(sessionId));
        
        if (!existingSession) {
          // Create new UI session
          const newSession: DBSession = {
            id: sessionId,
            created_at: now,
            last_updated_at: now,
            provider_key: 'coder_ui', // Different from claude_code to avoid conflicts
            model_name: 'claude-3-sonnet-20240229',
            system_prompt: messages.find(m => m.role === 'system')?.content || 'You are Claude Code, a helpful AI coding assistant.',
            metadata_json: JSON.stringify({ source: 'coder_pane', title: 'Coder UI Session' }),
          };
          yield* _(dbService.saveSession(newSession));
        }
      });
      
      await Effect.runPromise(ensureSession.pipe(Effect.provide(runtime)));
    } catch (error) {
      console.error('Failed to ensure UI session:', error);
    }

    // Add user message
    const userMessageId = `ui-msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to our UI session
    try {
      const saveUserMsg = Effect.gen(function* (_) {
        const dbService = yield* _(DatabaseService);
        const dbMessage: DBMessage = {
          id: userMessageId,
          session_id: sessionId,
          role: 'user',
          content: userMessage.content,
          timestamp: now,
          tool_calls_json: undefined,
          metadata_json: undefined,
        };
        yield* _(dbService.saveMessage(dbMessage));
      });
      
      await Effect.runPromise(saveUserMsg.pipe(Effect.provide(runtime)));
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    // Create assistant message placeholder
    const assistantMessageId = `ui-msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

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
        (chunk: string) => {
          // Update assistant message with new chunk
          setMessages(prev => 
            prev.map((msg, idx) => 
              idx === prev.length - 1 && msg.role === 'assistant'
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        async () => {
          // Stream completed - save assistant message to our UI session
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              // Save assistant message to our UI session
              const saveAssistantMsg = Effect.gen(function* (_) {
                const dbService = yield* _(DatabaseService);
                const dbMessage: DBMessage = {
                  id: assistantMessageId,
                  session_id: sessionId,
                  role: 'assistant',
                  content: lastMsg.content,
                  timestamp: Math.floor(Date.now() / 1000),
                  tool_calls_json: undefined,
                  metadata_json: undefined,
                };
                yield* _(dbService.saveMessage(dbMessage));
                
                // Update session last_updated_at
                yield* _(dbService.updateSession(sessionId, {
                  last_updated_at: Math.floor(Date.now() / 1000),
                }));
              });
              
              Effect.runPromise(saveAssistantMsg.pipe(Effect.provide(runtime))).catch(error => {
                console.error('Failed to save assistant message:', error);
              });
            }
            
            return prev.map((msg, idx) => 
              idx === prev.length - 1 && msg.role === 'assistant'
                ? { ...msg, isStreaming: false }
                : msg
            );
          });
          setIsLoading(false);
          streamCancelRef.current = null;
        },
        (error: any) => {
          // Stream error
          console.error('Claude Code stream error:', error);
          setMessages(prev => 
            prev.map((msg, idx) => 
              idx === prev.length - 1 && msg.role === 'assistant'
                ? { ...msg, content: `Error: ${error.message || 'Stream failed'}`, isStreaming: false }
                : msg
            )
          );
          setIsLoading(false);
          streamCancelRef.current = null;
        }
      );

      streamCancelRef.current = cleanup || null;
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.slice(0, -1)); // Remove assistant placeholder
      setIsLoading(false);
    }
  }, [messages, isLoading]);

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
