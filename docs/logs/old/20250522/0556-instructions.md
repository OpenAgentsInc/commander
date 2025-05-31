Okay, agent, the primary issue is an "Invalid request format for streaming chat completion" error when interacting with Ollama. This happens because the prompt (which contains a stringified JSON of chat messages) is being wrapped into *another* layer of message structure by the `@effect/ai-openai`'s `Completions.stream` helper, leading to a malformed request by the time it reaches the Ollama API.

We need to modify `OllamaAgentLanguageModelLive.ts` to bypass this incorrect wrapping. Instead of using the `Completions.stream` (and `Completions.create`) convenience methods, we will directly use the methods on the `ollamaAdaptedClient` (which is an instance of `OpenAiClient.Service`). This client expects the full message structure.

Here are the instructions:

**Target File:** `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`

**Instructions:**

1.  **Remove the `Completions` service dependency and usage:**
    *   Delete the line `const completionsService = yield* _(Completions);`.
    *   Remove the import for `Completions` from `@effect/ai/Completions`.
    *   Remove the import for `OpenAiCompletions` from `@effect/ai-openai/OpenAiCompletions`.
    *   In `runtime.ts`, the `ollamaCompletionsServiceLayer` will no longer be needed for this provider. `OllamaAgentLanguageModelLive` will now directly depend on `OllamaOpenAIClientTag`.

