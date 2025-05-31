Okay, Agent, the base integration of Jason Kneen's Claude Code SDK (via our adapted CLI executor) is complete. The next logical step, aligning with our AI Roadmap (Phase 7), is to **enable tool use specifically for this Claude Code CLI provider.**

**Preamble for the Coding Agent:**

1.  **Reference Implementation:** Utilize the vendored SDK files in `src/kneen-claude-code-sdk/` as a primary reference, particularly:
    *   `client/chat.ts`: Study how the `create` and `createStream` methods handle the `tools` parameter.
    *   `implementations/converters.ts`: Understand how `convertOpenAIToAnthropicTools` (if used by the SDK for its OpenAI-style API surface) or how tools are generally formatted for the CLI.
    *   `types/index.ts`: For `OpenAITool` and related type definitions.
2.  **CLI Tool Support:** We assume the `@anthropic-ai/claude-code` CLI, when invoked by our adapted `ClaudeCliExecutor`, supports OpenAI-style tool/function calling. The `ClaudeCliExecutor`'s `buildArgs` method will need to be the primary point for translating our `AiToolkit` into CLI-compatible arguments.
3.  **Core Abstractions:**
    *   Our `AgentLanguageModel` interface (in `src/services/ai/core/AgentLanguageModel.ts`) already expects `tools?: AiToolkit` and `toolChoice?: string | object` in its `StreamTextOptions` and `GenerateTextOptions` (as per `@effect/ai` v0.16.5 standards).
    *   Our `AiResponse` class (in `src/services/ai/core/AiResponse.ts`) extends `@effect/ai`'s `AiResponse` and includes a `toolCalls` getter. It should correctly surface `ToolCallPart`s.
4.  **Existing Tool Infrastructure:** The `ChatOrchestratorService` is already designed with a tool-calling loop. `ToolHandlerService` and `CommanderToolkitManagerLive` (from AI Roadmap Phase 7) are in place to define, register, and execute tools like `WeatherTool`.
5.  **Focus:** This phase focuses on the *provider-specific* implementation for handling tools with the Claude Code CLI, not on changing the core tool services or orchestrator logic (unless minor adaptations are needed for provider compatibility).

---

**I. Enhance `ClaudeCliExecutor` (Main Process) for Tool Support**

1.  **Update `ClaudeExecParams` type:**
    *   **File:** `src/services/ai/providers/claude_code_cli/claudeCliUtils.ts`
    *   **Action:** Add `tools` and `tool_choice` to the `ClaudeExecParams` interface. These will likely be passed as JSON strings or require specific CLI flags.
        ```typescript
        // src/services/ai/providers/claude_code_cli/claudeCliUtils.ts
        // ... existing ClaudeExecParams ...
        export interface ClaudeExecParams {
          // ... existing fields ...
          tools?: string; // JSON string of OpenAI-formatted tools
          tool_choice?: string; // e.g., "auto", "none", or specific tool like {"type": "function", "function": {"name": "my_tool"}} as a JSON string
          // ...
        }
        ```

