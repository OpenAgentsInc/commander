import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NostrService } from '@/services/nostr';
import * as nostrToolsPure from 'nostr-tools/pure';
import { Effect, Layer } from 'effect';

const queryClient = new QueryClient();

// Mock nostr-tools/pure
vi.mock('nostr-tools/pure', async () => {
  return {
    generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)), // Mocked SK
    getPublicKey: vi.fn(() => 'mocked-public-key'),
    finalizeEvent: vi.fn((template) => {
      return {
        ...template,
        id: 'mockEventId' + Date.now(),
        pubkey: 'mocked-public-key',
        sig: 'mockSignature' + Date.now(),
        tags: template.tags || [],
        content: template.content || '',
      };
    }),
  };
});

// Mock the NostrService
const mockPublishEvent = vi.fn(() => Effect.succeed(undefined));
const TestFormLayer = Layer.succeed(
  NostrService,
  {
    getPool: vi.fn(() => Effect.fail(new Error("getPool not implemented in mock"))),
    listEvents: vi.fn(() => Effect.fail(new Error("listEvents not implemented in mock"))),
    publishEvent: mockPublishEvent,
    cleanupPool: vi.fn(() => Effect.fail(new Error("cleanupPool not implemented in mock"))),
  }
);

describe('Nip90RequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should render the form with initial fields and a submit button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Nip90RequestForm />
      </QueryClientProvider>
    );

    // Check for labels
    expect(screen.getByLabelText(/Job Kind/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Input Data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Output MIME Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bid Amount \(msats\)/i)).toBeInTheDocument();

    // Check for the submit button
    expect(screen.getByRole('button', { name: /Publish Job Request/i })).toBeInTheDocument();
  });

  it('should update state when input fields are changed', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Nip90RequestForm />
      </QueryClientProvider>
    );

    const jobKindInput = screen.getByLabelText(/Job Kind/i) as HTMLInputElement;
    fireEvent.change(jobKindInput, { target: { value: '5001' } });
    expect(jobKindInput.value).toBe('5001');

    const inputDataTextarea = screen.getByLabelText(/Input Data/i) as HTMLTextAreaElement;
    fireEvent.change(inputDataTextarea, { target: { value: 'Test prompt' } });
    expect(inputDataTextarea.value).toBe('Test prompt');

    const outputMimeInput = screen.getByLabelText(/Output MIME Type/i) as HTMLInputElement;
    fireEvent.change(outputMimeInput, { target: { value: 'application/json' } });
    expect(outputMimeInput.value).toBe('application/json');

    const bidAmountInput = screen.getByLabelText(/Bid Amount \(msats\)/i) as HTMLInputElement;
    fireEvent.change(bidAmountInput, { target: { value: '500' } });
    expect(bidAmountInput.value).toBe('500');
  });
  
  it('should call helper functions and NostrService on submit', async () => {
    // Mock successful response
    mockPublishEvent.mockImplementationOnce((event) => Effect.succeed(event.id));
    
    render(
      <QueryClientProvider client={queryClient}>
        <Effect.Provider effect={TestFormLayer}>
          <Nip90RequestForm />
        </Effect.Provider>
      </QueryClientProvider>
    );

    // Fill form fields
    fireEvent.change(screen.getByLabelText(/Job Kind/i), { target: { value: '5100' } });
    fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Generate a poem.' } });
    fireEvent.change(screen.getByLabelText(/Output MIME Type/i), { target: { value: 'text/markdown' } });
    fireEvent.change(screen.getByLabelText(/Bid Amount \(msats\)/i), { target: { value: '2000' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Publish Job Request/i }));

    // Check that key generation was called
    expect(nostrToolsPure.generateSecretKey).toHaveBeenCalledTimes(1);
    
    // Verify the event passed to publishEvent
    await waitFor(() => {
      expect(mockPublishEvent).toHaveBeenCalledTimes(1);
      const publishedEvent = mockPublishEvent.mock.calls[0][0];
      expect(publishedEvent.kind).toBe(5100);
      expect(publishedEvent.tags).toEqual(expect.arrayContaining([
        ['i', 'Generate a poem.', 'text'],
        ['output', 'text/markdown'],
        ['bid', '2000'],
      ]));
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/Success! Event ID:/i)).toBeInTheDocument();
    });
  });
  
  it('should display error message when validation fails', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Nip90RequestForm />
      </QueryClientProvider>
    );
    
    // Leave input data empty
    fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: '' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Publish Job Request/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Error: Input Data cannot be empty/i)).toBeInTheDocument();
    });
  });
  
  it('should display error message when publishing fails', async () => {
    // Mock a failed publish
    mockPublishEvent.mockImplementationOnce(() => Effect.fail(new Error("Failed to publish to relay")));
    
    render(
      <QueryClientProvider client={queryClient}>
        <Effect.Provider effect={TestFormLayer}>
          <Nip90RequestForm />
        </Effect.Provider>
      </QueryClientProvider>
    );
    
    // Fill form with valid data
    fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Test content' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Publish Job Request/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Error: Publishing failed: Failed to publish to relay/i)).toBeInTheDocument();
    });
  });
});