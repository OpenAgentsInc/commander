import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect, Layer, Stream } from "effect";
import { TelemetryService } from "@/services/telemetry";
import { ConfigurationService } from "@/services/configuration";
import { AgentLanguageModel, AiTextChunk } from "@/services/ai/core";
import { AIProviderError } from "@/services/ai/core/AIError";
import { OllamaAgentLanguageModelLive } from "@/services/ai/providers/ollama/OllamaAgentLanguageModelLive";
import { OllamaOpenAIClientTag } from "@/services/ai/providers/ollama/OllamaAsOpenAIClientLive";
import { HttpClient } from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as HttpClientError from "@effect/platform/HttpClientError";
import type {
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
  ChatCompletionResponseMessage,
  ChatCompletionMessageToolCalls,
  CompletionUsage,
  CreateEmbeddingRequest,
  CreateEmbeddingResponse,
  ListModelsResponse,
  CreateCompletionRequest,
} from "@effect/ai-openai/Generated";
import type { AiResponse } from "@effect/ai/AiResponse";

// Define a StreamChunk class to match what @effect/ai-openai expects
class StreamChunk {
  parts: Array<{ _tag: string, content: string }>;
  text: { getOrElse: () => string };
  
  constructor(options: { parts: Array<{ _tag: string, content: string }> }) {
    this.parts = options.parts;
    this.text = { 
      getOrElse: () => {
        return this.parts
          .filter(part => part._tag === "Content")
          .map(part => part.content)
          .join("");
      }
    };
  }
}

// Mock the @effect/ai-openai imports
vi.mock("@effect/ai-openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@effect/ai-openai")>();
  return {
    ...(actual || {}),
  };
});

// Mock the OpenAI client
const mockCreateChatCompletion = vi.fn();
const mockCreateEmbedding = vi.fn(() => 
  Effect.fail(new HttpClientError.RequestError({
    request: HttpClientRequest.get("https://example.com"),
    reason: "Transport",
    description: "mock createEmbedding not implemented"
  }))
);
const mockListModels = vi.fn(() => 
  Effect.fail(new HttpClientError.RequestError({
    request: HttpClientRequest.get("https://example.com"),
    reason: "Transport",
    description: "mock listModels not implemented"
  }))
);
const mockStream = vi.fn();

// Helper function to create stub methods that return Effect.fail with proper HttpClientError
const createStubMethod = (methodName: string) => 
  vi.fn((_options: any) => 
    Effect.fail(new HttpClientError.RequestError({
      request: HttpClientRequest.get("https://example.com"),
      reason: "Transport",
      description: `Not implemented in mock: ${methodName}`
    }))
  );

