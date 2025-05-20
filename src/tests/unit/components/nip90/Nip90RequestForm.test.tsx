import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Effect and other dependencies first, before any imports happen
vi.mock('effect', () => {
  // Create a fixed Effect succeed implementation that doesn't depend on importing the actual module
  const mockSucceed = vi.fn().mockImplementation((value) => ({
    _tag: 'Success',
    value
  }));
  
  return {
    Effect: {
      gen: () => ({ pipe: vi.fn() }),
      flatMap: vi.fn(),
      succeed: mockSucceed,
      fail: vi.fn(),
      provide: vi.fn(),
      runPromise: vi.fn().mockResolvedValue({}),
      runPromiseExit: vi.fn().mockResolvedValue({
        _tag: 'Success',
        value: 'mockEventId123',
      }),
      mapError: vi.fn(),
      timeout: vi.fn(),
      tryPromise: vi.fn(),
      void: { _tag: 'Success', value: undefined },
    },
    Schema: {
      String: { _tag: 'String' },
      Number: { _tag: 'Number' },
      Boolean: { _tag: 'Boolean' },
      Struct: vi.fn(),
      array: vi.fn((schema) => ({ _tag: 'Array', element: schema })),
      Array: vi.fn((schema) => ({ _tag: 'Array', element: schema })),
      Union: vi.fn(),
      Literal: vi.fn(),
      optional: vi.fn(),
      filter: vi.fn(),
      pipe: vi.fn(),
      instanceOf: vi.fn(),
      Tuple: vi.fn(),
    },
    Layer: {
      succeed: vi.fn(),
      provide: vi.fn(),
      mergeAll: vi.fn(),
    },
    Exit: {
      isSuccess: vi.fn(() => true),
      isFailure: vi.fn(() => false), 
    },
    Cause: {
      pretty: vi.fn(),
      failureOption: vi.fn(() => ({
        _tag: 'Some',
        value: { message: 'Test error' }
      })),
      isCause: vi.fn(() => false),
    },
    Option: {
      getOrThrow: vi.fn(x => x),
    },
    Context: {
      GenericTag: vi.fn(() => Symbol('GenericServiceTag')),
    },
    Data: {
      TaggedError: vi.fn(() => class {} ),
    },
  };
});

// Mock all other dependencies
vi.mock('@/services/nip04', () => ({
  NIP04Service: vi.fn(),
  NIP04ServiceLive: vi.fn(),
  NIP04EncryptError: class {},
  NIP04DecryptError: class {},
}));

vi.mock('@/services/nostr', () => ({
  NostrService: vi.fn(),
  NostrServiceLive: vi.fn(),
  DefaultNostrServiceConfigLayer: vi.fn(),
}));

vi.mock('@/services/telemetry', () => ({
  TelemetryService: {
    pipe: vi.fn(),
  },
  TelemetryServiceLive: {
    pipe: vi.fn(),
  },
  // Don't need 'type' as it's not a runtime export
}));

vi.mock('@/helpers/nip90/event_creation', () => ({
  createNip90JobRequest: vi.fn(() => ({ pipe: vi.fn() })),
}));

vi.mock('nostr-tools/pure', () => ({
  generateSecretKey: vi.fn(() => new Uint8Array(32)),
  getPublicKey: vi.fn(() => 'mock-pubkey'),
  finalizeEvent: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn().mockReturnValue('{}'),
  setItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Simple tests that don't rely on complex mocking
describe('Nip90RequestForm', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderComponent = () => render(
    <QueryClientProvider client={queryClient}>
      <Nip90RequestForm />
    </QueryClientProvider>
  );

  it('renders form elements correctly', () => {
    renderComponent();
    expect(screen.getByLabelText(/Job Kind/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Input Data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Output MIME Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bid Amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish.*Request/i })).toBeInTheDocument();
  });

  it('allows input values to be changed', () => {
    renderComponent();
    
    const jobKindInput = screen.getByLabelText(/Job Kind/i) as HTMLInputElement;
    fireEvent.change(jobKindInput, { target: { value: '5001' } });
    expect(jobKindInput.value).toBe('5001');
    
    const inputDataArea = screen.getByLabelText(/Input Data/i) as HTMLTextAreaElement;
    fireEvent.change(inputDataArea, { target: { value: 'Test input' } });
    expect(inputDataArea.value).toBe('Test input');
  });
});