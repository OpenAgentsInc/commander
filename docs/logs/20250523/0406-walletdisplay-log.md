# Wallet Display Synchronization Log - 0406

## Overview
Implementing wallet balance synchronization between Wallet Pane and Wallet HUD with 1-second refresh interval.

## Issues to Fix
1. Wallet balance not synchronized between Wallet Pane and HUD
2. Balance should refresh every 1 second in both locations

## Implementation Plan
1. Update WalletPane.tsx to use unified query key and 1s refresh
2. Update BitcoinBalanceDisplay.tsx to use same query key and 1s refresh
3. Add performance warning comments
4. Test synchronization

## Progress

### Step 1: Examining Current Implementation

Found current implementations:
- WalletPane.tsx: Using queryKey ["walletPaneBitcoinBalance"] with 60s refresh
- BitcoinBalanceDisplay.tsx: Using queryKey ["bitcoinBalance"] with 30s refresh

### Step 2: Updated WalletPane.tsx

Changed:
- queryKey from ["walletPaneBitcoinBalance"] to ["walletBalance"]
- refetchInterval from 60000 to 1000 (1 second)
- Added performance warning comment

### Step 3: Updated BitcoinBalanceDisplay.tsx

Changed:
- queryKey from ["bitcoinBalance"] to ["walletBalance"]
- refetchInterval from 30000 to 1000 (1 second)
- Added performance warning comment

## Summary

Both components now:
1. Use the same React Query key ["walletBalance"] for cache sharing
2. Refresh balance every 1 second
3. Include performance warning comments about aggressive refresh rate

This ensures the balance displayed in the Wallet Pane and HUD are synchronized and update every second. When one component refetches, both will show the same data due to the shared query key.