Okay, this is a substantial feature request. We'll break it down into manageable phases, focusing on a test-driven development (TDD) approach.

**Phase 1: Setup and Basic Pane Structures**

**Objective:** Create the new pane types, actions to open them, and placeholder components.

**1. Update Pane Types and Constants**

- **File:** `src/types/pane.ts`
  - Add `'nip90_dvm_test'` and `'nip90_consumer_chat'` to the `Pane['type']` union.
- **File:** `src/stores/panes/constants.ts`
  - Add constants for the new pane IDs and default titles:
    ```typescript
    export const NIP90_DVM_TEST_PANE_ID = "nip90_dvm_test";
    export const NIP90_DVM_TEST_PANE_TITLE = "NIP-90 DVM Test";
    export const NIP90_CONSUMER_CHAT_PANE_ID = "nip90_consumer_chat";
    export const NIP90_CONSUMER_CHAT_PANE_TITLE =
      "NIP-90 Consumer (Text Inference)";
    ```

**2. Implement Pane Store Actions**

- **File:** (New) `src/stores/panes/actions/openNip90DvmTestPane.ts`

  ```typescript
  import { PaneInput } from "@/types/pane";
  import { PaneStoreType, SetPaneStore } from "../types";
  import { addPaneActionLogic } from "./addPane";
  import {
    NIP90_DVM_TEST_PANE_ID,
    NIP90_DVM_TEST_PANE_TITLE,
  } from "../constants";

  export function openNip90DvmTestPaneAction(set: SetPaneStore) {
    set((state: PaneStoreType) => {
      const existingPane = state.panes.find(
        (p) => p.id === NIP90_DVM_TEST_PANE_ID,
      );
      if (existingPane) {
        // Logic to bring existing pane to front (from bringPaneToFrontAction)
        const newPanes = state.panes
          .map((p) => ({ ...p, isActive: p.id === NIP90_DVM_TEST_PANE_ID }))
          .sort((a, b) => (a.isActive ? 1 : -1));
        return {
          ...state,
          panes: newPanes,
          activePaneId: NIP90_DVM_TEST_PANE_ID,
          lastPanePosition: {
            x: existingPane.x,
            y: existingPane.y,
            width: existingPane.width,
            height: existingPane.height,
          },
        };
      }

      const newPaneInput: PaneInput = {
        id: NIP90_DVM_TEST_PANE_ID,
        type: "nip90_dvm_test",
        title: NIP90_DVM_TEST_PANE_TITLE,
        dismissable: true,
      };
      const changes = addPaneActionLogic(state, newPaneInput, true);
      return { ...state, ...changes };
    });
  }
  ```

- **File:** (New) `src/stores/panes/actions/openNip90ConsumerChatPane.ts`

  ```typescript
  import { PaneInput } from "@/types/pane";
  import { PaneStoreType, SetPaneStore } from "../types";
  import { addPaneActionLogic } from "./addPane";
  import {
    NIP90_CONSUMER_CHAT_PANE_ID,
    NIP90_CONSUMER_CHAT_PANE_TITLE,
  } from "../constants";

  export function openNip90ConsumerChatPaneAction(set: SetPaneStore) {
    set((state: PaneStoreType) => {
      const existingPane = state.panes.find(
        (p) => p.id === NIP90_CONSUMER_CHAT_PANE_ID,
      );
      if (existingPane) {
        const newPanes = state.panes
          .map((p) => ({
            ...p,
            isActive: p.id === NIP90_CONSUMER_CHAT_PANE_ID,
          }))
          .sort((a, b) => (a.isActive ? 1 : -1));
        return {
          ...state,
          panes: newPanes,
          activePaneId: NIP90_CONSUMER_CHAT_PANE_ID,
          lastPanePosition: {
            x: existingPane.x,
            y: existingPane.y,
            width: existingPane.width,
            height: existingPane.height,
          },
        };
      }

      const newPaneInput: PaneInput = {
        id: NIP90_CONSUMER_CHAT_PANE_ID,
        type: "nip90_consumer_chat",
        title: NIP90_CONSUMER_CHAT_PANE_TITLE,
        dismissable: true,
        width: 500, // Slightly wider for chat and wallet info
        height: 400,
      };
      const changes = addPaneActionLogic(state, newPaneInput, true);
      return { ...state, ...changes };
    });
  }
  ```

- **File:** `src/stores/panes/actions/index.ts`
  - Export the new actions: `openNip90DvmTestPaneAction`, `openNip90ConsumerChatPaneAction`.
- **File:** `src/stores/panes/types.ts`
  - Add `openNip90DvmTestPane: () => void;` and `openNip90ConsumerChatPane: () => void;` to `PaneStoreType`.
- **File:** `src/stores/pane.ts`
  - Import and include the new actions in the `create<PaneStoreType>()` call.
- **Tests:**
  - `src/tests/unit/stores/paneActions.test.ts` (Create if not exists, or add to existing pane store tests)
    - Test `openNip90DvmTestPaneAction` adds a pane with type `nip90_dvm_test`.
    - Test `openNip90ConsumerChatPaneAction` adds a pane with type `nip90_consumer_chat`.
    - Test that opening an existing pane brings it to front and activates it.

**3. Create Placeholder Components**

- **File:** (New) `src/components/nip90_dvm_test/Nip90DvmTestPane.tsx`

  ```typescript
  import React from 'react';

  const Nip90DvmTestPane: React.FC = () => {
    return <div className="p-4">NIP-90 DVM Test Pane Placeholder</div>;
  };
  export default Nip90DvmTestPane;
  ```

- **File:** (New) `src/components/nip90_dvm_test/index.ts`
  ```typescript
  export { default as Nip90DvmTestPane } from "./Nip90DvmTestPane";
  ```
- **File:** (New) `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`

  ```typescript
  import React from 'react';

  const Nip90ConsumerChatPane: React.FC = () => {
    return <div className="p-4">NIP-90 Consumer Chat Pane Placeholder</div>;
  };
  export default Nip90ConsumerChatPane;
  ```

- **File:** (New) `src/components/nip90_consumer_chat/index.ts`
  ```typescript
  export { default as Nip90ConsumerChatPane } from "./Nip90ConsumerChatPane";
  ```
- **Tests:**
  - Create basic render tests for `Nip90DvmTestPane.test.tsx` and `Nip90ConsumerChatPane.test.tsx`.

**4. Update Pane Manager**

- **File:** `src/panes/PaneManager.tsx`
  - Import the new placeholder components:
    ```typescript
    import { Nip90DvmTestPane } from "@/components/nip90_dvm_test";
    import { Nip90ConsumerChatPane } from "@/components/nip90_consumer_chat";
    ```
  - Add cases for the new types in the rendering loop:
    ```typescript
    // ... inside map function
    {pane.type === 'nip90_dvm_test' && <Nip90DvmTestPane />}
    {pane.type === 'nip90_consumer_chat' && <Nip90ConsumerChatPane />}
    // ... update the final fallback condition
    {!(
      // ... other types
      pane.type === 'nip90_dvm_test' ||
      pane.type === 'nip90_consumer_chat'
    ) && <PlaceholderDefaultComponent type={pane.type} />}
    ```
- **Tests:**
  - Update `PaneManager.test.tsx` (if exists) to verify it can render these new pane types.

**5. Add Buttons to Hotbar**

