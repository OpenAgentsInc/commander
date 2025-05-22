Okay, I will provide specific instructions for a coding agent to add tests for **Phase 0 and Phase 1** of the AI roadmap. These instructions are based on the "Suggested Tests for Phase 1" in `docs/AI-PHASE01.md` and include additional necessary tests.

**Preamble for the Coding Agent:**

- **Testing Framework:** All tests should be written using Vitest, following existing patterns in `src/tests/unit/`.
- **Effect-TS:** Utilize Effect-TS testing patterns. For services, mock dependencies by creating mock service implementations and providing them using `Layer.succeed(ServiceTag, mockImplementation)`. Run test effects using `Effect.runPromise` or `Effect.runPromiseExit`.
- **File Locations:**
  - Tests for Phase 1 core AI services should be placed in `src/tests/unit/services/ai/core/`. Create this directory if it doesn't exist.
  - A test for Phase 0 runtime stability will augment `src/tests/unit/services/runtime.test.ts`.
- **Clarity and Coverage:** Aim for clear, focused tests that cover success cases, failure cases, and edge cases where appropriate.
- **Mocking:** Use `vi.mock` for external modules if needed, but prefer Effect-TS layers for mocking service dependencies.
- **Idempotency:** Ensure tests are idempotent and do not rely on shared mutable state between test runs without proper setup/teardown.

---

## I. Phase 0: Foundational Stability Test

**Objective:** Ensure the application's main Effect runtime can still be successfully built after the foundational setup of Phase 0 (adding AI dependencies, creating base directories). This test should ideally already exist and pass; this instruction is to verify or augment it.

**File to Modify:** `src/tests/unit/services/runtime.test.ts`

**Task 0.T1: Verify `FullAppLayer` Buildability**

1.  **Review Existing Test:** Examine the existing test case (likely titled something like "should successfully build the FullAppLayer context...").
2.  **Ensure Comprehensive Check:**

    - The test should attempt to build the `FullAppLayer` using `Layer.toRuntime(FullAppLayer).pipe(Effect.scoped)`.
    - It should then run this effect using `Effect.runPromise`.
    - The primary assertion is that `Effect.runPromise` resolves successfully, indicating all services in `FullAppLayer` could be constructed and their dependencies met.
    - If this test isn't already comprehensive (e.g., if it only tests a subset of layers), expand it to cover the `FullAppLayer` as defined in `src/services/runtime.ts`.
    - No new AI _implementations_ are in `FullAppLayer` yet from Phase 0/1, but this ensures the base structure remains sound.

    **Example Snippet (ensure your test reflects this pattern):**

    ```typescript
    // src/tests/unit/services/runtime.test.ts
    import { describe, it, expect, vi, beforeEach } from "vitest"; // beforeEach if needed for mocks
    import { Effect, Layer } from "effect";
    import { FullAppLayer } from "@/services/runtime"; // Assuming FullAppLayer is exported

    // Mocks for any non-AI services that might cause issues if not mocked
    // (e.g., if SparkSDK is still problematic despite earlier mocks)
    // Example for Spark, adapt as necessary:
    vi.mock("@buildonspark/spark-sdk", () => {
      const mockWalletInstance = {
        createLightningInvoice: vi
          .fn()
          .mockResolvedValue({ invoice: { encodedInvoice: "mockInvoice" } }),
        // ... other methods needed by SparkServiceLive ...
        getBalance: vi
          .fn()
          .mockResolvedValue({ balance: BigInt(0), tokenBalances: new Map() }),
        getSingleUseDepositAddress: vi.fn().mockResolvedValue("mockAddress"),
        checkWalletStatus: vi.fn().mockResolvedValue(true),
        checkInvoiceStatus: vi.fn().mockResolvedValue({ status: "pending" }),
        payLightningInvoice: vi
          .fn()
          .mockResolvedValue({ payment: { status: "SUCCESS" } }),
        cleanupConnections: vi.fn().mockResolvedValue(undefined),
      };
      return {
        SparkWallet: {
          initialize: vi.fn().mockResolvedValue({ wallet: mockWalletInstance }),
        },
      };
    });

    describe("Effect Runtime Initialization (with AI Foundations)", () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it("should successfully build the FullAppLayer context without missing services", async () => {
        const program = Layer.toRuntime(FullAppLayer).pipe(Effect.scoped);
        await expect(Effect.runPromise(program)).resolves.toBeDefined();
      });
    });
    ```

---

## II. Phase 1: Core AI Service Abstraction Tests

Create the directory `src/tests/unit/services/ai/core/` if it doesn't exist.

### Task 1.T1: `AgentChatMessageSchema` Tests

**File:** `src/tests/unit/services/ai/core/AgentChatMessage.test.ts`

