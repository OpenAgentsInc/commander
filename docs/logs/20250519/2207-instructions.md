You're absolutely right. Using `as any` was a shortcut to get the tests passing but isn't a proper fix and hides potential issues. We need to align the implementation strictly with the (mocked) Spark SDK's actual type definitions or, if the SDK types are deficient, make controlled augmentations or adjustments to our internal types.

Here are the follow-up instructions:

**Objective:** Remove all `as any` casts related to SDK type interactions in `SparkServiceImpl.ts` and ensure that our internal types and mappings correctly and type-safely reflect the data provided by the Spark SDK.

**I. Investigate and Align SDK Type Mappings in `SparkServiceImpl.ts`**

**Context:** The `payLightningInvoice`, `createLightningInvoice`, and `getBalance` methods in `SparkServiceImpl.ts` perform mappings from the (mocked) Spark SDK's response types to our internal service types (e.g., `LightningPayment`, `LightningInvoice`, `BalanceInfo`). These mappings must be type-safe.

**Files to Examine:**

- `src/services/spark/SparkServiceImpl.ts` (for implementation)
- `src/services/spark/SparkService.ts` (for our internal type definitions)
- `node_modules/@buildonspark/spark-sdk/src/spark-wallet.ts` (to understand the actual return types of SDK methods like `payLightningInvoice`, `createLightningInvoice`, `getBalance`).
- `node_modules/@buildonspark/spark-sdk/src/graphql/objects/` (specifically `LightningSendRequest.js`, `LightningReceiveRequest.js` or their corresponding `.d.ts` files if they exist, as these are likely the underlying types returned by the SDK methods).

**Instructions:**

1.  **`payLightningInvoice` Method in `SparkServiceImpl.ts`:**

    - **Remove `as any`:** Delete all `(sdkResult as any).propertyName` casts.
    - **Verify SDK's `LightningSendRequest` Type:** Consult the Spark SDK's type definition for the object returned by `wallet.payLightningInvoice()`. Let's assume this type is `SDK.LightningSendRequest`.
    - **Reconcile Fields:**
      - For each field (`paymentHash`, `amountSats`, `feeSats`, `destination`) that was cast with `as any`:
        - **If the field _exists_ on the SDK's `LightningSendRequest` type:** Ensure `sdkResult.propertyName` is used directly. If TypeScript still complains, it might be an issue with how the mock SDK is typed in `SparkService.test.ts` or an outdated SDK type definition locally. The primary source of truth should be the SDK's own types.
        - **If the field _does not exist_ on the SDK's `LightningSendRequest` type:**
          - Our internal `LightningPayment.payment` interface (in `SparkService.ts`) must be updated. Mark these fields as optional (e.g., `paymentHash?: string;`) or remove them if they are never provided by the SDK.
          - The mapping logic must then handle these potentially undefined fields gracefully (e.g., `paymentHash: sdkResult.someOtherFieldCorrespondingToPaymentHash || 'unknown-hash-if-not-provided',`).
          - **Do not invent data.** If the SDK truly doesn't provide a `paymentHash` on the `LightningSendRequest` object, our `LightningPayment` type cannot expect it directly from there.
    - **Update `LightningPayment` Interface:** Adjust the `LightningPayment` interface in `SparkService.ts` based on what the SDK _actually_ provides. If a field like `status` is also not on the SDK type, our assumption of `'SUCCESS'` needs to be evaluated (perhaps the SDK call throws an error on failure, making this assumption valid).

