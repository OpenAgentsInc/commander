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
    <ScrollArea className="h-full p-3" data-testid="nip90-consumer-chat-pane">
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