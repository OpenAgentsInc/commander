import React, { useEffect } from "react";
import { ChatContainer } from "@/components/chat";
import { useAgentChat, type UIAgentChatMessage } from "@/hooks/ai/useAgentChat";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, FolderOpen } from "lucide-react";
import { Effect } from "effect";
import { TelemetryService } from "@/services/telemetry";
import { getMainRuntime } from "@/services/runtime";
import { AGENT_CHAT_PANE_TITLE } from "@/stores/panes/constants";
import { useAgentChatStore } from "@/stores/ai/agentChatStore";
import { useClaudeCodeStore } from "@/stores/ai/claudeCodeStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfigurationService } from "@/services/configuration";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AgentChatPaneProps {
  sessionId?: string;
  sessionTitle?: string;
}

const AgentChatPane: React.FC<AgentChatPaneProps> = ({ sessionId, sessionTitle }) => {
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
    sessionId,
  });

  const runtime = getMainRuntime();
  const { selectedProviderKey, availableProviders, setSelectedProviderKey, loadAvailableProviders } = useAgentChatStore();
  const { activeFolderPath, setActiveFolderPath } = useClaudeCodeStore();

  // Get the current provider info
  const currentProvider = availableProviders.find(p => p.key === selectedProviderKey);
  const currentProviderName = currentProvider?.name || "Loading...";
  const currentModelName = currentProvider?.modelName || "Default";
  const isClaudeCodeProviderSelected = selectedProviderKey === "claude_code";

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

    // Load available providers
    Effect.runFork(
      Effect.flatMap(ConfigurationService, (cs) =>
        loadAvailableProviders(cs)
      ).pipe(Effect.provide(runtime)),
    );
  }, [runtime, loadAvailableProviders]);

  const handleProviderChange = (value: string) => {
    setSelectedProviderKey(value);
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: "ui:agent_chat",
          action: "change_provider",
          label: value,
        }),
      ).pipe(Effect.provide(runtime)),
    );
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI?.claudeCode?.selectFolder) {
      try {
        const folderPath = await window.electronAPI.claudeCode.selectFolder();
        if (folderPath) {
          setActiveFolderPath(folderPath);
          Effect.runFork(
            Effect.flatMap(TelemetryService, (ts) =>
              ts.trackEvent({
                category: "ui:agent_chat",
                action: "claude_code_folder_selected",
                label: folderPath,
              }),
            ).pipe(Effect.provide(runtime)),
          );
        }
      } catch (error) {
        console.error("Error selecting folder:", error);
        Effect.runFork(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "ui:agent_chat:error",
              action: "claude_code_folder_selection_failed",
              label: error instanceof Error ? error.message : String(error),
            }),
          ).pipe(Effect.provide(runtime)),
        );
      }
    } else {
      console.warn("selectFolder API not available on window.electronAPI.claudeCode");
    }
  };

  const handleSend = () => {
    if (currentInput.trim()) {
      sendMessage(currentInput);
    }
  };

  return (
    <div className="flex h-full flex-col p-1">
      <div className="text-muted-foreground border-border mb-1 flex-shrink-0 border-b p-1 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span>Provider:</span>
          <Select value={selectedProviderKey} onValueChange={handleProviderChange}>
            <SelectTrigger className="h-7 w-[180px]">
              <SelectValue placeholder="Select Provider" />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.map((provider) => (
                <SelectItem key={provider.key} value={provider.key}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-2">Model: {currentModelName}</span>
          {isClaudeCodeProviderSelected && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 ml-2"
                      onClick={handleSelectFolder}
                      title="Select Active Folder for Claude Code"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select Active Folder for Claude Code</p>
                    {activeFolderPath && <p className="text-xs text-muted-foreground mt-1">Current: {activeFolderPath.length > 30 ? `...${activeFolderPath.slice(-27)}` : activeFolderPath}</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {activeFolderPath && (
                <div className="ml-2 text-[10px] text-muted-foreground truncate max-w-[150px]" title={activeFolderPath}>
                  Folder: {activeFolderPath.length > 20 ? `...${activeFolderPath.slice(-17)}` : activeFolderPath}
                </div>
              )}
            </>
          )}
        </div>
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
            providerInfo: m.providerInfo,
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