2.  **Adapt `ClaudeCliExecutor.buildArgs` method:**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCliExecutor.ts`
    *   **Action:** Modify `buildArgs` to handle the new `tools` and `tool_choice` parameters.
        *   Refer to `docs/claude-code/sdk-anthropic-site.md` (CLI docs) and the vendored SDK for how the `@anthropic-ai/claude-code` CLI expects tool definitions. It might be via a specific flag (e.g., `--tools <json_string>`) or as part of the prompt content in a specific format. Jason Kneen's SDK likely abstracts this; `src/kneen-claude-code-sdk/client/chat.ts` might show it passing tools to an underlying call.
        *   If the CLI uses `--allowedTools tool_name1,tool_name2`, you'd extract names from the `tools` JSON. However, full tool schemas are usually needed by the LLM.
        *   **Most likely scenario for OpenAI compatibility:** The CLI expects a JSON string representing the tools array.
        ```typescript
        // Inside ClaudeCliExecutor.buildArgs
        // ...
        if (params.tools) {
          args.push('--tools'); // Or the correct CLI flag for tools
          args.push(params.tools); // Pass the JSON string of tools
        }
        if (params.tool_choice) {
          args.push('--tool-choice'); // Or the correct CLI flag
          args.push(params.tool_choice); // Pass the JSON string or keyword
        }
        // ...
        ```

**II. Update `ClaudeCodeCliService` (Main Process) for Tool Parameters**

1.  **No structural changes needed** to `ClaudeCodeCliService.ts` or `ClaudeCodeCliServiceLive.ts` if `ClaudeExecParams` is correctly updated, as the service methods already accept `ClaudeExecParams`. Ensure type safety carries through.

**III. Update IPC Bridge for Tool Parameters**

1.  **No structural changes needed** to `claude-code-cli-channels.ts`, `claude-code-cli-listeners.ts`, or `claude-code-cli-context.ts` if they already pass the `ClaudeExecParams` (or a generic `sdkParams: any`) object through. The `ClaudeExecParams` type update in `claudeCliUtils.ts` (which should be imported by `claude-code-cli-context.ts` and implicitly by `claude-code-cli-listeners.ts`) will cover this.
    *   Ensure the types in `claude-code-cli-context.ts` for `params` in `chatCompletion` and `streamChat` are `ClaudeExecParams`.
    *   Ensure listeners in `claude-code-cli-listeners.ts` correctly type their `cliParams` or `sdkParams` as `ClaudeExecParams`.

**IV. Enhance Renderer `AgentLanguageModel` Provider (`ClaudeCodeCliAgentLanguageModelLive.ts`)**

1.  **Tool Formatting Utility:**
    *   **File:** `src/services/ai/providers/claude_code_cli/claudeCliFormatters.ts`
    *   **Action:** Create a helper function to format `AiToolkit` (from `@effect/ai/AiToolkit` which our `AgentToolkitManager` provides) into the JSON string format expected by the `ClaudeExecParams.tools`. This will likely be an array of OpenAI-formatted tool objects.
        ```typescript
        // src/services/ai/providers/claude_code_cli/claudeCliFormatters.ts
        import type { AiTool, AiToolkit } from "@effect/ai/AiToolkit";
        import type { AgentChatMessage } from "@/services/ai/core"; // For formatMessagesForClaudeCli

        export function formatMessagesForClaudeCli(messages: AgentChatMessage[]): string { /* ... (existing implementation) ... */ }

        // New function
        export function formatAiToolkitForClaudeCli(toolkit?: AiToolkit): string | undefined {
          if (!toolkit || !toolkit.tools || Object.keys(toolkit.tools).length === 0) {
            return undefined;
          }
          // @effect/ai AiTool definition has 'name', 'description', and 'parameters' (Schema<I>)
          // We need to convert this to OpenAI tool format: { type: "function", function: { name, description, parameters: JSONSchema } }
          const openAITools = Object.values(toolkit.tools).map((tool: AiTool.Any) => ({
            type: "function" as const,
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters.jsonSchema, // Assuming effect/schema's .jsonSchema gives OpenAI compatible JSON schema
            },
          }));
          return JSON.stringify(openAITools);
        }

        // Helper for tool_choice, assuming it might be an object for a specific function
        export function formatToolChoiceForClaudeCli(toolChoice?: string | { type: "function", function: { name: string } }): string | undefined {
            if (typeof toolChoice === 'string') return toolChoice;
            if (typeof toolChoice === 'object') return JSON.stringify(toolChoice);
            return undefined;
        }
        ```

2.  **Update Provider Implementation:**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeCliAgentLanguageModelLive.ts`
    *   **Action:**
        *   Import `formatAiToolkitForClaudeCli` and `formatToolChoiceForClaudeCli`.
        *   In `streamText` and `generateText` methods:
            *   When preparing `sdkParams` (which is of type `ClaudeExecParams` for the IPC call):
                *   If `options.tools` (the `AiToolkit` from `AgentLanguageModel` options) is present, use `formatAiToolkitForClaudeCli(options.tools)` to generate the `tools` JSON string for `sdkParams`.
                *   If `options.tool_choice` is present, use `formatToolChoiceForClaudeCli(options.tool_choice)` for `sdkParams`.
        *   **Schema for CLI Output with Tool Calls:**
            *   Update `ClaudeCliStreamChunkSchema` and `ClaudeCliCompletionResponseSchema` to include `tool_calls`. Refer to `src/kneen-claude-code-sdk/types/index.ts` for the `OpenAIChatCompletionChunk` and `OpenAICompletionChoice` structures related to `tool_calls`. The `delta` or `message` object should now potentially contain `tool_calls: [{ id: string, type: "function", function: { name: string, arguments: string } }]`.
                ```typescript
                // Example update for ClaudeCliStreamChunkSchema
                const ClaudeCliToolCallDeltaSchema = Schema.Struct({ // Based on OpenAI format
                  index: Schema.optional(Schema.Number), // Sometimes index is on the tool_call itself for streaming
                  id: Schema.optional(Schema.String),
                  type: Schema.optional(Schema.Literal("function")),
                  function: Schema.optional(Schema.Struct({
                    name: Schema.optional(Schema.String),
                    arguments: Schema.optional(Schema.String), // Partial arguments string
                  })),
                });

                const ClaudeCliStreamChunkSchema = Schema.Struct({
                  choices: Schema.Array(Schema.Struct({
                    delta: Schema.Struct({
                      content: Schema.optional(Schema.NullishOr(Schema.String)),
                      tool_calls: Schema.optional(Schema.Array(ClaudeCliToolCallDeltaSchema)) // Added
                    }),
                    // ...
                  })),
                  // ...
                });

                // Similar update for ClaudeCliCompletionResponseSchema choices[0].message.tool_calls
                const ClaudeCliToolCallSchema = Schema.Struct({
                    id: Schema.String,
                    type: Schema.Literal("function"),
                    function: Schema.Struct({
                        name: Schema.String,
                        arguments: Schema.String // Complete JSON string of arguments
                    })
                });
                const ClaudeCliCompletionResponseSchema = Schema.Struct({
                    choices: Schema.Array(Schema.Struct({
                        message: Schema.Struct({
                            content: Schema.optional(Schema.NullishOr(Schema.String)),
                            tool_calls: Schema.optional(Schema.Array(ClaudeCliToolCallSchema)) // Added
                        }),
                        // ...
                    })),
                    // ...
                });
                ```
        *   **Update `parseAndMapCliJsonOutput` function:**
            *   When mapping the decoded CLI JSON output to our `AiResponse.fromSimple`, extract `tool_calls` if present and map them to the structure expected by `AiResponse.fromSimple` (which is `Array<{id: string; name: string; arguments: Record<string, unknown>;}>`). The CLI output's `arguments` will be a JSON string that needs parsing.
                ```typescript
                // Inside parseAndMapCliJsonOutput, when constructing for AiResponse.fromSimple
                const choice = decoded.choices[0];
                const textContent = (choice as any)?.delta?.content || (choice as any)?.message?.content || "";

                let toolCallsForAiResponse: Array<{id: string; name: string; arguments: Record<string, unknown>}> | undefined;

                // Handle tool_calls from non-streaming response
                const messageToolCalls = (choice as any)?.message?.tool_calls;
                if (messageToolCalls && Array.isArray(messageToolCalls)) {
                    toolCallsForAiResponse = messageToolCalls.map(tc => ({
                        id: tc.id,
                        name: tc.function.name,
                        arguments: JSON.parse(tc.function.arguments) // Parse arguments string
                    }));
                }

                // Handle tool_calls from streaming response (delta)
                const deltaToolCalls = (choice as any)?.delta?.tool_calls;
                if (deltaToolCalls && Array.isArray(deltaToolCalls)) {
                    // Streaming tool calls can be partial. The ChatOrchestrator or AiResponse parts handling will need to aggregate them.
                    // For AiResponse.fromSimple, we might map them as best as possible.
                    // The @effect/ai AiResponse parts system (_tag: "ToolCallPart") is designed for this.
                    // For now, let's assume AiResponse.fromSimple wants complete or near-complete structures.
                    // This part is tricky for streaming as arguments can stream.
                    // We might need to emit AiResponse with partial tool call info, or the schema needs to be more flexible.
                    // For now, this is a simplified mapping:
                    toolCallsForAiResponse = deltaToolCalls.map(tcDelta => ({
                        id: tcDelta.id || `partial_tc_${Date.now()}`, // Generate temp id if missing
                        name: tcDelta.function?.name || "unknown_tool",
                        // Arguments might be partial. For AiResponse.fromSimple, we might need to pass as string or handle reconstruction.
                        // Let's pass the string and let AiResponse internals or consumers handle it.
                        arguments: tcDelta.function?.arguments ? JSON.parse(tcDelta.function.arguments) : {}
                    })).filter(tc => tc.id && tc.name); // Filter out incomplete parts for now
                }

                return AiResponse.fromSimple({ text: textContent, toolCalls: toolCallsForAiResponse });
                ```
            *   **Note on Streaming Tool Calls:** The `arguments` for a tool call can also be streamed by the LLM. The `AiResponse` `ToolCallPart` in `@effect/ai` handles this by accumulating argument chunks. Ensure our `AiResponse.fromSimple` or the internal `parts` construction correctly translates the CLI's streamed `tool_calls` (if it streams them that way) into this structure. If `AiResponse.fromSimple` is not designed for partial tool calls from streams, we might need to construct `AiResponse({ parts: [...] })` directly, creating `ToolCallPart` instances and managing argument accumulation. This is a complex part; for this iteration, a best-effort mapping for `AiResponse.fromSimple` is acceptable. The `ChatOrchestratorService` should be robust to receiving multiple `AiResponse` chunks that build up a full tool call.

