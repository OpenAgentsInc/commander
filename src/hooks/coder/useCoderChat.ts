import { useState, useRef, useCallback, useEffect } from 'react';
import { Effect, Exit, Cause } from 'effect';
import { DatabaseService } from '@/services/db';
import { getMainRuntime } from '@/services/runtime';
import { usePaneStore } from '@/stores/pane';
import { CODER_PANE_TITLE } from '@/stores/panes/constants';

// Local message interface - each pane has its own messages
export interface ChatMessage {
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

interface UseCoderChatProps {
  paneId: string;
  initialSessionId?: string;
  initialMessages?: ChatMessage[]; // Add initial messages from pane content
}

export function useCoderChat(props: UseCoderChatProps) {
  const { paneId, initialSessionId, initialMessages } = props;
  const runtime = getMainRuntime();
  const updatePaneContent = usePaneStore((state) => state.updatePaneContent);

  // Track the current session ID separately from initial
  const sessionIdRef = useRef<string>(initialSessionId || `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  const lastLoadedSessionIdRef = useRef<string | null>(null);

  // Local state for messages - initialize with persisted messages if available
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialMessages && initialMessages.length > 0) {
      // Silently restore persisted messages
      return initialMessages;
    }
    return [];
  });

  // Local state for loading and focus
  const [isLoading, setIsLoading] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const streamCancelRef = useRef<(() => void) | null>(null);
  const isLoadingRef = useRef(false); // Track loading state across renders

  // Message management functions
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      // Update pane content with new messages
      updatePaneContent(paneId, { messages: newMessages });
      return newMessages;
    });
  }, [paneId, updatePaneContent]);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage> | ((prevMessage: ChatMessage) => Partial<ChatMessage>)) => {
    setMessages(prev => {
      const newMessages = prev.map(msg => {
        if (msg.id === id) {
          const newUpdates = typeof updates === 'function' ? updates(msg) : updates;
          return { ...msg, ...newUpdates };
        }
        return msg;
      });
      // Update pane content with updated messages
      updatePaneContent(paneId, { messages: newMessages });
      return newMessages;
    });
  }, [paneId, updatePaneContent]);

  const clearMessages = useCallback(() => {
    const newMessages: ChatMessage[] = [];
    setMessages(newMessages);
    // Update pane content with cleared messages
    updatePaneContent(paneId, { messages: newMessages });
  }, [paneId, updatePaneContent]);

  // Extracted message loading logic as a callable function
  const loadMessagesForSessionInternal = useCallback(async (sessionIdToLoad: string, skipClear: boolean = false) => {
    // Loading messages for session

    // Prevent loading if already loading
    if (isLoadingRef.current) {
      // Already loading, skip duplicate
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    // Only clear messages if we don't have initial messages already restored
    if (!skipClear) {
      clearMessages();
    }

    try {
      const dbProgram = Effect.gen(function* (_) {
        const db = yield* _(DatabaseService);
        const messages = yield* _(db.getMessagesForSession(sessionIdToLoad, 500));

        // Fetch tool executions for all messages in parallel
        const messageToolExecutions = yield* _(
          Effect.all(
            messages.map(msg =>
              Effect.map(
                db.getToolCallsForMessage(msg.id),
                tools => ({ messageId: msg.id, tools })
              )
            ),
            { concurrency: "unbounded" }
          )
        );

        // Create a map of message ID to tool executions
        const toolExecutionsByMessage = new Map(
          messageToolExecutions.map(({ messageId, tools }) => [messageId, tools])
        );

        return { messages, toolExecutionsByMessage };
      });

      const exitResult = await Effect.runPromiseExit(Effect.provide(dbProgram, runtime));

      if (Exit.isSuccess(exitResult)) {
        const { messages: dbMessages, toolExecutionsByMessage } = exitResult.value;
        // Loaded messages from DB

        const newMessagesState: ChatMessage[] = [];

        dbMessages.forEach(dbMsg => {
          let parts;
          try {
            // Check if message has stored parts (from user messages with tool results)
            if (dbMsg.content && dbMsg.content.startsWith('{"parts":')) {
              const contentData = JSON.parse(dbMsg.content);
              if (contentData.parts) {
                parts = contentData.parts;
              }
            }
            // Handle assistant messages
            else if (dbMsg.role === 'assistant') {
              parts = [];

              // Check if content is structured JSON array (new format)
              let successfullyParsedStructuredContent = false;
              if (dbMsg.content) {
                try {
                  const structuredContent = JSON.parse(dbMsg.content);
                  if (Array.isArray(structuredContent)) {
                    // New format: content is an array of parts
                    // Rehydrating assistant message with structured content
                    const toolExecutionMap = new Map(
                      (toolExecutionsByMessage.get(dbMsg.id) || []).map(exec => [exec.id, exec])
                    );

                    for (const rawPart of structuredContent) {
                      if (rawPart.type === 'text' && rawPart.text) {
                        parts.push({ type: 'text', text: rawPart.text });
                      } else if (rawPart.type === 'tool_use' && rawPart.id && rawPart.name) {
                        parts.push({
                          type: 'tool_call',
                          id: rawPart.id,
                          name: rawPart.name,
                          input: rawPart.input || {},
                        });

                        // Immediately add its result if available
                        const execution = toolExecutionMap.get(rawPart.id);
                        if (execution) {
                          if (execution.result_json) {
                            let parsedResultJson;
                            try {
                              parsedResultJson = JSON.parse(execution.result_json);
                            } catch (e) {
                              console.warn(`[CoderPane] Failed to parse result_json for tool ${rawPart.id}:`, execution.result_json, e);
                              parsedResultJson = { content: `[Error parsing result: ${execution.result_json}]`, isError: true };
                            }
                            parts.push({
                              type: 'tool_result',
                              tool_use_id: execution.id,
                              content: parsedResultJson,
                              isError: execution.status === 'executed_error' || parsedResultJson.isError,
                              isLoading: false,
                            });
                          } else { // Result not yet available or failed before result
                            parts.push({
                              type: 'tool_result',
                              tool_use_id: execution.id,
                              content: execution.status === 'pending' ? "Tool execution is pending..."
                                : execution.status === 'executed_error' ? "[Error result not available]"
                                  : "[Result not available yet]",
                              isLoading: execution.status === 'pending',
                              isError: execution.status === 'executed_error',
                            });
                          }
                        } else {
                          // Tool call was in content, but no execution record
                          parts.push({
                            type: 'tool_result',
                            tool_use_id: rawPart.id,
                            content: "[Tool execution record missing]",
                            isLoading: true,
                            isError: false
                          });
                        }
                      }
                    }
                    successfullyParsedStructuredContent = true;
                  }
                } catch (e) {
                  // content was not valid JSON or not an array, fallback to old logic
                  // Content not structured, trying fallback
                }
              }

              if (!successfullyParsedStructuredContent) {
                // Fallback for old data or if content isn't structured JSON
                // Using fallback logic for assistant message

                // Add text content first if present
                if (dbMsg.content) {
                  parts.push({ type: 'text', text: dbMsg.content });
                }

                // Handle tool calls if present
                if (dbMsg.tool_calls_json) {
                  // Parse tool calls and get tool executions
                  const toolCalls = JSON.parse(dbMsg.tool_calls_json);
                  const toolExecutions = toolExecutionsByMessage.get(dbMsg.id) || [];

                  // Create a map of tool executions by ID for quick lookup
                  const toolExecutionMap = new Map(
                    toolExecutions.map(exec => [exec.id, exec])
                  );

                  // Add tool calls and their results in the correct order
                  toolCalls.forEach((tc: any) => {
                    // Add the tool call
                    parts.push({
                      type: 'tool_call',
                      id: tc.id,
                      name: tc.function.name,
                      input: JSON.parse(tc.function.arguments)
                    });

                    // Immediately add the result if available
                    const execution = toolExecutionMap.get(tc.id);
                    if (execution && execution.result_json) {
                      let parsedResultJson;
                      try {
                        parsedResultJson = JSON.parse(execution.result_json);
                      } catch (e) {
                        console.warn(`[CoderPane] Failed to parse result_json for tool ${tc.id}:`, execution.result_json, e);
                        parsedResultJson = { content: `[Error parsing result: ${execution.result_json}]`, isError: true };
                      }
                      parts.push({
                        type: 'tool_result',
                        tool_use_id: execution.id,
                        content: parsedResultJson, // This might be { content: "..." } or the error object
                        isError: execution.status === 'executed_error' || parsedResultJson.isError,
                        isLoading: false, // If result_json exists, it's not loading
                      });
                    } else if (execution) {
                      // Tool call exists but no result_json
                      parts.push({
                        type: 'tool_result',
                        tool_use_id: execution.id,
                        // Provide more informative content based on status
                        content: execution.status === 'pending'
                          ? "Tool execution is pending..."
                          : execution.status === 'executed_error'
                            ? "[Error result not available]"
                            : "[Result not available yet]",
                        isLoading: execution.status === 'pending',
                        isError: execution.status === 'executed_error'
                      });
                    }
                    // If no execution found at all, the tool_call part remains, and no tool_result part is added for it.
                  });
                }
              }
            }
          } catch (e) {
            console.warn(`${componentName} Error parsing message parts:`, e);
            /* content is plain text or not parsable as parts */
          }

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
        // Save messages to pane content for persistence
        updatePaneContent(paneId, { 
          sessionId: sessionIdToLoad, 
          messages: newMessagesState // Save the full message state
        });
        // Session loaded and pane content updated

        // Scroll to bottom after loading messages
        setTimeout(() => {
          // Note: scrollToBottom will be handled by the component using this hook
        }, 100);
      } else {
        console.error(`${componentName} Failed to load messages for ${sessionIdToLoad}:`, Cause.pretty(exitResult.cause));
        addMessage({ id: `error-load-${Date.now()}`, role: 'system', content: `Error loading session ${sessionIdToLoad.substring(0, 8)}...`, timestamp: Date.now() });
      }
    } catch (error) {
      console.error(`${componentName} Exception loading session ${sessionIdToLoad}:`, error);
      addMessage({ id: `error-load-exc-${Date.now()}`, role: 'system', content: `Critical error loading session.`, timestamp: Date.now() });
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      setFocusKey(prev => prev + 1);
    }
  }, [paneId, runtime, clearMessages, updatePaneContent, addMessage]); // Minimize dependencies to prevent recreating the function

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

      // Extract system message content if explicitly set (not the default)
      const systemMessage = currentMessages.find(m => m.role === 'system');
      const systemPromptContent = systemMessage && 
                                  systemMessage.content !== 'You are Claude Code, a helpful AI coding assistant.' 
                                  ? systemMessage.content 
                                  : undefined;

      // Prepare messages for Claude Code API - only include messages from current session
      const apiMessages = currentMessages
        .filter(m => m.role !== 'system')
        .concat(userMessage)
        .map(m => ({ role: m.role, content: m.content }));

      // Stream response from Claude Code
      const cleanup = window.electronAPI.claudeCode?.streamChat(
        {
          messages: apiMessages,
          ...(systemPromptContent && { systemPrompt: systemPromptContent }), // Only include if not default
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

  // Load initial session if provided
  useEffect(() => {
    // Session loading/init effect

    let determinedSessionId = sessionIdRef.current;

    if (initialSessionId) {
      if (initialSessionId !== lastLoadedSessionIdRef.current) {
        // Using initialSessionId for loading
        determinedSessionId = initialSessionId;
        sessionIdRef.current = initialSessionId; // Sync ref with prop
        
        // If we have initial messages, mark as loaded but still fetch in background for updates
        if (initialMessages && initialMessages.length > 0) {
          // Have initial messages, marking as loaded
          lastLoadedSessionIdRef.current = initialSessionId;
          setIsLoading(false);
          // Still load from DB in case there are newer messages, but skip clearing existing messages
          loadMessagesForSessionInternal(initialSessionId, true);
        } else {
          loadMessagesForSessionInternal(initialSessionId, false); // This also sets lastLoadedSessionIdRef.current
        }
      } else {
        // Session already loaded, no action needed
        setIsLoading(false);
      }
    } else { // No initialSessionId provided
      // If sessionIdRef.current is also uninitialized (or a temporary placeholder), generate a new one.
      if (!sessionIdRef.current || sessionIdRef.current.startsWith('ui-coder-temp-')) { // Check for uninitialized or temp ID
        const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        // New pane created
        determinedSessionId = newSessionId;
        sessionIdRef.current = newSessionId;
        lastLoadedSessionIdRef.current = newSessionId; // Mark as "loaded" (it's empty)
        clearMessages(); // Ensure messages are clear for a truly new session
        setIsLoading(false);
      } else {
        // Retain existing sessionIdRef.current if it's valid (e.g., pane was re-rendered without initialSessionId prop changing)
        determinedSessionId = sessionIdRef.current;
        // Retaining existing session
        if (determinedSessionId !== lastLoadedSessionIdRef.current) {
          // Check if we have initial messages to preserve
          const hasInitialMessages = initialMessages && initialMessages.length > 0;
          loadMessagesForSessionInternal(determinedSessionId, hasInitialMessages);
        } else {
           setIsLoading(false);
        }
      }
    }

    // CRITICAL: Ensure the determined session ID and title are updated in the pane store.
    // Only update if the sessionId has actually changed to avoid infinite loops
    if (determinedSessionId && determinedSessionId !== initialSessionId) {
      const newTitle = `${CODER_PANE_TITLE} (${determinedSessionId.substring(0,6)}...)`;
      // Updating pane store content
      // This call ensures the sessionId is saved in the global state and thus persisted.
      updatePaneContent(paneId, {
        sessionId: determinedSessionId,
        title: newTitle // Update title in pane store as well
      });
    }

    // Removed 'messages' from dependency array to prevent loops, ensure other dependencies are correct.
  }, [initialSessionId, paneId, updatePaneContent, loadMessagesForSessionInternal, clearMessages, initialMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamCancelRef.current) {
        streamCancelRef.current();
      }
    };
  }, []);

  return {
    messages,
    isLoading,
    focusKey,
    sendMessage,
    loadMessagesForSession: (sessionId: string, skipClear: boolean = false) => loadMessagesForSessionInternal(sessionId, skipClear), // Expose for direct loading
    clearMessagesAndSession: () => { // For the "New Chat" button
      if (streamCancelRef.current) streamCancelRef.current();
      const newSessionId = `ui-coder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      sessionIdRef.current = newSessionId;
      lastLoadedSessionIdRef.current = newSessionId;
      clearMessages(); // This now also updates pane content
      setIsLoading(false);
      setFocusKey(prev => prev + 1);
      return newSessionId; // Return new session ID for pane content update
    },
  };
}