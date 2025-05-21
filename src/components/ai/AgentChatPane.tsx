import React, { useEffect } from 'react';
import { ChatContainer } from '@/components/chat'; 
import { useAgentChat, type UIAgentChatMessage } from '@/hooks/ai/useAgentChat';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Effect } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import { getMainRuntime } from '@/services/runtime';
import { AGENT_CHAT_PANE_TITLE } from '@/stores/panes/constants';

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
    initialSystemMessage: "You are Commander's AI Agent. Be helpful and concise."
  });

  const runtime = getMainRuntime();

  useEffect(() => {
    // Track pane open event
    const telemetryService = runtime.context.unsafeGet(TelemetryService);
    Effect.runFork(
      Effect.provideService(
        Effect.flatMap(TelemetryService, ts => ts.trackEvent({
          category: 'ui:pane',
          action: 'open_agent_chat_pane',
          label: AGENT_CHAT_PANE_TITLE
        })),
        TelemetryService,
        telemetryService
      )
    );
  }, [runtime]);

  const handleSend = () => {
    if (currentInput.trim()) {
      sendMessage(currentInput);
    }
  };

  return (
    <div className="flex flex-col h-full p-1">
      <div className="flex-shrink-0 p-1 text-xs text-muted-foreground text-center border-b border-border mb-1">
        Provider: {currentProviderName} | Model: {currentModelName}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-2 flex-shrink-0">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>AI Error</AlertTitle>
          <AlertDescription className="text-xs">
            {error.message || "An unknown AI error occurred."}
            {error.cause && <div className="mt-1 text-xs opacity-70">Cause: {error.cause.toString()}</div>}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex-grow min-h-0"> {/* Essential for ScrollArea in ChatContainer */}
        <ChatContainer
          className="!border-0 !shadow-none !bg-transparent !p-0" // Adjusted for pane context
          messages={messages.map((m: UIAgentChatMessage) => ({ // Map UIAgentChatMessage to ChatMessageProps
            id: m.id,
            role: m.role === 'tool' ? 'system' : m.role, // Convert 'tool' to 'system' as it's not in MessageRole
            content: m.content || "",
            isStreaming: m.isStreaming,
            author: m.role === 'user' ? 'You' : (m.role === 'assistant' ? 'Agent' : (m.role === 'tool' ? 'Tool' : 'System')),
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