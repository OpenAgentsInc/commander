Okay, Agent, here are the specific instructions for implementing **Phase 0 (Foundation and Setup)** and **Phase 1 (Core AI Service Abstractions)** of the Commander AI Roadmap.

**Important Preamble for the Coding Agent:**

- **Effect-TS Best Practices:** Throughout these tasks, ensure you adhere to Effect-TS best practices:
  - Use `Context.Tag` for defining service interfaces.
  - Use `Layer.effect` or `Layer.succeed` for service implementations.
  - Wrap all side-effects (filesystem, network, etc.) in `Effect`.
  - Use `@effect/schema` for data validation and type derivation.
  - Define and use custom tagged errors extending `Data.TaggedError` for domain-specific error handling.
- **Directory Structure:** Create new directories and files as specified. For each new directory under `src/services/`, create an `index.ts` file to re-export the public symbols from that module (e.g., service tags, interfaces, live layers).
- **Incremental Commits:** After completing each major step (e.g., after adding dependencies, after creating each service file), commit your changes with a clear message.

---

## Phase 0: Foundation and Setup

**Objective:** Install necessary dependencies and prepare the project structure.

**Task 0.1: Add Core AI Dependencies**

1.  **Action:** Modify the `package.json` file.
2.  **Details:** Add the following packages to the `dependencies` section:
    ```json
    "@effect/ai": "^0.2.0",         // Or the latest stable version
    "@effect/ai-openai": "^0.2.0",  // Or the latest stable version
    "@effect/ai-anthropic": "^0.2.0" // Or the latest stable version
    ```
    _Note: Check for the latest compatible versions of these packages before adding._
3.  **Action:** Run `pnpm install` to install the new dependencies.
4.  **Verification:** Ensure the packages are added to `pnpm-lock.yaml` and no installation errors occur.

**Task 0.2: Verify Existing Platform Dependencies**

1.  **Action:** Check `package.json`.
2.  **Details:**
    - Verify that `@effect/platform` is already a dependency. (It is, version `^0.82.2`).
    - Verify that `@effect/platform-node` is available (It is, version `^0.80.3`). This will be used for `HttpClient` in the main process or for IPC-proxied calls.
    - Verify that `@effect/platform-browser` is available (It is, version `^0.62.3`). This will be used for `HttpClient` directly in the renderer process if needed (e.g., for AI services that might run purely client-side in the future, though our initial plan involves IPC or main process for API keys).
3.  **No code changes are expected here** if these packages are already correctly listed and up-to-date enough for `@effect/ai`.

**Task 0.3: Create Base AI Services Directory**

1.  **Action:** Create the following directory structure if it doesn't already exist:
    `src/services/ai/core/`
2.  **Action:** Create an `index.ts` file inside `src/services/ai/`:
    **File:** `src/services/ai/index.ts`
    ```typescript
    // This file will re-export core AI services and provider implementations later
    export * from "./core";
    // export * from './providers'; // Placeholder for later phases
    ```

---

## Phase 1: Core AI Service Abstractions

**Objective:** Define the primary interfaces, data structures, and error types for the new AI backend, independent of specific providers. All files in this phase should be located within `src/services/ai/core/`.

**Task 1.1: Define `AgentLanguageModel` Service**

1.  **Action:** Create the file `src/services/ai/core/AgentLanguageModel.ts`.
2.  **Content:**

    ```typescript
    // src/services/ai/core/AgentLanguageModel.ts
    import { Context, Effect, Stream } from "effect";
    import type {
      AiError,
      AiResponse,
      AiTextChunk,
      GenerateTextOptions,
      StreamTextOptions,
      GenerateStructuredOptions,
    } from "@effect/ai/AiLanguageModel"; // Assuming these types from @effect/ai

    // Re-export types from @effect/ai for convenience if they are directly used
    export type {
      AiError,
      AiResponse,
      AiTextChunk,
      GenerateTextOptions,
      StreamTextOptions,
      GenerateStructuredOptions,
    };

    export interface AgentLanguageModel {
      readonly _tag: "AgentLanguageModel";

      generateText(
        params: GenerateTextOptions, // Use type from @effect/ai
      ): Effect.Effect<AiResponse, AiError>; // Use types from @effect/ai

      streamText(
        params: StreamTextOptions, // Use type from @effect/ai
      ): Stream.Stream<AiTextChunk, AiError>; // Use types from @effect/ai

      // Placeholder for structured output, aligns with @effect/ai if it has a similar method
      generateStructured(
        params: GenerateStructuredOptions, // Use type from @effect/ai
      ): Effect.Effect<AiResponse, AiError>; // Use types from @effect/ai
    }

    export const AgentLanguageModel =
      Context.GenericTag<AgentLanguageModel>("AgentLanguageModel");
    ```