// Create mock client with flat structure that matches OpenAiClient.Service
const mockClientService = {
  client: {
    // Core methods that we implement for tests
    createChatCompletion: mockCreateChatCompletion,
    createEmbedding: mockCreateEmbedding,
    listModels: mockListModels,
    
    // Assistant methods
    listAssistants: createStubMethod("listAssistants"),
    createAssistant: createStubMethod("createAssistant"),
    getAssistant: createStubMethod("getAssistant"),
    modifyAssistant: createStubMethod("modifyAssistant"),
    deleteAssistant: createStubMethod("deleteAssistant"),
    
    // Speech/Audio methods
    createSpeech: createStubMethod("createSpeech"),
    createTranscription: createStubMethod("createTranscription"),
    createTranslation: createStubMethod("createTranslation"),
    
    // Batch methods
    listBatches: createStubMethod("listBatches"),
    createBatch: createStubMethod("createBatch"),
    retrieveBatch: createStubMethod("retrieveBatch"),
    cancelBatch: createStubMethod("cancelBatch"),
    
    // Legacy completions
    createCompletion: createStubMethod("createCompletion"),
    
    // File methods
    listFiles: createStubMethod("listFiles"),
    createFile: createStubMethod("createFile"),
    retrieveFile: createStubMethod("retrieveFile"),
    deleteFile: createStubMethod("deleteFile"),
    downloadFile: createStubMethod("downloadFile"),
    
    // Fine-tuning methods
    listPaginatedFineTuningJobs: createStubMethod("listPaginatedFineTuningJobs"),
    createFineTuningJob: createStubMethod("createFineTuningJob"),
    retrieveFineTuningJob: createStubMethod("retrieveFineTuningJob"),
    cancelFineTuningJob: createStubMethod("cancelFineTuningJob"),
    listFineTuningJobCheckpoints: createStubMethod("listFineTuningJobCheckpoints"),
    listFineTuningEvents: createStubMethod("listFineTuningEvents"),
    
    // Image methods
    createImageEdit: createStubMethod("createImageEdit"),
    createImage: createStubMethod("createImage"),
    createImageVariation: createStubMethod("createImageVariation"),
    
    // Model methods
    retrieveModel: createStubMethod("retrieveModel"),
    deleteModel: createStubMethod("deleteModel"),
    
    // Moderation methods
    createModeration: createStubMethod("createModeration"),
    
    // Audit logs methods
    listAuditLogs: createStubMethod("listAuditLogs"),
    
    // Invite methods
    listInvites: createStubMethod("listInvites"),
    inviteUser: createStubMethod("inviteUser"),
    retrieveInvite: createStubMethod("retrieveInvite"),
    deleteInvite: createStubMethod("deleteInvite"),
    
    // Project methods
    listProjects: createStubMethod("listProjects"),
    createProject: createStubMethod("createProject"),
    retrieveProject: createStubMethod("retrieveProject"),
    modifyProject: createStubMethod("modifyProject"),
    listProjectApiKeys: createStubMethod("listProjectApiKeys"),
    retrieveProjectApiKey: createStubMethod("retrieveProjectApiKey"),
    deleteProjectApiKey: createStubMethod("deleteProjectApiKey"),
    archiveProject: createStubMethod("archiveProject"),
    listProjectServiceAccounts: createStubMethod("listProjectServiceAccounts"),
    createProjectServiceAccount: createStubMethod("createProjectServiceAccount"),
    retrieveProjectServiceAccount: createStubMethod("retrieveProjectServiceAccount"),
    deleteProjectServiceAccount: createStubMethod("deleteProjectServiceAccount"),
    
    // Project User methods
    listProjectUsers: createStubMethod("listProjectUsers"),
    createProjectUser: createStubMethod("createProjectUser"),
    retrieveProjectUser: createStubMethod("retrieveProjectUser"),
    modifyProjectUser: createStubMethod("modifyProjectUser"),
    deleteProjectUser: createStubMethod("deleteProjectUser"),
    
    // User methods
    listUsers: createStubMethod("listUsers"),
    retrieveUser: createStubMethod("retrieveUser"),
    modifyUser: createStubMethod("modifyUser"),
    deleteUser: createStubMethod("deleteUser"),
    
    // Thread methods
    createThread: createStubMethod("createThread"),
    getThread: createStubMethod("getThread"),
    modifyThread: createStubMethod("modifyThread"),
    deleteThread: createStubMethod("deleteThread"),
    
    // Message methods
    createMessage: createStubMethod("createMessage"),
    getMessage: createStubMethod("getMessage"),
    modifyMessage: createStubMethod("modifyMessage"),
    deleteMessage: createStubMethod("deleteMessage"),
    listMessages: createStubMethod("listMessages"),
    
    // Run methods
    createRun: createStubMethod("createRun"),
    getRun: createStubMethod("getRun"),
    modifyRun: createStubMethod("modifyRun"),
    cancelRun: createStubMethod("cancelRun"),
    submitToolOuputsToRun: createStubMethod("submitToolOuputsToRun"),
    listRuns: createStubMethod("listRuns"),
    listRunSteps: createStubMethod("listRunSteps"),
    getRunStep: createStubMethod("getRunStep"),
    createThreadAndRun: createStubMethod("createThreadAndRun"),
    
    // Upload methods
    createUpload: createStubMethod("createUpload"),
    addUploadPart: createStubMethod("addUploadPart"),
    completeUpload: createStubMethod("completeUpload"),
    cancelUpload: createStubMethod("cancelUpload"),
    
    // Vector store methods
    createVectorStore: createStubMethod("createVectorStore"),
    getVectorStore: createStubMethod("getVectorStore"),
    modifyVectorStore: createStubMethod("modifyVectorStore"),
    deleteVectorStore: createStubMethod("deleteVectorStore"),
    listVectorStores: createStubMethod("listVectorStores"),
    createVectorStoreFile: createStubMethod("createVectorStoreFile"),
    getVectorStoreFile: createStubMethod("getVectorStoreFile"),
    deleteVectorStoreFile: createStubMethod("deleteVectorStoreFile"),
    listVectorStoreFiles: createStubMethod("listVectorStoreFiles"),
    createVectorStoreFileBatch: createStubMethod("createVectorStoreFileBatch"),
    getVectorStoreFileBatch: createStubMethod("getVectorStoreFileBatch"),
    cancelVectorStoreFileBatch: createStubMethod("cancelVectorStoreFileBatch"),
    listFilesInVectorStoreBatch: createStubMethod("listFilesInVectorStoreBatch"),
  },
  streamRequest: vi.fn((request: HttpClientRequest.HttpClientRequest) => 
    Stream.fail(new HttpClientError.RequestError({
      request,
      reason: "Transport",
      description: "mock streamRequest not implemented"
    }))),
  stream: mockStream,
};

