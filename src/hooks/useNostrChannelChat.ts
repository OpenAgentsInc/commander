import { useState, useEffect, useCallback, useRef } from 'react';
import { Effect } from 'effect';
import { NIP28Service } from '@/services/nip28';
import { type ChatMessageProps } from '@/components/chat/ChatMessage';
import { hexToBytes } from '@noble/hashes/utils';
import { getPublicKey } from 'nostr-tools/pure';
import { mainRuntime } from '@/services/runtime';

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
  
  // Format a pubkey as a shorter display string
  const formatPubkeyForDisplay = useCallback((pubkey: string): string => {
    return pubkey.substring(0, 6) + "..." + pubkey.substring(pubkey.length - 4);
  }, []);

  // Load messages for the channel
  useEffect(() => {
    if (!channelId) return;
    
    console.log("Loading messages for channel:", channelId);
    setIsLoading(true);
    setMessages([{ 
      id: 'system-message', 
      role: 'system', 
      content: 'Loading channel messages...',
      timestamp: Date.now() 
    }]);

    // Use the runtime to get channel messages if available
    const rt = runtimeRef.current;
    if (rt) {
      try {
        const getMessagesEffect = Effect.gen(function*(_) {
          const nip28Service = yield* _(NIP28Service);
          console.log("[Hook] Fetching messages for channel:", channelId);
          return yield* _(nip28Service.getChannelMessages(channelId, { limit: 50 }));
        });

        rt.runPromise(getMessagesEffect)
          .then((events: any[]) => {
            console.log("[Hook] Received channel messages:", events);
            if (events && events.length > 0) {
              // Map the events to ChatMessageProps
              const mappedMessages = events.map(event => ({
                id: event.id,
                content: event.content,
                role: event.pubkey === DEMO_USER_PK ? 'user' : 'assistant',
                author: formatPubkeyForDisplay(event.pubkey),
                timestamp: event.created_at * 1000,
              }));
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
            setIsLoading(false);
          })
          .catch(error => {
            console.error("Error fetching channel messages:", error);
            setIsLoading(false);
            setMessages([{ 
              id: 'error-message', 
              role: 'system', 
              content: `Error loading messages: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: Date.now() 
            }]);
          });
      } catch (error) {
        console.error("Critical error in channel message loading:", error);
        setIsLoading(false);
        setMessages([{ 
          id: 'error-message', 
          role: 'system', 
          content: `Error loading messages: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: Date.now() 
        }]);
      }
    } else {
      // Fallback for when runtime is not available
      console.log("Runtime not available, using demo messages");
      setTimeout(() => {
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
    }

    // Cleanup function
    return () => {
      // Nothing to clean up for now
    };
  }, [channelId, formatPubkeyForDisplay]);

  // Send a message to the channel
  const sendMessage = useCallback(() => {
    if (!userInput.trim() || !channelId) return;

    // Create a temporary message to show immediately
    const tempMessageId = `temp-${Date.now()}`;
    const tempMessage: ChatMessageProps = {
      id: tempMessageId,
      role: 'user',
      content: userInput.trim(),
      author: 'Me',
      timestamp: Date.now()
    };
    
    // Add the temp message
    setMessages(prev => [...prev.filter(m => m.role !== 'system'), tempMessage]);
    setIsLoading(true);
    
    // Store the input and clear the input field
    const content = userInput.trim();
    setUserInput('');

    // Use the runtime to send a message if available
    const rt = runtimeRef.current;
    if (rt) {
      try {
        const sendMessageEffect = Effect.gen(function*(_) {
          const nip28Service = yield* _(NIP28Service);
          return yield* _(nip28Service.sendChannelMessage({
            channelCreateEventId: channelId,
            content,
            secretKey: DEMO_USER_SK
          }));
        });

        rt.runPromise(sendMessageEffect)
          .then((event: any) => {
            console.log("[Hook] Message sent successfully:", event);
            // Replace the temporary message with the real one
            const sentMessage: ChatMessageProps = {
              id: event.id,
              role: 'user',
              content,
              author: 'Me',
              timestamp: event.created_at * 1000
            };
            
            setMessages(prev => prev.map(m => m.id === tempMessageId ? sentMessage : m));
            setIsLoading(false);
            
            // Simulate a response in the demo
            setTimeout(() => {
              const responseMessage: ChatMessageProps = {
                id: `response-${Date.now()}`,
                role: 'assistant',
                content: `Got your message: "${content}"`,
                author: 'Channel Bot',
                timestamp: Date.now(),
              };
              
              setMessages(prev => [...prev, responseMessage]);
            }, 1000);
          })
          .catch(error => {
            console.error("Error sending message:", error);
            // Update the temporary message to show the error
            setMessages(prev => prev.map(m => 
              m.id === tempMessageId ? 
              {...m, content: `${m.content} (Error: ${error instanceof Error ? error.message : 'Unknown error'})`, author: "Me (error)" } : 
              m
            ));
            setIsLoading(false);
          });
      } catch (error) {
        console.error("Critical error sending message:", error);
        // Update the temporary message to show the error
        setMessages(prev => prev.map(m => 
          m.id === tempMessageId ? 
          {...m, content: `${m.content} (Error: ${error instanceof Error ? error.message : 'Unknown error'})`, author: "Me (error)" } : 
          m
        ));
        setIsLoading(false);
      }
    } else {
      // Fallback for when runtime is not available
      console.log("Runtime not available, using demo message flow");
      setTimeout(() => {
        // Replace the temp message with a "sent" message
        const sentMessage: ChatMessageProps = {
          id: `sent-${Date.now()}`,
          role: 'user',
          content,
          author: 'Me',
          timestamp: Date.now()
        };
        
        setMessages(prev => prev.map(m => m.id === tempMessageId ? sentMessage : m));
        setIsLoading(false);
        
        // Simulate a response in the demo
        setTimeout(() => {
          const responseMessage: ChatMessageProps = {
            id: `response-${Date.now()}`,
            role: 'assistant',
            content: `Got your message: "${content}"`,
            author: 'Channel Bot',
            timestamp: Date.now(),
          };
          
          setMessages(prev => [...prev, responseMessage]);
        }, 1000);
      }, 500);
    }
  }, [userInput, channelId]);

  return { 
    messages, 
    isLoading, 
    userInput, 
    setUserInput, 
    sendMessage 
  };
}