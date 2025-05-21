Okay, this is a great request to dive deep into a core UI element of "OpenAgents Commander." Based on `src/components/hud/Hotbar.tsx` and the associated actions and panes it triggers, here's a long, thorough document explaining what every button/pane in the Hotbar does.

---

**OpenAgents Commander: Hotbar Functional Specification**

**Version:** 1.0
**Date:** May 21, 2025
**Document Purpose:** To provide a comprehensive explanation of each button on the main application Hotbar, the actions they perform, and the panes or functionalities they control.

## 1. Introduction

The Hotbar is a central, persistent UI element in OpenAgents Commander, typically located at the bottom-center of the Heads-Up Display (HUD). Inspired by action bars in video games (like World of Warcraft, as mentioned in `docs/HUD.md`), its purpose is to provide quick, iconic access to frequently used application features, tools, and informational panes.

Each item on the Hotbar is represented by an icon and a slot number. Hovering over an item reveals a tooltip with its title. Clicking an item triggers a specific action, usually opening a new pane or toggling a system state. The Hotbar also visually indicates if a pane associated with one ofits items is currently the active pane in the workspace.

This document details each Hotbar item as currently implemented.

## 2. General Hotbar Characteristics

*   **Location:** Fixed at the bottom-center of the screen, overlaying other HUD elements like the `SimpleGrid` or 3D background scenes. (Positioned via CSS in `Hotbar.tsx`).
*   **Appearance:** A row of square or slightly rectangular slots, each containing an icon. The Hotbar itself has a semi-transparent background (`bg-background/50`), a border (`border-border/30`), and a backdrop blur effect to fit the dark, commander-centric theme. (Styled via `cn` utility in `Hotbar.tsx` and Tailwind CSS).
*   **Interaction:**
    *   **Click:** Primary interaction to activate the item's function.
    *   **Hover:** Displays a tooltip with the item's title (Implemented via `Tooltip` components in `HotbarItem.tsx`).
    *   **Active State:** An item can appear "active" (e.g., different border or background color) if the pane it controls is the currently active pane in the `PaneManager`. (Handled by the `isActive` prop in `HotbarItem.tsx`).
*   **Underlying Technology:**
    *   React component (`Hotbar.tsx`, `HotbarItem.tsx`).
    *   Icons from `lucide-react`.
    *   State management for pane visibility and active state via `usePaneStore` (Zustand).
    *   Styling via Shadcn UI conventions and Tailwind CSS.

## 3. Hotbar Items and Associated Panes/Functionalities

The following sections describe each Hotbar item by its slot number, icon, title, and the functionality it provides.

---

### 3.1. Slot 1: Reset HUD Layout

*   **Icon:** `RefreshCw` (a circular arrow indicating refresh/reset)
*   **Title/Tooltip:** "Reset HUD Layout"
*   **Purpose:** To allow the user to quickly revert the arrangement of all open panes (their positions, sizes, and which ones are open) back to the application's predefined default layout.
*   **Action on Click:**
    *   Calls the `resetHUDState` action from the `usePaneStore`.
    *   This action typically resets the `panes` array in the store to the state defined by the `getInitialPanes()` function and `initialState` in `src/stores/pane.ts`.
*   **Associated Pane/Functionality:**
    *   This button does not open a new pane. Instead, it manipulates the state of all existing panes managed by `PaneManager.tsx`.
    *   The default layout (as defined in `src/stores/pane.ts`) typically includes:
        *   **"Sell Compute Power" Pane (`sell_compute`):** Centrally located and active by default.
        *   **"Welcome Chat" (NIP-28) Pane (`nip28_channel`):** Positioned at the bottom-left, initially smaller and inactive.
    *   Any other panes the user might have opened will be closed, and the default ones will be restored to their initial positions and sizes.
