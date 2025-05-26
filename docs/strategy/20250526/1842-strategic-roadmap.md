# OpenAgents Commander: Strategic Roadmap

## 1. Introduction: The Universal AI Command Center

**Vision:** OpenAgents Commander aims to be the **universal command center for AI interaction and orchestration**, empowering users with unparalleled control, choice, and privacy. We are building the "VS Code for AI Interaction," a platform-agnostic interface that seamlessly integrates local models, cloud APIs, decentralized AI services, and specialized tools, all within an immersive, NUI-first Heads-Up Display (HUD).

Our strategy is not to compete on proprietary hardware or models but to achieve **platform independence through ubiquity and utility**. By delivering a radically better and more empowering user experience, we aim for Commander to become an indispensable tool that users demand across all their devices and platforms.

This document outlines our strategic roadmap, building upon our current strengths and guiding our development towards this vision.

## 2. Core Strategic Pillars

1.  **User Agency & Privacy:** Prioritize local-first capabilities (Ollama, PGlite), decentralized protocols (Nostr), and robust encryption to give users control over their data and AI interactions.
2.  **Provider Agnosticism & Resilience:** Offer seamless access to a diverse range of AI models (local, cloud, DVMs, CLIs) through a unified `AgentLanguageModel` interface, orchestrated by `AiPlan` for retries and fallbacks.
3.  **Immersive & Intuitive UX:** Deliver a unique "StarCraft UI" experience with a dynamic, pane-based HUD, prioritizing Natural User Interfaces (hand tracking, voice).
4.  **Extensibility & Developer Ecosystem:** Foster a vibrant community by enabling extensibility through a marketplace of plugins, prompts, and agents, with revenue-sharing models.
5.  **Decentralized Economy:** Integrate Bitcoin (Lightning via Spark SDK) for payments and earnings within the NIP-90 DVM ecosystem ("Sell Compute," consume DVM services).
6.  **Robust Engineering:** Leverage Effect-TS for a highly reliable, testable, and composable backend architecture.
7.  **Openness & Interoperability:** Embrace open standards (Nostr) and open source principles to build a resilient and community-driven platform.

## 3. Current State (Baseline: v0.0.4 - "Swarm Inference")

As of our "Swarm Inference" release (v0.0.4), Commander has established a strong foundation:

-   **Electron Flagship App:** Rich desktop experience with custom UI and OS integrations.
-   **Core AI Backend (Effect-TS):**
    -   `AgentLanguageModel` abstraction.
    -   Initial `ChatOrchestratorService` supporting dynamic provider selection.
    -   Provider implementations for local Ollama (via OpenAI-compatible adapter) and initial NIP-90 DVM consumption.
    -   Early integration for Claude Code CLI via a WebSocket bridge.
-   **NIP-90 DVM Capabilities:**
    -   **Consume:** Users can request AI inference from NIP-90 DVMs.
    -   **Provide ("Sell Compute"):** Users can offer their local Ollama models as DVMs, earning Bitcoin via Spark.
    -   UI: `Nip90RequestForm`, `Nip90GlobalFeedPane`, `Nip90ConsumerChatPane`, `SellComputePane`, `DVMSettingsDialog`, `DvmJobHistoryPane`.
-   **"Swarm Inference":** UI in `AgentChatPane` to switch between local Ollama and remote NIP-90 DVMs.
-   **Bitcoin Integration:** Spark SDK for Lightning payments (consuming DVMs) and invoice generation (providing DVM services).
-   **Nostr Integration:** NIP-28 public chat, NIP-04 encryption, NIP-19 identifiers, foundational NIP-90.
-   **UI/UX:** HUD-style interface with draggable/resizable panes, hand tracking (MediaPipe), forced dark theme.
-   **Local Persistence:** Initial PGlite setup for message persistence via the Claude Bridge Service.
-   **Configuration & Telemetry:** `ConfigurationService` and `TelemetryService` are operational.

