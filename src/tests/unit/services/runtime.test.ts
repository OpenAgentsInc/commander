import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Effect, Layer, Stream } from 'effect';
import { FullAppLayer } from '@/services/runtime';
import { AgentLanguageModel } from '@/services/ai/core';

// Mock the problematic dependencies before importing them
vi.mock('@buildonspark/spark-sdk', () => {
  const mockWalletInstance = {
    createLightningInvoice: vi.fn().mockResolvedValue({ 
      invoice: { 
        encodedInvoice: 'mockInvoiceFromSdk', 
        paymentHash: 'mockHashFromSdk', 
        amountSats: 100, 
        createdAt: '2023-01-01T00:00:00Z', 
        expiresAt: '2023-01-01T01:00:00Z' 
      } 
    }),
    getInvoiceStatus: vi.fn().mockResolvedValue({ status: 'paid' }),
    signMessage: vi.fn().mockResolvedValue('mockedSignature')
  };
  
  return {
    SparkWallet: {
      initialize: vi.fn().mockResolvedValue({ wallet: mockWalletInstance })
    }
  };
});

// Mock XMLHttpRequest for testing
class MockXMLHttpRequest {
  open = vi.fn();
  send = vi.fn();
  setRequestHeader = vi.fn();
  onload = null;
  onerror = null;
  responseText = '{}';
  status = 200;
}

describe('Effect Runtime Initialization', () => {
  beforeEach(() => {
    // Set up global.XMLHttpRequest mock
    global.XMLHttpRequest = MockXMLHttpRequest as any;
  });

  it('should successfully build the FullAppLayer context without missing services', async () => {
    // This program attempts to build the full application context.
    // If any service is missing from the layer composition, Layer.toRuntime will fail.
    const program = Layer.toRuntime(FullAppLayer).pipe(Effect.scoped);

    // Expecting this to resolve. If it rejects, the test fails, indicating a problem
    // in FullAppLayer composition (e.g., "Service not found").
    await expect(Effect.runPromise(program)).resolves.toBeDefined();
  });
  
  it('should successfully resolve AgentLanguageModel from FullAppLayer', async () => {
    // This program attempts to extract the AgentLanguageModel from the full runtime
    const program = Effect.flatMap(
      AgentLanguageModel,
      service => Effect.succeed(service)
    );

    // Using the FullAppLayer, which should now include OpenAIAgentLanguageModelLive
    const result = await Effect.runPromise(Effect.provide(program, FullAppLayer));
    
    // Verify the service was resolved successfully
    expect(result).toBeDefined();
    expect(result._tag).toBe('AgentLanguageModel');
  });
});