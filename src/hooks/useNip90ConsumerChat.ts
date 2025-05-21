import { useState, useCallback, useEffect, useRef } from 'react';
import { type ChatMessageProps, type MessageRole } from '@/components/chat/ChatMessage';
import { Effect, Exit, Cause, Layer, Runtime } from 'effect';
import { NIP04Service, NIP04ServiceLive } from '@/services/nip04';
import { NostrEvent, NostrFilter } from '@/services/nostr';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import { decryptNip04Content } from '@/helpers/nip90/event_decryption';
import { SimplePool } from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer, TelemetryEvent } from '@/services/telemetry';
import { NIP19Service, NIP19ServiceLive } from '@/services/nip19';

interface UseNip90ConsumerChatParams {
  nostrPrivateKeyHex: string | null;
  nostrPublicKeyHex: string | null;
  targetDvmPubkeyHex?: string;
  runtime: Runtime.Runtime<TelemetryService | NIP19Service | NIP04Service>; // Pass the app's runtime
}

const DEFAULT_RELAYS = ["wss://relay.damus.io", "wss://relay.nostr.band", "wss://nos.lol"];

export function useNip90ConsumerChat({
  nostrPrivateKeyHex,
  nostrPublicKeyHex,
  targetDvmPubkeyHex: initialTargetDvmPubkeyHex,
  runtime
}: UseNip90ConsumerChatParams) {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const poolRef = useRef<SimplePool | null>(null);
  const activeSubsRef = useRef<Map<string, any>>(new Map()); // Map eventId to subscription

  // Effect to get telemetry service once
  const getTelemetry = () => Effect.provide(TelemetryService, runtime);

  useEffect(() => {
    poolRef.current = new SimplePool();

    Effect.runFork(getTelemetry().pipe(
      Effect.flatMap(ts => ts.trackEvent({ category: "nip90_consumer", action: "hook_init", label: `Target DVM: ${initialTargetDvmPubkeyHex || 'any'}`}))
    ));

    return () => {
      activeSubsRef.current.forEach(sub => sub.unsub());
      activeSubsRef.current.clear();
      if (poolRef.current) {
        // poolRef.current.close(DEFAULT_RELAYS); // Close specific relays if needed, or all
        poolRef.current = null; // Help with GC
      }
      Effect.runFork(getTelemetry().pipe(
        Effect.flatMap(ts => ts.trackEvent({ category: "nip90_consumer", action: "hook_cleanup" }))
      ));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTargetDvmPubkeyHex]); // Only re-init pool if target DVM changes significantly? Or never.

  const addMessage = useCallback((role: MessageRole, content: string, author?: string, id?: string, isStreaming = false) => {
    setMessages(prev => {
      // Prevent duplicate system messages if content is very similar
      if (role === 'system' && prev.length > 0 && prev[prev.length - 1].role === 'system' && prev[prev.length - 1].content.startsWith(content.substring(0, 20))) {
        return prev;
      }
      return [...prev, {
        id: id || `msg-${Date.now()}-${Math.random()}`,
        role,
        content,
        author: author || (role === 'user' ? 'You' : 'Agent'),
        timestamp: Date.now(),
        isStreaming
      }];
    });
  }, []);

  const sendMessage = useCallback(async () => {
    if (!userInput.trim() || !nostrPrivateKeyHex || !nostrPublicKeyHex || !poolRef.current) {
      addMessage('system', 'Error: Consumer identity not ready or input is empty.');
      return;
    }

    const prompt = userInput.trim();
    addMessage('user', prompt);
    setUserInput('');
    setIsLoading(true);

    Effect.runFork(getTelemetry().pipe(
      Effect.flatMap(ts => ts.trackEvent({ category: "nip90_consumer", action: "send_job_request_start", label: prompt.substring(0,30)}))
    ));

    // Decode targetDvmNpub if it's an npub
    let finalTargetDvmPkHex = initialTargetDvmPubkeyHex;
    if (initialTargetDvmPubkeyHex && initialTargetDvmPubkeyHex.startsWith("npub1")) {
      const decodeEffect = Effect.provide(
        Effect.flatMap(NIP19Service, nip19 => nip19.decode(initialTargetDvmPubkeyHex)),
        runtime // Use the passed runtime
      );
      const decodeExit = await Effect.runPromiseExit(decodeEffect);
      if (Exit.isSuccess(decodeExit) && decodeExit.value.type === 'npub') {
        finalTargetDvmPkHex = decodeExit.value.data;
      } else {
        addMessage('system', `Error: Invalid target DVM npub: ${initialTargetDvmPubkeyHex}`);
        setIsLoading(false);
        return;
      }
    }

    try {
      const skBytes = hexToBytes(nostrPrivateKeyHex);
      const inputs: Array<[string, string, string?, string?, string?]> = [[prompt, "text"]];

      const jobRequestEffect = createNip90JobRequest(
        skBytes,
        finalTargetDvmPkHex || "", // Pass empty if no specific DVM, createNip90JobRequest will handle it
        inputs,
        "text/plain",
        undefined, // No bid for now
        5050, // Kind 5050 for general text inference
      ).pipe(Effect.provide(NIP04ServiceLive)); // Provide NIP04Service locally for this Effect

      const signedEvent = await Effect.runPromise(jobRequestEffect);

      const publishPromises = poolRef.current.publish(DEFAULT_RELAYS, signedEvent);
      await Promise.any(publishPromises); // Wait for at least one relay to accept

      Effect.runFork(getTelemetry().pipe(
        Effect.flatMap(ts => ts.trackEvent({ category: "nip90_consumer", action: "job_request_published", label: signedEvent.id }))
      ));
      addMessage('system', `Job request sent (ID: ${signedEvent.id.substring(0,8)}...). Waiting for DVM...`, 'System');

      const resultKind = signedEvent.kind + 1000; // e.g., 6050
      const filters: NostrFilter[] = [
        { kinds: [resultKind], "#e": [signedEvent.id], authors: finalTargetDvmPkHex ? [finalTargetDvmPkHex] : undefined, since: signedEvent.created_at - 5, limit: 5 },
        { kinds: [7000], "#e": [signedEvent.id], authors: finalTargetDvmPkHex ? [finalTargetDvmPkHex] : undefined, since: signedEvent.created_at - 5, limit: 10 }
      ];

      // Subscribe to events - SimplePool API might vary between versions, adjust as needed
      // Using any type assertion because TypeScript definitions might not match the actual API
      const sub = (poolRef.current as any).subscribeMany(DEFAULT_RELAYS, filters, { id: `subscription-${signedEvent.id}` });
      activeSubsRef.current.set(signedEvent.id, sub); // Store subscription

      // Listen to events from subscription - API might vary
      (sub as any).on('event', async (event: NostrEvent) => {
        Effect.runFork(getTelemetry().pipe(
          Effect.flatMap(ts => ts.trackEvent({ category: "nip90_consumer", action: "job_update_received", label: event.id, value: `Kind: ${event.kind}` }))
        ));

        let content = event.content;
        const isEncrypted = event.tags.some(t => t[0] === 'encrypted');

        if (isEncrypted && nostrPrivateKeyHex) {
          const decryptEffect = decryptNip04Content(nostrPrivateKeyHex, event.pubkey, event.content)
                                  .pipe(Effect.provide(NIP04ServiceLive)); // Provide NIP04Service locally
          const decryptExit = await Effect.runPromiseExit(decryptEffect);
          if (Exit.isSuccess(decryptExit)) {
            content = decryptExit.value;
          } else {
            content = "[Error decrypting DVM response]";
            console.error("Decryption error:", Cause.squash(decryptExit.cause));
          }
        }

        const dvmAuthor = `DVM (${event.pubkey.substring(0,6)}...)`;
        if (event.kind === 7000) {
          const statusTag = event.tags.find(t => t[0] === 'status');
          const status = statusTag ? statusTag[1] : "update";
          const extraInfo = statusTag && statusTag.length > 2 ? statusTag[2] : "";
          addMessage('system', `Status from ${dvmAuthor}: ${status} ${extraInfo ? `- ${extraInfo}` : ''} ${content ? `- ${content}`:''}`.trim(), 'System');
          if (status === 'error' || status === 'success') {
            setIsLoading(false);
            if (activeSubsRef.current.has(signedEvent.id)) {
              activeSubsRef.current.get(signedEvent.id)?.unsub();
              activeSubsRef.current.delete(signedEvent.id);
            }
          }
        } else if (event.kind >= 6000 && event.kind <= 6999) { // Job result
          const amountTag = event.tags.find(t => t[0] === 'amount');
          let paymentInfo = "";
          if (amountTag) {
            const msats = amountTag[1];
            const invoice = amountTag[2];
            paymentInfo = `\n💰 Payment: ${msats} msats. ${invoice ? `Invoice: ${invoice.substring(0,15)}...` : ""}`;
          }
          addMessage('assistant', `${content}${paymentInfo}`, dvmAuthor, event.id);
          setIsLoading(false);
          if (activeSubsRef.current.has(signedEvent.id)) {
            activeSubsRef.current.get(signedEvent.id)?.unsub();
            activeSubsRef.current.delete(signedEvent.id);
          }
        }
      });

      (sub as any).on('eose', () => {
        Effect.runFork(getTelemetry().pipe(
          Effect.flatMap(ts => ts.trackEvent({ category: "nip90_consumer", action: "subscription_eose", label: `EOSE for job ${signedEvent.id}`}))
        ));
        // Optionally handle EOSE, e.g., if no result after EOSE, consider it timed out or no DVM picked it up.
        // For this demo, we wait for a result or error feedback.
      });

    } catch (error: any) {
      addMessage('system', `Error: ${error.message || "Failed to send NIP-90 request"}`);
      console.error("NIP-90 Request Error:", error);
      setIsLoading(false);
      Effect.runFork(getTelemetry().pipe(
        Effect.flatMap(ts => ts.trackEvent({ category: "nip90_consumer", action: "job_request_failed", value: error.message }))
      ));
    }
  }, [userInput, nostrPrivateKeyHex, nostrPublicKeyHex, initialTargetDvmPubkeyHex, addMessage, runtime]);

  return { messages, isLoading, userInput, setUserInput, sendMessage };
}