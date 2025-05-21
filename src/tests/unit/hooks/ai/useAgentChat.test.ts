import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentChat } from '@/hooks/ai/useAgentChat';
import { AgentLanguageModel } from '@/services/ai/core';
import { TelemetryService } from '@/services/telemetry';
import { Effect, Stream, Context, Layer, Runtime } from 'effect';

// Mock services
const mockStreamText = vi.fn();
const mockGenerateText = vi.fn();
const mockGenerateStructured = vi.fn();

const mockAgentLanguageModel = {
  _tag: "AgentLanguageModel",
  generateText: mockGenerateText,
  streamText: mockStreamText,
  generateStructured: mockGenerateStructured,
};

const mockTrackEvent = vi.fn(() => Effect.void);
const mockTelemetryService = {
  trackEvent: mockTrackEvent,
  isEnabled: vi.fn(() => Effect.succeed(true)),
  setEnabled: vi.fn(() => Effect.void),
};

// Create test runtime
const TestAgentLMLayer = Layer.succeed(AgentLanguageModel, mockAgentLanguageModel);
const TestTelemetryLayer = Layer.succeed(TelemetryService, mockTelemetryService);
const TestRuntimeLayer = Layer.merge(TestAgentLMLayer, TestTelemetryLayer);
const testContext = Context.empty().pipe(
  Context.add(AgentLanguageModel, mockAgentLanguageModel),
  Context.add(TelemetryService, mockTelemetryService)
);
const testRuntime = Runtime.make(testContext);

// Mock getMainRuntime
vi.mock('@/services/runtime', () => ({
  getMainRuntime: () => testRuntime,
}));

// Wait for a short time to allow state updates
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('useAgentChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('initializes with system message', () => {
    const { result } = renderHook(() => useAgentChat({
      initialSystemMessage: "Test system message"
    }));

    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].role).toBe('system');
    expect(result.current.messages[0].content).toBe('Test system message');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.currentInput).toBe('');
  });

  it('sends a message and updates state', async () => {
    // Setup mock to return a stream of chunks
    mockStreamText.mockReturnValue(Stream.fromIterable([
      { text: "Hello" },
      { text: " world" }
    ]));

    const { result } = renderHook(() => useAgentChat());

    // Send a message
    await act(async () => {
      result.current.sendMessage('Test message');
      await flushPromises();
    });

    // Check user message was added
    expect(result.current.messages.length).toBe(3); // system + user + assistant
    expect(result.current.messages[1].role).toBe('user');
    expect(result.current.messages[1].content).toBe('Test message');
    
    // Verify streamText was called with correct options
    expect(mockStreamText).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Test message' })
        ])
      })
    }));

    // Verify telemetry was called
    expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
      category: 'agent_chat',
      action: 'send_message_start'
    }));
  });

  // Note: Full stream testing would be more complex and requires
  // mocking Effect.runFork behavior to simulate chunk delivery
  // This is a minimal test to validate the core logic
});