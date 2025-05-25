Okay, this is an exciting addition! We'll integrate Jason Kneen's Claude Code SDK as a new AI provider. The key will be to manage the CLI interaction via the Electron main process and expose it to our renderer-side `AgentLanguageModel` abstraction through IPC.

Here are the specific coding instructions:

**Phase C1: Dependencies & CLI Management**

1.  **Add SDK Dependency:**
    *   **File:** `package.json`
    *   **Action:** Add Jason Kneen's SDK to `dependencies`. If it's not on npm, you might need to add it as a git dependency or submodule. For now, assume a placeholder name, and the agent can find the actual one if published (e.g., `@jasonkneen/claude-code-sdk`).
        ```json
        // In "dependencies":
        "@jasonkneen/claude-code-sdk": "latest", // Or specific version/git URL
        ```
    *   **Action:** Run `pnpm install`.

2.  **Configuration for CLI:**
    *   **File:** `src/services/configuration/ConfigurationServiceImpl.ts` (inside `DefaultDevConfigLayer`)
    *   **Action:** Add new configuration keys for the Claude Code CLI provider.
        ```typescript
        // Inside DefaultDevConfigLayer Effect.gen block:
        yield* _(configService.set("ANTHROPIC_API_KEY", "YOUR_ANTHROPIC_API_KEY_HERE_OR_LEAVE_BLANK_FOR_ENV_VAR")); // User must provide this
        yield* _(configService.set("CLAUDE_CODE_CLI_PATH", "")); // Optional: path to claude-code CLI if not in PATH
        yield* _(configService.set("CLAUDE_CODE_PROVIDER_ENABLED", "false")); // Disabled by default
        yield* _(configService.set("CLAUDE_CODE_DEFAULT_MODEL", "claude-3-opus-20240229")); // Example model, confirm what the CLI uses/supports
        yield* _(configService.set("CLAUDE_CODE_PROVIDER_NAME", "Claude Code (CLI)")); // User-facing name
        ```
    *   **Note:** The SDK might pick up `ANTHROPIC_API_KEY` from environment variables by default. Our `ConfigurationService` will provide it explicitly.

**Phase C2: Effect-TS Service for Claude Code SDK (Main Process)**

This service will run in the Electron main process to manage the CLI subprocess.

1.  **Create Service Interface & Tag:**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeSdkClient.ts`
    *   **Content:**
        ```typescript
        import { Context } from "effect";
        import type { ClaudeCode } from "@jasonkneen/claude-code-sdk"; // Adjust if SDK name differs

        export interface ClaudeCodeSdkClientService {
          readonly client: ClaudeCode;
        }
        export const ClaudeCodeSdkClientService = Context.GenericTag<ClaudeCodeSdkClientService>("ClaudeCodeSdkClientService");
        ```

2.  **Create Service Implementation (Layer):**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeSdkClientLive.ts`
    *   **Content:**
        ```typescript
        import { Effect, Layer, Option } from "effect";
        import { ClaudeCode } from "@jasonkneen/claude-code-sdk"; // Adjust SDK import
        import { ConfigurationService, ConfigError, SecretNotFoundError } from "@/services/configuration";
        import { ClaudeCodeSdkClientService } from "./ClaudeCodeSdkClient";
        import { AiConfigurationError } from "@/services/ai/core";

        export const ClaudeCodeSdkClientLive = Layer.effect(
          ClaudeCodeSdkClientService,
          Effect.gen(function*(_) {
            const configService = yield* _(ConfigurationService);

            const apiKey = yield* _(
              configService.getSecret("ANTHROPIC_API_KEY").pipe(
                Effect.catchTag("SecretNotFoundError", (e) =>
                  Effect.fail(new AiConfigurationError({ message: "ANTHROPIC_API_KEY not found for Claude Code SDK.", cause: e }))
                ),
                Effect.catchTag("ConfigError", (e) =>
                  Effect.fail(new AiConfigurationError({ message: "Error fetching ANTHROPIC_API_KEY for Claude Code SDK.", cause: e }))
                )
              )
            );

            if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("YOUR_ANTHROPIC_API_KEY_HERE")) {
                return yield* _(Effect.fail(new AiConfigurationError({ message: "Invalid or placeholder ANTHROPIC_API_KEY configured for Claude Code SDK."})));
            }

            const cliPathOpt = yield* _(
              configService.get("CLAUDE_CODE_CLI_PATH").pipe(
                Effect.map(path => path.trim() ? Option.some(path) : Option.none()),
                Effect.catchTag("ConfigError", () => Effect.succeed(Option.none<string>())) // If key not found, treat as none
              )
            );

            try {
              const clientInstance = new ClaudeCode({
                apiKey: apiKey,
                cliPath: Option.getOrUndefined(cliPathOpt),
                // verbose: true, // Optional: for debugging CLI interaction
              });
              return { client: clientInstance };
            } catch (e) {
              return yield* _(Effect.fail(new AiConfigurationError({ message: "Failed to instantiate ClaudeCode SDK client.", cause: e })));
            }
          })
        );
        ```
    *   **Note:** This layer needs to be instantiated in the Electron **main process's** Effect runtime. We'll need to adapt `src/main.ts` if it doesn't already have a minimal Effect runtime for such main-process services.

**Phase C3: IPC Bridge for Claude Code SDK Service**

1.  **Define IPC Channels:**
    *   **File:** `src/helpers/ipc/claude_code_cli/claude-code-cli-channels.ts`
    *   **Content:**
        ```typescript
        export const CLAUDE_CODE_CHAT_COMPLETION_CHANNEL = "claude-code-cli:chat-completion";
        export const CLAUDE_CODE_CHAT_STREAM_CHANNEL = "claude-code-cli:chat-stream";
        // Add more channels if other SDK features are exposed (e.g., tools, sessions)

        export const claudeCodeCliChannels = {
          chatCompletion: CLAUDE_CODE_CHAT_COMPLETION_CHANNEL,
          chatStream: CLAUDE_CODE_CHAT_STREAM_CHANNEL,
        };
        ```

2.  **Implement Main Process IPC Listeners:**
    *   **File:** `src/helpers/ipc/claude_code_cli/claude-code-cli-listeners.ts`
    *   **Action:** Create listeners similar to `ollama-listeners.ts`. These listeners will:
        *   Depend on `ClaudeCodeSdkClientService.Tag` (provided by a main-process Effect runtime).
        *   Call the SDK methods (e.g., `client.chat.completions.create` or `client.chat.completions.createStream`).
        *   For streaming, handle chunks, completion, and errors, sending them back to the renderer via `event.sender.send`.
        *   Use the `extractErrorForIPC` helper (from `ollama-listeners.ts`) for error serialization.
    *   **Snippet (Conceptual for streaming):**
        ```typescript
        // Inside claude-code-cli-listeners.ts
        import { ipcMain } from "electron";
        import { claudeCodeCliChannels } from "./claude-code-cli-channels";
        import { Effect, Stream, Cause, Exit } from "effect";
        import { ClaudeCodeSdkClientService } from "@/services/ai/providers/claude_code_cli/ClaudeCodeSdkClient";
        // ... main process runtime setup ...

        // Assume mainProcessRuntime is an initialized Effect runtime in main.ts
        // that includes ClaudeCodeSdkClientLive and ConfigurationServiceLive (for API keys)

        ipcMain.on(claudeCodeCliChannels.chatStream, async (event, requestId, sdkParams) => {
          const mainProcessRuntime = getOrCreateMainProcessRuntime(); // You'll need a way to get/create this

          const program = Effect.gen(function*(_) {
            const sdkService = yield* _(ClaudeCodeSdkClientService);
            // Jason Kneen's SDK stream is an AsyncGenerator
            const stream = sdkService.client.chat.completions.createStream(sdkParams);
            for await (const chunk of stream) {
              if (event.sender.isDestroyed()) break;
              event.sender.send(`${claudeCodeCliChannels.chatStream}:chunk`, requestId, chunk);
            }
          });

          try {
            await Effect.runPromise(Effect.provide(program, mainProcessRuntime));
            if (!event.sender.isDestroyed()) {
              event.sender.send(`${claudeCodeCliChannels.chatStream}:done`, requestId);
            }
          } catch (error) {
            if (!event.sender.isDestroyed()) {
              event.sender.send(`${claudeCodeCliChannels.chatStream}:error`, requestId, extractErrorForIPC(error));
            }
          } finally {
            // Cleanup logic if needed
          }
        });
        ```
    *   **Note:** This implies `src/main.ts` will need to set up a minimal Effect runtime that includes `ClaudeCodeSdkClientLive` and its dependencies (like `ConfigurationService`). The `addOllamaEventListeners` pattern is a good reference.

3.  **Expose IPC Context in Preload:**
    *   **File:** `src/helpers/ipc/claude_code_cli/claude-code-cli-context.ts`
    *   **Action:** Similar to `ollama-context.ts`, expose functions via `window.electronAPI.claudeCodeCli` for invoking main process handlers.
        ```typescript
        // claude-code-cli-context.ts
        import { contextBridge, ipcRenderer } from "electron";
        import { claudeCodeCliChannels } from "./claude-code-cli-channels";

        export function exposeClaudeCodeCliContext() {
          contextBridge.exposeInMainWorld("electronAPI", {
            ...(window.electronAPI || {}),
            claudeCodeCli: {
              chatCompletion: (request: any) => ipcRenderer.invoke(claudeCodeCliChannels.chatCompletion, request),
              streamChat: (
                request: any,
                onChunk: (chunk: any) => void,
                onDone: () => void,
                onError: (error: any) => void
              ) => {
                const requestId = `claude-code-stream-${Date.now()}-${Math.random()}`;
                // Setup listeners for :chunk, :done, :error for this requestId
                // Send initial request via ipcRenderer.send(claudeCodeCliChannels.chatStream, requestId, request)
                // Return a cancellation function
                // (Refer to ollama-context.ts for detailed structure)
                const chunkListener = (_: any, id: string, chunk: any) => { /* ... */ };
                // ... similar listeners for done and error ...
                ipcRenderer.on(`${claudeCodeCliChannels.chatStream}:chunk`, chunkListener);
                // ...
                ipcRenderer.send(claudeCodeCliChannels.chatStream, requestId, request);
                return () => { /* ipcRenderer.send cancel, remove listeners */ };
              },
            },
          });
        }
        ```
    *   **Action:** Update `src/helpers/ipc/context-exposer.ts` to call `exposeClaudeCodeCliContext()`.

