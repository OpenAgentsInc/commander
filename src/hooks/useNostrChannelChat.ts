import { useState, useEffect, useCallback, useRef } from 'react';
import { type NostrEvent } from '@/services/nostr';
import { type ChatMessageProps } from '@/components/chat/ChatMessage';
import { hexToBytes } from '@noble/hashes/utils';
import { getPublicKey, finalizeEvent, type EventTemplate } from 'nostr-tools/pure';

// Demo user key for testing - in a real app this would come from user identity management
const DEMO_USER_SK_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const DEMO_USER_SK = hexToBytes(DEMO_USER_SK_HEX);
const DEMO_USER_PK = getPublicKey(DEMO_USER_SK);

interface UseNostrChannelChatOptions {
  channelId: string;
}

export function useNostrChannelChat({ channelId }: UseNostrChannelChatOptions) {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');

  // Format a pubkey as a shorter display string
  // In a real app, this would encode it as npub, but we'll just use a simple shortener
  const formatPubkeyForDisplay = useCallback((pubkey: string): string => {
    return pubkey.substring(0, 6) + "..." + pubkey.substring(pubkey.length - 4);
  }, []);

  // Convert a NostrEvent to a ChatMessageProps
  const formatEventAsMessage = useCallback((event: NostrEvent): ChatMessageProps => {
    const authorDisplay = formatPubkeyForDisplay(event.pubkey);
    
    return {
      id: event.id,
      content: event.content,
      role: event.pubkey === DEMO_USER_PK ? 'user' : 'assistant', // Use 'user' for our messages, 'assistant' for others
      author: authorDisplay,
      timestamp: event.created_at * 1000,
    };
  }, [formatPubkeyForDisplay]);

  // Load mock messages for the channel
  useEffect(() => {
    if (!channelId) return;

    setIsLoading(true);
    setMessages([{ 
      id: 'system-message', 
      role: 'system', 
      content: 'NIP28 channel chat functionality is for demonstration purposes only in this version.', 
      timestamp: Date.now() 
    }]);

    // Simulate loading some messages
    setTimeout(() => {
      // Create a welcome message from the channel creator
      const welcomeMessage: ChatMessageProps = {
        id: `welcome-${channelId}`,
        role: 'assistant',
        content: `Welcome to the channel! This is a demo of the NIP28 channel chat functionality.`,
        author: 'Channel Creator',
        timestamp: Date.now() - 60000, // 1 minute ago
      };

      setMessages([welcomeMessage]);
      setIsLoading(false);
    }, 500);

    return () => {
      // Clean up if needed
    };
  }, [channelId, formatEventAsMessage]);

  // Send a message to the channel
  const sendMessage = useCallback(() => {
    if (!userInput.trim() || !channelId) return;

    setIsLoading(true);
    
    // Create a temporary message to show immediately while "sending"
    const tempUserMessageId = `temp-${Date.now()}`;
    const tempUserMessage: ChatMessageProps = {
      id: tempUserMessageId,
      role: 'user',
      content: userInput.trim(),
      author: "Me",
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev.filter(m => m.role !== 'system'), tempUserMessage]);
    const currentInput = userInput.trim();
    setUserInput('');

    try {
      // Create the message event template directly
      const eventTemplate: EventTemplate = {
        kind: 42, // Channel message event kind
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', channelId, '', 'root'] // Tag the channel event
        ],
        content: currentInput,
      };
      
      // Sign the event - this would normally be published to relays
      const messageEvent = finalizeEvent(eventTemplate, DEMO_USER_SK);
      console.log("[Action] Message created:", messageEvent.id);
      
      // In a real app, we would publish to relays here
      // For now, just replace the temp message with the "sent" message 
      const sentMessage = formatEventAsMessage(messageEvent);
      
      // Simulate network delay
      setTimeout(() => {
        setMessages(prev => prev.map(m => 
          m.id === tempUserMessageId ? sentMessage : m
        ));
        setIsLoading(false);
        
        // Simulate a response
        setTimeout(() => {
          const responseMessage: ChatMessageProps = {
            id: `response-${Date.now()}`,
            role: 'assistant',
            content: `Got your message: "${currentInput}"`,
            author: 'Channel Bot',
            timestamp: Date.now(),
          };
          
          setMessages(prev => [...prev, responseMessage]);
        }, 1000);
      }, 500);
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Update the temporary message to show the error
      setMessages(prev => prev.map(m => 
        m.id === tempUserMessageId 
          ? {...m, content: `${m.content} (Error: ${(error as Error).message || 'Unknown error'})`, author: "Me (error)" } 
          : m
      ));
      setIsLoading(false);
    }
  }, [userInput, channelId, formatEventAsMessage]);

  return { 
    messages, 
    isLoading, 
    userInput, 
    setUserInput, 
    sendMessage 
  };
}