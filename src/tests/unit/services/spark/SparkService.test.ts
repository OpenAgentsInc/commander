// src/tests/unit/services/spark/SparkService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Layer, Exit, Cause, Option, Context } from 'effect';

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
  CreateLightningInvoiceParams,
  PayLightningInvoiceParams,
  SparkError
} from '@/services/spark';

import { TelemetryService } from '@/services/telemetry';
import { TrackEventError } from '@/services/telemetry/TelemetryService';

// Class definitions for Spark SDK error types
class NetworkError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'NetworkError';
    this.context = context;
    this.originalError = originalError;
  }
}

class ValidationError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'ValidationError';
    this.context = context;
    this.originalError = originalError;
  }
}

class AuthError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'AuthError';
    this.context = context;
    this.originalError = originalError;
  }
}

class RPCError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'RPCError';
    this.context = context;
    this.originalError = originalError;
  }
}

// Mock the Spark SDK
vi.mock('@buildonspark/spark-sdk', () => {
  // Mock wallet instance with methods to be spied on
  const mockWalletInstance = {
    createLightningInvoice: vi.fn(),
    payLightningInvoice: vi.fn(),
    getBalance: vi.fn(),
    getSingleUseDepositAddress: vi.fn(),
    cleanupConnections: vi.fn().mockResolvedValue(undefined)
  };

  return {
    AuthenticationError: AuthError,
    NetworkError,
    ValidationError,
    RPCError,
    SparkWallet: {
      initialize: vi.fn().mockResolvedValue({ wallet: mockWalletInstance })
    }
  };
});

// Get access to the mocked SDK
import * as SparkSDK from '@buildonspark/spark-sdk';

// Mock implementation for TelemetryService
const mockTrackEvent = vi.fn(() => Effect.succeed(undefined as void));
const MockTelemetryServiceLayer = Layer.succeed(TelemetryService, {
  trackEvent: mockTrackEvent,
  isEnabled: () => Effect.succeed(true),
  setEnabled: () => Effect.succeed(undefined as void)
});

// Mock config for SparkService
const MockSparkConfigLayer = Layer.succeed(
  SparkServiceConfigTag,
  {
    network: "REGTEST",
    mnemonicOrSeed: "test test test test test test test test test test test junk",
    accountNumber: 0,
    sparkSdkOptions: {
      grpcUrl: "http://localhost:8080",
      authToken: "test_token"
    }
  }
);

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

