# UI Simplification for "Compute Market" Launch - Implementation Log

## Overview
This log documents the implementation of UI simplifications for the "Compute Market" launch, focusing on the core "GO ONLINE, EARN BITCOIN" workflow by hiding extraneous UI elements and adding a Bitcoin balance display.

## Implementation Steps

### Step 1: Create the Bitcoin Balance Display Component

- Created a new component `src/components/hud/BitcoinBalanceDisplay.tsx`
- The component:
  - Uses TanStack Query to fetch the Bitcoin balance using the SparkService
  - Shows loading states and error indicators
  - Displays the balance in sats with a Bitcoin icon
  - Includes a refresh button to manually update the balance
  - When clicked, it opens the Sell Compute pane
  - Has fixed positioning in the top-right corner
  - Uses Effect.js to call the SparkService
  - Auto-refreshes every 30 seconds

### Step 2: Simplify the Hotbar Component

- Modified `src/components/hud/Hotbar.tsx` to:
  - Remove unnecessary HotbarItems: NIP-28 Channel, NIP-90 Dashboard, Hand Tracking Toggle, etc.
  - Keep only essential items: Sell Compute, DVM Job History, and Reset HUD Layout
  - Reorder them: Sell Compute is now in Slot 1, DVM Job History in Slot 2, Reset HUD in Slot 3
  - Still display 9 total slots with 6 empty slots for visual consistency

### Step 3: Modify Default Pane Configuration

- Updated `src/stores/pane.ts` to:
  - Change `getInitialPanes()` to only return the Sell Compute pane
  - Remove the logic that added the DEFAULT_NIP28_PANE_ID (Welcome Chat) pane
  - Configure the Sell Compute pane as active
  - Update the `initialState` to ensure `activePaneId` is set to the Sell Compute pane
  - Set `lastPanePosition` based on the Sell Compute pane's position
  - Modify the `merge` function to force a clean initial state on each app start, ensuring only the Sell Compute pane is visible regardless of persisted state

### Step 4: Update the HomePage Component

- Modified `src/pages/HomePage.tsx` to:
  - Import and render the new `BitcoinBalanceDisplay` component
  - Keep the `HandTracking` component but ensure it's off by default
  - Keep the necessary properties and functions related to hand tracking
  - Add a comment to indicate that hand tracking is still available but the toggle is removed from the UI

## Results

The changes successfully implement the simplified UI for the "Compute Market" launch:

1. The Hotbar now only shows three active items: "Sell Compute", "DVM Job History", and "Reset HUD", in that order.

2. On startup, only the "Sell Compute Power" pane is open and active.

3. A Bitcoin balance display appears in the top-right corner showing the user's balance from the SparkService.

4. Hand tracking is turned off by default, and all buttons for NIP-28, NIP-90 Dashboard, etc. are hidden from the main interface.

These changes effectively focus the user experience on the core "GO ONLINE, EARN BITCOIN" loop without removing any functionality from the codebase.

## Summary of Files Modified

1. Created new files:
   - `/src/components/hud/BitcoinBalanceDisplay.tsx` - New Bitcoin balance display component

2. Modified existing files:
   - `/src/components/hud/Hotbar.tsx` - Simplified Hotbar to show only essential items
   - `/src/stores/pane.ts` - Modified default pane configuration to show only Sell Compute pane
   - `/src/pages/HomePage.tsx` - Added Bitcoin balance display and defaulted hand tracking to off
   - `/src/components/hud/index.ts` - Updated exports to include BitcoinBalanceDisplay

All code has been implemented according to the requirements, focusing on the "GO ONLINE, EARN BITCOIN" core loop while preserving all existing functionality.