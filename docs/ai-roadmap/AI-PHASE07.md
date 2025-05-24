Okay, Agent, here are the specific instructions for implementing **Phase 7 (Tool Use Integration - Foundation)**. This phase introduces the basic framework for allowing AI agents to use tools (also known as function calling) by leveraging `@effect/ai`'s `AiTool` and `AiToolkit` abstractions.

**Preamble for the Coding Agent:**

- **Effect-TS Best Practices:** Continue strict adherence.
- **Directory Structure:** New files for tools will go into `src/services/ai/tools/`.
- **Prerequisites:** Phases 0-6 must be completed. You need a working `ChatOrchestratorService` that can interact with at least one LLM provider supporting tool/function calling (e.g., OpenAI, some Anthropic models, newer Ollama models via OpenAI-compatible endpoint).
- **`@effect/schema`:** This is critical for defining tool parameters, success, and failure schemas.
- **Understanding `@effect/ai` Tool Use:** Review `docs/effect/ai/04-tool-use.md`. Pay attention to `AiTool.make`, `AiToolkit.make`, and how tool handlers are implemented as `Effect`s.

---

## Phase 7: Tool Use Integration (Foundation)

**Objective:** Establish the foundational services and patterns for defining, managing, and executing tools that the AI agent can invoke. Implement one or two simple example tools.

**Task 7.1: Define Example Tools**