**Phase C4: `AgentLanguageModel` Provider for Claude Code CLI (Renderer Process)**

1.  **Create Provider Implementation:**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeCliAgentLanguageModelLive.ts`
    *   **Content:** This layer will provide `AgentLanguageModel.Tag`.
        ```typescript
        import { Effect, Layer, Stream } from "effect";
        import { AgentLanguageModel, AiResponse, AiProviderError, StreamTextOptions, GenerateTextOptions, GenerateStructuredOptions } from "@/services/ai/core";
        import { ConfigurationService } from "@/services/configuration";
        import { TelemetryService } from "@/services/telemetry";
        // Assuming SDK types are compatible with OpenAI or we map them
        import type { CreateChatCompletionRequest, ChatCompletionChunk } from "@jasonkneen/claude-code-sdk/dist/client/chat"; // Adjust import path

        export const ClaudeCodeCliAgentLanguageModelLiveLayer = Layer.effect(
          AgentLanguageModel.Tag,
          Effect.gen(function*(_) {
            const configService = yield* _(ConfigurationService);
            const telemetry = yield* _(TelemetryService);

            // Fetch default model for this provider
            const defaultModelName = yield* _(
              configService.get("CLAUDE_CODE_DEFAULT_MODEL").pipe(
                Effect.orElseSucceed(() => "claude-3-opus-20240229") // Fallback default
              )
            );

            // Helper to convert AgentChatMessage to SDK format (OpenAI style)
            const toSdkMessages = (messages: AgentChatMessage[]) => messages.map(m => ({ role: m.role, content: m.content || "" }));

            return AgentLanguageModel.Tag.of({
              _tag: "AgentLanguageModel",
              streamText: (options: StreamTextOptions) => Stream.asyncInterrupt<AiResponse, AiProviderError>(emit => {
                const sdkParams: CreateChatCompletionRequest = {
                  model: options.model || defaultModelName,
                  messages: toSdkMessages(JSON.parse(options.prompt).messages), // Assuming options.prompt is stringified AgentChatMessage[]
                  stream: true,
                  temperature: options.temperature,
                  max_tokens: options.maxTokens,
                  // tools: options.tools ? convertToolkitToSdkFormat(options.tools) : undefined, // For Phase 7
                  // tool_choice: options.tool_choice, // For Phase 7
                };

                if (!window.electronAPI?.claudeCodeCli?.streamChat) {
                    emit.fail(new AiProviderError({ message: "Claude Code CLI IPC bridge not available for streaming.", provider: "ClaudeCodeCLI", isRetryable: false }));
                    emit.end();
                    return Effect.unit;
                }

                const cancelIPC = window.electronAPI.claudeCodeCli.streamChat(
                  sdkParams,
                  (sdkChunk: ChatCompletionChunk) => { // Type from Jason's SDK
                    const textContent = sdkChunk.choices[0]?.delta?.content || "";
                    // Map sdkChunk (OpenAI's ChatCompletionChunk style) to our AiResponse
                    const aiResponseChunk = AiResponse.fromSimple({ text: textContent /*, map tool_calls if any */ });
                    emit.single(aiResponseChunk);
                  },
                  () => emit.end(),
                  (err) => emit.fail(new AiProviderError({ message: "Claude Code CLI stream error", cause: err, provider: "ClaudeCodeCLI", isRetryable: false }))
                );
                return Effect.sync(cancelIPC); // Cleanup function
              }),

              generateText: (options: GenerateTextOptions) => Effect.tryPromise({
                try: async () => {
                  const sdkParams: CreateChatCompletionRequest = { /* ... similar to streamText, but stream: false ... */
                     model: options.model || defaultModelName,
                     messages: toSdkMessages(JSON.parse(options.prompt).messages),
                     stream: false,
                     temperature: options.temperature,
                     max_tokens: options.maxTokens,
                  };
                  if (!window.electronAPI?.claudeCodeCli?.chatCompletion) {
                     throw new AiProviderError({ message: "Claude Code CLI IPC bridge not available for chat completion.", provider: "ClaudeCodeCLI", isRetryable: false });
                  }
                  const sdkResponse = await window.electronAPI.claudeCodeCli.chatCompletion(sdkParams);
                  // Map sdkResponse to our AiResponse
                  return AiResponse.fromSimple({ text: sdkResponse.choices[0]?.message?.content || "" /*, map tool_calls */ });
                },
                catch: (err) => new AiProviderError({ message: "Claude Code CLI chat error", cause: err, provider: "ClaudeCodeCLI", isRetryable: false })
              }),

              generateStructured: (options: GenerateStructuredOptions) => Effect.fail(
                new AiProviderError({ message: "generateStructured not yet implemented for ClaudeCodeCLI", provider: "ClaudeCodeCLI", isRetryable: false })
              )
            });
          })
        );
        ```
    *   **Update `src/services/ai/providers/claude_code_cli/index.ts`**: Export `ClaudeCodeCliAgentLanguageModelLiveLayer`.

**Phase C5: Configuration & Store Updates**

1.  **Update `agentChatStore.ts`:**
    *   **File:** `src/stores/ai/agentChatStore.ts`
    *   **Action:** In `loadAvailableProviders`, add logic to include "Claude Code (CLI)" if `CLAUDE_CODE_PROVIDER_ENABLED` is true.
        ```typescript
        // Inside loadAvailableProviders, after other providers:
        const claudeCodeEnabledStr = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_ENABLED", "false"));
        if (claudeCodeEnabledStr === "true") {
          const claudeCodeModelName = yield* _(safeGetConfig("CLAUDE_CODE_DEFAULT_MODEL", "claude-3-opus-20240229")); // Example
          const claudeCodeProviderName = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_NAME", "Claude Code (CLI)"));
          providers.push({
            key: "claude_code_cli",
            name: claudeCodeProviderName,
            type: "anthropic", // Or "claude_code" - choose a type
            modelName: claudeCodeModelName,
          });
        }
        ```

**Phase C6: Integration into `ChatOrchestratorService`**

1.  **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`
2.  **Action:** In `getProviderLanguageModel` (or `getResolvedAiModelProvider`), add a case for `"claude_code_cli"`:
    ```typescript
    case "claude_code_cli": {
      runTelemetry({ /* ... */ });
      const { ClaudeCodeCliAgentLanguageModelLiveLayer } = yield* _(Effect.promise(() => import("@/services/ai/providers/claude_code_cli/ClaudeCodeCliAgentLanguageModelLive")));
      // This layer needs ConfigurationService and TelemetryService
      const claudeCodeLayer = ClaudeCodeCliAgentLanguageModelLiveLayer.pipe(
        Layer.provide(Layer.succeed(ConfigurationService, configService)),
        Layer.provide(Layer.succeed(TelemetryService, telemetry))
      );
      const lm = yield* _(Layer.build(claudeCodeLayer).pipe(Effect.map(ctx => Context.get(ctx, AgentLanguageModel.Tag)), Effect.scoped));
      runTelemetry({ /* ... success ... */ });
      return lm;
    }
    ```

**Phase C7: Update `src/main.ts` for Main Process Service**

1.  **Action:**
    *   Ensure an Effect runtime is initialized in `src/main.ts` if it's not already. This runtime will provide `ConfigurationServiceLive` and `ClaudeCodeSdkClientLive`.
    *   Register the `claude-code-cli-listeners.ts` using this main process runtime.
    *   **Example (conceptual, adapt to your `main.ts` structure):**
        ```typescript
        // src/main.ts
        // ... other imports
        import { initializeMainProcessRuntime, getMainProcessRuntime } from "./main-process-runtime"; // Create this file
        import { addClaudeCodeCliEventListeners } from "./helpers/ipc/claude_code_cli/claude-code-cli-listeners";

        async function startMainProcessServices() {
          await initializeMainProcessRuntime(); // Initializes runtime with ConfigService, ClaudeCodeSdkClient
          const mainRuntime = getMainProcessRuntime();
          addClaudeCodeCliEventListeners(mainRuntime); // Pass runtime to listeners for service access
        }

        app.whenReady().then(async () => {
          await startMainProcessServices();
          createWindow(); // Your existing window creation
          // ...
        });
        ```
    *   You will need to define `main-process-runtime.ts` to set up a Layer for main process services.

**Phase C8: Testing**

1.  **`ClaudeCodeSdkClientLive.test.ts` (Main Process Service Tests):**
    *   Mock `ConfigurationService`.
    *   Mock the `@jasonkneen/claude-code-sdk`'s `ClaudeCode` constructor and its methods (e.g., `chat.completions.createStream`).
    *   **Test:**
        *   Successful client instantiation with valid API key.
        *   Failure if API key is missing or invalid.
        *   Correct passing of `cliPath` if configured.
    *   **No actual CLI execution.**

2.  **`claude-code-cli-listeners.test.ts` (IPC Handler Tests):**
    *   Mock `ipcMain` and `event.sender`.
    *   Provide a mock `ClaudeCodeSdkClientService`.
    *   **Test:**
        *   IPC handler for `chatStream` correctly calls `sdkService.client.chat.completions.createStream`.
        *   Chunks from SDK stream are correctly sent back via `event.sender.send`.
        *   `:done` and `:error` events are correctly sent.
        *   Error serialization works.

3.  **`ClaudeCodeCliAgentLanguageModelLive.test.ts` (Renderer Provider Tests):**
    *   Mock `window.electronAPI.claudeCodeCli`.
    *   Mock `ConfigurationService` and `TelemetryService`.
    *   **Test:**
        *   `streamText` correctly calls `window.electronAPI.claudeCodeCli.streamChat` with mapped parameters.
        *   Received IPC chunks are correctly transformed into `AiResponse` stream.
        *   IPC errors are mapped to `AiProviderError`.
        *   `generateText` works similarly.

