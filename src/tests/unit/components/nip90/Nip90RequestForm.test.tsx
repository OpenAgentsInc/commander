import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a new QueryClient for each test
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Simply test that we can render the component without errors
describe('Nip90RequestForm', () => {
  it('renders without crashing', () => {
    expect(() => {
      render(
        <QueryClientProvider client={queryClient}>
          <Nip90RequestForm />
        </QueryClientProvider>
      );
    }).not.toThrow();
  });
});