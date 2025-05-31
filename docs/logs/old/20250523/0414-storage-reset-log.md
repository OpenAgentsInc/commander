# Storage Reset Log - 0414

## Issue
Wallet setup pane (non-dismissable) is showing on page refresh despite the merge function that should only show Sell Compute pane.

## Solution
Need to change the storage key to force a clean slate for all users.

## Implementation

### Step 1: Changed Storage Key
Changed pane storage key from "commander-pane-storage-v2" to "commander-pane-storage-v3" to force a clean slate.

### Step 2: Found Root Cause
App.tsx was calling `checkWalletSetupNeeded()` on startup which automatically opens wallet setup pane if wallet is not initialized.

### Step 3: Disabled Automatic Wallet Setup
Commented out the useEffect that calls checkWalletSetupNeeded(). Users should explicitly choose to set up their wallet, not be forced into it.

## Result
- Storage key changed to v3 (clears all persisted panes)
- Automatic wallet setup disabled
- Only Sell Compute pane will show on startup
- Users can set up wallet when they're ready via wallet button