**V. Testing Updates**

1.  **`ClaudeCliExecutor.test.ts`:**
    *   Add test cases to `buildArgs` verifying that `tools` and `tool_choice` from `ClaudeExecParams` are converted to the correct CLI flags and formatted JSON strings.
2.  **`ClaudeCodeCliServiceLive.test.ts`:**
    *   Test that `executeCommand` and `streamCommand` correctly pass tool-related parameters from `ClaudeExecParams` to the (mocked) `ClaudeCliExecutor`.
3.  **`ClaudeCodeCliAgentLanguageModelLive.test.ts`:**
    *   Test `streamText` and `generateText`:
        *   When `options.tools` is provided, verify `formatAiToolkitForClaudeCli` is called and its output is passed to the (mocked) IPC `streamChat`/`chatCompletion` call in `sdkParams.tools`.
        *   Mock IPC responses that include `tool_calls` (in OpenAI format). Verify `parseAndMapCliJsonOutput` correctly extracts these and they appear in the resulting `AiResponse.toolCalls` (or `AiResponse.parts` as `ToolCallPart`).
4.  **`ChatOrchestratorService.test.ts` (Augment):**
    *   In existing tool-calling loop tests, ensure that when the "claude_code_cli" provider is selected:
        *   The (mocked) `ClaudeCodeCliAgentLanguageModelLive` receives the `AiToolkit`.
        *   Simulate the provider returning an `AiResponse` with `toolCalls`.
        *   Verify `ToolHandlerService.executeTool` is called and the tool result is correctly sent back to the (mocked) Claude Code provider.

---

This phase focuses on plumbing the tool information through the layers for the Claude Code CLI provider. The accurate parsing and handling of streamed tool call arguments will be the most challenging part and may require further refinement based on how the `@anthropic-ai/claude-code` CLI actually streams this information. Referencing `src/kneen-claude-code-sdk/client/chat.ts`'s `createStream` method's handling of chunks will be vital.