1.  **Action:** Create the directory `src/services/ai/tools/` (if it doesn't exist).
2.  **Action:** Create `src/services/ai/tools/index.ts` to re-export tools and related types.
3.  **Action:** Create `src/services/ai/tools/WeatherTool.ts` (Example Tool 1).

    - **Content:**

      ```typescript
      // src/services/ai/tools/WeatherTool.ts
      import { Schema } from "@effect/schema";
      import { Data, Effect }_from "effect"; // Data for custom error
      import { AiTool } from "@effect/ai/AiToolkit";
      import { TelemetryService } from "@/services/telemetry"; // Optional: for logging tool execution

      // --- Parameters Schema ---
      export const GetWeatherParamsSchema = Schema.Struct({
        city: Schema.String.pipe(Schema.annotations({ description: "The city name, e.g., San Francisco" })),
        unit: Schema.optional(Schema.Union(Schema.Literal("celsius"), Schema.Literal("fahrenheit"))).pipe(
          Schema.annotations({ description: "Temperature unit, celsius or fahrenheit. Defaults to celsius." })
        ),
      });
      export type GetWeatherParams = Schema.Schema.Type<typeof GetWeatherParamsSchema>;

      // --- Success Schema ---
      export const GetWeatherSuccessSchema = Schema.Struct({
        temperature: Schema.String,
        description: Schema.String,
        humidity: Schema.optional(Schema.String),
      });
      export type GetWeatherSuccess = Schema.Schema.Type<typeof GetWeatherSuccessSchema>;

      // --- Failure Schema ---
      export class GetWeatherToolError extends Data.TaggedError("GetWeatherToolError")<{
        message: string;
        city?: string;
        cause?: unknown;
      }> {}
      // AiTool.make expects the failure type to be a Schema of a union of errors.
      export const GetWeatherToolErrorSchema = Schema.instanceOf(GetWeatherToolError);


      // --- AiTool Definition ---
      export const GetCurrentWeatherTool = AiTool.make("get_current_weather", {
        description: "Fetches the current weather forecast for a specified city.",
        parameters: GetWeatherParamsSchema,
        success: GetWeatherSuccessSchema,
        failure: GetWeatherToolErrorSchema, // Schema for the failure case
      });

      // --- Tool Handler Implementation (Conceptual - will be registered with ToolHandlerService) ---
      // This is an Effectful function. It would typically live in a service that has access
      // to external APIs (like a weather API client) or other application state.
      export const handleGetCurrentWeather = (
        params: GetWeatherParams
      ): Effect.Effect<GetWeatherSuccess, GetWeatherToolError, TelemetryService> => // Example dependency
        Effect.gen(function*(_) {
          const telemetry = yield* _(TelemetryService);
          yield* _(telemetry.trackEvent({ category: "tool_execution", action: "get_current_weather_start", label: params.city }));

          // Mock implementation:
          if (params.city.toLowerCase() === "errorcity") {
            yield* _(telemetry.trackEvent({ category: "tool_execution", action: "get_current_weather_failure_mock", label: params.city }));
            return yield* _(Effect.fail(new GetWeatherToolError({ message: "Mock API error for ErrorCity" })));
          }
          if (params.city.toLowerCase() === "unknowncity") {
              yield* _(telemetry.trackEvent({ category: "tool_execution", action: "get_current_weather_failure_notfound", label: params.city }));
              return yield* _(Effect.fail(new GetWeatherToolError({ message: `City not found: ${params.city}` })));
          }

          const unit = params.unit || "celsius";
          const temp = unit === "celsius" ? `${Math.floor(Math.random() * 20 + 10)}°C` : `${Math.floor(Math.random() * 40 + 50)}°F`;

          const mockResponse: GetWeatherSuccess = {
            temperature: temp,
            description: "Sunny with a chance of awesome.",
            humidity: `${Math.floor(Math.random() * 50 + 30)}%`
          };
          yield* _(telemetry.trackEvent({ category: "tool_execution", action: "get_current_weather_success", label: params.city, value: JSON.stringify(mockResponse)}));
          return mockResponse;
        });
      ```

4.  **Action:** Update `src/services/ai/tools/index.ts`:
    ```typescript
    // src/services/ai/tools/index.ts
    export * from "./WeatherTool";
    // Add other tools here as they are created
    ```

**Task 7.2: Implement `ToolHandlerService`**

1.  **Action:** Create the file `src/services/ai/tools/ToolHandlerService.ts`.
2.  **Content:**

    ```typescript
    // src/services/ai/tools/ToolHandlerService.ts
    import { Context, Effect, Data, Layer, HashMap } from "effect";
    import { Schema } from "@effect/schema";
    import type { AiTool } from "@effect/ai/AiToolkit";
    import { AIToolExecutionError } from "@/services/ai/core/AIError";
    import { TelemetryService } from "@/services/telemetry"; // Assuming it's a dependency

    // Type for a generic tool handler function
    type AnyToolHandler = (input: any) => Effect.Effect<any, any, any>; // More specific types in actual registration

    export interface ToolRegistryEntry<I = any, S = any, E = any, R = any> {
      toolDefinition: AiTool<I, S, E>;
      handler: (input: I) => Effect.Effect<S, E, R>;
      // Layer to provide context R for the handler, if any.
      // If R is 'never', this can be Layer.void.
      handlerContextLayer?: Layer.Layer<R, any, any>;
    }

    export interface ToolHandlerService {
      readonly _tag: "ToolHandlerService";
      registerTool<I, S, E, R>(
        entry: ToolRegistryEntry<I, S, E, R>,
      ): Effect.Effect<void, never>;

      // This method will take the raw tool call from the LLM
      executeTool(
        toolName: string,
        encodedArgsString: string, // LLM usually provides args as a JSON string
      ): Effect.Effect<any, AIToolExecutionError>; // Returns success schema output or AIToolExecutionError

      // Helper to get all registered AiTool definitions for AiToolkit
      getAllToolDefinitions(): Effect.Effect<AiTool<any, any, any>[], never>;
    }

    export const ToolHandlerService =
      Context.GenericTag<ToolHandlerService>("ToolHandlerService");

    export const ToolHandlerServiceLive = Layer.effect(
      ToolHandlerService,
      Effect.gen(function* (_) {
        const telemetry = yield* _(TelemetryService); // ToolHandlerService depends on TelemetryService

        // In-memory registry for tools and their handlers
        let toolRegistry = HashMap.empty<
          string,
          ToolRegistryEntry<any, any, any, any>
        >();

        return ToolHandlerService.of({
          _tag: "ToolHandlerService",
          registerTool: (entry) =>
            Effect.sync(() => {
              toolRegistry = HashMap.set(
                toolRegistry,
                entry.toolDefinition.name,
                entry,
              );
              Effect.runFork(
                telemetry.trackEvent({
                  category: "tool_registry",
                  action: "tool_registered",
                  label: entry.toolDefinition.name,
                }),
              );
            }),

          getAllToolDefinitions: () =>
            Effect.sync(() =>
              Array.from(HashMap.values(toolRegistry)).map(
                (entry) => entry.toolDefinition,
              ),
            ),

          executeTool: (toolName, encodedArgsString) =>
            Effect.gen(function* (_) {
              yield* _(
                telemetry.trackEvent({
                  category: "tool_execution",
                  action: "execute_tool_start",
                  label: toolName,
                  value: encodedArgsString,
                }),
              );

              const entry = HashMap.get(toolRegistry, toolName);
              if (!entry) {
                const error = new AIToolExecutionError({
                  message: `Tool not found: ${toolName}`,
                  toolName,
                });
                yield* _(
                  telemetry.trackEvent({
                    category: "tool_execution",
                    action: "tool_not_found",
                    label: toolName,
                  }),
                );
                return yield* _(Effect.fail(error));
              }

              const { toolDefinition, handler, handlerContextLayer } = entry;

              // 1. Decode/Parse arguments string into the tool's parameter schema type
              let parsedArgs: Schema.Schema.Type<
                typeof toolDefinition.parameters
              >;
              try {
                const rawArgs = JSON.parse(encodedArgsString);
                // Use Schema.decodeUnknown for robust parsing
                parsedArgs = yield* _(
                  Schema.decodeUnknown(toolDefinition.parameters)(rawArgs).pipe(
                    Effect.mapError(
                      (parseError) =>
                        new AIToolExecutionError({
                          message: `Invalid arguments for tool ${toolName}. Schema validation failed.`,
                          toolName,
                          cause: parseError, // Keep detailed schema error
                          context: { encodedArgsString },
                        }),
                    ),
                  ),
                );
              } catch (jsonError) {
                const error = new AIToolExecutionError({
                  message: `Failed to parse JSON arguments for tool ${toolName}.`,
                  toolName,
                  cause: jsonError,
                  context: { encodedArgsString },
                });
                yield* _(
                  telemetry.trackEvent({
                    category: "tool_execution",
                    action: "args_parse_error",
                    label: toolName,
                    value: error.message,
                  }),
                );
                return yield* _(Effect.fail(error));
              }

              // 2. Execute the handler
              let handlerEffect = handler(parsedArgs);
              if (handlerContextLayer) {
                // Provide context if the handler needs it
                handlerEffect = Effect.provide(
                  handlerEffect,
                  handlerContextLayer,
                );
              }

              const result = yield* _(
                Effect.SOrDie(handlerEffect), // If handler fails, its E type is captured by SOrDie
              );

              // SOrDie result can be either S or E. We need to check which one it is.
              // @effect/ai AiTool expects success or failure to be encoded against their schemas.
              // This part needs careful alignment with how @effect/ai AiTool.success/failure are typed and used.
              // For now, assume handler returns S on success or throws E (which SOrDie catches).

              // If handlerEffect succeeded (returned S):
              yield* _(
                telemetry.trackEvent({
                  category: "tool_execution",
                  action: "execute_tool_success",
                  label: toolName,
                  value: JSON.stringify(result),
                }),
              );
              // The LLM expects the *raw* output of the tool, not a schema-encoded one yet.
              // The AiLanguageModel (e.g. OpenAiLanguageModel) will handle schema encoding for tool_result message.
              return result; // This is of type S
            }).pipe(
              Effect.catchAll((error) => {
                // Catches failures from handler or SOrDie
                // If error is already AIToolExecutionError, rethrow.
                // If it's the tool's defined failure type E, wrap it.
                // Otherwise, wrap as a generic AIToolExecutionError.
                let finalError: AIToolExecutionError;
                if (error instanceof AIToolExecutionError) {
                  finalError = error;
                } else if (Schema.is(toolDefinition.failure)(error)) {
                  // Check if it's the defined E type
                  finalError = new AIToolExecutionError({
                    message: `Tool ${toolName} failed with defined error.`,
                    toolName,
                    cause: error, // The E type error
                    context: { encodedArgsString },
                  });
                } else {
                  finalError = new AIToolExecutionError({
                    message: `Unhandled error during execution of tool ${toolName}.`,
                    toolName,
                    cause: error,
                    context: { encodedArgsString },
                  });
                }
                Effect.runFork(
                  telemetry.trackEvent({
                    category: "tool_execution",
                    action: "execute_tool_failure",
                    label: toolName,
                    value: finalError.message,
                  }),
                );
                return Effect.fail(finalError);
              }),
            ),
        });
      }),
    );
    ```

    - **Note on `handlerContextLayer`**: This allows tool handlers to have their own Effect dependencies. For instance, a `WeatherTool` handler might depend on an `HttpWeatherApiClient` service.

**Task 7.3: Implement `CommanderToolkitManagerLive` Layer**

1.  **Action:** Create `src/services/ai/core/AgentToolkitManager.ts` (if only interface was there) or update it to include the `CommanderToolkitManagerLive` layer. For clarity, let's assume a new file for the manager: `src/services/ai/tools/CommanderToolkitManager.ts`.
2.  **Content:**

    ```typescript
    // src/services/ai/tools/CommanderToolkitManager.ts
    import { Layer, Effect, Context } from "effect";
    import { AgentToolkitManager, AiToolkit, AiTool } from "@/services/ai/core"; // Use core definitions
    import { ToolHandlerService } from "./ToolHandlerService";
    // Import your defined tools
    import {
      GetCurrentWeatherTool,
      handleGetCurrentWeather,
      GetWeatherToolErrorSchema,
    } from "./WeatherTool";
    import { TelemetryService } from "@/services/telemetry"; // Needed for WeatherTool handler

    export const CommanderToolkitManagerLive = Layer.effect(
      AgentToolkitManager.Tag,
      Effect.gen(function* (_) {
        const toolHandlerService = yield* _(ToolHandlerService.Tag);
        const telemetryService = yield* _(TelemetryService.Tag); // For WeatherTool's handler context

        // --- Register Tools ---
        // Example: Register WeatherTool
        // The WeatherTool handler needs TelemetryService.
        const weatherToolHandlerContext = Layer.succeed(
          TelemetryService,
          telemetryService,
        );
        yield* _(
          toolHandlerService.registerTool({
            toolDefinition: GetCurrentWeatherTool,
            handler: handleGetCurrentWeather,
            handlerContextLayer: weatherToolHandlerContext,
          }),
        );

        // Register other tools here...

        // --- Toolkit Implementation ---
        return AgentToolkitManager.Tag.of({
          _tag: "AgentToolkitManager",
          getToolkit: () =>
            Effect.gen(function* (_) {
              const toolDefinitions = yield* _(
                toolHandlerService.getAllToolDefinitions(),
              );
              // AiToolkit.make takes AiTool definitions
              // The class syntax `class MyToolkit extends AiToolkit.make(...) {}` is common.
              // Dynamically, we can spread the definitions.
              const toolkit = class extends AiToolkit.make(
                ...toolDefinitions,
              ) {};
              return new toolkit() as AiToolkit; // Cast to AiToolkit
            }),
          // The registerTool on AgentToolkitManager could just proxy to ToolHandlerService
          // or be removed if tools are only registered at startup.
          registerTool: (toolDefinition) =>
            toolHandlerService.registerTool({
              toolDefinition: toolDefinition as AiTool<any, any, any>, // Cast tool
              handler: (input: any) =>
                Effect.die(
                  "Dynamic tool registration handler not implemented on ToolkitManager",
                ), // Placeholder
              // This dynamic registration would need a way to also register the handler and its context.
              // Simpler for now to register all tools at CommanderToolkitManagerLive init.
            }),
        });
      }),
    );
    ```

3.  **Action:** Update `src/services/ai/tools/index.ts`:
    ```typescript
    // src/services/ai/tools/index.ts
    export * from "./WeatherTool";
    export * from "./ToolHandlerService";
    export * from "./CommanderToolkitManager";
    ```

**Task 7.4: Update `ChatOrchestratorService` to Use Tools**

1.  **Action:** Modify `src/services/ai/orchestration/ChatOrchestratorService.ts`.
2.  **Details:**

    - Add `AgentToolkitManager.Tag` and `ToolHandlerService.Tag` as dependencies to `ChatOrchestratorServiceLive`.
    - In `streamConversation` (and `generateConversationResponse`):
      1.  Yield the `AgentToolkitManager` to get the `AiToolkit` instance: `const toolkit = yield* _(Effect.flatMap(agentToolkitManager, atm => atm.getToolkit()));`
      2.  When making the call to the `AgentLanguageModel` provider (via `AiPlan`), pass this `toolkit` in the options. The method used on the provider must support tools (e.g., for `@effect/ai-openai`, this is often part of the `CreateChatCompletionRequest` passed to `chat.completions.create`, which is handled by `provider.streamText` or `provider.generateText` if they accept `tools` in their `StreamTextOptions`/`GenerateTextOptions`). Refer to `@effect/ai-[provider]` docs.
          - Example for `OpenAiLanguageModel` (conceptual, as `streamText` params might differ):
            ```typescript
            // Inside streamConversation, after getting the 'provider' from AiPlan
            // const streamOptions = { ...options, prompt: conversationHistoryObject, tools: toolkit };
            // return provider.streamText(streamOptions)
            // This will return a stream of AiTextChunk OR AiToolCall
            ```
      3.  **Implement the Tool Calling Loop:**
          - The stream from `provider.streamText` (or equivalent) will now yield `AiTextChunk` _or_ `AiToolCall` (from `@effect/ai/AiLanguageModel`).
          - If an `AiToolCall` is received:
            - Log "Agent is using tool: [tool_name]..." (to UI and telemetry).
            - Extract `toolName` and `argsString` from `AiToolCall.toolCall`.
            - Invoke `toolHandlerService.executeTool(toolName, argsString)`.
            - The result from `executeTool` (success data `S` or error `E` of the tool) needs to be formatted as an `AgentChatMessage` with `role: "tool"` and `tool_call_id` matching the original `AiToolCall`.
            - This "tool" role message is then added to the `conversationHistory`.
            - Make a _new_ call to `provider.streamText` with the updated `conversationHistory` (including the tool result message) to get the agent's final response.
          - If an `AiTextChunk` is received, append it to the UI as usual.
          - This loop continues until the LLM provides a final text response without further tool calls.

    **Revised `streamConversation` snippet in `ChatOrchestratorService.ts` (Conceptual):**

    ```typescript
    // ... inside ChatOrchestratorServiceLive ...
    const agentToolkitManager = yield* _(AgentToolkitManager.Tag);
    const toolHandlerService = yield* _(ToolHandlerService.Tag);
    // ...

    streamConversation: ({ messages, preferredProvider, options }) => {
      const initialPrompt = { messages }; // AgentChatMessage[]

      // Recursive function to handle the conversation flow with potential tool calls
      const converse = (
        currentMessages: AgentChatMessage[]
      ): Stream.Stream<AiTextChunk, AIProviderError | AIConfigurationError> =>
        Stream.unwrap(Effect.gen(function*(_) {
          const toolkit = yield* _(agentToolkitManager.getToolkit());
          const plan = /* ... build AiPlan as in Phase 6 ... */
          const planProvider = yield* _(plan); // This is Provider<AgentLanguageModel>

          const streamOptions: StreamTextOptions = { ...options, prompt: { messages: currentMessages }, tools: toolkit };

          let accumulatedText = "";
          const toolCalls: any[] = []; // Store tool calls from the current LLM turn

          // This stream can yield AiTextChunk or AiToolCall
          const llmStream = planProvider.streamText(streamOptions);

          // Need to collect all text and all tool_calls before deciding next step
          yield* _(Stream.runForEach(llmStream, (chunkOrCall) => Effect.sync(() => {
            if (chunkOrCall._tag === "AiTextChunk") {
              accumulatedText += chunkOrCall.text;
            } else if (chunkOrCall._tag === "AiToolCall") {
              toolCalls.push(chunkOrCall.toolCall);
            }
          })));

          // After LLM stream is exhausted for this turn:
          const assistantResponseMessages: AgentChatMessage[] = [];
          if (accumulatedText) {
            assistantResponseMessages.push({ role: "assistant", content: accumulatedText });
          }
          if (toolCalls.length > 0) {
            assistantResponseMessages.push({ role: "assistant", content: null, tool_calls: toolCalls as any /* map to schema */ });
          }

          // If there are tool calls, execute them and recurse
          if (toolCalls.length > 0) {
            yield* _(telemetry.trackEvent({ category: "orchestrator", action: "tool_calls_requested", value: JSON.stringify(toolCalls)}));
            const toolResultMessagesEffect = Effect.all(
              toolCalls.map(tc =>
                toolHandlerService.executeTool(tc.name, tc.arguments).pipe(
                  Effect.map(successOutput => ({
                    role: "tool" as const,
                    tool_call_id: tc.id,
                    name: tc.name,
                    content: JSON.stringify(successOutput), // Tool output must be stringified
                  })),
                  Effect.catchAll(toolError => { // Catch errors from tool execution
                    // Error here is AIToolExecutionError
                    return Effect.succeed({
                        role: "tool" as const,
                        tool_call_id: tc.id,
                        name: tc.name,
                        content: JSON.stringify({ error: toolError.message, details: toolError.cause }), // Stringify error
                    });
                  })
                )
              )
            );
            const toolResults = yield* _(toolResultMessagesEffect);
            // Yield current assistant messages (text + tool_call requests) first
            // Then recurse with history including tool results
            return Stream.fromIterable(assistantResponseMessages.map(m => ({_tag: "AiTextChunk", text: m.content || "", message:m }))).pipe( // Adapt to AiTextChunk
                Stream.concat(converse([...currentMessages, ...assistantResponseMessages, ...toolResults]))
            );
          } else {
            // No tool calls, just stream the accumulated text as final response
            runTelemetry({ category: "orchestrator", action: "stream_conversation_final_text", label: preferredProvider.key });
            // Map AgentChatMessage to AiTextChunk for the stream output
            return Stream.fromIterable(assistantResponseMessages.map(m => ({_tag: "AiTextChunk", text: m.content || "", message:m })));
          }
        }));
      return converse(messages);
    },
    // ... generateConversationResponse would need similar tool loop logic ...
    ```

    - **Important:** The structure of `AiToolCall` from `@effect/ai` and how results are sent back needs to be precisely matched. The LLM might return text _and_ tool calls in the same response. The `streamText` or `generateText` method used must support this mixed output. OpenAI's API can do this. `OpenAiLanguageModel` from `@effect/ai-openai` might have specific methods like `chat.completions.toolMessages` or its stream variant for this. Adjust the call accordingly. The example above simplifies by collecting all text and tool calls first.

**Task 7.5: Update UI in `AgentChatPane.tsx`**

1.  **Action:** Modify `src/components/ai/AgentChatPane.tsx` and `src/hooks/ai/useAgentChat.ts`.
2.  **Details in `useAgentChat.ts`:**
    - The `sendMessage` function will now call `chatOrchestrator.streamConversation`.
    - The stream from `streamConversation` will yield `AiTextChunk` containing `AgentChatMessage`.
    - The hook needs to handle these messages:
      - `role: "assistant"` with `content`: Regular text response.
      - `role: "assistant"` with `tool_calls`: Display "Agent is using tool X..." message. (The actual tool execution happens in `ChatOrchestratorService`).
      - `role: "tool"`: Display "Tool X returned: [result]" message.
3.  **Details in `AgentChatPane.tsx`:**
    - Update message rendering in `ChatWindow` to differentiate and style these message types (user, assistant, system, tool usage, tool result).

**Task 7.6: Runtime Integration Update**

1.  **Action:** Modify `src/services/runtime.ts`.
2.  **Details:**

    - Import `ToolHandlerServiceLive` and `CommanderToolkitManagerLive`.
    - Add them to `FullAppLayer`. Ensure their dependencies are met (e.g., `ToolHandlerServiceLive` needs `TelemetryService`; `CommanderToolkitManagerLive` needs `ToolHandlerService.Tag` and `TelemetryService.Tag`).

      ```typescript
      // src/services/runtime.ts
      // ...
      import {
        ToolHandlerServiceLive,
        CommanderToolkitManagerLive,
      } from "@/services/ai/tools";
      // ...

      const toolHandlerLayer = ToolHandlerServiceLive.pipe(
        Layer.provide(telemetryLayer),
      );
      const toolkitManagerLayer = CommanderToolkitManagerLive.pipe(
        Layer.provide(toolHandlerLayer),
        Layer.provide(telemetryLayer), // If handlers need telemetry directly or for registration
      );

      const chatOrchestratorLayer = ChatOrchestratorServiceLive.pipe(
        Layer.provide(ConfigurationServiceLive),
        Layer.provide(BrowserHttpClient.layerXMLHttpRequest),
        Layer.provide(telemetryLayer),
        Layer.provide(toolkitManagerLayer), // ChatOrchestrator needs the toolkit
        Layer.provide(toolHandlerLayer), // And the ToolHandlerService to execute
      );

      export const FullAppLayer = Layer.mergeAll(
        // ...
        toolHandlerLayer,
        toolkitManagerLayer,
        chatOrchestratorLayer,
        // ...
      );
      ```

---

**Verification for Phase 7:**

1.  **Type Checking:** Run `pnpm t`.
2.  **Unit Tests:**
    - `WeatherTool.test.ts`: Test `handleGetCurrentWeather` with mocked dependencies (if any, e.g., a mock `HttpWeatherApiClient`).
    - `ToolHandlerService.test.ts`: Test tool registration and `executeTool` (success, tool not found, arg parsing error, handler error). Mock `toolDefinition` and `handler`.
    - `CommanderToolkitManager.test.ts`: Test `getToolkit` returns an `AiToolkit` with registered tool definitions.
    - Update `ChatOrchestratorService.test.ts`: Mock `AgentToolkitManager` and `ToolHandlerService`. Test the tool calling loop logic.
    - Update `useAgentChat.test.ts`: Mock `ChatOrchestratorService`. Test correct handling of different message types from the stream (text, tool_call, tool_result).
3.  **UI Functionality (Manual Testing):**
    - In `AgentChatPane`, send a prompt that should trigger the `get_current_weather` tool (e.g., "What's the weather in London?").
    - Observe:
      1.  Initial LLM processing.
      2.  A message like "Agent is using tool: get_current_weather with parameters: {"city": "London"}".
      3.  The (mocked) tool result message, e.g., "Tool get_current_weather returned: {"temperature": "15°C", "description": "Cloudy"}".
      4.  The agent's final textual response incorporating the weather information.
    - Test tool error handling (e.g., prompt for "weather in ErrorCity").

Upon completion, Commander will have a basic but functional tool use system, allowing the AI agent to call predefined tools to gather information or perform actions, with the interactions orchestrated by the Effect AI backend.