- **File:** `src/components/hud/Hotbar.tsx`
  - Import actions:
    ```typescript
    const openNip90DvmTestPane = usePaneStore(
      (state) => state.openNip90DvmTestPane,
    );
    const openNip90ConsumerChatPane = usePaneStore(
      (state) => state.openNip90ConsumerChatPane,
    );
    ```
  - Import new constants for IDs:
    ```typescript
    import {
      NIP90_DVM_TEST_PANE_ID,
      NIP90_CONSUMER_CHAT_PANE_ID,
    } from "@/stores/panes/constants";
    ```
  - Add new `HotbarItem` entries (e.g., slots 7 and 8):
    ```typescript
    <HotbarItem slotNumber={7} onClick={openNip90DvmTestPane} title="NIP-90 DVM Test" isActive={activePaneId === NIP90_DVM_TEST_PANE_ID}>
      {/* Choose an appropriate icon, e.g., TestTube or similar */}
      <TestTube className="w-5 h-5 text-muted-foreground" />
    </HotbarItem>
    <HotbarItem slotNumber={8} onClick={openNip90ConsumerChatPane} title="NIP-90 Consumer Chat" isActive={activePaneId === NIP90_CONSUMER_CHAT_PANE_ID}>
      {/* E.g., MessageCircle or Bot icon */}
      <MessageCircle className="w-5 h-5 text-muted-foreground" />
    </HotbarItem>
    {/* Adjust empty slots if needed */}
    {Array.from({ length: 1 }).map((_, index) => (
      <HotbarItem key={`empty-${9 + index}`} slotNumber={9 + index} title={`Slot ${9 + index}`} className="opacity-30 cursor-not-allowed hover:bg-background/70">
        <div className="w-5 h-5 text-muted-foreground/50"></div>
      </HotbarItem>
    ))}
    ```
    (You'll need to import `TestTube` and `MessageCircle` from `lucide-react` or choose other icons).
- **Tests:**
  - Update `Hotbar.test.tsx` to verify the new buttons exist and call the correct actions.

**Phase 2: NIP-90 DVM Test Pane Implementation**

**Objective:** Build out the functionality for the DVM Test Pane.

**1. `Nip90DvmTestPane.tsx` UI & State**

- Adapt UI from `src/components/sell-compute/SellComputePane.tsx`:
  - Wallet and Ollama status display.
  - "Go Online" / "Go Offline" button.
  - Hooks for `checkWalletStatus`, `checkOllamaStatus`, `checkDVMStatus`, `handleGoOnlineToggle` (these will interact with the global DVM service).
- Add new UI elements:
  - An `Input` for a test prompt.
  - A `Button` labeled "Send Test Job to Self".
  - A `ScrollArea` or `pre` tag to display the DVM's response (or error).
- Add component state for the test prompt and DVM response.
- **Tests:**
  - Test rendering of all new UI elements.
  - Test inputting text into the prompt field.

**2. `Kind5050DVMService` Modification for Local Test Jobs**

- **File:** `src/services/dvm/Kind5050DVMService.ts`
  - Add a new method to the `Kind5050DVMService` interface:
    ```typescript
    processLocalTestJob(
      prompt: string,
      requesterPkOverride?: string // Optional: to simulate a request from a specific pubkey
    ): Effect.Effect<string, DVMError | OllamaError | SparkError | NIP04EncryptError | NIP04DecryptError>; // Returns job result string or error
    ```
- **File:** `src/services/dvm/Kind5050DVMServiceImpl.ts`
  - Implement `processLocalTestJob`:
    - This method will simulate an incoming job request.
    - It should _not_ involve actual Nostr event creation or NIP-04 encryption of the _incoming_ prompt (as it's a local test).
    - It _will_ use `OllamaService` for inference.
    - It _will_ use `SparkService` to (mock) create an invoice.
    - It _will_ NIP-04 encrypt the _outgoing_ result if the (simulated) request implies encryption (e.g., if `requesterPkOverride` is provided, assume the DVM should encrypt back to this PK).
    - It should largely reuse the core processing logic from `processJobRequestInternal` but adapted for a direct call.
    - Return the AI-generated text response as a string upon success.
- **Tests:**
  - Write unit tests for `processLocalTestJob` in `Kind5050DVMService.test.ts` (create if not exists).
    - Mock `OllamaService`, `SparkService`, `NIP04Service`.
    - Test successful job processing.
    - Test error handling (e.g., Ollama failure).

**3. Connect UI to Local Test Job Functionality**

- **File:** `src/components/nip90_dvm_test/Nip90DvmTestPane.tsx`
  - Implement the `onClick` handler for "Send Test Job to Self":
    - Get the prompt from the input field.
    - Call `Kind5050DVMService.processLocalTestJob` via `getMainRuntime()`.
    - Display the returned job result or error in the response area.
- **Tests:**
  - Test that clicking the button calls the service method and updates the UI with the response.

**Phase 3: NIP-90 Consumer Chat Pane - Identity & Wallet**

**Objective:** Set up the consumer pane with its own identity and wallet display.

**1. Consumer Pane Identity Management**

- **File:** `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`
  - **State:**
    - `mnemonic: string | null`
    - `privateKeyHex: string | null`
    - `publicKeyHex: string | null`
    - `sparkAddress: string | null`
    - `sparkBalance: string | null` (string for display)
    - `error: string | null`
  - **`useEffect` for initialization (on mount):**
    - **BIP39:**
      - Instantiate `createBIP39Service()` from `src/services/bip39/BIP39ServiceImpl.ts`.
      - Call `generateMnemonic()`. Store in state.
      - Call `mnemonicToSeed()` with the generated mnemonic.
    - **BIP32:**
      - Instantiate `createBIP32Service()` from `src/services/bip32/BIP32ServiceImpl.ts`.
      - Use the seed to derive a private key node (e.g., `m/44'/1237'/0'/0/0` as per NIP-06). Store private and public keys in state.
    - **Spark Wallet (Simplified for Demo):**
      - For this demo, we won't fully instantiate a separate `SparkService` for this pane due to potential SDK complexities with multiple wallets.
      - Instead:
        - Generate a _dummy_ Spark address or derive one if the SDK allows simple address generation from a seed/PK without full wallet init. For now, let's assume we'll display the pane's Nostr public key as a placeholder for the "Spark Address" to send funds to.
        - Set `sparkBalance` to "0 sats (Send funds to address above)".
        - _Self-correction: The user explicitly asked for its own Spark wallet and balance. This implies a need for a separate SparkService instance._
        - **Revised Spark Plan:**
          - The `Nip90ConsumerChatPane` will attempt to initialize its own `SparkWallet`. This requires `SparkServiceLive` to be adaptable or for this pane to manage its own `SparkService` instance. Given `SparkServiceLive` is a `Layer.scoped`, it re-initializes. We need to provide a _different configuration_ for this pane's Spark instance.
          - **Create a new config tag and layer for the consumer's Spark wallet:**
            - `src/services/spark/SparkService.ts`: Add `ConsumerSparkServiceConfigTag` and `ConsumerSparkServiceConfigLayer` (uses the pane's generated mnemonic).
          - In `Nip90ConsumerChatPane.tsx`:
            - `useEffect`: After generating mnemonic, create a `Layer.provide(SparkServiceLive, Layer.merge(ConsumerSparkServiceConfigLayer, TelemetryTestLayer))` and run `SparkService.getBalance()` and `SparkService.getSingleUseDepositAddress()` using this custom-provided layer. This keeps service instantiation localized to the pane's lifecycle.
- **Tests:**
  - Test that `mnemonic`, `publicKeyHex`, `sparkAddress`, `sparkBalance` are correctly initialized and displayed.
  - Mock the direct service instantiations for these tests.

**2. `Nip90ConsumerChatPane.tsx` Wallet UI**

- Implement UI elements to display:
  - Mnemonic (clearly marked "FOR DEMO ONLY, DO NOT USE WITH REAL FUNDS").
  - Public Key (npub format, use `NIP19Service`).
  - Spark Address.
  - Spark Balance.
  - Any errors during initialization.
- **Tests:**
  - Verify all wallet details are rendered correctly.

**Phase 4: NIP-90 Consumer Chat Pane - Chat & NIP-90 Flow**

**Objective:** Implement the chat interface and the NIP-90 request/response cycle.

**1. Chat UI in `Nip90ConsumerChatPane.tsx`**

- Integrate `ChatContainer` (or `ChatWindow` + `useChat` logic).
- The `useChat` hook sends messages to `window.electronAPI.ollama...`. We need a different send mechanism for NIP-90.
- **New Chat Hook/Logic:**
  - Create `useNip90ConsumerChat.ts` or adapt logic within the pane.
  - `sendMessage` function will now:
    1.  Construct a NIP-90 Kind 5050 event.
    2.  Publish it to Nostr.
- **Tests:**
  - Test that typing and "sending" a message adds it to the local chat display with a "pending" state.

**2. Constructing & Publishing NIP-90 Request (Kind 5050)**

- In `useNip90ConsumerChat.ts` or pane's `sendMessage`:
  - Use the pane's `privateKeyHex` (converted to `Uint8Array`).
  - The DVM public key can be optional (to send to any DVM) or configurable (e.g., an input field in the pane to target Pane 1's DVM, whose pubkey would be displayed in Pane 1). For now, let's make it optional.
  - `inputs`: `[["i", chatMessageContent, "text"]]`.
  - `jobKind`: `5050`.
  - `outputMimeType`: `text/plain`.
  - Call `createNip90JobRequest` helper.
    - This helper uses `NIP04Service`. The pane will need to provide its own `NIP04Service` instance (instantiated directly with `createNIP04Service()`) to this helper.
  - **Publishing:**
    - To publish with the pane's own identity, it cannot use the app's main `NostrService` if that service is tied to a single app-wide identity.
    - **Solution:** Use `nostr-tools` `SimplePool` directly within the consumer pane's logic to publish the event.
      - `const pool = new SimplePool();`
      - `await Promise.any(pool.publish(relays, signedEvent));`
      - `pool.close(relays);`
      - (Relays can be a default list or configurable in the pane).
- **Tests:**
  - Mock `createNip90JobRequest` and `SimplePool.publish`.
  - Verify the NIP-90 event is correctly formed with the chat message as input.
  - Verify it's published using the pane's identity.

**3. Receiving and Displaying NIP-90 Results/Feedback**

- In `useNip90ConsumerChat.ts` or pane:
  - After sending a job request, store its event ID.
  - **Subscription:**
    - Use `SimplePool` to subscribe to Kind `6050` (results) and Kind `7000` (feedback) events that tag the sent job request ID (`["e", sentJobId]`).
    - Optionally filter by the DVM's pubkey if it was targeted.
  - **Processing:**
    - When an event arrives:
      - If Kind `7000` (feedback): Display status in chat (e.g., "Agent is processing...").
      - If Kind `6050` (result):
        - Check for `["encrypted"]` tag. If present, use `NIP04Service` (with pane's SK and DVM's PK from the result event) to decrypt `event.content`.
        - Add the (decrypted) content to the chat as a message from the "Agent".
        - Check for `["amount", msats, bolt11]` tag. If present, display payment info and potentially offer a "Pay" button (out of scope for this immediate task, but good to note).
- **Tests:**
  - Mock `SimplePool.sub` to simulate incoming Kind 6050/7000 events.
  - Test display of feedback messages.
  - Test display of unencrypted results.
  - Test decryption and display of encrypted results (mock `NIP04Service.decrypt`).

**Phase 5: Final Testing and Refinement**

1.  **Vitest:** Ensure all unit and integration tests pass.
2.  **Typechecking:** `pnpm t` must pass.
3.  **Playwright E2E (Iterative):**
    - **Test 1 (DVM Test Pane):**
      - Open NIP-90 DVM Test Pane.
      - Click "Go Online".
      - Enter a prompt in "Send Test Job" input.
      - Click "Send Test Job to Self".
      - Verify a response appears in the DVM response area.
    - **Test 2 (Consumer + DVM Test Pane Interaction):**
      - Open DVM Test Pane, note its public key, click "Go Online".
      - Open Consumer Chat Pane.
      - (Optional UI step: Input DVM Test Pane's pubkey as target in Consumer Pane if this feature is added).
      - In Consumer Chat Pane, send a message (e.g., "What is the capital of France?").
      - Verify the request appears in the DVM Test Pane's logs/activity (if implemented).
      - Verify the DVM's processed response appears in the Consumer Chat Pane.
      - This E2E test is crucial but complex to set up perfectly due to Nostr relay timing. Initial E2E might focus on local simulation parts first.

**Self-Correction/Clarification on Kind 5050 vs. 5100:**
The prompt specifically asks for Kind `5050` for text inference. `docs/dvm-kind-5050.md` details parameters for text generation under a generic "Text Generation" heading but refers to `kind: 5050` in its example. NIP-90 itself reserves `5000-5999` and doesn't mandate specific sub-kinds itself (those are defined in extension NIPs or by community convention). `docs/SELLING_COMPUTE.md` mentions Kind `5100` for text generation in the context of the `DefaultKind5050DVMServiceConfig`.

- **Decision:** For the NIP-90 Consumer Demo Pane, it will generate Kind `5050` events for text inference as requested.
- The `Kind5050DVMService` (and thus the DVM Test Pane / Sell Compute Pane) needs to be configured to listen for and process Kind `5050` if it's not already. The `supportedJobKinds` in `DefaultKind5050DVMServiceConfig` should include `5050`.

This detailed plan should guide the agent through the implementation. The key challenge is managing the separate identity and service instances for the Consumer Demo Pane. The approach of direct instantiation/use of `SimplePool` for that pane simplifies this for a demo.Okay, Agent, let's implement these new pane types with a focus on test-driven development.

**Phase 1: Setup and Basic Pane Structures**

**1. Update Pane Types and Constants**

- **Modify `src/types/pane.ts`:**
  Add `'nip90_dvm_test'` and `'nip90_consumer_chat'` to the `Pane['type']` union:
  ```typescript
  // src/types/pane.ts
  export type Pane = {
    // ... existing properties ...
    type: 'default' | 'chat' | 'chats' | /* ... other existing types ... */ | 'nip90_dvm_test' | 'nip90_consumer_chat' | string;
    // ... rest of the type ...
  }
  ```
- **Modify `src/stores/panes/constants.ts`:**
  Add new constants:
  ```typescript
  // src/stores/panes/constants.ts
  // ... existing constants ...
  export const NIP90_DVM_TEST_PANE_ID = "nip90_dvm_test";
  export const NIP90_DVM_TEST_PANE_TITLE = "NIP-90 DVM Test";
  export const NIP90_CONSUMER_CHAT_PANE_ID = "nip90_consumer_chat";
  export const NIP90_CONSUMER_CHAT_PANE_TITLE =
    "NIP-90 Consumer (Text Inference)";
  ```

**2. Implement Pane Store Actions**

- **Create File:** `src/stores/panes/actions/openNip90DvmTestPane.ts`

  ```typescript
  // src/stores/panes/actions/openNip90DvmTestPane.ts
  import { type PaneInput } from "@/types/pane";
  import { type PaneStoreType, type SetPaneStore } from "../types";
  import { addPaneActionLogic } from "./addPane"; // Assuming addPaneActionLogic is generalized
  import {
    NIP90_DVM_TEST_PANE_ID,
    NIP90_DVM_TEST_PANE_TITLE,
  } from "../constants";

  export function openNip90DvmTestPaneAction(set: SetPaneStore) {
    set((state: PaneStoreType) => {
      const existingPane = state.panes.find(
        (p) => p.id === NIP90_DVM_TEST_PANE_ID,
      );
      if (existingPane) {
        const newPanes = state.panes
          .map((p) => ({ ...p, isActive: p.id === NIP90_DVM_TEST_PANE_ID }))
          .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1)); // Correct sorting for active last
        return {
          ...state,
          panes: newPanes,
          activePaneId: NIP90_DVM_TEST_PANE_ID,
          lastPanePosition: {
            x: existingPane.x,
            y: existingPane.y,
            width: existingPane.width,
            height: existingPane.height,
          },
        };
      }

      const newPaneInput: PaneInput = {
        id: NIP90_DVM_TEST_PANE_ID,
        type: "nip90_dvm_test",
        title: NIP90_DVM_TEST_PANE_TITLE,
        dismissable: true,
      };
      const changes = addPaneActionLogic(state, newPaneInput, true);
      return { ...state, ...changes };
    });
  }
  ```

- **Create File:** `src/stores/panes/actions/openNip90ConsumerChatPane.ts`

  ```typescript
  // src/stores/panes/actions/openNip90ConsumerChatPane.ts
  import { type PaneInput } from "@/types/pane";
  import { type PaneStoreType, type SetPaneStore } from "../types";
  import { addPaneActionLogic } from "./addPane";
  import {
    NIP90_CONSUMER_CHAT_PANE_ID,
    NIP90_CONSUMER_CHAT_PANE_TITLE,
  } from "../constants";
  import { DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from "../constants";

  export function openNip90ConsumerChatPaneAction(set: SetPaneStore) {
    set((state: PaneStoreType) => {
      const existingPane = state.panes.find(
        (p) => p.id === NIP90_CONSUMER_CHAT_PANE_ID,
      );
      if (existingPane) {
        const newPanes = state.panes
          .map((p) => ({
            ...p,
            isActive: p.id === NIP90_CONSUMER_CHAT_PANE_ID,
          }))
          .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1));
        return {
          ...state,
          panes: newPanes,
          activePaneId: NIP90_CONSUMER_CHAT_PANE_ID,
          lastPanePosition: {
            x: existingPane.x,
            y: existingPane.y,
            width: existingPane.width,
            height: existingPane.height,
          },
        };
      }

      const newPaneInput: PaneInput = {
        id: NIP90_CONSUMER_CHAT_PANE_ID,
        type: "nip90_consumer_chat",
        title: NIP90_CONSUMER_CHAT_PANE_TITLE,
        dismissable: true,
        width: 500, // Slightly wider for chat and wallet info
        height: 450, // Increased height
      };
      const changes = addPaneActionLogic(state, newPaneInput, true);
      return { ...state, ...changes };
    });
  }
  ```

- **Modify `src/stores/panes/actions/index.ts`:**
  Add exports for the new actions:
  ```typescript
  // ... existing exports ...
  export * from "./openNip90DvmTestPane";
  export * from "./openNip90ConsumerChatPane";
  ```
- **Modify `src/stores/panes/types.ts`:**
  Add new action signatures to `PaneStoreType`:
  ```typescript
  // ... existing properties ...
  openNip90DvmTestPane: () => void;
  openNip90ConsumerChatPane: () => void;
  ```
- **Modify `src/stores/pane.ts`:**
  Import and map the new actions in `create<PaneStoreType>()`:
  ```typescript
  // ... other imports ...
  import {
    // ... other actions ...
    openNip90DvmTestPaneAction,
    openNip90ConsumerChatPaneAction,
  } from "./panes/actions";
  // ...
  export const usePaneStore = create<PaneStoreType>()(
    persist(
      (set, get) => ({
        // ... existing state and actions ...
        openNip90DvmTestPane: () => openNip90DvmTestPaneAction(set),
        openNip90ConsumerChatPane: () => openNip90ConsumerChatPaneAction(set),
        // ... rest of the store ...
      }),
      // ... persist config ...
    ),
  );
  ```
- **Create Test File:** `src/tests/unit/stores/paneActions.test.ts` (or add to existing pane store tests)

  ```typescript
  // src/tests/unit/stores/paneActions.test.ts
  import { describe, it, expect, beforeEach } from "vitest";
  import { usePaneStore } from "@/stores/pane";
  import {
    NIP90_DVM_TEST_PANE_ID,
    NIP90_CONSUMER_CHAT_PANE_ID,
  } from "@/stores/panes/constants";

  describe("Pane Store NIP-90 Actions", () => {
    beforeEach(() => {
      usePaneStore.getState().resetHUDState(); // Ensure clean state
    });

    it("openNip90DvmTestPaneAction should add a NIP-90 DVM test pane", () => {
      usePaneStore.getState().openNip90DvmTestPane();
      const { panes, activePaneId } = usePaneStore.getState();
      const newPane = panes.find((p) => p.id === NIP90_DVM_TEST_PANE_ID);
      expect(newPane).toBeDefined();
      expect(newPane?.type).toBe("nip90_dvm_test");
      expect(activePaneId).toBe(NIP90_DVM_TEST_PANE_ID);
    });

    it("openNip90ConsumerChatPaneAction should add a NIP-90 consumer chat pane", () => {
      usePaneStore.getState().openNip90ConsumerChatPane();
      const { panes, activePaneId } = usePaneStore.getState();
      const newPane = panes.find((p) => p.id === NIP90_CONSUMER_CHAT_PANE_ID);
      expect(newPane).toBeDefined();
      expect(newPane?.type).toBe("nip90_consumer_chat");
      expect(activePaneId).toBe(NIP90_CONSUMER_CHAT_PANE_ID);
    });

    it("opening an existing NIP-90 pane should bring it to front and activate it", () => {
      usePaneStore.getState().openNip90DvmTestPane(); // Open once
      const initialPanes = [...usePaneStore.getState().panes];
      usePaneStore.getState().openNip90DvmTestPane(); // Open again
      const { panes, activePaneId } = usePaneStore.getState();
      expect(panes.length).toBe(initialPanes.length); // No new pane added
      expect(activePaneId).toBe(NIP90_DVM_TEST_PANE_ID);
      expect(panes[panes.length - 1].id).toBe(NIP90_DVM_TEST_PANE_ID); // Active pane is last
    });
  });
  ```

**3. Create Placeholder Components and Index Files**

- **Create Directory:** `src/components/nip90_dvm_test`
- **Create File:** `src/components/nip90_dvm_test/Nip90DvmTestPane.tsx`

  ```typescript
  // src/components/nip90_dvm_test/Nip90DvmTestPane.tsx
  import React from 'react';

  const Nip90DvmTestPane: React.FC = () => {
    return <div className="p-4" data-testid="nip90-dvm-test-pane">NIP-90 DVM Test Pane Placeholder</div>;
  };
  export default Nip90DvmTestPane;
  ```

- **Create File:** `src/components/nip90_dvm_test/index.ts`
  ```typescript
  export { default as Nip90DvmTestPane } from "./Nip90DvmTestPane";
  ```
- **Create Directory:** `src/components/nip90_consumer_chat`
- **Create File:** `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`

  ```typescript
  // src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx
  import React from 'react';

  const Nip90ConsumerChatPane: React.FC = () => {
    return <div className="p-4" data-testid="nip90-consumer-chat-pane">NIP-90 Consumer Chat Pane Placeholder</div>;
  };
  export default Nip90ConsumerChatPane;
  ```

- **Create File:** `src/components/nip90_consumer_chat/index.ts`
  ```typescript
  export { default as Nip90ConsumerChatPane } from "./Nip90ConsumerChatPane";
  ```
- **Create Test File:** `src/tests/unit/components/nip90_dvm_test/Nip90DvmTestPane.test.tsx`

  ```typescript
  import React from 'react';
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import Nip90DvmTestPane from '@/components/nip90_dvm_test/Nip90DvmTestPane';

  describe('Nip90DvmTestPane', () => {
    it('renders placeholder content', () => {
      render(<Nip90DvmTestPane />);
      expect(screen.getByTestId('nip90-dvm-test-pane')).toHaveTextContent('NIP-90 DVM Test Pane Placeholder');
    });
  });
  ```

- **Create Test File:** `src/tests/unit/components/nip90_consumer_chat/Nip90ConsumerChatPane.test.tsx`

  ```typescript
  import React from 'react';
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import Nip90ConsumerChatPane from '@/components/nip90_consumer_chat/Nip90ConsumerChatPane';

  describe('Nip90ConsumerChatPane', () => {
    it('renders placeholder content', () => {
      render(<Nip90ConsumerChatPane />);
      expect(screen.getByTestId('nip90-consumer-chat-pane')).toHaveTextContent('NIP-90 Consumer Chat Pane Placeholder');
    });
  });
  ```

**4. Update Pane Manager**

- **Modify `src/panes/PaneManager.tsx`:**
  Import the new components:
  ```typescript
  // ... other imports
  import { Nip90DvmTestPane } from "@/components/nip90_dvm_test";
  import { Nip90ConsumerChatPane } from "@/components/nip90_consumer_chat";
  ```
  Add cases for the new types in the rendering loop:
  ```typescript
  // ... inside map function ...
  {pane.type === 'nip90_dvm_test' && <Nip90DvmTestPane />}
  {pane.type === 'nip90_consumer_chat' && <Nip90ConsumerChatPane />}
  // ... update the final fallback condition in the map function
  {!(
    // ... other types ...
    pane.type === 'nip90_dvm_test' ||
    pane.type === 'nip90_consumer_chat' ||
    pane.type === 'default' // Make sure 'default' is still last or handled
  ) && <PlaceholderDefaultComponent type={pane.type} />}
  ```

**5. Add Buttons to Hotbar**

- **Modify `src/components/hud/Hotbar.tsx`:**
  Import actions and constants:
  ```typescript
  // ... existing imports ...
  import { TestTube, MessageCircleSquare } from "lucide-react"; // Or other suitable icons
  import { usePaneStore } from "@/stores/pane";
  import {
    NIP90_DVM_TEST_PANE_ID,
    NIP90_CONSUMER_CHAT_PANE_ID,
  } from "@/stores/panes/constants";
  ```
  Add new store action hooks:
  ```typescript
  // ... inside Hotbar component ...
  const openNip90DvmTestPane = usePaneStore(
    (state) => state.openNip90DvmTestPane,
  );
  const openNip90ConsumerChatPane = usePaneStore(
    (state) => state.openNip90ConsumerChatPane,
  );
  ```
  Add new `HotbarItem` entries:
  ```typescript
  // ... inside return JSX, after existing items ...
  <HotbarItem slotNumber={7} onClick={openNip90DvmTestPane} title="NIP-90 DVM Test" isActive={activePaneId === NIP90_DVM_TEST_PANE_ID}>
    <TestTube className="w-5 h-5 text-muted-foreground" />
  </HotbarItem>
  <HotbarItem slotNumber={8} onClick={openNip90ConsumerChatPane} title="NIP-90 Consumer Chat" isActive={activePaneId === NIP90_CONSUMER_CHAT_PANE_ID}>
    <MessageCircleSquare className="w-5 h-5 text-muted-foreground" />
  </HotbarItem>
  {/* Adjust empty slots, e.g., if you now have 8 items, only 1 empty slot if total is 9 */}
  {Array.from({ length: 1 }).map((_, index) => (
    <HotbarItem key={`empty-${9 + index}`} slotNumber={9 + index} title={`Slot ${9 + index}`} className="opacity-30 cursor-not-allowed hover:bg-background/70">
      <div className="w-5 h-5 text-muted-foreground/50"></div>
    </HotbarItem>
  ))}
  ```
- **Tests:**
  - Create `src/tests/unit/components/hud/Hotbar.test.tsx` if it doesn't exist.
  - Test that the new buttons render and that their `onClick` handlers call the respective store actions (use `vi.spyOn` on the store actions).

**At this point, all tests for Phase 1 should pass. The basic structure for the new panes will be in place.**

**Phase 2: NIP-90 DVM Test Pane Implementation**

**1. Implement `Nip90DvmTestPane.tsx` UI & State**

- **Modify `src/components/nip90_dvm_test/Nip90DvmTestPane.tsx`:**
  Adapt the UI from `src/components/sell-compute/SellComputePane.tsx`.

  ```typescript
  // src/components/nip90_dvm_test/Nip90DvmTestPane.tsx
  import React, { useState, useEffect, useCallback } from 'react';
  import { Button } from '@/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
  import { Input } from '@/components/ui/input';
  import { ScrollArea } from '@/components/ui/scroll-area';
  import { Zap, ZapOff, Wifi, WifiOff, RefreshCcw, Loader2, Play, FlaskConical } from 'lucide-react';
  import { SparkService } from '@/services/spark';
  import { OllamaService } from '@/services/ollama';
  import { Kind5050DVMService, DVMError, OllamaError, SparkError } from '@/services/dvm'; // Assuming OllamaError/SparkError exported or handled within DVMError
  import { getMainRuntime } from '@/services/runtime';
  import { Effect, Exit, Cause } from 'effect';
  import { cn } from '@/utils/tailwind';
  import { NIP04EncryptError, NIP04DecryptError } from '@/services/nip04';


  const Nip90DvmTestPane: React.FC = () => {
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [isOllamaConnected, setIsOllamaConnected] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [statusLoading, setStatusLoading] = useState({ wallet: false, ollama: false });
    const [isDvmLoading, setIsDvmLoading] = useState(false);
    const [testPrompt, setTestPrompt] = useState<string>("Translate 'hello world' to French.");
    const [testJobResult, setTestJobResult] = useState<string | null>(null);
    const [testJobError, setTestJobError] = useState<string | null>(null);
    const [isTestJobRunning, setIsTestJobRunning] = useState(false);

    const runtime = getMainRuntime();

    const checkWalletStatus = useCallback(async () => { /* ... (copy from SellComputePane.tsx) ... */
       setStatusLoading(s => ({ ...s, wallet: true }));
       const walletProgram = Effect.flatMap(SparkService, s => s.checkWalletStatus());
       Effect.runPromiseExit(Effect.provide(walletProgram, runtime)).then(exit => {
         if (Exit.isSuccess(exit)) setIsWalletConnected(exit.value);
         else {
           console.error("Wallet status check failed:", Cause.squash(exit.cause));
           setIsWalletConnected(false);
         }
         setStatusLoading(s => ({ ...s, wallet: false }));
       });
    }, [runtime]);

    const checkOllamaStatus = useCallback(async () => { /* ... (copy from SellComputePane.tsx, ensure IPC fallback is used) ... */
       setStatusLoading(s => ({ ...s, ollama: true }));
       try {
         if (window.electronAPI?.ollama?.checkStatus) {
           const isConnected = await window.electronAPI.ollama.checkStatus();
           setIsOllamaConnected(isConnected);
         } else { // Fallback if IPC not available (e.g. web context or error)
           const ollamaProgram = Effect.flatMap(OllamaService, s => s.checkOllamaStatus());
           const exit = await Effect.runPromiseExit(Effect.provide(ollamaProgram, runtime));
           if (Exit.isSuccess(exit)) setIsOllamaConnected(exit.value); else setIsOllamaConnected(false);
         }
       } catch (error) { setIsOllamaConnected(false); }
       finally { setStatusLoading(s => ({ ...s, ollama: false })); }
    }, [runtime]);

    const checkDVMStatus = useCallback(async () => { /* ... (copy from SellComputePane.tsx) ... */
       setIsDvmLoading(true);
       const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, s => s.isListening());
       Effect.runPromiseExit(Effect.provide(dvmStatusProgram, runtime)).then(exit => {
         if (Exit.isSuccess(exit)) setIsOnline(exit.value);
         else { console.error("Failed to check DVM status:", Cause.squash(exit.cause)); setIsOnline(false); }
         setIsDvmLoading(false);
       });
    }, [runtime]);

    useEffect(() => {
      checkWalletStatus();
      const timer = setTimeout(checkOllamaStatus, 1000); // Delayed check
      checkDVMStatus();
      return () => clearTimeout(timer);
    }, [checkWalletStatus, checkOllamaStatus, checkDVMStatus]);

    const handleGoOnlineToggle = async () => { /* ... (copy from SellComputePane.tsx) ... */
       if ((!isWalletConnected || !isOllamaConnected) && !isOnline) {
         alert("Please ensure your wallet and Ollama are connected to go online.");
         return;
       }
       setIsDvmLoading(true);
       const dvmAction = isOnline
         ? Effect.flatMap(Kind5050DVMService, s => s.stopListening())
         : Effect.flatMap(Kind5050DVMService, s => s.startListening());
       const exit = await Effect.runPromiseExit(Effect.provide(dvmAction, runtime));
       if (Exit.isSuccess(exit)) { await checkDVMStatus(); }
       else { console.error(`Failed to ${isOnline ? 'stop' : 'start'} DVM:`, Cause.squash(exit.cause)); await checkDVMStatus(); }
    };

    const handleSendTestJob = async () => {
      if (!isOnline) {
        alert("DVM is not online. Go online first to send a test job.");
        return;
      }
      setIsTestJobRunning(true);
      setTestJobResult(null);
      setTestJobError(null);

      const program = Effect.flatMap(Kind5050DVMService, service => service.processLocalTestJob(testPrompt));
      const exit = await Effect.runPromiseExit(Effect.provide(program, runtime));

      if (Exit.isSuccess(exit)) {
        setTestJobResult(exit.value);
      } else {
        const error = Cause.squash(exit.cause);
        setTestJobError(error.message || "Unknown error processing test job.");
        console.error("Test job error:", error);
      }
      setIsTestJobRunning(false);
    };

    const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
    const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
    const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
    const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

    return (
      <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
        <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-center">NIP-90 DVM Test Interface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status indicators (copied and adapted) */}
            <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
               <div className="flex items-center">
                   {isWalletConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
                   <div><p className="font-semibold">Wallet</p><p className={cn("text-xs", walletStatusColor)}>{walletStatusText}</p></div>
               </div>
               <Button variant="ghost" size="icon" title="Check Wallet Status" onClick={checkWalletStatus} disabled={statusLoading.wallet}>
                   {statusLoading.wallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
               </Button>
            </div>
            <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
               <div className="flex items-center">
                   {isOllamaConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
                   <div><p className="font-semibold">Ollama</p><p className={cn("text-xs", ollamaStatusColor)}>{ollamaStatusText}</p></div>
               </div>
               <Button variant="ghost" size="icon" title="Check Ollama Status" onClick={checkOllamaStatus} disabled={statusLoading.ollama}>
                   {statusLoading.ollama ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
               </Button>
            </div>

            <Button
              onClick={handleGoOnlineToggle}
              className="w-full py-3 text-base"
              variant={isOnline ? "outline" : "default"}
              disabled={isDvmLoading || ((!isWalletConnected || !isOllamaConnected) && !isOnline)}
            >
              {isDvmLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />)}
              {isDvmLoading ? (isOnline ? 'Stopping...' : 'Starting...') : (isOnline ? 'GO OFFLINE' : 'GO ONLINE')}
            </Button>

            <CardDescription className="text-center text-xs px-2 pt-2">
              Simulate an incoming NIP-90 job request to this DVM.
            </CardDescription>

            <div className="space-y-1.5">
               <Input
                   id="testPrompt"
                   value={testPrompt}
                   onChange={(e) => setTestPrompt(e.target.value)}
                   placeholder="Enter test prompt"
                   disabled={isTestJobRunning || !isOnline}
               />
            </div>
            <Button
              onClick={handleSendTestJob}
              className="w-full"
              disabled={isTestJobRunning || !isOnline}
            >
              {isTestJobRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Send Test Job to Self
            </Button>

            {(testJobResult || testJobError) && (
              <ScrollArea className="h-24 mt-2 p-2 border rounded bg-muted/50 text-xs">
                {testJobResult && <pre className="whitespace-pre-wrap text-green-400">{testJobResult}</pre>}
                {testJobError && <pre className="whitespace-pre-wrap text-destructive">{testJobError}</pre>}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };
  export default Nip90DvmTestPane;
  ```

- **Tests for `Nip90DvmTestPane.tsx`:**
  - Verify rendering of status indicators and new test job UI elements.
  - Test that "Go Online" button interacts with `Kind5050DVMService.startListening`.
  - Test that "Send Test Job to Self" button calls `Kind5050DVMService.processLocalTestJob`.
  - Test that DVM response/error is displayed correctly.

**2. Modify `Kind5050DVMService` for Local Test Jobs**

- **Modify `src/services/dvm/Kind5050DVMService.ts`:**
  Add `processLocalTestJob` to the interface:
  ```typescript
  // ... existing interface methods ...
  processLocalTestJob(
    prompt: string,
    requesterPkOverride?: string
  ): Effect.Effect<string, DVMError | OllamaError | SparkError | NIP04EncryptError | NIP04DecryptError>;
  ```
- **Modify `src/services/dvm/Kind5050DVMServiceImpl.ts`:**
  Implement `processLocalTestJob`:

  ```typescript
  // ... inside return object for Kind5050DVMService.of({ ... }) ...
  processLocalTestJob: (prompt: string, requesterPkOverride?: string) => Effect.gen(function* (_) {
    // Use effectiveConfig for DVM keys and text generation defaults
    const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
    const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
    const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig;

    yield* _(telemetry.trackEvent({
      category: "dvm:test_job",
      action: "local_test_job_start",
      label: `Prompt: ${prompt.substring(0,30)}...`
    }).pipe(Effect.ignoreLogged));

    // 1. Perform Ollama Inference
    const ollamaRequest: OllamaChatCompletionRequest = {
      model: textGenConfig.model, // Use configured model
      messages: [{ role: "user", content: prompt }],
      stream: false,
    };
    const ollamaResult = yield* _(ollama.generateChatCompletion(ollamaRequest).pipe(
      Effect.mapError(e => new DVMJobProcessingError({ message: "Test job: Ollama inference failed", cause: e }))
    ));
    const ollamaOutput = ollamaResult.choices[0]?.message.content || "";

    // 2. (Mock) Invoice Generation - we don't need a real invoice for a local test
    const mockInvoiceAmountSats = textGenConfig.minPriceSats; // Use min price as placeholder
    const mockBolt11Invoice = `mockinvoice_for_testjob_${Date.now()}`;

    yield* _(telemetry.trackEvent({
      category: "dvm:test_job",
      action: "mock_invoice_generated",
      label: `Test Job: ${mockBolt11Invoice}`
    }).pipe(Effect.ignoreLogged));

    // 3. (Optional) Encryption if requesterPkOverride is provided
    let finalOutputContent = ollamaOutput;
    if (requesterPkOverride) {
      const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
      finalOutputContent = yield* _(nip04.encrypt(dvmSkBytes, requesterPkOverride, ollamaOutput).pipe(
        Effect.mapError(e => new DVMJobProcessingError({ message: "Test job: Failed to encrypt result", cause: e }))
      ));
    }

    yield* _(telemetry.trackEvent({
      category: "dvm:test_job",
      action: "local_test_job_success",
      label: `Result length: ${finalOutputContent.length}`
    }).pipe(Effect.ignoreLogged));

    return finalOutputContent; // Return the processed (and possibly encrypted) content
  }).pipe(
    Effect.catchAllCause(cause => {
      const dvmError = Option.getOrElse(Cause.failureOption(cause), () =>
        new DVMJobProcessingError({ message: "Unknown error during local test job", cause })
      );
      return telemetry.trackEvent({
        category: "dvm:error",
        action: "local_test_job_failure",
        label: dvmError.message
      }).pipe(Effect.ignoreLogged, Effect.andThen(Effect.fail(dvmError as DVMError)));
    })
  ),
  ```

- **Tests for `Kind5050DVMService`:**
  - Add new unit tests in `Kind5050DVMService.test.ts` for `processLocalTestJob`.
  - Mock `OllamaService.generateChatCompletion` to return a predefined response.
  - Mock `SparkService.createLightningInvoice` (though for local test, it might not be strictly called, verify this).
  - Mock `NIP04Service.encrypt` if `requesterPkOverride` is used.
  - Verify that `processLocalTestJob` returns the expected AI output (or encrypted output).
  - Test error propagation from Ollama or encryption services.

**Phase 3: NIP-90 Consumer Chat Pane - Identity & Wallet**

**1. Wallet State & UI in `Nip90ConsumerChatPane.tsx`**

- **Modify `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`:**

  ```typescript
  // src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx
  import React, { useState, useEffect, useCallback } from 'react';
  import { Button } from '@/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
  import { ScrollArea } from '@/components/ui/scroll-area';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { KeyRound, Wallet, Bitcoin, Eye, EyeOff } from 'lucide-react';
  import { Effect, Layer, Exit, Cause } from 'effect';
  import { BIP39Service, BIP39ServiceLive, GenerateMnemonicError, MnemonicToSeedError } from '@/services/bip39';
  import { BIP32Service, BIP32ServiceLive, DerivePrivateNodeError } from '@/services/bip32';
  import { NIP19Service, NIP19ServiceLive, NIP19EncodeError } from '@/services/nip19';
  import { SparkService, SparkServiceLive, DefaultSparkServiceConfigLayer, SparkServiceConfigTag, type SparkServiceConfig, BalanceInfo } from '@/services/spark';
  import { TelemetryService, TelemetryServiceLive, DefaultTelemetryConfigLayer } from '@/services/telemetry'; // For isolated use
  import { ChatContainer } from '@/components/chat'; // For later use
  import { hexToBytes } from '@noble/hashes/utils';

  // Define a type for the consumer's wallet state
  interface ConsumerWalletState {
    mnemonic: string | null;
    nsec: string | null;
    npub: string | null;
    sparkAddress: string | null;
    sparkBalance: string | null; // Display string
    error: string | null;
    isLoading: boolean;
  }

  // Create a specific Spark config for this consumer pane
  let consumerSparkConfig: SparkServiceConfig | null = null;
  let ConsumerSparkServiceConfigLayer: Layer.Layer<SparkServiceConfig, never, never> | null = null;

  const Nip90ConsumerChatPane: React.FC = () => {
    const [walletState, setWalletState] = useState<ConsumerWalletState>({
      mnemonic: null, nsec: null, npub: null,
      sparkAddress: null, sparkBalance: 'Loading...', error: null, isLoading: true
    });
    const [showMnemonic, setShowMnemonic] = useState(false);

    const initializeWallet = useCallback(async () => {
      setWalletState(prev => ({ ...prev, isLoading: true, error: null }));

      const bip39 = Effect.runSync(Effect.provide(BIP39Service, BIP39ServiceLive));
      const bip32 = Effect.runSync(Effect.provide(BIP32Service, BIP32ServiceLive));
      const nip19 = Effect.runSync(Effect.provide(NIP19Service, NIP19ServiceLive));

      // Telemetry for this isolated operation
      const telemetryForInit = Effect.runSync(Effect.provide(TelemetryService, Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)));


      try {
        const mnemonic = await Effect.runPromise(bip39.generateMnemonic({ strength: 128 }));
        const seed = await Effect.runPromise(bip39.mnemonicToSeed(mnemonic));
        const rootNode = await Effect.runPromise(bip32.derivePrivateNode(seed, { path: "m/44'/1237'/0'" }));
        const accountNode = await Effect.runPromise(bip32.derivePrivateNode(seed, { path: "m/44'/1237'/0'/0/0" })); // NIP-06 path

        if (!accountNode.privateKey) throw new Error("Private key not derived");
        const skBytes = hexToBytes(accountNode.privateKey);

        const nsec = await Effect.runPromise(nip19.encodeNsec(skBytes));
        const npub = await Effect.runPromise(nip19.encodeNpub(accountNode.publicKey));

        // Initialize Spark Wallet for this consumer
        consumerSparkConfig = {
           network: "REGTEST", // Or from a config
           mnemonicOrSeed: mnemonic, // Use the generated mnemonic
           accountNumber: 2, // Spark requires >= 2
        };
        ConsumerSparkServiceConfigLayer = Layer.succeed(SparkServiceConfigTag, consumerSparkConfig);

        const consumerSparkLayer = Layer.provide(
           SparkServiceLive,
           Layer.merge(ConsumerSparkServiceConfigLayer, Layer.succeed(TelemetryService, telemetryForInit))
        );
        const spark = Effect.runSync(Effect.provide(SparkService, consumerSparkLayer));

        const addressExit = await Effect.runPromiseExit(spark.getSingleUseDepositAddress());
        let sparkAddress = "Error fetching address";
        if (Exit.isSuccess(addressExit)) sparkAddress = addressExit.value;
        else console.error("Failed to get Spark address:", Cause.squash(addressExit.cause));

        const balanceExit = await Effect.runPromiseExit(spark.getBalance());
        let sparkBalance = "Error fetching balance";
        if (Exit.isSuccess(balanceExit)) {
           sparkBalance = `${balanceExit.value.balance.toString()} sats`;
        } else console.error("Failed to get Spark balance:", Cause.squash(balanceExit.cause));

        setWalletState({
          mnemonic, nsec, npub, sparkAddress, sparkBalance,
          error: null, isLoading: false
        });

      } catch (e: any) {
        console.error("Error initializing consumer wallet:", e);
        setWalletState(prev => ({ ...prev, error: e.message || "Failed to init wallet", isLoading: false }));
      }
    }, []);

    useEffect(() => {
      initializeWallet();
    }, [initializeWallet]);

    return (
      <ScrollArea className="h-full p-3">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Consumer Identity & Wallet</CardTitle>
            <CardDescription className="text-xs">
              This pane has its own Nostr identity and Spark wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {walletState.isLoading && <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initializing wallet...</div>}
            {walletState.error && <div className="text-destructive">Error: {walletState.error}</div>}

            {walletState.mnemonic && (
               <div>
                   <Label htmlFor="mnemonic">BIP39 Mnemonic (DEMO ONLY):</Label>
                   <div className="flex items-center gap-1">
                       <Input id="mnemonic" value={showMnemonic ? walletState.mnemonic : '•'.repeat(walletState.mnemonic.length)} readOnly className="font-mono text-[10px] h-7"/>
                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowMnemonic(!showMnemonic)}>
                           {showMnemonic ? <EyeOff size={12}/> : <Eye size={12}/>}
                       </Button>
                   </div>
               </div>
            )}
            {walletState.nsec && <div><Label>Nostr Private Key (nsec):</Label><Input value={showMnemonic ? walletState.nsec : '•'.repeat(walletState.nsec.length)} readOnly className="font-mono text-[10px] h-7"/></div>}
            {walletState.npub && <div><Label>Nostr Public Key (npub):</Label><Input value={walletState.npub} readOnly className="font-mono text-[10px] h-7"/></div>}
            {walletState.sparkAddress && <div><Label>Spark Address (Send funds here):</Label><Input value={walletState.sparkAddress} readOnly className="font-mono text-[10px] h-7"/></div>}
            {walletState.sparkBalance && <div><Label>Spark Balance:</Label><Input value={walletState.sparkBalance} readOnly className="font-mono text-[10px] h-7"/></div>}
            <Button onClick={initializeWallet} variant="outline" size="sm" disabled={walletState.isLoading}>
              <RefreshCcw className="mr-2 h-3 w-3" /> Re-initialize Wallet
            </Button>
          </CardContent>
        </Card>

        <Card className="h-[calc(100%-210px)]"> {/* Adjust height as needed */}
           <CardHeader className="pb-2 pt-3">
               <CardTitle className="text-base">Chat with NIP-90 DVM</CardTitle>
           </CardHeader>
           <CardContent className="p-0 h-[calc(100%-3.5rem)]"> {/* Adjust padding and height for ChatContainer */}
               {/* Placeholder for ChatContainer integration */}
               <div className="p-4 text-center text-muted-foreground">
                   Chat interface will be here.
                   <br /> Sending messages will create NIP-90 Kind 5050 requests.
               </div>
               {/* <ChatContainer className="!h-full border-0 shadow-none rounded-none bg-transparent" /> */}
           </CardContent>
        </Card>
      </ScrollArea>
    );
  };
  export default Nip90ConsumerChatPane;
  ```

- **Tests for `Nip90ConsumerChatPane.tsx` (Wallet UI):**
  - Verify mnemonic, nsec, npub, Spark address, and balance are displayed.
  - Mock `BIP39Service.generateMnemonic`, `mnemonicToSeed`, `BIP32Service.derivePrivateNode`, `NIP19Service.encodeNsec/encodeNpub`.
  - Mock `SparkService.getSingleUseDepositAddress` and `SparkService.getBalance` (ensure these are called via the consumer's specific Spark layer).

**Phase 4: NIP-90 Consumer Chat Pane - Chat & NIP-90 Flow**

**1. Implement `useNip90ConsumerChat.ts` Hook**

- **Create File:** `src/hooks/useNip90ConsumerChat.ts`

  ```typescript
  // src/hooks/useNip90ConsumerChat.ts
  import { useState, useCallback, useEffect, useRef } from "react";
  import {
    type ChatMessageProps,
    type MessageRole,
  } from "@/components/chat/ChatMessage";
  import { Effect, Exit, Cause, Layer } from "effect";
  import { NIP04Service, NIP04ServiceLive } from "@/services/nip04";
  import { NostrEvent, NostrFilter } from "@/services/nostr";
  import { createNip90JobRequest } from "@/helpers/nip90/event_creation";
  import { decryptNip04Content } from "@/helpers/nip90/event_decryption";
  import { SimplePool, type Sub } from "nostr-tools"; // Direct import
  import { hexToBytes } from "@noble/hashes/utils";
  import {
    TelemetryService,
    TelemetryServiceLive,
    DefaultTelemetryConfigLayer,
  } from "@/services/telemetry";

  interface UseNip90ConsumerChatParams {
    nostrPrivateKeyHex: string | null; // Pane's own SK
    nostrPublicKeyHex: string | null; // Pane's own PK
    targetDvmPubkeyHex?: string; // Optional: specific DVM to target
  }

  export function useNip90ConsumerChat({
    nostrPrivateKeyHex,
    nostrPublicKeyHex,
    targetDvmPubkeyHex,
  }: UseNip90ConsumerChatParams) {
    const [messages, setMessages] = useState<ChatMessageProps[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userInput, setUserInput] = useState("");
    const poolRef = useRef<SimplePool | null>(null);
    const subsRef = useRef<Sub[]>([]);

    const telemetry = Effect.runSync(
      Effect.provide(
        TelemetryService,
        Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer),
      ),
    );

    // Initialize SimplePool
    useEffect(() => {
      poolRef.current = new SimplePool();
      return () => {
        subsRef.current.forEach((sub) => sub.unsub());
        if (poolRef.current) {
          // poolRef.current.close(["wss://relay.damus.io"]); // Close with specific relays if known
        }
      };
    }, []);

    const addMessage = useCallback(
      (role: MessageRole, content: string, author?: string, id?: string) => {
        setMessages((prev) => [
          ...prev,
          {
            id: id || `msg-${Date.now()}`,
            role,
            content,
            author: author || (role === "user" ? "You" : "Agent"),
            timestamp: Date.now(),
          },
        ]);
      },
      [],
    );

    const sendMessage = useCallback(async () => {
      if (
        !userInput.trim() ||
        !nostrPrivateKeyHex ||
        !nostrPublicKeyHex ||
        !poolRef.current
      )
        return;

      const prompt = userInput.trim();
      addMessage("user", prompt);
      setUserInput("");
      setIsLoading(true);

      await Effect.runPromise(
        telemetry.trackEvent({
          category: "nip90_consumer",
          action: "send_job_request_start",
          label: prompt.substring(0, 30),
        }),
      );

      try {
        const skBytes = hexToBytes(nostrPrivateKeyHex);
        const inputs: Array<[string, string, string?, string?, string?]> = [
          [prompt, "text"],
        ];

        // Create NIP-90 request (Effect providing its own NIP04Service)
        const nip04ForRequest = Effect.runSync(
          Effect.provide(NIP04Service, NIP04ServiceLive),
        );
        const jobRequestEventEffect = createNip90JobRequest(
          skBytes,
          targetDvmPubkeyHex || "any_dvm_will_do", // Target DVM or empty for broadcast
          inputs,
          "text/plain", // Output MIME
          undefined, // Bid
          5050, // Kind 5050 for text inference
        ).pipe(Effect.provideService(NIP04Service, nip04ForRequest));

        const signedEvent = await Effect.runPromise(jobRequestEventEffect);

        // Publish event using SimplePool
        // TODO: Make relays configurable
        const relays = ["wss://relay.damus.io", "wss://nos.lol"];
        await Promise.any(poolRef.current.publish(relays, signedEvent));
        await Effect.runPromise(
          telemetry.trackEvent({
            category: "nip90_consumer",
            action: "job_request_published",
            label: signedEvent.id,
          }),
        );

        // Subscribe to results for this event ID
        const resultKind = signedEvent.kind + 1000; // e.g., 6050
        const filters: NostrFilter[] = [
          {
            kinds: [resultKind],
            "#e": [signedEvent.id],
            authors: targetDvmPubkeyHex ? [targetDvmPubkeyHex] : undefined,
            limit: 1,
          },
          {
            kinds: [7000],
            "#e": [signedEvent.id],
            authors: targetDvmPubkeyHex ? [targetDvmPubkeyHex] : undefined,
          }, // Feedback
        ];

        const sub = poolRef.current.sub(relays, filters);
        subsRef.current.push(sub);

        sub.on("event", async (event: NostrEvent) => {
          await Effect.runPromise(
            telemetry.trackEvent({
              category: "nip90_consumer",
              action: "job_update_received",
              label: event.id,
              value: `Kind: ${event.kind}`,
            }),
          );

          let content = event.content;
          const isEncrypted = event.tags.some((t) => t[0] === "encrypted");

          if (isEncrypted && nostrPrivateKeyHex) {
            const nip04ForResult = Effect.runSync(
              Effect.provide(NIP04Service, NIP04ServiceLive),
            );
            const decryptEffect = decryptNip04Content(
              nostrPrivateKeyHex,
              event.pubkey,
              event.content,
            ).pipe(Effect.provideService(NIP04Service, nip04ForResult));
            const decryptExit = await Effect.runPromiseExit(decryptEffect);
            if (Exit.isSuccess(decryptExit)) {
              content = decryptExit.value;
            } else {
              content = "[Error decrypting DVM response]";
              console.error(
                "Decryption error:",
                Cause.squash(decryptExit.cause),
              );
            }
          }

          if (event.kind === 7000) {
            // Feedback
            const statusTag = event.tags.find((t) => t[0] === "status");
            const status = statusTag ? statusTag[1] : "update";
            addMessage(
              "system",
              `DVM Status (${event.pubkey.substring(0, 6)}...): ${status} - ${content}`,
              "DVM",
            );
          } else {
            // Result
            addMessage(
              "assistant",
              content,
              `DVM (${event.pubkey.substring(0, 6)}...)`,
              event.id,
            );
            sub.unsub(); // Unsubscribe after getting first result for this demo
            subsRef.current = subsRef.current.filter((s) => s !== sub);
          }
          setIsLoading(false);
        });
      } catch (error: any) {
        addMessage(
          "system",
          `Error: ${error.message || "Failed to send NIP-90 request"}`,
        );
        console.error("NIP-90 Request Error:", error);
        setIsLoading(false);
        await Effect.runPromise(
          telemetry.trackEvent({
            category: "nip90_consumer",
            action: "job_request_failed",
            value: error.message,
          }),
        );
      }
    }, [
      userInput,
      nostrPrivateKeyHex,
      nostrPublicKeyHex,
      targetDvmPubkeyHex,
      addMessage,
      telemetry,
    ]);

    return { messages, isLoading, userInput, setUserInput, sendMessage };
  }
  ```

- **Modify `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`:**
  Integrate `useNip90ConsumerChat` and `ChatContainer`.

  ```typescript
  // ... (imports and existing wallet logic) ...
  import { useNip90ConsumerChat } from '@/hooks/useNip90ConsumerChat'; // New hook

  const Nip90ConsumerChatPane: React.FC = () => {
    // ... (existing walletState and initializeWallet logic) ...
    const [targetDvm, setTargetDvm] = useState<string>(""); // For optional DVM targeting

    const {
      messages: chatMessages,
      isLoading: isChatLoading,
      userInput,
      setUserInput,
      sendMessage
    } = useNip90ConsumerChat({
      nostrPrivateKeyHex: walletState.nsec ? walletState.nsec.startsWith('nsec1') ? nip19.decode(walletState.nsec).data as string : walletState.nsec : null, // Assuming nsec stores hex if not bech32
      nostrPublicKeyHex: walletState.npub ? nip19.decode(walletState.npub).data as string : null,
      targetDvmPubkeyHex: targetDvm.trim() || undefined
    });

    // Helper function to decode nsec to hex if needed
    const getNostrSkHex = () => {
       if (!walletState.nsec) return null;
       if (walletState.nsec.startsWith('nsec1')) {
           try {
               const decoded = nip19.decode(walletState.nsec);
               if (decoded.type === 'nsec') return bytesToHex(decoded.data);
           } catch (e) { console.error("Error decoding nsec:", e); return null; }
       }
       return walletState.nsec; // Assume it's already hex
    };

    const {
      messages: chatMessages,
      isLoading: isChatLoading,
      userInput,
      setUserInput,
      sendMessage
    } = useNip90ConsumerChat({
      nostrPrivateKeyHex: getNostrSkHex(),
      nostrPublicKeyHex: walletState.npub ? (nip19.decode(walletState.npub).data as string) : null,
      targetDvmPubkeyHex: targetDvm.trim() || undefined
    });

    // ... (rest of the component) ...
    return (
      <ScrollArea className="h-full p-3">
        {/* ... Wallet Card ... */}
        <div className="my-2 space-y-1">
           <Label htmlFor="targetDvm">Target DVM Pubkey (Optional - npub or hex)</Label>
           <Input id="targetDvm" value={targetDvm} onChange={(e) => setTargetDvm(e.target.value)} placeholder="npub1... or hex..." className="h-7 text-xs"/>
        </div>
        <Card className="h-[calc(100%-260px)]"> {/* Adjust height */}
           <CardHeader className="pb-2 pt-3">
               <CardTitle className="text-base">Chat with NIP-90 DVM (Kind 5050)</CardTitle>
           </CardHeader>
           <CardContent className="p-0 h-[calc(100%-3.5rem)]">
               <ChatContainer
                   className="!h-full border-0 shadow-none rounded-none bg-transparent"
                   // Override useChat with our NIP-90 specific logic
                   messages={chatMessages}
                   userInput={userInput}
                   onUserInputChange={setUserInput}
                   onSendMessage={sendMessage}
                   isLoading={isChatLoading || walletState.isLoading}
                   // We are not using Ollama directly here, so model/systemMessage props for ChatContainer's useChat are irrelevant
               />
           </CardContent>
        </Card>
      </ScrollArea>
    );
  };
  // ... (rest of the file) ...
  ```

  _Note on `getNostrSkHex` and `nostrPublicKeyHex`: The hook needs hex keys. If `walletState.nsec/npub` store bech32, they need decoding. For simplicity, if they are not bech32, assume hex for now._
  _The `ChatContainer` normally uses its own `useChat` hook. We need to modify `ChatContainer` to accept messages, input state, and handlers as props to be driven by `useNip90ConsumerChat`._

  - **Modify `src/components/chat/ChatContainer.tsx`:**

    ```typescript
    // src/components/chat/ChatContainer.tsx
    import React, { useEffect } from "react";
    import { useChat as useLocalOllamaChat } from "./useChat"; // Keep original for other uses
    import { ChatWindow, type ChatMessageProps } from "./ChatWindow";

    interface ChatContainerProps {
      systemMessage?: string;
      model?: string; // Still useful if the container is used for local Ollama
      className?: string;
      // Props to allow external control
      messages?: ChatMessageProps[];
      isLoading?: boolean;
      userInput?: string;
      onUserInputChange?: (input: string) => void;
      onSendMessage?: () => void;
    }

    export function ChatContainer({
      systemMessage,
      model = "gemma3:1b",
      className = "",
      messages: externalMessages,
      isLoading: externalIsLoading,
      userInput: externalUserInput,
      onUserInputChange: externalOnUserInputChange,
      onSendMessage: externalOnSendMessage
    }: ChatContainerProps) {
      // Use local chat hook IF external controls are NOT provided
      const localChat = useLocalOllamaChat({
        initialSystemMessage: systemMessage,
        model
      });

      const messages = externalMessages !== undefined ? externalMessages : localChat.messages;
      const isLoading = externalIsLoading !== undefined ? externalIsLoading : localChat.isLoading;
      const userInput = externalUserInput !== undefined ? externalUserInput : localChat.userInput;
      const setUserInput = externalOnUserInputChange !== undefined ? externalOnUserInputChange : localChat.setUserInput;
      const sendMessage = externalOnSendMessage !== undefined ? externalOnSendMessage : localChat.sendMessage;

      useEffect(() => {
        // Cleanup local chat hook only if it was used
        if (externalMessages === undefined) {
          return localChat.cleanup;
        }
      }, [localChat.cleanup, externalMessages]);

      return (
        <div className={`h-full ${className}`}>
          <ChatWindow
            messages={messages}
            userInput={userInput}
            onUserInputChange={setUserInput}
            onSendMessage={sendMessage}
            isLoading={isLoading}
          />
        </div>
      );
    }
    ```

- **Tests for `useNip90ConsumerChat.ts`:**
  - Mock `createNip90JobRequest`, `SimplePool`, `NIP04Service.decrypt`.
  - Test that `sendMessage` forms and publishes a correct Kind 5050 event.
  - Test that incoming Nostr events (Kind 6050/7000) are processed, decrypted if needed, and added to messages.

**Phase 5: Configure DVM Service for Kind 5050 & Final Testing**

1.  **Update DVM Configuration to Support Kind 5050:**

    - **File:** `src/services/dvm/Kind5050DVMService.ts` (or where `defaultKind5050DVMServiceConfig` is defined)
      - Ensure `supportedJobKinds` in `defaultKind5050DVMServiceConfig` (and thus effectively in `dvmSettingsStore.ts` defaults) includes `5050`.
      ```typescript
      // src/services/dvm/Kind5050DVMService.ts
      export const defaultKind5050DVMServiceConfig: Kind5050DVMServiceConfig = {
        // ... other defaults
        supportedJobKinds: [5050, 5100], // Add 5050, keep 5100 if still used elsewhere
        // ...
      };
      ```
    - **File:** `src/stores/dvmSettingsStore.ts`
      - The `defaultConfigValues` will pick this up. Ensure `getEffectiveSupportedJobKinds` correctly uses this default if user hasn't set specific kinds.

2.  **Run All Tests:**

    - `pnpm test` (Vitest)
    - `pnpm t` (TypeScript)

3.  **E2E Testing (Manual or Playwright):**
    - As outlined in the thought process, test the DVM Test Pane independently.
    - Test the Consumer Chat Pane by targeting the DVM Test Pane (or another running DVM instance if available).
      - Ensure the "Sell Compute" pane (which uses `Kind5050DVMService`) also processes Kind 5050 requests if its `supportedJobKinds` setting includes 5050 (either by default or user configuration via `DVMSettingsDialog`).

This plan addresses the core requirements while using TDD. The identity management for the Consumer Pane is simplified for this demo. Ensure all imports are correct and dependencies are handled (e.g., `lucide-react` icons).