describe('SparkService', () => {
  // Get the mocked SDK wallet instance
  const mockWallet = ((SparkSDK as any).SparkWallet as any).initialize().then(({ wallet }: any) => wallet);
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mock wallet instance to reset function mocks
    const wallet = await mockWallet;
    wallet.createLightningInvoice.mockReset();
    wallet.payLightningInvoice.mockReset();
    wallet.getBalance.mockReset();
    wallet.getSingleUseDepositAddress.mockReset();
    
    // Reset mockTrackEvent
    mockTrackEvent.mockClear();
  });

  // Create a test layer that provides both mock services
  const testLayer = Layer.provide(
    SparkServiceLive,
    Layer.merge(MockSparkConfigLayer, MockTelemetryServiceLayer)
  );

  describe('createLightningInvoice', () => {
    const invoiceParams: CreateLightningInvoiceParams = {
      amountSats: 1000,
      memo: 'Test payment'
    };

    it('should successfully create a lightning invoice', async () => {
      // Setup the mock response
      const mockInvoice = {
        invoice: {
          encodedInvoice: 'lnbc10n1p3zry29pp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g',
          paymentHash: 'abcdef1234567890',
        }
      };

      // Set up mock implementation
      const wallet = await mockWallet;
      wallet.createLightningInvoice.mockResolvedValue(mockInvoice);

      // Run the test
      const program = Effect.flatMap(
        Context.get(SparkService),
        service => service.createLightningInvoice(invoiceParams)
      );
      
      const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      // Assertions
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit);
      expect(result.invoice.paymentHash).toEqual(mockInvoice.invoice.paymentHash);
      expect(result.invoice.encodedInvoice).toEqual(mockInvoice.invoice.encodedInvoice);
      
      // Check if the mock was called with correct params
      expect(wallet.createLightningInvoice).toHaveBeenCalledWith(invoiceParams);
      
      // Verify telemetry was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:lightning',
        action: 'create_invoice_start'
      }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:lightning',
        action: 'create_invoice_success'
      }));
    });

    it('should handle network errors during invoice creation', async () => {
      // Setup the mock to throw a network error
      const networkError = new NetworkError('Connection failed', { endpoint: 'invoice-api' });
      const wallet = await mockWallet;
      wallet.createLightningInvoice.mockRejectedValue(networkError);

      // Run the test
      const program = Effect.flatMap(
        Context.get(SparkService),
        service => service.createLightningInvoice(invoiceParams)
      );
      
      const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      // Assertions
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      if (error instanceof SparkConnectionError) {
        expect(error.cause).toBe(networkError);
      } else {
        fail('Expected SparkConnectionError but got a different error type');
      }
      
      // Verify telemetry was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:lightning',
        action: 'create_invoice_start'
      }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:lightning',
        action: 'create_invoice_failure'
      }));
    });

    it('should handle validation errors during invoice creation', async () => {
      // Setup the mock to throw a validation error
      const validationError = new ValidationError('Invalid amount', { amount: -10 });
      const wallet = await mockWallet;
      wallet.createLightningInvoice.mockRejectedValue(validationError);

      // Create invalid params
      const invalidParams: CreateLightningInvoiceParams = {
        amountSats: -10, // Invalid negative amount
        memo: 'Invalid payment'
      };

      // Run the test
      const program = Effect.flatMap(
        Context.get(SparkService),
        service => service.createLightningInvoice(invalidParams)
      );
      
      const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      // Assertions
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      if (error instanceof SparkValidationError) {
        expect(error.cause).toBe(validationError);
      } else {
        fail('Expected SparkValidationError but got a different error type');
      }
      
      // Verify telemetry was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:lightning',
        action: 'create_invoice_start'
      }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:lightning',
        action: 'create_invoice_failure'
      }));
    });
  });

  describe('payLightningInvoice', () => {
    const paymentParams: PayLightningInvoiceParams = {
      invoice: 'lnbc10n1p3zry29pp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g',
      maxFeeSats: 100
    };

    it('should successfully pay a lightning invoice', async () => {
      // Setup the mock response
      const mockPayment = {
        id: 'payment123',
        paymentHash: 'abcdef1234567890',
        amountSats: 1000,
        feeSats: 5,
        status: 'SUCCESS',
        destination: 'dest123'
      };

      // Set up mock implementation
      const wallet = await mockWallet;
      wallet.payLightningInvoice.mockResolvedValue(mockPayment);

      // Run the test
      const program = Effect.flatMap(
        Context.get(SparkService),
        service => service.payLightningInvoice(paymentParams)
      );
      
      const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      // Assertions
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit);
      expect(result.payment.id).toEqual(mockPayment.id);
      expect(result.payment.paymentHash).toEqual(mockPayment.paymentHash);
      
      // Check if the mock was called with correct params
      expect(wallet.payLightningInvoice).toHaveBeenCalledWith({
        invoice: paymentParams.invoice,
        maxFeeSats: paymentParams.maxFeeSats
      });
      
      // Verify telemetry was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:lightning',
        action: 'pay_invoice_start'
      }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:lightning',
        action: 'pay_invoice_success'
      }));
    });

    it('should handle errors when payment fails', async () => {
      // Setup the mock to throw an error
      const rpcError = new RPCError('Payment failed', { reason: 'insufficient_funds' });
      const wallet = await mockWallet;
      wallet.payLightningInvoice.mockRejectedValue(rpcError);

      // Run the test
      const program = Effect.flatMap(
        Context.get(SparkService),
        service => service.payLightningInvoice(paymentParams)
      );
      
      const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      // Assertions
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      if (error instanceof SparkRPCError) {
        expect(error.cause).toBe(rpcError);
      } else {
        fail('Expected SparkRPCError but got a different error type');
      }
      
      // Verify telemetry was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:lightning',
        action: 'pay_invoice_start'
      }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:lightning',
        action: 'pay_invoice_failure'
      }));
    });
  });

  describe('getBalance', () => {
    it('should successfully retrieve balance information', async () => {
      // Setup the mock response
      const mockBalanceResponse = {
        balance: BigInt(50000),
        tokenBalances: new Map([
          ['token1', {
            balance: BigInt(1000),
            tokenInfo: {
              tokenPublicKey: 'token1',
              tokenName: 'Test Token',
              tokenSymbol: 'TEST',
              tokenDecimals: 8
            }
          }]
        ])
      };

      // Set up mock implementation
      const wallet = await mockWallet;
      wallet.getBalance.mockResolvedValue(mockBalanceResponse);

      // Run the test
      const program = Effect.flatMap(
        Context.get(SparkService),
        service => service.getBalance()
      );
      
      const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      // Assertions
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit);
      expect(result.balance).toEqual(mockBalanceResponse.balance);
      expect(result.tokenBalances.size).toEqual(mockBalanceResponse.tokenBalances.size);
      
      // Check if the mock was called
      expect(wallet.getBalance).toHaveBeenCalled();
      
      // Verify telemetry was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:balance',
        action: 'get_balance_start'
      }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:balance',
        action: 'get_balance_success'
      }));
    });

    it('should handle errors when balance retrieval fails', async () => {
      // Setup the mock to throw an error
      const authError = new AuthError('Authentication failed');
      const wallet = await mockWallet;
      wallet.getBalance.mockRejectedValue(authError);

      // Run the test
      const program = Effect.flatMap(
        Context.get(SparkService),
        service => service.getBalance()
      );
      
      const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      // Assertions
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      if (error instanceof SparkAuthenticationError) {
        expect(error.cause).toBe(authError);
      } else {
        fail('Expected SparkAuthenticationError but got a different error type');
      }
      
      // Verify telemetry was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:balance',
        action: 'get_balance_start'
      }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:balance',
        action: 'get_balance_failure'
      }));
    });
  });

  describe('getSingleUseDepositAddress', () => {
    it('should successfully generate a deposit address', async () => {
      // Setup the mock response
      const mockAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

      // Set up mock implementation
      const wallet = await mockWallet;
      wallet.getSingleUseDepositAddress.mockResolvedValue(mockAddress);

      // Run the test
      const program = Effect.flatMap(
        Context.get(SparkService),
        service => service.getSingleUseDepositAddress()
      );
      
      const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      // Assertions
      expect(Exit.isSuccess(exit)).toBe(true);
      const result = getSuccess(exit);
      expect(result).toEqual(mockAddress);
      
      // Check if the mock was called
      expect(wallet.getSingleUseDepositAddress).toHaveBeenCalled();
      
      // Verify telemetry was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:deposit',
        action: 'get_deposit_address_start'
      }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:deposit',
        action: 'get_deposit_address_success'
      }));
    });

    it('should handle errors when address generation fails', async () => {
      // Setup the mock to throw an error
      const networkError = new NetworkError('Connection failed');
      const wallet = await mockWallet;
      wallet.getSingleUseDepositAddress.mockRejectedValue(networkError);

      // Run the test
      const program = Effect.flatMap(
        Context.get(SparkService),
        service => service.getSingleUseDepositAddress()
      );
      
      const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      // Assertions
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      if (error instanceof SparkConnectionError) {
        expect(error.cause).toBe(networkError);
      } else {
        fail('Expected SparkConnectionError but got a different error type');
      }
      
      // Verify telemetry was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:deposit',
        action: 'get_deposit_address_start'
      }));
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:deposit',
        action: 'get_deposit_address_failure'
      }));
    });
  });

  describe('wallet initialization', () => {
    it('should fail with SparkConfigError if initialization fails', async () => {
      // Mock the SparkWallet.initialize to reject
      const initError = new Error('Initialization failed');
      (SparkSDK.SparkWallet as any).initialize.mockRejectedValueOnce(initError);

      // Run the test - We can use any service method since wallet initialization happens on layer creation
      const program = Effect.flatMap(
        Context.get(SparkService),
        service => service.getBalance()
      );
      
      const exit = await Effect.runPromiseExit(Effect.provide(program, testLayer));
      
      // Assertions
      expect(Exit.isFailure(exit)).toBe(true);
      const error = getFailure(exit);
      if (error instanceof SparkConfigError) {
        expect(error.cause).toBe(initError);
      } else {
        fail('Expected SparkConfigError but got a different error type');
      }
      
      // Verify telemetry was tracked for initialization
      expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
        category: 'spark:init',
        action: 'wallet_initialize_start'
      }));
    });
  });
});