*   **User Interaction within Pane:** Not applicable, as this is a global HUD action.
*   **Relevance to "OpenAgents Commander":** Provides a user-friendly way to recover from a cluttered or undesired pane layout, ensuring they can always return to a known good state. This is especially useful in a dynamic, multi-pane environment.
*   **Technical Details:**
    *   `onClick` handler in `Hotbar.tsx`: `resetHUDState`.
    *   Store action: `resetHUDState` in `src/stores/pane.ts`.
    *   Relevant store file for initial state: `src/stores/pane.ts` (function `getInitialPanes`).

---

### 3.2. Slot 2: Toggle Hand Tracking

*   **Icon:** `Hand` (a human hand icon)
*   **Title/Tooltip:** "Enable Hand Tracking" or "Disable Hand Tracking" (dynamically based on state)
*   **Active State:** The button visually changes (e.g., background color) when hand tracking is active.
*   **Purpose:** To enable or disable the Natural User Interface (NUI) feature of hand tracking, which allows users to interact with the application using hand gestures detected via their webcam.
*   **Action on Click:**
    *   Calls the `onToggleHandTracking` prop, which is a function passed down from `HomePage.tsx`.
    *   `HomePage.tsx` manages the `isHandTrackingActive` state and passes it to both the `Hotbar` (for button state) and the `HandTracking` component (to enable/disable the MediaPipe processing).
*   **Associated Pane/Functionality:**
    *   This button controls a global application state (`isHandTrackingActive` in `HomePage.tsx`).
    *   When active, the `HandTracking` component (`src/components/hands/HandTracking.tsx`) is enabled:
        *   It uses MediaPipe Hands via `useHandTracking.ts` to process the webcam feed.
        *   Detects hand landmarks, recognizes poses (`recognizeHandPose.ts`), and calculates pinch midpoints.
        *   This data is then passed up to `HomePage.tsx` via the `onHandDataUpdate` callback.
    *   Enabled functionalities with hand tracking (as seen in `HomePage.tsx` and `MainSceneContent.tsx`):
        *   **Pinch-to-Drag Panes:** Users can "pinch" (thumb and index finger close) a pane's title bar and drag it around the screen.
        *   **3D Scene Interaction:** Specific hand poses can control elements within R3F scenes (e.g., rotating boxes in `MainSceneContent.tsx`).
        *   A visual representation of the detected hands (landmarks and connections) is drawn on the `landmarkCanvasRef` if `showHandTracking` is true in `HandTracking.tsx`.
*   **User Interaction within Pane:** Not applicable directly, as it's a global toggle. Interactions occur via hand gestures when enabled.
*   **Relevance to "OpenAgents Commander":** A core feature aligning with the "NUI First" design principle mentioned in `docs/UI-STANDARDS.md`. It provides an alternative, immersive interaction modality.
*   **Technical Details:**
    *   `onClick` handler in `Hotbar.tsx`: `onToggleHandTracking` (prop).
    *   State management: `isHandTrackingActive` state in `src/pages/HomePage.tsx`.
    *   Core logic: `src/components/hands/useHandTracking.ts`, `src/components/hands/handPoseRecognition.ts`, `src/components/hands/HandTracking.tsx`.

---

### 3.3. Slot 3: New NIP-28 Channel

*   **Icon:** `MessageSquarePlus` (a speech bubble with a plus sign)
*   **Title/Tooltip:** "New NIP-28 Channel"
*   **Purpose:** To allow the user to create and open a new NIP-28 public chat channel pane.
*   **Action on Click:**
    *   Calls the `handleCreateChannel` function within `Hotbar.tsx`.
    *   `handleCreateChannel` then calls the `createNip28ChannelPane` action from `usePaneStore`.
    *   This action:
        *   Generates a default channel name (e.g., "New Channel [timestamp]").
        *   Invokes `NIP28Service.createChannel` to publish a Kind 40 event to Nostr, creating the channel.
        *   On success, adds a new pane of type `nip28_channel` to the `panes` array in the store, using the new channel's event ID and name.
