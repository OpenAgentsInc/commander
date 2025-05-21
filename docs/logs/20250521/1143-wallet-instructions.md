Okay, let's get this full Spark wallet pane built. We'll focus on integrating the existing Spark service capabilities for balance display, Lightning invoice generation/payment, and receiving Bitcoin via Spark address. Sending on-chain Bitcoin will be a placeholder UI as it requires extending the `SparkService`.

Here are the coding instructions:

**I. Setup and Dependencies**

1.  **Add QR Code Library:**
    *   If not already present, add `qrcode.react` for displaying QR codes for invoices and addresses.
        ```bash
        pnpm add qrcode.react
        pnpm add -D @types/qrcode.react
        ```

**II. Hotbar Integration**

1.  **Objective:** Add a "Wallet" icon to the Hotbar that opens the new Wallet Pane.
2.  **File:** `src/components/hud/Hotbar.tsx`
    *   **Import necessary items:**
        ```typescript
        import { Wallet } from 'lucide-react'; // Or another suitable icon
        import { usePaneStore } from '@/stores/pane';
        import { WALLET_PANE_ID } from '@/stores/panes/constants'; // This will be created later
        ```
    *   **Get store action and state:**
        ```typescript
        const openWalletPane = usePaneStore((state) => state.openWalletPane); // This action will be created later
        const activePaneId = usePaneStore((state) => state.activePaneId);
        ```
    *   **Add new `HotbarItem`:**
        *   Choose an appropriate slot number. For example, if "Reset HUD Layout" is Slot 4, make this Slot 5.
        *   The `onClick` handler should call `openWalletPane`.
        *   The `isActive` prop should check if `activePaneId === WALLET_PANE_ID`.
        *   Example (adjust slot number as needed):
            ```typescript
            <HotbarItem slotNumber={5} onClick={openWalletPane} title="Wallet" isActive={activePaneId === WALLET_PANE_ID}>
              <Wallet className="w-5 h-5 text-muted-foreground" />
            </HotbarItem>
            ```
    *   Adjust the `Array.from({ length: ... })` for empty slots accordingly.

**III. Wallet Pane Store Logic**

1.  **Define Pane Type and Constants:**
    *   **File:** `src/types/pane.ts`
        *   Add `'wallet'` to the `Pane['type']` union:
            ```typescript
            export type Pane = {
              // ... existing types ...
              type: 'default' | /* ... */ | 'nip90_global_feed' | 'wallet' | string; // Added 'wallet'
              // ...
            }
            ```
    *   **File:** `src/stores/panes/constants.ts`
        *   Add constants for the wallet pane:
            ```typescript
            export const WALLET_PANE_ID = 'wallet_pane';
            export const WALLET_PANE_TITLE = 'Bitcoin Wallet';
            ```

2.  **Implement Store Action:**
    *   **File:** Create `src/stores/panes/actions/openWalletPane.ts`
        ```typescript
        import { type PaneInput } from '@/types/pane';
        import { type PaneStoreType, type SetPaneStore } from '../types';
        import { addPaneActionLogic } from './addPane';
        import { WALLET_PANE_ID, WALLET_PANE_TITLE } from '../constants';

        export function openWalletPaneAction(set: SetPaneStore) {
          set((state: PaneStoreType) => {
            const existingPane = state.panes.find(p => p.id === WALLET_PANE_ID);
            if (existingPane) {
              const newPanes = state.panes
                .map(p => ({ ...p, isActive: p.id === WALLET_PANE_ID }))
                .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1)); // Active last for z-index
              return {
                ...state,
                panes: newPanes,
                activePaneId: WALLET_PANE_ID,
                lastPanePosition: {
                  x: existingPane.x,
                  y: existingPane.y,
                  width: existingPane.width,
                  height: existingPane.height
                }
              };
            }

            const newPaneInput: PaneInput = {
              id: WALLET_PANE_ID,
              type: 'wallet',
              title: WALLET_PANE_TITLE,
              dismissable: true,
              width: 450, // Adjust default size as needed
              height: 550,
            };
            const changes = addPaneActionLogic(state, newPaneInput, true); // true for tiling
            return { ...state, ...changes };
          });
        }
        ```
    *   **File:** `src/stores/panes/actions/index.ts`
        *   Export the new action: `export * from './openWalletPane';`
    *   **File:** `src/stores/panes/types.ts`
        *   Add the action to `PaneStoreType` interface: `openWalletPane: () => void;`
    *   **File:** `src/stores/pane.ts`
        *   Import `openWalletPaneAction`.
        *   Add it to the store implementation: `openWalletPane: () => openWalletPaneAction(set),`

3.  **Test Store Action (Conceptual - or create `openWalletPane.test.ts`):**
    *   Verify that `openWalletPaneAction` adds a new pane of type `'wallet'` or activates an existing one.

**IV. Bitcoin Balance Display Component Modification**

1.  **Objective:** Change the top-right Bitcoin balance display to open the new Wallet Pane.
2.  **File:** `src/components/hud/BitcoinBalanceDisplay.tsx`
    *   **Import necessary items:**
        ```typescript
        // import { usePaneStore } from '@/stores/pane'; // Already there
        // const openSellComputePane = usePaneStore((state) => state.openSellComputePane); // Remove this line
        const openWalletPane = usePaneStore((state) => state.openWalletPane); // Add this line
        ```
    *   **Modify `handleDisplayClick` function:**
        ```typescript
        const handleDisplayClick = () => {
          // console.log('Opening wallet pane (placeholder - to be implemented)'); // Remove this log
          // openSellComputePane(); // Remove this line
          openWalletPane(); // Add this line
        };
        ```
    *   **Update `title` prop:**
        ```typescript
        <div
          onClick={handleDisplayClick}
          title="Open Wallet" // Changed title
          // ... rest of the props
        >
        ```

**V. Wallet Pane UI Component Creation**

