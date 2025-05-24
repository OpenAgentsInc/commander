# Payment Fix Implementation Log #11

## Issue
Consumer subscription using `subscribeMany()` is not receiving events - callbacks never fire, no EOSE received.

## Root Cause
The `subscribeMany()` API with our callback structure isn't working properly. NostrServiceImpl uses `subscribe()` successfully with single filters.

## Solution
Switch from `subscribeMany()` to separate `subscribe()` calls for each filter, matching the working NostrServiceImpl pattern.

## Implementation Steps

### Step 1: Replace subscribeMany with separate subscribe calls
- Removed `subscribeMany()` call that wasn't triggering callbacks
- Created two separate `subscribe()` calls following NostrServiceImpl pattern
- One subscription for result events (kind 6xxx) 
- One subscription for feedback events (kind 7000)

### Step 2: Create shared event handler
- Extracted event handling logic into `handleEvent` function
- Shared between both subscriptions to avoid code duplication
- Maintained all existing payment logic with invoice position fix

### Step 3: Update subscription management
- Store subscriptions with suffixed keys: `jobId_result` and `jobId_feedback` 
- Updated cleanup logic to handle both subscriptions
- Fixed cleanup to use `.close()` instead of `.unsub()`

### Step 4: Enhanced telemetry
- Added subscription type to EOSE logging for better debugging
- Maintained "job_update_received" logging to track when events arrive

## Code Changes

1. **Subscription Creation**: Changed from single `subscribeMany()` to two `subscribe()` calls
2. **Event Handler**: Extracted shared `handleEvent` function
3. **Cleanup**: Updated to handle multiple subscriptions per job
4. **API Methods**: Used `subscribe()` and `.close()` consistently

This approach mirrors the working NostrServiceImpl pattern and should resolve the callback registration issue.

## Expected Results

With these changes, the consumer should:
1. Successfully receive EOSE events (logging "subscription_eose")
2. Receive payment-required events from the provider
3. Log "job_update_received" when events arrive
4. Properly extract invoice from `amountTag[2]` 
5. Auto-pay small invoices as intended

The key insight was that `subscribeMany()` wasn't calling our callbacks, while the `subscribe()` pattern used in NostrServiceImpl works reliably.

## Status
✅ Implementation complete - ready for testing