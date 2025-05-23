# Fix: Effect Runtime Stale References in React Components

## Problem
React components and hooks that capture Effect runtime references at mount time continue using outdated runtime instances after `reinitializeRuntime()` is called. This causes service operations to use stale services (e.g., mock services instead of real ones).

### Error Symptoms
- Operations succeed but use wrong service implementations
- Payments appear to succeed but use mock wallet instead of user's wallet
- No TypeScript errors - purely a runtime behavior issue
- Telemetry shows operations using outdated service configurations

### Example Scenario
```typescript
// User flow that exposes the problem:
1. App starts with no wallet (runtime has mock SparkService)
2. Component mounts and captures runtime reference
3. User enters seed phrase
4. Runtime reinitializes with real SparkService
5. Component operations still use captured mock service
6. Payments "succeed" but no real transaction occurs
```

## Root Cause
Effect runtime instances are immutable. When `reinitializeRuntime()` creates a new runtime instance with updated services, any references captured before reinitialization continue pointing to the old runtime. React's closure behavior makes this particularly problematic in hooks and event handlers.

## Solution
Always get the current runtime instance at the point of Effect execution, never store runtime references in component state, refs, or closures.

### Bad Pattern (Stale References)
```typescript
// ❌ BAD: Capturing runtime at component mount
export function usePaymentHook() {
  const runtimeRef = useRef(getMainRuntime()); // Captured once, becomes stale
  
  const handlePayment = useCallback(async (invoice: string) => {
    const effect = Effect.gen(function* () {
      const spark = yield* SparkService;
      return yield* spark.payLightningInvoice({ invoice });
    });
    
    // Uses stale runtime with old services
    await Effect.runPromise(effect.pipe(Effect.provide(runtimeRef.current)));
  }, []);
}

// ❌ BAD: Storing runtime in component state
function MyComponent() {
  const [runtime] = useState(() => getMainRuntime()); // Stale after reinit
  // ...
}

// ❌ BAD: Passing runtime as props
function ParentComponent() {
  const runtime = getMainRuntime(); // Stale reference
  return <ChildComponent runtime={runtime} />;
}
```

### Good Pattern (Fresh References)
```typescript
// ✅ GOOD: Getting fresh runtime at execution time
export function usePaymentHook() {
  const handlePayment = useCallback(async (invoice: string) => {
    const currentRuntime = getMainRuntime(); // Fresh runtime every time
    
    const effect = Effect.gen(function* () {
      const spark = yield* SparkService;
      return yield* spark.payLightningInvoice({ invoice });
    });
    
    // Uses current runtime with latest services
    await Effect.runPromise(effect.pipe(Effect.provide(currentRuntime)));
  }, []);
}

// ✅ GOOD: Getting services from fresh runtime
const handleAction = async () => {
  const currentRuntime = getMainRuntime();
  const telemetry = Context.get(currentRuntime.context, TelemetryService);
  await telemetry.trackEvent({ /* ... */ });
};

// ✅ GOOD: Fresh runtime in event handlers
useEffect(() => {
  const subscription = eventEmitter.on('event', async (data) => {
    const currentRuntime = getMainRuntime(); // Fresh for each event
    const effect = processEvent(data);
    await Effect.runPromise(effect.pipe(Effect.provide(currentRuntime)));
  });
  
  return () => subscription.unsubscribe();
}, []);
```

### Why This Pattern is Safe
1. **Runtime Immutability**: Effect runtimes are immutable; getting the current one is always safe
2. **Synchronous Access**: `getMainRuntime()` is synchronous and fast
3. **Consistent State**: Ensures operations use the most recent service configuration
4. **No Memory Leaks**: No stale references held in closures

## Complete Example
```typescript
import { Effect, Context } from "effect";
import { getMainRuntime } from "@/services/runtime";
import { SparkService } from "@/services/spark";
import { TelemetryService } from "@/services/telemetry";

export function useNip90PaymentFlow() {
  const [paymentState, setPaymentState] = useState<PaymentState>({
    status: 'idle'
  });

  // ✅ GOOD: No runtime refs stored
  const handlePayment = useCallback(async (invoice: string, jobId: string) => {
    const currentRuntime = getMainRuntime(); // Get fresh runtime
    
    try {
      setPaymentState({ status: 'paying' });
      
      const payEffect = Effect.gen(function* () {
        const spark = yield* SparkService;
        const telemetry = yield* TelemetryService;
        
        yield* telemetry.trackEvent({
          category: "payment",
          action: "start",
          label: jobId
        });
        
        const result = yield* spark.payLightningInvoice({
          invoice,
          maxFeeSats: 10,
          timeoutSeconds: 60
        });
        
        yield* telemetry.trackEvent({
          category: "payment",
          action: "success",
          label: jobId,
          value: result.payment.paymentHash
        });
        
        return result.payment;
      });
      
      // Execute with current runtime
      const paymentExit = await Effect.runPromiseExit(
        payEffect.pipe(Effect.provide(currentRuntime))
      );
      
      if (Exit.isSuccess(paymentExit)) {
        setPaymentState({ status: 'paid' });
      } else {
        const error = Cause.squash(paymentExit.cause);
        setPaymentState({ 
          status: 'failed',
          error: error.message 
        });
      }
    } catch (error) {
      setPaymentState({ 
        status: 'failed',
        error: 'Unexpected error' 
      });
    }
  }, []); // No runtime in dependencies!

  return { paymentState, handlePayment };
}
```

## When to Apply This Fix
- Any React component or hook that uses Effect runtime
- Event handlers that execute Effects
- Callbacks passed to child components
- setTimeout/setInterval callbacks
- Promise chains that use Effect runtime
- Any async operation that might execute after runtime reinitialization

## Testing for Stale References
```typescript
// Test that simulates runtime reinitialization
it('should use updated runtime after reinitialization', async () => {
  const { result } = renderHook(() => usePaymentHook());
  
  // Initial state with mock service
  expect(globalWalletConfig.mnemonic).toBeNull();
  
  // Simulate user entering seed phrase
  globalWalletConfig.mnemonic = "test seed phrase...";
  await reinitializeRuntime();
  
  // Execute payment - should use real service
  await act(async () => {
    await result.current.handlePayment("lnbc...");
  });
  
  // Verify real service was used (check telemetry, etc.)
});
```

## Related Issues
- Service operations using wrong implementations
- Authentication/authorization bypassed due to mock services
- Data operations affecting wrong storage
- Network requests going to mock endpoints
- Any operation where service behavior changes after initialization

## Prevention Strategies
1. **Never store runtime references** - Always get fresh at execution time
2. **Remove runtime props** - Components should get runtime internally
3. **Lint rule** - Consider ESLint rule to flag runtime storage patterns
4. **Code review** - Check for stored runtime references in PRs
5. **Testing** - Include runtime reinitialization in integration tests