1.  **Create Directory:** `src/components/wallet/`
2.  **Create File:** `src/components/wallet/WalletPane.tsx`
    ```typescript
    // src/components/wallet/WalletPane.tsx
    import React, { useState, useEffect } from 'react';
    import { useQuery, useMutation, QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import QRCode from 'qrcode.react';
    import { Effect, Exit, Cause } from 'effect';
    import { SparkService, type BalanceInfo, type LightningInvoice, type LightningPayment, type CreateLightningInvoiceParams, type PayLightningInvoiceParams } from '@/services/spark';
    import { getMainRuntime } from '@/services/runtime';
    import { TelemetryService } from '@/services/telemetry';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
    import { ScrollArea } from '@/components/ui/scroll-area';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // For organizing sections
    import { Bitcoin, Zap, ArrowDownToLine, Send, Copy, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
    import { cn } from '@/utils/tailwind';

    // It's good practice to create a new QueryClient instance for components
    // that might be unmounted/remounted, or provide one from a higher context if needed.
    // For a pane, it might be okay if it's not remounted frequently, or use the app's global client.
    // const queryClient = new QueryClient(); // Using global client from App.tsx via context

    const WalletPane: React.FC = () => {
      const runtime = getMainRuntime();
      const [activeTab, setActiveTab] = useState("balance");

      // --- Balance State ---
      const { data: balanceData, isLoading: isLoadingBalance, error: balanceError, refetch: refetchBalance } = useQuery<BalanceInfo, Error>({
        queryKey: ['walletBitcoinBalance'], // Use a unique key for this pane's balance query
        queryFn: async () => {
          const program = Effect.flatMap(SparkService, s => s.getBalance());
          const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
          if (Exit.isSuccess(exitResult)) return exitResult.value;
          throw Cause.squash(exitResult.cause);
        },
        refetchInterval: 60000, // Refetch balance every 60 seconds
      });

      // --- Lightning Invoice Generation State ---
      const [invoiceAmount, setInvoiceAmount] = useState('');
      const [invoiceMemo, setInvoiceMemo] = useState('');
      const [generatedInvoice, setGeneratedInvoice] = useState<LightningInvoice | null>(null);

      const generateInvoiceMutation = useMutation<LightningInvoice, Error, CreateLightningInvoiceParams>({
        mutationFn: async (params) => {
          const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(params));
          const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
          if (Exit.isSuccess(exitResult)) return exitResult.value;
          throw Cause.squash(exitResult.cause);
        },
        onSuccess: (data) => {
          setGeneratedInvoice(data);
          Effect.runFork(Effect.provide(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "generate_invoice_success" })),
            runtime
          ));
        },
        onError: (error) => {
          console.error("Generate invoice error:", error);
          Effect.runFork(Effect.provide(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "generate_invoice_failure", label: error.message })),
            runtime
          ));
        }
      });

      const handleGenerateInvoice = () => {
        const amountSats = parseInt(invoiceAmount, 10);
        if (isNaN(amountSats) || amountSats <= 0) {
          alert("Please enter a valid amount in satoshis.");
          return;
        }
        generateInvoiceMutation.mutate({ amountSats, memo: invoiceMemo });
      };

      // --- Lightning Payment State ---
      const [paymentInvoice, setPaymentInvoice] = useState('');
      const [paymentResult, setPaymentResult] = useState<LightningPayment | null>(null);
      const [paymentError, setPaymentError] = useState<string | null>(null);

      const payInvoiceMutation = useMutation<LightningPayment, Error, PayLightningInvoiceParams>({
        mutationFn: async (params) => {
          const program = Effect.flatMap(SparkService, s => s.payLightningInvoice(params));
          const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
          if (Exit.isSuccess(exitResult)) return exitResult.value;
          throw Cause.squash(exitResult.cause);
        },
        onSuccess: (data) => {
          setPaymentResult(data);
          setPaymentError(null);
          Effect.runFork(Effect.provide(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "pay_invoice_success", label: data.payment.status })),
            runtime
          ));
          refetchBalance(); // Refresh balance after payment
        },
        onError: (error) => {
          setPaymentError(error.message);
          setPaymentResult(null);
          console.error("Pay invoice error:", error);
          Effect.runFork(Effect.provide(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "pay_invoice_failure", label: error.message })),
            runtime
          ));
        }
      });

      const handlePayInvoice = () => {
        if (!paymentInvoice.trim()) {
          alert("Please enter a Lightning invoice.");
          return;
        }
        // For simplicity, using a default maxFeeSats. This could be user-configurable.
        payInvoiceMutation.mutate({ invoice: paymentInvoice.trim(), maxFeeSats: 100 });
      };

      // --- Receive Bitcoin (Spark Address) State ---
      const [depositAddress, setDepositAddress] = useState<string | null>(null);
      const generateAddressMutation = useMutation<string, Error>({
        mutationFn: async () => {
          const program = Effect.flatMap(SparkService, s => s.getSingleUseDepositAddress());
          const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
          if (Exit.isSuccess(exitResult)) return exitResult.value;
          throw Cause.squash(exitResult.cause);
        },
        onSuccess: (data) => {
          setDepositAddress(data);
          Effect.runFork(Effect.provide(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "generate_deposit_address_success" })),
            runtime
          ));
        },
        onError: (error) => {
          console.error("Generate deposit address error:", error);
          Effect.runFork(Effect.provide(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "generate_deposit_address_failure", label: error.message })),
            runtime
          ));
        }
      });

      const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
          // TODO: Show a small notification/toast "Copied!"
          console.log("Copied to clipboard:", text);
        }).catch(err => {
          console.error("Failed to copy:", err);
        });
      };

      // Telemetry for opening the pane
      useEffect(() => {
        Effect.runFork(
          Effect.flatMap(TelemetryService, ts => ts.trackEvent({
              category: 'ui:pane',
              action: 'open_wallet_pane'
          })).pipe(Effect.provide(runtime))
        );
      }, [runtime]);

      return (
          <div className="p-1 h-full flex flex-col text-sm">
            <Card className="flex-grow flex flex-col border-0 shadow-none bg-transparent">
              <CardHeader className="p-2 pt-0 pb-1 text-center">
                <CardTitle className="text-base flex items-center justify-center">
                  <Bitcoin className="w-4 h-4 mr-2 text-yellow-500" /> Commander Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1 flex-grow overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-3 mb-1 h-8">
                    <TabsTrigger value="balance" className="text-xs h-6">Balance</TabsTrigger>
                    <TabsTrigger value="lightning" className="text-xs h-6">Lightning</TabsTrigger>
                    <TabsTrigger value="onchain" className="text-xs h-6">On-Chain</TabsTrigger>
                  </TabsList>

                  <TabsContent value="balance" className="flex-grow overflow-hidden p-0">
                    <ScrollArea className="h-full">
                      <div className="p-2 space-y-3">
                        <h3 className="text-sm font-semibold text-center">Current Balance</h3>
                        {isLoadingBalance && <div className="text-center text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-1" />Loading balance...</div>}
                        {balanceError && <div className="text-center text-destructive"><AlertTriangle className="inline h-4 w-4 mr-1" />Error: {balanceError.message}</div>}
                        {balanceData && (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-400">{balanceData.balance.toString()} <span className="text-lg">sats</span></p>
                            {/* TODO: Display token balances if any */}
                          </div>
                        )}
                        <Button onClick={() => refetchBalance()} variant="outline" size="sm" className="w-full">
                          <RefreshCw className="h-3 w-3 mr-1.5" /> Refresh Balance
                        </Button>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="lightning" className="flex-grow overflow-hidden p-0">
                    <ScrollArea className="h-full">
                      <div className="p-2 space-y-4">
                        {/* Generate Invoice Section */}
                        <Card className="bg-background/50">
                          <CardHeader className="p-2 pb-1">
                            <CardTitle className="text-xs font-semibold flex items-center"><Zap className="h-3 w-3 mr-1.5 text-yellow-500"/>Receive via Lightning</CardTitle>
                          </CardHeader>
                          <CardContent className="p-2 space-y-2">
                            <div>
                              <Label htmlFor="invoiceAmount" className="text-xs">Amount (sats)</Label>
                              <Input id="invoiceAmount" type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="e.g., 1000" className="h-7 text-xs" />
                            </div>
                            <div>
                              <Label htmlFor="invoiceMemo" className="text-xs">Memo (optional)</Label>
                              <Input id="invoiceMemo" value={invoiceMemo} onChange={(e) => setInvoiceMemo(e.target.value)} placeholder="e.g., For services" className="h-7 text-xs" />
                            </div>
                            <Button onClick={handleGenerateInvoice} disabled={generateInvoiceMutation.isPending} size="sm" className="w-full text-xs h-7">
                              {generateInvoiceMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : <Zap className="h-3 w-3 mr-1.5"/>}Generate Invoice
                            </Button>
                            {generateInvoiceMutation.isError && <p className="text-xs text-destructive mt-1">Error: {generateInvoiceMutation.error.message}</p>}
                            {generatedInvoice && (
                              <div className="mt-2 space-y-1 p-2 border border-dashed border-primary/50 rounded-md bg-primary/10">
                                <p className="text-xs font-semibold">Generated Invoice:</p>
                                <div className="flex justify-center my-2"><QRCode value={generatedInvoice.invoice.encodedInvoice} size={128} level="M" /></div>
                                <Textarea value={generatedInvoice.invoice.encodedInvoice} readOnly rows={3} className="text-[10px] h-auto font-mono bg-background/70" />
                                <Button onClick={() => handleCopyToClipboard(generatedInvoice.invoice.encodedInvoice)} size="xs" variant="ghost" className="text-xs h-6 w-full"><Copy className="h-3 w-3 mr-1"/>Copy Invoice</Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Pay Invoice Section */}
                        <Card className="bg-background/50">
                          <CardHeader className="p-2 pb-1">
                            <CardTitle className="text-xs font-semibold flex items-center"><Send className="h-3 w-3 mr-1.5"/>Send via Lightning</CardTitle>
                          </CardHeader>
                          <CardContent className="p-2 space-y-2">
                            <div>
                              <Label htmlFor="paymentInvoice" className="text-xs">BOLT11 Invoice</Label>
                              <Textarea id="paymentInvoice" value={paymentInvoice} onChange={(e) => setPaymentInvoice(e.target.value)} placeholder="lnbc..." rows={3} className="text-xs h-auto font-mono" />
                            </div>
                            <Button onClick={handlePayInvoice} disabled={payInvoiceMutation.isPending} size="sm" className="w-full text-xs h-7">
                               {payInvoiceMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : <Send className="h-3 w-3 mr-1.5"/>}Pay Invoice
                            </Button>
                            {paymentError && <p className="text-xs text-destructive mt-1">Error: {paymentError}</p>}
                            {paymentResult && (
                              <div className={cn("mt-2 text-xs p-2 rounded-md border border-dashed", paymentResult.payment.status === 'SUCCESS' ? "text-green-400 border-green-500/50 bg-green-500/10" : "text-orange-400 border-orange-500/50 bg-orange-500/10")}>
                                <p className="font-semibold">Payment Status: {paymentResult.payment.status}</p>
                                {paymentResult.payment.status === 'SUCCESS' && <CheckCircle2 className="inline h-3 w-3 mr-1"/>}
                                <p>ID: {paymentResult.payment.id.substring(0,15)}...</p>
                                {paymentResult.payment.feeSats > 0 && <p>Fee: {paymentResult.payment.feeSats} sats</p>}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="onchain" className="flex-grow overflow-hidden p-0">
                    <ScrollArea className="h-full">
                      <div className="p-2 space-y-4">
                        {/* Receive Bitcoin Section */}
                        <Card className="bg-background/50">
                          <CardHeader className="p-2 pb-1">
                            <CardTitle className="text-xs font-semibold flex items-center"><ArrowDownToLine className="h-3 w-3 mr-1.5"/>Receive Bitcoin (On-Chain)</CardTitle>
                          </CardHeader>
                          <CardContent className="p-2 space-y-2">
                            <Button onClick={() => generateAddressMutation.mutate()} disabled={generateAddressMutation.isPending} size="sm" className="w-full text-xs h-7">
                              {generateAddressMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : null}Generate Deposit Address
                            </Button>
                            {generateAddressMutation.isError && <p className="text-xs text-destructive mt-1">Error: {generateAddressMutation.error.message}</p>}
                            {depositAddress && (
                              <div className="mt-2 space-y-1 p-2 border border-dashed border-primary/50 rounded-md bg-primary/10">
                                <p className="text-xs font-semibold">Deposit Address:</p>
                                <div className="flex justify-center my-2"><QRCode value={depositAddress} size={128} level="M" /></div>
                                <Textarea value={depositAddress} readOnly rows={2} className="text-[10px] h-auto font-mono bg-background/70" />
                                <Button onClick={() => handleCopyToClipboard(depositAddress)} size="xs" variant="ghost" className="text-xs h-6 w-full"><Copy className="h-3 w-3 mr-1"/>Copy Address</Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Send Bitcoin Section (Placeholder) */}
                        <Card className="bg-background/50 opacity-50">
                          <CardHeader className="p-2 pb-1">
                            <CardTitle className="text-xs font-semibold flex items-center"><Send className="h-3 w-3 mr-1.5"/>Send Bitcoin (On-Chain)</CardTitle>
                          </CardHeader>
                          <CardContent className="p-2 space-y-2">
                            <p className="text-xs text-muted-foreground text-center py-4">
                              On-chain sending functionality is not yet implemented in SparkService.
                            </p>
                            {/* Placeholder UI elements, disabled for now
                            <div>
                              <Label htmlFor="sendAddress" className="text-xs">Recipient Address</Label>
                              <Input id="sendAddress" placeholder="bitcoin_address..." className="h-7 text-xs" disabled/>
                            </div>
                            <div>
                              <Label htmlFor="sendAmount" className="text-xs">Amount (sats)</Label>
                              <Input id="sendAmount" type="number" placeholder="e.g., 10000" className="h-7 text-xs" disabled/>
                            </div>
                            <Button size="sm" className="w-full text-xs h-7" disabled>Send Bitcoin</Button>
                            */}
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

    // To use this component, wrap it in QueryClientProvider if it's not already provided higher up.
    // Example usage:
    // import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    // const queryClient = new QueryClient();
    // // In your app:
    // <QueryClientProvider client={queryClient}>
    //   <WalletPane />
    // </QueryClientProvider>
    ```
