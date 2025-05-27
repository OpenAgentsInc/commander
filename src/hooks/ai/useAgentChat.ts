import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Effect, Stream, Cause, Context } from "effect";
import {
  type AiResponse,
  type AgentChatMessage,
  type AiProviderError,
  type StreamTextOptions,
} from "@/services/ai/core";
import {
  ChatOrchestratorService,
  type PreferredProviderConfig,
} from "@/services/ai/orchestration";
import { getMainRuntime } from "@/services/runtime";
import { TelemetryService, type TelemetryEvent } from "@/services/telemetry";
import { useAgentChatStore } from "@/stores/ai/agentChatStore";
import { DatabaseService } from "@/services/db";
import type { DBMessage, DBToolExecution } from "@/services/db";
import { usePaneStore } from "@/stores/pane";

interface UseAgentChatOptions {
  initialSystemMessage?: string;
  sessionId?: string;
  // Future: providerKey?: string; modelName?: string;
}

// Extend AgentChatMessage for UI-specific properties for local state management
export interface UIAgentChatMessage extends AgentChatMessage {
  id: string; // Unique ID for React list keys and targeting updates
  _updateId?: number; // Force re-render for streaming updates
  isStreaming?: boolean; // Indicates if the message is currently being streamed
  timestamp: number; // Client-side timestamp for ordering and display
  providerInfo?: {
    name: string;
    type: "local" | "network";
    model?: string;
  };
  nip90EventData?: {
    request?: any;
    result?: any;
    feedback?: any[];
  };
}