4.  **`ChatOrchestratorService.test.ts` (Augment):**
    *   Add tests to verify that selecting the `"claude_code_cli"` provider correctly resolves and uses the `ClaudeCodeCliAgentLanguageModelLive`.
    *   Mock the `ClaudeCodeCliAgentLanguageModelLive` to simulate success/failure/tool calls to test `AiPlan` behavior with this new provider.

**Important Notes for the Agent:**

*   **SDK Import Name:** Verify the exact import name for Jason Kneen's SDK (e.g., `import { ClaudeCode } from "the-actual-sdk-name";`).
*   **Main Process Runtime:** The setup of an Effect runtime in `src/main.ts` is a new architectural piece if it doesn't exist. It should be minimal, only providing services needed by main process IPC handlers (like `ConfigurationService` for API keys and `ClaudeCodeSdkClientService`).
*   **Error Handling:** Be meticulous with error mapping at each layer (SDK -> Main Process Service -> IPC -> Renderer Provider -> Orchestrator).
*   **Tool Use:** The current instructions focus on chat. Phase 7 of the roadmap handles tool use; the Claude Code CLI provider would need to map its tool capabilities to the `AgentToolkitManager` system then. For now, methods like `generateStructured` can be stubbed or return a "not implemented" error.
*   **CLI Availability:** The application will need a way to inform the user if the `@anthropic-ai/claude-code` CLI is not found or if the `ANTHROPIC_API_KEY` is missing/invalid when this provider is selected. This can be a startup check within `ClaudeCodeSdkClientLive` that fails the layer construction with an `AiConfigurationError`, which the UI can then catch and display.

This integration will be a bit more complex than direct API providers due to the CLI and IPC layers, but following the patterns from the Ollama integration should provide a good template.Okay, this is a substantial but logical integration. We're essentially adding another "local" AI provider, but one that uses a CLI tool (via Jason Kneen's SDK) which requires IPC to the main process for managing that CLI subprocess.

Here are the specific coding instructions:

**I. Project Setup & Dependencies**

1.  **Add SDK Dependency:**
    *   **File:** `package.json`
    *   **Action:** Add Jason Kneen's Claude Code SDK to the `dependencies` section. The exact package name will be `@jasonkneen/claude-code-sdk` if it's published under that name, or you might need to use a git URL if it's directly from GitHub. For now, use the likely name:
        ```json
        // In "dependencies":
        "@jasonkneen/claude-code-sdk": "^0.1.0", // Use the actual version
        ```
    *   **Action:** Run `pnpm install`.

2.  **Configuration Keys:**
    *   **File:** `src/services/configuration/ConfigurationServiceImpl.ts` (within `DefaultDevConfigLayer`)
    *   **Action:** Add new configuration keys for the Claude Code CLI provider:
        ```typescript
        // Inside the Effect.gen block of DefaultDevConfigLayer:
        yield* _(configService.set("ANTHROPIC_API_KEY", "YOUR_ANTHROPIC_API_KEY_HERE_OR_LEAVE_BLANK_FOR_ENV_VAR")); // User must provide this or set ENV
        yield* _(configService.set("CLAUDE_CODE_CLI_PATH", "")); // Optional: full path to claude-code CLI if not in system PATH
        yield* _(configService.set("CLAUDE_CODE_PROVIDER_ENABLED", "false")); // Disabled by default
        yield* _(configService.set("CLAUDE_CODE_DEFAULT_MODEL", "claude-3-haiku-20240307")); // Default model, confirm from SDK/CLI docs
        yield* _(configService.set("CLAUDE_CODE_PROVIDER_NAME", "Claude Code (CLI)"));
        ```
    *   **Note:** Remind the user that `ANTHROPIC_API_KEY` is critical and can be set via environment variable if not in config.

**II. Main Process Service for Claude Code SDK**

This service will instantiate and manage Jason Kneen's SDK client. It **must** run in the Electron main process.

1.  **Service Definition (`ClaudeCodeSdkClient.ts`):**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeSdkClient.ts`
    *   **Content:**
        ```typescript
        import { Context } from "effect";
        import type { ClaudeCode } from "@jasonkneen/claude-code-sdk"; // Adjust if SDK export changes

        export interface ClaudeCodeSdkClient {
          readonly client: ClaudeCode;
        }
        export const ClaudeCodeSdkClient = Context.GenericTag<ClaudeCodeSdkClient>("ClaudeCodeSdkClient");
        ```

2.  **Service Implementation (`ClaudeCodeSdkClientLive.ts`):**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeSdkClientLive.ts`
    *   **Content:**
        ```typescript
        import { Effect, Layer, Option, Config } from "effect";
        import { ClaudeCode } from "@jasonkneen/claude-code-sdk"; // Adjust SDK import
        import { ConfigurationService } from "@/services/configuration";
        import { ClaudeCodeSdkClient } from "./ClaudeCodeSdkClient";
        import { AiConfigurationError } from "@/services/ai/core"; // Use your core AI error

        export const ClaudeCodeSdkClientLive = Layer.effect(
          ClaudeCodeSdkClient,
          Effect.gen(function*(_) {
            const configService = yield* _(ConfigurationService);

            const apiKey = yield* _(
              configService.getSecret("ANTHROPIC_API_KEY").pipe(
                Effect.catchTag("SecretNotFoundError", (e) =>
                  Effect.fail(new AiConfigurationError({ message: "ANTHROPIC_API_KEY not found for Claude Code SDK.", cause: e, context: { keyName: "ANTHROPIC_API_KEY"} }))
                ),
                Effect.catchTag("ConfigError", (e) => // Catch other config errors
                  Effect.fail(new AiConfigurationError({ message: "Error fetching ANTHROPIC_API_KEY for Claude Code SDK.", cause: e }))
                ),
                Effect.filterOrFail(
                  (key): key is string => typeof key === "string" && key.trim() !== "" && !key.startsWith("YOUR_ANTHROPIC_API_KEY_HERE"),
                  (key) => new AiConfigurationError({ message: `Invalid or placeholder ANTHROPIC_API_KEY: ${key ? key.substring(0,10)+'...' : 'empty'}` })
                )
              )
            );

            const cliPathOpt = yield* _(
              configService.get("CLAUDE_CODE_CLI_PATH").pipe(
                Effect.map(path => path.trim() ? Option.some(path) : Option.none<string>()),
                Effect.catchTag("ConfigError", () => Effect.succeed(Option.none<string>())) // Default to none if key not found
              )
            );

            try {
              const clientInstance = new ClaudeCode({
                apiKey: apiKey,
                cliPath: Option.getOrUndefined(cliPathOpt),
                // verbose: true, // Enable for debugging CLI interactions if needed
              });
              return ClaudeCodeSdkClient.of({ client: clientInstance });
            } catch (e) {
              return yield* _(Effect.fail(new AiConfigurationError({ message: "Failed to instantiate ClaudeCode SDK client in main process.", cause: e })));
            }
          })
        );
        ```

3.  **Update `src/services/ai/providers/claude_code_cli/index.ts`:**
    ```typescript
    export * from "./ClaudeCodeSdkClient";
    export * from "./ClaudeCodeSdkClientLive";
    // Other exports will be added later
    ```

**III. Main Process Effect Runtime & IPC Setup**

1.  **Create Main Process Runtime (`main-process-runtime.ts`):**
    *   **File:** `src/main-process-runtime.ts` (New file)
    *   **Content:**
        ```typescript
        import { Effect, Layer, Runtime, Context } from "effect";
        import { ConfigurationService, ConfigurationServiceLive, DefaultDevConfigLayer } from "@/services/configuration";
        import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";
        import { ClaudeCodeSdkClient, ClaudeCodeSdkClientLive } from "@/services/ai/providers/claude_code_cli";

        // Define the context for main process services
        export type MainProcessAppContext = ConfigurationService | TelemetryService | ClaudeCodeSdkClient;

        let mainProcessRuntimeInstance: Runtime.Runtime<MainProcessAppContext>;

        const mainProcessLayer = Layer.mergeAll(
          DefaultDevConfigLayer, // Provides ConfigurationService and its Telemetry dependency
          ClaudeCodeSdkClientLive // Depends on ConfigurationService
        ).pipe(
          Layer.provide(TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer))) // Ensure Telemetry is fully configured
        );


        export async function initializeMainProcessRuntime(): Promise<void> {
          if (mainProcessRuntimeInstance) return;
          try {
            console.log("[Main Runtime] Initializing main process Effect runtime...");
            const runtimeContext = await Effect.runPromise(Layer.toRuntime(mainProcessLayer).pipe(Effect.scoped));
            mainProcessRuntimeInstance = Runtime.make(runtimeContext);
            console.log("[Main Runtime] Main process Effect runtime initialized successfully.");
          } catch (e) {
            console.error("[Main Runtime] CRITICAL: Failed to create main process Effect runtime:", e);
            throw e;
          }
        }

        export function getMainProcessRuntime(): Runtime.Runtime<MainProcessAppContext> {
          if (!mainProcessRuntimeInstance) {
            throw new Error("Main process runtime not initialized. Call initializeMainProcessRuntime() first.");
          }
          return mainProcessRuntimeInstance;
        }
        ```

2.  **Update `src/main.ts` to Initialize and Use Main Process Runtime:**
    *   **Action:** Import and call `initializeMainProcessRuntime`. Pass the runtime to IPC listener registration.
        ```typescript
        // src/main.ts
        // ... other imports
        import { initializeMainProcessRuntime, getMainProcessRuntime } from "./main-process-runtime"; // New import
        import { addClaudeCodeCliEventListeners } from "./helpers/ipc/claude_code_cli/claude-code-cli-listeners"; // New import

        // ... (existing addOllamaEventListeners call) ...

        async function startMainProcessServicesAndListeners() {
          await initializeMainProcessRuntime();
          const mainRuntime = getMainProcessRuntime();
          addClaudeCodeCliEventListeners(mainRuntime); // Pass runtime
        }

        app.whenReady().then(async () => {
          // ... (existing Ollama listener registration) ...
          try {
            await startMainProcessServicesAndListeners(); // New call
            console.log("[Main Process] Successfully registered Claude Code CLI listeners.");
          } catch (error) {
            console.error("[Main Process] Failed to start main process services or Claude Code CLI listeners:", error);
          }
          createWindow();
          installExtensions();
        });
        ```