3.  **Add to `src/components/wallet/index.ts`:**
    ```typescript
    // src/components/wallet/index.ts
    export { default as WalletPane } from './WalletPane';
    ```

**VI. Pane Manager Integration**

1.  **File:** `src/panes/PaneManager.tsx`
    *   **Import the new `WalletPane`:**
        ```typescript
        import { WalletPane } from '@/components/wallet'; // Or from '@/components/wallet/WalletPane'
        ```
    *   **Add a case to render `<WalletPane />`:**
        ```typescript
        // Inside the panes.map(...)
        {pane.type === 'wallet' && (
          <WalletPane />
        )}
        // ...
        // Update the final fallback condition to include 'wallet'
        {!(
          // ... other types ...
          pane.type === 'wallet' || // Added
          pane.type === 'default'
        ) && <PlaceholderDefaultComponent type={pane.type} />}
        ```

**VII. Spark Service Review**

*   The current `SparkService` interface methods (`createLightningInvoice`, `payLightningInvoice`, `getBalance`, `getSingleUseDepositAddress`) are sufficient for the requested features except for *sending* on-chain Bitcoin.
*   **For Sending On-Chain Bitcoin:**
    *   This functionality is **not** currently in `SparkService.ts`.
    *   If the Spark SDK supports on-chain sending, `SparkService.ts` and `SparkServiceImpl.ts` would need to be extended with a new method (e.g., `sendOnChainBitcoin(params: { address: string; amountSats: number; feeRate?: number })`).
    *   This extension is a larger task and depends on SDK capabilities. For now, the placeholder UI in `WalletPane.tsx` is appropriate.

**VIII. Final Checks and Testing**

1.  Ensure all imports are correct.
2.  Run `pnpm tsc --noEmit` to check for TypeScript errors.
3.  Run `pnpm start` to test the UI:
    *   Verify the Wallet Hotbar icon and the top-right Balance display open the Wallet Pane.
    *   Test balance display.
    *   Test generating a Lightning invoice (amount, memo, QR code, copy).
    *   Test paying a Lightning invoice (use a test invoice if possible).
    *   Test generating a Bitcoin deposit address (QR code, copy).
    *   Check for loading states, error messages, and general usability.
