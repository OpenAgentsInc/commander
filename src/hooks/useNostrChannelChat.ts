// src/hooks/useNostrChannelChat.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Effect, Exit, Cause } from 'effect';
import { NIP28Service, DecryptedChannelMessage, NIP28InvalidInputError } from '@/services/nip28';
import { type ChatMessageProps } from '@/components/chat/ChatMessage';
import { hexToBytes } from '@noble/hashes/utils';
import { getPublicKey } from 'nostr-tools/pure';
import { getMainRuntime } from '@/services/runtime';
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
  const runtimeRef = useRef(getMainRuntime());
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

    // Run the Effect using runtime from ref
    Effect.runPromiseExit(Effect.provide(getMessagesEffect, rt))
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
              // Add the new message to the state if it's not already there
              setMessages(prev => {
                // Enhanced duplicate detection:
                // 1. Check if we already have this exact message ID
                // 2. Check if we have a contentHash match (for messages we sent that now come back as published)
                // 3. Check if we have an in-progress message with matching content (within last 10 seconds)
                
                // Case 1: We already have this exact message ID
                if (prev.some(m => m.id === newEvent.id)) {
                  console.log("[Hook] Skipping duplicate message with ID:", newEvent.id);
                  return prev;
                }
                
                // Case 2: Check for temporary message with matching content (recently sent by this user)
                // This handles the case where our temp message is already displayed but we're getting the real event now
                const msgTimestamp = newEvent.created_at * 1000;
                const recentTimeFrame = Date.now() - 10000; // Last 10 seconds
                const matchingTempMessage = prev.find(m => 
                  // If it's a recent message with matching content from the same user
                  m.id && m.id.startsWith('temp-') && 
                  m.content === newEvent.decryptedContent &&
                  m.timestamp && m.timestamp > recentTimeFrame && 
                  newEvent.pubkey === DEMO_USER_PK
                );
                
                if (matchingTempMessage && matchingTempMessage.id) {
                  console.log("[Hook] Replacing temp message with real message:", newEvent.id);
                  // Replace the temp message with the real one
                  return prev.map(m => 
                    m.id === matchingTempMessage.id ? 
                    {
                      id: newEvent.id,
                      role: 'user' as const,
                      content: newEvent.decryptedContent,
                      author: formatPubkeyForDisplay(newEvent.pubkey),
                      timestamp: newEvent.created_at * 1000,
                      publishedSuccessfully: true
                    } : 
                    m
                  ).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                }
                
                // Case 3: Check for any message with matching content hash 
                // (handles messages we deliberately marked with contentHash)
                const matchingHashMessage = prev.find(m => 
                  'contentHash' in m && 
                  newEvent.pubkey === DEMO_USER_PK && 
                  m.content === newEvent.decryptedContent
                );
                
                if (matchingHashMessage) {
                  console.log("[Hook] Found message with matching content hash, no need to add:", newEvent.id);
                  // If we have a message with matching content hash already properly displayed, 
                  // just keep what we have without adding duplicates
                  return prev;
                }
                
                // Default: This is a genuinely new message, add it
                console.log("[Hook] Adding new message from subscription:", newEvent.id);
                const newMsg = mapEventToMessage(newEvent);
                return [...prev.filter(m => m.role !== 'system'), newMsg]
                  .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
              });
            }
          )
        );
        
        // Run the subscription Effect using the runtime
        Effect.runPromiseExit(Effect.provide(subscribeEffect, rt))
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
    // Create a more reliable content hash for tracking the message across temp and real versions
    const contentHash = `${contentToSend}-${Date.now()}`;
    
    // Clear the input field immediately for better UX
    setUserInput('');
    
    // Create a temporary message to show immediately
    const tempMessageId = `temp-${contentHash}`;
    const tempMessage: ChatMessageProps = {
      id: tempMessageId,
      role: 'user',
      content: contentToSend,
      author: formatPubkeyForDisplay(DEMO_USER_PK),
      timestamp: Date.now(),
      contentHash, // Store hash for matching with real message later
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
    
    // Run the Effect using the runtime
    Effect.runPromiseExit(Effect.provide(sendMessageEffect, rt))
      .then((exitResult: Exit.Exit<any, NostrRequestError | NostrPublishError | NIP28InvalidInputError | NIP04EncryptError>) => {
        if (Exit.isSuccess(exitResult)) {
          // If successful, update the temp message with the real message ID
          console.log("[Hook] Message sent successfully:", exitResult.value);
          
          // Replace the temporary message with the real one
          setMessages(prev => {
            const realEvent = exitResult.value;
            // Find the temp message by contentHash and replace it
            return prev.map(m => 
              m.id === tempMessageId ? 
              {
                id: realEvent.id,
                role: 'user' as const,
                content: contentToSend,
                author: formatPubkeyForDisplay(DEMO_USER_PK),
                timestamp: realEvent.created_at * 1000,
                contentHash, // Maintain the contentHash for deduplication
                publishedSuccessfully: true // Mark as successfully published
              } : 
              m
            ).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          });
        } else {
          // If failed, update the temp message to show error
          const error = Cause.squash(exitResult.cause);
          console.error("[Hook] Error sending message:", error);
          
          // Update the temp message to show error
          setMessages(prev => prev.map(m => 
            m.id === tempMessageId ? 
            {
              ...m,
              content: `${contentToSend} (Error: Failed to send)`,
              author: formatPubkeyForDisplay(DEMO_USER_PK) + " (failed)",
              error: true
            } : 
            m
          ));
          
          // Add detailed error message
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
        console.error("[Hook] Critical error sending message:", error);
        
        // Update the temp message to show error
        setMessages(prev => prev.map(m => 
          m.id === tempMessageId ? 
          {
            ...m,
            content: `${contentToSend} (Critical error)`,
            author: formatPubkeyForDisplay(DEMO_USER_PK) + " (failed)",
            error: true
          } : 
          m
        ));
        
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