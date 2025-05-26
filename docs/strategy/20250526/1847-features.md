Okay, this is an exciting challenge! Let's lay out an "extremely ambitious" set of specific features for the next ~30 days of development, focusing on pushing OpenAgents Commander significantly towards its strategic vision.

The order reflects a logical build sequence, where foundational elements enable more complex features.

---

**Document: Blazing Forward: Next 30 Days - Feature Implementation Sprint**

**Introduction:**
This document outlines a highly ambitious feature set for the next major development sprint (approximately 30 days of focused effort). The goal is to rapidly advance Commander's capabilities across its core strategic pillars, particularly enhancing its "Claude Code as a base" power, "StarCraft UI" immersiveness, "async agent" potential, and the foundations for an "extensible marketplace."

**Guiding Principles for this Sprint:**
-   **Maximal Impact:** Prioritize features that deliver significant user value or unlock major architectural capabilities.
-   **Strategic Alignment:** Ensure every feature directly supports the "Universal AI Command Center" vision.
-   **Effect-TS First:** All new backend logic and service enhancements must adhere to Effect-TS best practices.
-   **Iterate on Existing Strengths:** Build upon the solid foundations of the AI backend, pane system, and NIP-90/DVM capabilities.
-   **User Experience Focus:** Continuously refine the HUD and NUI for a powerful and intuitive experience.

---

## Feature Implementation Order & Specifics:

**1. Claude Code Deep Integration & "Coding Command Pane"**

*   **Core Objective:** Make Claude Code the premier coding assistant within Commander, going beyond a simple chat provider.
*   **Specific Implementation Details:**
    *   **Dedicated "Coding Pane" Type (`coding_command`):**
        *   Create a new pane type that is specifically designed for coding tasks using the `ClaudeCodeCliAgentLanguageModelLive` provider (via `ChatOrchestratorService`).
        *   This pane should automatically be configured to use a Claude Code model (e.g., `claude-3-opus-20240229` or as specified in `CLAUDE_CODE_DEFAULT_MODEL`).
    *   **Contextual File/Project Awareness (via Claude Bridge Service):**
        *   Enhance the `Claude Bridge Service` (`src/services/claude-bridge-service.js`) and its WebSocket communication:
            *   Add new WebSocket message types for the main Commander app to send file paths or directory structures to the bridge service.
            *   The bridge service will then pass this context (e.g., contents of specified files, tree structure) to the `@anthropic-ai/claude-code` CLI using appropriate flags or by constructing a more detailed prompt.
            *   The "Coding Pane" UI should have buttons/input fields to select files/folders for context.
    *   **Syntax Highlighting & Diff Views:**
        *   Integrate a lightweight syntax highlighting library (e.g., `react-syntax-highlighter`) for displaying code snippets returned by Claude within the `Coding Pane`.
        *   Implement a basic diff view component (or integrate a library like `react-diff-viewer`) to show changes suggested by Claude. This component could be part of the `Coding Pane` or a new `diff_pane` type that can be spawned.
    *   **Inline Code Actions:**
        *   When Claude suggests code blocks, provide UI buttons next to the block: "Copy," "Insert at Cursor" (if a text editor context is active/linked), "Apply Diff."
    *   **Claude Max Cost Management:**
        *   Implement logic within `ClaudeCodeCliAgentLanguageModelLive` or `ChatOrchestratorService` to monitor token usage specifically for Claude Code calls.
        *   Provide user-visible warnings if a long-running task is approaching usage limits of the underlying Anthropic plan (conceptual, based on typical API usage patterns; actual CLI might not expose this directly).
        *   Allow users to set soft limits or approve continuation of tasks.
    *   **Utilize `--dangerously-skip-permissions` (Developer Mode):**
        *   Provide a developer setting in Commander's `ConfigurationService` (e.g., `CLAUDE_CODE_DANGEROUS_PERMISSIONS_ENABLED`) that, when true, appends the `--dangerously-skip-permissions` flag to Claude CLI calls via the bridge service. This is for advanced users who understand the risks and want to enable filesystem or command execution tools for the CLI.
*   **Impact/Strategic Alignment:** Directly addresses "Claude Code as a base" and "raw coding power." Establishes Commander as a serious AI-assisted coding environment.

**2. HUD Enhancement: Implement Core "StarCraft UI" Elements**