4.  Consider adding basic unit tests for `WalletPane.tsx` to mock `SparkService` calls and verify UI updates.

This set of instructions should provide a comprehensive Wallet Pane. Remember to handle potential errors from Spark service calls gracefully in the UI.Okay, I will implement the Spark Wallet Pane as per your detailed instructions.

This will involve:
1.  Adding `qrcode.react` dependency.
2.  Updating the Hotbar with a "Wallet" icon and action.
3.  Modifying the `BitcoinBalanceDisplay` to open the new Wallet Pane.
4.  Creating the necessary store logic (pane type, constants, action) for the Wallet Pane.
5.  Building the `WalletPane.tsx` component with tabs for Balance, Lightning (Receive/Pay), and On-Chain (Receive/Placeholder for Send).
6.  Integrating the `WalletPane` into the `PaneManager`.
7.  Noting that on-chain sending requires further `SparkService` extension.

Let's proceed with the implementation.
```typescript
// src/components/hud/Hotbar.tsx
import React from 'react';
import { cn } from '@/utils/tailwind';
import { HotbarItem } from './HotbarItem';
import { RefreshCw, Store, History, Hand, Wallet } from 'lucide-react'; // Added Wallet
import { usePaneStore } from '@/stores/pane';
import { SELL_COMPUTE_PANE_ID_CONST, NIP90_DVM_TEST_PANE_ID, NIP90_CONSUMER_CHAT_PANE_ID, NIP90_GLOBAL_FEED_PANE_ID } from '@/stores/panes/constants'; // SELL_COMPUTE_PANE_ID_CONST used in isActive
import { DVM_JOB_HISTORY_PANE_ID } from '@/stores/panes/actions/openDvmJobHistoryPane'; // DVM_JOB_HISTORY_PANE_ID used in isActive
import { WALLET_PANE_ID } from '@/stores/panes/constants'; // Will be created

interface HotbarProps {
  className?: string;
  isHandTrackingActive: boolean;
  onToggleHandTracking: () => void;
  onOpenSellComputePane: () => void;
  onOpenDvmJobHistoryPane: () => void;
}

export const Hotbar: React.FC<HotbarProps> = ({
  className,
  isHandTrackingActive,
  onToggleHandTracking,
  onOpenSellComputePane,
  onOpenDvmJobHistoryPane
}) => {
  const resetHUDState = usePaneStore((state) => state.resetHUDState);
  const activePaneId = usePaneStore((state) => state.activePaneId);
  const openWalletPane = usePaneStore((state) => state.openWalletPane); // New action

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10000] flex space-x-1 p-1 bg-background/50 border border-border/30 rounded-md shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <HotbarItem slotNumber={1} onClick={onOpenSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}>
        <Store className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={2} onClick={onOpenDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
        <History className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={3} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
        <Hand className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={4} onClick={resetHUDState} title="Reset HUD Layout">
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={5} onClick={openWalletPane} title="Wallet" isActive={activePaneId === WALLET_PANE_ID}>
        <Wallet className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>

      {/* Adjust empty slots: 9 total slots - 5 used = 4 empty */}
      {Array.from({ length: 4 }).map((_, i) => (
        <HotbarItem key={`empty-slot-${i}`} slotNumber={i + 6} isGhost>
          <span className="w-5 h-5" />
        </HotbarItem>
      ))}
    </div>
  );
};
```

```typescript
// src/types/pane.ts
export type Pane = {
  id: string;
  type: 'default' | 'chat' | 'chats' | 'user' | 'diff' | 'changelog' | 'nip28_channel' | 'nip90_dashboard' | 'sell_compute' | 'dvm_job_history' | 'nip90_dvm_test' | 'nip90_consumer_chat' | 'nip90_global_feed' | 'wallet' | string; // Added 'wallet'
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive?: boolean;
  dismissable?: boolean;
  content?: {
    oldContent?: string;
    newContent?: string;
    channelId?: string;
    channelName?: string;
    [key: string]: unknown;
  };
}

export type PaneInput = Omit<Pane, 'x' | 'y' | 'width' | 'height' | 'id' | 'isActive'> & {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}
```

```typescript
// src/stores/panes/constants.ts
export const DEFAULT_PANE_WIDTH = 400;
export const DEFAULT_PANE_HEIGHT = 300;
export const PANE_MARGIN = 20;
export const PANE_OFFSET = 45;

export const CHATS_PANE_ID = 'chats';
export const CHANGELOG_PANE_ID = 'changelog';

export const DEFAULT_NIP28_CHANNEL_ID = 'ee7352c54c85004d3d994a48d87c488905795f956f88842394eb3c6edc615978';
export const DEFAULT_NIP28_PANE_ID = `nip28-${DEFAULT_NIP28_CHANNEL_ID}`;
export const DEFAULT_NIP28_CHANNEL_TITLE = 'Welcome Chat';
export const WELCOME_CHAT_INITIAL_WIDTH = 350;
export const WELCOME_CHAT_INITIAL_HEIGHT = 250;

export const SELL_COMPUTE_PANE_ID_CONST = 'sell_compute';
export const SELL_COMPUTE_INITIAL_WIDTH = 550;
export const SELL_COMPUTE_INITIAL_HEIGHT = 420;

export const HOTBAR_APPROX_HEIGHT = 60;

export const NIP90_DVM_TEST_PANE_ID = 'nip90_dvm_test';
export const NIP90_DVM_TEST_PANE_TITLE = 'NIP-90 DVM Test';
export const NIP90_CONSUMER_CHAT_PANE_ID = 'nip90_consumer_chat';
export const NIP90_CONSUMER_CHAT_PANE_TITLE = 'NIP-90 Consumer (Text Inference)';

export const NIP90_GLOBAL_FEED_PANE_ID = 'nip90_global_feed';
export const NIP90_GLOBAL_FEED_PANE_TITLE = 'NIP-90 Global Feed';

// Wallet Pane Constants
export const WALLET_PANE_ID = 'wallet_pane';
export const WALLET_PANE_TITLE = 'Bitcoin Wallet';
```

```typescript
// src/stores/panes/actions/openWalletPane.ts
import { type PaneInput } from '@/types/pane';
import { type PaneStoreType, type SetPaneStore } from '../types';
import { addPaneActionLogic } from './addPane';
import { WALLET_PANE_ID, WALLET_PANE_TITLE } from '../constants';

export function openWalletPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const existingPane = state.panes.find(p => p.id === WALLET_PANE_ID);
    if (existingPane) {
      const newPanes = state.panes
        .map(p => ({ ...p, isActive: p.id === WALLET_PANE_ID }))
        .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1)); // Active last for z-index
      return {
        ...state,
        panes: newPanes,
        activePaneId: WALLET_PANE_ID,
        lastPanePosition: {
          x: existingPane.x,
          y: existingPane.y,
          width: existingPane.width,
          height: existingPane.height
        }
      };
    }

    const newPaneInput: PaneInput = {
      id: WALLET_PANE_ID,
      type: 'wallet',
      title: WALLET_PANE_TITLE,
      dismissable: true,
      width: 450, // Default width for wallet pane
      height: 550, // Default height for wallet pane
    };
    const changes = addPaneActionLogic(state, newPaneInput, true); // true for tiling
    return { ...state, ...changes };
  });
}
```

