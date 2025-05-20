import { vi } from 'vitest';

// Define mock error classes for export
export class MockNetworkError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'NetworkError';
    this.context = context;
    this.originalError = originalError;
  }
}

export class MockValidationError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'ValidationError';
    this.context = context;
    this.originalError = originalError;
  }
}

export class MockAuthError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'AuthError';
    this.context = context;
    this.originalError = originalError;
  }
}

export class MockRPCError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'RPCError';
    this.context = context;
    this.originalError = originalError;
  }
}

export class MockConfigError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'ConfigError';
    this.context = context;
    this.originalError = originalError;
  }
}

export class MockNotImplementedError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'NotImplementedError';
    this.context = context;
    this.originalError = originalError;
  }
}

export class MockSparkSDKError extends Error {
  context: any;
  originalError: any;
  constructor(message: string, context = {}, originalError: any = null) {
    super(message);
    this.name = 'SparkSDKError';
    this.context = context;
    this.originalError = originalError;
  }
}

// Create mock functions
export const createLightningInvoiceMock = vi.fn();
export const payLightningInvoiceMock = vi.fn();
export const getBalanceMock = vi.fn();
export const getSingleUseDepositAddressMock = vi.fn();
export const cleanupConnectionsMock = vi.fn().mockResolvedValue(undefined);
export const initializeMock = vi.fn().mockResolvedValue({
  wallet: {
    createLightningInvoice: createLightningInvoiceMock,
    payLightningInvoice: payLightningInvoiceMock,
    getBalance: getBalanceMock,
    getSingleUseDepositAddress: getSingleUseDepositAddressMock,
    cleanupConnections: cleanupConnectionsMock
  }
});