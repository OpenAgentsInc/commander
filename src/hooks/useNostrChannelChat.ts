import { useState, useEffect, useCallback, useRef } from 'react';
import { Effect, Layer, Option, Stream, Runtime, Exit, Cause } from 'effect';
import { NostrService, NostrServiceLive, DefaultNostrServiceConfigLayer, type NostrEvent, type NostrFilter } from '@/services/nostr';
import { NIP19Service, NIP19ServiceLive } from '@/services/nip19';
import { NIP28Service, NIP28ServiceLive } from '@/services/nip28';
import { type ChatMessageProps } from '@/components/chat/ChatMessage';
import { hexToBytes } from '@noble/hashes/utils';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';

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
  const nostrSubscriptionIdRef = useRef<string | null>(null);

  // Create a runtime reference that we can use throughout the hook
  const runtimeRef = useRef<Runtime.Runtime<NostrService & NIP19Service & NIP28Service>>();

  // Initialize the runtime when the hook is first used
  useEffect(() => {
    runtimeRef.current = Runtime.make(
      Layer.provide(
        Layer.merge(Layer.merge(NostrServiceLive, NIP19ServiceLive), NIP28ServiceLive),
        DefaultNostrServiceConfigLayer
      )
    );
  }, []);

  // Format a pubkey as an npub for display
  const formatPubkeyForDisplay = useCallback(async (pubkey: string): Promise<string> => {
    if (!runtimeRef.current) return pubkey.substring(0, 8) + "...";
    
    const program = Effect.gen(function*(_) {
      const nip19 = yield* _(NIP19Service);
      return yield* _(nip19.encodeNpub(pubkey));
    });
    
    try {
      const exit = await runtimeRef.current.runPromiseExit(program);
      if (Exit.isSuccess(exit)) return exit.value;
      console.error("Failed to encode npub:", Cause.pretty(exit.cause));
    } catch (error) {
      console.error("Error encoding npub:", error);
    }
    
    return pubkey.substring(0, 8) + "...";
  }, []);

  // Convert a NostrEvent to a ChatMessageProps
  const formatEventAsMessage = useCallback(async (event: NostrEvent): Promise<ChatMessageProps> => {
    const authorDisplay = await formatPubkeyForDisplay(event.pubkey);
    
    return {
      id: event.id,
      content: event.content,
      role: event.pubkey === DEMO_USER_PK ? 'user' : 'assistant', // Use 'user' for our messages, 'assistant' for others
      author: authorDisplay,
      timestamp: event.created_at * 1000,
    };
  }, [formatPubkeyForDisplay]);

  // Load initial messages and subscribe to new ones when channelId changes
  useEffect(() => {
    if (!channelId || !runtimeRef.current) return;

    setIsLoading(true);
    setMessages([{ role: 'system', content: 'Loading channel messages...', timestamp: Date.now() }]);

    // Filter for messages in this channel
    const filter: NostrFilter = {
      kinds: [42], // Kind 42 is channel message
      '#e': [channelId], // Messages tagging this channel
      // Could add 'limit' for performance with many messages
    };

    // Fetch initial messages
    const initialFetchProgram = Effect.gen(function*(_) {
      const nip28Service = yield* _(NIP28Service);
      const events = yield* _(nip28Service.getChannelMessages(channelId));
      const formattedMessages = yield* _(Effect.all(
        events.map(e => Effect.promise(() => formatEventAsMessage(e)))
      ));
      return formattedMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    });

    runtimeRef.current.runPromise(initialFetchProgram)
      .then(initialMsgs => {
        if (initialMsgs.length === 0) {
          setMessages([{ 
            role: 'system', 
            content: 'No messages yet. Be the first to say something!', 
            timestamp: Date.now() 
          }]);
        } else {
          setMessages(initialMsgs);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching initial NIP28 messages:", error);
        setIsLoading(false);
        setMessages([{ 
          id: 'error-fetch', 
          role: 'system', 
          content: `Error fetching messages: ${error.message || 'Unknown error'}`, 
          timestamp: Date.now() 
        }]);
      });

    // Subscribe to new messages using NostrService directly
    const subId = `nip28-${channelId}-${Date.now()}`;
    nostrSubscriptionIdRef.current = subId;

    const subscriptionEffect = Effect.gen(function*(_) {
      const nostr = yield* _(NostrService);
      const stream = yield* _(nostr.subscribeEvents([filter], subId));

      yield* _(Stream.runForEach(stream, (event) => Effect.promise(async () => {
        const newMessage = await formatEventAsMessage(event);
        setMessages(prev => {
          // Don't add duplicates
          if (prev.find(m => m.id === newMessage.id)) return prev;
          // Add new message and sort by timestamp
          const newMsgArray = [...prev.filter(m => m.role !== 'system'), newMessage];
          return newMsgArray.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
        });
      })));
    });

    // Run the subscription in a forked fiber to avoid blocking
    const fiber = runtimeRef.current.runFork(subscriptionEffect);

    // Cleanup function
    return () => {
      if (nostrSubscriptionIdRef.current && runtimeRef.current) {
        const unsubEffect = Effect.gen(function*(_) {
          const nostr = yield* _(NostrService);
          yield* _(nostr.closeSubscription(nostrSubscriptionIdRef.current!));
        });
        
        runtimeRef.current.runPromise(unsubEffect)
          .catch(err => console.error("Error closing NIP28 subscription:", err));
        
        nostrSubscriptionIdRef.current = null;
      }
      
      fiber.unsafeInterrupt();
    };
  }, [channelId, formatEventAsMessage]);

  // Send a message to the channel
  const sendMessage = useCallback(async () => {
    if (!userInput.trim() || !channelId || !runtimeRef.current) return;

    setIsLoading(true);
    
    // Create a temporary message to show immediately while sending
    const tempUserMessageId = `temp-${Date.now()}`;
    const tempUserMessage: ChatMessageProps = {
      id: tempUserMessageId,
      role: 'user',
      content: userInput.trim(),
      author: "Me (sending...)",
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, tempUserMessage]);
    const currentInput = userInput.trim();
    setUserInput('');

    try {
      const sendProgram = Effect.gen(function*(_) {
        const nip28Service = yield* _(NIP28Service);
        return yield* _(nip28Service.sendChannelMessage({
          channelCreateEventId: channelId,
          content: currentInput,
          secretKey: DEMO_USER_SK
        }));
      });

      await runtimeRef.current.runPromise(sendProgram);
      
      // Message sent - it will appear via subscription
      // Remove temporary message to avoid duplicates
      setMessages(prev => prev.filter(m => m.id !== tempUserMessageId));
    } catch (error) {
      console.error("Error sending NIP28 message:", error);
      
      // Update the temporary message to show the error
      setMessages(prev => prev.map(m => 
        m.id === tempUserMessageId 
          ? {...m, content: `${m.content} (Error: ${(error as Error).message || 'Unknown error'})`, author: "Me (error)" } 
          : m
      ));
    } finally {
      setIsLoading(false);
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