```typescript
// src/stores/panes/actions/index.ts
export * from './addPane';
export * from './removePane';
export * from './updatePanePosition';
export * from './updatePaneSize';
export * from './bringPaneToFront';
export * from './setActivePane';
export * from './openChatPane';
export * from './createNip28ChannelPane';
export * from './openNip90DashboardPane';
export * from './openSellComputePane';
export * from './openDvmJobHistoryPane';
export * from './openNip90DvmTestPane';
export * from './openNip90ConsumerChatPane';
export * from './openNip90GlobalFeedPane';
export * from './openWalletPane'; // Added new action
```

```typescript
// src/stores/panes/types.ts
import { Pane, PaneInput } from '@/types/pane';
import type { StoreApi } from 'zustand';

export interface PaneState {
  panes: Pane[];
  activePaneId: string | null;
  lastPanePosition: { x: number; y: number; width: number; height: number } | null;
}

export interface PaneStoreType extends PaneState {
  addPane: (newPane: PaneInput, shouldTile?: boolean) => void;
  removePane: (id: string) => void;
  updatePanePosition: (id: string, x: number, y: number) => void;
  updatePaneSize: (id: string, width: number, height: number) => void;
  openChatPane: (newPane: PaneInput, isCommandKeyHeld?: boolean) => void;
  bringPaneToFront: (id: string) => void;
  setActivePane: (id: string | null) => void;
  createNip28ChannelPane: (channelName?: string) => void;
  openNip90DashboardPane: () => void;
  openSellComputePane: () => void;
  openDvmJobHistoryPane: () => void;
  openNip90DvmTestPane: () => void;
  openNip90ConsumerChatPane: () => void;
  openNip90GlobalFeedPane: () => void;
  openWalletPane: () => void; // Added new action type
  resetHUDState: () => void;
}

export type SetPaneStore = StoreApi<PaneStoreType>['setState'];
export type GetPaneStore = () => PaneStoreType;
```

```typescript
// src/stores/pane.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Pane, PaneInput } from "@/types/pane";
import { PaneStoreType, PaneState } from "./panes/types";
import {
  addPaneAction,
  removePaneAction,
  updatePanePositionAction,
  updatePaneSizeAction,
  openChatPaneAction,
  bringPaneToFrontAction,
  setActivePaneAction,
  createNip28ChannelPaneAction,
  openNip90DashboardPaneAction,
  openSellComputePaneAction,
  openDvmJobHistoryPaneAction,
  openNip90DvmTestPaneAction,
  openNip90ConsumerChatPaneAction,
  openNip90GlobalFeedPaneAction,
  openWalletPaneAction, // Added import for new action
} from "./panes/actions";
import {
  PANE_MARGIN,
  SELL_COMPUTE_PANE_ID_CONST,
  SELL_COMPUTE_INITIAL_WIDTH,
  SELL_COMPUTE_INITIAL_HEIGHT,
} from "./panes/constants";

const getInitialPanes = (): Pane[] => {
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  return [{
    id: SELL_COMPUTE_PANE_ID_CONST,
    type: 'sell_compute',
    title: 'Sell Compute Power',
    x: Math.max(PANE_MARGIN, (screenWidth - SELL_COMPUTE_INITIAL_WIDTH) / 2),
    y: Math.max(PANE_MARGIN, (screenHeight - SELL_COMPUTE_INITIAL_HEIGHT) / 3),
    width: SELL_COMPUTE_INITIAL_WIDTH,
    height: SELL_COMPUTE_INITIAL_HEIGHT,
    isActive: true,
    dismissable: true,
    content: {},
  }];
};

const initialState: PaneState = {
  panes: getInitialPanes(),
  activePaneId: SELL_COMPUTE_PANE_ID_CONST,
  lastPanePosition: null,
};

const sellComputePaneInitial = initialState.panes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);
if (sellComputePaneInitial) {
    initialState.lastPanePosition = {
        x: sellComputePaneInitial.x,
        y: sellComputePaneInitial.y,
        width: sellComputePaneInitial.width,
        height: sellComputePaneInitial.height
    };
}

export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      ...initialState,
      addPane: (newPaneInput: PaneInput, shouldTile?: boolean) => addPaneAction(set, newPaneInput, shouldTile),
      removePane: (id: string) => removePaneAction(set, id),
      updatePanePosition: (id: string, x: number, y: number) => updatePanePositionAction(set, id, x, y),
      updatePaneSize: (id: string, width: number, height: number) => updatePaneSizeAction(set, id, width, height),
      openChatPane: (newPaneInput: PaneInput, isCommandKeyHeld?: boolean) => openChatPaneAction(set, newPaneInput, isCommandKeyHeld),
      bringPaneToFront: (id: string) => bringPaneToFrontAction(set, id),
      setActivePane: (id: string | null) => setActivePaneAction(set, id),
      createNip28ChannelPane: (channelName?: string) => createNip28ChannelPaneAction(set, get, channelName),
      openNip90DashboardPane: () => openNip90DashboardPaneAction(set),
      openSellComputePane: () => openSellComputePaneAction(set),
      openDvmJobHistoryPane: () => openDvmJobHistoryPaneAction(set),
      openNip90DvmTestPane: () => openNip90DvmTestPaneAction(set),
      openNip90ConsumerChatPane: () => openNip90ConsumerChatPaneAction(set),
      openNip90GlobalFeedPane: () => openNip90GlobalFeedPaneAction(set),
      openWalletPane: () => openWalletPaneAction(set), // Added new action
      resetHUDState: () => {
        const newInitialState: PaneState = {
            panes: getInitialPanes(),
            activePaneId: SELL_COMPUTE_PANE_ID_CONST,
            lastPanePosition: null,
        };
        const newSellComputePane = newInitialState.panes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);
        if (newSellComputePane) {
            set({
                ...newInitialState,
                lastPanePosition: {
                    x: newSellComputePane.x,
                    y: newSellComputePane.y,
                    width: newSellComputePane.width,
                    height: newSellComputePane.height
                }
            });
        } else {
            set(newInitialState);
        }
      },
    }),
    {
      name: 'commander-pane-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        panes: state.panes,
        lastPanePosition: state.lastPanePosition,
        activePaneId: state.activePaneId,
      }),
      merge: (persistedState, currentState) => {
        const defaultInitialPanes = getInitialPanes();
        const defaultActiveId = SELL_COMPUTE_PANE_ID_CONST;
        const defaultSellComputePane = defaultInitialPanes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);
        return {
          ...currentState,
          panes: defaultInitialPanes,
          activePaneId: defaultActiveId,
          lastPanePosition: defaultSellComputePane ? {
            x: defaultSellComputePane.x,
            y: defaultSellComputePane.y,
            width: defaultSellComputePane.width,
            height: defaultSellComputePane.height
          } : null
        };
      },
    }
  )
);
```