3.  **Define IPC Channels (`claude-code-cli-channels.ts`):**
    *   **File:** `src/helpers/ipc/claude_code_cli/claude-code-cli-channels.ts`
    *   **Content:**
        ```typescript
        export const CLAUDE_CODE_CHAT_COMPLETION_CHANNEL = "claude-code-cli:chat-completion";
        export const CLAUDE_CODE_CHAT_STREAM_CHANNEL = "claude-code-cli:chat-stream";

        export const claudeCodeCliChannels = {
          chatCompletion: CLAUDE_CODE_CHAT_COMPLETION_CHANNEL,
          chatStream: CLAUDE_CODE_CHAT_STREAM_CHANNEL,
        };
        ```

4.  **Implement Main Process IPC Listeners (`claude-code-cli-listeners.ts`):**
    *   **File:** `src/helpers/ipc/claude_code_cli/claude-code-cli-listeners.ts`
    *   **Action:** Create listeners similar to `ollama-listeners.ts`. They will use the `mainProcessRuntime` to access `ClaudeCodeSdkClientService`.
    *   **Important:** Jason Kneen's SDK's stream methods (e.g., `createStream`) return an `AsyncGenerator`. You'll need to iterate this generator and send chunks.
    *   **Content (adapt from `ollama-listeners.ts`):**
        ```typescript
        import { ipcMain } from "electron";
        import { Effect, Stream, Cause, Exit, Runtime } from "effect";
        import { ClaudeCodeSdkClient } from "@/services/ai/providers/claude_code_cli";
        import { MainProcessAppContext } from "@/main-process-runtime"; // Your main process context type
        import { claudeCodeCliChannels } from "./claude-code-cli-channels";
        import type { CreateChatCompletionRequestStreaming, ChatCompletionChunk } from "@jasonkneen/claude-code-sdk/dist/client/chat"; // Adjust import for SDK types

        // Helper to extract error details for IPC
        function extractErrorForIPC(error: any): object { /* ... (copy from ollama-listeners.ts) ... */ }

        const activeClaudeStreams = new Map<string, () => void>(); // For cancellation

        export function addClaudeCodeCliEventListeners(runtime: Runtime.Runtime<MainProcessAppContext>) {
          console.log("[ClaudeCode IPC] Registering Claude Code CLI event listeners...");

          // Non-streaming chat completion handler
          ipcMain.handle(claudeCodeCliChannels.chatCompletion, async (_, sdkParams: any /* type CreateChatCompletionRequest from SDK */) => {
            console.log("[ClaudeCode IPC] Received chatCompletion request:", sdkParams.model);
            const program = Effect.gen(function*(_) {
              const sdkService = yield* _(ClaudeCodeSdkClient);
              return yield* _(Effect.tryPromise(() => sdkService.client.chat.completions.create(sdkParams)));
            });
            try {
              const result = await Effect.runPromise(Effect.provide(program, runtime));
              return result;
            } catch (error) {
              return extractErrorForIPC(error);
            }
          });

          // Streaming chat completion handler
          ipcMain.on(claudeCodeCliChannels.chatStream, async (event, requestId: string, sdkParams: CreateChatCompletionRequestStreaming) => {
            console.log(`[ClaudeCode IPC] Received stream request ${requestId} for model:`, sdkParams.model);

            const abortController = new AbortController();
            activeClaudeStreams.set(requestId, () => abortController.abort());

            const program = Effect.gen(function*(_) {
              const sdkService = yield* _(ClaudeCodeSdkClient);
              // Assuming createStream accepts a signal, if not, cancellation needs different handling
              const streamGenerator = sdkService.client.chat.completions.createStream({ ...sdkParams, signal: abortController.signal });
              for await (const chunk of streamGenerator) {
                if (event.sender.isDestroyed() || abortController.signal.aborted) break;
                event.sender.send(`${claudeCodeCliChannels.chatStream}:chunk`, requestId, chunk);
              }
            });

            try {
              await Effect.runPromise(Effect.provide(program, runtime));
              if (!event.sender.isDestroyed() && !abortController.signal.aborted) {
                event.sender.send(`${claudeCodeCliChannels.chatStream}:done`, requestId);
              }
            } catch (error) {
              if (!event.sender.isDestroyed() && !abortController.signal.aborted) {
                event.sender.send(`${claudeCodeCliChannels.chatStream}:error`, requestId, extractErrorForIPC(error));
              }
            } finally {
              activeClaudeStreams.delete(requestId);
            }
          });

          ipcMain.on(`${claudeCodeCliChannels.chatStream}:cancel`, (_, requestId: string) => {
            const cancel = activeClaudeStreams.get(requestId);
            if (cancel) {
              cancel();
              activeClaudeStreams.delete(requestId);
            }
          });
          console.log("[ClaudeCode IPC] Claude Code CLI event listeners registered.");
        }
        ```

5.  **Expose IPC Context in Preload (`claude-code-cli-context.ts`):**
    *   **File:** `src/helpers/ipc/claude_code_cli/claude-code-cli-context.ts`
    *   **Action:** Similar to `ollama-context.ts`.
        ```typescript
        import { contextBridge, ipcRenderer } from "electron";
        import { claudeCodeCliChannels } from "./claude-code-cli-channels";
        import type { CreateChatCompletionRequestStreaming, ChatCompletionChunk } from "@jasonkneen/claude-code-sdk/dist/client/chat"; // Adjust

        export function exposeClaudeCodeCliContext() {
          contextBridge.exposeInMainWorld("electronAPI", {
            ...(window.electronAPI || {}),
            claudeCodeCli: {
              chatCompletion: (request: any) => ipcRenderer.invoke(claudeCodeCliChannels.chatCompletion, request),
              streamChat: (
                request: CreateChatCompletionRequestStreaming,
                onChunk: (chunk: ChatCompletionChunk) => void,
                onDone: () => void,
                onError: (error: any) => void
              ): (() => void) => {
                const requestId = `claude-code-stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

                const chunkListener = (_event: Electron.IpcRendererEvent, id: string, chunk: ChatCompletionChunk) => {
                  if (id === requestId) onChunk(chunk);
                };
                const doneListener = (_event: Electron.IpcRendererEvent, id: string) => {
                  if (id === requestId) {
                    cleanup();
                    onDone();
                  }
                };
                const errorListener = (_event: Electron.IpcRendererEvent, id: string, error: any) => {
                  if (id === requestId) {
                    cleanup();
                    onError(error);
                  }
                };

                const cleanup = () => {
                  ipcRenderer.removeListener(`${claudeCodeCliChannels.chatStream}:chunk`, chunkListener);
                  ipcRenderer.removeListener(`${claudeCodeCliChannels.chatStream}:done`, doneListener);
                  ipcRenderer.removeListener(`${claudeCodeCliChannels.chatStream}:error`, errorListener);
                };

                ipcRenderer.on(`${claudeCodeCliChannels.chatStream}:chunk`, chunkListener);
                ipcRenderer.on(`${claudeCodeCliChannels.chatStream}:done`, doneListener);
                ipcRenderer.on(`${claudeCodeCliChannels.chatStream}:error`, errorListener);

                ipcRenderer.send(claudeCodeCliChannels.chatStream, requestId, request);

                return () => {
                  ipcRenderer.send(`${claudeCodeCliChannels.chatStream}:cancel`, requestId);
                  cleanup();
                };
              },
            },
          });
        }
        ```
    *   **Action:** Add `exposeClaudeCodeCliContext()` to `src/helpers/ipc/context-exposer.ts`.
    *   **Action:** Update `Window` interface in `src/types.d.ts` for `window.electronAPI.claudeCodeCli`.

**IV. Renderer `AgentLanguageModel` Provider for Claude Code CLI**

1.  **Create Provider Implementation (`ClaudeCodeCliAgentLanguageModelLive.ts`):**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeCliAgentLanguageModelLive.ts`
    *   **Content:**
        ```typescript
        import { Effect, Layer, Stream } from "effect";
        import { AgentLanguageModel, AiResponse, AiProviderError, StreamTextOptions, GenerateTextOptions, GenerateStructuredOptions, AgentChatMessage } from "@/services/ai/core";
        import { ConfigurationService } from "@/services/configuration";
        import { TelemetryService } from "@/services/telemetry";
        import type { ChatCompletionChunk } from "@jasonkneen/claude-code-sdk/dist/client/chat"; // Adjust import path

        export const ClaudeCodeCliAgentLanguageModelLiveLayer = Layer.effect(
          AgentLanguageModel.Tag,
          Effect.gen(function*(_) {
            const configService = yield* _(ConfigurationService);
            const telemetry = yield* _(TelemetryService);

            const defaultModelName = yield* _(
              configService.get("CLAUDE_CODE_DEFAULT_MODEL").pipe(
                Effect.orElseSucceed(() => "claude-3-haiku-20240307")
              )
            );

            const toSdkMessages = (promptString: string): Array<{role: "user" | "assistant" | "system", content: string}> => {
              try {
                const parsedPrompt = JSON.parse(promptString);
                if (Array.isArray(parsedPrompt.messages)) {
                  return parsedPrompt.messages.map((m: AgentChatMessage) => ({ role: m.role, content: m.content || "" }));
                }
              } catch (e) { /* fallback to raw string */ }
              return [{ role: "user", content: promptString }];
            };

            return AgentLanguageModel.Tag.of({
              _tag: "AgentLanguageModel",
              streamText: (options: StreamTextOptions) => Stream.asyncInterrupt<AiResponse, AiProviderError>(emit => {
                const modelToUse = options.model || defaultModelName;
                const sdkParams = { // Type should match Jason Kneen's SDK CreateChatCompletionRequestStreaming
                  model: modelToUse,
                  messages: toSdkMessages(options.prompt),
                  stream: true,
                  temperature: options.temperature,
                  max_tokens: options.maxTokens,
                  // tools, tool_choice for Phase 7
                };

                if (!window.electronAPI?.claudeCodeCli?.streamChat) {
                    emit.fail(new AiProviderError({ message: "Claude Code CLI IPC bridge (streamChat) not available.", provider: "ClaudeCodeCLI", isRetryable: false }));
                    emit.end();
                    return Effect.unit;
                }

                Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli", action: "stream_start", label: modelToUse, value: JSON.stringify({ messages: sdkParams.messages.length }) }));

                const cancelIPC = window.electronAPI.claudeCodeCli.streamChat(
                  sdkParams,
                  (sdkChunk: ChatCompletionChunk) => {
                    const textContent = sdkChunk.choices[0]?.delta?.content || "";
                    const aiResponseChunk = AiResponse.fromSimple({ text: textContent }); // Use our AiResponse factory
                    emit.single(aiResponseChunk);
                  },
                  () => {
                    Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli", action: "stream_done", label: modelToUse }));
                    emit.end();
                  },
                  (err) => {
                    Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli", action: "stream_error_ipc", label: modelToUse, value: err?.message || String(err) }));
                    emit.fail(new AiProviderError({ message: `Claude Code CLI stream error: ${err?.message || String(err)}`, cause: err, provider: "ClaudeCodeCLI", isRetryable: false }));
                    emit.end(); // ensure stream ends on error
                  }
                );
                return Effect.sync(() => {
                  Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli", action: "stream_cancel_requested", label: modelToUse }));
                  cancelIPC();
                });
              }),

              generateText: (options: GenerateTextOptions) => Effect.tryPromise({
                try: async () => {
                  const modelToUse = options.model || defaultModelName;
                  const sdkParams = { // Type should match Jason Kneen's SDK CreateChatCompletionRequest
                     model: modelToUse,
                     messages: toSdkMessages(options.prompt),
                     stream: false,
                     temperature: options.temperature,
                     max_tokens: options.maxTokens,
                  };
                  if (!window.electronAPI?.claudeCodeCli?.chatCompletion) {
                     throw new AiProviderError({ message: "Claude Code CLI IPC bridge (chatCompletion) not available.", provider: "ClaudeCodeCLI", isRetryable: false });
                  }
                  Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli", action: "generate_text_start", label: modelToUse, value: JSON.stringify({ messages: sdkParams.messages.length }) }));
                  const sdkResponse = await window.electronAPI.claudeCodeCli.chatCompletion(sdkParams);
                  if (sdkResponse.__error) { // Check for serialized error from IPC
                    throw new AiProviderError({ message: `Claude Code CLI error: ${sdkResponse.message}`, cause: sdkResponse, provider: "ClaudeCodeCLI", isRetryable: false });
                  }
                  Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli", action: "generate_text_success", label: modelToUse }));
                  return AiResponse.fromSimple({ text: sdkResponse.choices[0]?.message?.content || "" });
                },
                catch: (err) => {
                  Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli", action: "generate_text_error_ipc", label: options.model || defaultModelName, value: (err as Error)?.message || String(err) }));
                  return err instanceof AiProviderError ? err : new AiProviderError({ message: `Claude Code CLI chat error: ${(err as Error)?.message || String(err)}`, cause: err, provider: "ClaudeCodeCLI", isRetryable: false });
                }
              }),

              generateStructured: (options: GenerateStructuredOptions) => Effect.fail(
                new AiProviderError({ message: "generateStructured not implemented for ClaudeCodeCLI", provider: "ClaudeCodeCLI", isRetryable: false })
              )
            });
          })
        );
        ```

