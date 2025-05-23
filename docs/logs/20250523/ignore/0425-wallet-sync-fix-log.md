# Wallet Sync Fix Log - 0425

## Issue
- Top-right shows "No wallet" correctly
- But opening wallet pane from hotbar shows 48 sats
- Two components are not properly synced despite using same query key

## Root Cause
Both components fetch balance independently. Need to ensure wallet pane also checks wallet initialization state.

## Solution
Make WalletPane check walletIsInitialized and show appropriate UI when no wallet exists.

## Implementation