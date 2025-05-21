import { useState, useCallback, useEffect, useRef } from 'react';
import { type ChatMessageProps, type MessageRole } from '@/components/chat/ChatMessage';
import { Effect, Exit, Cause, Layer, Runtime, Option } from 'effect'; 
import { NIP04Service, NIP04ServiceLive } from '@/services/nip04';
import { NostrEvent, NostrFilter } from '@/services/nostr';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import { decryptNip04Content } from '@/helpers/nip90/event_decryption';
import { SimplePool } from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer, TelemetryEvent } from '@/services/telemetry';
import { NIP19Service, NIP19ServiceLive, NIP19DecodeError } from '@/services/nip19';

interface UseNip90ConsumerChatParams {
  nostrPrivateKeyHex: string | null;
  nostrPublicKeyHex: string | null;
  targetDvmPubkeyHex?: string; // This prop will now be treated as explicitly hex OR npub
  runtime: Runtime.Runtime<TelemetryService | NIP19Service | NIP04Service>;
}

const DEFAULT_RELAYS = ["wss://relay.damus.io", "wss://relay.nostr.band", "wss://nos.lol"];

export function useNip90ConsumerChat({
  nostrPrivateKeyHex,
  nostrPublicKeyHex,
  targetDvmPubkeyHex: initialTargetDvmInput, // Renamed to avoid confusion
  runtime
}: UseNip90ConsumerChatParams) {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const poolRef = useRef<SimplePool | null>(null);
  const activeSubsRef = useRef<Map<string, any>>(new Map());

  const getTelemetry = () => Effect.provide(TelemetryService, runtime);

  useEffect(() => {
    poolRef.current = new SimplePool();
    Effect.runFork(getTelemetry().pipe(
      Effect.flatMap(ts => ts.trackEvent({ category: "nip90_consumer", action: "hook_init", label: `Target DVM: ${initialTargetDvmInput || 'any'}`}))
    ));
    return () => {
      activeSubsRef.current.forEach(sub => sub.unsub());
      activeSubsRef.current.clear();
      if (poolRef.current) {
        // poolRef.current.close(DEFAULT_RELAYS); // Consider if closing all relays is always desired
        poolRef.current = null;
      }
      Effect.runFork(getTelemetry().pipe(
        Effect.flatMap(ts => ts.trackEvent({ category: "nip90_consumer", action: "hook_cleanup" }))
      ));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTargetDvmInput]);

  const addMessage = useCallback((role: MessageRole, content: string, author?: string, id?: string, isStreaming = false) => {
    setMessages(prev => {
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
    const telemetry = await Effect.runPromise(getTelemetry()); // Get telemetry instance

    if (!userInput.trim()) {
      addMessage('system', 'Error: Input is empty.');
      return;
    }

    if (!nostrPrivateKeyHex || nostrPrivateKeyHex.length !== 64) {
      addMessage('system', 'Error: Consumer private key is not ready or invalid. Cannot send NIP-90 request.');
      telemetry.trackEvent({ category: "nip90_consumer", action: "send_job_error", label: "invalid_consumer_sk" });
      return;
    }
    if (!nostrPublicKeyHex || nostrPublicKeyHex.length !== 64) {
        addMessage('system', 'Error: Consumer public key is not ready or invalid.');
        telemetry.trackEvent({ category: "nip90_consumer", action: "send_job_error", label: "invalid_consumer_pk" });
        return;
    }
    if (!poolRef.current) {
        addMessage('system', 'Error: Nostr connection pool not initialized.');
        telemetry.trackEvent({ category: "nip90_consumer", action: "send_job_error", label: "nostr_pool_not_ready" });
        return;
    }


    const prompt = userInput.trim();
    addMessage('user', prompt);
    setUserInput('');
    setIsLoading(true);

    telemetry.trackEvent({ category: "nip90_consumer", action: "send_job_request_start", label: prompt.substring(0,30)});

    let finalTargetDvmPkHexForEncryption: string | undefined = undefined;
    let finalTargetDvmPkHexForPTag: string | undefined = undefined;

    if (initialTargetDvmInput && initialTargetDvmInput.trim()) {
      if (initialTargetDvmInput.startsWith("npub1")) {
        const decodeEffect = Effect.provide(
          Effect.flatMap(NIP19Service, nip19 => nip19.decode(initialTargetDvmInput)),
          runtime
        );
        const decodeExit = await Effect.runPromiseExit(decodeEffect);

        if (Exit.isSuccess(decodeExit) && decodeExit.value.type === 'npub') {
          finalTargetDvmPkHexForEncryption = decodeExit.value.data;
          finalTargetDvmPkHexForPTag = decodeExit.value.data; // Use decoded hex for p-tag
        } else {
          const errorReason = Exit.isFailure(decodeExit) ? Cause.squash(decodeExit.cause) : "Not an npub";
          addMessage('system', `Error: Invalid target DVM npub: ${initialTargetDvmInput}. Reason: ${errorReason instanceof Error ? errorReason.message : errorReason}`);
          telemetry.trackEvent({ category: "nip90_consumer", action: "send_job_error", label: "invalid_target_dvm_npub", value: initialTargetDvmInput });
          setIsLoading(false);
          return;
        }
      } else if (initialTargetDvmInput.length === 64 && /^[0-9a-fA-F]{64}$/.test(initialTargetDvmInput)) {
        finalTargetDvmPkHexForEncryption = initialTargetDvmInput;
        finalTargetDvmPkHexForPTag = initialTargetDvmInput; // Use hex for p-tag
      } else {
        addMessage('system', `Error: Invalid target DVM public key format: ${initialTargetDvmInput}. Must be npub or 64-char hex.`);
        telemetry.trackEvent({ category: "nip90_consumer", action: "send_job_error", label: "invalid_target_dvm_hex", value: initialTargetDvmInput });
        setIsLoading(false);
        return;
      }
    }
    // If initialTargetDvmInput is empty, finalTargetDvmPkHexForEncryption and finalTargetDvmPkHexForPTag remain undefined.
    // createNip90JobRequest will handle this by sending an unencrypted request.

    try {
      const skBytes = hexToBytes(nostrPrivateKeyHex);
      // Input structure for NIP-90: Array<[value, type, relay_hint?, marker?]>
      // Ensure the inner array matches this structure. 'text' is the type.
      const inputs: Array<[string, string, string?, string?, string?]> = [[prompt, "text"]];


      const jobRequestEffect = createNip90JobRequest(
        skBytes,
        // Pass the DVM PK intended for encryption (can be undefined for unencrypted/broadcast)
        finalTargetDvmPkHexForEncryption,
        inputs,
        "text/plain",
        undefined, // No bid for now
        5050, // Kind 5050 for general text inference
        // Pass the DVM PK for the p-tag (can be undefined if truly broadcasting to ANY dvm, though often same as encryption target)
        finalTargetDvmPkHexForPTag
      );

      // Provide NIP04Service from NIP04ServiceLive
      const jobRequestWithNip04 = Effect.provide(jobRequestEffect, NIP04ServiceLive);

      const signedEvent = await Effect.runPromise(jobRequestWithNip04);

      const publishPromises = poolRef.current.publish(DEFAULT_RELAYS, signedEvent);
      await Promise.any(publishPromises);

      telemetry.trackEvent({ category: "nip90_consumer", action: "job_request_published", label: signedEvent.id });
      addMessage('system', `Job request sent (ID: ${signedEvent.id.substring(0,8)}...). Waiting for DVM...`, 'System');

      const resultKind = signedEvent.kind + 1000;
      const filters: NostrFilter[] = [
        { kinds: [resultKind], "#e": [signedEvent.id], authors: finalTargetDvmPkHexForPTag ? [finalTargetDvmPkHexForPTag] : undefined, since: signedEvent.created_at - 5, limit: 5 },
        { kinds: [7000], "#e": [signedEvent.id], authors: finalTargetDvmPkHexForPTag ? [finalTargetDvmPkHexForPTag] : undefined, since: signedEvent.created_at - 5, limit: 10 }
      ];

      // Use subscribeMany which is available in the current nostr-tools version 
      const sub = (poolRef.current as any).subscribeMany(DEFAULT_RELAYS, filters);
      activeSubsRef.current.set(signedEvent.id, sub);

      sub.on('event', async (event: NostrEvent) => {
        telemetry.trackEvent({ category: "nip90_consumer", action: "job_update_received", label: event.id, value: `Kind: ${event.kind}` });

        let content = event.content;
        const isEncrypted = event.tags.some(t => t[0] === 'encrypted');

        if (isEncrypted && nostrPrivateKeyHex) {
          const decryptEffect = decryptNip04Content(nostrPrivateKeyHex, event.pubkey, event.content)
                                  .pipe(Effect.provide(NIP04ServiceLive));
          const decryptExit = await Effect.runPromiseExit(decryptEffect);
          if (Exit.isSuccess(decryptExit)) {
            content = decryptExit.value;
          } else {
            content = "[Error decrypting DVM response]";
            const error = Cause.squash(decryptExit.cause);
            console.error("NIP-04 Decryption error in subscription:", error);
            telemetry.trackEvent({ category: "nip90_consumer", action: "nip04_decrypt_error", label: event.id, value: error instanceof Error ? error.message : 'Unknown error'});
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

      sub.on('eose', () => {
        telemetry.trackEvent({ category: "nip90_consumer", action: "subscription_eose", label: `EOSE for job ${signedEvent.id}`});
      });

    } catch (error: any) {
      addMessage('system', `Error: ${error.message || "Failed to send NIP-90 request"}`);
      console.error("NIP-90 Request Error:", error);
      setIsLoading(false);
      telemetry.trackEvent({ category: "nip90_consumer", action: "job_request_failed", value: error.message });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInput, nostrPrivateKeyHex, nostrPublicKeyHex, initialTargetDvmInput, addMessage, runtime]); // Ensure initialTargetDvmInput is in deps

  return { messages, isLoading, userInput, setUserInput, sendMessage };
}