**Task 1.2: Define `AgentChatSession` Service (Conceptual Interface)**

1.  **Action:** Create the file `src/services/ai/core/AgentChatSession.ts`.
2.  **Content:**

    ```typescript
    // src/services/ai/core/AgentChatSession.ts
    import { Context, Effect } from "effect";
    import type { AgentChatMessage } from "./AgentChatMessage"; // To be created next

    export interface AgentChatSession {
      readonly _tag: "AgentChatSession";

      addMessage(message: AgentChatMessage): Effect.Effect<void, never>; // Assuming no error for adding, or define specific error

      getHistory(options?: {
        limit?: number;
      }): Effect.Effect<AgentChatMessage[], never>; // Assuming no error for getting, or define

      clearHistory(): Effect.Effect<void, never>;
    }

    export const AgentChatSession =
      Context.GenericTag<AgentChatSession>("AgentChatSession");
    ```

**Task 1.3: Define `AgentToolkitManager` Service (Conceptual Interface for Future Tool Use)**

1.  **Action:** Create the file `src/services/ai/core/AgentToolkitManager.ts`.
2.  **Content:**

    ```typescript
    // src/services/ai/core/AgentToolkitManager.ts
    import { Context, Effect } from "effect";
    import type { AiToolkit, AiTool } from "@effect/ai/AiToolkit"; // Assuming these types exist

    // Re-export AiTool and AiToolkit if they are to be used directly
    export type { AiToolkit, AiTool };

    export interface AgentToolkitManager {
      readonly _tag: "AgentToolkitManager";

      getToolkit(): Effect.Effect<AiToolkit, never>; // Or define specific error

      registerTool<I, S, E>(
        tool: AiTool<I, S, E>, // Use AiTool type from @effect/ai
        // handler: (input: I) => Effect.Effect<S, E> // Handler logic would be part of the service impl.
      ): Effect.Effect<void, never>; // Or define specific error
    }

    export const AgentToolkitManager = Context.GenericTag<AgentToolkitManager>(
      "AgentToolkitManager",
    );
    ```

**Task 1.4: Define `AgentChatMessage` Schema and Type**

1.  **Action:** Create the file `src/services/ai/core/AgentChatMessage.ts`.
2.  **Content:**

    ```typescript
    // src/services/ai/core/AgentChatMessage.ts
    import { Schema } from "@effect/schema";

    // Define a schema for tool calls if you anticipate using them soon,
    // otherwise Schema.Any or a simpler placeholder can be used.
    // For now, we'll keep it simple as per the roadmap's initial tool_calls placeholder.
    const PlaceholderToolCallSchema = Schema.Struct({
      id: Schema.String,
      type: Schema.Literal("function"),
      function: Schema.Struct({
        name: Schema.String,
        arguments: Schema.String, // Often a JSON string
      }),
    });
    const PlaceholderToolCallsSchema = Schema.Array(PlaceholderToolCallSchema);

    export const AgentChatMessageSchema = Schema.Struct({
      role: Schema.Union(
        Schema.Literal("user"),
        Schema.Literal("assistant"),
        Schema.Literal("system"),
        Schema.Literal("tool"), // Added for tool responses
      ),
      content: Schema.NullishOr(Schema.String), // Content can be null for some assistant messages with tool_calls
      name: Schema.optional(Schema.String), // For tool role, name of the tool
      tool_calls: Schema.optional(PlaceholderToolCallsSchema), // Placeholder until fully aligned with @effect/ai tool types
      tool_call_id: Schema.optional(Schema.String), // For messages that are responses to a tool_call
    });

    export type AgentChatMessage = Schema.Schema.Type<
      typeof AgentChatMessageSchema
    >;
    ```

**Task 1.5: Define Provider Configuration Schemas**

