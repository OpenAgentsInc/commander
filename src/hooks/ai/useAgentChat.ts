import { useState, useCallback, useRef, useEffect } from "react";
import { Effect, Stream, Cause } from "effect";
import {
  AgentLanguageModel,
  type AiTextChunk,
  type AgentChatMessage,
  type AiProviderError,
  type StreamTextOptions,
} from "@/services/ai/core";
import { getMainRuntime } from "@/services/runtime";
import { TelemetryService, type TelemetryEvent } from "@/services/telemetry";

interface UseAgentChatOptions {
  initialSystemMessage?: string;
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

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const { initialSystemMessage = "You are a helpful AI assistant." } = options;

  const systemMessageInstance: UIAgentChatMessage = {
    id: `system-${Date.now()}`, // Unique ID for system message
    role: "system",
    content: initialSystemMessage,
    timestamp: Date.now(),
  };

  const [messages, setMessages] = useState<UIAgentChatMessage[]>([
    systemMessageInstance,
  ]);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AiProviderError | null>(null);

  const runtimeRef = useRef(getMainRuntime()); // Capture runtime instance
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const currentAssistantMessageIdRef = useRef<string | null>(null);

  const runTelemetry = useCallback((event: TelemetryEvent) => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) => ts.trackEvent(event)).pipe(
        Effect.provide(runtimeRef.current),
      ),
    );
  }, []); // runtimeRef is stable

  const sendMessage = useCallback(
    async (promptText: string) => {
      if (!promptText.trim()) return;

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

      const streamTextOptions: StreamTextOptions = {
        prompt: JSON.stringify({
          messages: [
            { role: "system", content: initialSystemMessage },
            ...conversationHistoryForLLM,
          ],
        }),
        // model, temperature, maxTokens can be added here if desired
      };

      const program = Effect.gen(function* (_) {
        const agentLM = yield* _(AgentLanguageModel.Tag);
        console.log("[useAgentChat] Starting stream for message:", assistantMsgId, "Current signal state:", {
          aborted: signal.aborted,
          controller: streamAbortControllerRef.current ? "present" : "null"
        });
        const textStream = agentLM.streamText(streamTextOptions);

        yield* _(
          Stream.runForEach(textStream, (chunk: AiTextChunk) =>
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
                    }
                    : msg,
                ),
              );
              console.log("[useAgentChat] Updated message content for:", assistantMsgId, "Chunk length:", chunk.text.length);
            }),
          ),
        );
      }).pipe(
        Effect.provide(runtimeRef.current),
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
            console.log("[useAgentChat] Ensuring block entered.", {
              messageId: assistantMsgId,
              abortController: streamAbortControllerRef.current ? "present" : "null",
              signalAborted: signal.aborted,
              isLoading
            });
            setMessages((prevMsgs) =>
              prevMsgs.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, isStreaming: false, _updateId: Date.now() }
                  : msg,
              ),
            );
            setIsLoading(false);
            // Only clear the controller if it's the one for the completed/failed stream
            if (streamAbortControllerRef.current?.signal === signal) {
              console.log("[useAgentChat] Clearing abort controller for message:", assistantMsgId);
              streamAbortControllerRef.current = null;
            }
            if (currentAssistantMessageIdRef.current === assistantMsgId) {
              console.log("[useAgentChat] Clearing current assistant message ID:", assistantMsgId);
              currentAssistantMessageIdRef.current = null;
            }
          }),
        ),
      );

      Effect.runFork(program);
    },
    [messages, initialSystemMessage, runTelemetry],
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

  return {
    messages,
    currentInput,
    setCurrentInput,
    isLoading,
    error,
    sendMessage,
  };
}