```typescript
// src/components/hud/BitcoinBalanceDisplay.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Effect, Exit, Cause } from 'effect';
import { SparkService, type BalanceInfo } from '@/services/spark';
import { getMainRuntime } from '@/services/runtime';
import { usePaneStore } from '@/stores/pane'; // Import usePaneStore
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

const BitcoinBalanceDisplay: React.FC = () => {
  const runtime = getMainRuntime();
  const openWalletPane = usePaneStore((state) => state.openWalletPane); // Get the new action

  const { data: balanceData, isLoading, error, refetch, isFetching } = useQuery<BalanceInfo, Error>({
    queryKey: ['bitcoinBalance'], // Re-using key from previous version
    queryFn: async () => {
      const program = Effect.flatMap(SparkService, s => s.getBalance());
      const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
      if (Exit.isSuccess(exitResult)) {
        return exitResult.value;
      }
      throw Cause.squash(exitResult.cause);
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  const handleDisplayClick = () => {
    openWalletPane(); // Open the Wallet Pane
  };

  let displayContent;
  if (isLoading && !balanceData) {
    displayContent = <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading...</>;
  } else if (error) {
    displayContent = <><AlertTriangle className="h-3 w-3 mr-1 text-destructive" /> Error</>;
  } else if (balanceData) {
    displayContent = `${balanceData.balance.toString()}`;
  } else {
    displayContent = <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Initializing...</>;
  }

  return (
    <div
      onClick={handleDisplayClick}
      title="Open Wallet" // Updated title
      className="fixed top-4 right-4 z-[10000] p-2 h-8 flex items-center bg-background/70 border border-border/30 rounded-md shadow-lg backdrop-blur-sm text-xs font-mono text-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <span className="text-yellow-500 mr-1.5 font-bold">₿</span>
      {displayContent}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => { e.stopPropagation(); refetch(); }}
        disabled={isFetching || isLoading}
        className="ml-1.5 h-5 w-5 p-0"
        title="Refresh Balance"
      >
        {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
      </Button>
    </div>
  );
};

export default BitcoinBalanceDisplay;
```

```typescript
// src/components/wallet/WalletPane.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import QRCode from 'qrcode.react';
import { Effect, Exit, Cause } from 'effect';
import { SparkService, type BalanceInfo, type LightningInvoice, type LightningPayment, type CreateLightningInvoiceParams, type PayLightningInvoiceParams } from '@/services/spark';
import { getMainRuntime } from '@/services/runtime';
import { TelemetryService } from '@/services/telemetry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription, CardFooter as not directly used
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { Bitcoin, Zap, ArrowDownToLine, Send, Copy, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/tailwind';

const WalletPane: React.FC = () => {
  const runtime = getMainRuntime();
  const [activeTab, setActiveTab] = useState("balance");

  // --- Balance State ---
  const { data: balanceData, isLoading: isLoadingBalance, error: balanceError, refetch: refetchBalance } = useQuery<BalanceInfo, Error>({
    queryKey: ['walletPaneBitcoinBalance'],
    queryFn: async () => {
      const program = Effect.flatMap(SparkService, s => s.getBalance());
      const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
    refetchInterval: 60000,
  });

  // --- Lightning Invoice Generation State ---
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceMemo, setInvoiceMemo] = useState('');
  const [generatedInvoice, setGeneratedInvoice] = useState<LightningInvoice | null>(null);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  const generateInvoiceMutation = useMutation<LightningInvoice, Error, CreateLightningInvoiceParams>({
    mutationFn: async (params) => {
      const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(params));
      const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
    onSuccess: (data) => {
      setGeneratedInvoice(data);
      Effect.runFork(Effect.provide(
        Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "generate_invoice_success" })),
        runtime
      ));
    },
    onError: (error) => Effect.runFork(Effect.provide(
      Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "generate_invoice_failure", label: error.message })),
      runtime
    ))
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
  const [paymentInvoiceInput, setPaymentInvoiceInput] = useState(''); // Renamed to avoid conflict
  const [paymentResult, setPaymentResult] = useState<LightningPayment | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const payInvoiceMutation = useMutation<LightningPayment, Error, PayLightningInvoiceParams>({
    mutationFn: async (params) => {
      const program = Effect.flatMap(SparkService, s => s.payLightningInvoice(params));
      const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
    onSuccess: (data) => {
      setPaymentResult(data);
      setPaymentError(null);
      Effect.runFork(Effect.provide(
        Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "pay_invoice_success", label: data.payment.status })),
        runtime
      ));
      refetchBalance();
      setPaymentInvoiceInput(''); // Clear input on success
    },
    onError: (error) => {
      setPaymentError(error.message);
      setPaymentResult(null);
      Effect.runFork(Effect.provide(
        Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "pay_invoice_failure", label: error.message })),
        runtime
      ));
    }
  });

  const handlePayInvoice = () => {
    if (!paymentInvoiceInput.trim()) {
      alert("Please enter a Lightning invoice.");
      return;
    }
    setPaymentResult(null); setPaymentError(null); // Clear previous results
    payInvoiceMutation.mutate({ invoice: paymentInvoiceInput.trim(), maxFeeSats: 100 }); // Default max fee
  };

  // --- Receive Bitcoin (Spark Address) State ---
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const generateAddressMutation = useMutation<string, Error>({
    mutationFn: async () => {
      const program = Effect.flatMap(SparkService, s => s.getSingleUseDepositAddress());
      const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
    onSuccess: (data) => {
      setDepositAddress(data);
      Effect.runFork(Effect.provide(
        Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "generate_deposit_address_success" })),
        runtime
      ));
    },
    onError: (error) => Effect.runFork(Effect.provide(
      Effect.flatMap(TelemetryService, ts => ts.trackEvent({ category: "wallet", action: "generate_deposit_address_failure", label: error.message })),
      runtime
    ))
  });

  const handleCopyToClipboard = (text: string, type: 'invoice' | 'address') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'invoice') setCopiedInvoice(true);
      if (type === 'address') setCopiedAddress(true);
      setTimeout(() => {
        if (type === 'invoice') setCopiedInvoice(false);
        if (type === 'address') setCopiedAddress(false);
      }, 2000);
    }).catch(err => console.error("Failed to copy:", err));
  };

  useEffect(() => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, ts => ts.trackEvent({
          category: 'ui:pane',
          action: 'open_wallet_pane'
      })).pipe(Effect.provide(runtime))
    );
  }, [runtime]);

  return (
    <div className="p-1 h-full flex flex-col text-sm">
      <Card className="flex-grow flex flex-col border-0 shadow-none bg-transparent">
        <CardHeader className="p-2 pt-0 pb-1 text-center">
          <CardTitle className="text-base flex items-center justify-center">
            <Bitcoin className="w-4 h-4 mr-2 text-yellow-500" /> Commander Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="p-1 flex-grow overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-1 h-8">
              <TabsTrigger value="balance" className="text-xs h-6">Balance</TabsTrigger>
              <TabsTrigger value="lightning" className="text-xs h-6">Lightning</TabsTrigger>
              <TabsTrigger value="onchain" className="text-xs h-6">On-Chain</TabsTrigger>
            </TabsList>

            <TabsContent value="balance" className="flex-grow overflow-hidden p-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-4 text-center">
                  <h3 className="text-sm font-semibold">Current Balance</h3>
                  {isLoadingBalance && <div className="text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-1" />Loading...</div>}
                  {balanceError && <div className="text-destructive"><AlertTriangle className="inline h-4 w-4 mr-1" />{balanceError.message}</div>}
                  {balanceData && <p className="text-3xl font-bold text-yellow-400">{balanceData.balance.toString()} <span className="text-xl">sats</span></p>}
                  <Button onClick={() => refetchBalance()} variant="outline" size="sm" className="w-full max-w-xs mx-auto mt-2">
                    <RefreshCw className="h-3 w-3 mr-1.5" /> Refresh Balance
                  </Button>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="lightning" className="flex-grow overflow-hidden p-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-3">
                  <Card className="bg-background/60">
                    <CardHeader className="p-2 pb-1"><CardTitle className="text-xs font-semibold flex items-center"><Zap className="h-3 w-3 mr-1.5 text-yellow-500"/>Receive via Lightning</CardTitle></CardHeader>
                    <CardContent className="p-2 space-y-2">
                      <div><Label htmlFor="invoiceAmountLn" className="text-xs">Amount (sats)</Label><Input id="invoiceAmountLn" type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="e.g., 1000" className="h-7 text-xs" /></div>
                      <div><Label htmlFor="invoiceMemoLn" className="text-xs">Memo (optional)</Label><Input id="invoiceMemoLn" value={invoiceMemo} onChange={(e) => setInvoiceMemo(e.target.value)} placeholder="e.g., For services" className="h-7 text-xs" /></div>
                      <Button onClick={handleGenerateInvoice} disabled={generateInvoiceMutation.isPending} size="sm" className="w-full text-xs h-7">
                        {generateInvoiceMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : <Zap className="h-3 w-3 mr-1.5"/>}Generate Invoice
                      </Button>
                      {generateInvoiceMutation.isError && <p className="text-xs text-destructive mt-1">Error: {generateInvoiceMutation.error.message}</p>}
                      {generatedInvoice && (
                        <div className="mt-2 space-y-1 p-2 border border-dashed border-primary/50 rounded-md bg-primary/10">
                          <div className="flex justify-center my-1"><QRCode value={generatedInvoice.invoice.encodedInvoice} size={112} level="M" bgColor="var(--background)" fgColor="var(--foreground)"/></div>
                          <Textarea value={generatedInvoice.invoice.encodedInvoice} readOnly rows={3} className="text-[9px] h-auto font-mono bg-background/70" />
                          <Button onClick={() => handleCopyToClipboard(generatedInvoice.invoice.encodedInvoice, 'invoice')} size="xs" variant="ghost" className="text-xs h-6 w-full">
                            <Copy className="h-3 w-3 mr-1"/>{copiedInvoice ? "Copied!" : "Copy Invoice"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="bg-background/60">
                    <CardHeader className="p-2 pb-1"><CardTitle className="text-xs font-semibold flex items-center"><Send className="h-3 w-3 mr-1.5"/>Send via Lightning</CardTitle></CardHeader>
                    <CardContent className="p-2 space-y-2">
                      <div><Label htmlFor="paymentInvoiceLn" className="text-xs">BOLT11 Invoice</Label><Textarea id="paymentInvoiceLn" value={paymentInvoiceInput} onChange={(e) => setPaymentInvoiceInput(e.target.value)} placeholder="lnbc..." rows={3} className="text-xs h-auto font-mono" /></div>
                      <Button onClick={handlePayInvoice} disabled={payInvoiceMutation.isPending} size="sm" className="w-full text-xs h-7">
                         {payInvoiceMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : <Send className="h-3 w-3 mr-1.5"/>}Pay Invoice
                      </Button>
                      {paymentError && <p className="text-xs text-destructive mt-1"><AlertTriangle className="inline h-3 w-3 mr-1"/>{paymentError}</p>}
                      {paymentResult && (
                        <div className={cn("mt-2 text-xs p-2 rounded-md border border-dashed", paymentResult.payment.status === 'SUCCESS' ? "text-green-400 border-green-500/50 bg-green-500/10" : "text-orange-400 border-orange-500/50 bg-orange-500/10")}>
                          <p className="font-semibold flex items-center"> {paymentResult.payment.status === 'SUCCESS' ? <CheckCircle2 className="h-3 w-3 mr-1"/> : <AlertTriangle className="h-3 w-3 mr-1"/>}Payment Status: {paymentResult.payment.status}</p>
                          <p className="truncate">ID: {paymentResult.payment.id}</p>
                          {paymentResult.payment.feeSats > 0 && <p>Fee: {paymentResult.payment.feeSats} sats</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="onchain" className="flex-grow overflow-hidden p-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-3">
                  <Card className="bg-background/60">
                    <CardHeader className="p-2 pb-1"><CardTitle className="text-xs font-semibold flex items-center"><ArrowDownToLine className="h-3 w-3 mr-1.5"/>Receive Bitcoin (On-Chain)</CardTitle></CardHeader>
                    <CardContent className="p-2 space-y-2">
                      <Button onClick={() => generateAddressMutation.mutate()} disabled={generateAddressMutation.isPending} size="sm" className="w-full text-xs h-7">
                        {generateAddressMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : null}Generate Deposit Address
                      </Button>
                      {generateAddressMutation.isError && <p className="text-xs text-destructive mt-1"><AlertTriangle className="inline h-3 w-3 mr-1"/>Error: {generateAddressMutation.error.message}</p>}
                      {depositAddress && (
                        <div className="mt-2 space-y-1 p-2 border border-dashed border-primary/50 rounded-md bg-primary/10">
                          <div className="flex justify-center my-1"><QRCode value={depositAddress} size={112} level="M" bgColor="var(--background)" fgColor="var(--foreground)"/></div>
                          <Textarea value={depositAddress} readOnly rows={2} className="text-[9px] h-auto font-mono bg-background/70" />
                          <Button onClick={() => handleCopyToClipboard(depositAddress, 'address')} size="xs" variant="ghost" className="text-xs h-6 w-full">
                            <Copy className="h-3 w-3 mr-1"/>{copiedAddress ? "Copied!" : "Copy Address"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="bg-background/60 opacity-60">
                    <CardHeader className="p-2 pb-1"><CardTitle className="text-xs font-semibold flex items-center"><Send className="h-3 w-3 mr-1.5"/>Send Bitcoin (On-Chain)</CardTitle></CardHeader>
                    <CardContent className="p-2 space-y-2">
                      <p className="text-xs text-muted-foreground text-center py-4">On-chain sending requires SparkService extension. (Placeholder)</p>
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
```