2.  **Modify `generateText`, `streamText`, and `generateStructured` methods:**
    *   These methods currently receive `params.prompt` as a JSON string (from `useAgentChat.ts`) which looks like: `'{"messages":[{"role":"system",...},{"role":"user",...}]}'`.
    *   You need to parse this JSON string to extract the actual `messages` array.
    *   If parsing fails or the structure is not as expected, fallback to treating `params.prompt` as a single user message.
    *   Construct the request payload (e.g., `CreateChatCompletionRequest.Encoded` or `StreamCompletionRequest`) using the extracted `messages` array.
    *   Call the appropriate methods directly on `ollamaAdaptedClient` (which is an instance of `OpenAiClient.Service`):
        *   For `generateText`: use `ollamaAdaptedClient.client.createChatCompletion(...)`.
        *   For `streamText`: use `ollamaAdaptedClient.stream(...)`.
        *   For `generateStructured`: use `ollamaAdaptedClient.client.createChatCompletion(...)`, potentially with `response_format: { type: "json_object" }` if your Ollama setup and `OllamaAsOpenAIClientLive` can handle it (this part might require further adjustments based on Ollama's actual OpenAI compatibility for JSON mode).

**Detailed Code Changes for `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`:**

```typescript
// src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
import { Layer, Effect, Stream, Context } from "effect";
import {
  AgentLanguageModel,
  type GenerateTextOptions,
  type StreamTextOptions,
  type GenerateStructuredOptions,
  type AiTextChunk,
  type AgentChatMessage, // Import your core AgentChatMessage type
} from "@/services/ai/core";

// Import the standard AiResponse type from @effect/ai
import type { AiResponse } from "@effect/ai/AiResponse";

// Import the specific OpenAiClient Tag and types for its methods
import { OpenAiClient } from "@effect/ai-openai"; // This is the OpenAiClient.Service Tag
import type {
  CreateChatCompletionRequest, // For the .Encoded type
} from "@effect/ai-openai/Generated"; // Path to the generated types
import type { StreamCompletionRequest } from "@effect/ai-openai/OpenAiClient"; // For stream method

import { ConfigurationService } from "@/services/configuration";
import { AIProviderError } from "@/services/ai/core/AIError";
import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive"; // This provides OpenAiClient.Service
import { TelemetryService } from "@/services/telemetry";

// Define the type for the request body based on the generated schema
type CreateChatCompletionRequestEncoded = typeof CreateChatCompletionRequest.Encoded;

// Log when this module is loaded
console.log("Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)");

export const OllamaAgentLanguageModelLive = Layer.effect(
  AgentLanguageModel,
  Effect.gen(function* (_) {
    // Get required services
    const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag); // This is an OpenAiClient.Service instance
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);

    let modelName = "gemma3:1b"; // Default model
    const configGetEffect = configService.get("OLLAMA_MODEL_NAME");
    const configResult = yield* _(Effect.either(configGetEffect));

    if (configResult._tag === 'Right') {
      modelName = configResult.right;
    } else {
      yield* _(
        telemetry.trackEvent({
          category: "ai:config:warn",
          action: "ollama_model_name_fetch_failed_using_default",
          label: "OLLAMA_MODEL_NAME",
          value: String(configResult.left?.message || configResult.left),
        }).pipe(Effect.ignoreLogged)
      );
    }
    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_model_name_resolved",
        value: modelName,
      }).pipe(Effect.ignoreLogged)
    );

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "ollama_language_model_provider_created_direct_client", // Updated action
        value: modelName,
      }).pipe(Effect.ignoreLogged)
    );

    const mapErrorToAIProviderError = (err: unknown, contextAction: string, params: any): AIProviderError => {
      const detail = (err as any)?.error || err; // AiError might have an 'error' field, or it could be HttpClientError
      let message = `Ollama ${contextAction} error for model ${modelName}: ${detail?.message || String(detail) || "Unknown provider error"}`;
      if ((err as any)?._tag === "ResponseError" && (err as any).response?.status) {
        message = `Ollama ${contextAction} HTTP error ${ (err as any).response.status } for model ${modelName}: ${detail?.message || String(detail) || "Unknown provider error"}`;
      }

      return new AIProviderError({
        message: message,
        cause: detail?.cause || detail,
        provider: "Ollama",
        context: { model: modelName, params, originalErrorTag: (detail as any)?._tag, originalErrorMessage: detail?.message }
      });
    };

    const parsePromptMessages = (promptString: string): AgentChatMessage[] => {
      try {
        const parsed = JSON.parse(promptString);
        if (parsed && Array.isArray(parsed.messages)) {
          return parsed.messages as AgentChatMessage[];
        }
      } catch (e) {
        // Not a JSON string of messages, or malformed
      }
      // Fallback: treat the prompt string as a single user message
      return [{ role: "user", content: promptString, timestamp: Date.now() }];
    };

    const mapToOpenAIMessages = (messages: AgentChatMessage[]) => {
      return messages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant" | "tool", // Ensure role matches OpenAI's expectation
        content: msg.content || "", // OpenAI expects content to be a string, even if empty
        name: msg.name,
        tool_calls: msg.tool_calls as any, // Cast if your ToolCall type matches OpenAI's
        tool_call_id: msg.tool_call_id,
      }));
    };

    return AgentLanguageModel.of({
      _tag: "AgentLanguageModel",

      generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> => {
        const messagesPayload = parsePromptMessages(params.prompt);
        const openAiMessages = mapToOpenAIMessages(messagesPayload);

        const request: CreateChatCompletionRequestEncoded = {
          model: params.model || modelName,
          messages: openAiMessages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          // stream: false is implicit for createChatCompletion
        };

        console.log("OllamaAgentLanguageModelLive.generateText request:", JSON.stringify(request, null, 2));

        return ollamaAdaptedClient.client.createChatCompletion(request).pipe(
          Effect.map(response => response as AiResponse), // Assuming CreateChatCompletionResponse is compatible enough with AiResponse
          Effect.mapError(err => mapErrorToAIProviderError(err, "generateText", params))
        );
      },

      streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> => {
        const messagesPayload = parsePromptMessages(params.prompt);
        const openAiMessages = mapToOpenAIMessages(messagesPayload);

        const streamRequest: StreamCompletionRequest = { // Use StreamCompletionRequest from OpenAiClient
          model: params.model || modelName,
          messages: openAiMessages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
        };

        console.log("OllamaAgentLanguageModelLive.streamText request:", JSON.stringify(streamRequest, null, 2));

        return ollamaAdaptedClient.stream(streamRequest).pipe(
          Stream.map(chunk => ({ text: chunk.text?.getOrElse(() => "") || "" } as AiTextChunk)),
          Stream.mapError(err => mapErrorToAIProviderError(err, "streamText", params))
        );
      },

      generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AIProviderError> => {
        const messagesPayload = parsePromptMessages(params.prompt);
        const openAiMessages = mapToOpenAIMessages(messagesPayload);

        const request: CreateChatCompletionRequestEncoded = {
          model: params.model || modelName,
          messages: openAiMessages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          // For structured output, you might set response_format if the client and Ollama support it
          // response_format: { type: "json_object" }, // Example
        };

        console.log("OllamaAgentLanguageModelLive.generateStructured request:", JSON.stringify(request, null, 2));

        return ollamaAdaptedClient.client.createChatCompletion(request).pipe(
          // Add JSON parsing and validation against params.schema here if response_format used
          Effect.map(response => response as AiResponse),
          Effect.mapError(err => mapErrorToAIProviderError(err, "generateStructured", params))
        );
      }
    });
  })
);
```

**Target File:** `src/services/runtime.ts`

**Instructions:**

1.  **Remove `ollamaCompletionsServiceLayer`:**
    *   This layer is no longer needed as `OllamaAgentLanguageModelLive` will use `ollamaAdaptedClient` directly.
2.  **Update `ollamaAgentLanguageModelLayer` composition:**
    *   It should now directly take `ollamaAdapterLayer` as a dependency (which provides `OllamaOpenAIClientTag`).

**Detailed Code Changes for `src/services/runtime.ts`:**

```typescript
// src/services/runtime.ts
// ... other imports ...
// Remove: import * as OpenAiCompletions from "@effect/ai-openai/OpenAiCompletions";
// Remove: import { Completions } from "@effect/ai/Completions";
// ...

// AI service layers - Ollama provider
const ollamaAdapterLayer = OllamaProvider.OllamaAsOpenAIClientLive.pipe(
  // Assuming OllamaAsOpenAIClientLive needs TelemetryService and ConfigurationService directly
  // Layer.provide(Layer.merge(telemetryLayer, devConfigLayer)) // Example if it needed both
  Layer.provide(telemetryLayer) // More likely, it just needs telemetry for its own logging
);

// This layer adapts the Ollama-adapted OpenAiClient.Service
// to provide the AgentLanguageModel.Tag service.
const ollamaAgentLanguageModelLayer = OllamaProvider.OllamaAgentLanguageModelLive.pipe(
  Layer.provide(ollamaAdapterLayer),          // Provides OllamaOpenAIClientTag (which is an OpenAiClient.Service)
  Layer.provide(devConfigLayer),              // Provides ConfigurationService
  Layer.provide(telemetryLayer)               // Provides TelemetryService
);

// Full application layer
export const FullAppLayer = Layer.mergeAll(
  telemetryLayer,
  devConfigLayer, // Ensure ConfigurationService is available for all dependent layers
  nostrLayer,
  nip04Layer,
  NIP19ServiceLive,
  BIP39ServiceLive,
  BIP32ServiceLive,
  nip28Layer,
  sparkLayer,
  nip90Layer,
  BrowserHttpClient.layerXMLHttpRequest, // General HttpClient

  ollamaAgentLanguageModelLayer, // Provides AgentLanguageModel through Ollama (corrected)

  kind5050DVMLayer, // Depends on AgentLanguageModel
);

// ... rest of runtime.ts ...
```

**Reasoning for these changes:**

*   The core problem is that the `Completions.stream` (and `.create`) method from `@effect/ai-openai` is designed for simple string prompts, automatically wrapping them in `messages: [{role:"user", content: prompt}]`. Your application was passing a JSON string of a full message array as this simple prompt, leading to a nested and incorrect structure.
*   By directly using the `ollamaAdaptedClient.stream()` and `ollamaAdaptedClient.client.createChatCompletion()` methods (where `ollamaAdaptedClient` is an instance of `OpenAiClient.Service`), `OllamaAgentLanguageModelLive` can construct the `messages` array correctly before making the call.
*   The `StreamTextOptions.prompt` (and other prompt fields) will be parsed within `OllamaAgentLanguageModelLive` to extract the intended `messages` array. This keeps the `AgentLanguageModel` interface stable for now, while correctly interacting with the underlying `OpenAiClient.Service` methods.
*   The `runtime.ts` is updated to reflect that `OllamaAgentLanguageModelLive` no longer needs a separate `Completions.Completions` service layer but instead directly uses the `OllamaOpenAIClientTag` (fulfilled by `ollamaAdapterLayer`).

After implementing these changes, the request sent to the Ollama IPC (and subsequently to the Ollama server) should have the correctly formatted `messages` array, resolving the "Invalid request format" error.

Remember to also apply similar logic to `OpenAIAgentLanguageModelLive.ts` if that provider implementation also uses the `Completions` service for chat interactions and faces the same stringified prompt issue.Okay, the error log clearly points to an "Invalid request format for streaming chat completion" when interacting with Ollama. This usually means the JSON payload sent to the Ollama `/v1/chat/completions` (OpenAI-compatible) endpoint doesn't match what it expects for a streaming chat request.

The core issue, as identified in the thought process, is the way the prompt is handled:

1.  `useAgentChat.ts` stringifies an array of `AgentChatMessage` objects into a single JSON string and puts it into `StreamTextOptions.prompt`.
2.  `OllamaAgentLanguageModelLive.ts` was previously using `completionsService.stream(params.prompt, ...)`. The `completionsService` (from `@effect/ai-openai`) wraps this stringified JSON prompt into `[{ role: "user", content: THE_JSON_STRING }]`.
3.  This results in a malformed `messages` array being sent to the Ollama server (a single user message whose content is a JSON string of the actual conversation, instead of the actual conversation array).

The fix involves `OllamaAgentLanguageModelLive.ts` directly using the `ollamaAdaptedClient.stream()` (and `.client.createChatCompletion()`) methods, correctly parsing the `params.prompt` JSON string back into a `messages` array, and constructing the request appropriately for the underlying OpenAI-compatible client.

Here are the good coming instructions:

---

**Objective:** Resolve the "Invalid request format for streaming chat completion" error when using Ollama.

**Root Cause:** The `prompt` string (containing a JSON representation of chat messages) is being incorrectly wrapped by the `@effect/ai-openai` `Completions` service, leading to a malformed `messages` array in the final request to Ollama.

**Solution:** Modify `OllamaAgentLanguageModelLive.ts` to:
1.  Parse the incoming `params.prompt` (which is a JSON string from `useAgentChat.ts`) to extract the actual `messages` array.
2.  If parsing fails or the structure is unexpected, fall back to treating `params.prompt` as a single user message.
3.  Directly use the methods on `ollamaAdaptedClient` (an instance of `OpenAiClient.Service` provided by `OllamaOpenAIClientTag`) to make requests, bypassing the problematic `Completions` service layer for Ollama.
4.  Update `runtime.ts` to reflect that `OllamaAgentLanguageModelLive` no longer depends on a `Completions` service layer but directly on the `OllamaOpenAIClientTag`.

---

**Instructions for the Agent:**

**1. Modify `src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts`:**

   Replace the entire content of the file with the following:

   ```typescript
   // src/services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts
   import { Layer, Effect, Stream } from "effect";
   import {
     AgentLanguageModel,
     type GenerateTextOptions,
     type StreamTextOptions,
     type GenerateStructuredOptions,
     type AiTextChunk,
     type AgentChatMessage, // Make sure this is your application's AgentChatMessage type
   } from "@/services/ai/core";

   // Import the standard AiResponse type from @effect/ai
   import type { AiResponse } from "@effect/ai/AiResponse";

   // Import the specific OpenAiClient Tag and types for its methods
   import { OpenAiClient } from "@effect/ai-openai"; // This is the OpenAiClient.Service Tag
   import type {
     CreateChatCompletionRequest, // For the .Encoded type
   } from "@effect/ai-openai/Generated"; // Path to the generated types
   // Type for the request object for the stream method on OpenAiClient.Service
   import type { StreamCompletionRequest } from "@effect/ai-openai/OpenAiClient";

   import { ConfigurationService } from "@/services/configuration";
   import { AIProviderError } from "@/services/ai/core/AIError";
   import { OllamaOpenAIClientTag } from "./OllamaAsOpenAIClientLive"; // This provides OpenAiClient.Service
   import { TelemetryService } from "@/services/telemetry";

   // Define the type for the request body based on the generated schema
   type CreateChatCompletionRequestEncoded = typeof CreateChatCompletionRequest.Encoded;

   console.log("Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)");

   export const OllamaAgentLanguageModelLive = Layer.effect(
     AgentLanguageModel,
     Effect.gen(function* (_) {
       const ollamaAdaptedClient = yield* _(OllamaOpenAIClientTag); // This is an instance of OpenAiClient.Service
       const configService = yield* _(ConfigurationService);
       const telemetry = yield* _(TelemetryService);

       let modelName = "gemma3:1b"; // Default Ollama model
       const configGetEffect = configService.get("OLLAMA_MODEL_NAME");
       const configResult = yield* _(Effect.either(configGetEffect));

       if (configResult._tag === 'Right') {
         modelName = configResult.right;
       } else {
         yield* _(
           telemetry.trackEvent({
             category: "ai:config:warn",
             action: "ollama_model_name_fetch_failed_using_default",
             label: "OLLAMA_MODEL_NAME",
             value: String(configResult.left?.message || configResult.left),
           }).pipe(Effect.ignoreLogged)
         );
       }
       yield* _(
         telemetry.trackEvent({
           category: "ai:config",
           action: "ollama_model_name_resolved",
           value: modelName,
         }).pipe(Effect.ignoreLogged)
       );

       yield* _(
         telemetry.trackEvent({
           category: "ai:config",
           action: "ollama_language_model_provider_created_direct_client",
           value: modelName,
         }).pipe(Effect.ignoreLogged)
       );

       const mapErrorToAIProviderError = (err: unknown, contextAction: string, params: any): AIProviderError => {
         const detail = (err as any)?.error || (err as any)?.cause || err;
         let message = `Ollama ${contextAction} error for model ${modelName}: ${detail?.message || String(detail) || "Unknown provider error"}`;

         // Check if the error is an HttpClientError.ResponseError and extract status
         if (typeof err === 'object' && err !== null && '_tag' in err && (err as any)._tag === "ResponseError") {
            const responseStatus = (err as any).response?.status;
            if (responseStatus) {
              message = `Ollama ${contextAction} HTTP error ${responseStatus} for model ${modelName}: ${detail?.message || String(detail) || "Unknown provider error"}`;
            }
         }

         return new AIProviderError({
           message: message,
           cause: detail,
           provider: "Ollama",
           context: { model: modelName, params, originalErrorTag: (detail as any)?._tag, originalErrorMessage: detail?.message }
         });
       };

       const parsePromptMessages = (promptString: string): AgentChatMessage[] => {
         try {
           const parsed = JSON.parse(promptString);
           if (parsed && Array.isArray(parsed.messages)) {
             return parsed.messages as AgentChatMessage[];
           }
         } catch (e) {
           // Not a JSON string of messages, or malformed
         }
         // Fallback: treat the prompt string as a single user message
         return [{ role: "user", content: promptString, timestamp: Date.now() }];
       };

       const mapToOpenAIMessages = (messages: AgentChatMessage[]) => {
         return messages.map(msg => ({
           role: msg.role as "system" | "user" | "assistant" | "tool", // Ensure role matches OpenAI's expectation
           content: msg.content || "", // OpenAI expects content to be a string, even if empty
           name: msg.name,
           tool_calls: msg.tool_calls as any, // Cast if your ToolCall type matches OpenAI's
           tool_call_id: msg.tool_call_id,
         }));
       };

       return AgentLanguageModel.of({
         _tag: "AgentLanguageModel",

         generateText: (params: GenerateTextOptions): Effect.Effect<AiResponse, AIProviderError> => {
           const messagesPayload = parsePromptMessages(params.prompt);
           const openAiMessages = mapToOpenAIMessages(messagesPayload);

           const request: CreateChatCompletionRequestEncoded = {
             model: params.model || modelName,
             messages: openAiMessages,
             temperature: params.temperature,
             max_tokens: params.maxTokens,
             // stream: false is implicit for createChatCompletion
           };

           yield* _(telemetry.trackEvent({ category: "ollama_adapter:nonstream", action: "create_start_invoking_client", label: request.model, value: JSON.stringify(request.messages) }).pipe(Effect.ignoreLogged));

           return ollamaAdaptedClient.client.createChatCompletion(request).pipe(
             Effect.map(response => response as AiResponse),
             Effect.tapError(err => Effect.sync(() => console.error("Ollama generateText internal error:", err))),
             Effect.mapError(err => mapErrorToAIProviderError(err, "generateText", params))
           );
         },

         streamText: (params: StreamTextOptions): Stream.Stream<AiTextChunk, AIProviderError> => {
           const messagesPayload = parsePromptMessages(params.prompt);
           const openAiMessages = mapToOpenAIMessages(messagesPayload);

           const streamRequest: StreamCompletionRequest = {
             model: params.model || modelName,
             messages: openAiMessages,
             temperature: params.temperature,
             max_tokens: params.maxTokens,
           };

           // Effect.runFork(telemetry.trackEvent({ category: "ollama_adapter:stream", action: "create_start_invoking_client", label: streamRequest.model, value: JSON.stringify(streamRequest.messages) }));
           // The above logging should be inside an Effect if possible, or use a simple console.log for this context. For now, using console.log
           console.log("[OllamaAgentLanguageModelLive.streamText] Invoking ollamaAdaptedClient.stream with:", JSON.stringify(streamRequest, null, 2));


           return ollamaAdaptedClient.stream(streamRequest).pipe(
             Stream.map(chunk => ({ text: chunk.text?.getOrElse(() => "") || "" } as AiTextChunk)),
             Stream.tapError(err => Effect.sync(() => console.error("Ollama streamText internal error:", err))),
             Stream.mapError(err => mapErrorToAIProviderError(err, "streamText", params))
           );
         },

         generateStructured: (params: GenerateStructuredOptions): Effect.Effect<AiResponse, AIProviderError> => {
           const messagesPayload = parsePromptMessages(params.prompt);
           const openAiMessages = mapToOpenAIMessages(messagesPayload);

           const request: CreateChatCompletionRequestEncoded = {
             model: params.model || modelName,
             messages: openAiMessages,
             temperature: params.temperature,
             max_tokens: params.maxTokens,
             // For structured output, if Ollama supports JSON mode via OpenAI API:
             // response_format: { type: "json_object" },
           };

           yield* _(telemetry.trackEvent({ category: "ollama_adapter:structured", action: "create_start_invoking_client", label: request.model, value: JSON.stringify(request.messages) }).pipe(Effect.ignoreLogged));


           return ollamaAdaptedClient.client.createChatCompletion(request).pipe(
             Effect.map(response => response as AiResponse),
             Effect.tapError(err => Effect.sync(() => console.error("Ollama generateStructured internal error:", err))),
             Effect.mapError(err => mapErrorToAIProviderError(err, "generateStructured", params))
           );
         }
       });
     })
   );
   ```

**2. Modify `src/services/runtime.ts`:**

   Update the `ollamaAgentLanguageModelLayer` composition. It no longer needs the `ollamaCompletionsServiceLayer`.

   ```typescript
   // src/services/runtime.ts
   // ... other imports ...
   // Remove these if no longer used elsewhere:
   // import * as OpenAiCompletions from "@effect/ai-openai/OpenAiCompletions";
   // import { Completions } from "@effect/ai/Completions";
   // ...

   // AI service layers - Ollama provider
   const ollamaAdapterLayer = OllamaProvider.OllamaAsOpenAIClientLive.pipe(
     // Provide TelemetryService and ConfigurationService if OllamaAsOpenAIClientLive needs them
     // Based on its current implementation, it only needs TelemetryService
     Layer.provide(telemetryLayer)
   );

   // This layer adapts the Ollama-adapted OpenAiClient.Service
   // to provide the AgentLanguageModel.Tag service.
   const ollamaAgentLanguageModelLayer = OllamaProvider.OllamaAgentLanguageModelLive.pipe(
     Layer.provide(ollamaAdapterLayer), // Provides OllamaOpenAIClientTag (which is an OpenAiClient.Service)
     Layer.provide(devConfigLayer),     // Provides ConfigurationService
     Layer.provide(telemetryLayer)      // Provides TelemetryService
   );

   // Full application layer
   export const FullAppLayer = Layer.mergeAll(
     telemetryLayer,
     devConfigLayer, // Ensure ConfigurationService is available
     nostrLayer,
     nip04Layer,
     NIP19ServiceLive,
     BIP39ServiceLive,
     BIP32ServiceLive,
     nip28Layer,
     sparkLayer,
     nip90Layer,
     BrowserHttpClient.layerXMLHttpRequest, // General HttpClient for other services
     // ollamaLayer, // This was the old direct OllamaService, remove if fully replaced by AI backend pattern

     // AI Backend Layers:
     // ollamaAdapterLayer, // Already provided to ollamaAgentLanguageModelLayer
     ollamaAgentLanguageModelLayer, // Provides AgentLanguageModel through Ollama

     kind5050DVMLayer, // Depends on AgentLanguageModel
   );

   // ... rest of runtime.ts ...
   ```

**3. (Verify) `src/hooks/ai/useAgentChat.ts`:**

   Ensure `useAgentChat.ts` continues to stringify the messages array into `StreamTextOptions.prompt`. This is now the expected input format for `OllamaAgentLanguageModelLive.streamText`.

   ```typescript
   // src/hooks/ai/useAgentChat.ts
   // ...
   const streamTextOptions: StreamTextOptions = {
     prompt: JSON.stringify({ // This stringification is now handled by the provider
       messages: [
         { role: "system", content: initialSystemMessage },
         ...conversationHistoryForLLM,
       ],
     }),
     // model, temperature, maxTokens can be added here if desired
   };
   // ...
   ```

**4. (Verify) `src/services/ai/providers/ollama/OllamaAsOpenAIClientLive.ts`:**

Ensure the `createChatCompletion` method (part of `client` property) and the top-level `stream` method correctly map incoming parameters (especially `messages`) to what `ollamaIPC.generateChatCompletion` and `ollamaIPC.generateChatCompletionStream` expect. The error log implies this part might be okay if the issue was purely with the `Completions` service wrapper.

The current `OllamaAsOpenAIClientLive.client.createChatCompletion` and `OllamaAsOpenAIClientLive.stream` methods correctly handle `options.messages` (or `params.messages` for stream) by mapping them to `ipcParams`. This should be fine.

**Explanation of the Fix:**

*   The `OllamaAgentLanguageModelLive` layer now correctly processes the `params.prompt` string. It parses this string (which is expected to be a JSON object containing a `messages` array) and constructs a request suitable for the `ollamaAdaptedClient` (an `OpenAiClient.Service` instance).
*   It uses `ollamaAdaptedClient.stream()` for streaming and `ollamaAdaptedClient.client.createChatCompletion()` for non-streaming calls. These methods on the `OpenAiClient.Service` are designed to take the full `messages` array and other OpenAI-compatible parameters.
*   This bypasses the intermediate `Completions` service from `@effect/ai-openai`, which was causing the issue by incorrectly wrapping the already structured prompt string.
*   The `runtime.ts` is updated to reflect this change in dependency for `OllamaAgentLanguageModelLive`.

After these changes, the request structure sent to the Ollama IPC bridge and then to the Ollama server should be correctly formatted for chat completions.