*   **Associated Pane/Functionality:**
    *   **Pane Type:** `nip28_channel`
    *   **Pane Content Component:** `Nip28ChannelChat.tsx` (`src/components/nip28/Nip28ChannelChat.tsx`).
    *   **Functionality:**
        *   Provides a real-time chat interface for a Nostr NIP-28 public channel.
        *   Displays messages from other users in the channel.
        *   Allows the user to send messages to the channel. Messages are encrypted to the channel creator's public key as per NIP-28 (handled by `NIP28Service`).
        *   Uses `useNostrChannelChat.ts` hook for managing message state, subscriptions, and sending messages.
    *   The pane is draggable, resizable, and adheres to general pane behaviors.
*   **User Interaction within Pane:**
    *   Reading messages.
    *   Typing and sending messages via the `ChatWindow` component.
*   **Relevance to "OpenAgents Commander":** Facilitates decentralized communication, a key aspect of the Nostr ecosystem. Channels could be used for public agent discussions, community support, or general chat.
*   **Technical Details:**
    *   `onClick` handler in `Hotbar.tsx`: `handleCreateChannel`.
    *   Store action: `createNip28ChannelPaneAction` in `src/stores/panes/actions/createNip28ChannelPane.ts`.
    *   Pane component: `src/components/nip28/Nip28ChannelChat.tsx`.
    *   Core logic: `src/services/nip28/NIP28Service.ts`, `src/hooks/useNostrChannelChat.ts`.

---

### 3.4. Slot 4: NIP-90 DVM Dashboard

*   **Icon:** `Cpu` (representing computation/processing)
*   **Title/Tooltip:** "NIP-90 DVM Dashboard"
*   **Active State:** Active when the NIP-90 Dashboard pane (`id: 'nip90-dashboard'`) is the active pane.
*   **Purpose:** To open the NIP-90 Data Vending Machine (DVM) dashboard, allowing users to act as *consumers* of DVM services by creating and sending job requests.
*   **Action on Click:**
    *   Calls the `openNip90DashboardPane` action from `usePaneStore`.
    *   This action adds a new pane of type `nip90_dashboard` (or brings an existing one to the front and activates it).
*   **Associated Pane/Functionality:**
    *   **Pane Type:** `nip90_dashboard`
    *   **Pane Content Component:** `Nip90Dashboard.tsx` (`src/components/nip90/Nip90Dashboard.tsx`).
    *   **Functionality:** This pane combines two main components:
        *   `Nip90RequestForm.tsx`: Allows users to:
            *   Specify job kind (e.g., 5100 for text generation).
            *   Enter input data (e.g., a prompt).
            *   Specify output MIME type.
            *   Optionally, set a bid amount in millisatoshis.
            *   Publish the job request to Nostr. Requests are encrypted to a hardcoded DVM public key (`OUR_DVM_PUBKEY_HEX` in `Nip90RequestForm.tsx`, ideally this should be configurable or dynamically chosen). Ephemeral keys are used for the request, and the secret key is stored in `localStorage` to decrypt potential responses.
        *   `Nip90EventList.tsx`: Displays a list of NIP-90 job request events (Kind 5xxx) fetched from Nostr relays. For each request, users can click "Load Results" to fetch associated job result (Kind 6xxx) and feedback (Kind 7000) events.
    *   This pane is central to interacting with DVMs as a client.
*   **User Interaction within Pane:**
    *   Filling out and submitting the NIP-90 request form.
    *   Browsing the list of NIP-90 job requests.
    *   Clicking "Load Results" to see outcomes and feedback for specific jobs.
*   **Relevance to "OpenAgents Commander":** Directly supports the "Command agents" aspect by providing a UI to request computations from DVMs, which are essentially specialized agents.
*   **Technical Details:**
    *   `onClick` handler in `Hotbar.tsx`: `openNip90Dashboard`.
    *   Store action: `openNip90DashboardPaneAction` in `src/stores/panes/actions/openNip90DashboardPane.ts`.
    *   Pane component: `src/components/nip90/Nip90Dashboard.tsx` (which uses `Nip90RequestForm.tsx` and `Nip90EventList.tsx`).
    *   Core logic: `src/services/nip90/NIP90Service.ts`, `src/helpers/nip90/`.

