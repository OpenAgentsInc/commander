import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { 
  FileCode2, 
  FolderOpen, 
  Settings,
  Copy,
  Check,
  FileText,
  GitCompare,
  Code2
} from "lucide-react";
import { useAgentChat } from "@/hooks/ai/useAgentChat";
import { AgentChatMessage } from "@/services/ai/core/AgentChatMessage";
import { cn } from "@/utils/tailwind";

interface CodingCommandPaneProps {
  sessionId?: string;
  sessionTitle?: string;
}

export const CodingCommandPane: React.FC<CodingCommandPaneProps> = ({
  sessionId,
  sessionTitle,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showDiffView, setShowDiffView] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Force Claude Code provider
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    selectedProvider,
    setSelectedProvider,
  } = useAgentChat({
    sessionId,
    initialProvider: "claude_code", // Force Claude Code
  });

  // Ensure Claude Code is selected
  useEffect(() => {
    if (selectedProvider !== "claude_code") {
      setSelectedProvider("claude_code");
    }
  }, [selectedProvider, setSelectedProvider]);

  const handleSendMessage = (content: string) => {
    // Include selected files context in the message
    const contextPrefix = selectedFiles.length > 0 
      ? `Context files: ${selectedFiles.join(", ")}\n\n` 
      : "";
    sendMessage(contextPrefix + content);
  };

  const handleFileSelect = () => {
    // In a real implementation, this would open a file picker
    // For now, we'll just simulate adding a file
    const mockFile = `/src/example${selectedFiles.length + 1}.ts`;
    setSelectedFiles([...selectedFiles, mockFile]);
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const extractCodeBlocks = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || "text",
        code: match[2].trim(),
      });
    }
    
    return blocks;
  };

  return (
    <Card className="flex h-full flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Coding Assistant</span>
          <Badge variant="secondary" className="text-xs">Claude Code</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            size="sm"
            pressed={showDiffView}
            onPressedChange={setShowDiffView}
            aria-label="Toggle diff view"
          >
            <GitCompare className="h-3 w-3" />
          </Toggle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedFiles([])}
            disabled={selectedFiles.length === 0}
          >
            Clear Context
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="chat" className="h-full">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="context">Context ({selectedFiles.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="h-full px-4 pb-4">
            <ScrollArea className="h-[calc(100%-8rem)]">
              <div className="space-y-4 py-4">
                {messages.map((message, index) => {
                  const codeBlocks = extractCodeBlocks(message.content);
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                        
                        {message.role === "assistant" && codeBlocks.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {codeBlocks.map((block, blockIndex) => (
                              <div key={blockIndex} className="relative">
                                <div className="flex items-center justify-between rounded-t bg-zinc-800 px-2 py-1">
                                  <span className="text-xs text-zinc-400">
                                    {block.language}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={() => handleCopyCode(block.code, index * 100 + blockIndex)}
                                  >
                                    {copiedIndex === index * 100 + blockIndex ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                                <pre className="overflow-x-auto rounded-b bg-zinc-900 p-2">
                                  <code className="text-xs text-zinc-300">
                                    {block.code}
                                  </code>
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                        <div className="h-2 w-2 animate-pulse rounded-full bg-primary delay-75" />
                        <div className="h-2 w-2 animate-pulse rounded-full bg-primary delay-150" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleFileSelect}
                className="shrink-0"
              >
                <FolderOpen className="mr-1 h-3 w-3" />
                Add File
              </Button>
              <Input
                placeholder="Ask about code, request changes, or describe what you want to build..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
                disabled={isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="context" className="px-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Files included as context for Claude Code:
              </p>
              {selectedFiles.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No files selected. Add files to provide context for your coding questions.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleFileSelect}
                    className="mt-4"
                  >
                    <FolderOpen className="mr-1 h-3 w-3" />
                    Select Files
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
                        }
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="px-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Developer Mode</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Enable dangerous permissions for advanced file system operations
                </p>
                <Toggle
                  size="sm"
                  className="mt-2"
                  aria-label="Toggle developer mode"
                >
                  <Settings className="mr-1 h-3 w-3" />
                  Enable --dangerously-skip-permissions
                </Toggle>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};