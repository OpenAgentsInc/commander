Okay, Agent, it seems the NIP-04 encryption is failing when the `nip90_consumer_chat` tries to send a job request. This usually points to an issue with either the consumer's private key or the target DVM's public key at the moment of encryption.

We've confirmed that the consumer pane (`Nip90ConsumerChatPane.tsx`) correctly uses `BIP39Service` and `BIP32Service` (with NIP-06 path `m/44'/1237'/0'/0/0`) to generate its Nostr identity. The problem likely lies in how these keys are handled or validated before the NIP-04 encryption call in `createNip90JobRequest` (which is called by `useNip90ConsumerChat.ts`).

Here are the detailed instructions to make the process more robust:

**Objective:** Ensure that NIP-04 encryption in the NIP-90 consumer chat only proceeds with valid keys and handles cases where encryption is not possible (e.g., broadcasting a request without a specific DVM target for encryption).

**Files to Modify:**

1.  `src/hooks/useNip90ConsumerChat.ts`
2.  `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`
3.  `src/helpers/nip90/event_creation.ts`

---

**I. Modify `src/hooks/useNip90ConsumerChat.ts`**

**Purpose:** Add robust checks for key validity before attempting to send a job request and handle NIP-19 decoding for the target DVM public key more carefully.

```typescript
// src/hooks/useNip90ConsumerChat.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { type ChatMessageProps, type MessageRole } from '@/components/chat/ChatMessage';
import { Effect, Exit, Cause, Layer, Runtime, Option } from 'effect'; // Added Option
import { NIP04Service, NIP04ServiceLive } from '@/services/nip04';
import { NostrEvent, NostrFilter } from '@/services/nostr';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import { decryptNip04Content } from '@/helpers/nip90/event_decryption';
import { SimplePool, type Sub } from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer, TelemetryEvent } from '@/services/telemetry';
import { NIP19Service, NIP19ServiceLive, NIP19DecodeError } from '@/services/nip19'; // Added NIP19DecodeError

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
  const activeSubsRef = useRef<Map<string, Sub>>(new Map());

  const getTelemetry = () => Effect.provide(TelemetryService, runtime);

  useEffect(() => {
    poolRef.current = new SimplePool({ eoseSubTimeout: 10000 });
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

      // Provide NIP04Service from the runtime for this specific Effect chain
      const jobRequestWithNip04 = Effect.provideService(jobRequestEffect, NIP04Service, runtime.context.get(NIP04Service));

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

      const sub = poolRef.current.sub(DEFAULT_RELAYS, filters as any); // nostr-tools type might be slightly different
      activeSubsRef.current.set(signedEvent.id, sub);

      sub.on('event', async (event: NostrEvent) => {
        telemetry.trackEvent({ category: "nip90_consumer", action: "job_update_received", label: event.id, value: `Kind: ${event.kind}` });

        let content = event.content;
        const isEncrypted = event.tags.some(t => t[0] === 'encrypted');

        if (isEncrypted && nostrPrivateKeyHex) {
          const decryptEffect = decryptNip04Content(nostrPrivateKeyHex, event.pubkey, event.content)
                                  .pipe(Effect.provideService(NIP04Service, runtime.context.get(NIP04Service)));
          const decryptExit = await Effect.runPromiseExit(decryptEffect);
          if (Exit.isSuccess(decryptExit)) {
            content = decryptExit.value;
          } else {
            content = "[Error decrypting DVM response]";
            console.error("NIP-04 Decryption error in subscription:", Cause.squash(decryptExit.cause));
            telemetry.trackEvent({ category: "nip90_consumer", action: "nip04_decrypt_error", label: event.id, value: Cause.squash(decryptExit.cause).message});
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

```

**II. Update `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`**

**Purpose:** Pass the `targetDvmNpub` (which can be npub or hex) from the input field correctly to the hook.

```typescript
// src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx
// ... (other imports) ...
import { useNip90ConsumerChat } from '@/hooks/useNip90ConsumerChat';
import { getMainRuntime } from '@/services/runtime'; // Ensure this is imported
// ... (ConsumerWalletState interface) ...

const Nip90ConsumerChatPane: React.FC = () => {
  // ... (existing walletState, showSensitive, initializeWallet, useEffect for wallet) ...
  const [targetDvmInput, setTargetDvmInput] = useState<string>(""); // Renamed for clarity

  const runtime = getMainRuntime(); // Get the main app runtime

  // ... (rest of initializeWallet) ...

  const {
    messages: chatMessages,
    isLoading: isChatLoading,
    userInput,
    setUserInput,
    sendMessage
  } = useNip90ConsumerChat({
    nostrPrivateKeyHex: walletState.privateKeyHex, // Already hex from initializeWallet
    nostrPublicKeyHex: walletState.publicKeyHex,   // Already hex from initializeWallet
    targetDvmPubkeyHex: targetDvmInput.trim() || undefined, // Pass the raw input to the hook
    runtime,
  });

  const handleSendMessage = () => {
    // ... (existing wallet readiness check) ...
    sendMessage();
  };

  return (
    <ScrollArea className="h-full p-3" data-testid="nip90-consumer-chat-pane">
      {/* ... Wallet Card ... */}
      <div className="my-2 space-y-1">
        <Label htmlFor="targetDvmInput">Target DVM (Optional - npub or hex for encryption)</Label>
        <Input
          id="targetDvmInput"
          value={targetDvmInput}
          onChange={(e) => setTargetDvmInput(e.target.value)}
          placeholder="npub1... or hex pubkey (leave blank for unencrypted broadcast)"
          className="h-7 text-xs"
          disabled={walletState.isLoading}
        />
      </div>
      {/* ... Rest of the component, ensure ChatContainer uses handleSendMessage ... */}
      <Card className="h-[calc(100%-290px)]"> {/* Adjust height if needed */}
        <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base">Chat with NIP-90 DVM (Kind 5050)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-3.5rem)]">
            <ChatContainer
                className="!h-full border-0 shadow-none rounded-none bg-transparent"
                messages={chatMessages}
                userInput={userInput}
                onUserInputChange={setUserInput}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading || walletState.isLoading}
            />
        </CardContent>
      </Card>
    </ScrollArea>
  );
};
export default Nip90ConsumerChatPane;
```

**III. Modify `src/helpers/nip90/event_creation.ts`**

**Purpose:** Handle cases where `targetDvmPkHexForEncryption` is undefined or empty by sending an unencrypted NIP-90 request. Also, ensure the `p` tag is added correctly if `targetDvmPkHexForPTag` is provided.

```typescript
// src/helpers/nip90/event_creation.ts
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import type { NostrEvent } from '@/services/nostr';
import { NIP04Service, NIP04EncryptError } from '@/services/nip04';
import { Effect } from 'effect';

export function createNip90JobRequest(
  requesterSk: Uint8Array,
  targetDvmPkHexForEncryption: string | undefined, // PK for encryption; if undefined, send unencrypted
  inputs: Array<[string, string, string?, string?, string?]>,
  outputMimeType: string = 'text/plain',
  bidMillisats?: number,
  jobKind: number = 5100,
  targetDvmPkHexForPTag?: string, // PK for the p-tag; can be different or undefined
  additionalParams?: Array<[string, string, string]>
): Effect.Effect<NostrEvent, NIP04EncryptError, NIP04Service> { // NIP04Service is required for encryption
  return Effect.gen(function* (_) {
    const nip04Service = yield* _(NIP04Service);

    const jobParametersToEncryptOrStringify: Array<[string, ...string[]]> = [
      ...inputs.map(inputParams => ['i', ...inputParams.filter(p => p !== undefined)] as [string, ...string[]])
    ];

    if (additionalParams) {
      jobParametersToEncryptOrStringify.push(...additionalParams.map(p => [p[0], p[1], p[2]] as [string, string, string]));
    }

    const stringifiedParams = JSON.stringify(jobParametersToEncryptOrStringify);
    let eventContent = "";
    const tags: Array<[string, ...string[]]> = [
      ['output', outputMimeType],
    ];

    // Conditional Encryption
    if (targetDvmPkHexForEncryption && targetDvmPkHexForEncryption.length === 64) {
      // Valid DVM PK provided for encryption
      eventContent = yield* _(nip04Service.encrypt(requesterSk, targetDvmPkHexForEncryption, stringifiedParams));
      // If encrypted, the p-tag for the encryption target is usually added.
      // If targetDvmPkHexForPTag is also provided and different, that might be an advanced routing scenario.
      // For simplicity, if encrypted, assume the p-tag is for the encryption target.
      tags.push(['p', targetDvmPkHexForEncryption]);
      tags.push(['encrypted']);
    } else {
      // No valid targetDvmPkHexForEncryption for encryption. Send unencrypted.
      eventContent = stringifiedParams;
      // If a PTag target is specified (even if not for encryption), add it.
      if (targetDvmPkHexForPTag && targetDvmPkHexForPTag.length === 64) {
        tags.push(['p', targetDvmPkHexForPTag]);
      }
      // Consider logging a warning if targetDvmPkHexForEncryption was provided but invalid, leading to unencrypted.
      if (targetDvmPkHexForEncryption && targetDvmPkHexForEncryption.length !== 64) {
          console.warn(`[NIP90 Helper] Invalid targetDvmPkHexForEncryption ('${targetDvmPkHexForEncryption}'). Sending unencrypted request.`);
          // Optionally, communicate this back via Telemetry or error for stricter handling.
      }
    }

    if (bidMillisats !== undefined && bidMillisats > 0) {
      tags.push(['bid', bidMillisats.toString()]);
    }

    const template: EventTemplate = {
      kind: jobKind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: eventContent,
    };

    return finalizeEvent(template, requesterSk) as NostrEvent;
  });
}

```

---

**Explanation of Changes:**

*   **`useNip90ConsumerChat.ts`:**
    *   Added strict checks at the start of `sendMessage` for `nostrPrivateKeyHex`, `nostrPublicKeyHex`, and `poolRef.current`.
    *   `initialTargetDvmInput` (renamed from `targetDvmPubkeyHex` prop for clarity) is now explicitly handled:
        *   If it's an `npub`, it's decoded. Errors during decoding are caught and reported.
        *   If it's hex, it's validated (64 chars, hex format).
        *   If invalid, an error message is shown, and the process stops.
    *   The `createNip90JobRequest` helper is now called with two separate DVM PK parameters:
        *   `targetDvmPkHexForEncryption`: This is the DVM PK to use for NIP-04 encryption. It will be `undefined` if the user wants an unencrypted broadcast or if the input was invalid.
        *   `targetDvmPkHexForPTag`: This is the DVM PK to use for the `["p", ...]` tag. It can be the same as the encryption target or different, or `undefined` for a true broadcast.
    *   The `NIP04Service` needed by `createNip90JobRequest` (and `decryptNip04Content`) is now explicitly provided from the `runtime.context`.
*   **`Nip90ConsumerChatPane.tsx`:**
    *   The input field for the target DVM now passes its raw value (`targetDvmInput`) to the `useNip90ConsumerChat` hook as `targetDvmPubkeyHex`. The hook handles decoding/validation.
    *   The send button logic (`handleSendMessage`) now includes a check for `walletState.isLoading` and `!walletState.privateKeyHex` to prevent sending requests before the wallet is ready.
*   **`createNip90JobRequest`:**
    *   It now accepts `targetDvmPkHexForEncryption` and `targetDvmPkHexForPTag`.
    *   Encryption only occurs if `targetDvmPkHexForEncryption` is a valid 64-char hex string.
    *   If encryption occurs, the `["p"]` tag for the encryption target and `["encrypted"]` tag are added.
    *   If encryption does *not* occur, `event.content` is the stringified (unencrypted) parameters.
    *   The `["p"]` tag is added if `targetDvmPkHexForPTag` is a valid 64-char hex string, regardless of encryption. This allows unencrypted requests to still be routed to a specific DVM.

These changes should make the NIP-90 request sending process more robust by handling key validation and conditional encryption, thereby reducing the likelihood of the `NIP04EncryptError`. The user is also given better feedback if keys are missing or invalid.

```
