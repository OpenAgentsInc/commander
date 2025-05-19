// src/hooks/useNostrChannelChat.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Effect, Exit, Cause } from 'effect';
import { NIP28Service, DecryptedChannelMessage } from '@/services/nip28';
import { type ChatMessageProps } from '@/components/chat/ChatMessage';
import { hexToBytes } from '@noble/hashes/utils';
import { getPublicKey } from 'nostr-tools/pure';
import { mainRuntime } from '@/services/runtime';
import { NostrRequestError, NostrPublishError } from '@/services/nostr';
import { NIP04DecryptError, NIP04EncryptError } from '@/services/nip04';

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
  
  // Store the runtime reference
  const runtimeRef = useRef(mainRuntime);
  // Store the subscription reference for cleanup
  const subscriptionRef = useRef<{ unsub: () => void } | null>(null);
  
  // Format a pubkey as a shorter display string
  const formatPubkeyForDisplay = useCallback((pubkey: string): string => {
    if (!pubkey || pubkey.length < 10) return "anon";
    return pubkey.substring(0, 6) + "..." + pubkey.substring(pubkey.length - 4);
  }, []);

  // Map a NostrEvent with decrypted content to a ChatMessageProps
  const mapEventToMessage = useCallback((event: DecryptedChannelMessage): ChatMessageProps => ({
    id: event.id,
    content: event.decryptedContent,
    role: event.pubkey === DEMO_USER_PK ? 'user' : 'assistant',
    author: formatPubkeyForDisplay(event.pubkey),
    timestamp: event.created_at * 1000,
  }), [formatPubkeyForDisplay]);

  // Load messages for the channel and subscribe to new ones
  useEffect(() => {
    // Ignore invalid or fallback channel IDs
    if (!channelId || channelId.startsWith('fallback-')) {
      console.warn("[Hook] Invalid or fallback channelId, skipping Nostr operations:", channelId);
      setMessages([{ 
        id: 'fallback-info', 
        role: 'system', 
        content: `Using fallback channel: ${channelId}. Not connected to Nostr.`, 
        timestamp: Date.now() 
      }]);
      setIsLoading(false);
      return;
    }
    
    console.log("[Hook] Initializing chat for channel:", channelId);
    setIsLoading(true);
    setMessages([{ 
      id: 'system-init', 
      role: 'system', 
      content: `Loading messages for channel ${formatPubkeyForDisplay(channelId)}...`,
      timestamp: Date.now() 
    }]);

    const rt = runtimeRef.current;
    if (!rt) {
      console.error("[Hook] Runtime not available for loading messages.");
      setIsLoading(false);
      setMessages([{ 
        id: 'error-runtime', 
        role: 'system', 
        content: 'Runtime not available. Cannot load messages.',
        timestamp: Date.now() 
      }]);
      return;
    }

    // Create an Effect to get the channel messages
    const getMessagesEffect = Effect.flatMap(
      NIP28Service,
      nip28Service => nip28Service.getChannelMessages(channelId, DEMO_USER_SK)
    );

    // Run the Effect
    rt.runPromiseExit(getMessagesEffect)
      .then((exitResult: Exit.Exit<DecryptedChannelMessage[], NostrRequestError | NIP04DecryptError>) => {
        setIsLoading(false);
        
        if (Exit.isSuccess(exitResult)) {
          // If successful, process the messages
          const events = exitResult.value;
          console.log(`[Hook] Received ${events.length} channel messages:`, events);
          
          if (events.length > 0) {
            // Map the decrypted events to chat messages
            const mappedMessages = events.map(mapEventToMessage);
            setMessages(mappedMessages);
          } else {
            // No messages yet
            setMessages([{
              id: 'no-messages',
              role: 'system',
              content: 'No messages yet. Be the first to say something!',
              timestamp: Date.now()
            }]);
          }
        } else {
          // If failed, show an error
          const error = Cause.squash(exitResult.cause);
          console.error("[Hook] Error fetching channel messages:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          setMessages([{ 
            id: 'error-fetch', 
            role: 'system', 
            content: `Error loading messages: ${errorMessage}`,
            timestamp: Date.now() 
          }]);
        }
        
        // Subscribe to new messages regardless of initial fetch success
        const subscribeEffect = Effect.flatMap(
          NIP28Service,
          nip28Service => nip28Service.subscribeToChannelMessages(
            channelId,
            DEMO_USER_SK,
            (newEvent) => {
              console.log("[Hook] Received new message via subscription:", newEvent);
              // Add the new message to the state
              setMessages(prev => {
                // Skip if we already have this message (duplicates can happen)
                if (prev.some(m => m.id === newEvent.id)) return prev;
                
                // Otherwise add the new message
                const newMsg = mapEventToMessage(newEvent);
                return [...prev.filter(m => m.role !== 'system'), newMsg]
                  .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
              });
            }
          )
        );
        
        // Run the subscription Effect
        rt.runPromiseExit(subscribeEffect)
          .then((subExit: Exit.Exit<{ unsub: () => void }, NostrRequestError>) => {
            if (Exit.isSuccess(subExit)) {
              console.log("[Hook] Subscribed to channel messages");
              // Store the subscription for cleanup
              subscriptionRef.current = subExit.value;
            } else {
              const error = Cause.squash(subExit.cause);
              console.error("[Hook] Error subscribing to channel messages:", error);
              const errorMessage = error instanceof Error ? error.message : String(error);
              setMessages(prev => [...prev, { 
                id: 'sub-error', 
                role: 'system', 
                content: `Error subscribing: ${errorMessage}`,
                timestamp: Date.now() 
              }]);
            }
          });
      });

    // Cleanup function
    return () => {
      console.log("[Hook] Cleaning up subscription for channel:", channelId);
      // Unsubscribe if we have a subscription
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsub();
          console.log("[Hook] Unsubscribed from channel messages");
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("[Hook] Error unsubscribing:", errorMessage);
        }
        subscriptionRef.current = null;
      }
    };
  }, [channelId, formatPubkeyForDisplay, mapEventToMessage]);

  // Send a message to the channel
  const sendMessage = useCallback(() => {
    if (!userInput.trim() || !channelId || channelId.startsWith('fallback-')) {
      if (channelId.startsWith('fallback-')) {
        console.warn("[Hook] Cannot send message to fallback channel:", channelId);
      }
      return;
    }
    
    const contentToSend = userInput.trim();
    // Clear the input field immediately for better UX
    setUserInput('');
    setIsLoading(true);
    
    // Create a temporary message to show immediately
    const tempMessageId = `temp-${Date.now()}`;
    const tempMessage: ChatMessageProps = {
      id: tempMessageId,
      role: 'user',
      content: contentToSend,
      author: formatPubkeyForDisplay(DEMO_USER_PK) + ' (sending...)',
      timestamp: Date.now(),
    };
    
    // Add the temp message to the UI
    setMessages(prev => [...prev.filter(m => m.role !== 'system'), tempMessage]);
    
    const rt = runtimeRef.current;
    if (!rt) {
      console.error("[Hook] Runtime not available for sending message.");
      setIsLoading(false);
      
      // Update the temp message to show error
      setMessages(prev => prev.map(m => 
        m.id === tempMessageId ? 
        {...m, content: `${m.content} (Error: Runtime not available)`, author: "Me (error)" } : 
        m
      ));
      return;
    }
    
    // Create an Effect to send the message
    const sendMessageEffect = Effect.flatMap(
      NIP28Service,
      nip28Service => nip28Service.sendChannelMessage({
        channelCreateEventId: channelId,
        content: contentToSend,
        secretKey: DEMO_USER_SK,
      })
    );
    
    // Run the Effect
    rt.runPromiseExit(sendMessageEffect)
      .then((exitResult: Exit.Exit<any, NostrRequestError | NostrPublishError | NIP04EncryptError>) => {
        setIsLoading(false);
        
        // Remove the temporary message
        setMessages(prev => prev.filter(m => m.id !== tempMessageId));
        
        if (Exit.isSuccess(exitResult)) {
          // If successful, the message should appear via subscription
          // We can also manually add it if needed for better UX
          console.log("[Hook] Message sent successfully:", exitResult.value);
          
          // The subscription will add this message, but we can also add it manually
          // for immediate feedback (the subscription might be slow)
          const sentMessage: ChatMessageProps = {
            id: exitResult.value.id,
            role: 'user',
            content: contentToSend,
            author: formatPubkeyForDisplay(DEMO_USER_PK),
            timestamp: exitResult.value.created_at * 1000,
          };
          
          setMessages(prev => {
            // If we don't already have this message (from the subscription)
            if (!prev.some(m => m.id === sentMessage.id)) {
              return [...prev, sentMessage].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            }
            return prev;
          });
        } else {
          // If failed, show an error
          const error = Cause.squash(exitResult.cause);
          console.error("[Hook] Error sending message:", error);
          
          // Add an error message with proper type checking
          const errorMessage = error instanceof Error ? error.message : String(error);
          setMessages(prev => [...prev, { 
            id: `error-send-${Date.now()}`, 
            role: 'system', 
            content: `Failed to send: ${errorMessage}`,
            timestamp: Date.now() 
          }]);
        }
      })
      .catch((error: unknown) => {
        // Handle unexpected errors with proper typing
        setIsLoading(false);
        console.error("[Hook] Critical error sending message:", error);
        
        // Remove the temporary message
        setMessages(prev => prev.filter(m => m.id !== tempMessageId));
        
        // Add an error message with proper type checking
        const errorMessage = error instanceof Error ? error.message : String(error);
        setMessages(prev => [...prev, { 
          id: `error-critical-${Date.now()}`, 
          role: 'system', 
          content: `Critical error: ${errorMessage}`,
          timestamp: Date.now() 
        }]);
      });
  }, [userInput, channelId, formatPubkeyForDisplay]);

  return { 
    messages, 
    isLoading, 
    userInput, 
    setUserInput, 
    sendMessage 
  };
}