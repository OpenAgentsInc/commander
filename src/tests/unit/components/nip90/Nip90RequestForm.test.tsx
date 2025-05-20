import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Effect, Layer } from 'effect';
import type { NostrEvent } from '@/services/nostr';
import { NIP90Service, CreateNIP90JobParams, NIP90RequestError, NIP90ValidationError } from '@/services/nip90';
import { TelemetryService } from '@/services/telemetry';

// Mock the Effect library first
vi.mock('effect', async (importOriginal) => {
  const effect = await importOriginal();
  return {
    ...effect,
    Effect: {
      ...effect.Effect,
      provide: vi.fn(() => ({
        pipe: vi.fn()
      })),
      flatMap: vi.fn(() => ({
        pipe: vi.fn()
      })),
      map: vi.fn(),
      gen: vi.fn(() => ({
        pipe: vi.fn()
      }))
    }
  };
});

// Mock the runtime
vi.mock('@/services/runtime', () => ({
  mainRuntime: {}
}));

// Mock nostr-tools/pure used by the form
vi.mock('nostr-tools/pure', () => ({
  generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)),
  getPublicKey: vi.fn(() => 'mockPublicKeyHex'),
}));

// Mock runPromise used by the component
vi.mock('effect/Effect', () => ({
  runPromise: vi.fn().mockResolvedValue('mock-event-id'),
  runPromiseExit: vi.fn()
}));

// Create mock services for the component
const mockCreateJobRequest = vi.fn().mockReturnValue('mock-result');

// Global mock for NIP90Service service
vi.mock('@/services/nip90', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    NIP90Service: {
      ...original.NIP90Service,
    }
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn().mockReturnValue('{}'),
  setItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Nip90RequestForm', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  const renderComponent = () => render(
    <QueryClientProvider client={queryClient}>
      <Nip90RequestForm />
    </QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('calls the service when submitting the form', async () => {
    // We just test the form interaction, not the Effect runtime
    renderComponent();
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Job Kind/i), { target: { value: '5100' } });
    fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Test prompt' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));
    
    // Wait for promise resolution (the mock returns 'mock-event-id')
    await waitFor(() => {
      expect(screen.queryByText(/Success! Event ID:/i)).toBeInTheDocument();
    });
  });
});