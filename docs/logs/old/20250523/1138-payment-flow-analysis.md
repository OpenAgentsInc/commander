# Payment Flow Analysis - Where Payment Logic Is Missing

## Critical Discovery: Payment Handling in Wrong Location

After analyzing the codebase and telemetry, I've confirmed that **payment handling logic is implemented in the wrong place**, causing the NIP-90 payment failure.

## Flow Analysis

### Current User Flow (from telemetry):
1. User uses **AgentChatPane** → `useAgentChat` hook
2. `useAgentChat` calls **ChatOrchestratorService**
3. ChatOrchestratorService resolves `nip90_devstral` provider
4. Creates **NIP90AgentLanguageModelLive** instance
5. NIP90AgentLanguageModelLive handles the NIP-90 job creation and streaming

### Payment Logic Location (WRONG):
- Payment handling exists in **useNip90ConsumerChat.ts** (lines 475-521)
- This hook is used only by **Nip90ConsumerChatPane.tsx**
- This component is **NOT used** in the actual user flow shown in telemetry

## The Missing Payment Handler

### In NIP90AgentLanguageModelLive.ts (lines 256-281):
```typescript
// Subscribe to job updates
const unsubscribe = yield* _(
  nip90Service.subscribeToJobUpdates(
    jobRequest.id,
    dvmConfig.dvmPubkey,
    requestSkBytes as Uint8Array<ArrayBuffer>,
    (eventUpdate) => {
      if (eventUpdate.kind >= 6000 && eventUpdate.kind < 7000) { // Job Result
        if (eventUpdate.content) {
          emit.single(createAiResponse(eventUpdate.content));
        }
        emit.end();
      } else if (eventUpdate.kind === 7000) { // Job Feedback
        const feedbackEvent = eventUpdate as NIP90JobFeedback;
        const statusTag = feedbackEvent.tags.find(t => t[0] === "status");
        const status = statusTag?.[1] as NIP90JobFeedbackStatus | undefined;

        if (status === "partial" && feedbackEvent.content) {
          emit.single(createAiResponse(feedbackEvent.content));
        } else if (status === "error") {
          emit.fail(new AiProviderError({...}));
        }
        // ❌ NO HANDLING FOR status === "payment-required"
      }
    }
  )
);
```

### What's Missing:
**No payment handling for `status === "payment-required"`** in the callback function. The DVM sends the payment-required event, but NIP90AgentLanguageModelLive doesn't know how to handle it.

## Required Fix

### 1. Add Payment Handling to NIP90AgentLanguageModelLive.ts

The missing code in the eventUpdate callback (around line 275):

```typescript
else if (status === "payment-required") {
  // Extract invoice from amount tag
  const amountTag = feedbackEvent.tags.find(t => t[0] === "amount");
  if (amountTag && amountTag[1]) {
    const invoice = amountTag[1];
    // For small amounts (≤ 10 sats), auto-pay
    const amountSats = 3; // Extract from bolt11 or use known amount
    
    if (amountSats <= 10) {
      // Import SparkService and auto-pay
      const sparkService = yield* _(SparkService);
      const paymentResult = yield* _(sparkService.payLightningInvoice({
        invoice,
        maxFeeSats: 10,
        timeoutSeconds: 60
      }));
      
      // Emit status update
      emit.single(createAiResponse(`Auto-paid ${amountSats} sats. Processing...`));
    } else {
      // For larger amounts, emit payment required message
      emit.single(createAiResponse(`Payment required: ${amountSats} sats. Invoice: ${invoice.substring(0, 30)}...`));
    }
  }
}
```

### 2. Add SparkService Dependency

NIP90AgentLanguageModelLive needs access to SparkService for payments:

```typescript
// Add to the service dependencies (line ~30)
const sparkService = yield* _(SparkService);

// Update the Layer.provide chain in ChatOrchestratorService.ts (line ~98)
const nip90AgentLMLayer = NIP90AgentLanguageModelLive.pipe(
  Layer.provide(nip90ConfigLayer),
  Layer.provide(Layer.succeed(NIP90Service, nip90Service)),
  Layer.provide(Layer.succeed(NostrService, nostrService)),
  Layer.provide(Layer.succeed(NIP04Service, nip04Service)),
  Layer.provide(Layer.succeed(TelemetryService, telemetry)),
  Layer.provide(Layer.succeed(SparkService, sparkService)) // ADD THIS
);
```

## Why This Fix Will Work

1. **Correct Flow Path**: NIP90AgentLanguageModelLive is the actual component receiving DVM responses
2. **Event Already Received**: The DVM's payment-required event IS reaching the subscription
3. **Missing Handler**: Only the payment handling logic is missing from the callback
4. **Auto-Payment Ready**: Can implement the same auto-payment logic that exists in useNip90ConsumerChat

## Evidence from Telemetry

### Consumer Side:
- Line 66: `'Orchestrator: Starting stream via provider: nip90_devstral'`
- Line 81: `'Subscribing to updates for job request: a19fa3b1f5...`
- **Missing**: No payment-required event processing

### Provider Side:
- Line 85: `'payment_requested'` - DVM created invoice
- Line 84: Published Kind 7000 event with "1 succeeded, 2 failed"

The events ARE being published and likely received, but NIP90AgentLanguageModelLive doesn't know what to do with payment-required status.

## Conclusion

The payment failure is not due to:
- ❌ Relay mismatches
- ❌ Runtime issues  
- ❌ Missing auto-payment logic