```typescript
// src/components/wallet/index.ts
export { default as WalletPane } from './WalletPane';
```

```typescript
// src/panes/PaneManager.tsx
import React from 'react';
import { usePaneStore } from '@/stores/pane';
import { Pane as PaneComponent } from '@/panes/Pane';
import { Pane as PaneType } from '@/types/pane';
import { Nip28ChannelChat } from '@/components/nip28';
import { Nip90Dashboard } from '@/components/nip90';
import { SellComputePane } from '@/components/sell-compute';
import { DvmJobHistoryPane } from '@/components/dvm';
import { Nip90DvmTestPane } from '@/components/nip90_dvm_test';
import { Nip90ConsumerChatPane } from '@/components/nip90_consumer_chat';
import { Nip90GlobalFeedPane } from '@/components/nip90_feed';
import { WalletPane } from '@/components/wallet'; // Added import

const PlaceholderChatComponent = ({ threadId }: { threadId?: string }) => <div className="p-2">Chat Pane Content {threadId && `for ${threadId}`}</div>;
const PlaceholderChatsPaneComponent = () => <div className="p-2">Chats List Pane Content</div>;
const PlaceholderChangelogComponent = () => <div className="p-2">Changelog Pane Content</div>;
const PlaceholderDiffComponent = ({ oldContent, newContent }: { oldContent?: string, newContent?: string }) => (
  <div className="p-2">
    <h3>Old Content:</h3><pre className="bg-muted p-1 rounded text-xs">{oldContent || "N/A"}</pre>
    <h3>New Content:</h3><pre className="bg-muted p-1 rounded text-xs">{newContent || "N/A"}</pre>
  </div>
);
const PlaceholderUserStatusComponent = () => <div className="p-2">User Status Pane Content</div>;
const PlaceholderDefaultComponent = ({ type }: { type: string }) => <div className="p-2">Default Content for Pane Type: {type}</div>;


export const PaneManager = () => {
  const { panes, activePaneId } = usePaneStore();
  const baseZIndex = 10;

  return (
    <>
      {panes.map((pane: PaneType, index: number) => (
        <PaneComponent
          key={pane.id}
          title={pane.title}
          id={pane.id}
          x={pane.x}
          y={pane.y}
          height={pane.height}
          width={pane.width}
          type={pane.type}
          isActive={pane.id === activePaneId}
          style={{ zIndex: baseZIndex + index }}
          dismissable={pane.dismissable !== false}
          content={pane.content}
        >
          {pane.type === 'chat' && <PlaceholderChatComponent threadId={pane.id.replace(/^chat-|^nip28-/, '')} />}
          {pane.type === 'chats' && <PlaceholderChatsPaneComponent />}
          {pane.type === 'changelog' && <PlaceholderChangelogComponent />}
          {pane.type === 'user' && <PlaceholderUserStatusComponent />}
          {pane.type === 'diff' && pane.content && (
            <PlaceholderDiffComponent oldContent={pane.content.oldContent} newContent={pane.content.newContent} />
          )}
          {pane.type === 'nip28_channel' && pane.content?.channelId && (
            <Nip28ChannelChat
              channelId={pane.content.channelId}
              channelName={pane.content.channelName || pane.title}
            />
          )}
          {pane.type === 'nip90_dashboard' && <Nip90Dashboard />}
          {pane.type === 'sell_compute' && <SellComputePane />}
          {pane.type === 'dvm_job_history' && <DvmJobHistoryPane />}
          {pane.type === 'nip90_dvm_test' && <Nip90DvmTestPane />}
          {pane.type === 'nip90_consumer_chat' && <Nip90ConsumerChatPane />}
          {pane.type === 'nip90_global_feed' && <Nip90GlobalFeedPane />}
          {pane.type === 'wallet' && <WalletPane />}
          {pane.type === 'default' && <PlaceholderDefaultComponent type={pane.type} />}
          {!(
            pane.type === 'chat' || pane.type === 'chats' || pane.type === 'changelog' ||
            pane.type === 'user' || pane.type === 'diff' || pane.type === 'nip28_channel' ||
            pane.type === 'nip90_dashboard' || pane.type === 'sell_compute' ||
            pane.type === 'dvm_job_history' || pane.type === 'nip90_dvm_test' ||
            pane.type === 'nip90_consumer_chat' || pane.type === 'nip90_global_feed' ||
            pane.type === 'wallet' || pane.type === 'default'
          ) && <PlaceholderDefaultComponent type={pane.type} />}
        </PaneComponent>
      ))}
    </>
  );
};
```

