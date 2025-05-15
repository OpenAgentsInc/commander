import React, { useState, useRef, useEffect } from "react";
import { type OllamaChatCompletionRequest, uiOllamaConfig } from "@/services/ollama/OllamaService";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatMessageProps } from "@/components/chat/ChatMessage";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Canvas } from '@react-three/fiber';
import BackgroundScene from '@/components/r3f/BackgroundScene';

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
  // Always use streaming
  const useStreaming = true;
  
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
    // For tracking token count to reduce logging
    let tokenCounter = 0;
    console.log("Starting streaming request");
    
    // Reset streaming state
    streamedContentRef.current = "";
    
    // Create a new message object for streaming
    const newAssistantMessage: ChatMessageProps = {
      role: "assistant",
      content: "", // Start with empty content
      timestamp: new Date(),
      isStreaming: true,
    };
    
    // Add to messages state and store reference
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, newAssistantMessage];
      // Store a reference to the message for updates
      streamedMessageRef.current = newAssistantMessage;
      return updatedMessages;
    });
    
    try {
      // Handler for each incoming chunk
      const onChunk = (chunk: any) => {
        console.log("Frontend received chunk:", chunk);
        
        // Extract content from the chunk if available
        if (chunk.choices && chunk.choices.length > 0) {
          const choice = chunk.choices[0];
          
          if (choice.delta && choice.delta.content) {
            const newToken = choice.delta.content;
            // Only log first few tokens and every 10th token to reduce console noise
            if (tokenCounter < 5 || tokenCounter % 10 === 0) {
              console.log(`Token ${tokenCounter}: "${newToken}"`);
            }
            tokenCounter++;
            
            // Update our accumulated content
            streamedContentRef.current += newToken;
            const currentContent = streamedContentRef.current;
            
            // IMPORTANT: Create a completely new message object
            // Force a new object reference so React will re-render
            const updatedMessage: ChatMessageProps = {
              role: "assistant",
              content: currentContent,
              timestamp: new Date(), // Refresh timestamp
              isStreaming: true,
              _updateId: Date.now(), // Force reference change
            };
            
            // Update the messages array, replacing the streaming message
            setMessages(prevMessages => {
              return prevMessages.map(msg => {
                // Match by reference to find the streaming message
                if (msg === streamedMessageRef.current) {
                  // Replace with our updated message
                  streamedMessageRef.current = updatedMessage; // Update our reference
                  return updatedMessage;
                }
                return msg;
              });
            });
          } else {
            console.log("Received chunk without content:", JSON.stringify(choice));
          }
        } else {
          console.log("Received chunk without valid choices:", JSON.stringify(chunk));
        }
      };
      
      // Handler for stream completion
      const onDone = () => {
        console.log("Stream completed. Final content:", streamedContentRef.current);
        
        // Create final message without streaming indicators
        const finalMessage: ChatMessageProps = {
          role: "assistant",
          content: streamedContentRef.current,
          timestamp: new Date(),
          // No isStreaming flag
        };
        
        // Replace the streaming message with the final version
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg === streamedMessageRef.current ? finalMessage : msg
          )
        );
        
        // Clean up
        streamedMessageRef.current = null;
        streamedContentRef.current = "";
        streamCancelRef.current = null;
        setIsLoading(false);
      };
      
      // Handler for errors
      const onError = (error: any) => {
        console.error("Ollama streaming error:", error);
        
        const errorContent = streamedContentRef.current
          ? `${streamedContentRef.current}\n\n[Error: Stream interrupted - ${error.message || "Unknown error"}]`
          : `Error: ${error.message || "Unknown error occurred"}`;
        
        // Create error message
        const errorMessage: ChatMessageProps = {
          role: streamedContentRef.current ? "assistant" : "system",
          content: errorContent,
          timestamp: new Date(),
        };
        
        // Replace streaming message with error message
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg === streamedMessageRef.current ? errorMessage : msg
          )
        );
        
        // Clean up
        streamedMessageRef.current = null;
        streamedContentRef.current = "";
        streamCancelRef.current = null;
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
    <>
      {/* R3F Canvas for Background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1, // Send it to the very back
        }}
      >
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}> {/* Adjust camera as needed */}
          <BackgroundScene />
        </Canvas>
      </div>

      {/* Existing HomePage Layout */}
      <div className="flex h-full w-full relative">
        {/* Empty main content area */}
        <div className="flex-1"></div>

        {/* Chat window positioned at bottom-left */}
        <div className="absolute bottom-0 left-0 w-[28rem] p-1 z-10"> {/* Added z-index to ensure it appears above the canvas */}
          {/* Empty space above chat window */}
          <div className="mb-1"></div>
          
          {/* Chat window */}
          <div className="h-64">
            <ChatWindow
              messages={messages}
              userInput={userInput}
              onUserInputChange={setUserInput}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
}