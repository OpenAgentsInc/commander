import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Effect, Exit, Cause } from "effect";
import {
  SparkService,
  type BalanceInfo,
  type LightningInvoice,
  type LightningPayment,
  type CreateLightningInvoiceParams,
  type PayLightningInvoiceParams,
} from "@/services/spark";
import { getMainRuntime } from "@/services/runtime";
import { TelemetryService } from "@/services/telemetry";
import { useWalletStore } from "@/stores/walletStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Bitcoin,
  Zap,
  ArrowDownToLine,
  Send,
  Copy,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Key,
  LogOut,
} from "lucide-react";
import { cn } from "@/utils/tailwind";
import ViewSeedPhraseDialog from "./ViewSeedPhraseDialog";
import LogoutWarningDialog from "./LogoutWarningDialog";

const WalletPane: React.FC = () => {
  const runtime = getMainRuntime();
  const [activeTab, setActiveTab] = useState("balance");

  // Get wallet initialization status
  const walletIsInitialized = useWalletStore((state) => state.isInitialized);

  // --- Balance State ---
  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useQuery<BalanceInfo, Error>({
    queryKey: ["walletPaneBitcoinBalance"],
    queryFn: async () => {
      const program = Effect.flatMap(SparkService, (s) => s.getBalance());
      const exitResult = await Effect.runPromiseExit(
        Effect.provide(program, runtime),
      );
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
    refetchInterval: 60000,
  });

  // --- Lightning Invoice Generation State ---
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceMemo, setInvoiceMemo] = useState("");
  const [generatedInvoice, setGeneratedInvoice] =
    useState<LightningInvoice | null>(null);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  const generateInvoiceMutation = useMutation<
    LightningInvoice,
    Error,
    CreateLightningInvoiceParams
  >({
    mutationFn: async (params) => {
      const program = Effect.flatMap(SparkService, (s) =>
        s.createLightningInvoice(params),
      );
      const exitResult = await Effect.runPromiseExit(
        Effect.provide(program, runtime),
      );
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
    onSuccess: (data) => {
      setGeneratedInvoice(data);
      Effect.runFork(
        Effect.provide(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "wallet",
              action: "generate_invoice_success",
            }),
          ),
          runtime,
        ),
      );
    },
    onError: (error) =>
      Effect.runFork(
        Effect.provide(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "wallet",
              action: "generate_invoice_failure",
              label: error.message,
            }),
          ),
          runtime,
        ),
      ),
  });

  const handleGenerateInvoice = () => {
    const amountSats = parseInt(invoiceAmount, 10);
    if (isNaN(amountSats) || amountSats <= 0) {
      alert("Please enter a valid amount in satoshis.");
      return;
    }
    setGeneratedInvoice(null); // Clear previous invoice
    generateInvoiceMutation.mutate({ amountSats, memo: invoiceMemo });
  };

  // --- Lightning Payment State ---
  const [paymentInvoiceInput, setPaymentInvoiceInput] = useState("");
  const [paymentResult, setPaymentResult] = useState<LightningPayment | null>(
    null,
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const payInvoiceMutation = useMutation<
    LightningPayment,
    Error,
    PayLightningInvoiceParams
  >({
    mutationFn: async (params) => {
      const program = Effect.flatMap(SparkService, (s) =>
        s.payLightningInvoice(params),
      );
      const exitResult = await Effect.runPromiseExit(
        Effect.provide(program, runtime),
      );
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
    onSuccess: (data) => {
      setPaymentResult(data);
      setPaymentError(null);
      Effect.runFork(
        Effect.provide(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "wallet",
              action: "pay_invoice_success",
              label: data.payment.status,
            }),
          ),
          runtime,
        ),
      );
      refetchBalance();
      setPaymentInvoiceInput(""); // Clear input on success
    },
    onError: (error) => {
      setPaymentError(error.message);
      setPaymentResult(null);
      Effect.runFork(
        Effect.provide(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "wallet",
              action: "pay_invoice_failure",
              label: error.message,
            }),
          ),
          runtime,
        ),
      );
    },
  });

  const handlePayInvoice = () => {
    if (!paymentInvoiceInput.trim()) {
      alert("Please enter a Lightning invoice.");
      return;
    }
    setPaymentResult(null);
    setPaymentError(null); // Clear previous results
    payInvoiceMutation.mutate({
      invoice: paymentInvoiceInput.trim(),
      maxFeeSats: 100,
    }); // Default max fee
  };

  // --- Receive Bitcoin (Spark Address) State ---
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const generateAddressMutation = useMutation<string, Error>({
    mutationFn: async () => {
      const program = Effect.flatMap(SparkService, (s) =>
        s.getSingleUseDepositAddress(),
      );
      const exitResult = await Effect.runPromiseExit(
        Effect.provide(program, runtime),
      );
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
    onSuccess: (data) => {
      setDepositAddress(data);
      Effect.runFork(
        Effect.provide(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "wallet",
              action: "generate_deposit_address_success",
            }),
          ),
          runtime,
        ),
      );
    },
    onError: (error) =>
      Effect.runFork(
        Effect.provide(
          Effect.flatMap(TelemetryService, (ts) =>
            ts.trackEvent({
              category: "wallet",
              action: "generate_deposit_address_failure",
              label: error.message,
            }),
          ),
          runtime,
        ),
      ),
  });

  const handleCopyToClipboard = (text: string, type: "invoice" | "address") => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        if (type === "invoice") setCopiedInvoice(true);
        if (type === "address") setCopiedAddress(true);
        setTimeout(() => {
          if (type === "invoice") setCopiedInvoice(false);
          if (type === "address") setCopiedAddress(false);
        }, 2000);
      })
      .catch((err) => console.error("Failed to copy:", err));
  };

  // Telemetry for opening the pane
  useEffect(() => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: "ui:pane",
          action: "open_wallet_pane",
        }),
      ).pipe(Effect.provide(runtime)),
    );
  }, [runtime]);

  return (
    <div className="flex h-full flex-col p-1 text-sm">
      <Card className="flex flex-grow flex-col border-0 bg-transparent shadow-none">
        <CardHeader className="p-2 pt-0 pb-1 text-center">
          <CardTitle className="flex items-center justify-center text-base">
            <Bitcoin className="mr-2 h-4 w-4 text-yellow-500" /> Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-1">
          <div className="mb-2 flex items-center justify-center gap-2">
            <ViewSeedPhraseDialog>
              <Button variant="outline" size="sm" className="text-xs">
                <Key className="mr-1.5 h-3 w-3" /> View Seed Phrase
              </Button>
            </ViewSeedPhraseDialog>
            <LogoutWarningDialog>
              <Button variant="outline" size="sm" className="text-xs">
                <LogOut className="mr-1.5 h-3 w-3" /> Logout
              </Button>
            </LogoutWarningDialog>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex h-full flex-col"
          >
            <TabsList className="mb-1 grid h-8 w-full grid-cols-3">
              <TabsTrigger value="balance" className="h-6 text-xs">
                Balance
              </TabsTrigger>
              <TabsTrigger value="lightning" className="h-6 text-xs">
                Lightning
              </TabsTrigger>
              <TabsTrigger value="onchain" className="h-6 text-xs">
                On-Chain
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="balance"
              className="flex-grow overflow-hidden p-0 data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-full">
                <div className="space-y-4 p-3 text-center">
                  <h3 className="text-sm font-semibold">Current Balance</h3>
                  {isLoadingBalance && (
                    <div className="text-muted-foreground">
                      <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  )}
                  {balanceError && (
                    <div className="text-destructive">
                      <AlertTriangle className="mr-1 inline h-4 w-4" />
                      {balanceError.message}
                    </div>
                  )}
                  {balanceData && (
                    <p className="text-3xl font-bold text-yellow-400">
                      <span className="text-xl">₿</span>{" "}
                      {balanceData.balance.toString()}
                    </p>
                  )}
                  <Button
                    onClick={() => refetchBalance()}
                    variant="outline"
                    size="sm"
                    className="mx-auto mt-2 w-full max-w-xs"
                  >
                    <RefreshCw className="mr-1.5 h-3 w-3" /> Refresh Balance
                  </Button>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="lightning"
              className="flex-grow overflow-hidden p-0 data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-full">
                <div className="space-y-3 p-2">
                  <Card className="bg-background/60">
                    <CardHeader className="p-2 pb-1">
                      <CardTitle className="flex items-center text-xs font-semibold">
                        <Zap className="mr-1.5 h-3 w-3 text-yellow-500" />
                        Receive via Lightning
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 p-2">
                      <div>
                        <Label htmlFor="invoiceAmountLn" className="text-xs">
                          Amount (sats)
                        </Label>
                        <Input
                          id="invoiceAmountLn"
                          type="number"
                          value={invoiceAmount}
                          onChange={(e) => setInvoiceAmount(e.target.value)}
                          placeholder="e.g., 1000"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="invoiceMemoLn" className="text-xs">
                          Memo (optional)
                        </Label>
                        <Input
                          id="invoiceMemoLn"
                          value={invoiceMemo}
                          onChange={(e) => setInvoiceMemo(e.target.value)}
                          placeholder="e.g., For services"
                          className="h-7 text-xs"
                        />
                      </div>
                      <Button
                        onClick={handleGenerateInvoice}
                        disabled={generateInvoiceMutation.isPending}
                        size="sm"
                        className="h-7 w-full text-xs"
                      >
                        {generateInvoiceMutation.isPending ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Zap className="mr-1.5 h-3 w-3" />
                        )}
                        Generate Invoice
                      </Button>
                      {generateInvoiceMutation.isError && (
                        <p className="text-destructive mt-1 text-xs">
                          Error: {generateInvoiceMutation.error.message}
                        </p>
                      )}
                      {generatedInvoice && (
                        <div className="border-primary/50 bg-primary/10 mt-2 space-y-1 rounded-md border border-dashed p-2">
                          <div className="my-1 flex justify-center">
                            <QRCodeSVG
                              value={generatedInvoice.invoice.encodedInvoice}
                              size={112}
                              level="M"
                              bgColor="var(--background)"
                              fgColor="var(--foreground)"
                            />
                          </div>
                          <Textarea
                            value={generatedInvoice.invoice.encodedInvoice}
                            readOnly
                            rows={3}
                            className="bg-background/70 h-auto font-mono text-[9px]"
                          />
                          <Button
                            onClick={() =>
                              handleCopyToClipboard(
                                generatedInvoice.invoice.encodedInvoice,
                                "invoice",
                              )
                            }
                            size="sm"
                            variant="ghost"
                            className="h-6 w-full text-xs"
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            {copiedInvoice ? "Copied!" : "Copy Invoice"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="bg-background/60">
                    <CardHeader className="p-2 pb-1">
                      <CardTitle className="flex items-center text-xs font-semibold">
                        <Send className="mr-1.5 h-3 w-3" />
                        Send via Lightning
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 p-2">
                      <div>
                        <Label htmlFor="paymentInvoiceLn" className="text-xs">
                          BOLT11 Invoice
                        </Label>
                        <Textarea
                          id="paymentInvoiceLn"
                          value={paymentInvoiceInput}
                          onChange={(e) =>
                            setPaymentInvoiceInput(e.target.value)
                          }
                          placeholder="lnbc..."
                          rows={3}
                          className="h-auto font-mono text-xs"
                        />
                      </div>
                      <Button
                        onClick={handlePayInvoice}
                        disabled={payInvoiceMutation.isPending}
                        size="sm"
                        className="h-7 w-full text-xs"
                      >
                        {payInvoiceMutation.isPending ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="mr-1.5 h-3 w-3" />
                        )}
                        Pay Invoice
                      </Button>
                      {paymentError && (
                        <p className="text-destructive mt-1 text-xs">
                          <AlertTriangle className="mr-1 inline h-3 w-3" />
                          {paymentError}
                        </p>
                      )}
                      {paymentResult && (
                        <div
                          className={cn(
                            "mt-2 rounded-md border border-dashed p-2 text-xs",
                            paymentResult.payment.status === "SUCCESS"
                              ? "border-green-500/50 bg-green-500/10 text-green-400"
                              : "border-orange-500/50 bg-orange-500/10 text-orange-400",
                          )}
                        >
                          <p className="flex items-center font-semibold">
                            {" "}
                            {paymentResult.payment.status === "SUCCESS" ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : (
                              <AlertTriangle className="mr-1 h-3 w-3" />
                            )}
                            Payment Status: {paymentResult.payment.status}
                          </p>
                          <p className="truncate">
                            ID: {paymentResult.payment.id}
                          </p>
                          {paymentResult.payment.feeSats > 0 && (
                            <p>Fee: {paymentResult.payment.feeSats} sats</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="onchain"
              className="flex-grow overflow-hidden p-0 data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-full">
                <div className="space-y-3 p-2">
                  <Card className="bg-background/60">
                    <CardHeader className="p-2 pb-1">
                      <CardTitle className="flex items-center text-xs font-semibold">
                        <ArrowDownToLine className="mr-1.5 h-3 w-3" />
                        Receive Bitcoin (On-Chain)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 p-2">
                      <Button
                        onClick={() => generateAddressMutation.mutate()}
                        disabled={generateAddressMutation.isPending}
                        size="sm"
                        className="h-7 w-full text-xs"
                      >
                        {generateAddressMutation.isPending ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        Generate Deposit Address
                      </Button>
                      {generateAddressMutation.isError && (
                        <p className="text-destructive mt-1 text-xs">
                          <AlertTriangle className="mr-1 inline h-3 w-3" />
                          Error: {generateAddressMutation.error.message}
                        </p>
                      )}
                      {depositAddress && (
                        <div className="border-primary/50 bg-primary/10 mt-2 space-y-1 rounded-md border border-dashed p-2">
                          <div className="my-1 flex justify-center">
                            <QRCodeSVG
                              value={depositAddress}
                              size={112}
                              level="M"
                              bgColor="var(--background)"
                              fgColor="var(--foreground)"
                            />
                          </div>
                          <Textarea
                            value={depositAddress}
                            readOnly
                            rows={2}
                            className="bg-background/70 h-auto font-mono text-[9px]"
                          />
                          <Button
                            onClick={() =>
                              handleCopyToClipboard(depositAddress, "address")
                            }
                            size="sm"
                            variant="ghost"
                            className="h-6 w-full text-xs"
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            {copiedAddress ? "Copied!" : "Copy Address"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="bg-background/60 opacity-60">
                    <CardHeader className="p-2 pb-1">
                      <CardTitle className="flex items-center text-xs font-semibold">
                        <Send className="mr-1.5 h-3 w-3" />
                        Send Bitcoin (On-Chain)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 p-2">
                      <p className="text-muted-foreground py-4 text-center text-xs">
                        On-chain sending requires SparkService extension.
                        (Placeholder)
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletPane;
