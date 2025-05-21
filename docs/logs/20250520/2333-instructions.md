Okay, Agent, we're continuing with the implementation of the NIP-90 features.
You've successfully set up the basic structures (Phase 1) and the NIP-90 DVM Test Pane (Phase 2).

Now, we'll implement the **NIP-90 Consumer Chat Pane**. This pane will allow the user to act as a client, sending NIP-90 job requests (specifically Kind 5050 for text inference) to DVMs and displaying the results in a chat-like interface. This pane will have its own Nostr identity and a (conceptual or real) Spark wallet.

**Phase 3: NIP-90 Consumer Chat Pane - Identity & Wallet**

**1. Implement Wallet UI and Identity Generation in `Nip90ConsumerChatPane.tsx`**

   *   **File to Modify:** `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`
   *   **Instructions:**
        1.  Replace the placeholder content with UI elements to display identity and wallet information.
        2.  Add state for `mnemonic`, `nsec` (NIP-19 private key), `npub` (NIP-19 public key), `sparkAddress`, `sparkBalance`, `isLoading`, and `error`.
        3.  Implement a `useEffect` hook that runs on mount to:
            *   Set `isLoading` to `true`.
            *   Use `BIP39Service` to generate a 12-word mnemonic.
            *   Use `BIP39Service` to derive a seed from the mnemonic.
            *   Use `BIP32Service` to derive a private key node using path `m/44'/1237'/0'/0/0` (as per NIP-06).
            *   Extract the hex private key and public key from this node.
            *   Use `NIP19Service` to encode the hex private key to `nsec` and hex public key to `npub`.
            *   Store `mnemonic`, `nsec`, and `npub` in the component's state.
            *   **Spark Wallet Integration:**
                *   Define `consumerSparkConfig` (similar to `defaultSparkConfig` but using the *newly generated mnemonic* for this pane and `accountNumber: 2` or higher if the main app uses 2).
                *   Create a `ConsumerSparkServiceConfigLayer = Layer.succeed(SparkServiceConfigTag, consumerSparkConfig)`.
                *   Create a local `TelemetryTestLayer` by `Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)`.
                *   Compose a local `consumerSparkLayer = Layer.provide(SparkServiceLive, Layer.merge(ConsumerSparkServiceConfigLayer, TelemetryTestLayer))`.
                *   Use this `consumerSparkLayer` to run `SparkService.getSingleUseDepositAddress()` and `SparkService.getBalance()`.
                *   Store the address and formatted balance (e.g., "X sats") in state.
            *   Set `isLoading` to `false`. Handle any errors by setting the `error` state.
        4.  Render the derived identity (mnemonic, nsec, npub) and Spark wallet details (address, balance).
            *   Mnemonic and nsec should be hidden by default with a "Show/Hide" toggle button.
            *   Display clear warnings: "FOR DEMO ONLY. DO NOT USE WITH REAL FUNDS."
        5.  Add a "Re-initialize Wallet" button to re-trigger the identity and wallet generation process.
        6.  Ensure all Effect-based service calls are properly executed using `Effect.runPromiseExit` or `Effect.runPromise` and provide the necessary layers.
        7.  Use appropriate Shadcn UI components (`Card`, `Input`, `Button`, `Label`, `ScrollArea`, `Loader2` for loading states, `AlertTriangle` for warnings).
        8.  Style the component to be informative and fit the dark theme.

**Phase 4: NIP-90 Consumer Chat Pane - Chat & NIP-90 Flow**

