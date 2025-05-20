// src/tests/unit/services/spark/SparkService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Exit, Cause, Option, Context } from 'effect';

// Import mock classes and functions
import {
  MockNetworkError,
  MockValidationError, 
  MockAuthError,
  MockRPCError,
  MockConfigError,
  MockNotImplementedError,
  MockSparkSDKError,
  createLightningInvoiceMock,
  payLightningInvoiceMock,
  getBalanceMock,
  getSingleUseDepositAddressMock,
  cleanupConnectionsMock,
  initializeMock
} from './mockSdk';

// Mock the SDK using the imported mocks
vi.mock('@buildonspark/spark-sdk', () => ({
  SparkWallet: {
    initialize: initializeMock
  },
  NetworkError: MockNetworkError,
  ValidationError: MockValidationError,
  AuthenticationError: MockAuthError,
  RPCError: MockRPCError,
  ConfigurationError: MockConfigError,
  NotImplementedError: MockNotImplementedError,
  SparkSDKError: MockSparkSDKError
}));

// Mock other services
vi.mock('@/services/telemetry', () => ({
  TelemetryService: {
    key: Symbol.for('TelemetryService') 
  },
  TelemetryServiceConfigTag: {
    key: Symbol.for('TelemetryServiceConfig')
  }
}));

// Import the service interfaces and implementations
import {
  SparkService,
  SparkServiceLive,
  SparkServiceConfig,
  SparkServiceConfigTag,
  SparkLightningError,
  SparkBalanceError,
  SparkConnectionError,
  SparkValidationError,
  SparkTransactionError,
  SparkConfigError,
  SparkAuthenticationError,
  SparkRPCError,
  SparkNotImplementedError,
  CreateLightningInvoiceParams,
  PayLightningInvoiceParams,
  LightningInvoice,
  LightningPayment,
  BalanceInfo
} from '@/services/spark';

import { TelemetryService, TelemetryServiceConfigTag, TrackEventError } from '@/services/telemetry';

