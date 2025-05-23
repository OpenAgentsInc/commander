import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  KeyRound,
  Wallet,
  Bitcoin,
  Eye,
  EyeOff,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import { Effect, Layer, Exit, Cause, Option } from "effect";
import { BIP39Service, BIP39ServiceLive } from "@/services/bip39";
import { BIP32Service, BIP32ServiceLive } from "@/services/bip32";
import { NIP19Service, NIP19ServiceLive } from "@/services/nip19";
import {
  SparkService,
  SparkServiceLive,
  SparkServiceConfigTag,
  type SparkServiceConfig,
  type BalanceInfo,
  DefaultSparkServiceConfigLayer,
} from "@/services/spark";
import {
  TelemetryService,
  TelemetryServiceLive,
  DefaultTelemetryConfigLayer,
  type TelemetryEvent,
} from "@/services/telemetry";
import { ChatContainer } from "@/components/chat";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils";
import { useNip90ConsumerChat } from "@/hooks/useNip90ConsumerChat";
import { getMainRuntime } from "@/services/runtime";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    mnemonic: null,
    nsec: null,
    npub: null,
    privateKeyHex: null,
    publicKeyHex: null,
    sparkAddress: null,
    sparkBalance: "Loading...",
    error: null,
    isLoading: true,
  });
  const [showSensitive, setShowSensitive] = useState(false);
  const [targetDvmInput, setTargetDvmInput] = useState<string>(""); // Renamed for clarity

  const runtime = getMainRuntime(); // Get the main app runtime

  const initializeWallet = useCallback(async () => {
    setWalletState((prev) => ({ ...prev, isLoading: true, error: null }));

    const program = Effect.gen(function* (_) {
      const bip39 = yield* _(BIP39Service);
      const bip32 = yield* _(BIP32Service);
      const nip19 = yield* _(NIP19Service);
      const telemetry = yield* _(TelemetryService);

      yield* _(
        telemetry.trackEvent({
          category: "nip90_consumer",
          action: "wallet_init_start",
        }),
      );

      const mnemonic = yield* _(bip39.generateMnemonic({ strength: 128 }));
      const seed = yield* _(bip39.mnemonicToSeed(mnemonic));
      // NIP-06 path for Nostr keys
      const nostrNode = yield* _(
        bip32.derivePrivateNode(seed, { path: "m/44'/1237'/0'/0/0" }),
      );

      if (!nostrNode.privateKey || !nostrNode.publicKey) {
        throw new Error("Failed to derive Nostr private/public keys.");
      }
      const skHex = nostrNode.privateKey;
      const pkHex = nostrNode.publicKey;

      const nsec = yield* _(nip19.encodeNsec(hexToBytes(skHex)));
      const npub = yield* _(nip19.encodeNpub(pkHex));

      // Spark Wallet setup for this consumer pane
      const consumerSparkConfig: SparkServiceConfig = {
        network: "MAINNET", // Changed to MAINNET as requested
        mnemonicOrSeed: mnemonic, // Use the pane's own mnemonic
        accountNumber: 3, // Use a different account number if main app uses 2
      };
      const ConsumerSparkConfigLayer = Layer.succeed(
        SparkServiceConfigTag,
        consumerSparkConfig,
      );

      // Provide SparkServiceLive with its specific config and telemetry
      const consumerSparkLayer = Layer.provide(
        SparkServiceLive,
        Layer.merge(
          ConsumerSparkConfigLayer,
          Layer.succeed(TelemetryService, telemetry),
        ),
      );

      const spark = yield* _(Effect.provide(SparkService, consumerSparkLayer));

      const sparkAddress = yield* _(spark.getSingleUseDepositAddress());
      const balanceInfo = yield* _(spark.getBalance());
      const sparkBalance = `${balanceInfo.balance.toString()} sats`;

      yield* _(
        telemetry.trackEvent({
          category: "nip90_consumer",
          action: "wallet_init_success",
          label: npub,
        }),
      );

      return { mnemonic, nsec, npub, skHex, pkHex, sparkAddress, sparkBalance };
    });

    // Provide all necessary services to the main program
    const fullProgram = Effect.provide(
      program,
      Layer.mergeAll(
        BIP39ServiceLive,
        BIP32ServiceLive,
        NIP19ServiceLive,
        Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer), // Provide Telemetry config
      ),
    );

    const exit = await Effect.runPromiseExit(fullProgram);

    if (Exit.isSuccess(exit)) {
      const { mnemonic, nsec, npub, skHex, pkHex, sparkAddress, sparkBalance } =
        exit.value;
      setWalletState({
        mnemonic,
        nsec,
        npub,
        privateKeyHex: skHex,
        publicKeyHex: pkHex,
        sparkAddress,
        sparkBalance,
        error: null,
        isLoading: false,
      });
    } else {
      const error = Cause.squash(exit.cause);
      console.error("Error initializing consumer wallet:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to initialize wallet";
      setWalletState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      Effect.runFork(
        Effect.provide(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "nip90_consumer",
              action: "wallet_init_failure",
              label: errorMessage,
            }),
          ),
          Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer),
        ),
      );
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
    sendMessage,
    paymentState,
    handlePayment,
  } = useNip90ConsumerChat({
    nostrPrivateKeyHex: walletState.privateKeyHex,
    nostrPublicKeyHex: walletState.publicKeyHex,
    targetDvmPubkeyHex: targetDvmInput.trim() || undefined, // Pass the raw input to the hook
    runtime,
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
          <CardTitle className="flex items-center justify-between text-base">
            Consumer Identity & Wallet
            <Button
              onClick={initializeWallet}
              variant="ghost"
              size="icon"
              disabled={walletState.isLoading}
              title="Re-initialize Wallet"
            >
              {walletState.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
          <CardDescription className="text-xs">
            This pane has its own Nostr identity and Spark wallet for NIP-90
            interactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          {walletState.isLoading && (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Initializing
              wallet...
            </div>
          )}
          {walletState.error && (
            <div className="text-destructive flex items-center">
              <AlertTriangle className="mr-1.5 h-3 w-3" /> Error:{" "}
              {walletState.error}
            </div>
          )}

          {walletState.mnemonic && (
            <div>
              <Label htmlFor="mnemonic-consumer">Mnemonic (DEMO ONLY):</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="mnemonic-consumer"
                  value={
                    showSensitive
                      ? walletState.mnemonic
                      : "•".repeat(walletState.mnemonic.length)
                  }
                  readOnly
                  className="bg-muted/50 h-7 font-mono text-[10px]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowSensitive(!showSensitive)}
                >
                  {showSensitive ? <EyeOff size={12} /> : <Eye size={12} />}
                </Button>
              </div>
            </div>
          )}
          {walletState.nsec && (
            <div>
              <Label>Nostr Private Key (nsec):</Label>
              <Input
                value={
                  showSensitive
                    ? walletState.nsec
                    : "•".repeat(walletState.nsec.length)
                }
                readOnly
                className="bg-muted/50 h-7 font-mono text-[10px]"
              />
            </div>
          )}
          {walletState.npub && (
            <div>
              <Label>Nostr Public Key (npub):</Label>
              <Input
                value={walletState.npub}
                readOnly
                className="bg-muted/50 h-7 font-mono text-[10px]"
              />
            </div>
          )}
          {walletState.sparkAddress && (
            <div>
              <Label>Spark Address (Send funds here):</Label>
              <Input
                value={walletState.sparkAddress}
                readOnly
                className="bg-muted/50 h-7 font-mono text-[10px]"
              />
            </div>
          )}
          {walletState.sparkBalance && (
            <div>
              <Label>Spark Balance:</Label>
              <Input
                value={walletState.sparkBalance}
                readOnly
                className="bg-muted/50 h-7 font-mono text-[10px]"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Required UI */}
      {paymentState.required && (
        <Alert className="mb-3 border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Required</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="text-sm">
              The DVM requires payment before processing your request.
            </p>
            <p className="text-sm font-medium">
              Amount: {paymentState.amountSats} sats
            </p>
            {paymentState.invoice && (
              <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                Invoice: {paymentState.invoice.substring(0, 50)}...
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => handlePayment(paymentState.invoice!, paymentState.jobId!)}
                disabled={paymentState.status === 'paying' || !paymentState.invoice}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
              >
                {paymentState.status === 'paying' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Paying...
                  </>
                ) : (
                  <>
                    <Bitcoin className="mr-2 h-4 w-4" />
                    Pay {paymentState.amountSats} sats
                  </>
                )}
              </Button>
              {paymentState.status === 'failed' && (
                <p className="text-sm text-destructive">
                  {paymentState.error || "Payment failed"}
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="my-2 space-y-1">
        <Label htmlFor="targetDvmInput">
          Target DVM (Optional - npub or hex for encryption)
        </Label>
        <Input
          id="targetDvmInput"
          value={targetDvmInput}
          onChange={(e) => setTargetDvmInput(e.target.value)}
          placeholder="npub1... or hex pubkey (leave blank for unencrypted broadcast)"
          className="h-7 text-xs"
          disabled={walletState.isLoading}
        />
      </div>

      <Card className="h-[calc(100%-290px)]">
        {" "}
        {/* Adjust height dynamically */}
        <CardHeader className="pt-3 pb-2">
          <CardTitle className="text-base">
            Chat with NIP-90 DVM (Kind 5050)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-3.5rem)] p-0">
          <ChatContainer
            className="!h-full rounded-none border-0 bg-transparent shadow-none"
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