const MockOllamaOpenAIClient = Layer.succeed(
  OllamaOpenAIClientTag,
  mockClientService,
);

// Mock HttpClient for OpenAiLanguageModel with all required methods
// Use the original mockHttpClient but with a symbolic property to make TypeScript happy
const mockHttpClient = {
  // Core request method
  request: vi.fn((req: HttpClientRequest.HttpClientRequest) => 
    Effect.succeed(HttpClientResponse.fromWeb(req, new Response("{}", { status: 200 })))),
  
  // HTTP method shortcuts
  execute: vi.fn((req: HttpClientRequest.HttpClientRequest) => 
    Effect.succeed(HttpClientResponse.fromWeb(req, new Response("execute mock", { status: 200 })))),
  
  get: vi.fn((url: string | URL, options?: HttpClientRequest.Options.NoBody) => {
    const req = HttpClientRequest.get(url);
    return Effect.succeed(HttpClientResponse.fromWeb(req, new Response(`get ${url} mock`, { status: 200 })));
  }),
  
  post: vi.fn((url: string | URL, options?: any) => {
    const req = HttpClientRequest.post(url);
    return Effect.succeed(HttpClientResponse.fromWeb(req, new Response(`post ${url} mock`, { status: 200 })));
  }),
  
  put: vi.fn((url: string | URL, options?: any) => {
    const req = HttpClientRequest.put(url);
    return Effect.succeed(HttpClientResponse.fromWeb(req, new Response(`put ${url} mock`, { status: 200 })));
  }),
  
  patch: vi.fn((url: string | URL, options?: any) => {
    const req = HttpClientRequest.patch(url);
    return Effect.succeed(HttpClientResponse.fromWeb(req, new Response(`patch ${url} mock`, { status: 200 })));
  }),
  
  del: vi.fn((url: string | URL, options?: any) => {
    const req = HttpClientRequest.del(url);
    return Effect.succeed(HttpClientResponse.fromWeb(req, new Response(`delete ${url} mock`, { status: 200 })));
  }),
  
  head: vi.fn((url: string | URL, options?: HttpClientRequest.Options.NoBody) => {
    const req = HttpClientRequest.head(url);
    return Effect.succeed(HttpClientResponse.fromWeb(req, new Response(`head ${url} mock`, { status: 200 })));
  }),
  
  options: vi.fn((url: string | URL, options?: HttpClientRequest.Options.NoBody) => {
    const req = HttpClientRequest.options(url);
    return Effect.succeed(HttpClientResponse.fromWeb(req, new Response(`options ${url} mock`, { status: 200 })));
  }),
  
  // Utility methods
  pipe() { 
    return this; 
  },
  toJSON: vi.fn(() => ({ _tag: "MockHttpClient" })),
};

// Special TypeScript handling - we use type assertion since we know the Effect internals will handle this
// This is a workaround for the TypeScript error regarding missing symbols
const MockHttpClient = Layer.succeed(HttpClient, mockHttpClient as unknown as HttpClient);

// Mock the chat completions create to return test data with correct error channel type
mockCreateChatCompletion.mockImplementation((params: typeof CreateChatCompletionRequest.Encoded) => {
  const mockResponseData = {
    id: "test-id",
    object: "chat.completion" as const,
    created: Date.now(),
    model: params.model || "gemma3:1b",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant" as const,
          content: "Test response",
          refusal: null, // Required by ChatCompletionResponseMessage
          tool_calls: undefined,
          function_call: undefined,
          audio: undefined
        },
        finish_reason: "stop" as const,
        logprobs: null
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
      completion_tokens_details: undefined,
      prompt_tokens_details: undefined,
    },
    system_fingerprint: undefined,
    service_tier: undefined,
  };
  // Explicitly cast to the library's response type with correct error channel
  return Effect.succeed(mockResponseData as typeof CreateChatCompletionResponse.Type) as Effect.Effect<
    typeof CreateChatCompletionResponse.Type,
    HttpClientError.HttpClientError
  >;
});