---

### 3.5. Slot 5: Sell Compute

*   **Icon:** `Store` (representing a marketplace or offering a service)
*   **Title/Tooltip:** "Sell Compute"
*   **Active State:** Active when the Sell Compute pane (`id: 'sell_compute'`) is the active pane.
*   **Purpose:** To open the "Sell Compute" pane, which allows users to configure and run their own Kind 5050 Data Vending Machine (DVM) to offer AI inference services (e.g., using Ollama) to the network and earn Bitcoin.
*   **Action on Click:**
    *   Calls the `onOpenSellComputePane` prop, which is connected to `openSellComputePaneAction` in `usePaneStore` via `HomePage.tsx`.
    *   This action adds a new pane of type `sell_compute` (or brings an existing one to the front).
*   **Associated Pane/Functionality:**
    *   **Pane Type:** `sell_compute`
    *   **Pane Content Component:** `SellComputePane.tsx` (`src/components/sell-compute/SellComputePane.tsx`).
    *   **Functionality:** This is the primary interface for users acting as DVM providers.
        *   **Status Checks:** Displays the connection status of their Spark wallet (for Bitcoin Lightning payments) and local Ollama instance. Buttons allow re-checking these statuses (`SparkService.checkWalletStatus`, IPC call to `ollama:status-check` which in turn uses `OllamaService.checkOllamaStatus`).
        *   **Go Online/Offline:** A main toggle button to start or stop the `Kind5050DVMService`.
            *   When "GO ONLINE" is clicked:
                *   The `Kind5050DVMService.startListening()` method is called.
                *   The DVM subscribes to NIP-90 job requests (Kind 5050) on configured relays, filtered for its public key.
                *   It processes requests using Ollama, generates Lightning invoices via Spark, and publishes results.
                *   It also starts a periodic check for paid invoices (`checkAndUpdateInvoiceStatuses`).
            *   When "GO OFFLINE" is clicked:
                *   The `Kind5050DVMService.stopListening()` method is called, unsubscribing from job requests and stopping the invoice check loop.
        *   **Settings:** A cog icon opens the `DVMSettingsDialog.tsx` where users can configure:
            *   DVM Nostr identity (private key).
            *   Relays to listen on.
            *   Supported job kinds.
            *   Text generation parameters (model, max tokens, temperature, etc.).
            *   Pricing parameters (min price, price per 1k tokens).
            *   These settings are persisted in `localStorage` via `useDVMSettingsStore.ts`.
*   **User Interaction within Pane:**
    *   Checking wallet and Ollama status.
    *   Toggling the DVM online/offline state.
    *   Opening and configuring DVM settings in the dialog.
*   **Relevance to "OpenAgents Commander":** A cornerstone feature, enabling the "earn bitcoin" part of the application's motto by allowing users to monetize their compute resources. This is the "supply side" of the OpenAgents Compute network mentioned in `docs/transcripts/ep174.md`.
*   **Technical Details:**
    *   `onClick` handler in `Hotbar.tsx`: `onOpenSellComputePane`.
    *   Store action: `openSellComputePaneAction` in `src/stores/panes/actions/openSellComputePane.ts`.
    *   Pane component: `src/components/sell-compute/SellComputePane.tsx`.
    *   Dialog component: `src/components/dvm/DVMSettingsDialog.tsx`.
    *   Settings store: `src/stores/dvmSettingsStore.ts`.
    *   Core DVM logic: `src/services/dvm/Kind5050DVMService.ts`.
    *   Service dependencies: `SparkService`, `OllamaService` (via IPC), `NostrService`, `NIP04Service`.

---

### 3.6. Slot 6: DVM Job History