2.  **`createLightningInvoice` Method in `SparkServiceImpl.ts`:**

    - **Review SDK's `LightningReceiveRequest` Type:** Check the return type of `wallet.createLightningInvoice()`. Let's assume it's `SDK.LightningReceiveRequest`.
    - **Verify Field Access:** Ensure that all properties accessed from `sdkResult.invoice` (e.g., `encodedInvoice`, `paymentHash`, `createdAt`, `expiresAt`, `memo`) are indeed part of the SDK's `LightningReceiveRequest.invoice` type definition.
    - **Handle Optional SDK Fields:**
      - If fields like `createdAt`, `expiresAt`, or `memo` are optional in the SDK's response type, the current fallback logic (e.g., `sdkResult.invoice.createdAt || Math.floor(Date.now() / 1000)`) is acceptable.
      - Ensure our internal `LightningInvoice.invoice` type (in `SparkService.ts`) correctly reflects whether these fields come directly from the SDK or are derived/defaulted by our service.

3.  **`getBalance` Method in `SparkServiceImpl.ts`:**
    - **Review SDK's `getBalance` Return Type:** Examine the structure returned by `wallet.getBalance()`.
    - **Verify Field Access:**
      - Ensure `sdkResult.balance` is of type `bigint`.
      - Ensure `sdkResult.tokenBalances` is a `Map` with the expected structure for its values, particularly `value.tokenInfo`.
      - Check if `tokenPublicKey`, `tokenName`, `tokenSymbol`, `tokenDecimals` are standard and guaranteed fields on `value.tokenInfo` from the SDK.
    - **Handle Optional SDK Fields:**
      - The current fallback logic (e.g., `value.tokenInfo.tokenName || 'Unknown Token'`) is good if these fields are optional in the SDK types.
      - Our internal `BalanceInfo` type (in `SparkService.ts`), specifically the `tokenInfo` part, should accurately reflect the structure and optionality of the data coming from the SDK.

**II. Validate Error Context Handling**

**Context:** The agent added a `context` property to `TrackEventError`. The base `SparkServiceError` already defines an optional `context`.

**Instructions:**

1.  **Review `Effect.tapError` Blocks in `SparkServiceImpl.ts`:**
    - The `err` parameter in `tapError((err) => ...)` is a union type that can include `SparkError` (which has `context`) and `TrackEventError` (which now also has `context`).
    - The access `err.context` should now be type-safe.
    - **Confirm:** No further changes should be needed here, as the previous fix was appropriate for making `err.context` accessible on all relevant error types in the union.

**III. Test File Type Assertions**

**Context:** The agent added explicit type assertions like `getSuccess(exit) as LightningInvoice`.

**Instructions:**

1.  **Maintain Explicit Type Assertions in Tests:** This practice is good for test clarity and safety. When `getSuccess(exit)` is called, casting the result to the specific expected success type (e.g., `LightningInvoice`, `LightningPayment`) for that test case is appropriate.
    ```typescript
    // Example from SparkService.test.ts - This is good.
    const result = getSuccess(exit) as LightningInvoice;
    expect(result.invoice.paymentHash).toEqual("mock-hash"); // Assuming 'mock-hash' is from createMockSparkService
    ```
    Or, for tests against `SparkServiceLive`:
    ```typescript
    const result = getSuccess(exit) as LightningInvoice; // Or whatever type that method returns
    expect(result.invoice.paymentHash).toEqual("sdk-hash"); // From the SDK mock
    ```
    - The key is that `LightningInvoice` (and other result types) must now be fully type-safe and reflect what `SparkServiceImpl.ts` _actually_ constructs after its proper mapping logic (without `as any`).

**IV. Final Verification**

1.  **Run `pnpm t` (or `tsc --noEmit`):** Ensure all TypeScript errors are resolved.
2.  **Run `pnpm test src/tests/unit/services/spark/SparkService.test.ts`:** Ensure all tests still pass after removing `as any` and implementing correct type mappings. Test failures here would indicate that the SDK mock responses in the test file need to be adjusted to match the (now more accurately typed) expectations of `SparkServiceImpl.ts`.

**Key Outcome:** The `SparkServiceImpl.ts` should no longer use `as any` for handling SDK responses. The mappings should be explicit and type-safe, driven by the actual (or accurately mocked) types from the Spark SDK. Our internal service types in `SparkService.ts` should accurately represent the data structure our service provides, whether directly from the SDK or after transformation.
