import React, { useState, useRef, useEffect } from "react";
import { type OllamaChatCompletionRequest, uiOllamaConfig } from "@/services/ollama/OllamaService";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatMessageProps } from "@/components/chat/ChatMessage";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessageProps[]>([
    {
      role: "system",
      content: "You are an AI agent inside an app used by a human called Commander. You should identify yourself simply as 'Agent'. Respond helpfully but extremely concisely, in 1-2 sentences.",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState<string>("");
  const [useStreaming, setUseStreaming] = useState(true);
  
  // For streaming cancellation
  const streamCancelRef = useRef<(() => void) | null>(null);
  
  // For accumulating streamed content
  const streamedContentRef = useRef<string>("");
  const streamedMessageRef = useRef<ChatMessageProps | null>(null);

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

    // Get the system message from our messages state or use a default one
    const systemMessage = messages.find(m => m.role === "system")?.content || 
      "You are an AI agent inside an app used by a human called Commander. You should identify yourself simply as 'Agent'. Respond helpfully but extremely concisely, in 1-2 sentences.";
    
    const requestPayload: OllamaChatCompletionRequest = {
      messages: [
        { role: "system", content: systemMessage },
        ...messages
          .filter(m => m.role !== "system") // Filter out client-side system messages 
          .map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage.content }
      ],
      stream: useStreaming
    };

    if (useStreaming) {
      await handleStreamingRequest(requestPayload);
    } else {
      await handleNonStreamingRequest(requestPayload);
    }
  };

  const handleNonStreamingRequest = async (requestPayload: OllamaChatCompletionRequest) => {
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

  const handleStreamingRequest = async (requestPayload: OllamaChatCompletionRequest) => {
    // Reset streaming state
    streamedContentRef.current = "";
    
    // Initialize placeholder message for streaming
    const initialAssistantMessage: ChatMessageProps = {
      role: "assistant",
      content: "", // Empty content initially
      timestamp: new Date(),
      isStreaming: true
    };
    
    // Add initial message and store reference
    setMessages(prev => {
      const newMessages = [...prev, initialAssistantMessage];
      streamedMessageRef.current = initialAssistantMessage;
      return newMessages;
    });
    
    try {
      // Set up streaming handlers
      const onChunk = (chunk: any) => {
        if (chunk.choices && chunk.choices.length > 0) {
          const choice = chunk.choices[0];
          
          // Check for content in delta
          if (choice.delta.content) {
            // Append to our accumulated content
            streamedContentRef.current += choice.delta.content;
            
            // Update the message in state
            setMessages(prev => 
              prev.map(msg => 
                msg === streamedMessageRef.current 
                  ? { ...msg, content: streamedContentRef.current }
                  : msg
              )
            );
          }
        }
      };
      
      const onDone = () => {
        // Mark as complete by removing isStreaming flag
        setMessages(prev => 
          prev.map(msg => {
            if (msg === streamedMessageRef.current) {
              const { isStreaming, ...msgWithoutStreaming } = msg;
              return msgWithoutStreaming;
            }
            return msg;
          })
        );
        
        // Reset references
        streamedMessageRef.current = null;
        streamedContentRef.current = "";
        streamCancelRef.current = null;
        
        // Done loading
        setIsLoading(false);
      };
      
      const onError = (error: any) => {
        console.error("Ollama streaming error:", error);
        
        // Update the partial message with error notification
        setMessages(prev => {
          return prev.map(msg => {
            if (msg === streamedMessageRef.current) {
              // If we got some content, keep it and add error
              const content = streamedContentRef.current
                ? `${streamedContentRef.current}\n\n[Error: Stream interrupted - ${error.message || "Unknown error"}]`
                : `Error: ${error.message || "Unknown error occurred"}`;
                
              // Convert to system message if empty content
              return {
                role: streamedContentRef.current ? "assistant" : "system",
                content,
                timestamp: msg.timestamp
              };
            }
            return msg;
          });
        });
        
        // Reset references
        streamedMessageRef.current = null;
        streamedContentRef.current = "";
        streamCancelRef.current = null;
        
        // Done loading
        setIsLoading(false);
      };
      
      // Start streaming request
      const cancelFn = window.electronAPI.ollama.generateChatCompletionStream(
        requestPayload,
        onChunk,
        onDone,
        onError
      );
      
      // Save cancel function for cleanup
      streamCancelRef.current = cancelFn;
      
    } catch (error: any) {
      console.error("Failed to start Ollama stream:", error);
      
      // Add error message to chat
      const errorMessage: ChatMessageProps = {
        role: "system",
        content: `Error: ${error.message || "Unknown error occurred"}`,
        timestamp: new Date()
      };
      
      // Replace the streaming message with error or append
      if (streamedMessageRef.current) {
        setMessages(prev => 
          prev.map(msg => msg === streamedMessageRef.current ? errorMessage : msg)
        );
      } else {
        setMessages(prev => [...prev, errorMessage]);
      }
      
      // Reset references
      streamedMessageRef.current = null;
      streamedContentRef.current = "";
      streamCancelRef.current = null;
      
      // Done loading
      setIsLoading(false);
    }
  };

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      if (streamCancelRef.current) {
        streamCancelRef.current();
        streamCancelRef.current = null;
      }
    };
  }, []);

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
          <div className="mt-4 flex items-center justify-center gap-2">
            <Switch
              id="streaming-toggle"
              checked={useStreaming}
              onCheckedChange={setUseStreaming}
            />
            <Label htmlFor="streaming-toggle" className="text-sm">
              {useStreaming ? "Streaming: On" : "Streaming: Off"}
            </Label>
          </div>
        </div>
      </div>

      {/* Chat window positioned at bottom-left */}
      <div className="absolute bottom-0 left-0 w-[28rem] h-64 p-1">
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