2.  **Update `src/services/ai/providers/claude_code_cli/index.ts`:**
    ```typescript
    export * from "./ClaudeCodeSdkClient";
    export * from "./ClaudeCodeSdkClientLive";
    export * from "./ClaudeCodeCliAgentLanguageModelLive"; // Add this
    ```

3.  **Update `src/services/ai/providers/index.ts`:**
    ```typescript
    // ... other providers
    export * as ClaudeCodeCliProvider from "./claude_code_cli";
    ```

**V. Configuration, Store, and Orchestrator Integration**

1.  **Update `agentChatStore.ts` (`loadAvailableProviders`):**
    *   **File:** `src/stores/ai/agentChatStore.ts`
    *   **Action:**
        ```typescript
        // Inside loadAvailableProviders, after other providers:
        const claudeCodeEnabledStr = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_ENABLED", "false"));
        if (claudeCodeEnabledStr === "true") {
          const claudeCodeModelName = yield* _(safeGetConfig("CLAUDE_CODE_DEFAULT_MODEL", "claude-3-haiku-20240307"));
          const claudeCodeProviderName = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_NAME", "Claude Code (CLI)"));
          providers.push({
            key: "claude_code_cli",
            name: claudeCodeProviderName,
            type: "anthropic", // Or a new type e.g. "claude_code_cli"
            modelName: claudeCodeModelName,
          });
        }
        ```

2.  **Update `ChatOrchestratorService.ts` (`getProviderLanguageModel`):**
    *   **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`
    *   **Action:**
        ```typescript
        // In getProviderLanguageModel (or getResolvedAiModelProvider):
        case "claude_code_cli": {
          runTelemetry({ category: "orchestrator", action: "get_provider_model_start", label: key, value: modelName });
          const { ClaudeCodeCliAgentLanguageModelLiveLayer } = yield* _(Effect.promise(() => import("@/services/ai/providers/claude_code_cli/ClaudeCodeCliAgentLanguageModelLive")));

          const providerLayer = ClaudeCodeCliAgentLanguageModelLiveLayer.pipe(
            Layer.provide(Layer.succeed(ConfigurationService, configService)), // Already available in this scope
            Layer.provide(Layer.succeed(TelemetryService, telemetry))      // Already available in this scope
          );
          const lm = yield* _(Layer.build(providerLayer).pipe(Effect.map(ctx => Context.get(ctx, AgentLanguageModel.Tag)), Effect.scoped));
          runTelemetry({ category: "orchestrator", action: "get_provider_model_success", label: key });
          return lm;
        }
        ```

3.  **Update `AgentChatPane.tsx`:**
    *   No direct changes needed if `agentChatStore` correctly lists "Claude Code (CLI)" and `ChatOrchestratorService` handles the provider key. The existing UI should just work.

4.  **Update `FullAppLayer` in `src/services/runtime.ts`:**
    *   The renderer `FullAppLayer` does *not* directly provide `ClaudeCodeCliAgentLanguageModelLiveLayer`. `ChatOrchestratorService` handles its dynamic construction.
    *   Ensure all dependencies needed by the dynamically imported layer (like `ConfigurationService`, `TelemetryService`) are available in the context where `ChatOrchestratorServiceLive` is built or where its `getProviderLanguageModel` method runs. The current orchestrator pattern looks fine as it gets these from its own context.

**VI. Testing**

1.  **`ClaudeCodeSdkClientLive.test.ts` (Main Process Service):**
    *   Mock `ConfigurationService`.
    *   Mock `@jasonkneen/claude-code-sdk`'s `ClaudeCode` class constructor and its `chat.completions.createStream` / `create` methods.
    *   Test cases:
        *   Successful client instantiation with valid API key and no CLI path (uses PATH).
        *   Successful client instantiation with CLI path provided.
        *   Failure if API key is missing, empty, or a placeholder.
        *   Test that the constructor is called with the correct options.

2.  **`claude-code-cli-listeners.test.ts` (IPC Handlers):**
    *   This requires an Electron main process testing environment or extensive mocking.
    *   Provide a mock `ClaudeCodeSdkClientService` to the test runtime.
    *   Mock `ipcMain.on` and `event.sender.send`.
    *   Test:
        *   `claudeCodeCliChannels.chatStream` handler correctly calls `sdkService.client.chat.completions.createStream`.
        *   Chunks from the SDK's async generator are correctly sent back via `event.sender.send`.
        *   `:done` and `:error` events are correctly sent for streams.
        *   Stream cancellation (`:cancel` event) is handled.

3.  **`ClaudeCodeCliAgentLanguageModelLive.test.ts` (Renderer Provider):**
    *   Mock `window.electronAPI.claudeCodeCli` and its methods (`streamChat`, `chatCompletion`).
    *   Provide mock `ConfigurationService` and `TelemetryService`.
    *   Test:
        *   `streamText` calls `window.electronAPI.claudeCodeCli.streamChat` with correctly mapped parameters.
        *   IPC chunks are transformed into `AiResponse` stream elements.
        *   IPC errors are mapped to `AiProviderError`.
        *   `generateText` calls `window.electronAPI.claudeCodeCli.chatCompletion` and maps the response.
        *   `generateStructured` returns a "not implemented" error for now.

4.  **Augment `ChatOrchestratorService.test.ts`:**
    *   Add tests to verify that selecting "claude_code_cli" provider in `preferredProvider.key` correctly invokes the dynamic import and construction of `ClaudeCodeCliAgentLanguageModelLiveLayer`.
    *   Mock the methods of the resolved `AgentLanguageModel` (backed by Claude Code CLI) to simulate success, errors, and tool calls to test `AiPlan` and tool loop behavior with this provider.

**Self-Correction/Refinement during thought process:**
Initially, I considered if `ClaudeCodeCliAgentLanguageModelLive` should depend on an `OpenAIClient`-like interface via IPC. However, Jason Kneen's SDK already provides a direct client API. It's simpler for `ClaudeCodeCliAgentLanguageModelLive` to make direct IPC calls that map to the SDK's methods, rather than trying to adapt the SDK to fit another client interface like `OpenAIClient` over IPC first. The Ollama provider did this (`OllamaAsOpenAIClientLive`) because Ollama's `/v1` endpoint *is* OpenAI-compatible. The Claude Code CLI is *wrapped* by an OpenAI-compatible SDK surface, but it's not an OpenAI-compatible HTTP endpoint itself. So, direct IPC to the SDK service in main is better.Okay, this is an interesting and slightly more complex integration due to the CLI wrapper. Here's how we'll instruct the agent to integrate the Claude Code SDK as a selectable provider in the chat pane.

**Overall Strategy:**

1.  **Main Process Service:** The core interaction with Jason Kneen's SDK (which spawns the `@anthropic-ai/claude-code` CLI) will happen in the Electron main process for stability and to manage subprocesses correctly.
2.  **IPC Bridge:** An IPC bridge will allow the renderer process to request operations from the main process service.
3.  **Renderer `AgentLanguageModel` Provider:** A new `AgentLanguageModel` provider will be created in the renderer. This provider will use the IPC bridge to communicate with the main process service, abstracting the CLI interaction.
4.  **Configuration:** Settings for API key, CLI path (optional), and provider enablement will be managed via `ConfigurationService`.
5.  **UI Integration:** The "Claude Code (CLI)" provider will appear in the chat pane's provider selection dropdown.

---

**Instructions for the Coding Agent:**

**I. Project Setup & Dependencies**

1.  **Add SDK Dependency:**
    *   **File:** `package.json`
    *   **Action:** Add `@jasonkneen/claude-code-sdk` to the `dependencies`.
        ```json
        // In "dependencies":
        "@jasonkneen/claude-code-sdk": "0.1.0", // Use the version from docs/claude-code/jasonkneen-wrapper.md
        ```
    *   **Action:** Run `pnpm install`.
    *   **Note to User (in commit message/PR):** The `@anthropic-ai/claude-code` CLI must be installed globally (`npm install -g @anthropic-ai/claude-code`) or its path specified in the application settings for this provider to work. An `ANTHROPIC_API_KEY` is also required.

2.  **Configuration Keys:**
    *   **File:** `src/services/configuration/ConfigurationServiceImpl.ts`
    *   **Action:** Inside `DefaultDevConfigLayer`'s `Effect.gen` block, add new configuration keys:
        ```typescript
        yield* _(configService.set("ANTHROPIC_API_KEY", "YOUR_ANTHROPIC_API_KEY_HERE_OR_LEAVE_BLANK_FOR_ENV_VAR"));
        yield* _(configService.set("CLAUDE_CODE_CLI_PATH", "")); // Optional: full path if CLI not in system PATH
        yield* _(configService.set("CLAUDE_CODE_PROVIDER_ENABLED", "false")); // Default to disabled
        yield* _(configService.set("CLAUDE_CODE_DEFAULT_MODEL", "claude-3-opus-20240229")); // Confirm from SDK/CLI docs if models are selectable this way
        yield* _(configService.set("CLAUDE_CODE_PROVIDER_NAME", "Claude Code (CLI)"));
        ```

**II. Main Process Service for Claude Code SDK**

This service will run in the Electron main process.

1.  **Create Directory Structure:**
    *   `src/services/ai/providers/claude_code_cli/`

2.  **Service Definition (`ClaudeCodeSdkClient.ts`):**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeSdkClient.ts`
    *   **Content:**
        ```typescript
        import { Context } from "effect";
        import type { ClaudeCode } from "@jasonkneen/claude-code-sdk";

        export interface ClaudeCodeSdkClient {
          readonly client: ClaudeCode;
        }
        export const ClaudeCodeSdkClient = Context.GenericTag<ClaudeCodeSdkClient>("ClaudeCodeSdkClient");
        ```

