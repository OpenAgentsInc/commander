import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect, Layer, Stream } from "effect";
import { TelemetryService } from "@/services/telemetry";
import { ConfigurationService } from "@/services/configuration";
import { AgentLanguageModel } from "@/services/ai/core";
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
  ListModelsResponse
} from "@effect/ai-openai/Generated";

// Mock the @effect/ai-openai imports
vi.mock("@effect/ai-openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@effect/ai-openai")>();
  return {
    ...(actual || {}),
  };
});

// Mock the OpenAI client
const mockCreateChatCompletion = vi.fn();
const mockCreateEmbedding = vi.fn(() => Effect.die("mock createEmbedding not implemented"));
const mockListModels = vi.fn(() => Effect.die("mock listModels not implemented"));
const mockStream = vi.fn();

// Helper function to create stub methods that return Effect.die
const createStubMethod = (methodName: string) => 
  vi.fn((_options: any) => Effect.die(`Not implemented in mock: ${methodName}`));

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
    Stream.die("mock streamRequest not implemented")),
  stream: mockStream,
};

const MockOllamaOpenAIClient = Layer.succeed(
  OllamaOpenAIClientTag,
  mockClientService,
);

// Mock HttpClient for OpenAiLanguageModel with all required methods
const mockHttpClient = {
  // Core request method
  request: vi.fn((req: HttpClientRequest.HttpClientRequest) => 
    Effect.succeed({ status: 200, body: {}, headers: new Headers() })),
  
  // HTTP method shortcuts
  execute: vi.fn((req: HttpClientRequest.HttpClientRequest) => 
    Effect.succeed({ status: 200, body: "execute mock", headers: new Headers() })),
  
  get: vi.fn((url: string | URL, options?: HttpClientRequest.Options.NoBody) => 
    Effect.succeed({ status: 200, body: `get ${url} mock`, headers: new Headers() })),
  
  post: vi.fn((url: string | URL, options?: any) => 
    Effect.succeed({ status: 200, body: `post ${url} mock`, headers: new Headers() })),
  
  put: vi.fn((url: string | URL, options?: any) => 
    Effect.succeed({ status: 200, body: `put ${url} mock`, headers: new Headers() })),
  
  patch: vi.fn((url: string | URL, options?: any) => 
    Effect.succeed({ status: 200, body: `patch ${url} mock`, headers: new Headers() })),
  
  del: vi.fn((url: string | URL, options?: any) => 
    Effect.succeed({ status: 200, body: `delete ${url} mock`, headers: new Headers() })),
  
  head: vi.fn((url: string | URL, options?: HttpClientRequest.Options.NoBody) => 
    Effect.succeed({ status: 200, body: `head ${url} mock`, headers: new Headers() })),
  
  options: vi.fn((url: string | URL, options?: HttpClientRequest.Options.NoBody) => 
    Effect.succeed({ status: 200, body: `options ${url} mock`, headers: new Headers() })),
  
  // Utility methods
  pipe(): any { return this; },
  toJSON: vi.fn(() => ({ _tag: "MockHttpClient" })),
};

const MockHttpClient = Layer.succeed(HttpClient, mockHttpClient as HttpClient);

// Mock the chat completions create to return test data
mockCreateChatCompletion.mockImplementation(() => {
  const mockResponseData = {
    id: "test-id",
    object: "chat.completion" as const,
    created: Date.now(),
    model: "gemma3:1b",
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
  // Explicitly cast to the library's response type
  return Effect.succeed(mockResponseData as typeof CreateChatCompletionResponse.Type);
});

// Mock the stream to return a Stream of chunks with proper format
mockStream.mockImplementation(() =>
  Stream.fromIterable([
    {
      parts: [
        {
          _tag: "Content",
          content: "Test response chunk",
        },
      ],
      text: { getOrElse: () => "Test response chunk" },
    },
  ]),
);

// Mock TelemetryService
const mockTelemetryTrackEvent = vi
  .fn()
  .mockImplementation(() => Effect.succeed(undefined));
const MockTelemetryService = Layer.succeed(TelemetryService, {
  trackEvent: mockTelemetryTrackEvent,
  isEnabled: vi.fn().mockImplementation(() => Effect.succeed(true)),
  setEnabled: vi.fn().mockImplementation(() => Effect.succeed(undefined)),
});

// Mock ConfigurationService
const mockConfigGet = vi.fn();
const MockConfigurationService = Layer.succeed(ConfigurationService, {
  get: mockConfigGet,
  getSecret: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
});

describe("OllamaAgentLanguageModelLive", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default mocks
    mockConfigGet.mockImplementation((key) => {
      if (key === "OLLAMA_MODEL_NAME") {
        return Effect.succeed("gemma3:1b");
      }
      return Effect.fail({ message: `Key not found: ${key}` });
    });

    // Mock successful response from Ollama
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
      // Explicitly cast to the library's response type
      return Effect.succeed(mockResponseData as typeof CreateChatCompletionResponse.Type);
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

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(
          OllamaAgentLanguageModelLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                MockOllamaOpenAIClient,
                MockConfigurationService,
                MockTelemetryService,
                MockHttpClient,
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

    await Effect.runPromise(
      program.pipe(
        Effect.provide(
          OllamaAgentLanguageModelLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                MockOllamaOpenAIClient,
                MockConfigurationService,
                MockTelemetryService,
                MockHttpClient,
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

    await Effect.runPromise(
      program.pipe(
        Effect.provide(
          OllamaAgentLanguageModelLive.pipe(
            Layer.provide(
              Layer.mergeAll(
                MockOllamaOpenAIClient,
                MockConfigurationService,
                MockTelemetryService,
                MockHttpClient,
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
    // Mock an error response
    mockCreateChatCompletion.mockImplementation(() =>
      Effect.fail({ message: "Test error" }),
    );

    const program = Effect.gen(function* (_) {
      const agentLM = yield* _(AgentLanguageModel);
      return yield* _(
        agentLM.generateText({
          prompt: "Test prompt",
        }),
      );
    });

    await expect(
      Effect.runPromise(
        program.pipe(
          Effect.provide(
            OllamaAgentLanguageModelLive.pipe(
              Layer.provide(
                Layer.mergeAll(
                  MockOllamaOpenAIClient,
                  MockConfigurationService,
                  MockTelemetryService,
                  MockHttpClient,
                ),
              ),
            ),
          ),
        ),
      ),
    ).rejects.toBeInstanceOf(AIProviderError);
  });

  // Additional tests would include:
  // - Testing streamText method
  // - Testing generateStructured method
  // - Testing error handling for each method
});
