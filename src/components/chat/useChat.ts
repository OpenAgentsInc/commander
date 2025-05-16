import { useState, useRef, useCallback } from 'react';
import { ChatMessageProps } from './ChatMessage';
import { type OllamaChatCompletionRequest } from "@/services/ollama/OllamaService";

interface UseChatOptions {
  initialSystemMessage?: string;
  model?: string;
}

export function useChat({ 
  initialSystemMessage = "You are an AI agent inside an app used by a human called Commander. When asked, identify yourself simply as 'Agent'. Respond helpfully but extremely concisely, in 1-2 sentences.",
  model = "gemma3:1b"
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessageProps[]>([
    {
      role: "system",
      content: initialSystemMessage
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

  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || isLoading) return;

    // Add user message to chat
    const userMessage: ChatMessageProps = {
      role: "user",
      content: userInput.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Clear input field
    setUserInput("");

    // Get the system message from our messages state or use a default one
    const systemMessage = messages.find(m => m.role === "system")?.content || initialSystemMessage;

    const requestPayload: OllamaChatCompletionRequest = {
      model,
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
  }, [userInput, isLoading, messages, initialSystemMessage, model]);

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
          content: result.choices[0].message.content
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Handle empty response
        const errorMessage: ChatMessageProps = {
          role: "system",
          content: "No response received from the assistant."
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      // Add error message to chat
      const errorMessage: ChatMessageProps = {
        role: "system",
        content: `Error: ${error.message || "Unknown error occurred"}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamingRequest = async (requestPayload: OllamaChatCompletionRequest) => {
    // For tracking token count to reduce logging
    let tokenCounter = 0;

    // Reset streaming state
    streamedContentRef.current = "";

    // Create a new message object for streaming
    const newAssistantMessage: ChatMessageProps = {
      role: "assistant",
      content: "", // Start with empty content
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
        // Extract content from the chunk if available
        if (chunk.choices && chunk.choices.length > 0) {
          const choice = chunk.choices[0];

          if (choice.delta && choice.delta.content) {
            const newToken = choice.delta.content;
            tokenCounter++;

            // Update our accumulated content
            streamedContentRef.current += newToken;
            const currentContent = streamedContentRef.current;

            // IMPORTANT: Create a completely new message object
            // Force a new object reference so React will re-render
            const updatedMessage: ChatMessageProps = {
              role: "assistant",
              content: currentContent,
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
          }
        }
      };

      // Handler for stream completion
      const onDone = () => {
        // Create final message without streaming indicators
        const finalMessage: ChatMessageProps = {
          role: "assistant",
          content: streamedContentRef.current,
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
        const errorContent = streamedContentRef.current
          ? `${streamedContentRef.current}\n\n[Error: Stream interrupted - ${error.message || "Unknown error"}]`
          : `Error: ${error.message || "Unknown error occurred"}`;

        // Create error message
        const errorMessage: ChatMessageProps = {
          role: streamedContentRef.current ? "assistant" : "system",
          content: errorContent
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
      // Add error message to chat
      const errorMessage: ChatMessageProps = {
        role: "system",
        content: `Error: ${error.message || "Unknown error occurred"}`
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

  // Cleanup function to cancel any in-progress streaming
  const cleanup = useCallback(() => {
    if (streamCancelRef.current) {
      streamCancelRef.current();
      streamCancelRef.current = null;
    }
  }, []);

  return {
    messages,
    isLoading,
    userInput,
    setUserInput,
    sendMessage: handleSendMessage,
    cleanup
  };
}