*   **Core Objective:** Materialize the conceptual HUD elements to enhance the "StarCraft UI" feel and provide essential information at a glance.
*   **Specific Implementation Details:**
    *   **Bitcoin Balance Display (`src/components/hud/BitcoinBalanceDisplay.tsx`):**
        *   Finalize and ensure robust, real-time (or frequent polling via `useQuery` with `refetchInterval`) display of user's Spark wallet balance.
        *   Ensure it correctly reflects changes after DVM payments or earnings.
        *   Make it clickable to open the `WalletPane`.
    *   **Inspector Pane (Foundation - `inspector_pane` type):**
        *   Create a new pane type: `inspector_pane`.
        *   Implement basic functionality: When another pane or an "inspectable" element (future concept, like an agent icon) is "selected" (e.g., active pane ID), the Inspector Pane should display its metadata (ID, type, title, dimensions).
        *   This is a stub for future context-sensitive actions.
    *   **Hotbar Functional Buttons (`src/components/hud/Hotbar.tsx`):**
        *   Ensure all existing Hotbar buttons correctly toggle their respective panes (`SellComputePane`, `WalletPane`, `DvmJobHistoryPane`, `AgentChatPane`, `PreviousChatsPane`).
        *   Wire up the `Hand` icon (slot 9) to `toggleHandTracking`.
        *   Make slots 5-8 visually distinct as "empty" or reserved for future user-assignable actions/agents.
*   **Impact/Strategic Alignment:** Directly enhances "StarCraft UI." Provides critical at-a-glance info and control.

**3. Foundational Asynchronous Agent Engine**

*   **Core Objective:** Lay the groundwork for "running multiple async agents overnight" by creating a backend service to manage and monitor long-running AI tasks.
*   **Specific Implementation Details:**
    *   **`AgentTaskSchema` (`src/services/ai/tasks/AgentTask.ts` - New):**
        *   Define a schema for an agent task: `id`, `status ('pending', 'running', 'completed', 'failed', 'cancelled')`, `description`, `providerKey`, `modelName`, `promptMessages: AgentChatMessage[]`, `result?: AiResponse`, `error?: string`, `createdAt`, `updatedAt`, `progress?: number`.
    *   **`AgentExecutionService.Tag` (`src/services/ai/tasks/AgentExecutionService.ts` - New):**
        *   Effect-TS service with methods:
            *   `submitTask(taskParams: Omit<AgentTask, 'id' | 'status' | ...>): Effect<AgentTask>`
            *   `getTaskStatus(taskId: string): Effect<AgentTask>`
            *   `listTasks(options: { limit?: number, status?: AgentTask['status'] }): Effect<AgentTask[]>`
            *   `cancelTask(taskId: string): Effect<void>`
    *   **`AgentExecutionServiceLive` Implementation:**
        *   Uses `ChatOrchestratorService` to execute the AI part of the task (non-streaming `generateConversationResponse` initially).
        *   Manages a simple in-memory queue or map of active tasks (PGlite persistence for tasks is next step).
        *   Updates task status as it progresses.
    *   **"Agent Tasks" Pane (`agent_tasks_pane` - New):**
        *   A new pane type to display a list of submitted agent tasks and their statuses.
        *   Allow users to view task details and cancel pending/running tasks.
    *   **Initial Integration:** Modify `AgentChatPane` or the new `CodingPane` to have an option to "Run as Async Task" for a given prompt, which submits it to `AgentExecutionService`.
*   **Impact/StrategicAlignment:** Foundation for "async agents overnight." Unlocks powerful background processing.

**4. Marketplace & Plugin System (Core Infrastructure)**

*   **Core Objective:** Establish the basic infrastructure for an extensible system of plugins and prompts, with an eye towards future revenue sharing.
*   **Specific Implementation Details:**
    *   **`PluginManifestSchema` (`src/services/plugins/PluginManifest.ts` - New):**
        *   Define schema: `id`, `name`, `version`, `description`, `author`, `type ('prompt_pack', 'tool_set', 'agent_logic')`, `entryPoint` (conceptual for now).
    *   **`PluginService.Tag` (`src/services/plugins/PluginService.ts` - New):**
        *   Effect-TS service:
            *   `loadPlugins(): Effect<PluginManifest[]>` (initially reads from a local JSON file in `assets/plugins/`).
            *   `getPlugin(pluginId: string): Effect<PluginManifest | null>`
    *   **"Marketplace" Pane (`marketplace_pane` - New):**
        *   Basic UI to list "available" plugins (from the local JSON manifests).
        *   Display manifest details. No installation/execution logic yet, just discovery.
    *   **"Prompt Pack" Example:**
        *   Create 1-2 example `PluginManifest` entries for "Prompt Packs" (e.g., "Creative Writing Prompts," "Coding Assistance Prompts").
        *   The `AgentChatPane` could have a button to "Load Prompt from Marketplace" which displays prompts from loaded Prompt Pack plugins.
    *   **Rev-Share Data Hooks (Conceptual):**
        *   In `ChatOrchestratorService`, when a prompt or tool from a "plugin" is used, log a telemetry event indicating plugin usage (e.g., `plugin_used: { pluginId: string, itemId: string }`). This is a stub for future rev-share calculation.