## 4. Strategic Roadmap

### Phase 1: Solidify & Enhance Core Platform (Short-Term: Next 3-6 Months)

**Theme:** Stability, UX refinement, deepening key integrations, and improving the developer/DVM provider experience.

**Key Objectives & Initiatives:**

1.  **Claude Code Excellence:**
    *   **Deepen Integration:** Fully leverage the Claude Code CLI (via the bridge service) as a first-class `AgentLanguageModel` provider, accessible through `ChatOrchestratorService`. Ensure cost-effectiveness as demonstrated by current Claude Max plan usage.
    *   **Specialized UI:** Develop UI elements or dedicated panes tailored for coding tasks, potentially with diff views and direct file system interaction capabilities mediated by the Claude Code CLI (with appropriate permissions, possibly managed by flags like `--dangerously-skip-permissions` for advanced users during development/testing).
    *   **Tool Use:** Ensure Claude Code CLI's tool-calling capabilities are seamlessly integrated with Commander's `ToolHandlerService`.
    *   **"Best as a Base":** Make Claude Code a prominent, easily selectable option for coding-related agent workflows, reflecting its "remarkable" power for Commander's core tasks.
2.  **NIP-90 DVM Ecosystem Enhancement:**
    *   **Provider Tools:** Improve the "Sell Compute" UX with better monitoring, easier configuration, and more robust payment tracking.
    *   **Consumer Experience:** Enhance DVM discovery, reputation display (future), and payment flow for consuming NIP-90 services.
    *   **Standardization:** Promote and refine DVM interaction standards (e.g., for specific job kinds beyond text generation).
3.  **Local-First & Persistence Robustness:**
    *   **PGlite Maturation:** Fully implement and test PGlite-based persistence for all chat messages (NIP-28, Agent Chat, DVM Chat), NIP-90 job history, and user configurations as outlined in `docs/systems/message-persistence-architecture.md`. Ensure database path synchronization between Electron and any bridge services (Fix `024`).
    *   **Data Portability:** Implement features for users to easily export their local PGlite data.
    *   **Ollama Management:** Improve UI for managing local Ollama models (pulling, listing, selecting defaults).
4.  **Core AI Backend Refinement:**
    *   **Error Handling & Resilience:** Further improve error reporting (e.g., for Claude context window limits) and recovery across all AI provider layers and the `ChatOrchestratorService`.
    *   **`AiPlan` Enhancements:** Implement more sophisticated retry and fallback strategies in `AiPlan` (e.g., based on error types, cost, provider availability).
    *   **Telemetry Expansion:** Increase coverage of telemetry events for better performance monitoring and issue diagnosis.
5.  **UI/UX Polish:**
    *   Refine pane management, hand tracking interactions, and overall HUD responsiveness to match the "StarCraft UI" vision.
    *   Address UI inconsistencies and improve accessibility.
    *   Implement the "Bitcoin Balance Display" and other conceptual HUD elements (`docs/HUD.md`).
6.  **Foundation for Async Agents:**
    *   Develop the internal architecture to support "running multiple async agents overnight." This involves robust background task management within Electron, potentially leveraging the `ChatOrchestratorService` or a new `AgentExecutionService`.
    *   Initial UI for managing and viewing the status of these long-running agent tasks.

**Tweet Alignment:**
-   Focus on "Claude Code as a base" and "raw coding power."
-   Strengthen the "StarCraft UI" and "async agents" foundations.
-   Ensure cost-effective use of powerful models.

### Phase 2: Expand Agent Capabilities & Developer Ecosystem (Medium-Term: Next 6-12 Months)

**Theme:** Empowering users and developers with advanced agent functionalities and a thriving marketplace.

**Key Objectives & Initiatives:**

