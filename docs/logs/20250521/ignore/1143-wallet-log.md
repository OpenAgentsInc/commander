# 1143-wallet-log.md - Implementing Spark Wallet Pane

## Overview
This log tracks the implementation of a full Bitcoin wallet pane in the Commander app with features for:
- Viewing Bitcoin balance 
- Generating and receiving Lightning invoices
- Paying Lightning invoices
- Receiving on-chain Bitcoin
- Placeholder UI for sending on-chain Bitcoin (pending SparkService extension)

## Initial Analysis and Plan
The instructions require:
1. Adding QR code library
2. Integrating a wallet icon in the Hotbar
3. Updating BitcoinBalanceDisplay to open the wallet pane
4. Creating wallet pane store logic 
5. Building the wallet pane UI component with multiple tabs
6. Integrating with PaneManager

## Implementation Steps

### 1. Adding QR Code Library
First, let's add the QR code library for invoice and address display:

```bash
pnpm add qrcode.react
pnpm add -D @types/qrcode.react
```

### 2. Updating Store Logic
Next, I'll implement all required store logic for the wallet pane:
- Add 'wallet' to Pane type union
- Create constants for wallet pane ID and title
- Implement openWalletPane action
- Update store types and exports
- Update main pane store

### 3. Updating BitcoinBalanceDisplay
I'll modify the BitcoinBalanceDisplay component to open the wallet pane instead of the sell compute pane.

### 4. Creating Wallet Pane Component
I'll create the WalletPane component with:
- Balance display tab
- Lightning tab (receive and pay)
- On-chain tab (receive and placeholder for send)
- Full error handling and loading states
- QR code rendering for invoices and addresses

### 5. Updating Hotbar
I'll add a wallet icon to the Hotbar component that opens the wallet pane.

### 6. Integrating with PaneManager
Finally, I'll update the PaneManager to render the wallet pane when type is 'wallet'.

## Progress

### Completed Implementations

1. **QR Code Library Added**
   - Added `qrcode.react` for rendering QR codes for invoices and addresses
   - Added `@types/qrcode.react` for TypeScript type definitions

2. **Wallet Pane Type and Constants Added**
   - Updated `src/types/pane.ts` to include 'wallet' type
   - Added constants in `src/stores/panes/constants.ts` for the wallet pane

3. **Store Logic Implemented**
   - Created `src/stores/panes/actions/openWalletPane.ts` 
   - Updated `src/stores/panes/actions/index.ts` to export the new action
   - Added `openWalletPane` to the `PaneStoreType` interface
   - Updated the main pane store to include the wallet action

4. **BitcoinBalanceDisplay Updated**
   - Modified to use `openWalletPane` instead of `openSellComputePane`
   - Updated the tooltip title to "Open Wallet"

5. **Hotbar Component Updated**
   - Added Wallet icon to slot 5 in the Hotbar
   - Connected it to the `openWalletPane` action
   - Updated the empty slots array

6. **Wallet Pane UI Created**
   - Created `src/components/wallet/WalletPane.tsx` with tabs for:
     - Balance: Display and refresh current Bitcoin balance
     - Lightning: Create invoices and pay invoices
     - On-Chain: Generate deposit addresses (sending is a placeholder)
   - Added QR code rendering for invoices and addresses
   - Implemented copy-to-clipboard functionality
   - Added telemetry events for wallet actions

7. **Integrated with PaneManager**
   - Updated `PaneManager.tsx` to render the wallet pane

### TypeScript Fixes
- Added Shadcn UI tabs component with `pnpm dlx shadcn@latest add tabs`
- Fixed QRCode component by importing `QRCodeSVG` instead of `QRCode`
- Fixed button size types by changing `xs` to `sm`

## Conclusion

The wallet pane implementation is complete and includes:

1. A balance tab that displays the current Bitcoin balance with a refresh button
2. A Lightning tab with:
   - Invoice generation form with amount and memo fields
   - QR code display for generated invoices with copy functionality
   - Lightning invoice payment form with success/failure handling

3. An On-Chain tab with:
   - Functionality to generate and display a Bitcoin deposit address with QR code
   - Placeholder for on-chain sending (requires SparkService extension)

The wallet pane is accessible via:
- A Bitcoin balance display in the top-right corner
- A Wallet icon in the Hotbar (slot 5)

This implementation leverages existing functionalities from SparkService: getBalance, createLightningInvoice, payLightningInvoice, and getSingleUseDepositAddress.