// Mock the stream to return a Stream of chunks with proper format and error channel
mockStream.mockImplementation((params: typeof CreateCompletionRequest.Encoded) => {
  // Create proper StreamChunk instances
  const chunks: StreamChunk[] = [
    new StreamChunk({ 
      parts: [{ _tag: "Content", content: "Test response chunk 1 " }] 
    }),
    new StreamChunk({ 
      parts: [{ _tag: "Content", content: `for ${params.model || "unknown model"}` }]
    })
  ];
  // Return Stream with correct error channel type
  return Stream.fromIterable(chunks) as Stream.Stream<
    StreamChunk,
    HttpClientError.HttpClientError
  >;
});

// Mock TelemetryService
const mockTelemetryTrackEvent = vi
  .fn()
  .mockImplementation(() => {
    // Return an Effect that can be piped
    const effect = Effect.succeed(undefined);
    // Ensure it has a pipe method that returns the same Effect for chaining
    effect.pipe = function(...ops: any[]) {
      return effect;
    };
    return effect;
  });
const MockTelemetryService = Layer.succeed(TelemetryService, {
  trackEvent: mockTelemetryTrackEvent,
  isEnabled: vi.fn().mockImplementation(() => {
    const effect = Effect.succeed(true);
    effect.pipe = function(...ops: any[]) {
      return effect;
    };
    return effect;
  }),
  setEnabled: vi.fn().mockImplementation(() => {
    const effect = Effect.succeed(undefined);
    effect.pipe = function(...ops: any[]) {
      return effect;
    };
    return effect;
  }),
});

// Mock ConfigurationService
const mockConfigGet = vi.fn().mockImplementation((key) => {
  const effect = key === "OLLAMA_MODEL_NAME" 
    ? Effect.succeed("gemma3:1b") 
    : Effect.fail({ message: `Key not found: ${key}` });
  
  // Add pipe method to the effect
  effect.pipe = function(...ops: any[]) {
    return effect;
  };
  
  return effect;
});

const MockConfigurationService = Layer.succeed(ConfigurationService, {
  get: mockConfigGet,
  getSecret: vi.fn().mockImplementation(() => {
    const effect = Effect.fail({ message: "Not implemented" });
    effect.pipe = function(...ops: any[]) {
      return effect;
    };
    return effect;
  }),
  set: vi.fn().mockImplementation(() => {
    const effect = Effect.succeed(undefined);
    effect.pipe = function(...ops: any[]) {
      return effect;
    };
    return effect;
  }),
  delete: vi.fn().mockImplementation(() => {
    const effect = Effect.succeed(undefined);
    effect.pipe = function(...ops: any[]) {
      return effect;
    };
    return effect;
  }),
});

// Fix for Effect.runPromise TypeScript errors
// This wraps the Effect in an unsafeRunPromise to avoid the 'never' type constraint issue
const runTestEffect = <A, E>(effect: Effect.Effect<A, E, any>): Promise<A> => {
  return Effect.unsafeRunPromise(effect as Effect.Effect<A, E, never>);
};