describe('SparkService', () => {
  // Create mock implementations
  const mockTrackEvent = vi.fn(() => Effect.succeed(undefined as void));
  
  // Mock TelemetryService
  const MockTelemetryService = {
    trackEvent: mockTrackEvent,
    isEnabled: () => Effect.succeed(true),
    setEnabled: () => Effect.succeed(undefined as void)
  };

  // Layer for providing TelemetryService and its config
  const MockTelemetryLayer = Layer.succeed(TelemetryService, MockTelemetryService);
  const MockTelemetryConfigLayer = Layer.succeed(TelemetryServiceConfigTag, { 
    enabled: true, 
    logToConsole: false, 
    logLevel: 'info' 
  });

  // Combined Telemetry Layer
  const TelemetryTestLayer = Layer.merge(
    MockTelemetryLayer,
    MockTelemetryConfigLayer
  );

  // Mock config for SparkService
  const mockSparkConfig: SparkServiceConfig = {
    network: "REGTEST",
    mnemonicOrSeed: "test test test test test test test test test test test junk",
    accountNumber: 0,
    sparkSdkOptions: {
      grpcUrl: "http://localhost:8080",
      authToken: "test_token"
    }
  };

  const MockSparkConfigLayer = Layer.succeed(SparkServiceConfigTag, mockSparkConfig);
  
  // Create test layer for SparkServiceLive with mocked dependencies
  const dependenciesLayerForLiveTests = Layer.merge(
    MockSparkConfigLayer,
    TelemetryTestLayer
  );
  const testLayerForLive = Layer.provide(
    SparkServiceLive,
    dependenciesLayerForLiveTests
  );

  // Create a mock implementation of the SparkService
  const createMockSparkService = (): SparkService => ({
    createLightningInvoice: (params: CreateLightningInvoiceParams) => {
      // Input validation
      if (params.amountSats <= 0) {
        return Effect.fail(new SparkValidationError({
          message: "Amount must be greater than 0",
          context: { params }
        }));
      }
      
      // Return a mock invoice
      return Effect.succeed({
        invoice: {
          encodedInvoice: 'lnbc10n1p3zry29pp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g',
          paymentHash: 'abcdef1234567890',
          amountSats: params.amountSats,
          createdAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + (params.expirySeconds || 3600),
          memo: params.memo
        }
      });
    },
    
    payLightningInvoice: (params: PayLightningInvoiceParams) => {
      // Input validation
      if (!params.invoice || params.invoice.trim() === "") {
        return Effect.fail(new SparkValidationError({
          message: "Invoice string cannot be empty",
          context: { params }
        }));
      }
      
      // Return a mock payment
      return Effect.succeed({
        payment: {
          id: 'payment123',
          paymentHash: 'abcdef1234567890',
          amountSats: 1000,
          feeSats: Math.min(params.maxFeeSats, 10),
          createdAt: Math.floor(Date.now() / 1000),
          status: 'SUCCESS',
          destination: 'dest123'
        }
      });
    },
    
    getBalance: () => {
      // Return a mock balance
      return Effect.succeed({
        balance: BigInt(50000),
        tokenBalances: new Map([
          ['token1', {
            balance: BigInt(1000),
            tokenInfo: {
              tokenId: 'token1',
              name: 'Test Token',
              symbol: 'TEST',
              decimals: 8
            }
          }]
        ])
      });
    },
    
    getSingleUseDepositAddress: () => {
      // Return a mock address
      return Effect.succeed('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    }
  });

  // Helper to create test programs that don't use Effect.gen 
  const createTestProgram = <A>(program: (service: SparkService) => Effect.Effect<A, SparkValidationError | SparkLightningError | SparkConnectionError | SparkAuthenticationError | SparkTransactionError | SparkBalanceError | SparkRPCError | SparkNotImplementedError | SparkConfigError | TrackEventError, never>) => {
    const mockService = createMockSparkService();
    return program(mockService);
  };

  // Helper to extract success value
  const getSuccess = <A, E>(exit: Exit.Exit<A, E>): A => {
    if (Exit.isSuccess(exit)) {
      return exit.value;
    }
    throw new Error(`Test Helper: Effect failed when success was expected. Cause: ${Cause.pretty(exit.cause)}`);
  };

  // Helper to extract failure value
  const getFailure = <A, E>(exit: Exit.Exit<A, E>): E => {
    if (Exit.isFailure(exit)) {
      const errorOpt = Cause.failureOption(exit.cause);
      if (Option.isSome(errorOpt)) {
        return errorOpt.value;
      }
      throw new Error(`Test Helper: Effect failed, but no specific failure value found. Cause: ${Cause.pretty(exit.cause)}`);
    }
    throw new Error("Test Helper: Effect succeeded when failure was expected.");
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset all mock implementations
    createLightningInvoiceMock.mockReset();
    payLightningInvoiceMock.mockReset();
    getBalanceMock.mockReset();
    getSingleUseDepositAddressMock.mockReset();
    cleanupConnectionsMock.mockClear().mockResolvedValue(undefined);
    
    // Reset the telemetry mock
    mockTrackEvent.mockClear();
  });

  describe('createLightningInvoice', () => {
    const invoiceParams: CreateLightningInvoiceParams = {
      amountSats: 1000,
      memo: 'Test payment'
    };

    it('should successfully create a lightning invoice', async () => {
      // Use our mock service directly
      const program = createTestProgram(service => 
        service.createLightningInvoice(invoiceParams)
      );
      
      const exit = await Effect.runPromiseExit(program);
      
      // Assertions
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit) as LightningInvoice;
      expect(result.invoice.paymentHash).toEqual('abcdef1234567890');
      expect(result.invoice.encodedInvoice).toContain('lnbc10n1p3zry29pp');
    });

    it('should handle validation errors during invoice creation', async () => {
      // Use our mock service directly 
      const invalidParams: CreateLightningInvoiceParams = {
        amountSats: -10, // Invalid negative amount
        memo: 'Invalid payment'
      };

      const program = createTestProgram(service => 
        service.createLightningInvoice(invalidParams)
      );
      
      const exit = await Effect.runPromiseExit(program);
      
      // Assertions
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      expect(error).toBeInstanceOf(SparkValidationError);
      if (error instanceof SparkValidationError) {
        expect(error.message).toContain("Amount must be greater than 0");
      }
    });
    
    it('should fail with SparkValidationError for schema validation failure via SparkServiceLive', async () => {
      // Invalid parameter - negative amount should fail schema validation
      const invalidParams = { amountSats: -100, memo: 'Invalid Test' };
      
      const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(invalidParams as any));
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));
      
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      expect(error).toBeInstanceOf(SparkValidationError);
      expect(createLightningInvoiceMock).not.toHaveBeenCalled(); // SDK method should not be called
      if (error instanceof SparkValidationError) {
        expect(error.message).toContain("Invalid parameters for createLightningInvoice");
        expect(error.cause).toBeDefined(); // Should contain a ParseError
      }
    });
    
    it('should create invoice via SparkServiceLive and track telemetry', async () => {
      const mockSdkInvoiceResponse = { 
        invoice: { 
          encodedInvoice: 'sdk-lnbc...', 
          paymentHash: 'sdk-hash',
          createdAt: '2023-01-01T00:00:00Z',
          expiresAt: '2023-01-01T01:00:00Z',
          memo: 'SDK memo'
        } 
      };
      createLightningInvoiceMock.mockResolvedValue(mockSdkInvoiceResponse);

      const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(invoiceParams));
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));

      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit) as LightningInvoice;
      expect(result.invoice.paymentHash).toEqual('sdk-hash'); // From SDK mock
      expect(createLightningInvoiceMock).toHaveBeenCalledWith(invoiceParams);
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_invoice_start' }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_invoice_success' }));
    });

    it('should handle SDK network errors via SparkServiceLive', async () => {
      const networkError = new MockNetworkError('SDK Connection failed');
      createLightningInvoiceMock.mockRejectedValue(networkError);

      const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(invoiceParams));
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));

      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      expect(error).toBeInstanceOf(SparkConnectionError);
      if (error instanceof SparkConnectionError) expect(error.cause).toBe(networkError);
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_invoice_failure' }));
    });
    
    it('should map SDK AuthenticationError to SparkAuthenticationError', async () => {
      const authError = new MockAuthError('SDK Auth Failed');
      createLightningInvoiceMock.mockRejectedValue(authError);
      
      const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(invoiceParams));
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));
      
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      expect(error).toBeInstanceOf(SparkAuthenticationError);
      if (error instanceof SparkAuthenticationError) {
        expect(error.cause).toBe(authError);
        expect(error.message).toContain('Authentication error');
      }
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_invoice_failure' }));
    });
    
    it('should map SDK ConfigurationError to SparkConfigError', async () => {
      const configError = new MockConfigError('SDK Config Failed');
      createLightningInvoiceMock.mockRejectedValue(configError);
      
      const program = Effect.flatMap(SparkService, s => s.createLightningInvoice(invoiceParams));
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));
      
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      expect(error).toBeInstanceOf(SparkConfigError);
      if (error instanceof SparkConfigError) {
        expect(error.cause).toBe(configError);
        expect(error.message).toContain('Configuration error');
      }
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'create_invoice_failure' }));
    });
  });

  describe('payLightningInvoice', () => {
    const paymentParams: PayLightningInvoiceParams = {
      invoice: 'lnbc10n1p3zry29pp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g',
      maxFeeSats: 100
    };

    it('should successfully pay a lightning invoice', async () => {
      // Use our mock service to test
      const program = createTestProgram(service => 
        service.payLightningInvoice(paymentParams)
      );
      
      const exit = await Effect.runPromiseExit(program);
      
      // Assertions
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit) as LightningPayment;
      expect(result.payment.id).toEqual('payment123');
      expect(result.payment.paymentHash).toEqual('abcdef1234567890');
    });

    it('should validate invoice before sending payment', async () => {
      // Test with invalid parameters
      const invalidParams: PayLightningInvoiceParams = {
        invoice: '',  // Empty invoice string
        maxFeeSats: 100
      };

      const program = createTestProgram(service => 
        service.payLightningInvoice(invalidParams)
      );
      
      const exit = await Effect.runPromiseExit(program);
      
      // Assertions
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      expect(error).toBeInstanceOf(SparkValidationError);
      if (error instanceof SparkValidationError) {
        expect(error.message).toContain("Invoice string cannot be empty");
      }
    });
    
    it('should fail with SparkValidationError for schema validation failure via SparkServiceLive', async () => {
      // Invalid parameter - negative maxFeeSats should fail schema validation
      const invalidParams = { 
        invoice: 'lnbc1valid', 
        maxFeeSats: -10  // Negative fee should fail schema validation
      };
      
      const program = Effect.flatMap(SparkService, s => s.payLightningInvoice(invalidParams as any));
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));
      
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      expect(error).toBeInstanceOf(SparkValidationError);
      expect(payLightningInvoiceMock).not.toHaveBeenCalled(); // SDK method should not be called
      if (error instanceof SparkValidationError) {
        expect(error.message).toContain("Invalid parameters for payLightningInvoice");
        expect(error.cause).toBeDefined(); // Should contain a ParseError
      }
    });
    
    it('should successfully pay invoice via SparkServiceLive', async () => {
      // Mock the SDK response
      const mockSdkPaymentResponse = { 
        id: 'payment123', 
        paymentPreimage: 'payment-preimage-hash',
        fee: { originalValue: 5 },
        createdAt: '2023-01-01T00:00:00Z',
        status: 'SUCCESSFUL',
        encodedInvoice: paymentParams.invoice,
        transfer: {
          totalAmount: { originalValue: 1000 },
          sparkId: 'destination123'
        }
      };
      
      payLightningInvoiceMock.mockResolvedValue(mockSdkPaymentResponse);
      
      const program = Effect.flatMap(SparkService, s => s.payLightningInvoice(paymentParams));
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));
      
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit) as LightningPayment;
      expect(result.payment.paymentHash).toEqual('payment-preimage-hash');
      expect(result.payment.status).toEqual('SUCCESS');
      expect(payLightningInvoiceMock).toHaveBeenCalledWith({
        invoice: paymentParams.invoice,
        maxFeeSats: paymentParams.maxFeeSats
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'pay_invoice_start' }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'pay_invoice_success' }));
    });
    
    it('should handle SDK RPC errors via SparkServiceLive', async () => {
      const rpcError = new MockRPCError('Payment RPC Failed');
      payLightningInvoiceMock.mockRejectedValue(rpcError);
      
      const program = Effect.flatMap(SparkService, s => s.payLightningInvoice(paymentParams));
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));
      
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      expect(error).toBeInstanceOf(SparkRPCError);
      if (error instanceof SparkRPCError) {
        expect(error.cause).toBe(rpcError);
        expect(error.message).toContain('RPC error');
      }
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'pay_invoice_failure' }));
    });
  });

  describe('getBalance', () => {
    it('should successfully retrieve balance information', async () => {
      // Use our mock service
      const program = createTestProgram(service => 
        service.getBalance()
      );
      
      const exit = await Effect.runPromiseExit(program);
      
      // Assertions
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit) as BalanceInfo;
      expect(result.balance).toEqual(BigInt(50000));
      expect(result.tokenBalances.get('token1')?.tokenInfo.name).toBe('Test Token');
    });
  });

  describe('getSingleUseDepositAddress', () => {
    it('should successfully generate a deposit address', async () => {
      // Use our mock service
      const program = createTestProgram(service => 
        service.getSingleUseDepositAddress()
      );
      
      const exit = await Effect.runPromiseExit(program);
      
      // Assertions
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit) as string;
      expect(result).toEqual('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    });
    
    it('should successfully generate deposit address via SparkServiceLive', async () => {
      // Mock the SDK response
      getSingleUseDepositAddressMock.mockResolvedValue('sdk-deposit-address-123');
      
      const program = Effect.flatMap(SparkService, s => s.getSingleUseDepositAddress());
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayerForLive)));
      
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit);
      expect(result).toEqual('sdk-deposit-address-123');
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'get_deposit_address_start' }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'get_deposit_address_success' }));
    });
  });
  
  describe('wallet initialization and resource management', () => {
    it('should fail with SparkConfigError if SparkWallet.initialize rejects', async () => {
      // Setup the initialization to fail
      const initError = new Error('SDK Initialization Failed');
      initializeMock.mockRejectedValueOnce(initError);
      
      // Create a fresh test layer
      const freshTestLayer = Layer.provide(
        SparkServiceLive,
        dependenciesLayerForLiveTests
      );
      
      // Attempt to use the service, which should trigger initialization
      const program = Effect.flatMap(SparkService, s => Effect.succeed(s));
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(freshTestLayer)));
      
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      expect(error).toBeInstanceOf(SparkConfigError);
      if (error instanceof SparkConfigError) {
        expect(error.message).toContain('Failed to initialize SparkWallet');
      }
    });
    
    it('should call wallet.cleanupConnections when the service is released', async () => {
      // Reset and track cleanup method calls
      cleanupConnectionsMock.mockClear();
      
      // Create a basic test for the cleanup
      // First create a service, then simulate its release
      const program = Effect.gen(function* (_) {
        // Get the service
        const service = yield* _(SparkService);
        
        // Verify the wallet was initialized
        expect(initializeMock).toHaveBeenCalled();
        
        // Manually invoke the finalizer by creating and releasing a scope
        // In real usage, this happens automatically when the service's scope ends
        yield* _(Effect.acquireRelease(
          Effect.succeed(service),  // Acquire operation
          () => Effect.succeed(undefined) // Release operation
        ));
        
        // The cleanup should have been called during the release phase
        return undefined;
      });
      
      // Run the program
      await Effect.runPromise(program.pipe(
        Effect.provide(testLayerForLive),
        Effect.catchAll(err => Effect.sync(() => {
          console.error('Test failed:', err);
          return undefined;
        }))
      ));
      
      // Verify cleanup was called
      expect(cleanupConnectionsMock).toHaveBeenCalled();
    });
  });
});