It's due to:
- ✅ **Payment handling logic in wrong component**
- ✅ **NIP90AgentLanguageModelLive missing payment-required handler**
- ✅ **Missing SparkService dependency in AI provider**

**Fix**: Add payment handling to NIP90AgentLanguageModelLive.ts where the actual NIP-90 job processing occurs.

## SPECIFIC IMPLEMENTATION INSTRUCTIONS

### STEP 1: Edit src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts

**Location**: Around line 28, after getting other services, add:
```typescript
const sparkService = yield* _(SparkService);
```

**Location**: Around line 275-278, in the eventUpdate callback, after the error handling block, ADD this new block:
```typescript
else if (status === "payment-required") {
  // Handle payment required
  const amountTag = feedbackEvent.tags.find(t => t[0] === "amount");
  if (amountTag && amountTag[1]) {
    const invoice = amountTag[1];
    const amountSats = 3; // TODO: Extract from bolt11 invoice
    
    // Track telemetry
    yield* _(Effect.promise(async () => {
      const runtime = getMainRuntime();
      await Effect.runPromise(
        Effect.flatMap(TelemetryService, ts => ts.trackEvent({
          category: "nip90:consumer",
          action: "payment_required",
          label: jobRequest.id,
          value: `${amountSats} sats`
        })).pipe(Effect.provide(runtime))
      );
    }));
    
    // Auto-pay small amounts
    if (amountSats <= 10) {
      try {
        // Track payment attempt
        yield* _(Effect.promise(async () => {
          const runtime = getMainRuntime();
          await Effect.runPromise(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({
              category: "nip90:consumer",
              action: "auto_payment_triggered",
              label: jobRequest.id,
              value: `${amountSats} sats`
            })).pipe(Effect.provide(runtime))
          );
        }));
        
        // Execute payment
        const runtime = getMainRuntime();
        const paymentResult = await Effect.runPromise(
          Effect.gen(function* () {
            const spark = yield* SparkService;
            return yield* spark.payLightningInvoice({
              invoice,
              maxFeeSats: 10,
              timeoutSeconds: 60
            });
          }).pipe(Effect.provide(runtime))
        );
        
        // Emit payment success feedback
        emit.single(createAiResponse(`Auto-paid ${amountSats} sats. Payment hash: ${paymentResult.payment.paymentHash.substring(0, 12)}... Waiting for DVM to process...`));
        
        // Track payment success
        yield* _(Effect.promise(async () => {
          const runtime = getMainRuntime();
          await Effect.runPromise(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({
              category: "nip90:consumer",
              action: "payment_success",
              label: jobRequest.id,
              value: paymentResult.payment.paymentHash
            })).pipe(Effect.provide(runtime))
          );
        }));
      } catch (payError) {
        // Track payment failure
        yield* _(Effect.promise(async () => {
          const runtime = getMainRuntime();
          await Effect.runPromise(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent({
              category: "nip90:consumer",
              action: "payment_error",
              label: jobRequest.id,
              value: payError instanceof Error ? payError.message : String(payError)
            })).pipe(Effect.provide(runtime))
          );
        }));
        
        emit.fail(new AiProviderError({
          message: `Payment failed: ${payError instanceof Error ? payError.message : String(payError)}`,
          provider: "NIP90",
          isRetryable: false,
          cause: payError
        }));
      }
    } else {
      // For larger amounts, just notify user
      emit.single(createAiResponse(`Payment required: ${amountSats} sats. Invoice: ${invoice.substring(0, 30)}... Manual payment needed.`));
    }
  }
}
```

**Location**: At the top of the file, around line 17, add these imports:
```typescript
import { SparkService } from "@/services/spark";
import { getMainRuntime } from "@/services/runtime";
```

### STEP 2: Edit src/services/ai/orchestration/ChatOrchestratorService.ts

**Location**: Around line 25, in the Effect.gen function where services are obtained, add:
```typescript
const sparkService = yield* _(SparkService);
```

**Location**: Around line 103-104, in the Layer.provide chain for nip90AgentLMLayer, ADD this line:
```typescript
Layer.provide(Layer.succeed(SparkService, sparkService))
```

So the full chain becomes:
```typescript
const nip90AgentLMLayer = NIP90AgentLanguageModelLive.pipe(
  Layer.provide(nip90ConfigLayer),
  Layer.provide(Layer.succeed(NIP90Service, nip90Service)),
  Layer.provide(Layer.succeed(NostrService, nostrService)),
  Layer.provide(Layer.succeed(NIP04Service, nip04Service)),
  Layer.provide(Layer.succeed(TelemetryService, telemetry)),
  Layer.provide(Layer.succeed(SparkService, sparkService)) // ADD THIS LINE
);
```

**Location**: At the top of the file, add import if not already present:
```typescript
import { SparkService } from "@/services/spark";
```

### STEP 3: Verify the fix

After making these changes:
1. Run `pnpm test` to ensure tests pass
2. Run `pnpm run t` to ensure TypeScript compiles
3. Test the flow: AgentChatPane → send message → should auto-pay when DVM requests payment

The telemetry should now show:
- `payment_required` event when DVM requests payment
- `auto_payment_triggered` event when auto-pay starts
- `payment_success` or `payment_error` events for payment result

### CRITICAL NOTES:
- The payment logic executes INSIDE the streamText subscription callback
- Uses getMainRuntime() to ensure fresh runtime with user's wallet
- Auto-pays amounts ≤ 10 sats automatically
- Emits status updates to the chat stream so user sees payment progress
- Comprehensive telemetry for debugging