*   **Icon:** `History`
*   **Title/Tooltip:** "DVM Job History"
*   **Active State:** Active when the DVM Job History pane (`id: 'dvm_job_history'`) is the active pane.
*   **Purpose:** To open a dashboard displaying statistics and a paginated history of NIP-90 jobs processed by *the user's own* DVM (when they are "Selling Compute").
*   **Action on Click:**
    *   Calls the `onOpenDvmJobHistoryPane` prop, connected to `openDvmJobHistoryPaneAction` in `usePaneStore`.
    *   This adds a pane of type `dvm_job_history`.
*   **Associated Pane/Functionality:**
    *   **Pane Type:** `dvm_job_history`
    *   **Pane Content Component:** `DvmJobHistoryPane.tsx` (`src/components/dvm/DvmJobHistoryPane.tsx`).
    *   **Functionality:**
        *   **Statistics Cards:** Displays key metrics about the user's DVM activity, such as total jobs processed, successful jobs, failed jobs, total revenue (conceptual, as payment verification is complex), and jobs pending payment. (Fetched via `Kind5050DVMService.getJobStatistics`).
        *   **Job History Table:** A paginated table showing details of individual jobs processed by the DVM. Includes timestamp, job ID, requester, kind, status (e.g., "completed", "paid", "error"), and invoice amount. (Fetched via `Kind5050DVMService.getJobHistory`).
        *   **Refresh Button:** Allows users to refetch the latest statistics and history.
    *   Uses `React Query` for data fetching and caching.
    *   Initially, this pane was using mock data but has been refactored (as per `0629-instructions.md`) to fetch real data from the DVM's configured relays.
*   **User Interaction within Pane:**
    *   Viewing DVM performance statistics.
    *   Browsing through the history of processed jobs.
    *   Using pagination controls to navigate the job history.
    *   Refreshing the data.
*   **Relevance to "OpenAgents Commander":** Provides DVM operators (users selling compute) with visibility into their DVM's performance and earnings, crucial for managing their participation in the compute marketplace.
*   **Technical Details:**
    *   `onClick` handler in `Hotbar.tsx`: `onOpenDvmJobHistoryPane`.
    *   Store action: `openDvmJobHistoryPaneAction` in `src/stores/panes/actions/openDvmJobHistoryPane.ts`.
    *   Pane component: `src/components/dvm/DvmJobHistoryPane.tsx`.
    *   Data fetching: `Kind5050DVMService.getJobHistory` and `Kind5050DVMService.getJobStatistics`.

---

### 3.7. Slot 7: NIP-90 DVM Test

*   **Icon:** `TestTube` (representing experimentation/testing)
*   **Title/Tooltip:** "NIP-90 DVM Test"
*   **Active State:** Active when the NIP-90 DVM Test pane (`id: NIP90_DVM_TEST_PANE_ID`) is active.
*   **Purpose:** To open a pane that allows users (typically DVM providers) to send a *local test job request* to their own DVM service. This is for verifying that their DVM (Ollama, Spark integration, job processing logic) is functioning correctly without needing to publish actual Nostr events or involve external clients.
*   **Action on Click:**
    *   Calls the `openNip90DvmTestPane` action from `usePaneStore`.
    *   This adds a new pane of type `nip90_dvm_test`.
*   **Associated Pane/Functionality:**
    *   **Pane Type:** `nip90_dvm_test`
    *   **Pane Content Component:** `Nip90DvmTestPane.tsx` (`src/components/nip90_dvm_test/Nip90DvmTestPane.tsx`).
    *   **Functionality:**
        *   Displays connection status for Spark Wallet and Ollama (similar to `SellComputePane`).
        *   Has a "GO ONLINE" / "GO OFFLINE" button to control the `Kind5050DVMService` (this might be redundant if `SellComputePane` is also used, but offers control within this test context).
        *   Provides an input field for a test prompt.
        *   A "Send Test Job to Self" button calls `Kind5050DVMService.processLocalTestJob(testPrompt)`. This method bypasses Nostr and directly invokes the DVM's internal job processing logic using the provided prompt.
        *   Displays the result or error from the local test job.
