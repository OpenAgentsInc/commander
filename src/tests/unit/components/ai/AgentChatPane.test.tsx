import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgentChatPane from '@/components/ai/AgentChatPane';
import { type UIAgentChatMessage } from '@/hooks/ai/useAgentChat';
import { AIProviderError } from '@/services/ai/core';

// Mock runtime and chatbook hook
vi.mock('@/services/runtime', () => ({
  getMainRuntime: () => ({
    context: {
      get: vi.fn()
    }
  }),
}));

// Mock the useAgentChat hook
vi.mock('@/hooks/ai/useAgentChat', () => ({
  useAgentChat: vi.fn(() => ({
    messages: [
      {
        id: 'system-1',
        role: 'system',
        content: "You are Commander's AI Agent. Be helpful and concise.",
        timestamp: Date.now()
      }
    ],
    currentInput: '',
    setCurrentInput: vi.fn(),
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
  }))
}));

describe('AgentChatPane', () => {
  it('renders without crashing', () => {
    render(<AgentChatPane />);
    
    // Check for model info in the header
    expect(screen.getByText(/Provider:/)).toBeInTheDocument();
    expect(screen.getByText(/Model:/)).toBeInTheDocument();
    
    // Check for chat container
    expect(document.querySelector('[class*="chat"]')).toBeInTheDocument();
  });

  it('displays error when present', () => {
    // Re-mock the hook with an error
    const mockError = new AIProviderError({
      message: 'Test error message',
      provider: 'OpenAI'
    });
    
    vi.mocked(require('@/hooks/ai/useAgentChat').useAgentChat).mockReturnValue({
      messages: [],
      currentInput: '',
      setCurrentInput: vi.fn(),
      isLoading: false,
      error: mockError,
      sendMessage: vi.fn(),
    });
    
    render(<AgentChatPane />);
    
    // Check for error alert
    expect(screen.getByText('AI Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  // Additional tests would cover:
  // - Interaction with ChatContainer
  // - Input handling and message sending
  // - Streaming state visualization
  // - Telemetry event tracking
});