1.  **Action:** Create the file `src/services/ai/core/ProviderConfig.ts`.
2.  **Content:**

    ```typescript
    // src/services/ai/core/ProviderConfig.ts
    import { Schema } from "@effect/schema";

    export const BaseProviderConfigSchema = Schema.Struct({
      modelName: Schema.String,
      isEnabled: Schema.Boolean, // To toggle providers on/off
    });
    export type BaseProviderConfig = Schema.Schema.Type<
      typeof BaseProviderConfigSchema
    >;

    export const ApiKeyProviderConfigSchema = Schema.extend(
      BaseProviderConfigSchema,
      Schema.Struct({
        apiKey: Schema.String, // This should represent a secret key
      }),
    );
    export type ApiKeyProviderConfig = Schema.Schema.Type<
      typeof ApiKeyProviderConfigSchema
    >;

    export const UrlProviderConfigSchema = Schema.extend(
      BaseProviderConfigSchema,
      Schema.Struct({
        baseUrl: Schema.String,
      }),
    );
    export type UrlProviderConfig = Schema.Schema.Type<
      typeof UrlProviderConfigSchema
    >;

    // Example of a combined config for a provider needing API key and optional URL
    export const OpenAICompatibleProviderConfigSchema = Schema.extend(
      ApiKeyProviderConfigSchema,
      Schema.Struct({
        baseUrl: Schema.optional(Schema.String),
      }),
    );
    export type OpenAICompatibleProviderConfig = Schema.Schema.Type<
      typeof OpenAICompatibleProviderConfigSchema
    >;
    ```

**Task 1.6: Define Custom AI Error Types**

1.  **Action:** Create the file `src/services/ai/core/AIError.ts`.
2.  **Content:**

    ```typescript
    // src/services/ai/core/AIError.ts
    import { Data } from "effect";

    export class AIGenericError extends Data.TaggedError("AIGenericError")<{
      readonly message: string;
      readonly cause?: unknown;
      readonly context?: Record<string, any>;
    }> {}

    export class AIProviderError extends AIGenericError {
      override readonly _tag = "AIProviderError";
      constructor(args: {
        message: string;
        provider: string; // Name of the provider that errored
        cause?: unknown;
        context?: Record<string, any>;
        isRetryable?: boolean; // Optional: hint if the error might be retryable
      }) {
        super({
          message: args.message,
          cause: args.cause,
          context: {
            ...args.context,
            provider: args.provider,
            isRetryable: args.isRetryable,
          },
        });
      }
    }

    export class AIConfigurationError extends AIGenericError {
      override readonly _tag = "AIConfigurationError";
      constructor(args: {
        message: string;
        cause?: unknown;
        context?: Record<string, any>;
      }) {
        super(args);
      }
    }

    export class AIToolExecutionError extends AIGenericError {
      override readonly _tag = "AIToolExecutionError";
      constructor(args: {
        message: string;
        toolName: string;
        cause?: unknown;
        context?: Record<string, any>;
      }) {
        super({
          message: args.message,
          cause: args.cause,
          context: { ...args.context, toolName: args.toolName },
        });
      }
    }

    export class AIContextWindowError extends AIGenericError {
      override readonly _tag = "AIContextWindowError";
      constructor(args: {
        message: string;
        limit?: number;
        current?: number;
        cause?: unknown;
        context?: Record<string, any>;
      }) {
        super({
          message: args.message,
          cause: args.cause,
          context: {
            ...args.context,
            limit: args.limit,
            current: args.current,
          },
        });
      }
    }
    ```

**Task 1.7: Create `index.ts` for Core AI Services**

1.  **Action:** Create/update the `index.ts` file in `src/services/ai/core/`.
2.  **Content:**
    ```typescript
    // src/services/ai/core/index.ts
    export * from "./AgentLanguageModel";
    export * from "./AgentChatSession";
    export * from "./AgentToolkitManager";
    export * from "./AgentChatMessage";
    export * from "./ProviderConfig";
    export * from "./AIError";
    ```

---

Upon completion of these tasks, Phase 0 and Phase 1 will be established, providing a solid, typed foundation for the subsequent provider implementations and UI integration. Remember to commit your changes after each significant step.

---

## Suggested Tests for Phase 1

The following tests should be written to ensure proper functioning of the core AI service abstractions:

1. **AgentLanguageModel Tests**:

   - Test the Context.Tag creation and service usage pattern
   - Verify that the interface can be properly implemented
   - Test error handling with mock implementations

2. **AgentChatSession Tests**:

   - Test message addition and retrieval
   - Test history management (especially with limits)
   - Test token counting functionality
   - Test preparation of messages for AI models

3. **AgentChatMessage Tests**:

   - Validate schema definitions using Schema.decode/encode
   - Test helper functions for creating different message types
   - Ensure proper handling of tool calls in messages

4. **AgentToolkitManager Tests**:

   - Test tool registration and retrieval
   - Test toolkit creation with multiple tools
   - Test tool execution with mock tools

5. **Error Handling Tests**:
   - Test each error type construction
   - Test error inheritance and \_tag property
   - Test error conversion utilities

These tests should be placed in `src/tests/unit/services/ai/core/` with one test file per service interface. Use Effect's testing utilities and mocks where appropriate.