**1. Create `useNip90ConsumerChat.ts` Hook**

   *   **New File:** `src/hooks/useNip90ConsumerChat.ts`
   *   **Instructions:**
        1.  Define the hook `useNip90ConsumerChat` which takes `nostrPrivateKeyHex: string | null`, `nostrPublicKeyHex: string | null`, and an optional `targetDvmPubkeyHex?: string` as parameters.
        2.  Manage state for `messages: ChatMessageProps[]`, `isLoading: boolean`, `userInput: string`.
        3.  Initialize a `SimplePool` instance from `nostr-tools` in a `useRef` and manage its lifecycle (open/close relays, though for this demo, just creating it on mount and closing on unmount might be sufficient). Use default relays like `wss://relay.damus.io` and `wss://nos.lol`.
        4.  Implement an `addMessage` helper to add messages to the `messages` state.
        5.  Implement the `sendMessage` function:
            *   It should be asynchronous.
            *   If `userInput` is empty or `nostrPrivateKeyHex` is null, return.
            *   Add the user's message to the `messages` state immediately.
            *   Clear `userInput` and set `isLoading` to `true`.
            *   **Construct NIP-90 Job Request (Kind 5050):**
                *   Use the `createNip90JobRequest` helper from `src/helpers/nip90/event_creation.ts`.
                *   Pass the pane's `nostrPrivateKeyHex` (converted to `Uint8Array`).
                *   Pass `targetDvmPubkeyHex` if provided.
                *   Inputs should be `[[userInput.trim(), "text"]]`.
                *   `outputMimeType` should be `"text/plain"`.
                *   `jobKind` should be `5050`.
                *   This helper needs `NIP04Service`. Create a local `NIP04ServiceLive` layer and provide it to the `createNip90JobRequest` Effect.
            *   **Publish Job Request:**
                *   Use the `SimplePool` instance to `pool.publish(relays, signedEvent)`. `Promise.any` can be used to resolve once any relay accepts.
                *   Store the `signedEvent.id`. Log this event via `TelemetryService`.
            *   **Subscribe to Results/Feedback:**
                *   Use `pool.sub(relays, filters)` to subscribe.
                *   `filters`: `[{ kinds: [6050, 7000], "#e": [signedEvent.id], authors: targetDvmPubkeyHex ? [targetDvmPubkeyHex] : undefined, since: signedEvent.created_at - 60 }]` (also include `["p", nostrPublicKeyHex]` if DVMs are expected to tag back the consumer for results/feedback, which is good practice).
                *   In the `sub.on('event', ...)` callback:
                    *   Log the received event via `TelemetryService`.
                    *   Check if `event.content` is encrypted (via `["encrypted"]` tag). If so, use `decryptNip04Content` helper (providing a local `NIP04ServiceLive` layer) with the pane's `nostrPrivateKeyHex` and the event's `pubkey`.
                    *   If Kind `7000` (Feedback): Add a system message to chat with status and content.
                    *   If Kind `6050` (Result): Add an assistant message to chat with the (decrypted) content. Parse and display `["amount"]` tag information. Unsubscribe from this job's updates (`sub.unsub()`).
                    *   Set `isLoading` to `false` upon receiving a result or final error feedback.
            *   Handle errors during publishing or subscription and update messages accordingly.
        6.  Return `messages`, `isLoading`, `userInput`, `setUserInput`, `sendMessage`.
        7.  Use `TelemetryService` (with a local `TelemetryServiceLive` layer and `DefaultTelemetryConfigLayer`) for logging significant actions and errors within the hook.

**2. Integrate Chat UI in `Nip90ConsumerChatPane.tsx`**

   *   **File to Modify:** `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`
   *   **Instructions:**
        1.  Import and use the `useNip90ConsumerChat` hook.
        2.  Pass the pane's Nostr keys (derived in Phase 3) to the hook. You'll need to convert the `nsec` back to hex private key for the hook if it expects hex. `nip19.decode(nsec).data` will give `Uint8Array`, then convert to hex.
        3.  Add an `Input` field for the user to optionally enter a `targetDvmPubkeyHex` (npub or hex).
        4.  Render the `ChatContainer` component.
        5.  Pass the `messages`, `isLoading`, `userInput`, `setUserInput`, and `sendMessage` from the hook as props to `ChatContainer`.
            *   Recall that `ChatContainer` was modified to accept these as props, allowing it to be driven by an external hook.

**3. Modify `ChatContainer.tsx` to be Fully Prop-Driven**

   *   **File to Modify:** `src/components/chat/ChatContainer.tsx`
   *   **Instructions:**
        1.  Ensure `ChatContainer` can operate entirely based on props if `externalMessages`, `externalIsLoading`, etc., are provided.
        2.  If these props are provided, the internal `useChat` hook (for local Ollama) should essentially be bypassed or not initialized/used.

**Phase 5: Configure DVM Service for Kind 5050 & Final Testing**

**1. Update DVM Configuration to Support Kind 5050**

   *   **File to Modify:** `src/services/dvm/Kind5050DVMService.ts`
   *   **Instruction:**
        *   Ensure `supportedJobKinds` in `defaultKind5050DVMServiceConfig` includes `5050`. It currently has `[5050, 5100]`, which is correct.
   *   **File to Modify:** `src/stores/dvmSettingsStore.ts`
   *   **Instruction:**
        *   Verify that `getEffectiveSupportedJobKinds` correctly uses this default if the user hasn't set specific kinds, or that the UI for DVM settings allows adding `5050`. (Current implementation looks fine).

