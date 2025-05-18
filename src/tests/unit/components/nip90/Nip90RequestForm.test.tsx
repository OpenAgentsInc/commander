import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Effect, Layer } from 'effect';

// Import the services we need to mock
import { NostrService as NostrServiceTag, DefaultNostrServiceConfigLayer, type NostrEvent } from '@/services/nostr';
import { NIP04Service as NIP04ServiceTag } from '@/services/nip04';
import * as nostrToolsPure from 'nostr-tools/pure';

// Create a new QueryClient for each test
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock nostr-tools/pure for key generation and event finalization
vi.mock('nostr-tools/pure', async (importOriginal) => {
  const original = await importOriginal<typeof nostrToolsPure>();
  return {
    ...original,
    generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)),
    getPublicKey: vi.fn((sk) => original.getPublicKey(sk)), // Use original getPublicKey for consistency
    finalizeEvent: vi.fn((template, sk) => {
      const pk = original.getPublicKey(sk); // sk here is our mock Uint8Array(32).fill(1)
      return {
        ...template,
        id: 'mockEventId' + Date.now(),
        pubkey: pk, // This will be derived from the mocked sk
        sig: 'mockSignature' + Date.now(),
        tags: template.tags || [],
        content: template.content || '', // Content will be set by mocked NIP04Service
      } as NostrEvent;
    }),
  };
});

// Mock services
const mockPublishEventActual = vi.fn(() => Effect.succeed(undefined));
const MockNostrServiceLayer = Layer.succeed(NostrServiceTag, {
  getPool: vi.fn(() => Effect.die("Not implemented")),
  listEvents: vi.fn(() => Effect.die("Not implemented")),
  publishEvent: mockPublishEventActual,
  cleanupPool: vi.fn(() => Effect.die("Not implemented")),
});

const mockNip04EncryptFn = vi.fn(() => Effect.succeed("mock-encrypted-content-from-nip04-service"));
const MockNIP04ServiceLayer = Layer.succeed(NIP04ServiceTag, {
  encrypt: mockNip04EncryptFn,
  decrypt: vi.fn(() => Effect.succeed("mock-decrypted-content")),
});

// Combined layer for tests
const TestAppFormLayer = Layer.mergeAll(
  Layer.provide(MockNostrServiceLayer, DefaultNostrServiceConfigLayer),
  MockNIP04ServiceLayer
);

// Helper to render component with test layers
const renderComponentWithTestLayer = () => render(
  <QueryClientProvider client={queryClient}>
    <Effect.Provider effect={TestAppFormLayer}>
      <Nip90RequestForm />
    </Effect.Provider>
  </QueryClientProvider>
);

describe('Nip90RequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => renderComponentWithTestLayer()).not.toThrow();
    expect(screen.getByLabelText(/Job Kind/i)).toBeInTheDocument();
  });

  it('should update state when input fields are changed', () => {
    renderComponentWithTestLayer();
    const jobKindInput = screen.getByLabelText(/Job Kind/i) as HTMLInputElement;
    fireEvent.change(jobKindInput, { target: { value: '5001' } });
    expect(jobKindInput.value).toBe('5001');
  });

  it('should call NostrService and NIP04Service on submit with encrypted content', async () => {
    renderComponentWithTestLayer();

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/Job Kind/i), { target: { value: '5100' } });
    fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Encrypt this!' } });
    fireEvent.change(screen.getByLabelText(/Output MIME Type/i), { target: { value: 'text/special' } });
    fireEvent.change(screen.getByLabelText(/Bid Amount \(msats\)/i), { target: { value: '3000' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));

    // Wait for success message
    await waitFor(async () => {
      expect(await screen.findByText(/Success! Event ID: mockEventId/i)).toBeInTheDocument();
    });

    // Verify service calls
    expect(nostrToolsPure.generateSecretKey).toHaveBeenCalledTimes(1);

    // Check NIP04Service.encrypt was called
    expect(mockNip04EncryptFn).toHaveBeenCalledTimes(1);
    const expectedPlaintextForEncryption = JSON.stringify([['i', 'Encrypt this!', 'text']]);
    const ephemeralSkUsed = (nostrToolsPure.generateSecretKey as vi.Mock).mock.results[0].value;
    expect(mockNip04EncryptFn).toHaveBeenCalledWith(
      ephemeralSkUsed, // The ephemeral SK generated in the form
      expect.any(String), // DVM PubKey
      expectedPlaintextForEncryption
    );

    // Check NostrService.publishEvent was called
    expect(mockPublishEventActual).toHaveBeenCalledTimes(1);
    const publishedEvent = mockPublishEventActual.mock.calls[0][0] as NostrEvent;

    expect(publishedEvent.kind).toBe(5100);
    expect(publishedEvent.content).toBe("mock-encrypted-content-from-nip04-service");
    expect(publishedEvent.tags).toEqual(expect.arrayContaining([
      ['p', expect.any(String)], // DVM pubkey
      ['encrypted'],
      ['output', 'text/special'],
      ['bid', '3000'],
    ]));
    // The 'i' tag should be inside encrypted content, not in the tags array
    expect(publishedEvent.tags.some(t => t[0] === 'i')).toBe(false);
  });

  it('should display loading, success, and error messages correctly', async () => {
    // Test loading state
    mockPublishEventActual.mockImplementationOnce(() =>
      Effect.suspend(() => new Promise(resolve => setTimeout(() => resolve(Effect.succeed(undefined)), 50)))
    );
    renderComponentWithTestLayer();
    fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Test Feedback' } });
    fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));
    expect(await screen.findByText(/Publishing.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publishing.../i})).toBeDisabled();

    // Wait for success
    expect(await screen.findByText(/Success! Event ID: mockEventId/i, {}, {timeout: 200})).toBeInTheDocument();

    // Test error state
    mockPublishEventActual.mockImplementationOnce(() => Effect.fail(new Error("Custom Relay Error Publish")));
    renderComponentWithTestLayer(); // Use a fresh instance for error testing
    fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Another prompt for error' } });
    fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));
    expect(await screen.findByText(/Error: Publishing failed: Custom Relay Error Publish/i)).toBeInTheDocument();
  });
});