*   **User Interaction within Pane:**
    *   Checking prerequisites (Wallet, Ollama).
    *   Ensuring the DVM service is online.
    *   Entering a test prompt.
    *   Initiating the local test job.
    *   Viewing the direct output or error.
*   **Relevance to "OpenAgents Commander":** A crucial debugging and testing tool for DVM providers, allowing them to confirm their setup before offering services publicly on the Nostr network.
*   **Technical Details:**
    *   `onClick` handler in `Hotbar.tsx`: `openNip90DvmTestPane`.
    *   Store action: `openNip90DvmTestPaneAction` in `src/stores/panes/actions/openNip90DvmTestPane.ts`.
    *   Pane component: `src/components/nip90_dvm_test/Nip90DvmTestPane.tsx`.
    *   Core DVM method: `Kind5050DVMService.processLocalTestJob`.

---

### 3.8. Slot 8: NIP-90 Consumer Chat

*   **Icon:** `MessageSquare` (a standard chat icon)
*   **Title/Tooltip:** "NIP-90 Consumer Chat"
*   **Active State:** Active when the NIP-90 Consumer Chat pane (`id: NIP90_CONSUMER_CHAT_PANE_ID`) is active.
*   **Purpose:** To open a dedicated chat-like interface for users to easily send NIP-90 job requests (specifically Kind 5050 for text inference) to DVMs and receive responses. This pane acts as a specialized NIP-90 client.
*   **Action on Click:**
    *   Calls the `openNip90ConsumerChatPane` action from `usePaneStore`.
    *   This adds a new pane of type `nip90_consumer_chat`.
*   **Associated Pane/Functionality:**
    *   **Pane Type:** `nip90_consumer_chat`
    *   **Pane Content Component:** `Nip90ConsumerChatPane.tsx` (`src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`).
    *   **Functionality:**
        *   **Consumer Identity:** Manages its own ephemeral Nostr identity (private/public key pair) and Spark wallet (using a unique mnemonic, separate from the main DVM provider wallet if any). This identity is used to sign NIP-90 requests and potentially pay for services. Balance and address for this consumer wallet are displayed.
        *   **Target DVM Input:** Allows the user to specify a target DVM's public key (npub or hex). If provided, requests are NIP-04 encrypted to this DVM. If blank, requests are sent unencrypted (broadcast).
        *   **Chat Interface:** Uses the `ChatContainer` component. User input is treated as the prompt for a Kind 5050 job request.
        *   **Job Submission:** When the user sends a "message" (prompt):
            *   The `useNip90ConsumerChat.ts` hook constructs a Kind 5050 NIP-90 job request.
            *   It signs the request with the pane's ephemeral private key.
            *   If a target DVM is specified, it encrypts the input parameters using NIP-04.
            *   It publishes the request to default Nostr relays.
            *   It then subscribes to Kind 6050 (results) and Kind 7000 (feedback) events related to that job request.
        *   **Displaying Responses:** DVM responses (results or feedback, decrypted if necessary) are displayed as "assistant" messages in the chat interface.
*   **User Interaction within Pane:**
    *   Viewing/managing the consumer identity and wallet.
    *   Optionally specifying a target DVM.
    *   Typing prompts and sending them as NIP-90 job requests.
    *   Reading DVM responses in the chat.