**2. Testing**

   *   **Unit Tests:**
        *   Create `src/tests/unit/hooks/useNip90ConsumerChat.test.tsx`.
            *   Mock `createNip90JobRequest`, `SimplePool` (for `publish` and `sub`), `decryptNip04Content`, and `TelemetryService`.
            *   Test that `sendMessage` correctly forms and attempts to publish a Kind 5050 event.
            *   Test that simulated incoming Nostr events (Kind 6050/7000) are processed and displayed.
            *   Test error handling.
        *   Update `src/tests/unit/components/nip90_consumer_chat/Nip90ConsumerChatPane.test.tsx` to:
            *   Mock the services (`BIP39Service`, `BIP32Service`, `NIP19Service`, `SparkService`, `TelemetryService`) used during wallet initialization.
            *   Verify that wallet details are rendered after mock initialization.
            *   Verify `ChatContainer` is rendered.
   *   **TypeScript Check:** Run `pnpm t`.
   *   **E2E Testing (Playwright - Manual Steps for now, can be automated later):**
        1.  Open the NIP-90 DVM Test Pane (from Phase 2) and click "Go Online". Note its DVM Public Key.
        2.  Open the NIP-90 Consumer Chat Pane.
        3.  Enter the DVM Test Pane's public key into the "Target DVM Pubkey" field in the Consumer Chat Pane.
        4.  In the Consumer Chat Pane, type a prompt (e.g., "What is the capital of France?") and send it.
        5.  **Observe:**
            *   The message should appear in the Consumer Chat Pane as a user message.
            *   (If DVM Test Pane logs activity) The request might appear in the DVM Test Pane's logs.
            *   Feedback messages (Kind 7000, e.g., "processing") from the DVM Test Pane should appear in the Consumer Chat Pane.
            *   The final AI-generated response (Kind 6050) from the DVM Test Pane should appear as an assistant message in the Consumer Chat Pane.

This is a large set of instructions. Please proceed step-by-step, applying changes to the specified files. Let me know if any part is unclear.
Focus on getting the NIP-90 Consumer Chat Pane's identity and wallet display working first (Phase 3), then integrate the chat and NIP-90 messaging flow (Phase 4).Okay, I'm ready to implement Phase 3 and Phase 4 for the NIP-90 Consumer Chat Pane, and then finalize with Phase 5.

Here are the specific changes:

**Phase 3: NIP-90 Consumer Chat Pane - Identity & Wallet**

**1. Implement Wallet UI and Identity Generation in `Nip90ConsumerChatPane.tsx`**
   *   Modified `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx` with the UI, state, and initialization logic for identity and Spark wallet.

**Phase 4: NIP-90 Consumer Chat Pane - Chat & NIP-90 Flow**

**1. Create `useNip90ConsumerChat.ts` Hook**
   *   Created `src/hooks/useNip90ConsumerChat.ts` with the logic for sending NIP-90 requests and handling responses/feedback.

**2. Integrate Chat UI in `Nip90ConsumerChatPane.tsx`**
   *   Modified `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx` to use the `useNip90ConsumerChat` hook and render the `ChatContainer` with props from the hook.

**3. Modify `ChatContainer.tsx` to be Fully Prop-Driven**
   *   Modified `src/components/chat/ChatContainer.tsx` to accept `messages`, `isLoading`, `userInput`, `onUserInputChange`, and `onSendMessage` as props, allowing it to be driven externally.

**Phase 5: Configure DVM Service for Kind 5050 & Final Testing**

**1. Update DVM Configuration**
   *   `src/services/dvm/Kind5050DVMService.ts`: Confirmed `supportedJobKinds` in `defaultKind5050DVMServiceConfig` already includes `5050`. No change needed here.
   *   `src/stores/dvmSettingsStore.ts`: Confirmed `getEffectiveSupportedJobKinds` will correctly use this default. No change needed here.

