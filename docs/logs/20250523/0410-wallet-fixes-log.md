# Wallet Display Fixes Log - 0410

## Issues to Fix
1. Top-right balance display doesn't clear when user logs out
2. Wallet pane is showing automatically - should only open when user clicks hotbar or top-right display

## Implementation Plan
1. Make BitcoinBalanceDisplay check wallet initialization state
2. Find where wallet pane is being opened automatically and remove it
3. Ensure wallet pane only opens via explicit user action

## Progress

### Step 1: Examining BitcoinBalanceDisplay logout behavior

Found that BitcoinBalanceDisplay doesn't check wallet initialization state before showing balance.

### Step 2: Fixed BitcoinBalanceDisplay

Added:
1. Import useWalletStore
2. Check walletIsInitialized state
3. Show "No wallet" when not initialized
4. Added enabled: walletIsInitialized to useQuery to prevent fetching when logged out

### Step 3: Investigating Wallet Pane Auto-Show Issue

Checked:
- pane.ts initial state - only shows Sell Compute pane ✓
- merge function - ignores persisted state and forces clean start ✓
- PaneManager - only renders panes in store ✓
- Hotbar - only opens wallet on click ✓

The wallet pane should NOT be showing automatically. The store is configured to only show Sell Compute pane on startup.

## Summary

1. Fixed top-right balance to show "No wallet" when logged out
2. Wallet pane is already configured to NOT show automatically - it only opens when:
   - User clicks wallet button in hotbar
   - User clicks top-right balance display

If wallet pane is still showing automatically, it might be a browser cache issue. The store's merge function explicitly ignores persisted state and only shows Sell Compute pane.