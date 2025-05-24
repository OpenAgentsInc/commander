Okay, I've analyzed the situation. The core issue is that the AI provider implementations, specifically `OllamaAgentLanguageModelLive.ts` (and potentially others if they follow a similar pattern), are not correctly prioritizing the `model` specified in the `options` argument of their methods (`generateText`, `streamText`). Instead, they are defaulting to a model name fetched from their own configuration, leading to the DVM using `gemma3:1b` even when `devstral` is requested via the NIP-90 job.

Here are the instructions for the coding agent to fix this:

**Primary Goal:** Ensure all AI Language Model provider implementations respect the `model` parameter passed in `GenerateTextOptions` or `StreamTextOptions`.

**File(s) to Modify:**

1.  `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts` (Main target)
2.  Potentially `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts` and `src/services/ai/providers/anthropic/AnthropicAgentLanguageModelLive.ts` (Review for similar pattern and apply fix if necessary).
3.  `src/services/ai/core/AiResponse.ts` (Ensure it's robust for different part types from @effect/ai).
4.  `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts` (Ensure model parameter is correctly passed to NIP-90 request if applicable).

---

**Instructions for `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`:**

**Context:** This file implements the `AgentLanguageModel` interface for Ollama. It uses an `OllamaAsOpenAIClientLive` adapter which expects an OpenAI-compatible request. The DVM service calls methods on this `OllamaAgentLanguageModelLive` instance, passing the user-requested model (e.g., "devstral") in the `options.model` field.

**Problem:** The current implementation fetches a default `modelName` (e.g., "gemma3:1b") from `ConfigurationService` and uses this `modelName` in the API calls to `client.client.createChatCompletion` and `client.stream`, ignoring the `options.model` passed by the caller.

**Fix Details:**

1.  **Modify `generateText` method:**
    *   When preparing the `createChatCompletion` request, the `model` field should be: `options.model || defaultModelName`. This ensures that if `options.model` (e.g., "devstral") is provided, it's used; otherwise, it falls back to the configured `defaultModelName`.
    *   Add telemetry to log the `resolvedModel` being used.

2.  **Modify `streamText` method:**
    *   Similarly, when preparing the `client.stream` request, the `model` field should be: `options.model || defaultModelName`.
    *   Add telemetry to log the `resolvedModel` being used.

3.  **Modify `generateStructured` method (if implemented or to be implemented based on core interface):**
    *   Apply the same logic for the `model` field: `options.model || defaultModelName`.
    *   If this method relies on specific model capabilities (like OpenAI function calling), and the Ollama endpoint doesn't support it directly in the same way, this method might need to be a "best effort" text generation, or clearly document its limitations for Ollama. For now, assume it's similar to `generateText`.

4.  **Ensure `parseMessages` helper is robust:**
    *   The `options.prompt` is a `string`. The OpenAI-compatible API expects `messages: [{ role: "user", content: "..." }]`.
    *   The `parseMessages` helper should correctly transform a plain string prompt into this array structure. If `options.prompt` could *also* be a JSON string of a `messages` array, `parseMessages` should handle that too.

**Refactored `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts` Layer Export:**

```typescript
// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Effect, Layer, Stream, Context } from "effect";
import {
  AgentLanguageModel,
  GenerateTextOptions,
  StreamTextOptions,
  GenerateStructuredOptions,
  makeAgentLanguageModel, // Import makeAgentLanguageModel
  type AgentChatMessage, // For parseMessages
} from "@/services/ai/core";
import { AiResponse, TextPart, FinishPart, Usage } from "@/services/ai/core/AiResponse"; // Ensure correct imports for AiResponse and its parts
import { AiProviderError, mapToAiProviderError } from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { OpenAiClient } from "@effect/ai-openai"; // For OpenAiClient.OpenAiClient Tag

export const OllamaAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* (_) {
    const client = yield* _(OllamaOpenAIClientTag);
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    const defaultModelName = yield* _(
      configService.get("OLLAMA_MODEL_NAME").pipe(
        Effect.orElseSucceed(() => "gemma3:1b")
      )
    );

    const parseMessages = (prompt: string | { messages: AgentChatMessage[] }): {role: string; content: string | null}[] => {
      if (typeof prompt === 'string') {
        try {
          const parsed = JSON.parse(prompt);
          if (Array.isArray(parsed.messages)) {
            return parsed.messages.map((m: any) => ({ role: m.role, content: m.content as string | null }));
          }
        } catch (e) {
          // Fallback for plain string prompt
        }
        return [{ role: "user", content: prompt as string | null }];
      }
      // If prompt is already { messages: [...] }
      return prompt.messages.map(m => ({ role: m.role, content: m.content as string | null }));
    };

    return makeAgentLanguageModel({
      generateText: (options: GenerateTextOptions) => {
        const resolvedModel = options.model || defaultModelName;
        return Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({ category: "ollama_provider", action: "generate_text_model_resolved", label: "OllamaAgentLanguageModelLive", value: resolvedModel }));
          const response = yield* _(
            client.client.createChatCompletion({
              model: resolvedModel,
              messages: parseMessages(options.prompt as string),
              temperature: options.temperature ?? 0.7,
              max_tokens: options.maxTokens ?? 2048,
              // stream: false, // Not needed for createChatCompletion in latest SDK usually
            })
          );
          return new AiResponse({
            parts: [
              new TextPart({ text: response.choices[0]?.message?.content || "" }),
              new FinishPart({
                reason: response.choices[0]?.finish_reason || "unknown",
                usage: new Usage({
                  inputTokens: response.usage?.prompt_tokens || 0,
                  outputTokens: response.usage?.completion_tokens || 0,
                  totalTokens: response.usage?.total_tokens || 0,
                  reasoningTokens: 0, cacheReadInputTokens: 0, cacheWriteInputTokens: 0
                }),
                providerMetadata: {}
              })
            ]
          });
        }).pipe(
          Effect.mapError(error => mapToAiProviderError(error, "Ollama", resolvedModel, true))
        );
      },

      streamText: (options: StreamTextOptions) => {
        const resolvedModel = options.model || defaultModelName;
        Effect.runFork(telemetry.trackEvent({ category: "ollama_provider", action: "stream_text_model_resolved", label: "OllamaAgentLanguageModelLive", value: resolvedModel }));

        const messages = parseMessages(options.prompt as string);
        return client.stream({ // This is client.stream from OpenAiClient.Service interface
          model: resolvedModel,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
        }).pipe(
          Stream.map((chunk) => new AiResponse({ parts: chunk.parts })),
          Stream.mapError(error => mapToAiProviderError(error, "Ollama", resolvedModel, true))
        );
      },

      generateStructured: (options: GenerateStructuredOptions) => {
        const resolvedModel = options.model || defaultModelName;
        return Effect.gen(function*(_) {
          yield* _(telemetry.trackEvent({ category: "ollama_provider", action: "generate_structured_model_resolved", label: "OllamaAgentLanguageModelLive", value: resolvedModel }));
          const response = yield* _(
            client.client.createChatCompletion({
              model: resolvedModel,
              messages: parseMessages(options.prompt as string),
              temperature: options.temperature ?? 0.7,
              max_tokens: options.maxTokens ?? 2048,
              // For structured output, you might add response_format if Ollama supports it
              // response_format: { type: "json_object" } // Example
            })
          );
          return new AiResponse({
            parts: [
              new TextPart({ text: response.choices[0]?.message?.content || "" }),
              new FinishPart({
                reason: response.choices[0]?.finish_reason || "unknown",
                usage: new Usage({
                  inputTokens: response.usage?.prompt_tokens || 0,
                  outputTokens: response.usage?.completion_tokens || 0,
                  totalTokens: response.usage?.total_tokens || 0,
                  reasoningTokens: 0, cacheReadInputTokens: 0, cacheWriteInputTokens: 0
                }),
                providerMetadata: {}
              })
            ]
          });
        }).pipe(
          Effect.mapError(error => mapToAiProviderError(error, "Ollama", resolvedModel, true))
        );
      }
    });
  })
);
```

---

**Instructions for other Provider Implementations (e.g., `OpenAIAgentLanguageModelLive.ts`, `AnthropicAgentLanguageModelLive.ts`):**

*   **Review and Apply:** Check if these files use a similar pattern of fetching a default model name from configuration and then using that default in API calls *without* first checking `options.model`.
*   **If the pattern exists:** Apply the same fix:
    *   In `generateText`, `streamText`, and `generateStructured` methods, determine the `resolvedModel` as `options.model || defaultModelNameFromConfig`.
    *   Use this `resolvedModel` in the actual API calls to the provider's client.
    *   Add telemetry to log the `resolvedModel` used.

---

**Instructions for `src/services/ai/core/AiResponse.ts`:**

*   **Review Compatibility:** The `AiResponse` class extends `@effect/ai/AiResponse.AiResponse` and provides a `fromSimple` factory method.
*   **Action:** Ensure that the `parts` array constructed by `fromSimple` and in the provider implementations (like the Ollama fix above) correctly creates `TextPart`, `ToolCallPart`, `FinishPart`, etc., as expected by the `@effect/ai` library's `AiResponse` structure.
*   **Key Parts for a simple text response:** A `TextPart` for the content and a `FinishPart` for usage/reason.
*   The current implementation in the prompt for `AiResponse.fromSimple` seems reasonable, as it adds a `TextPart` and a `FinishPart`. Ensure the `Usage` and `FinishReason` types are correctly imported and used.

```typescript
// Example of AiResponse.fromSimple in src/services/ai/core/AiResponse.ts
// Ensure imports are correct:
// import { AiResponse as EffectAiResponse, TypeId as EffectAiResponseTypeId, PartTypeId, TextPart, FinishPart, Usage, FinishReason, ToolCallPart } from "@effect/ai/AiResponse";

// ... inside class AiResponse ...
  static fromSimple(props: {
    text: string;
    toolCalls?: Array<{ // Ensure this structure matches ToolCallSchema from AgentChatMessage.ts if used
      id: string;
      name: string;
      arguments: Record<string, unknown>; // or string if arguments are JSON string
    }>;
    metadata?: {
      usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
    };
    finishReason?: FinishReason; // Allow passing finish reason
  }): AiResponse {
    const parts: Array<InstanceType<typeof TextPart> | InstanceType<typeof ToolCallPart> | InstanceType<typeof FinishPart>> = []; // Explicitly type parts array

    if (props.text) {
      parts.push(new TextPart({
        text: props.text,
        annotations: [] // Assuming no annotations for simple text
      }));
    }

    if (props.toolCalls) {
      for (const toolCall of props.toolCalls) {
        parts.push({ // This is how ToolCallPart is structured in @effect/ai
          _tag: "ToolCallPart" as const,
          [PartTypeId]: PartTypeId, // Required symbol
          id: toolCall.id,
          name: toolCall.name,
          params: toolCall.arguments, // `params` is the field name in @effect/ai ToolCallPart
        } as InstanceType<typeof ToolCallPart>); // Cast to satisfy type, ensure structure is correct
      }
    }

    parts.push(new FinishPart({
      reason: props.finishReason || "unknown" as FinishReason,
      usage: new Usage({
        inputTokens: props.metadata?.usage?.promptTokens || 0,
        outputTokens: props.metadata?.usage?.completionTokens || 0,
        totalTokens: props.metadata?.usage?.totalTokens || 0,
        reasoningTokens: 0,
        cacheReadInputTokens: 0,
        cacheWriteInputTokens: 0
      }),
      providerMetadata: {} // Assuming no specific provider metadata for simple cases
    }));

    return new AiResponse({ parts });
  }
```

---

**Instructions for `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`:**

*   **Review `options.model` usage:**
    *   The `getNip90ProviderConfig` helper function takes `providerKeyFromOrchestrator` and `modelNameOverride`.
    *   This `modelNameOverride` (which comes from `options.model` if `ChatOrchestratorService` calls it) should be used to set the `modelIdentifier` in the `NIP90ProviderConfig`.
    *   This `modelIdentifier` is then used by `createNip90JobRequest` to (potentially) set a `["param", "model", modelIdentifier]` tag in the NIP-90 request.
*   **Action:**
    1.  Ensure that when `createNip90JobRequest` is called within `NIP90AgentLanguageModelLive`, if `options.model` (the DVM's target model, e.g., "devstral") is available, it's included as an additional parameter in the `additionalParams` argument, like: `[['param', 'model', options.model]]`.
    2.  The existing logic already attempts to use `options.model` as `modelNameOverride` for `getNip90ProviderConfig`. Verify this correctly sets `modelIdentifier` in the `NIP90ProviderConfig`.
    3.  The helper `createNip90JobRequest` needs to be able to accept these `additionalParams` and include them in the Nostr event tags (either encrypted or unencrypted part). The current signature `additionalParams?: Array<[string, string, string]>` allows this.

**Example Snippet for `NIP90AgentLanguageModelLive.ts` `generateText`:**

```typescript
// src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts
// ...
    generateText: (options: GenerateTextOptions) =>
      Effect.gen(function* (_) {
        const { providerConfig, providerKey } = yield* _(getNip90ProviderConfig(options.model)); // options.model is used here
        // ... (rest of the setup) ...

        // Prepare additionalParams for createNip90JobRequest
        const additionalParamsForJob: Array<[string, string, string]> = [];
        if (providerConfig.modelIdentifier) { // This comes from providerConfig.modelName, which came from options.model
          additionalParamsForJob.push(["param", "model", providerConfig.modelIdentifier]);
        }
        if (options.temperature !== undefined) {
          additionalParamsForJob.push(["param", "temperature", options.temperature.toString()]);
        }
        if (options.maxTokens !== undefined) {
          additionalParamsForJob.push(["param", "max_tokens", options.maxTokens.toString()]);
        }
        // Add other NIP-90 compatible params if present in options

        const jobRequestEffect = createNip90JobRequest(
          // ... other params ...
          requesterSk,
          targetDvmPkForEncryption, // This is providerConfig.dvmPubkey if requiresEncryption
          inputs,
          "text/plain", // Default output, NIP-90 might allow specifying this in request
          undefined, // bidMillisats
          providerConfig.requestKind,
          providerConfig.dvmPubkey, // p-tag target
          additionalParamsForJob // <<< Ensure model and other options are passed here
        );
        // ... rest of the logic ...
      }),
// ...
```

By applying these changes, the `AgentLanguageModel` implementations will correctly use the `model` specified in the options, allowing the DVM (`Kind5050DVMServiceImpl.ts`) to instruct the underlying AI service (Ollama, OpenAI, etc.) to use the model requested by the NIP-90 client (e.g., `devstral`).

The key is that `options.model` from the `AgentLanguageModel` method call must take precedence over any default model configured within the provider's own layer.Okay, Agent, the issue is that our AI provider implementations (specifically `OllamaAgentLanguageModelLive.ts` as confirmed by telemetry) are not honoring the `model` parameter passed in the `options` when making requests. They are instead defaulting to their locally configured model (`gemma3:1b` for Ollama).

Here are the instructions to fix this:

**Overall Goal:** Modify all relevant `AgentLanguageModel` provider implementations to prioritize the `model` specified in the `options` argument of their `generateText`, `streamText`, and `generateStructured` methods. If `options.model` is not provided, then they can fall back to their configured default model.

---

**1. Modify `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`**

This is the primary file where the bug is confirmed.

**Action:**

*   In both `generateText` and `streamText` (and `generateStructured` if you implement it fully):
    *   Retrieve the `defaultModelName` from `ConfigurationService` as currently done.
    *   When making the actual call to `client.client.createChatCompletion` (for `generateText` or `generateStructured`) or `client.stream` (for `streamText`), use `options.model || defaultModelName` as the value for the `model` parameter in the request payload.
    *   Add telemetry to log the `resolvedModel` that is ultimately used for the API call.
*   Ensure the `parseMessages` helper function correctly handles the `options.prompt` (which is a `string`) and converts it to the `[{ role: "user", content: prompt }]` format expected by the Ollama OpenAI-compatible API.

**Updated Code for `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`:**
(Ensure to import `makeAgentLanguageModel`, `AgentChatMessage`, `TextPart`, `FinishPart`, `Usage` from `@/services/ai/core` or `@effect/ai/AiResponse` as appropriate for your `AiResponse` class structure. Also, import `mapToAiProviderError` from `@/services/ai/core/AIError`.)

```typescript
// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Effect, Layer, Stream, Context } from "effect";
import {
  AgentLanguageModel,
  GenerateTextOptions,
  StreamTextOptions,
  GenerateStructuredOptions,
  makeAgentLanguageModel,
  type AgentChatMessage,
} from "@/services/ai/core";
import { AiResponse, TextPart, FinishPart, Usage } from "@/services/ai/core/AiResponse";
import { AiProviderError, mapToAiProviderError } from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { OpenAiClient } from "@effect/ai-openai"; // For OpenAiClient.OpenAiClient Tag

export const OllamaAgentLanguageModelLiveLayer = Layer.effect(
  AgentLanguageModel.Tag,
  Effect.gen(function* (_) {
    const client = yield* _(OllamaOpenAIClientTag);
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    const defaultModelName = yield* _(
      configService.get("OLLAMA_MODEL_NAME").pipe(
        Effect.orElseSucceed(() => "gemma3:1b") // Default if not in config
      )
    );

    const parseMessages = (prompt: string | { messages: AgentChatMessage[] }): {role: string; content: string | null}[] => {
      if (typeof prompt === 'string') {
        try {
          // Check if prompt is a JSON string of messages
          const parsed = JSON.parse(prompt);
          if (Array.isArray(parsed.messages)) {
            return parsed.messages.map((m: any) => ({ role: m.role, content: m.content as string | null }));
          }
        } catch (e) {
          // Not a JSON string of messages, treat as plain prompt
        }
        return [{ role: "user", content: prompt as string | null }];
      }
      // If prompt is already an object with a messages array
      return prompt.messages.map(m => ({ role: m.role, content: m.content as string | null }));
    };

    return makeAgentLanguageModel({
      generateText: (options: GenerateTextOptions) => {
        const resolvedModel = options.model || defaultModelName;
        return Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({ category: "ollama_provider", action: "generate_text_model_resolved", label: "OllamaAgentLanguageModelLive", value: resolvedModel }));
          const response = yield* _(
            client.client.createChatCompletion({
              model: resolvedModel, // <<< FIXED
              messages: parseMessages(options.prompt),
              temperature: options.temperature ?? 0.7,
              max_tokens: options.maxTokens ?? 2048,
            })
          );
          return new AiResponse({
            parts: [
              new TextPart({ text: response.choices[0]?.message?.content || "" }),
              new FinishPart({
                reason: response.choices[0]?.finish_reason || "unknown",
                usage: new Usage({
                  inputTokens: response.usage?.prompt_tokens || 0,
                  outputTokens: response.usage?.completion_tokens || 0,
                  totalTokens: response.usage?.total_tokens || 0,
                  reasoningTokens: 0, cacheReadInputTokens: 0, cacheWriteInputTokens: 0
                }),
                providerMetadata: {}
              })
            ]
          });
        }).pipe(
           Effect.mapError(error => mapToAiProviderError(error, "Ollama", resolvedModel, true))
        );
      },

      streamText: (options: StreamTextOptions) => {
        const resolvedModel = options.model || defaultModelName;
        Effect.runFork(telemetry.trackEvent({ category: "ollama_provider", action: "stream_text_model_resolved", label: "OllamaAgentLanguageModelLive", value: resolvedModel }));

        const messages = parseMessages(options.prompt);
        return client.stream({
          model: resolvedModel, // <<< FIXED
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
        }).pipe(
          Stream.map((chunk) => new AiResponse({ parts: chunk.parts })),
          Stream.mapError(error => mapToAiProviderError(error, "Ollama", resolvedModel, true))
        );
      },

      generateStructured: (options: GenerateStructuredOptions) => {
        const resolvedModel = options.model || defaultModelName;
        return Effect.gen(function*(_) {
          yield* _(telemetry.trackEvent({ category: "ollama_provider", action: "generate_structured_model_resolved", label: "OllamaAgentLanguageModelLive", value: resolvedModel }));
          const response = yield* _(
            client.client.createChatCompletion({
              model: resolvedModel, // <<< FIXED
              messages: parseMessages(options.prompt),
              temperature: options.temperature ?? 0.7,
              max_tokens: options.maxTokens ?? 2048,
              // Ollama's OpenAI endpoint may support response_format for JSON.
              // If options.schema implies JSON, you could add:
              // response_format: options.schema ? { type: "json_object" } : undefined,
            })
          );
          return new AiResponse({
            parts: [
              new TextPart({ text: response.choices[0]?.message?.content || "" }),
              new FinishPart({
                reason: response.choices[0]?.finish_reason || "unknown",
                usage: new Usage({
                  inputTokens: response.usage?.prompt_tokens || 0,
                  outputTokens: response.usage?.completion_tokens || 0,
                  totalTokens: response.usage?.total_tokens || 0,
                  reasoningTokens: 0, cacheReadInputTokens: 0, cacheWriteInputTokens: 0
                }),
                providerMetadata: {}
              })
            ]
          });
        }).pipe(
           Effect.mapError(error => mapToAiProviderError(error, "Ollama", resolvedModel, true))
        );
      }
    });
  })
);
```

---

**2. Review and Fix Other Provider Implementations**

*   **Files:**
    *   `src/services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts`
    *   `src/services/ai/providers/anthropic/AnthropicAgentLanguageModelLive.ts`
*   **Action:**
    *   Inspect these files for a similar pattern: fetching a default model from config and using it exclusively, ignoring `options.model`.
    *   If the pattern is found, apply the same fix:
        *   Determine `resolvedModel = options.model || defaultModelNameFromConfig;`
        *   Use `resolvedModel` in the API calls to the respective clients (e.g., `OpenAiClient.client.createChatCompletion` or `AnthropicClient` methods).
        *   Add telemetry to log the `resolvedModel` used.

---

**3. Verify `src/services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts`**

**Context:** This provider doesn't call an LLM directly but creates a NIP-90 job request. The DVM that picks up this job will be responsible for using the correct model.

**Action:**

*   Ensure that when `createNip90JobRequest` is called within `NIP90AgentLanguageModelLive.ts`:
    *   If `options.model` (e.g., "devstral") is provided to `generateText` or `streamText`, this model name is correctly included as a `["param", "model", options.model]` tag in the `additionalParams` passed to `createNip90JobRequest`.
    *   The `getNip90ProviderConfig` helper already uses `options.model` (passed as `modelNameOverride`) to potentially set the `modelIdentifier` in `NIP90ProviderConfig`. This `modelIdentifier` should be the one used for the `["param", "model", modelIdentifier]` tag.

**Example Check in `NIP90AgentLanguageModelLive.ts` (Conceptual):**

```typescript
// ... inside generateText or streamText of NIP90AgentLanguageModelLive ...
const { providerConfig, /* ... */ } = yield* _(getNip90ProviderConfig(options.model)); // options.model is passed

const additionalParamsForJob: Array<[string, string, string]> = [];
if (providerConfig.modelIdentifier) { // This modelIdentifier should be derived from options.model if provided
    additionalParamsForJob.push(["param", "model", providerConfig.modelIdentifier]);
}
// ... add other params like temperature, maxTokens from options ...

const jobRequestEffect = createNip90JobRequest(
    // ... other arguments ...
    additionalParamsForJob // Ensure these are passed
);
// ...
```

*   The `ChatOrchestratorService.ts` already seems to correctly pass `preferredProvider.modelName` (which would be `devstral`) to `getNip90ProviderConfig` as `modelNameOverride`. The key is that `getNip90ProviderConfig` uses this `modelNameOverride` for the `modelIdentifier` field of the `NIP90ProviderConfig`.

---

**4. Update `parseMessages` Helper in `OllamaAgentLanguageModelLive.ts` (and other providers if necessary)**

*   **Context:** The `options.prompt` in `GenerateTextOptions` is a `string`. The OpenAI-compatible API for chat completions expects `messages: [{ role: "user", content: "..." }]`.
*   **Action:** Ensure the `parseMessages` helper in `OllamaAgentLanguageModelLive.ts` correctly handles these cases:
    1.  If `options.prompt` is a plain string, it should be converted to `[{ role: "user", content: options.prompt }]`.
    2.  If `options.prompt` is a JSON string representing an object like `{ "messages": [...] }`, it should parse this and use the `messages` array.
    3.  If `options.prompt` is an object `{ messages: [...] }` (if `GenerateTextOptions.prompt` was `string | { messages: AgentChatMessage[] }`), it should use it directly.
    *   The current `parseMessages` implementation in the fix provided for `OllamaAgentLanguageModelLive.ts` attempts to do this. Verify its robustness.

---

**5. Test Thoroughly**

*   **Unit Tests:**
    *   Update unit tests for `OllamaAgentLanguageModelLive.ts` (and others) to verify that `options.model` is correctly passed to the mocked client methods.
    *   Test the fallback to the default model when `options.model` is not provided.
*   **Integration/E2E Tests:**
    *   Run an E2E test where the NIP-90 DVM (`Kind5050DVMServiceImpl.ts`) is configured with a default model (e.g., "gemma3:1b").
    *   The NIP-90 consumer (e.g., `Nip90ConsumerChatPane` or Agent Chat pane using `nip90_devstral` provider) requests a different model (e.g., "devstral" or another model Ollama serves).
    *   Verify that the DVM's telemetry shows the *requested model* being used by the `OllamaAgentLanguageModelLive` and that the response content is characteristic of the requested model (if possible to distinguish).
    *   Check the telemetry log from `OllamaAsOpenAIClientLive.ts` (e.g., `ollama_adapter:nonstream', action: 'create_start', label: '<model_name>'`) to see which model name it ultimately received from `OllamaAgentLanguageModelLive.ts`. This should now be "devstral" in the test case.

By implementing these changes, the system should correctly respect the model requested by the user/DVM, rather than always defaulting to the provider's local configuration.