**2. Testing - Unit Tests**
   *   Created `src/tests/unit/hooks/useNostrChannelChat.test.tsx`. (Note: This was for NIP-28, I will adapt it for `useNip90ConsumerChat` if one is created in a similar fashion, or add tests to the pane's test file if logic is embedded). *Correction: The prompt asked for `useNip90ConsumerChat.ts`. I will create tests for this new hook.*
   *   Updated `src/tests/unit/components/nip90_consumer_chat/Nip90ConsumerChatPane.test.tsx`.

I will now provide the content for the modified and new files.

```typescript
// src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, Wallet, Bitcoin, Eye, EyeOff, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Effect, Layer, Exit, Cause, Option } from 'effect';
import { BIP39Service, BIP39ServiceLive } from '@/services/bip39';
import { BIP32Service, BIP32ServiceLive } from '@/services/bip32';
import { NIP19Service, NIP19ServiceLive } from '@/services/nip19';
import { SparkService, SparkServiceLive, SparkServiceConfigTag, type SparkServiceConfig, type BalanceInfo, DefaultSparkServiceConfigLayer } from '@/services/spark';
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer, type TelemetryEvent } from '@/services/telemetry';
import { ChatContainer } from '@/components/chat';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils';
import { useNip90ConsumerChat } from '@/hooks/useNip90ConsumerChat';
import { getMainRuntime } from '@/services/runtime';


interface ConsumerWalletState {
  mnemonic: string | null;
  nsec: string | null;
  npub: string | null;
  privateKeyHex: string | null; // Store the hex SK for useNip90ConsumerChat
  publicKeyHex: string | null; // Store the hex PK
  sparkAddress: string | null;
  sparkBalance: string | null;
  error: string | null;
  isLoading: boolean;
}

const Nip90ConsumerChatPane: React.FC = () => {
  const [walletState, setWalletState] = useState<ConsumerWalletState>({
    mnemonic: null, nsec: null, npub: null, privateKeyHex: null, publicKeyHex: null,
    sparkAddress: null, sparkBalance: 'Loading...', error: null, isLoading: true
  });
  const [showSensitive, setShowSensitive] = useState(false);
  const [targetDvmNpub, setTargetDvmNpub] = useState<string>("");

  const runtime = getMainRuntime(); // Get the main app runtime

  const initializeWallet = useCallback(async () => {
    setWalletState(prev => ({ ...prev, isLoading: true, error: null }));

    const program = Effect.gen(function* (_) {
      const bip39 = yield* _(BIP39Service);
      const bip32 = yield* _(BIP32Service);
      const nip19 = yield* _(NIP19Service);
      const telemetry = yield* _(TelemetryService);

      yield* _(telemetry.trackEvent({ category: "nip90_consumer", action: "wallet_init_start" }));

      const mnemonic = yield* _(bip39.generateMnemonic({ strength: 128 }));
      const seed = yield* _(bip39.mnemonicToSeed(mnemonic));
      // NIP-06 path for Nostr keys
      const nostrNode = yield* _(bip32.derivePrivateNode(seed, { path: "m/44'/1237'/0'/0/0" }));

      if (!nostrNode.privateKey || !nostrNode.publicKey) {
        throw new Error("Failed to derive Nostr private/public keys.");
      }
      const skHex = nostrNode.privateKey;
      const pkHex = nostrNode.publicKey;

      const nsec = yield* _(nip19.encodeNsec(hexToBytes(skHex)));
      const npub = yield* _(nip19.encodeNpub(pkHex));

      // Spark Wallet setup for this consumer pane
      const consumerSparkConfig: SparkServiceConfig = {
        network: "REGTEST", // Or configurable
        mnemonicOrSeed: mnemonic, // Use the pane's own mnemonic
        accountNumber: 3, // Use a different account number if main app uses 2
      };
      const ConsumerSparkConfigLayer = Layer.succeed(SparkServiceConfigTag, consumerSparkConfig);

      // Provide SparkServiceLive with its specific config and telemetry
      const consumerSparkLayer = Layer.provide(
        SparkServiceLive,
        Layer.merge(ConsumerSparkConfigLayer, Layer.succeed(TelemetryService, telemetry))
      );

      const spark = yield* _(Effect.provide(SparkService, consumerSparkLayer));

      const sparkAddress = yield* _(spark.getSingleUseDepositAddress());
      const balanceInfo = yield* _(spark.getBalance());
      const sparkBalance = `${balanceInfo.balance.toString()} sats`;

      yield* _(telemetry.trackEvent({ category: "nip90_consumer", action: "wallet_init_success", label: npub }));

      return { mnemonic, nsec, npub, skHex, pkHex, sparkAddress, sparkBalance };
    });

    // Provide all necessary services to the main program
    const fullProgram = Effect.provide(program, Layer.mergeAll(
      BIP39ServiceLive,
      BIP32ServiceLive,
      NIP19ServiceLive,
      Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer) // Provide Telemetry config
    ));

    const exit = await Effect.runPromiseExit(fullProgram);

    if (Exit.isSuccess(exit)) {
      const { mnemonic, nsec, npub, skHex, pkHex, sparkAddress, sparkBalance } = exit.value;
      setWalletState({
        mnemonic, nsec, npub, privateKeyHex: skHex, publicKeyHex: pkHex,
        sparkAddress, sparkBalance,
        error: null, isLoading: false
      });
    } else {
      const error = Cause.squash(exit.cause);
      console.error("Error initializing consumer wallet:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize wallet";
      setWalletState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      Effect.runFork(Effect.provide(
        Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "nip90_consumer", action: "wallet_init_failure", label: errorMessage })),
        Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)
      ));
    }
  }, []);

  useEffect(() => {
    initializeWallet();
  }, [initializeWallet]);

  const {
    messages: chatMessages,
    isLoading: isChatLoading,
    userInput,
    setUserInput,
    sendMessage
  } = useNip90ConsumerChat({
    nostrPrivateKeyHex: walletState.privateKeyHex,
    nostrPublicKeyHex: walletState.publicKeyHex,
    targetDvmPubkeyHex: targetDvmNpub.trim() || undefined, // Pass target DVM if set
    runtime, // Pass the main runtime to the hook
  });

  const handleSendMessage = () => {
    if (walletState.isLoading || !walletState.privateKeyHex) {
        alert("Wallet is not ready. Please wait or re-initialize.");
        return;
    }
    sendMessage();
  };


  return (
    <ScrollArea className="h-full p-3">
      <Card className="mb-3">
        <CardHeader>
          <CardTitle className="text-base flex justify-between items-center">
            Consumer Identity & Wallet
            <Button onClick={initializeWallet} variant="ghost" size="icon" disabled={walletState.isLoading} title="Re-initialize Wallet">
              {walletState.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
          </CardTitle>
          <CardDescription className="text-xs">
            This pane has its own Nostr identity and Spark wallet for NIP-90 interactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          {walletState.isLoading && <div className="flex items-center"><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Initializing wallet...</div>}
          {walletState.error && <div className="text-destructive flex items-center"><AlertTriangle className="w-3 h-3 mr-1.5"/> Error: {walletState.error}</div>}

          {walletState.mnemonic && (
            <div>
              <Label htmlFor="mnemonic-consumer">Mnemonic (DEMO ONLY):</Label>
              <div className="flex items-center gap-1">
                <Input id="mnemonic-consumer" value={showSensitive ? walletState.mnemonic : '•'.repeat(walletState.mnemonic.length)} readOnly className="font-mono text-[10px] h-7 bg-muted/50"/>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSensitive(!showSensitive)}>
                  {showSensitive ? <EyeOff size={12}/> : <Eye size={12}/>}
                </Button>
              </div>
            </div>
          )}
          {walletState.nsec && <div><Label>Nostr Private Key (nsec):</Label><Input value={showSensitive ? walletState.nsec : '•'.repeat(walletState.nsec.length)} readOnly className="font-mono text-[10px] h-7 bg-muted/50"/></div>}
          {walletState.npub && <div><Label>Nostr Public Key (npub):</Label><Input value={walletState.npub} readOnly className="font-mono text-[10px] h-7 bg-muted/50"/></div>}
          {walletState.sparkAddress && <div><Label>Spark Address (Send funds here):</Label><Input value={walletState.sparkAddress} readOnly className="font-mono text-[10px] h-7 bg-muted/50"/></div>}
          {walletState.sparkBalance && <div><Label>Spark Balance:</Label><Input value={walletState.sparkBalance} readOnly className="font-mono text-[10px] h-7 bg-muted/50"/></div>}
        </CardContent>
      </Card>

      <div className="my-2 space-y-1">
        <Label htmlFor="targetDvmNpub">Target DVM Pubkey (Optional - npub or hex)</Label>
        <Input
          id="targetDvmNpub"
          value={targetDvmNpub}
          onChange={(e) => setTargetDvmNpub(e.target.value)}
          placeholder="npub1... or hex public key (leave blank to broadcast)"
          className="h-7 text-xs"
          disabled={walletState.isLoading}
        />
      </div>

      <Card className="h-[calc(100%-290px)]"> {/* Adjust height dynamically */}
        <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base">Chat with NIP-90 DVM (Kind 5050)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-[calc(100%-3.5rem)]">
            <ChatContainer
                className="!h-full border-0 shadow-none rounded-none bg-transparent"
                messages={chatMessages}
                userInput={userInput}
                onUserInputChange={setUserInput}
                onSendMessage={handleSendMessage} // Use wrapped sendMessage
                isLoading={isChatLoading || walletState.isLoading}
            />
        </CardContent>
      </Card>
    </ScrollArea>
  );
};
export default Nip90ConsumerChatPane;

```

```typescript
// src/hooks/useNip90ConsumerChat.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { type ChatMessageProps, type MessageRole } from '@/components/chat/ChatMessage';
import { Effect, Exit, Cause, Layer, Runtime } from 'effect';
import { NIP04Service, NIP04ServiceLive } from '@/services/nip04';
import { NostrEvent, NostrFilter } from '@/services/nostr';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import { decryptNip04Content } from '@/helpers/nip90/event_decryption';
import { SimplePool, type Sub } from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer, TelemetryEvent } from '@/services/telemetry';
import type { NIP19Service } from '@/services/nip19'; // For potential NIP-19 decoding
import { NIP19ServiceLive } from '@/services/nip19';


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
  const activeSubsRef = useRef<Map<string, Sub>>(new Map()); // Map eventId to Sub

  // Effect to get telemetry service once
  const getTelemetry = () => Effect.provide(TelemetryService, runtime);

  useEffect(() => {
    poolRef.current = new SimplePool({ eoseSubTimeout: 10000 }); // Increased timeout

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

      const sub = poolRef.current.sub(DEFAULT_RELAYS, filters);
      activeSubsRef.current.set(signedEvent.id, sub); // Store subscription

      sub.on('event', async (event: NostrEvent) => {
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

      sub.on('eose', () => {
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

```

```typescript
// src/components/chat/ChatContainer.tsx
import React, { useEffect } from "react";
import { useChat as useLocalOllamaChat } from "./useChat"; // Keep original for other uses
import { ChatWindow, type ChatMessageProps } from "./ChatWindow";

interface ChatContainerProps {
  systemMessage?: string;
  model?: string; // Still useful if the container is used for local Ollama
  className?: string;
  // Props to allow external control
  messages?: ChatMessageProps[];
  isLoading?: boolean;
  userInput?: string;
  onUserInputChange?: (input: string) => void;
  onSendMessage?: () => void;
}

export function ChatContainer({
  systemMessage,
  model = "gemma3:1b",
  className = "",
  messages: externalMessages,
  isLoading: externalIsLoading,
  userInput: externalUserInput,
  onUserInputChange: externalOnUserInputChange,
  onSendMessage: externalOnSendMessage
}: ChatContainerProps) {
  // Use local chat hook IF external controls are NOT provided
  const localChatHook = useLocalOllamaChat({
    initialSystemMessage: systemMessage,
    model
  });

  // Determine which values to use based on whether external props are provided
  const messages = externalMessages !== undefined ? externalMessages : localChatHook.messages;
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : localChatHook.isLoading;
  const userInput = externalUserInput !== undefined ? externalUserInput : localChatHook.userInput;
  const setUserInput = externalOnUserInputChange !== undefined ? externalOnUserInputChange : localChatHook.setUserInput;
  const sendMessage = externalOnSendMessage !== undefined ? externalOnSendMessage : localChatHook.sendMessage;

  // Cleanup local chat hook only if it was used (i.e., external props were not provided)
  useEffect(() => {
    if (externalMessages === undefined) { // Check if external control is active
      return localChatHook.cleanup;
    }
  }, [localChatHook.cleanup, externalMessages]);

  return (
    <div className={`h-full ${className}`}>
      <ChatWindow
        messages={messages}
        userInput={userInput}
        onUserInputChange={setUserInput}
        onSendMessage={sendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
```

```typescript
// src/tests/unit/hooks/useNip90ConsumerChat.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNip90ConsumerChat } from '@/hooks/useNip90ConsumerChat';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Effect, Layer, Runtime } from 'effect';
import { NIP04Service, NIP04ServiceLive } from '@/services/nip04';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import { SimplePool } from 'nostr-tools';
import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer } from '@/services/telemetry';
import { NIP19Service, NIP19ServiceLive } from '@/services/nip19';

// Mocks
vi.mock('@/helpers/nip90/event_creation');
vi.mock('nostr-tools', async (importOriginal) => {
  const original = await importOriginal<typeof import('nostr-tools')>();
  return {
    ...original,
    SimplePool: vi.fn().mockImplementation(() => ({
      publish: vi.fn(() => [Promise.resolve({ status: 'ok' })]), // Mock publish to return array of promises
      sub: vi.fn(() => ({
        on: vi.fn(),
        unsub: vi.fn(),
      })),
      close: vi.fn(),
    })),
  };
});

const mockCreateNip90JobRequest = createNip90JobRequest as vi.Mock;

// Create a mock runtime for the hook
const mockRuntime = Layer.mergeAll(
  NIP04ServiceLive,
  NIP19ServiceLive,
  Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)
).pipe(Layer.toRuntime, Effect.scoped, Effect.runSync);


describe('useNip90ConsumerChat', () => {
  const nostrPrivateKeyHex = "01".repeat(32);
  const nostrPublicKeyHex = "02".repeat(32);
  const targetDvmPubkeyHex = "03".repeat(32);

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNip90JobRequest.mockReturnValue(
      Effect.succeed({ id: 'test-job-id', kind: 5050, created_at: Math.floor(Date.now()/1000), tags: [], content: '', pubkey: nostrPublicKeyHex, sig: 'sig' })
    );
  });

  it('should initialize with no messages and not loading', () => {
    const { result } = renderHook(() => useNip90ConsumerChat({ nostrPrivateKeyHex, nostrPublicKeyHex, runtime: mockRuntime as Runtime.Runtime<any> }));
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.userInput).toBe('');
  });

  it('sendMessage should add user message and set loading if identity is ready', async () => {
    const { result } = renderHook(() => useNip90ConsumerChat({ nostrPrivateKeyHex, nostrPublicKeyHex, runtime: mockRuntime as Runtime.Runtime<any> }));

    act(() => {
      result.current.setUserInput('Test prompt');
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    expect(result.current.messages.length).toBeGreaterThanOrEqual(1); // User message + system message
    expect(result.current.messages.find(m => m.role === 'user')?.content).toBe('Test prompt');
    expect(result.current.isLoading).toBe(true); // Stays loading until DVM responds or times out
    expect(mockCreateNip90JobRequest).toHaveBeenCalled();
    // @ts-ignore
    expect(SimplePool.mock.results[0].value.publish).toHaveBeenCalled();
  });

  it('sendMessage should not proceed if identity is not ready', async () => {
    const { result } = renderHook(() => useNip90ConsumerChat({ nostrPrivateKeyHex: null, nostrPublicKeyHex, runtime: mockRuntime as Runtime.Runtime<any> }));
    act(() => {
      result.current.setUserInput('Test prompt');
    });
    await act(async () => {
      await result.current.sendMessage();
    });
    expect(result.current.messages.find(m => m.content.includes("Consumer identity not ready"))).toBeDefined();
    expect(mockCreateNip90JobRequest).not.toHaveBeenCalled();
  });

  it('should handle incoming feedback and result events', async () => {
    const mockPoolInstance = {
      publish: vi.fn(() => [Promise.resolve({ status: 'ok' })]),
      sub: vi.fn(() => ({
        on: vi.fn((eventName, callback) => {
          if (eventName === 'event') {
            // Simulate DVM feedback
            setTimeout(() => callback({ kind: 7000, pubkey: targetDvmPubkeyHex, content: 'Processing', tags: [['status', 'processing']], id: 'fb1', created_at: 0, sig: '' }), 50);
            // Simulate DVM result
            setTimeout(() => callback({ kind: 6050, pubkey: targetDvmPubkeyHex, content: 'Result content', tags: [], id: 'res1', created_at: 0, sig: '' }), 100);
          }
        }),
        unsub: vi.fn(),
      })),
      close: vi.fn(),
    };
    // @ts-ignore
    SimplePool.mockImplementation(() => mockPoolInstance);

    const { result } = renderHook(() => useNip90ConsumerChat({ nostrPrivateKeyHex, nostrPublicKeyHex, targetDvmPubkeyHex, runtime: mockRuntime as Runtime.Runtime<any> }));

    act(() => result.current.setUserInput('Test for DVM'));
    await act(async () => { await result.current.sendMessage(); });

    await waitFor(() => {
      expect(result.current.messages.some(m => m.content.includes('Processing'))).toBe(true);
    }, { timeout: 200 });
    await waitFor(() => {
      expect(result.current.messages.some(m => m.content === 'Result content')).toBe(true);
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 200 });

    expect(mockPoolInstance.sub).toHaveBeenCalled();
  });
});
```

```typescript
// src/tests/unit/components/nip90_consumer_chat/Nip90ConsumerChatPane.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Nip90ConsumerChatPane from '@/components/nip90_consumer_chat/Nip90ConsumerChatPane';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BIP39Service } from '@/services/bip39';
import { BIP32Service } from '@/services/bip32';
import { NIP19Service } from '@/services/nip19';
import { SparkService } from '@/services/spark';
import { TelemetryService } from '@/services/telemetry';
import { useNip90ConsumerChat } from '@/hooks/useNip90ConsumerChat';
import { Effect } from 'effect';

// Mock services
vi.mock('@/services/runtime', () => ({
  getMainRuntime: vi.fn(() => ({
    // Provide mock implementations for services used by the component or its hooks
    [BIP39Service.key]: {
      generateMnemonic: vi.fn(() => Effect.succeed("test ".repeat(11) + "junk")),
      mnemonicToSeed: vi.fn(() => Effect.succeed(new Uint8Array(32).fill(1))),
    },
    [BIP32Service.key]: {
      derivePrivateNode: vi.fn(() => Effect.succeed({ privateKey: "aa".repeat(32), publicKey: "bb".repeat(32), chainCode: "cc".repeat(32), depth: 0, index: 0, path: "m" })),
      getPublicKey: vi.fn(() => Effect.succeed("bb".repeat(32))),
      deriveBIP44Address: vi.fn(() => Effect.succeed({ path: "m/44'/0'/0'/0/0", publicKey: "cc".repeat(32), privateKey: "dd".repeat(32) }))
    },
    [NIP19Service.key]: {
      encodeNsec: vi.fn(() => Effect.succeed("nsec1...")),
      encodeNpub: vi.fn(() => Effect.succeed("npub1...")),
      encodeNote: vi.fn(() => Effect.succeed("note1...")),
      encodeNprofile: vi.fn(() => Effect.succeed("nprofile1...")),
      encodeNevent: vi.fn(() => Effect.succeed("nevent1...")),
      encodeNaddr: vi.fn(() => Effect.succeed("naddr1...")),
      decode: vi.fn(() => Effect.succeed({ type: "npub", data: "mock-decoded-hex" })),
    },
    [SparkService.key]: {
      getSingleUseDepositAddress: vi.fn(() => Effect.succeed("spark_address_123")),
      getBalance: vi.fn(() => Effect.succeed({ balance: BigInt(1000), tokenBalances: new Map() })),
      createLightningInvoice: vi.fn(), // Mock other methods if needed
      payLightningInvoice: vi.fn(),
      checkWalletStatus: vi.fn(() => Effect.succeed(true)),
      checkInvoiceStatus: vi.fn(() => Effect.succeed({ status: 'pending' })),
    },
    [TelemetryService.key]: {
      trackEvent: vi.fn(() => Effect.succeed(undefined)),
      isEnabled: vi.fn(() => Effect.succeed(true)),
      setEnabled: vi.fn(() => Effect.succeed(undefined)),
    }
  }))
}));

// Mock the custom hook
vi.mock('@/hooks/useNip90ConsumerChat', () => ({
  useNip90ConsumerChat: vi.fn(() => ({
    messages: [],
    isLoading: false,
    userInput: '',
    setUserInput: vi.fn(),
    sendMessage: vi.fn(),
  })),
}));

const mockUseNip90ConsumerChat = useNip90ConsumerChat as vi.Mock;

describe('Nip90ConsumerChatPane', () => {
  const queryClient = new QueryClient();

  const renderComponent = () => render(
    <QueryClientProvider client={queryClient}>
      <Nip90ConsumerChatPane />
    </QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset state for the hook mock if needed
    mockUseNip90ConsumerChat.mockReturnValue({
      messages: [],
      isLoading: false,
      userInput: '',
      setUserInput: vi.fn(),
      sendMessage: vi.fn(),
    });
  });

  it('renders wallet initialization loading state and then wallet details', async () => {
    renderComponent();
    // Initial loading state
    expect(screen.getByText(/Initializing wallet.../i)).toBeInTheDocument();

    // Wait for async initialization to complete
    await waitFor(() => {
      expect(screen.queryByText(/Initializing wallet.../i)).not.toBeInTheDocument();
    });

    // Check for wallet details
    expect(screen.getByLabelText(/Mnemonic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nostr Private Key \(nsec\):/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nostr Public Key \(npub\):/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Spark Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Spark Balance/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("npub1...")).toBeInTheDocument(); // From mock
    expect(screen.getByDisplayValue("spark_address_123")).toBeInTheDocument(); // From mock
    expect(screen.getByDisplayValue("1000 sats")).toBeInTheDocument(); // From mock
  });

  it('renders the ChatContainer', async () => {
    renderComponent();
    await waitFor(() => { // Wait for wallet init
      expect(screen.getByPlaceholderText(/Type your message.../i)).toBeInTheDocument();
    });
  });

  it('calls sendMessage from the hook when send button is clicked', async () => {
    const mockSendMessage = vi.fn();
    mockUseNip90ConsumerChat.mockReturnValue({
      messages: [],
      isLoading: false,
      userInput: 'Test message', // Simulate user input
      setUserInput: vi.fn(),
      sendMessage: mockSendMessage,
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/Mnemonic/i)).toBeInTheDocument(); // Ensure wallet part rendered
    });

    const sendButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalled();
  });

  it('updates target DVM npub input field', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/Mnemonic/i)).toBeInTheDocument();
    });

    const dvmInput = screen.getByLabelText(/Target DVM Pubkey/i) as HTMLInputElement;
    fireEvent.change(dvmInput, { target: { value: 'npub1testdvm' } });
    expect(dvmInput.value).toBe('npub1testdvm');
  });
});

```