1.  **Agent App Store & Composability (Initial Version):**
    *   **Framework:** Design and implement the "Agent App Store" concept, allowing users to discover, install, and manage AI agents (specialized prompts, tool configurations, or self-contained logic).
    *   **Agent Chaining:** Introduce basic agent composability ("Unix pipes" model), enabling users to chain outputs of one agent to inputs of another via the UI.
    *   **Revenue Sharing Mechanics:** Implement the backend for ⚡️ revenue sharing for agent/plugin developers.
2.  **Advanced Tool Use & Management:**
    *   **`ToolHandlerService` Maturation:** Expand the library of built-in tools and simplify the process for developers to register custom tools.
    *   **Secure Tool Execution:** Enhance security around tool execution, especially for tools that interact with the filesystem or external APIs.
    *   **AI-Driven Tool Selection:** Improve LLM's ability to choose and use tools effectively.
3.  **Context Management & Persistent Sessions:**
    *   **`AgentChatSession` Implementation:** Fully implement the `AgentChatSession` service with robust context window management (truncation, summarization if needed) and persistent chat history using PGlite.
    *   **UI for Session Management:** Introduce UI elements in `AgentChatPane` or a dedicated "Previous Chats" pane to load, rename, and manage persistent chat sessions.
4.  **NUI Enhancements:**
    *   **Voice Commands (Basic):** Introduce initial voice command capabilities for common actions (e.g., opening panes, sending messages, basic agent commands).
    *   **Refined Hand Gestures:** Expand the vocabulary of hand gestures for more nuanced UI control and agent interaction.
5.  **Performance Optimization:**
    *   Optimize rendering performance of the HUD, especially with many active panes or complex 3D scenes.
    *   Improve startup time and resource consumption of the Electron app.
    *   Optimize PGlite query performance.

**Tweet Alignment:**
-   Deliver on "extensible with marketplace of plugins & prompts using ⚡️ rev-share."
-   Enhance "running multiple async agents."

### Phase 3: Achieve Ubiquity & Network Effects (Long-Term: 12-24 Months)

**Theme:** Expanding Commander's reach, fostering a self-sustaining ecosystem, and deepening decentralization.

**Key Objectives & Initiatives:**

1.  **PWA Client (Satellite App):**
    *   Develop and launch a Progressive Web App (PWA) version of Commander, offering core chat and agent interaction features.
    *   Focus on accessibility across devices where native installation is not possible or preferred (especially mobile).
    *   Leverage PGlite with IndexedDB for local persistence in the PWA.
2.  **Cross-Device Agent & Data Continuity:**
    *   Implement data synchronization (e.g., via ElectricSQL or a custom Nostr-based solution) for PGlite databases, allowing users to seamlessly continue conversations and agent tasks across their Electron and PWA clients.
    *   Ensure agent states can be "handed off" between devices.
3.  **Community-Powered Model Fine-Tuning (Experimental):**
    *   Launch initiatives for community-driven fine-tuning of open models.
    *   Develop protocols and infrastructure for privacy-preserving federated learning or data contribution, with rewards (credits/Bitcoin) for participants.
4.  **Mature Marketplace & Economy:**
    *   Expand the Agent App Store with diverse offerings.
    *   Refine revenue sharing, DVM marketplace, and potentially introduce a token/credit system for platform services (optional, needs careful consideration).
    *   Develop B2B offerings (private DVM networks, enterprise agent management).
5.  **Enhanced Decentralization:**
    *   Explore more Nostr NIPs for agent communication, discovery, and reputation.
    *   Reduce reliance on any centralized components further.

**Tweet Alignment:**
-   The PWA contributes to the "ubiquity" aspect, indirectly strengthening the "we win" condition by expanding user base and platform independence.

### Phase 4: The Universal AI Interface (Vision: Beyond 24 Months)

**Theme:** Establishing Commander as the de facto standard for human-AI interaction and a leading platform in the decentralized AI landscape.

**Key Objectives & Initiatives:**

