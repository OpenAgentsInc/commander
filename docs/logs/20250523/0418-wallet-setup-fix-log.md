# Wallet Setup Fix Log - 0418

## Issues
1. Clicking "No wallet" shows balance from test wallet (48 sats)
2. Should open wallet setup screen instead
3. Test wallet data is persisting somehow

## Plan
1. Fix BitcoinBalanceDisplay to open wallet setup when no wallet
2. Clear any persisted wallet data
3. Ensure SparkService doesn't use test wallet when logged out

## Implementation

### Step 1: Fixed BitcoinBalanceDisplay Click Handler
- Added openWalletSetupPane to imports
- Changed click handler to:
  - Open wallet pane if wallet is initialized
  - Open wallet setup pane if no wallet

### Step 2: Reset Wallet Store Persistence
- Changed wallet store key from "commander-wallet-store" to "commander-wallet-store-v2"
- This clears any persisted test wallet data

### Step 3: Clear React Query Cache
- Added useEffect to clear balance cache when wallet not initialized
- Uses queryClient.invalidateQueries and removeQueries
- Ensures no stale balance data shows when logged out

## Result
- Clicking "No wallet" now opens wallet setup screen
- Test wallet balance (48 sats) is cleared
- Fresh start for all users