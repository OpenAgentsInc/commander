import React, { useEffect } from "react";
import { ChatContainer } from "@/components/chat";
import { useAgentChat, type UIAgentChatMessage } from "@/hooks/ai/useAgentChat";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Effect } from "effect";
import { TelemetryService } from "@/services/telemetry";
import { getMainRuntime } from "@/services/runtime";
import { AGENT_CHAT_PANE_TITLE } from "@/stores/panes/constants";

// TODO: In the future, these would be dynamically selected or retrieved from configuration
const currentProviderName = "Default Provider";
const currentModelName = "Default Model";

const AgentChatPane: React.FC = () => {
  const {
    messages,
    currentInput,
    setCurrentInput,
    isLoading,
    error,
    sendMessage,
  } = useAgentChat({
    initialSystemMessage:
      "You are Commander's AI Agent. Be helpful and concise.",
  });

  const runtime = getMainRuntime();

  useEffect(() => {
    // Track pane open event
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: "ui:pane",
          action: "open_agent_chat_pane",
          label: AGENT_CHAT_PANE_TITLE,
        }),
      ).pipe(Effect.provide(runtime)),
    );
  }, [runtime]);

  const handleSend = () => {
    if (currentInput.trim()) {
      sendMessage(currentInput);
    }
  };

  return (
    <div className="flex h-full flex-col p-1">
      <div className="text-muted-foreground border-border mb-1 flex-shrink-0 border-b p-1 text-center text-xs">
        Provider: {currentProviderName} | Model: {currentModelName}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-2 flex-shrink-0">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>AI Error</AlertTitle>
          <AlertDescription className="text-xs">
            {error.message || "An unknown AI error occurred."}
            {error.cause ? (
              <div className="mt-1 text-xs opacity-70">
                Cause:{" "}
                {error.cause instanceof Error
                  ? error.cause.message
                  : String(error.cause)}
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      )}

      <div className="min-h-0 flex-grow">
        {" "}
        {/* Essential for ScrollArea in ChatContainer */}
        <ChatContainer
          className="!border-0 !bg-transparent !p-0 !shadow-none" // Adjusted for pane context
          messages={messages.map((m: UIAgentChatMessage) => ({
            // Map UIAgentChatMessage to ChatMessageProps
            id: m.id,
            role: m.role === "tool" ? "system" : m.role, // Convert 'tool' to 'system' as it's not in MessageRole
            content: m.content || "",
            isStreaming: m.isStreaming,
            author:
              m.role === "user"
                ? "You"
                : m.role === "assistant"
                  ? "Agent"
                  : m.role === "tool"
                    ? "Tool"
                    : "System",
            timestamp: m.timestamp,
          }))}
          userInput={currentInput}
          onUserInputChange={setCurrentInput}
          onSendMessage={handleSend}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default AgentChatPane;