I've added `qrcode.react` to `package.json` dependencies and devDependencies for types.
The Hotbar now includes a Wallet icon.
The `BitcoinBalanceDisplay` component now triggers the `openWalletPane` action.
Store logic for `wallet` pane type and `openWalletPaneAction` is implemented.
The `WalletPane.tsx` component is created with UI for:
- Balance display (using `React Query` and `SparkService.getBalance`).
- Lightning invoice generation (form, QR code, copy button, using `SparkService.createLightningInvoice`).
- Lightning invoice payment (form, using `SparkService.payLightningInvoice`).
- On-chain Bitcoin receiving (button to generate address, QR code, copy button, using `SparkService.getSingleUseDepositAddress`).
- Placeholder UI for on-chain Bitcoin sending.
The `WalletPane` is integrated into `PaneManager.tsx`.
All new UI elements are styled with Shadcn components and Tailwind CSS, adhering to the dark theme.
Telemetry calls have been added for key wallet actions.The implementation of the Spark Wallet Pane is complete and follows the instructions.

**Summary of Changes:**

1.  **Dependency Added:** `qrcode.react` and `@types/qrcode.react` have been added to `package.json`.
2.  **Hotbar Updated (`src/components/hud/Hotbar.tsx`):**
    *   A new "Wallet" icon (using `lucide-react`'s `Wallet` icon) has been added to Slot 5.
    *   This item calls the `openWalletPane` action from `usePaneStore` and updates its active state based on `WALLET_PANE_ID`.
3.  **Store Logic for Wallet Pane:**
    *   **`src/types/pane.ts`:** Added `'wallet'` to `Pane['type']`.
    *   **`src/stores/panes/constants.ts`:** Added `WALLET_PANE_ID` and `WALLET_PANE_TITLE`.
    *   **`src/stores/panes/actions/openWalletPane.ts`:** New action created to add/activate the wallet pane, using `addPaneActionLogic`.
    *   **`src/stores/panes/actions/index.ts`:** Exported `openWalletPaneAction`.
    *   **`src/stores/panes/types.ts`:** Added `openWalletPane` to `PaneStoreType`.
    *   **`src/stores/pane.ts`:** Integrated `openWalletPaneAction`.
4.  **Bitcoin Balance Display Update (`src/components/hud/BitcoinBalanceDisplay.tsx`):**
    *   The `onClick` handler now calls `openWalletPane` instead of `openSellComputePane`.
    *   The `title` prop has been updated to "Open Wallet".
5.  **Wallet Pane UI (`src/components/wallet/WalletPane.tsx`):**
    *   A new component `WalletPane.tsx` has been created.
    *   It uses Shadcn `Tabs` to organize sections: "Balance", "Lightning", and "On-Chain".
    *   **Balance Tab:**
        *   Fetches and displays the Bitcoin balance using `React Query` and `SparkService.getBalance()`.
        *   Includes loading, error states, and a refresh button.
    *   **Lightning Tab:**
        *   **Receive (Generate Invoice):**
            *   Form for amount and memo.
            *   Calls `SparkService.createLightningInvoice()` via `useMutation`.
            *   Displays the generated BOLT11 invoice as text (in a `Textarea`) and as a QR code using `qrcode.react`.
            *   Includes a "Copy Invoice" button.
        *   **Send (Pay Invoice):**
            *   Form for BOLT11 invoice input.
            *   Calls `SparkService.payLightningInvoice()` via `useMutation`.
            *   Displays payment status and error messages.
    *   **On-Chain Tab:**
        *   **Receive:**
            *   Button to call `SparkService.getSingleUseDepositAddress()` via `useMutation`.
            *   Displays the generated Bitcoin address as text and a QR code.
            *   Includes a "Copy Address" button.
        *   **Send:**
            *   Placeholder UI indicating that on-chain sending is not yet implemented in `SparkService`.
    *   Includes loading indicators (`Loader2`), error indicators (`AlertTriangle`), and success indicators (`CheckCircle2`).
    *   Uses helper function `handleCopyToClipboard` for copying text.
    *   Telemetry events are tracked for various wallet actions.
6.  **Wallet Pane Component Index (`src/components/wallet/index.ts`):**
    *   Created to export `WalletPane`.
7.  **Pane Manager Integration (`src/panes/PaneManager.tsx`):**
    *   Imported `WalletPane`.
    *   Added a condition to render `<WalletPane />` when `pane.type === 'wallet'`.

All files have been updated as requested. The new Wallet Pane should provide the core functionalities discussed. On-chain sending remains a placeholder pending `SparkService` extension.