1.  **Test Suite for `AgentChatMessageSchema`:**

    - **Valid User Message:**
      - Test `Schema.decodeUnknown(AgentChatMessageSchema)` with a valid user message object (role: "user", content: string).
      - Assert the decoding is successful (`result._tag === "Right"`) and matches the input.
    - **Valid Assistant Message:**
      - Test with a valid assistant message (role: "assistant", content: string).
      - Test with `content: null` (valid for assistants if `tool_calls` are present, though `tool_calls` are also optional).
    - **Valid System Message:**
      - Test with a valid system message (role: "system", content: string).
    - **Valid Tool Message:**
      - Test with a valid tool message (role: "tool", content: string, name: string, tool_call_id: string).
    - **Message with Optional Fields:**
      - Test a message (e.g., assistant) that includes `tool_calls` (using `PlaceholderToolCallSchema` structure).
      - Test a message (e.g., tool) that includes `tool_call_id`.
      - Test a message (e.g., tool) that includes `name`.
    - **Invalid Role:**
      - Test with an invalid role (e.g., "invalid_role"). Assert decoding fails (`result._tag === "Left"`).
    - **Missing Required Fields:**
      - Test with missing `role`. Assert decoding fails.
      - Test with missing `content` for a "user" message (content is not NullishOr for user/system).
    - **UI-Specific Fields:** (These are part of `AgentChatMessageSchema` as per `AI-PHASE03.md`'s `useAgentChat`)
      - The schema for `AgentChatMessage` in `AI-PHASE01.md` Task 1.4 includes `tool_calls` and `tool_call_id`. The schema provided in `AI-PHASE07.md` (for actual tool use implementation) is more detailed for `AgentChatMessageSchema`. Assume the schema defined in `AI-PHASE01.md` (Task 1.4) is what's being tested for _Phase 1_. It includes: `role`, `content` (NullishOr), `name` (optional), `tool_calls` (optional `PlaceholderToolCallsSchema`), `tool_call_id` (optional).
      - Test that these UI-specific fields from _Phase 3_ (`isStreaming`, `timestamp`, `id` from `useAgentChat`'s message definition) are _not_ strictly required by the Phase 1 schema but can be present if the schema is flexible (e.g. using `Schema.Struct` without `Schema.exact`). If they are _not_ part of the schema, ensure messages containing them still validate if the schema is not exact or decode them correctly if they are part of the schema.
        - The provided `AgentChatMessage.ts` for Phase 1 does _not_ include `isStreaming`, `timestamp`, `id`. Tests should confirm this.

2.  **Test Suite for `PlaceholderToolCallSchema`:**

    - Test `Schema.decodeUnknown(PlaceholderToolCallSchema)` with a valid tool call object (`id`, `type: "function"`, `function: {name, arguments}`).
    - Test with missing/invalid fields to ensure validation fails.

3.  **Test `Schema.encode` (Optional but good practice):**
    - For a valid decoded message, test that `Schema.encode(AgentChatMessageSchema)` produces the original input (or a valid encoded representation).

**Example Snippet:**

```typescript
// src/tests/unit/services/ai/core/AgentChatMessage.test.ts
import { describe, it, expect } from "vitest";
import { Schema } from "effect"; // Assuming Schema is from 'effect' or '@effect/schema'
import {
  AgentChatMessageSchema,
  PlaceholderToolCallSchema,
  type AgentChatMessage,
} from "@/services/ai/core/AgentChatMessage"; // Adjust path

describe("AgentChatMessage Schemas", () => {
  describe("AgentChatMessageSchema", () => {
    it("should validate a basic user message", () => {
      const message: AgentChatMessage = { role: "user", content: "Hello" };
      const result = Schema.decodeUnknown(AgentChatMessageSchema)(message);
      expect(result._tag).toBe("Right");
      if (result._tag === "Right") expect(result.right).toEqual(message);
    });

    it("should validate an assistant message with null content and tool_calls", () => {
      const message: AgentChatMessage = {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_123",
            type: "function",
            function: {
              name: "get_weather",
              arguments: '{"location": "London"}',
            },
          },
        ],
      };
      const result = Schema.decodeUnknown(AgentChatMessageSchema)(message);
      expect(result._tag).toBe("Right");
      // Add more assertions for content
    });

    it("should fail validation for an invalid role", () => {
      const message = { role: "not_a_role", content: "test" };
      const result = Schema.decodeUnknown(AgentChatMessageSchema)(message);
      expect(result._tag).toBe("Left");
    });
    // ... more tests for different roles, optional fields, and invalid cases
  });

  describe("PlaceholderToolCallSchema", () => {
    it("should validate a valid tool call", () => {
      const toolCall = {
        id: "call_abc",
        type: "function" as const, // Ensure literal type
        function: { name: "example_tool", arguments: '{"param": "value"}' },
      };
      const result = Schema.decodeUnknown(PlaceholderToolCallSchema)(toolCall);
      expect(result._tag).toBe("Right");
      if (result._tag === "Right") expect(result.right).toEqual(toolCall);
    });
    // ... more tests for PlaceholderToolCallSchema
  });
});
```

### Task 1.T2: `ProviderConfig` Schemas Tests

**File:** `src/tests/unit/services/ai/core/ProviderConfig.test.ts`

1.  **Test Suite for each Config Schema (`BaseProviderConfigSchema`, `ApiKeyProviderConfigSchema`, `UrlProviderConfigSchema`, `OpenAICompatibleProviderConfigSchema`):**
    - For each schema:
      - Test `Schema.decodeUnknown` with valid configuration objects. Assert success and correct parsing.
      - Test with missing required fields (e.g., `modelName` for `BaseProviderConfigSchema`, `apiKey` for `ApiKeyProviderConfigSchema`). Assert failure.
      - Test with incorrect data types for fields. Assert failure.
      - Test optional fields (e.g., `baseUrl` in `OpenAICompatibleProviderConfigSchema`).

**Example Snippet:**

```typescript
// src/tests/unit/services/ai/core/ProviderConfig.test.ts
import { describe, it, expect } from "vitest";
import { Schema } from "effect";
import {
  BaseProviderConfigSchema,
  ApiKeyProviderConfigSchema,
  // ... other schemas
} from "@/services/ai/core/ProviderConfig"; // Adjust path

describe("ProviderConfig Schemas", () => {
  describe("BaseProviderConfigSchema", () => {
    it("should validate a valid base config", () => {
      const config = { modelName: "model-x", isEnabled: true };
      const result = Schema.decodeUnknown(BaseProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
    });

    it("should fail if modelName is missing", () => {
      const config = { isEnabled: true }; // modelName is missing
      const result = Schema.decodeUnknown(BaseProviderConfigSchema)(config);
      expect(result._tag).toBe("Left");
    });
    // ... more tests
  });
  // ... describe blocks for other config schemas
});
```

### Task 1.T3: Custom AI Error Types Tests

**File:** `src/tests/unit/services/ai/core/AIError.test.ts`

1.  **Test Suite for Each Error Type (`AIGenericError`, `AIProviderError`, `AIConfigurationError`, `AIToolExecutionError`, `AIContextWindowError`):**
    - For each error type:
      - Test its constructor: Create an instance with a message, optional `cause`, and optional `context`.
      - Verify that `error.message` is set correctly.
      - Verify that `error.cause` (if provided) is set correctly.
      - Verify that `error.context` (if provided) is set correctly.
      - Verify that `error._tag` is the correct string literal (e.g., "AIProviderError" for `AIProviderError`).
      - Verify that `error instanceof Error` is true.
      - Verify that `error instanceof AIGenericError` is true (for specific errors).
      - For `AIProviderError`, verify `provider` and `isRetryable` (if passed) properties.
      - For `AIToolExecutionError`, verify `toolName` property.
      - For `AIContextWindowError`, verify `limit` and `current` properties.
    - The provided code for `AIError.ts` in `AI-PHASE01.md` shows custom errors extending `Error` and manually setting `_tag`. If the actual implementation uses `Data.TaggedError` as suggested in the preamble of `AI-PHASE01.md`, then the tests should also check for `Data.isTaggedError(error)` and `Data.isTagged(error, "YourTag")`. I will assume the provided code in Task 1.6 (`class AIGenericError extends Error`) is what was implemented.

**Example Snippet:**

```typescript
// src/tests/unit/services/ai/core/AIError.test.ts
import { describe, it, expect } from "vitest";
import {
  AIGenericError,
  AIProviderError,
  AIConfigurationError,
  AIToolExecutionError,
  AIContextWindowError,
} from "@/services/ai/core/AIError"; // Adjust path

describe("Custom AI Error Types", () => {
  describe("AIProviderError", () => {
    it("should correctly construct with all fields", () => {
      const cause = new Error("Underlying API issue");
      const context = { detail: "some detail" };
      const error = new AIProviderError({
        message: "Provider failed",
        provider: "OpenAI",
        cause,
        context,
        isRetryable: true,
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error).toBeInstanceOf(AIProviderError);
      expect(error.message).toBe("Provider failed");
      expect(error._tag).toBe("AIProviderError");
      expect(error.provider).toBe("OpenAI");
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(
        expect.objectContaining({
          detail: "some detail",
          provider: "OpenAI",
          isRetryable: true,
        }),
      );
      expect((error.context as any).isRetryable).toBe(true);
    });
    // ... more tests for other error types
  });
});
```

### Task 1.T4: Service Tag and Interface Tests (`AgentLanguageModel`, `AgentChatSession`, `AgentToolkitManager`)

For each service interface (`AgentLanguageModel.ts`, `AgentChatSession.ts`, `AgentToolkitManager.ts`), create a corresponding test file (e.g., `AgentLanguageModel.test.ts`).

1.  **Test Suite for each Service Tag:**
    - **Tag Validity:**
      - Verify that `ServiceName.Tag` is a valid `Context.Tag`.
    - **Mock Implementation and Resolution:**
      - Create a simple mock implementation of the service interface (e.g., `class MockAgentLanguageModel implements AgentLanguageModel { ... }`).
      - Create an Effect program that `yield* _(ServiceName.Tag)`.
      - Provide the mock implementation using `Layer.succeed(ServiceName.Tag, new MockAgentLanguageModel())`.
      - Run the program and assert that the resolved service is an instance of your mock.
    - **Interface Methods (Conceptual Test of Type Safety):**
      - For each method in the interface, write a test where the mock implementation's method is called. This primarily tests type correctness and that the method can be invoked. For Phase 1, these interfaces are abstract, so functional testing of the methods is limited to what the mock does.
      - For `AgentLanguageModel`: test calling mock `generateText`, `streamText`, `generateStructured`. Assert they return the expected mock Effect/Stream type. Test with mock `AiError` from the mock methods.
      - For `AgentChatSession`: test mock `addMessage`, `getHistory`, `clearHistory`.
      - For `AgentToolkitManager`: test mock `getToolkit`, `registerTool`.

**Example Snippet for `AgentLanguageModel.test.ts`:**

```typescript
// src/tests/unit/services/ai/core/AgentLanguageModel.test.ts
import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Context, Stream } from "effect";
import {
  AgentLanguageModel,
  type AiError, // Assuming this is exported or defined if needed for mocks
  type AiResponse,
  type AiTextChunk,
} from "@/services/ai/core/AgentLanguageModel"; // Adjust path

// Define a simple AiError for mocking purposes if not fully defined in phase 1
const mockAiError = { _tag: "AiError", message: "Mock AI Error" } as AiError;

class MockAgentLanguageModel implements AgentLanguageModel {
  _tag: "AgentLanguageModel" = "AgentLanguageModel";
  generateText = vi.fn(() =>
    Effect.succeed({ text: "mock response" } as AiResponse),
  );
  streamText = vi.fn(() =>
    Stream.succeed({ text: "mock chunk" } as AiTextChunk),
  );
  generateStructured = vi.fn(() =>
    Effect.succeed({ text: "mock structured response" } as AiResponse),
  );
}

describe("AgentLanguageModel Service", () => {
  it("AgentLanguageModel.Tag should be a valid Context.Tag", () => {
    expect(AgentLanguageModel.Tag).toBeInstanceOf(Context.Tag);
  });

  it("should resolve a mock implementation via Effect context", async () => {
    const mockService = new MockAgentLanguageModel();
    const testLayer = Layer.succeed(AgentLanguageModel.Tag, mockService);
    const program = Effect.flatMap(AgentLanguageModel.Tag, (service) =>
      Effect.succeed(service),
    );

    const resolvedService = await Effect.runPromise(
      Effect.provide(program, testLayer),
    );
    expect(resolvedService).toBe(mockService);
  });

  it("mock generateText should be callable and return mocked Effect", async () => {
    const mockService = new MockAgentLanguageModel();
    const testLayer = Layer.succeed(AgentLanguageModel.Tag, mockService);
    const params = { prompt: "test" };

    const program = Effect.flatMap(AgentLanguageModel.Tag, (service) =>
      service.generateText(params),
    );
    const result = await Effect.runPromise(Effect.provide(program, testLayer));

    expect(mockService.generateText).toHaveBeenCalledWith(params);
    expect(result.text).toBe("mock response");
  });

  // ... similar tests for streamText and generateStructured
  // ... test error cases, e.g., mockService.generateText.mockReturnValueOnce(Effect.fail(mockAiError));
});
```

Repeat this pattern for `AgentChatSession.test.ts` and `AgentToolkitManager.test.ts`, adapting the mock implementations and method calls to their respective interfaces. For `AgentChatSession` and `AgentToolkitManager`, the defined interfaces in Phase 1 are very simple, so the tests will mainly be about providing and resolving mock implementations of these conceptual services.

---

This set of tests should provide good coverage for the abstractions defined in AI Roadmap Phase 1. Remember to adapt paths and specific mock details based on the exact code implemented by the agent.
