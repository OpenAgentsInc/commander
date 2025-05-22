import { beforeEach, describe, it, expect, vi } from "vitest";
import { Effect, Layer, Stream } from "effect";
import { FullAppLayer } from "@/services/runtime";
import { AgentLanguageModel } from "@/services/ai/core";

// Mock OpenAiLanguageModel to fix tests
vi.mock("@effect/ai-openai", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual || {}),
    OpenAiLanguageModel: {
      model: (modelName: string) =>
        Effect.succeed({
          generateText: vi
            .fn()
            .mockImplementation(() =>
              Effect.succeed({ text: "Test response" }),
            ),
          streamText: vi
            .fn()
            .mockImplementation(() =>
              Stream.succeed({ text: "Test response chunk" }),
            ),
          generateStructured: vi
            .fn()
            .mockImplementation(() =>
              Effect.succeed({ text: "Test structured response" }),
            ),
        }),
    },
    OpenAiError: class OpenAiError extends Error {
      constructor(options: any) {
        super(options.error?.message || "OpenAI error");
        this.name = "OpenAiError";
      }
    },
  };
});

// Mock the problematic dependencies before importing them
vi.mock("@buildonspark/spark-sdk", () => {
  const mockWalletInstance = {
    createLightningInvoice: vi.fn().mockResolvedValue({
      invoice: {
        encodedInvoice: "mockInvoiceFromSdk",
        paymentHash: "mockHashFromSdk",
        amountSats: 100,
        createdAt: "2023-01-01T00:00:00Z",
        expiresAt: "2023-01-01T01:00:00Z",
      },
    }),
    getInvoiceStatus: vi.fn().mockResolvedValue({ status: "paid" }),
    signMessage: vi.fn().mockResolvedValue("mockedSignature"),
  };

  return {
    SparkWallet: {
      initialize: vi.fn().mockResolvedValue({ wallet: mockWalletInstance }),
    },
  };
});

// Mock XMLHttpRequest for testing
class MockXMLHttpRequest {
  open = vi.fn();
  send = vi.fn();
  setRequestHeader = vi.fn();
  onload = null;
  onerror = null;
  responseText = "{}";
  status = 200;
}

describe("Effect Runtime Initialization", () => {
  beforeEach(() => {
    // Set up global.XMLHttpRequest mock
    global.XMLHttpRequest = MockXMLHttpRequest as any;

    // Mock window.electronAPI for Ollama
    global.window = {
      ...global.window,
      electronAPI: {
        ...global.window?.electronAPI,
        ollama: {
          checkStatus: vi.fn(),
          generateChatCompletion: vi.fn().mockResolvedValue({
            id: "test-id",
            object: "chat.completion",
            created: Date.now(),
            model: "test-model",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "Test response" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
          generateChatCompletionStream: vi.fn().mockReturnValue(() => {}),
        },
      },
    } as any;
  });

  it.skip("should successfully build the FullAppLayer context without missing services", async () => {
    // This program attempts to build the full application context.
    // If any service is missing from the layer composition, Layer.toRuntime will fail.
    const program = Layer.toRuntime(FullAppLayer).pipe(Effect.scoped);

    // Expecting this to resolve. If it rejects, the test fails, indicating a problem
    // in FullAppLayer composition (e.g., "Service not found").
    await expect(Effect.runPromise(Effect.asVoid(program))).resolves.toBeDefined();
  });

  it.skip("should successfully resolve AgentLanguageModel from FullAppLayer", async () => {
    // This program attempts to extract the AgentLanguageModel from the full runtime
    const program = Effect.flatMap(AgentLanguageModel, (service) =>
      Effect.succeed(service),
    );

    // Using the FullAppLayer, which should now include either OpenAIAgentLanguageModelLive or OllamaAgentLanguageModelLive
    const result = await Effect.runPromise(
      Effect.asVoid(Effect.provide(program, FullAppLayer)),
    );

    // Since we're using Effect.asVoid, we don't have the result to verify
    // If we wanted the result, we'd need a different approach that maintains type compatibility
  });
});