1.  **Deep Workflow Integrations:** Enable Commander agents to integrate deeply with other applications and user workflows (e.g., email, calendars, project management tools) via robust APIs and plugins.
2.  **Advanced NUI & Immersive Experiences:** Explore next-generation NUI (AR/VR interfaces, more sophisticated gesture/voice control) for a truly immersive AI command environment.
3.  **Autonomous Agent Orchestration:** Develop capabilities for users to define complex goals that teams of specialized agents autonomously plan and execute, leveraging the composable agent architecture.
4.  **Leading Open Standards:** Drive the development and adoption of open protocols for agent communication, tool use, and decentralized AI service marketplaces.
5.  **Community Governance:** Transition key aspects of platform governance (e.g., marketplace policies, standard approvals) to a community-driven model.

## 5. Key Metrics for Success

-   **User Adoption & Engagement:** Daily/Monthly Active Users (DAU/MAU) of Commander (Electron & PWA).
-   **Developer Ecosystem Growth:** Number of registered developers, active agents/plugins in the marketplace, DVM providers on the network.
-   **Economic Activity:** Volume of Bitcoin transactions through NIP-90 DVMs, revenue generated by marketplace items.
-   **Provider Diversity:** Number of unique AI providers (cloud APIs, DVM types, local model integrations) actively used.
-   **Community Contributions:** Number of pull requests, community-developed tools/agents, participation in governance.
-   **Resilience & Uptime:** Measured by successful `AiPlan` fallbacks and overall service availability (including Claude context window resilience).
-   **Cost-Effectiveness:** Monitor API usage costs (e.g., Claude) and ensure they remain within acceptable limits for users/platform.
-   **User Satisfaction & Privacy:** Surveys, feedback, and opt-in rates for privacy-preserving features.

## 6. Risks and Mitigation

-   **Technical Complexity:**
    -   **Risk:** Managing the complexity of a multi-provider, multi-process, decentralized system.
    -   **Mitigation:** Strong adherence to Effect-TS principles, comprehensive testing (unit, integration, E2E, runtime validation as per `docs/testing-expansion-roadmap.md` and `docs/fixes/`), modular design, detailed architecture documentation.
-   **Platform Competition/Restrictions:**
    -   **Risk:** Major platforms (Apple, Google) restricting Electron/PWA capabilities or launching highly competitive integrated AI solutions.
    -   **Mitigation:** Focus on unique value proposition (NUI, decentralization, local-first, user agency), community building, legal/regulatory awareness, Electron app as a resilient primary client.
-   **Monetization Challenges:**
    -   **Risk:** Difficulty achieving sustainable revenue from open source and decentralized models.
    -   **Mitigation:** Diversified revenue streams (premium features, B2B, marketplace fees), lean operations, strong community engagement to drive value.
-   **External Dependencies:**
    -   **Risk:** Reliance on external CLIs (e.g., `@anthropic-ai/claude-code`), Nostr relay stability, specific LLM provider APIs (and their usage limits/costs).
    -   **Mitigation:** Robust adapter patterns, `AiPlan` for provider fallbacks, fostering a diverse DVM network, clear guidance for managing CLI dependencies and API costs.
-   **Security of Local Wallet/Keys:**
    -   **Risk:** Users mismanaging local Spark wallet seed phrases or DVM private keys.
    -   **Mitigation:** Clear warnings, educational material, best-practice UI for key management (as seen in `WalletSetupPage`, `SelfCustodyNoticeDialog`), and avoiding fallback credentials (Fix `022`).

## 7. Conclusion

OpenAgents Commander is uniquely positioned to become the definitive interface for the evolving AI landscape. By combining the power of cutting-edge AI models like Claude Code with a user-centric, NUI-first, and decentralized architecture, we can build a platform that is not only powerful and versatile but also respects user agency and privacy. This strategic roadmap, focused on iterative enhancements, ecosystem growth, and unwavering commitment to our core principles, will guide us in creating a future where users, not platforms, command their AI destiny. The "raw coding power + StarCraft UI + async agents + extensible marketplace + ⚡️ rev-share" formula is the engine for this victory.