*   **Relevance to "OpenAgents Commander":** Provides a user-friendly way to consume DVM services without needing to manually craft NIP-90 events, lowering the barrier to entry for utilizing the OpenAgents Compute network.
*   **Technical Details:**
    *   `onClick` handler in `Hotbar.tsx`: `openNip90ConsumerChatPane`.
    *   Store action: `openNip90ConsumerChatPaneAction` in `src/stores/panes/actions/openNip90ConsumerChatPane.ts`.
    *   Pane component: `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`.
    *   Core logic hook: `src/hooks/useNip90ConsumerChat.ts`.
    *   Services used: `BIP39Service`, `BIP32Service`, `NIP19Service`, `NIP04Service`, `NostrService` (via the hook), `SparkService` (for the pane's wallet).

---

### 3.9. Slot 9: NIP-90 Global Feed

*   **Icon:** `Globe` (representing a worldwide or network-wide view)
*   **Title/Tooltip:** "NIP-90 Global Feed"
*   **Active State:** Active when the NIP-90 Global Feed pane (`id: NIP90_GLOBAL_FEED_PANE_ID`) is active.
*   **Purpose:** To display a live feed of recent NIP-90 events (job requests, results, and feedback from *all* DVMs and consumers) fetched from the default connected Nostr relays. This provides a global overview of DVM activity on the network.
*   **Action on Click:**
    *   Calls the `openNip90GlobalFeedPane` action from `usePaneStore`.
    *   This adds a new pane of type `nip90_global_feed`.
*   **Associated Pane/Functionality:**
    *   **Pane Type:** `nip90_global_feed`
    *   **Pane Content Component:** `Nip90GlobalFeedPane.tsx` (`src/components/nip90_feed/Nip90GlobalFeedPane.tsx`).
    *   **Functionality:**
        *   **Data Fetching:** Uses `React Query` to call `NIP90Service.listPublicEvents(limit)` (refactored from `NostrService.listPublicNip90Events`). This method fetches recent events of kinds 5xxx, 6xxx, and 7000 from the application's default configured relays.
        *   **Display:** Renders a list of event cards. Each card shows:
            *   Event ID (npub/note format, potentially linkable).
            *   Event Kind (e.g., "Job Request (5100)").
            *   Author Pubkey (npub format).
            *   Timestamp.
            *   A summary of the content (displays "[Encrypted Content]" if the `encrypted` tag is present, otherwise shows a snippet or tries to parse NIP-90 input tags).
            *   Key tags (e.g., `p`, `e`, `output`, `status`).
        *   **Refresh Button:** Allows manual refetching of the feed.
*   **User Interaction within Pane:**
    *   Scrolling through the feed of NIP-90 events.
    *   Potentially clicking event IDs or pubkeys to view them on external Nostr explorers (if implemented).
    *   Refreshing the feed.
*   **Relevance to "OpenAgents Commander":** Offers users insight into the overall activity of the NIP-90 DVM ecosystem, allowing them to discover DVMs, see what kinds of jobs are being requested, and understand network dynamics.
*   **Technical Details:**
    *   `onClick` handler in `Hotbar.tsx`: `openNip90GlobalFeedPane`.
    *   Store action: `openNip90GlobalFeedPaneAction` in `src/stores/panes/actions/openNip90GlobalFeedPane.ts`.
    *   Pane component: `src/components/nip90_feed/Nip90GlobalFeedPane.tsx`.
    *   Data fetching: `NIP90Service.listPublicEvents`.

---

## 4. Future/Conceptual Hotbar Items

The `docs/HUD.md` and `docs/UI-STANDARDS.md` allude to other HUD elements that might eventually have Hotbar buttons:

*   **Inspector Window:** (Reminiscent of StarCraft) Would likely display details of a selected agent, job, or entity. A Hotbar button could toggle its visibility or focus it.
*   **Bitcoin Balance Display:** (Reminiscent of StarCraft) While this might be a fixed HUD element, a Hotbar button could open a more detailed Bitcoin wallet management pane.
*   **Agent-Specific Commands/Abilities:** As agent capabilities grow, the Hotbar could be used to trigger common agent actions or switch between controlling different agents.

These are not currently implemented but represent potential future expansions of the Hotbar's functionality.

## 5. Conclusion

The Hotbar in OpenAgents Commander serves as a vital quick-access point for core application functionalities, ranging from HUD management and NUI toggles to complex interactions with NIP-28 chat channels and the NIP-90 DVM ecosystem (both as a consumer and a provider). Each button is designed to open a specific, purposeful pane or control a key application state, contributing to the overall "command and control" feel of the application.

---
