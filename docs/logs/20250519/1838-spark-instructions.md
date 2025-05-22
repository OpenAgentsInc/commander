Okay, this is a significant but exciting task. We're going to replicate the thoroughness of the NIP-28 service layer for the Spark SDK, focusing on its core Lightning and financial transaction capabilities. This includes creating an Effect-TS service, integrating telemetry, and ensuring robust test coverage.

Here are the detailed coding instructions for our agent:

**Phase 1: Define Service Interface, Errors, Schemas, and Configuration**

1.  **Create Directory Structure:**
    Create a new directory: `src/services/spark/`.
    Inside this directory, create the following files:

    - `SparkService.ts`
    - `SparkServiceImpl.ts`
    - `index.ts`

2.  **Define Error Types in `SparkService.ts`:**

    - Mirroring the Spark SDK's error hierarchy (`node_modules/@buildonspark/spark-sdk/src/errors/`), create custom Effect-TS compatible error types.
    - Use `Data.TaggedError` for these.
    - Define a base error: `export class SparkServiceError extends Data.TaggedError("SparkServiceError")<{ readonly cause?: unknown; readonly message: string; readonly context?: Record<string, unknown> }> {}`
    - Define specific errors that extend `SparkServiceError`, corresponding to potential Spark SDK failures. Consider these categories initially, and expand as needed:
      - `SparkConfigError` (for issues with SDK configuration)
      - `SparkConnectionError` (for gRPC connection issues)
      - `SparkAuthenticationError` (for auth issues with Spark services)
      - `SparkLightningError` (for errors related to Lightning operations like invoice creation/payment)
      - `SparkTransactionError` (for errors related to on-chain or Spark-specific transfers/deposits/withdrawals)
      - `SparkBalanceError` (for errors fetching balance)
      - `SparkValidationError` (wrapping SDK's `ValidationError` if appropriate, or for our own input validation)
      - `SparkRPCError` (wrapping SDK's `RPCError`)
      - `SparkNotImplementedError`
    - For each specific error, include relevant context fields (e.g., `operation?: string`, `invoiceId?: string`, `amount?: number`).

3.  **Define Configuration in `SparkService.ts`:**

    - Define `SparkServiceConfig` interface. This should include:
      - `network: SparkSDK.NetworkType` (e.g., "REGTEST", "MAINNET", "LOCAL")
      - `mnemonicOrSeed?: string | Uint8Array` (for wallet initialization)
      - `accountNumber?: number` (optional, for HD wallet derivation)
      - `sparkSdkOptions?: SparkSDK.ConfigOptions` (to pass through other Spark SDK specific configurations if needed, review `node_modules/@buildonspark/spark-sdk/src/services/wallet-config.ts` for relevant options)
    - Create `SparkServiceConfigTag = Context.GenericTag<SparkServiceConfig>("SparkServiceConfig");`
    - Create `DefaultSparkServiceConfigLayer`:
      - This layer should provide a default `SparkServiceConfig`. For local development, sensible defaults would be:
        - `network: "REGTEST"` (or "LOCAL" if that's the primary dev target)
        - A predefined development mnemonic or seed (ensure this is clearly marked for development only).
        - `sparkSdkOptions`: Refer to `LOCAL_WALLET_CONFIG` in `node_modules/@buildonspark/spark-sdk/src/services/wallet-config.ts` for guidance on default URLs, etc. Ensure these are appropriate for the chosen default network.

4.  **Define Input/Output Schemas/Types in `SparkService.ts`:**

    - Review methods in `@buildonspark/spark-sdk/src/spark-wallet.ts` like:
      - `createLightningInvoice`
      - `payLightningInvoice`
      - `getLightningSendFeeEstimate`
      - `getBalance`
      - `getSingleUseDepositAddress`
      - `transfer`
      - `claimDeposit`
      - `withdraw`
      - `getWithdrawalFeeEstimate`
      - `getTransfers`
      - `getTokenL1Address`
      - `transferTokens`
      - `queryTokenTransactions`
      - `getSparkAddress`
      - `getIdentityPublicKey`
    - For each method we intend to wrap, define corresponding parameter types and return types. Use Effect `Schema` where possible for validation, otherwise use TypeScript interfaces.
    - Example parameter type:
      ```typescript
      export const CreateLightningInvoiceParamsSchema = Schema.Struct({
        amountSats: Schema.Number,
        memo: Schema.optional(Schema.String),
        expirySeconds: Schema.optional(Schema.Number),
      });
      export type CreateLightningInvoiceParams = Schema.Schema.Type<
        typeof CreateLightningInvoiceParamsSchema
      >;
      ```
    - Example return type (if SDK returns a complex object, mirror its structure):
      ```typescript
      // Assuming SparkSDK.LightningReceiveRequest is the raw type from the SDK
      export type CreateLightningInvoiceResult =
        SparkSDK.LightningReceiveRequest;
      export const CreateLightningInvoiceResultSchema = Schema.그대로(
        SparkSDK.LightningReceiveRequestSchema,
      ); // If you define a schema for it
      ```
      If SDK types are complex or not easily schematizable, use plain TypeScript interfaces for results.

5.  **Define `SparkService` Interface in `SparkService.ts`:**

    - This interface will define the contract for our service.
    - Each method should return an `Effect.Effect<SuccessType, ErrorType, R>` where `R` will eventually be `SparkServiceConfig | TelemetryService`.
    - Example method signatures:

      ```typescript
      import type * as SparkSDK from "@buildonspark/spark-sdk"; // For SDK types

      export interface SparkService {
        createLightningInvoice(
          params: CreateLightningInvoiceParams,
        ): Effect.Effect<
          SparkSDK.LightningReceiveRequest,
          SparkLightningError,
          TelemetryService
        >;

        payLightningInvoice(
          params: PayLightningInvoiceParams, // Define this type
        ): Effect.Effect<
          SparkSDK.LightningSendRequest,
          SparkLightningError,
          TelemetryService
        >;

        getBalance(): Effect.Effect<
          {
            balance: bigint;
            tokenBalances: Map<
              string,
              { balance: bigint; tokenInfo: SparkSDK.TokenInfo }
            >;
          },
          SparkBalanceError,
          TelemetryService
        >;

        getSingleUseDepositAddress(): Effect.Effect<
          string,
          SparkTransactionError,
          TelemetryService
        >;

        // ... other methods based on SparkWallet capabilities.
      }
      export const SparkService =
        Context.GenericTag<SparkService>("SparkService");
      ```

**Phase 2: Implement the SparkService**

1.  **Create `SparkServiceImpl.ts`:**

    - Import necessary modules: `Effect`, `Layer`, types from `SparkService.ts`, `SparkWallet` from `@buildonspark/spark-sdk`, and `TelemetryService`.
    - The main export will be `SparkServiceLive: Layer.Layer<SparkService, never, SparkServiceConfig | TelemetryService>`.
    - Inside `Layer.effect(SparkService, Effect.gen(function* (_) { ... }))`:

      - Get `SparkServiceConfig` and `TelemetryService` from the context.
      - Instantiate `SparkWallet`:

        ```typescript
        const sparkConfig = yield * _(SparkServiceConfigTag);
        const telemetry = yield * _(TelemetryService);

        const wallet =
          yield *
          _(
            Effect.tryPromise({
              try: async () => {
                // The SparkWallet.initialize method is static and async.
                const { wallet } = await SparkSDK.SparkWallet.initialize({
                  mnemonicOrSeed: sparkConfig.mnemonicOrSeed,
                  accountNumber: sparkConfig.accountNumber,
                  options: sparkConfig.sparkSdkOptions, // Pass through other options
                });
                return wallet;
              },
              catch: (e) =>
                new SparkConfigError({
                  message: "Failed to initialize SparkWallet",
                  cause: e,
                  context: { accountNumber: sparkConfig.accountNumber },
                }),
            }),
          );
        ```

      - Implement each method defined in the `SparkService` interface.

2.  **Implement Service Methods:**

    - For each method:

      - Log the start of the operation using `telemetry.trackEvent`.
      - Use `Effect.tryPromise` to wrap the call to the corresponding `wallet.method(...)`.
      - In the `catch` block of `Effect.tryPromise`, map the Spark SDK error to one of your custom `SparkServiceError` subtypes. Include original error as `cause` and add relevant context.
      - Log success or failure using `telemetry.trackEvent`.
      - Ensure input parameters are validated if you've defined schemas for them.

    - **Example: `createLightningInvoice` implementation:**

      ```typescript
      createLightningInvoice: (params: CreateLightningInvoiceParams) =>
        Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({
            category: "spark:lightning",
            action: "create_invoice_start",
            label: `Amount: ${params.amountSats} sats`,
            value: JSON.stringify(params)
          }));

          // Optional: Validate params using Schema if defined
          // const validatedParams = yield* _(Schema.decodeUnknown(CreateLightningInvoiceParamsSchema)(params), Effect.mapError(...));

          return yield* _(
            Effect.tryPromise({
              try: () => wallet.createLightningInvoice(params), // Pass validatedParams
              catch: (e) => new SparkLightningError({
                message: "Failed to create Lightning invoice via SparkSDK",
                cause: e,
                context: { amountSats: params.amountSats }
              })
            }),
            Effect.tapBoth({
              onSuccess: (invoice) => telemetry.trackEvent({
                category: "spark:lightning",
                action: "create_invoice_success",
                label: `Invoice created: ${invoice.invoice.encodedInvoice.substring(0, 20)}...`,
                value: invoice.invoice.paymentHash
              }),
              onFailure: (err) => telemetry.trackEvent({
                category: "spark:lightning",
                action: "create_invoice_failure",
                label: err.message,
                value: JSON.stringify(err.context)
              })
            })
          );
        }),
      ```

    - **Implement `getBalance`:**
      This method should call `wallet.getBalance()`.
    - **Implement `getSingleUseDepositAddress`:**
      This method should call `wallet.getSingleUseDepositAddress()`.
    - Continue for other essential methods: `payLightningInvoice`, `transfer`, etc., following the same pattern.
    - **Important for error mapping:**
      - The Spark SDK has its own error types (e.g., `NetworkError`, `ValidationError` from `node_modules/@buildonspark/spark-sdk/src/errors/types.ts`).
      - Your `catch` blocks should check the type of the error `e` from the SDK and map it to the appropriate `SparkServiceError` subtype you defined.
        ```typescript
        // Example error mapping in a catch block
        catch: (e) => {
          if (e instanceof SparkSDK.NetworkError) {
            return new SparkConnectionError({ message: e.message, cause: e, context: e.context });
          }
          if (e instanceof SparkSDK.ValidationError) {
            return new SparkValidationError({ message: e.message, cause: e, context: e.context });
          }
          // ... other Spark SDK error types
          return new SparkServiceError({ message: "An unknown SparkSDK error occurred", cause: e });
        }
        ```

3.  **Implement `index.ts` for the Spark service:**
    ```typescript
    // src/services/spark/index.ts
    export * from "./SparkService";
    export * from "./SparkServiceImpl";
    ```

**Phase 3: Integrate into Application Runtime**

1.  **Update `src/services/runtime.ts`:**
    - Import `SparkService`, `SparkServiceLive`, `DefaultSparkServiceConfigLayer` from `src/services/spark`.
    - Add `SparkService` to the `FullAppContext` type.
    - Create a `sparkLayer`:
      ```typescript
      const sparkLayer = SparkServiceLive.pipe(
        layerProvide(DefaultSparkServiceConfigLayer),
      );
      ```
    - Add `sparkLayer` to the `layerMergeAll` call for `FullAppLayer`.

**Phase 4: Testing (`src/tests/unit/services/spark/SparkService.test.ts`)**

1.  **Create Test File:** `src/tests/unit/services/spark/SparkService.test.ts`
2.  **Setup Mocks:**

    - Use `vi.mock('@buildonspark/spark-sdk', ...)` to mock the entire Spark SDK.

      - Mock the `SparkWallet` class and its methods. Each mocked method should return a `Promise` that resolves or rejects, simulating SDK behavior.
      - Example:

        ```typescript
        const mockSparkWalletInstance = {
          createLightningInvoice: vi.fn(),
          getBalance: vi.fn(),
          // ... other methods
          cleanupConnections: vi.fn().mockResolvedValue(undefined), // Mock this if called during initialize or elsewhere
        };

        vi.mock("@buildonspark/spark-sdk", () => ({
          SparkWallet: {
            initialize: vi
              .fn()
              .mockResolvedValue({ wallet: mockSparkWalletInstance }),
          },
          // Mock specific error classes if needed for instanceof checks
          NetworkError: class MockNetworkError extends Error {
            constructor(m, c, o) {
              super(m);
              this.context = c;
              this.originalError = o;
            }
          },
          ValidationError: class MockValidationError extends Error {
            constructor(m, c, o) {
              super(m);
              this.context = c;
              this.originalError = o;
            }
          },
          // ... other SparkSDK error classes
        }));
        ```

    - Mock `TelemetryService` as done in other tests (e.g., `src/tests/unit/services/nip28/NIP28Service.test.ts`).
      ```typescript
      const mockTrackEvent = vi.fn(() => Effect.succeed(undefined as void));
      const MockTelemetryServiceLayer = Layer.succeed(TelemetryService, {
        trackEvent: mockTrackEvent,
        isEnabled: () => Effect.succeed(true),
        setEnabled: () => Effect.succeed(undefined as void),
      });
      ```

3.  **Write Test Cases:**

    - For each method in `SparkService`:
      - **Success Case:**
        - Configure the mocked Spark SDK method to resolve successfully.
        - Define a test program using `Effect.gen` that calls the service method.
        - Provide a test layer: `const testLayer = Layer.provide(SparkServiceLive, Layer.merge(DefaultSparkServiceConfigLayer, MockTelemetryServiceLayer));`
        - Run the program: `const result = await Effect.runPromise(Effect.provide(program, testLayer));`
        - Assert the `result` is correct.
        - Assert `mockTrackEvent` was called with appropriate "start" and "success" events.
      - **Failure Case (SDK Error):**
        - Configure the mocked Spark SDK method to reject with a specific Spark SDK error (e.g., `new SparkSDK.NetworkError(...)`).
        - Run the program and catch the error: `const error = await Effect.runPromise(Effect.flip(Effect.provide(program, testLayer)));`
        - Assert `error` is an instance of your corresponding custom error (e.g., `SparkConnectionError`).
        - Assert `error.cause` is the original SDK error.
        - Assert `mockTrackEvent` was called with "start" and "failure" events.
      - **Failure Case (Input Validation - if applicable):**
        - Call the service method with invalid parameters.
        - Assert it fails with the correct validation error type (e.g., `SparkValidationError` or from `Schema.decodeUnknown`).
    - Test wallet initialization failure within `SparkServiceLive` by making `SparkWallet.initialize` reject.

    - **Example Test Structure:**

      ```typescript
      describe("SparkService", () => {
        let service: SparkService; // If testing methods directly via resolved layer

        beforeEach(() => {
          vi.clearAllMocks();
          // Optional: Resolve the service from the layer once if many tests use it directly
          // service = Effect.runSync(Layer.build(SparkServiceLive.pipe(Layer.provide(DefaultSparkServiceConfigLayer), Layer.provide(MockTelemetryServiceLayer))).pipe(Effect.map(context => Context.get(context, SparkService))));
        });

        describe("createLightningInvoice", () => {
          it("should create an invoice and track telemetry on success", async () => {
            const mockInvoiceResponse = {
              invoice: { encodedInvoice: "lnbc...", paymentHash: "hash..." },
            };
            vi.mocked(
              mockSparkWalletInstance.createLightningInvoice,
            ).mockResolvedValue(mockInvoiceResponse);

            const params: CreateLightningInvoiceParams = { amountSats: 1000 };
            const program = Effect.flatMap(SparkService, (s) =>
              s.createLightningInvoice(params),
            );
            const testLayer = Layer.provide(
              SparkServiceLive,
              Layer.merge(
                DefaultSparkServiceConfigLayer,
                MockTelemetryServiceLayer,
              ),
            );

            const result = await Effect.runPromise(
              Effect.provide(program, testLayer),
            );

            expect(result).toEqual(mockInvoiceResponse);
            expect(
              mockSparkWalletInstance.createLightningInvoice,
            ).toHaveBeenCalledWith(params);
            expect(mockTrackEvent).toHaveBeenCalledWith(
              expect.objectContaining({ action: "create_invoice_start" }),
            );
            expect(mockTrackEvent).toHaveBeenCalledWith(
              expect.objectContaining({ action: "create_invoice_success" }),
            );
          });

          it("should return SparkLightningError and track telemetry on SDK failure", async () => {
            const sdkError = new (vi.mocked(SparkSDK.NetworkError))(
              "SDK Network Error",
              {},
              new Error("original"),
            );
            vi.mocked(
              mockSparkWalletInstance.createLightningInvoice,
            ).mockRejectedValue(sdkError);

            const params: CreateLightningInvoiceParams = { amountSats: 1000 };
            const program = Effect.flatMap(SparkService, (s) =>
              s.createLightningInvoice(params),
            );
            const testLayer = Layer.provide(
              SparkServiceLive,
              Layer.merge(
                DefaultSparkServiceConfigLayer,
                MockTelemetryServiceLayer,
              ),
            );

            const error = await Effect.runPromise(
              Effect.flip(Effect.provide(program, testLayer)),
            );

            expect(error).toBeInstanceOf(SparkConnectionError); // Or SparkLightningError if mapped that way
            expect(error.message).toBe("SDK Network Error");
            expect(error.cause).toBe(sdkError);
            expect(mockTrackEvent).toHaveBeenCalledWith(
              expect.objectContaining({ action: "create_invoice_start" }),
            );
            expect(mockTrackEvent).toHaveBeenCalledWith(
              expect.objectContaining({ action: "create_invoice_failure" }),
            );
          });
        });

        // ... tests for getBalance, etc.
      });
      ```

**Phase 5: Final Checks**

1.  **Run Type Checker:**
    Execute `pnpm tsc --noEmit` (or `pnpm t`) and ensure there are no TypeScript errors.
2.  **Run Tests:**
    Execute `pnpm test` and ensure all tests for the new `SparkService` pass.
3.  **Review Telemetry:**
    Double-check that all public methods in `SparkServiceImpl` have appropriate `trackEvent` calls for start, success, and failure, with meaningful `category`, `action`, `label`, and `value`.
    Refer to `docs/AGENTS.md#11-logging-and-telemetry` for telemetry guidelines. Use categories like:
    - `spark:init`
    - `spark:lightning`
    - `spark:balance`
    - `spark:deposit`
    - `spark:transfer`
    - `spark:withdraw`
    - `spark:token`
    - `spark:error` (for internal service errors not directly tied to an operation)
      _Actions could be like_:
    - `wallet_initialize_start`, `wallet_initialize_success`, `wallet_initialize_failure`
    - `create_invoice_start`, `create_invoice_success`, `create_invoice_failure`
    - `get_balance_start`, `get_balance_success`, `get_balance_failure`

This comprehensive approach should result in a robust, well-tested, and observable Spark SDK service layer. Remember to adapt error types and specific SDK calls based on the actual Spark SDK structure. Good luck!
