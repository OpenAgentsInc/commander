import React, { useState } from "react";
import { type OllamaChatCompletionRequest, uiOllamaConfig } from "@/services/ollama/OllamaService";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatMessageProps } from "@/components/chat/ChatMessage";

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessageProps[]>([
    {
      role: "system",
      content: "Welcome to Commander. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState<string>("");

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;
    
    // Add user message to chat
    const userMessage: ChatMessageProps = {
      role: "user",
      content: userInput.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Clear input field
    setUserInput("");

    const requestPayload: OllamaChatCompletionRequest = {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        ...messages
          .filter(m => m.role !== "system") // Filter out client-side system messages
          .map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage.content }
      ],
      stream: false
    };

    try {
      // Call the Ollama service through IPC
      const result = await window.electronAPI.ollama.generateChatCompletion(requestPayload);
      
      // Check if we received an error through IPC
      if (result && result.__error) {
        throw new Error(result.message || "Unknown error occurred");
      }
      
      // Add assistant response to chat
      if (result.choices && result.choices.length > 0) {
        const assistantMessage: ChatMessageProps = {
          role: "assistant",
          content: result.choices[0].message.content,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Handle empty response
        const errorMessage: ChatMessageProps = {
          role: "system",
          content: "No response received from the assistant.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      console.error("Ollama API call failed:", error);
      
      // Add error message to chat
      const errorMessage: ChatMessageProps = {
        role: "system",
        content: `Error: ${error.message || "Unknown error occurred"}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full relative">
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-mono text-4xl font-bold">OpenAgents</h1>
          <p className="text-lg uppercase text-muted-foreground" data-testid="pageTitle">
            Commander
          </p>
          <p className="mt-2 text-muted-foreground">
            Model: {uiOllamaConfig.defaultModel}
          </p>
        </div>
      </div>
      
      {/* Chat window positioned at bottom-left */}
      <div className="absolute bottom-0 left-0 w-80 h-64 p-1">
        <ChatWindow
          messages={messages}
          userInput={userInput}
          onUserInputChange={setUserInput}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}