describe("OllamaAgentLanguageModelLive", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Mock successful response from Ollama - note our configuration mock is now in the global setup
    mockCreateChatCompletion.mockImplementation((params) => {
      // Return an Effect for non-streaming requests
      const mockResponseData = {
        id: "test-id",
        object: "chat.completion" as const,
        created: Date.now(),
        model: params.model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant" as const,
              content: "Test response",
              refusal: null, // Required by ChatCompletionResponseMessage
              tool_calls: undefined,
              function_call: undefined,
              audio: undefined
            },
            finish_reason: "stop" as const,
            logprobs: null
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
          completion_tokens_details: undefined,
          prompt_tokens_details: undefined,
        },
        system_fingerprint: undefined,
        service_tier: undefined,
      };
      // Create an Effect with explicit error channel
      return Effect.succeed(mockResponseData as typeof CreateChatCompletionResponse.Type) as Effect.Effect<
        typeof CreateChatCompletionResponse.Type,
        HttpClientError.HttpClientError
      >;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully build the layer and provide AgentLanguageModel", async () => {
    const program = Effect.gen(function* (_) {
      const agentLM = yield* _(AgentLanguageModel);
      expect(agentLM).toBeDefined();
      expect(agentLM._tag).toBe("AgentLanguageModel");
      expect(typeof agentLM.generateText).toBe("function");
      expect(typeof agentLM.streamText).toBe("function");
      expect(typeof agentLM.generateStructured).toBe("function");
      return true;
    });

    const result = await runTestEffect(
      program.pipe(
        Effect.provide(
          OllamaAgentLanguageModelLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                MockOllamaOpenAIClient,
                MockConfigurationService,
                MockTelemetryService,
                MockHttpClient, // CRUCIAL: Provides HttpClient.HttpClient
              ),
            ),
          ),
        ),
      ),
    );

    expect(result).toBe(true);
    expect(mockConfigGet).toHaveBeenCalledWith("OLLAMA_MODEL_NAME");
    expect(mockTelemetryTrackEvent).toHaveBeenCalled();
  });

  it("should use default model name if config value is not found", async () => {
    // Override mock to simulate missing config
    mockConfigGet.mockImplementation(() =>
      Effect.fail({ message: "Key not found: OLLAMA_MODEL_NAME" }),
    );

    const program = Effect.gen(function* (_) {
      const agentLM = yield* _(AgentLanguageModel);
      const result = yield* _(agentLM.generateText({ prompt: "test" }));
      return result;
    });

    await runTestEffect(
      program.pipe(
        Effect.provide(
          OllamaAgentLanguageModelLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                MockOllamaOpenAIClient,
                MockConfigurationService,
                MockTelemetryService,
                MockHttpClient, // CRUCIAL: Provides HttpClient.HttpClient
              ),
            ),
          ),
        ),
      ),
    );

    // Verify the default model was used
    expect(mockCreateChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemma3:1b", // This is the default in OllamaAgentLanguageModelLive
      }),
    );
  });

  it("should properly call generateText with correct parameters", async () => {
    const program = Effect.gen(function* (_) {
      const agentLM = yield* _(AgentLanguageModel);
      const result = yield* _(
        agentLM.generateText({
          prompt: "Test prompt",
          temperature: 0.7,
          maxTokens: 100,
        }),
      );
      return result;
    });

    await runTestEffect(
      program.pipe(
        Effect.provide(
          OllamaAgentLanguageModelLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                MockOllamaOpenAIClient,
                MockConfigurationService,
                MockTelemetryService,
                MockHttpClient, // CRUCIAL: Provides HttpClient.HttpClient
              ),
            ),
          ),
        ),
      ),
    );

    expect(mockCreateChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemma3:1b",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: "Test prompt",
          }),
        ]),
        temperature: 0.7,
        max_tokens: 100,
        stream: false,
      }),
    );
  });

  it("should properly map errors from the client to AIProviderError", async () => {
    // Mock an error response with proper HttpClientError
    mockCreateChatCompletion.mockImplementation(() => {
      const request = HttpClientRequest.post("test-model-error");
      const webResponse = new Response("Mocked Client Error", { status: 500 });
      return Effect.fail(
        new HttpClientError.ResponseError({
          request,
          response: HttpClientResponse.fromWeb(request, webResponse),
          reason: "StatusCode",
          description: "Simulated client error for testing error mapping in SUT",
        })
      ) as Effect.Effect<
        typeof CreateChatCompletionResponse.Type,
        HttpClientError.HttpClientError
      >;
    });

    const program = Effect.gen(function* (_) {
      const agentLM = yield* _(AgentLanguageModel);
      return yield* _(
        agentLM.generateText({
          prompt: "Test prompt",
        }),
      );
    });

    await expect(
      runTestEffect(
        program.pipe(
          Effect.provide(
            OllamaAgentLanguageModelLive.pipe(
              Layer.provide(
                Layer.mergeAll(
                  MockOllamaOpenAIClient,
                  MockConfigurationService,
                  MockTelemetryService,
                  MockHttpClient, // CRUCIAL: Provides HttpClient.HttpClient
                ),
              ),
            ),
          ),
        ),
      ),
    ).rejects.toBeInstanceOf(AIProviderError);
  });
});