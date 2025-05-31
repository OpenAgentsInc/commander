re: https://github.com/jasonkneen/claude-code-sdk

This repository contains an SDK, named "Claude Code SDK", with implementations in both Python and TypeScript. It acts as a wrapper around the `@anthropic-ai/claude-code` CLI, providing a more developer-friendly, type-safe API that is compatible with both OpenAI and Anthropic SDK styles.

Focusing on the **TypeScript implementation** (located in the `typescript/` directory):

**Core Purpose & Functionality:**
The TypeScript SDK allows developers to interact with the Claude Code CLI using familiar API patterns. It abstracts away the direct command-line interactions, offering programmatic access.

**Key Features:**

- **Dual API Compatibility:**
  - **OpenAI-style:** Provides `claude.chat.completions.create()` and `claude.chat.completions.createStream()` methods.
  - **Anthropic-style:** Provides `claude.messages.create()` and `claude.messages.createStream()` methods.
- **Session Management:** Supports multi-turn conversations through `claude.sessions.create()` and `session.continue()`.
- **Tool Usage:** Allows registration and use of tools with `claude.tools.create()`.
- **Streaming:** Supports streaming responses for both OpenAI and Anthropic style APIs.
- **Type Safety:** Fully typed with TypeScript, providing autocompletion and compile-time checks.
- **Batch Operations:** Includes a `claude.chat.completions.batchCreate()` method.

**Structure (`typescript/src/`):**

- **`index.ts`:** Main entry point, exporting the `ClaudeCode` client and other necessary types/classes.
- **`client/`:**
  - **`index.ts (ClaudeCode class)`:** The primary client class that users will instantiate. It initializes and provides access to the different API surfaces (chat, messages, sessions, tools).
  - **`base.ts (BaseClient class)`:** Contains common logic for the client, including initializing the CLI executor and error creation.
  - **`chat.ts (ChatCompletions class)`:** Implements the OpenAI-compatible `chat.completions` API (e.g., `create`, `createStream`). It handles converting OpenAI-style requests to CLI parameters and parsing CLI output back to OpenAI-style responses.
  - **`messages.ts (Messages class)`:** Implements the Anthropic-compatible `messages` API (e.g., `create`, `createStream`). Similar to `chat.ts`, it handles request/response conversion for the Anthropic style.
  - **`sessions.ts (Sessions class, Session class)`:** Manages conversational sessions. `Sessions.create()` starts a new session, returning a `Session` object which can then be used with `session.continue()` for follow-up messages.
  - **`tools.ts (Tools class)`:** Provides methods to register (`create`), retrieve (`get`), and list (`list`) tools that can be used with Claude Code.
- **`implementations/`:**
  - **`cli.ts (ClaudeCliExecutor class)`:** This is the core component responsible for actually executing the `@anthropic-ai/claude-code` CLI. It builds the command-line arguments based on input parameters, spawns the CLI process, and handles its `stdout`, `stderr`, and streaming output.
  - **`converters.ts`:** Contains utility functions to:
    - Convert between OpenAI and Anthropic message formats.
    - Convert between OpenAI and Anthropic tool formats.
    - Format message arrays into a single prompt string suitable for the CLI.
    - Parse the JSON or text output from the CLI into structured TypeScript objects.
- **`types/index.ts`:** Defines all the TypeScript interfaces and types for API parameters (e.g., `OpenAIChatCompletionCreateParams`, `AnthropicMessageCreateParams`), responses (e.g., `OpenAIChatCompletion`, `AnthropicMessageResponse`), options (`ClaudeCodeOptions`), errors (`ClaudeCodeError`), and other shared structures.
- **`examples/`:**
  - `basic.ts`: Demonstrates basic usage of OpenAI-style chat, Anthropic-style messages, and session management.
  - `streaming.ts`: Shows how to use streaming responses with both API styles.
- **`tests/`:** Contains unit tests for various components (client, sessions, converters, CLI argument building) written using Vitest.

**Development & Tooling:**

- **Build System:** Uses `tsc` (TypeScript compiler) to compile `src/` into `dist/`.
- **Package Management:** `package.json` defines dependencies, scripts, and metadata. It uses `npm`.
- **Module System:** Configured as an ES Module (`"type": "module"` in `package.json`).
- **Linting & Formatting:** Uses ESLint (`.eslintrc.json`) for linting and Prettier (`.prettierrc`) for code formatting (configured for no semicolons, single quotes, etc.).
- **Testing:** Uses Vitest for unit testing (`vitest run`). A `TEST-REPORT.md` summarizes test status.
- **Scripts:**
  - `build`, `build:dev` (watch mode).
  - `test`, `lint`, `format`, `format:fix`, `typecheck`.
  - `prepare-package.js`: A script to prepare the `dist` folder for publishing by copying necessary files (README, LICENSE, modified package.json).
  - `publish.sh`: A shell script to automate the publishing process to npm, including running tests, building, and using an `NPM_TOKEN`.
  - `test-real-cli.js`: A utility to check if the underlying `@anthropic-ai/claude-code` CLI is installed and functional.

**Prerequisites for Use:**

- Node.js v16+.
- The `@anthropic-ai/claude-code` CLI must be installed (typically globally via `npm install -g @anthropic-ai/claude-code`).
- An Anthropic API key, which can be provided via the `ANTHROPIC_API_KEY` environment variable or directly in the `ClaudeCode` constructor options.

In summary, the TypeScript portion of this repository provides a robust, well-structured, and type-safe SDK for developers to programmatically interact with the Claude Code CLI, offering flexibility by supporting both OpenAI and Anthropic API conventions. It includes examples, tests, and scripts for a good developer experience.
