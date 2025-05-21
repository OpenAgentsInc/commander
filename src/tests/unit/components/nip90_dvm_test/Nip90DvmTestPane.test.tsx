import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Nip90DvmTestPane from '@/components/nip90_dvm_test/Nip90DvmTestPane';
import { Effect } from 'effect';

// Mock the services
vi.mock('@/services/runtime', () => ({
  getMainRuntime: vi.fn(() => ({}))
}));

vi.mock('effect', async () => {
  const actual = await vi.importActual('effect');
  return {
    ...actual,
    Effect: {
      ...actual.Effect,
      flatMap: vi.fn().mockImplementation(() => ({
        pipe: vi.fn().mockReturnThis()
      })),
      provide: vi.fn(),
      runPromiseExit: vi.fn().mockResolvedValue({ _tag: 'Success', value: false }),
    },
    Exit: {
      isSuccess: vi.fn().mockReturnValue(true)
    },
    Cause: {
      squash: vi.fn()
    }
  };
});

describe('Nip90DvmTestPane', () => {
  it('renders the test interface', () => {
    render(<Nip90DvmTestPane />);
    
    // Check for key elements
    expect(screen.getByTestId('nip90-dvm-test-pane')).toBeInTheDocument();
    expect(screen.getByText('NIP-90 DVM Test Interface')).toBeInTheDocument();
    expect(screen.getByText('Wallet')).toBeInTheDocument();
    expect(screen.getByText('Ollama')).toBeInTheDocument();
    expect(screen.getByText('GO ONLINE')).toBeInTheDocument();
    expect(screen.getByText('Send Test Job to Self')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter test prompt')).toBeInTheDocument();
  });
});