3.  **Service Implementation (`ClaudeCodeSdkClientLive.ts`):**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeSdkClientLive.ts`
    *   **Content:** (Provided in your prompt, looks good, ensure `AiConfigurationError` is imported correctly)
        ```typescript
        import { Effect, Layer, Option, Config } from "effect";
        import { ClaudeCode } from "@jasonkneen/claude-code-sdk";
        import { ConfigurationService } from "@/services/configuration"; // Ensure ConfigError, SecretNotFoundError are exported if used
        import { ClaudeCodeSdkClient } from "./ClaudeCodeSdkClient";
        import { AiConfigurationError } from "@/services/ai/core/AIError"; // Use your core AI error

        export const ClaudeCodeSdkClientLive = Layer.effect(
          ClaudeCodeSdkClient,
          Effect.gen(function*(_) {
            const configService = yield* _(ConfigurationService);

            const apiKey = yield* _(
              configService.getSecret("ANTHROPIC_API_KEY").pipe(
                Effect.catchTag("SecretNotFoundError", (e) =>
                  Effect.fail(new AiConfigurationError({ message: "ANTHROPIC_API_KEY not found for Claude Code SDK.", cause: e, context: { keyName: "ANTHROPIC_API_KEY"} }))
                ),
                Effect.catchTag("ConfigError", (e) => // Catch other config errors
                  Effect.fail(new AiConfigurationError({ message: "Error fetching ANTHROPIC_API_KEY for Claude Code SDK.", cause: e }))
                ),
                Effect.filterOrFail(
                  (key): key is string => typeof key === "string" && key.trim() !== "" && !key.startsWith("YOUR_ANTHROPIC_API_KEY_HERE"),
                  (key) => new AiConfigurationError({ message: `Invalid or placeholder ANTHROPIC_API_KEY for Claude Code SDK. Key starts with: ${key ? key.substring(0,10)+'...' : 'empty'}` })
                )
              )
            );

            const cliPathOpt = yield* _(
              configService.get("CLAUDE_CODE_CLI_PATH").pipe(
                Effect.map(path => path.trim() ? Option.some(path) : Option.none<string>()),
                Effect.catchTag("ConfigError", () => Effect.succeed(Option.none<string>())) // Default to none if key not found
              )
            );

            try {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.log(`[ClaudeCodeSdkClientLive] Initializing ClaudeCode SDK with API key (len: ${apiKey.length}) and CLI path: ${Option.getOrUndefined(cliPathOpt) || 'default (PATH)'}`);
              const clientInstance = new ClaudeCode({
                apiKey: apiKey,
                cliPath: Option.getOrUndefined(cliPathOpt),
              });
              return ClaudeCodeSdkClient.of({ client: clientInstance });
            } catch (e) {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("[ClaudeCodeSdkClientLive] Error instantiating ClaudeCode SDK:", e);
              return yield* _(Effect.fail(new AiConfigurationError({ message: "Failed to instantiate ClaudeCode SDK client in main process.", cause: e })));
            }
          })
        );
        ```

4.  **Export from `claude_code_cli/index.ts`:**
    *   **File:** `src/services/ai/providers/claude_code_cli/index.ts`
    *   **Content:**
        ```typescript
        export * from "./ClaudeCodeSdkClient";
        export * from "./ClaudeCodeSdkClientLive";
        // Will add AgentLanguageModel provider later
        ```

**III. Main Process Effect Runtime & IPC Setup**

1.  **Main Process Runtime (`main-process-runtime.ts`):**
    *   **File:** `src/main-process-runtime.ts` (New file, based on your prompt)
    *   **Content:** (Ensure `TelemetryServiceLive` and `DefaultTelemetryConfigLayer` are imported correctly from `@/services/telemetry`. `ConfigurationServiceLive` and `DefaultDevConfigLayer` from `@/services/configuration`.)
        ```typescript
        import { Effect, Layer, Runtime, Context } from "effect";
        import { ConfigurationService, ConfigurationServiceLive, DefaultDevConfigLayer } from "@/services/configuration";
        import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer } from "@/services/telemetry";
        import { ClaudeCodeSdkClient, ClaudeCodeSdkClientLive } from "@/services/ai/providers/claude_code_cli";

        export type MainProcessAppContext = ConfigurationService | TelemetryService | ClaudeCodeSdkClient;

        let mainProcessRuntimeInstance: Runtime.Runtime<MainProcessAppContext>;

        // Build the Telemetry layer with its config first
        const telemetryLayer = TelemetryServiceLive.pipe(Layer.provide(DefaultTelemetryConfigLayer));
        // Build the Configuration layer, providing Telemetry
        const configLayer = DefaultDevConfigLayer.pipe(Layer.provide(ConfigurationServiceLive.pipe(Layer.provide(telemetryLayer))));

        const mainProcessBaseLayer = Layer.mergeAll(
          telemetryLayer,
          configLayer
        );

        const claudeCodeSdkLayer = ClaudeCodeSdkClientLive.pipe(Layer.provide(mainProcessBaseLayer));

        // Final main process layer
        const mainProcessLayer = Layer.merge(mainProcessBaseLayer, claudeCodeSdkLayer);

        export async function initializeMainProcessRuntime(): Promise<void> {
          // ... (rest of the function as provided in your prompt, ensure console logs are telemetry or removed)
          if (mainProcessRuntimeInstance) {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Runtime] Main process Effect runtime already initialized.");
            return;
          }
          try {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Runtime] Initializing main process Effect runtime...");
            const runtimeContext = await Effect.runPromise(Layer.toRuntime(mainProcessLayer).pipe(Effect.scoped));
            mainProcessRuntimeInstance = Runtime.make(runtimeContext);
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Runtime] Main process Effect runtime initialized successfully.");
          } catch (e) {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("[Main Runtime] CRITICAL: Failed to create main process Effect runtime:", e);
            throw e; // Re-throw to be caught by main.ts
          }
        }

        export function getMainProcessRuntime(): Runtime.Runtime<MainProcessAppContext> {
          if (!mainProcessRuntimeInstance) {
            throw new Error("Main process runtime not initialized. Call initializeMainProcessRuntime() first.");
          }
          return mainProcessRuntimeInstance;
        }
        ```

2.  **Update `src/main.ts`:**
    *   **Action:** Import `initializeMainProcessRuntime` and `addClaudeCodeCliEventListeners`. Call them.
        ```typescript
        // src/main.ts
        // ...
        import { initializeMainProcessRuntime } from "./main-process-runtime"; // New
        import { addClaudeCodeCliEventListeners } from "./helpers/ipc/claude_code_cli/claude-code-cli-listeners"; // New
        // ...

        app.whenReady().then(async () => {
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.log("[Main Process] App whenReady triggered.");
          try {
            await initializeMainProcessRuntime(); // Initialize main process runtime
            addClaudeCodeCliEventListeners(getMainProcessRuntime()); // Pass runtime
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[Main Process] Successfully registered Claude Code CLI listeners.");
          } catch (error) {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("[Main Process] Failed to start main process services or Claude Code CLI listeners:", error);
          }
          // ... existing addOllamaEventListeners() might need similar runtime access if it uses Effect services ...
          // For now, assume addOllamaEventListeners() handles its own Effect runtime or doesn't need one for listeners.

          createWindow();
          if (inDevelopment) { // Only install devtools in development
            installExtensions();
          }
        });
        ```

3.  **IPC Channels (`claude-code-cli-channels.ts`):**
    *   **File:** `src/helpers/ipc/claude_code_cli/claude-code-cli-channels.ts` (New file)
    *   **Content:** (As provided in your prompt, looks good)
        ```typescript
        export const CLAUDE_CODE_CHAT_COMPLETION_CHANNEL = "claude-code-cli:chat-completion";
        export const CLAUDE_CODE_CHAT_STREAM_CHANNEL = "claude-code-cli:chat-stream";

        export const claudeCodeCliChannels = {
          chatCompletion: CLAUDE_CODE_CHAT_COMPLETION_CHANNEL,
          chatStream: CLAUDE_CODE_CHAT_STREAM_CHANNEL,
        };
        ```

4.  **Main Process IPC Listeners (`claude-code-cli-listeners.ts`):**
    *   **File:** `src/helpers/ipc/claude_code_cli/claude-code-cli-listeners.ts` (New file)
    *   **Action:** Adapt from `ollama-listeners.ts`, but use the `ClaudeCodeSdkClient` and its methods. Note that Jason Kneen's SDK's `createStream` returns an `AsyncGenerator`.
    *   **Content:**
        ```typescript
        import { ipcMain } from "electron";
        import { Effect, Cause, Exit, Runtime } from "effect";
        import { ClaudeCodeSdkClient } from "@/services/ai/providers/claude_code_cli";
        import { MainProcessAppContext } from "@/main-process-runtime";
        import { claudeCodeCliChannels } from "./claude-code-cli-channels";
        import type { CreateChatCompletionRequestStreaming, ChatCompletionChunk } from "@jasonkneen/claude-code-sdk/dist/client/chat"; // Adjust if SDK types are different

        interface IpcErrorObject { __error: true; name: string; message: string; stack?: string; _tag?: string; cause?: any; }
        function extractErrorForIPC(error: any): IpcErrorObject { /* Copy from ollama-listeners.ts or refine */
            return { __error: true, name: error?.name || "Error", message: error?.message || String(error), stack: error?.stack, _tag: error?._tag, cause: error?.cause ? String(error.cause) : undefined };
        }

        const activeClaudeStreams = new Map<string, AbortController>();

        export function addClaudeCodeCliEventListeners(runtime: Runtime.Runtime<MainProcessAppContext>) {
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.log("[ClaudeCode IPC] Registering Claude Code CLI event listeners...");

          ipcMain.handle(claudeCodeCliChannels.chatCompletion, async (_, sdkParams: any /* CreateChatCompletionRequest */) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log("[ClaudeCode IPC] Received chatCompletion request for model:", sdkParams?.model || "unknown");
            const program = Effect.gen(function*(_) {
              const sdkService = yield* _(ClaudeCodeSdkClient);
              return yield* _(Effect.tryPromise(() => sdkService.client.chat.completions.create(sdkParams)));
            });
            try {
              const result = await Effect.runPromise(Effect.provide(program, runtime));
              return result;
            } catch (error) {
              return extractErrorForIPC(error);
            }
          });

          ipcMain.on(claudeCodeCliChannels.chatStream, async (event, requestId: string, sdkParams: CreateChatCompletionRequestStreaming) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log(`[ClaudeCode IPC] Received stream request ${requestId} for model:`, sdkParams?.model || "unknown");
            const abortController = new AbortController();
            activeClaudeStreams.set(requestId, abortController);

            const program = Effect.gen(function*(_) {
              const sdkService = yield* _(ClaudeCodeSdkClient);
              const streamGenerator = sdkService.client.chat.completions.createStream({ ...sdkParams, signal: abortController.signal });
              for await (const chunk of streamGenerator) {
                if (event.sender.isDestroyed() || abortController.signal.aborted) break;
                event.sender.send(`${claudeCodeCliChannels.chatStream}:chunk`, requestId, chunk);
              }
            });

            try {
              await Effect.runPromise(Effect.provide(program, runtime));
              if (!event.sender.isDestroyed() && !abortController.signal.aborted) {
                event.sender.send(`${claudeCodeCliChannels.chatStream}:done`, requestId);
              }
            } catch (error) {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error(`[ClaudeCode IPC] Error in stream ${requestId}:`, error);
              if (!event.sender.isDestroyed() && !abortController.signal.aborted) {
                event.sender.send(`${claudeCodeCliChannels.chatStream}:error`, requestId, extractErrorForIPC(error));
              }
            } finally {
              activeClaudeStreams.delete(requestId);
            }
          });

          ipcMain.on(`${claudeCodeCliChannels.chatStream}:cancel`, (_, requestId: string) => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.log(`[ClaudeCode IPC] Received cancel request for stream: ${requestId}`);
            const controller = activeClaudeStreams.get(requestId);
            if (controller) {
              controller.abort();
              activeClaudeStreams.delete(requestId);
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.log(`[ClaudeCode IPC] Stream ${requestId} aborted.`);
            }
          });
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.log("[ClaudeCode IPC] Claude Code CLI event listeners registered.");
        }
        ```

5.  **Expose IPC Context in Preload (`claude-code-cli-context.ts`):**
    *   **File:** `src/helpers/ipc/claude_code_cli/claude-code-cli-context.ts` (New file)
    *   **Content:** (Your example in the prompt is a good template. Ensure types for `request` and `chunk` match Jason Kneen's SDK, e.g., `CreateChatCompletionRequestStreaming` and `ChatCompletionChunk`.)
        ```typescript
        // src/helpers/ipc/claude_code_cli/claude-code-cli-context.ts
        import { contextBridge, ipcRenderer } from "electron";
        import { claudeCodeCliChannels } from "./claude-code-cli-channels";
        // Import SDK types for parameters and chunks
        import type { CreateChatCompletionRequest, CreateChatCompletionRequestStreaming, ChatCompletionChunk } from "@jasonkneen/claude-code-sdk/dist/client/chat"; // Adjust path as needed

        export function exposeClaudeCodeCliContext() {
          contextBridge.exposeInMainWorld("electronAPI", {
            ...(window.electronAPI || {}),
            claudeCodeCli: {
              chatCompletion: (request: CreateChatCompletionRequest) => ipcRenderer.invoke(claudeCodeCliChannels.chatCompletion, request),
              streamChat: (
                request: CreateChatCompletionRequestStreaming,
                onChunk: (chunk: ChatCompletionChunk) => void,
                onDone: () => void,
                onError: (error: any) => void
              ): (() => void) => { // Returns a cancel function
                const requestId = `claude-code-stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

                const chunkListener = (_event: Electron.IpcRendererEvent, id: string, chunk: ChatCompletionChunk) => {
                  if (id === requestId) onChunk(chunk);
                };
                const doneListener = (_event: Electron.IpcRendererEvent, id: string) => {
                  if (id === requestId) {
                    cleanup();
                    onDone();
                  }
                };
                const errorListener = (_event: Electron.IpcRendererEvent, id: string, error: any) => {
                  if (id === requestId) {
                    cleanup();
                    onError(error);
                  }
                };

                const cleanup = () => {
                  ipcRenderer.removeListener(`${claudeCodeCliChannels.chatStream}:chunk`, chunkListener);
                  ipcRenderer.removeListener(`${claudeCodeCliChannels.chatStream}:done`, doneListener);
                  ipcRenderer.removeListener(`${claudeCodeCliChannels.chatStream}:error`, errorListener);
                };

                ipcRenderer.on(`${claudeCodeCliChannels.chatStream}:chunk`, chunkListener);
                ipcRenderer.on(`${claudeCodeCliChannels.chatStream}:done`, doneListener);
                ipcRenderer.on(`${claudeCodeCliChannels.chatStream}:error`, errorListener);

                ipcRenderer.send(claudeCodeCliChannels.chatStream, requestId, request);

                return () => {
                  ipcRenderer.send(`${claudeCodeCliChannels.chatStream}:cancel`, requestId);
                  cleanup();
                };
              },
            },
          });
        }
        ```
    *   **Action:** Add `exposeClaudeCodeCliContext()` to `src/helpers/ipc/context-exposer.ts`.
    *   **Action:** Update `Window` interface in `src/types.d.ts` for `window.electronAPI.claudeCodeCli`.
        ```typescript
        // src/types.d.ts
        // ...
        interface ClaudeCodeCliContext {
          chatCompletion: (request: any /* SDK's CreateChatCompletionRequest type */) => Promise<any /* SDK's ChatCompletion type */>;
          streamChat: (
            request: any, // SDK's CreateChatCompletionRequestStreaming type
            onChunk: (chunk: any /* SDK's ChatCompletionChunk type */) => void,
            onDone: () => void,
            onError: (error: any) => void
          ) => () => void; // Returns cancel function
        }
        // ...
        interface Window {
          // ... existing electronAPI parts ...
          electronAPI: {
            // ...
            claudeCodeCli: ClaudeCodeCliContext;
            // ...
          };
        }
        ```

**V. Renderer `AgentLanguageModel` Provider for Claude Code CLI**

1.  **Provider Implementation (`ClaudeCodeCliAgentLanguageModelLive.ts`):**
    *   **File:** `src/services/ai/providers/claude_code_cli/ClaudeCodeCliAgentLanguageModelLive.ts`
    *   **Content:** (Your example is a good start. Ensure `AgentChatMessage` is imported. The `options.prompt` for `streamText` and `generateText` is assumed to be a stringified ` { messages: AgentChatMessage[] } ` object.)
        ```typescript
        import { Effect, Layer, Stream } from "effect";
        import { AgentLanguageModel, AiResponse, AiProviderError, StreamTextOptions, GenerateTextOptions, GenerateStructuredOptions, AgentChatMessage } from "@/services/ai/core";
        import { ConfigurationService } from "@/services/configuration";
        import { TelemetryService } from "@/services/telemetry";
        // Import specific types from Jason Kneen's SDK for params and chunks
        import type { CreateChatCompletionRequest, CreateChatCompletionRequestStreaming, ChatCompletionChunk } from "@jasonkneen/claude-code-sdk/dist/client/chat";

        export const ClaudeCodeCliAgentLanguageModelLiveLayer = Layer.effect(
          AgentLanguageModel.Tag,
          Effect.gen(function*(_) {
            const configService = yield* _(ConfigurationService);
            const telemetry = yield* _(TelemetryService);

            const defaultModelName = yield* _(
              configService.get("CLAUDE_CODE_DEFAULT_MODEL").pipe(
                Effect.orElseSucceed(() => "claude-3-haiku-20240307") // Default if not in config
              )
            );

            const toSdkMessages = (promptString: string): Array<{role: "user" | "assistant" | "system", content: string | null}> => {
              try {
                // Assuming promptString is like "{ \"messages\": [ ... ] }"
                const parsedPrompt = JSON.parse(promptString);
                if (Array.isArray(parsedPrompt.messages)) {
                  return parsedPrompt.messages.map((m: AgentChatMessage) => ({
                    role: m.role as "user" | "assistant" | "system", // Ensure type compatibility
                    content: m.content || null
                  }));
                }
              } catch (e) { /* TELEMETRY_IGNORE_THIS_CONSOLE_CALL */ console.warn("Failed to parse prompt string as JSON messages, using as raw user input:", e); }
              return [{ role: "user", content: promptString }];
            };

            return AgentLanguageModel.Tag.of({
              _tag: "AgentLanguageModel",
              streamText: (options: StreamTextOptions) => Stream.asyncInterrupt<AiResponse, AiProviderError>(emit => {
                const modelToUse = options.model || defaultModelName;
                const sdkParams: CreateChatCompletionRequestStreaming = { // Use SDK type
                  model: modelToUse,
                  messages: toSdkMessages(options.prompt), // options.prompt is stringified {messages: AgentChatMessage[]}
                  stream: true,
                  temperature: options.temperature,
                  max_tokens: options.maxTokens,
                  // tools, tool_choice for Phase 7 - SDK might expect different format
                };

                if (!window.electronAPI?.claudeCodeCli?.streamChat) {
                    emit.fail(new AiProviderError({ message: "Claude Code CLI IPC bridge (streamChat) not available.", provider: "ClaudeCodeCLI", isRetryable: false }));
                    emit.end();
                    return Effect.unit;
                }
                Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli_provider", action: "stream_text_start", label: modelToUse, value: JSON.stringify({ messages: sdkParams.messages.length }) }));

                const cancelIPC = window.electronAPI.claudeCodeCli.streamChat(
                  sdkParams,
                  (sdkChunk: ChatCompletionChunk) => {
                    const textContent = sdkChunk.choices[0]?.delta?.content || "";
                    // Assuming AiResponse.fromSimple can handle potentially empty toolCalls etc.
                    const aiResponseChunk = AiResponse.fromSimple({ text: textContent });
                    emit.single(aiResponseChunk);
                  },
                  () => {
                    Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli_provider", action: "stream_text_done", label: modelToUse }));
                    emit.end();
                  },
                  (err) => {
                    Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli_provider", action: "stream_text_error_ipc", label: modelToUse, value: err?.message || String(err) }));
                    emit.fail(new AiProviderError({ message: `Claude Code CLI stream error: ${err?.message || String(err)}`, cause: err, provider: "ClaudeCodeCLI", isRetryable: false }));
                    emit.end();
                  }
                );
                return Effect.sync(() => {
                  Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli_provider", action: "stream_text_cancel_requested", label: modelToUse }));
                  cancelIPC();
                });
              }),

              generateText: (options: GenerateTextOptions) => Effect.tryPromise({
                try: async () => {
                  const modelToUse = options.model || defaultModelName;
                  const sdkParams: CreateChatCompletionRequest = { // Use SDK type
                     model: modelToUse,
                     messages: toSdkMessages(options.prompt),
                     stream: false,
                     temperature: options.temperature,
                     max_tokens: options.maxTokens,
                  };
                  if (!window.electronAPI?.claudeCodeCli?.chatCompletion) {
                     throw new AiProviderError({ message: "Claude Code CLI IPC bridge (chatCompletion) not available.", provider: "ClaudeCodeCLI", isRetryable: false });
                  }
                  Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli_provider", action: "generate_text_start", label: modelToUse, value: JSON.stringify({ messages: sdkParams.messages.length }) }));
                  const sdkResponse = await window.electronAPI.claudeCodeCli.chatCompletion(sdkParams);
                  if (sdkResponse.__error) { // Check for serialized error from IPC
                    throw new AiProviderError({ message: `Claude Code CLI error from main: ${sdkResponse.message}`, cause: sdkResponse, provider: "ClaudeCodeCLI", isRetryable: false });
                  }
                  Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli_provider", action: "generate_text_success", label: modelToUse }));
                  return AiResponse.fromSimple({ text: sdkResponse.choices[0]?.message?.content || "" });
                },
                catch: (err) => {
                  Effect.runFork(telemetry.trackEvent({ category: "claude_code_cli_provider", action: "generate_text_error_ipc", label: options.model || defaultModelName, value: (err as Error)?.message || String(err) }));
                  // Ensure the error being returned is one of our defined AiProviderError types
                  return err instanceof AiProviderError ? err : new AiProviderError({ message: `Claude Code CLI chat error: ${(err as Error)?.message || String(err)}`, cause: err, provider: "ClaudeCodeCLI", isRetryable: false });
                }
              }),

              generateStructured: (options: GenerateStructuredOptions) => Effect.fail(
                new AiProviderError({ message: "generateStructured not yet implemented for ClaudeCodeCLI", provider: "ClaudeCodeCLI", isRetryable: false })
              )
            });
          })
        );
        ```

2.  **Update `src/services/ai/providers/claude_code_cli/index.ts`:**
    ```typescript
    export * from "./ClaudeCodeSdkClient";
    export * from "./ClaudeCodeSdkClientLive";
    export * from "./ClaudeCodeCliAgentLanguageModelLive"; // Add this export
    ```

3.  **Update `src/services/ai/providers/index.ts`:**
    ```typescript
    // ... existing providers
    export * as ClaudeCodeCliProvider from "./claude_code_cli";
    ```

**VI. Integration into `ChatOrchestratorService` and UI**

1.  **Update `agentChatStore.ts` (`loadAvailableProviders`):**
    *   **File:** `src/stores/ai/agentChatStore.ts`
    *   **Action:** (As provided in your prompt, looks good)
        ```typescript
        const claudeCodeEnabledStr = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_ENABLED", "false"));
        if (claudeCodeEnabledStr === "true") {
          const claudeCodeModelName = yield* _(safeGetConfig("CLAUDE_CODE_DEFAULT_MODEL", "claude-3-opus-20240229"));
          const claudeCodeProviderName = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_NAME", "Claude Code (CLI)"));
          providers.push({
            key: "claude_code_cli", // Must match orchestrator case
            name: claudeCodeProviderName,
            type: "anthropic", // Or a new distinct type like "claude_code_cli" for UI filtering
            modelName: claudeCodeModelName,
          });
        }
        ```

2.  **Update `ChatOrchestratorService.ts` (`getProviderLanguageModel`):**
    *   **File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`
    *   **Action:** Add a case for `"claude_code_cli"` (As provided in your prompt, ensure imports are correct).
        ```typescript
        // In getProviderLanguageModel (or getResolvedAiModelProvider):
        case "claude_code_cli": {
          runTelemetry({ category: "orchestrator", action: "get_provider_model_start", label: key, value: modelName });
          // Dynamically import the layer
          const { ClaudeCodeCliAgentLanguageModelLiveLayer } = yield* _(
            Effect.promise(() => import("@/services/ai/providers/claude_code_cli/ClaudeCodeCliAgentLanguageModelLive"))
          );

          const providerLayer = ClaudeCodeCliAgentLanguageModelLiveLayer.pipe(
            // These services are already in the orchestrator's context (configService, telemetry)
            // So they are implicitly provided when Layer.build is called on this providerLayer later.
            // If they were direct Layer.provide calls here, they would need to be Layer<Dep, never, never>
            Layer.provide(Layer.succeed(ConfigurationService, configService)),
            Layer.provide(Layer.succeed(TelemetryService, telemetry))
          );
          const lm = yield* _(
            Layer.build(providerLayer).pipe(
              Effect.map(ctx => Context.get(ctx, AgentLanguageModel.Tag)),
              Effect.scoped // Important if the layer has resources to manage
            )
          );
          runTelemetry({ category: "orchestrator", action: "get_provider_model_success", label: key });
          return lm;
        }
        ```

3.  **UI in `AgentChatPane.tsx`:** Should automatically pick up the new provider from `agentChatStore` if the store is correctly populated.

**VII. Testing (High-Level Guide)**

*   **`ClaudeCodeSdkClientLive.test.ts` (Main Process Service):**
    *   Mock `ConfigurationService`.
    *   Mock the `@jasonkneen/claude-code-sdk`'s `ClaudeCode` class (constructor and methods like `chat.completions.createStream`).
    *   **Test:** Successful client instantiation, API key handling, CLI path usage. **Do not attempt actual CLI execution.**
*   **`claude-code-cli-listeners.test.ts` (IPC Handlers):**
    *   This is harder. You'd ideally need an Electron main process testing setup (e.g., `electron-vitest` if compatible, or use Playwright with main process helpers).
    *   Mock `ipcMain` and `event.sender`.
    *   Provide a mock `ClaudeCodeSdkClientService` to a test runtime for the main process.
    *   **Test:** IPC handlers correctly invoke the (mocked) SDK service methods, stream data back, handle errors.
*   **`ClaudeCodeCliAgentLanguageModelLive.test.ts` (Renderer Provider):**
    *   Mock `window.electronAPI.claudeCodeCli` (the functions defined in preload).
    *   Provide mock `ConfigurationService` and `TelemetryService`.
    *   **Test:** `streamText` and `generateText` correctly call IPC functions with mapped parameters and map IPC responses back to `AiResponse`. Test error propagation.
*   **Augment `ChatOrchestratorService.test.ts`:**
    *   Add tests for selecting and using the "claude_code_cli" provider. Mock the dynamically imported `ClaudeCodeCliAgentLanguageModelLiveLayer` to return a mock `AgentLanguageModel`.

This plan sets up the Claude Code SDK via CLI as a new, selectable AI provider. Remember to handle potential CLI installation issues and API key configuration for the user. The most complex parts will be the main process runtime setup and the IPC communication for streaming. Using the Ollama IPC as a template is a good idea.