*   **Impact/Strategic Alignment:** First steps towards "extensible with marketplace of plugins & prompts using ⚡️ rev-share."

**5. NIP-90 DVM & Persistence Enhancements**

*   **Core Objective:** Improve the reliability and usability of both consuming and providing DVM services.
*   **Specific Implementation Details:**
    *   **Persistent DVM Job History (`Kind5050DVMService` & PGlite):**
        *   Modify `Kind5050DVMServiceImpl` to save `JobHistoryEntry` data to the PGlite database via `DatabaseService` after a job is fully completed (result sent, payment confirmed/failed/timeout).
        *   `getJobHistory()` method in `Kind5050DVMService` should now primarily query PGlite.
        *   The `DvmJobHistoryPane` will reflect this persistent data.
    *   **Improved Payment Verification Loop (`Kind5050DVMServiceImpl`):**
        *   Refine the backoff logic and timeout handling for pending jobs (constants like `JOB_POLL_INITIAL_DELAY_MS`, `OPTIMISTIC_PROCESSING_ATTEMPT_THRESHOLD` can be tuned).
        *   Ensure more robust error handling and telemetry for Spark invoice status checks.
    *   **DVM Discovery (Basic UI):**
        *   Add a section in `Nip90RequestForm` or `AgentChatPane` (when NIP-90 provider is selected) to list known/configured DVMs (e.g., from `ConfigurationService` like `AI_PROVIDER_DEVSTRAL_DVM_PUBKEY` and `USER_NIP90_DVM_PUBKEY`).
        *   Allow users to easily select one of these known DVMs as the target for their NIP-90 requests.
*   **Impact/Strategic Alignment:** Strengthens the decentralized AI economy aspect. Improves DVM provider viability and consumer UX.

**6. Database Synchronization & Chat History**

*   **Core Objective:** Ensure all chat interactions (Agent Chat, NIP-28, NIP-90 Consumer Chat) are consistently persisted using PGlite and accessible via the "Previous Chats" pane.
*   **Specific Implementation Details:**
    *   **Unify Database Path for Bridge:** Confirm and rigorously test that the `Claude Bridge Service` (`src/services/claude-bridge-service.js`) uses the exact same PGlite database path as the Electron main process `PGLiteService` (as per `docs/fixes/024-database-path-synchronization.md`).
    *   **`useAgentChat` Persistence:**
        *   Modify `useAgentChat` to save all user and assistant messages (including those from `ChatOrchestratorService`) to PGlite via `DatabaseService`.
        *   Each new chat should create a `DBSession` entry. Subsequent messages link to this `session_id`.
        *   Implement logic to load history from `DatabaseService` when an existing `sessionId` is provided to `useAgentChat`.
    *   **`PreviousChatsPane` Enhancement:**
        *   `PreviousChatsPane.tsx` should query `DatabaseService.getAllSessions()` (with pagination/sorting).
        *   Clicking a session should open a new `AgentChatPane` (or activate an existing one) populated with that session's ID and history. Pane title should reflect session.
*   **Impact/Strategic Alignment:** Critical for user data ownership, history, and seamless experience.

**7. NUI Refinement: Gesture Vocabulary & Basic Voice**

*   **Core Objective:** Expand NUI capabilities for a more fluid and intuitive interaction model.
*   **Specific Implementation Details:**
    *   **Additional Hand Gestures (`handPoseRecognition.ts` & `HomePage.tsx`):**
        *   Implement reliable recognition for at least two new distinct hand poses (e.g., "Point to Select," "Swipe to Dismiss").
        *   Map these gestures to UI actions:
            *   "Point to Select": Make the pane under the pointing finger active.
            *   "Swipe to Dismiss": Close the active/selected pane.
    *   **Voice Command Framework (Foundation - Main Process):**
        *   Integrate a basic speech recognition library (e.g., Electron's built-in capabilities if sufficient for simple commands, or a lightweight web speech API wrapper if running voice processing in a hidden renderer view).
        *   Implement keyword spotting (e.g., "Commander,...").
        *   Map 2-3 simple voice commands (e.g., "Commander, open chat," "Commander, toggle hand tracking") to existing `usePaneStore` actions or application functions via IPC.
*   **Impact/Strategic Alignment:** Advances the NUI-first principle, making interaction more natural.

---

**Concluding Remark:**
This sprint is designed to be a significant leap forward. Success will require intense focus, tight collaboration between design, frontend, and backend efforts, and leveraging the full power of our Effect-TS architecture. The outcome will be a Commander application that is substantially more powerful, usable, and closer to its strategic vision.