// Helper to generate UUID for sessionId
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const { initialSystemMessage = "You are a helpful AI assistant.", sessionId } = options;
  const { selectedProviderKey, setSelectedProviderKey } = useAgentChatStore();
  const updatePaneContent = usePaneStore((state) => state.updatePaneContent);

  // Use useMemo to create stable system message instance
  const systemMessageInstance = useMemo<UIAgentChatMessage>(() => ({
    id: `system-${Date.now()}`, // Unique ID for system message
    role: "system",
    content: initialSystemMessage,
    timestamp: Date.now(),
  }), [initialSystemMessage]);

  const [messages, setMessages] = useState<UIAgentChatMessage[]>([
    systemMessageInstance,
  ]);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AiProviderError | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId || null);

  // Remove stale runtime reference - get fresh runtime at execution time
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const currentAssistantMessageIdRef = useRef<string | null>(null);

  const runTelemetry = useCallback((event: TelemetryEvent) => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) => ts.trackEvent(event)).pipe(
        Effect.provide(getMainRuntime()), // Get fresh runtime
      ),
    );
  }, []); // No runtime in deps

  // Update current session ID when prop changes
  useEffect(() => {
    if (sessionId && sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
    }
  }, [sessionId]);

  // Load chat history from database when sessionId changes
  useEffect(() => {
    const hookId = `useAgentChat-${currentSessionId || 'new'}`;
    console.log(`[${hookId}] Effect for history loading. currentSessionId: ${currentSessionId}`);
    if (!currentSessionId) {
      // Generate a new session ID if one isn't provided and messages array is just the system message
      if (messages.length === 1 && messages[0].role === 'system') {
        const newSessionId = `ui-agent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        console.log(`[${hookId}] No currentSessionId, generated new: ${newSessionId}`);
        setCurrentSessionId(newSessionId); // This will re-trigger the effect
        // Persist this new session ID to the pane's content
        if (options.sessionId !== newSessionId) { // Avoid loop if options.sessionId was initially null
          updatePaneContent(`agent_chat_session_${newSessionId}`, { sessionId: newSessionId, sessionTitle: `Agent Chat (${newSessionId.substring(0,6)}...)` });
        }
      }
      return;
    }

    const loadHistory = async () => {
      try {
        const runtime = getMainRuntime();
        const program = Effect.gen(function* (_) {
          const dbService = yield* _(DatabaseService);
          
          // Load session details
          const session = yield* _(dbService.getSession(currentSessionId));
          
          // Load messages for this session
          const dbMessages = yield* _(dbService.getMessagesForSession(currentSessionId, 500));
          
          // Convert DB messages to UI messages
          const uiMessages: UIAgentChatMessage[] = [];
          
          for (const dbMsg of dbMessages) {
            let uiMsg: UIAgentChatMessage = {
              id: dbMsg.id,
              role: dbMsg.role,
              content: dbMsg.content || "",
              timestamp: dbMsg.timestamp * 1000, // Convert from seconds to milliseconds
            };
            
            // Parse tool calls if present
            if (dbMsg.tool_calls_json) {
              try {
                const toolCalls = JSON.parse(dbMsg.tool_calls_json);
                uiMsg = { ...uiMsg, tool_calls: toolCalls };
              } catch (e) {
                console.error("Failed to parse tool_calls_json:", e);
              }
            }
            
            uiMessages.push(uiMsg);
          }
          
          return { session, messages: uiMessages };
        });
        
        const { session, messages: historicalMessages } = await Effect.runPromise(
          program.pipe(Effect.provide(runtime))
        );
        
        // Set provider from session if available
        if (session?.provider_key) {
          setSelectedProviderKey(session.provider_key);
        }
        
        // Update messages state with history (preserve system message)
        // Only set messages if we actually loaded some history, otherwise keep current messages
        if (historicalMessages.length > 0) {
          setMessages([systemMessageInstance, ...historicalMessages]);
        } else {
          // If no messages but session exists, still set system message
          setMessages([systemMessageInstance]);
        }
        
        // Update pane content in the store AFTER loading history
        updatePaneContent(`agent_chat_session_${currentSessionId}`, {
          sessionId: currentSessionId,
          sessionTitle: `Agent Chat (${currentSessionId.substring(0,6)}...)`
        });
        
        runTelemetry({
          category: "agent_chat",
          action: "history_loaded",
          label: currentSessionId,
          value: historicalMessages.length.toString(),
        });
      } catch (error) {
        console.error("Failed to load chat history:", error);
        runTelemetry({
          category: "agent_chat",
          action: "history_load_error",
          label: currentSessionId,
          value: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };
    
    loadHistory();
  }, [currentSessionId, systemMessageInstance, runTelemetry, setSelectedProviderKey, updatePaneContent, options.sessionId, messages.length]);

  const sendMessage = useCallback(
    async (promptText: string) => {
      if (!promptText.trim()) return;

      // Generate sessionId if this is the first message
      let effectiveSessionId = currentSessionId;
      if (!effectiveSessionId) {
        effectiveSessionId = `ui-agent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        setCurrentSessionId(effectiveSessionId);
        // Persist this new session ID to the pane's content immediately
        updatePaneContent(`agent_chat_session_${effectiveSessionId}`, {
          sessionId: effectiveSessionId,
          sessionTitle: `Agent Chat (${effectiveSessionId.substring(0,6)}...)`
        });
      }
      const finalSessionId = effectiveSessionId; // Use a const for closure

      const userMessage: UIAgentChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: promptText.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setCurrentInput("");
      setIsLoading(true);
      setError(null);
      runTelemetry({
        category: "agent_chat",
        action: "send_message_start",
        label: "User message sent",
        value: promptText.substring(0, 50),
      });

      // Save user message to DB
      const currentRuntimeForUserMsg = getMainRuntime();
      const dbServiceForUserMsg = Context.get(currentRuntimeForUserMsg.context, DatabaseService);
      const userDbMessage: DBMessage = {
        id: userMessage.id,
        session_id: finalSessionId,
        role: "user",
        content: userMessage.content,
        timestamp: Math.floor(userMessage.timestamp / 1000),
      };
      Effect.runFork(
        dbServiceForUserMsg.saveMessage(userDbMessage).pipe(
          Effect.andThen(dbServiceForUserMsg.updateSession(finalSessionId, { last_updated_at: Math.floor(Date.now() / 1000) })),
          Effect.provide(currentRuntimeForUserMsg)
        )
      );

      // Prepare conversation history for the LLM (core AgentChatMessage, no UI fields)
      const conversationHistoryForLLM: AgentChatMessage[] = messages
        .filter(
          (m) =>
            m.id !== currentAssistantMessageIdRef.current &&
            m.role !== "system",
        ) // Exclude current streaming assistant and system message
        .map(
          ({ id: _id, _updateId, isStreaming, timestamp, ...coreMsg }) =>
            coreMsg,
        )
        .concat([{ role: "user", content: userMessage.content }]); // Add current user message

      const assistantMsgId = `assistant-${Date.now()}`;

      // Abort previous stream if any
      if (streamAbortControllerRef.current) {
        console.log("[useAgentChat] Aborting previous stream. Current controller state:", {
          aborted: streamAbortControllerRef.current.signal.aborted,
          currentMessageId: currentAssistantMessageIdRef.current
        });
        streamAbortControllerRef.current.abort();
        runTelemetry({
          category: "agent_chat",
          action: "previous_stream_aborted",
          label: currentAssistantMessageIdRef.current || "N/A",
        });
      }
      streamAbortControllerRef.current = new AbortController();
      const signal = streamAbortControllerRef.current.signal;
      console.log("[useAgentChat] Created new AbortController for message:", assistantMsgId);

      currentAssistantMessageIdRef.current = assistantMsgId;

      // Add a placeholder for the assistant's response
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          isStreaming: true,
          timestamp: Date.now(),
        },
      ]);

      // Get current provider info for telemetry
      const currentProviderInfo = useAgentChatStore.getState().availableProviders.find(p => p.key === selectedProviderKey);
      
      const preferredProvider: PreferredProviderConfig = {
        key: selectedProviderKey,
        modelName: currentProviderInfo?.modelName,
      };

      const conversationHistoryForOrchestrator = [
        { role: "system", content: initialSystemMessage, timestamp: Date.now() } as AgentChatMessage,
        ...conversationHistoryForLLM,
      ];

      const orchestratorOptions: Parameters<ChatOrchestratorService['streamConversation']>[0]['options'] = {
        temperature: 0.7,
        maxTokens: 2048,
        sessionId: finalSessionId, // Pass sessionId for Claude Code provider
      } as any;

      const currentRuntime = getMainRuntime(); // Get fresh runtime
      
      const program = Effect.gen(function* (_) {
        const orchestrator = yield* _(ChatOrchestratorService);
        // Log successful service resolution
        yield* _(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "agent_chat",
              action: "chat_orchestrator_resolved_successfully",
              label: `Orchestrator resolved for provider: ${selectedProviderKey}`,
              value: assistantMsgId,
            })
          )
        );
        console.log("[useAgentChat] Orchestrator: Starting stream via provider:", selectedProviderKey, "for message:", assistantMsgId, "Current signal state:", {
          aborted: signal.aborted,
          controller: streamAbortControllerRef.current ? "present" : "null"
        });
        
        const textStream = orchestrator.streamConversation({
          messages: conversationHistoryForOrchestrator,
          preferredProvider: preferredProvider,
          options: orchestratorOptions,
        });

        yield* _(
          Stream.runForEach(textStream, (chunk: AiResponse) =>
            Effect.sync(() => {
              console.log("[useAgentChat runForEach] Processing chunk:", JSON.stringify(chunk), "Abort signal status:", signal.aborted);
              if (signal.aborted) {
                // Check if this specific stream was aborted
                console.log("[useAgentChat] Skipping chunk processing - stream was aborted for message:", assistantMsgId);
                runTelemetry({
                  category: "agent_chat",
                  action: "stream_aborted_client_chunk_processing",
                  label: assistantMsgId,
                });
                return; // Stop processing if aborted
              }
              setMessages((prevMsgs) =>
                prevMsgs.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                      ...msg,
                      content: (msg.content || "") + chunk.text,
                      _updateId: Date.now(),
                      providerInfo: currentProviderInfo
                        ? {
                            name: currentProviderInfo.name,
                            type: currentProviderInfo.type as "local" | "network",
                            model: currentProviderInfo.modelName,
                          }
                        : undefined,
                    }
                    : msg,
                ),
              );
              console.log("[useAgentChat] Updated message content for:", assistantMsgId, "Chunk length:", chunk.text.length);
            }),
          ),
        );
      }).pipe(
        Effect.provide(currentRuntime), // Use fresh runtime
        Effect.tapErrorCause((cause) =>
          Effect.sync(() => {
            // Check if the error is due to AbortSignal
            let isAbort = signal.aborted;
            if (!isAbort && Cause.isDieType(cause)) {
              const defect = cause.defect;
              if (defect instanceof Error && defect.name === "AbortError") {
                isAbort = true;
              }
            }

            console.log("[useAgentChat] Stream error state:", {
              isAbort,
              messageId: assistantMsgId,
              signalAborted: signal.aborted,
              causeType: cause._tag,
              defectType: Cause.isDieType(cause) ? (cause.defect as any)?.name : "N/A"
            });

            if (isAbort || Cause.isInterruptedOnly(cause)) {
              runTelemetry({
                category: "agent_chat",
                action: "stream_interrupted_or_aborted",
                label: assistantMsgId,
              });
              console.log(
                `[useAgentChat] Stream (${assistantMsgId}) was interrupted or aborted.`,
                { isAbort, isInterrupted: Cause.isInterruptedOnly(cause) }
              );
            } else {
              const squashedError = Cause.squash(cause) as AiProviderError;
              console.error("[useAgentChat] Stream error:", {
                messageId: assistantMsgId,
                error: squashedError,
                cause: Cause.pretty(cause)
              });
              setError(squashedError);
              runTelemetry({
                category: "agent_chat",
                action: "send_message_failure_stream",
                label: (squashedError as Error).message,
                value: Cause.pretty(cause),
              });
            }
          }),
        ),
        Effect.ensuring(
          Effect.sync(() => {
            console.log(`[useAgentChat] Ensuring block for ${assistantMsgId}. Signal aborted: ${signal.aborted}`);
            // Finalize UI state
            setMessages((prevMsgs) =>
              prevMsgs.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, isStreaming: false, _updateId: Date.now() }
                  : msg,
              ),
            );
            setIsLoading(false);

            // Save the final assistant message to DB IF stream was not aborted
            if (!signal.aborted) {
              // Use setMessages to access current state
              setMessages((currentMessages) => {
                const finalAssistantMessage = currentMessages.find(m => m.id === assistantMsgId);
                if (finalAssistantMessage && finalSessionId) {
                const currentRuntimeForAssistantMsg = getMainRuntime();
                const dbServiceForAssistantMsg = Context.get(currentRuntimeForAssistantMsg.context, DatabaseService);
                const dbAssistantMessage: DBMessage = {
                  id: finalAssistantMessage.id,
                  session_id: finalSessionId,
                  role: "assistant",
                  content: finalAssistantMessage.content,
                  tool_calls_json: finalAssistantMessage.tool_calls ? JSON.stringify(finalAssistantMessage.tool_calls) : undefined,
                  timestamp: Math.floor(finalAssistantMessage.timestamp / 1000),
                };
                Effect.runFork(
                  dbServiceForAssistantMsg.saveMessage(dbAssistantMessage).pipe(
                    Effect.andThen(dbServiceForAssistantMsg.updateSession(finalSessionId, { last_updated_at: Math.floor(Date.now() / 1000) })),
                    Effect.provide(currentRuntimeForAssistantMsg)
                  )
                );
                runTelemetry({
                  category: "agent_chat",
                  action: "assistant_message_saved",
                  label: assistantMsgId,
                  value: finalSessionId
                });
              }
                return currentMessages; // Return unchanged
              });
            }

            // Cleanup refs
            if (streamAbortControllerRef.current?.signal === signal) {
              streamAbortControllerRef.current = null;
            }
            if (currentAssistantMessageIdRef.current === assistantMsgId) {
              currentAssistantMessageIdRef.current = null;
            }
          }),
        ),
      );

      Effect.runFork(program);
    },
    [messages, initialSystemMessage, runTelemetry, selectedProviderKey, currentSessionId, updatePaneContent],
  );

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamAbortControllerRef.current) {
        console.log("[useAgentChat] Unmounting - aborting current stream.", {
          messageId: currentAssistantMessageIdRef.current,
          signalAborted: streamAbortControllerRef.current.signal.aborted
        });
        streamAbortControllerRef.current.abort();
        runTelemetry({
          category: "agent_chat",
          action: "hook_unmount_stream_cancel",
          label: currentAssistantMessageIdRef.current || "N/A",
        });
      }
    };
  }, [runTelemetry]);

  const clearHistory = useCallback(() => {
    setMessages([systemMessageInstance]);
    setCurrentSessionId(null);
    setError(null);
    runTelemetry({
      category: "agent_chat",
      action: "history_cleared",
      label: currentSessionId || "no_session",
    });
  }, [systemMessageInstance, currentSessionId, runTelemetry]);

  return {
    messages,
    currentInput,
    setCurrentInput,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    currentSessionId,
  };
}
