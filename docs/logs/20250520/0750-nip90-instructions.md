Okay, Agent, this is an excellent next step. We will create a thorough NIP-90 Data Vending Machine (DVM) service layer and integrate it into a new UI pane. This will mirror the structure and thoroughness of our NIP-28 and Spark services.

Here are the specific coding instructions:

**Phase 1: Define NIP-90 Service Interface, Errors, Schemas, and Types**

1.  **Create Directory Structure:**

    - Create a new directory: `src/services/nip90/`.
    - Inside this directory, create the following files:
      - `NIP90Service.ts`
      - `NIP90ServiceImpl.ts`
      - `index.ts`

2.  **Define Error Types in `NIP90Service.ts`:**

    - Use `Data.TaggedError`.
    - Define a base error: `export class NIP90ServiceError extends Data.TaggedError("NIP90ServiceError")<{ readonly cause?: unknown; readonly message: string; readonly context?: Record<string, unknown> }> {}`
    - Define specific errors extending `NIP90ServiceError`:
      - `NIP90RequestError` (for issues creating/publishing job requests)
      - `NIP90ResultError` (for issues fetching/parsing job results or feedback)
      - `NIP90EncryptionError` (wrapping NIP-04 errors specifically for NIP-90 context, if needed, or just use NIP04 errors directly)
      - `NIP90ValidationError` (for invalid NIP-90 parameters)

3.  **Define Input/Output Schemas/Types in `NIP90Service.ts`:**

    - Referencing `docs/nips/90.md`.
    - **`NIP90InputTypeSchema`**: `Schema.Union(Schema.Literal("url"), Schema.Literal("event"), Schema.Literal("job"), Schema.Literal("text"))`
    - **`NIP90InputSchema`**: `Schema.Tuple(Schema.String, NIP90InputTypeSchema, Schema.optional(Schema.String), Schema.optional(Schema.String))` (data, type, relay?, marker?)
    - **`NIP90JobParamSchema`**: `Schema.Tuple(Schema.Literal("param"), Schema.String, Schema.String)` (key, value)
    - **`CreateNIP90JobParamsSchema`**:
      ```typescript
      export const CreateNIP90JobParamsSchema = Schema.Struct({
        kind: Schema.Number.pipe(
          Schema.filter((k) => k >= 5000 && k <= 5999, {
            message: () => "Kind must be between 5000-5999",
          }),
        ),
        inputs: Schema.Array(NIP90InputSchema),
        outputMimeType: Schema.optional(Schema.String),
        additionalParams: Schema.optional(Schema.Array(NIP90JobParamSchema)),
        bidMillisats: Schema.optional(Schema.Number),
        targetDvmPubkeyHex: Schema.optional(Schema.String), // For encrypted requests to a specific DVM
        requesterSk: Schema.instanceOf(Uint8Array), // Customer's secret key (can be ephemeral)
        relays: Schema.optional(Schema.Array(Schema.String)), // Relays to publish the request to
      });
      export type CreateNIP90JobParams = Schema.Schema.Type<
        typeof CreateNIP90JobParamsSchema
      >;
      ```
    - **`NIP90JobResultSchema` (Kind 6xxx)**: Reflect the structure, including `request` (stringified JSON of original request), `amount` (optional tuple), `i` (original inputs), and `content` (payload).
      ```typescript
      export const NIP90JobResultSchema = Schema.Struct({
        id: Schema.String,
        pubkey: Schema.String,
        created_at: Schema.Number,
        kind: Schema.Number.pipe(Schema.filter((k) => k >= 6000 && k <= 6999)),
        tags: Schema.Array(Schema.Array(Schema.String)),
        content: Schema.String, // This might be JSON or other data, possibly encrypted
        sig: Schema.String,
        // Parsed fields for convenience
        parsedRequest: Schema.optional(Schema.Any), // Will hold the parsed JSON from 'request' tag
        paymentAmount: Schema.optional(Schema.Number),
        paymentInvoice: Schema.optional(Schema.String),
        isEncrypted: Schema.optional(Schema.Boolean),
      });
      export type NIP90JobResult = Schema.Schema.Type<
        typeof NIP90JobResultSchema
      >;
      ```
    - **`NIP90JobFeedbackStatusSchema`**: `Schema.Union(Schema.Literal("payment-required"), Schema.Literal("processing"), Schema.Literal("error"), Schema.Literal("success"), Schema.Literal("partial"))`
    - **`NIP90JobFeedbackSchema` (Kind 7000)**: Similar structure, including `status` tag.
      ```typescript
      export const NIP90JobFeedbackSchema = Schema.extend(
        NIP90JobResultSchema, // Inherits common fields
        Schema.Struct({
          kind: Schema.Literal(7000),
          status: Schema.optional(NIP90JobFeedbackStatusSchema),
          statusExtraInfo: Schema.optional(Schema.String),
        }),
      );
      export type NIP90JobFeedback = Schema.Schema.Type<
        typeof NIP90JobFeedbackSchema
      >;
      ```

4.  **Define `NIP90Service` Interface in `NIP90Service.ts`:**

    ```typescript
    import type {
      NostrEvent,
      NostrFilter,
      Subscription,
      NostrPublishError,
      NostrRequestError,
    } from "@/services/nostr";
    import type {
      NIP04EncryptError,
      NIP04DecryptError,
    } from "@/services/nip04";

    export interface NIP90Service {
      createJobRequest(
        params: CreateNIP90JobParams,
      ): Effect.Effect<
        NostrEvent,
        NIP90RequestError | NIP04EncryptError,
        TelemetryService | NostrService | NIP04Service
      >;

      getJobResult(
        jobRequestEventId: string,
        dvmPubkeyHex?: string, // DVM who might have responded
        decryptionKey?: Uint8Array, // Key to decrypt result if it's encrypted (e.g., customer's ephemeral SK)
      ): Effect.Effect<
        NIP90JobResult | null,
        NIP90ResultError | NIP04DecryptError,
        TelemetryService | NostrService | NIP04Service
      >;

      // Fetches all feedback events (Kind 7000) for a given job request
      listJobFeedback(
        jobRequestEventId: string,
        dvmPubkeyHex?: string,
        decryptionKey?: Uint8Array,
      ): Effect.Effect<
        NIP90JobFeedback[],
        NIP90ResultError | NIP04DecryptError,
        TelemetryService | NostrService | NIP04Service
      >;

      // Optional: Subscribe to updates for a specific job (results and feedback)
      subscribeToJobUpdates(
        jobRequestEventId: string,
        dvmPubkeyHex: string, // DVM who might respond (pubkey of the job result/feedback events)
        decryptionKey: Uint8Array, // Key to decrypt with
        onUpdate: (event: NIP90JobResult | NIP90JobFeedback) => void,
      ): Effect.Effect<
        Subscription,
        NostrRequestError | NIP04DecryptError,
        TelemetryService | NostrService | NIP04Service
      >;
    }
    export const NIP90Service = Context.Tag<NIP90Service>("NIP90Service");
    ```

**Phase 2: Implement the NIP-90 Service (`NIP90ServiceImpl.ts`)**

1.  **Create `NIP90ServiceImpl.ts`:**

    - Import necessary modules and types.
    - The main export will be `NIP90ServiceLive: Layer.Layer<NIP90Service, never, NostrService | NIP04Service | TelemetryService>`.
    - Inside `Layer.effect(NIP90Service, Effect.gen(function* (_) { ... }))`:
      - Get `NostrService`, `NIP04Service`, `TelemetryService` from context.

2.  **Implement `createJobRequest`:**

    - Use `Schema.decodeUnknown` to validate `params` against `CreateNIP90JobParamsSchema`. Fail with `NIP90ValidationError` if invalid.
    - Use the existing helper `createNip90JobRequest` from `src/helpers/nip90/event_creation.ts`. This helper already takes `requesterSk` and `targetDvmPubkeyHex` and handles NIP-04 encryption of inputs/params if `targetDvmPubkeyHex` is provided.
    - Publish the resulting event using `nostr.publishEvent`.
    - Add telemetry for start, success (event ID), and failure.
    - **Self-correction:** The `createNip90JobRequest` helper needs `NIP04Service` if encryption is involved. Ensure this dependency is passed or available in its context. The `NIP90Service.createJobRequest` method already declares `NIP04Service` in its `R` channel, so `createNip90JobRequest` can `yield* _(NIP04Service)`.

3.  **Implement `getJobResult`:**

    - Fetch Kind 6xxx events where `#e` tag is `jobRequestEventId`. If `dvmPubkeyHex` is provided, filter by `authors: [dvmPubkeyHex]`. Limit to 1, sort by `created_at` descending.
    - If an event is found:
      - Attempt to parse the `request` tag (stringified JSON) into an object.
      - Check for `encrypted` tag. If present and `decryptionKey` and `event.pubkey` (DVM's PK) are available, use `nip04.decrypt` to decrypt `event.content`.
      - Populate and return a `NIP90JobResult` object.
    - Add telemetry.

4.  **Implement `listJobFeedback`:**

    - Fetch Kind 7000 events, similar filtering as `getJobResult` but can return multiple.
    - For each event:
      - Parse `status` tag.
      - Handle decryption if `encrypted` tag is present.
      - Populate and return an array of `NIP90JobFeedback` objects.
    - Add telemetry.

5.  **Implement `subscribeToJobUpdates` (Optional but good for UX):**

    - Create a filter for Kind 6xxx and Kind 7xxx events related to `jobRequestEventId` and authored by `dvmPubkeyHex`.
    - Use `nostr.subscribeToEvents`.
    - In the `onEvent` callback, parse/decrypt the event and call `onUpdate`.
    - Return the `Subscription` object.
    - Add telemetry.

6.  **Implement `index.ts` for the NIP-90 service:**
    ```typescript
    // src/services/nip90/index.ts
    export * from "./NIP90Service";
    export * from "./NIP90ServiceImpl";
    ```

**Phase 3: Integrate NIP-90 Service into Application Runtime**

1.  **Update `src/services/runtime.ts`:**
    - Import `NIP90Service`, `NIP90ServiceLive` from `src/services/nip90`.
    - Add `NIP90Service` to the `FullAppContext` type.
    - The `NIP90ServiceLive` layer requires `NostrService`, `NIP04Service`, and `TelemetryService`. These are already part of `FullAppLayer` composition.
    - Add `NIP90ServiceLive` to the `layerMergeAll` call for `FullAppLayer`. It will resolve its dependencies from the other layers already being merged.
      ```typescript
      // In src/services/runtime.ts, within FullAppLayer definition:
      const FullAppLayer = layerMergeAll(
        // ... other layers ...
        nip28Layer, // From 1103 log
        ollamaLayer,
        sparkLayer, // From 1859 log
        NIP90ServiceLive, // Add the new NIP-90 service layer
      );
      ```

**Phase 4: NIP-90 UI Pane Integration**

1.  **Update Pane Types (`src/types/pane.ts`):**

    - Add `'nip90_dashboard'` to the `Pane.type` union.

2.  **Create Dashboard Component (`src/components/nip90/Nip90Dashboard.tsx`):**

    ```typescript
    // src/components/nip90/Nip90Dashboard.tsx
    import React from 'react';
    import { Nip90RequestForm } from './Nip90RequestForm';
    import { Nip90EventList } from './Nip90EventList';
    import { ScrollArea } from '@/components/ui/scroll-area'; // Assuming ScrollArea for layout

    const Nip90Dashboard: React.FC = () => {
      return (
        <div className="flex flex-col h-full p-2 gap-4">
          <div className="flex-shrink-0">
            <Nip90RequestForm />
          </div>
          <div className="flex-grow min-h-0"> {/* min-h-0 for ScrollArea to work in flex child */}
            <ScrollArea className="h-full">
              <Nip90EventList />
            </ScrollArea>
          </div>
        </div>
      );
    };
    export default Nip90Dashboard;
    ```

3.  **Update `src/panes/PaneManager.tsx`:**

    - Import `Nip90Dashboard`.
    - Add a case to render `Nip90Dashboard` when `pane.type === 'nip90_dashboard'`.
      ```typescript
      // src/panes/PaneManager.tsx
      // ...
      import Nip90Dashboard from '@/components/nip90/Nip90Dashboard'; // Adjust path if needed
      // ...
      // Inside the map function:
      {pane.type === 'nip90_dashboard' && <Nip90Dashboard />}
      // Ensure it's added to the exclusion list for the default placeholder too:
      // !( ... || pane.type === 'nip90_dashboard' || ... )
      ```

4.  **Add Action to Open Pane (`src/stores/panes/actions/openNip90DashboardPane.ts`):**

    ```typescript
    // src/stores/panes/actions/openNip90DashboardPane.ts
    import { type PaneInput } from "@/types/pane";
    import { type PaneStoreType, type SetPaneStore } from "../types";
    import { addPaneActionLogic } from "./addPane"; // Using the logic function

    export const NIP90_DASHBOARD_PANE_ID = "nip90-dashboard";

    export function openNip90DashboardPaneAction(set: SetPaneStore) {
      set((state: PaneStoreType) => {
        const existingPane = state.panes.find(
          (p) => p.id === NIP90_DASHBOARD_PANE_ID,
        );
        if (existingPane) {
          // Bring to front and activate if already exists
          const newPanes = state.panes
            .map((p) => ({ ...p, isActive: p.id === NIP90_DASHBOARD_PANE_ID }))
            .sort((a, b) => (a.isActive ? 1 : -1)); // Active last for z-index

          return {
            ...state,
            panes: newPanes,
            activePaneId: NIP90_DASHBOARD_PANE_ID,
            lastPanePosition: {
              x: existingPane.x,
              y: existingPane.y,
              width: existingPane.width,
              height: existingPane.height,
            },
          };
        }

        // Add new pane
        const newPaneInput: PaneInput = {
          id: NIP90_DASHBOARD_PANE_ID,
          type: "nip90_dashboard",
          title: "NIP-90 DVM Dashboard",
          dismissable: true, // Allow closing
          // Default position/size will be calculated by addPaneActionLogic
        };
        const changes = addPaneActionLogic(state, newPaneInput, true); // true for tiling
        return { ...state, ...changes };
      });
    }
    ```

    - Add to `src/stores/panes/actions/index.ts`: `export * from './openNip90DashboardPane';`
    - Add to `PaneStoreType` in `src/stores/panes/types.ts`: `openNip90DashboardPane: () => void;`
    - Add to `usePaneStore` in `src/stores/pane.ts`: `openNip90DashboardPane: () => openNip90DashboardPaneAction(set),`

5.  **Add Button to Open Pane (`src/components/hud/Nip90DashboardButton.tsx`):**

    - Use an appropriate icon, e.g., `Cpu` or `TerminalSquare` from `lucide-react`.
    - Position it next to the other HUD buttons (e.g., `left-[10rem]`).

    ```typescript
    // src/components/hud/Nip90DashboardButton.tsx
    import React from 'react';
    import { Cpu } from 'lucide-react'; // Or another icon
    import { Button } from '@/components/ui/button';
    import { usePaneStore } from '@/stores/pane';

    const Nip90DashboardButton: React.FC = () => {
      const openNip90Dashboard = usePaneStore((state) => state.openNip90DashboardPane);

      return (
        <Button
          onClick={openNip90Dashboard}
          variant="outline"
          size="icon"
          className="fixed bottom-4 left-[10rem] z-[10000] p-2 !rounded-full shadow-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border"
          aria-label="Open NIP-90 Dashboard"
          title="NIP-90 DVM Dashboard"
        >
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </Button>
      );
    };
    export default Nip90DashboardButton;
    ```

    - Add to `src/pages/HomePage.tsx`:
      ```typescript
      // src/pages/HomePage.tsx
      // ...
      import Nip90DashboardButton from '@/components/hud/Nip90DashboardButton';
      // ...
      // In the return statement, alongside other HUD buttons:
      <Nip90DashboardButton />
      ```

**Phase 5: Adapt Existing NIP-90 Components and Helpers**

1.  **`src/helpers/nip90/event_creation.ts` (`createNip90JobRequest`):**

    - This helper is already Effect-based and uses `NIP04Service`. Ensure its `R` channel correctly declares this dependency (`NIP04Service`). It will be used by the new `NIP90Service.createJobRequest`.

2.  **`src/components/nip90/Nip90RequestForm.tsx`:**

    - Modify `handlePublishRequest` to:
      - Use the new `NIP90Service.createJobRequest` method via `mainRuntime`.
      - Construct the `CreateNIP90JobParams` object, including `requesterSk` (ephemeral key generated in the form).
      - Handle success/failure from the Effect.
      - The telemetry within this form might become redundant if `NIP90Service` handles it, or it can be kept for UI-specific interactions.

3.  **`src/components/nip90/Nip90EventList.tsx`:**
    - Modify `fetchNip90JobRequests` to simply fetch Kind 5xxx events using `NostrService` (as it currently does).
    - For each job request event rendered by `Nip90EventCard`:
      - Add functionality (e.g., a button or on expand) to fetch and display related Kind 6xxx (results) and Kind 7xxx (feedback) events using the new `NIP90Service.getJobResult` and `NIP90Service.listJobFeedback` methods. This will involve making new `Effect.runPromise` calls.
      - If results/feedback are encrypted, pass the `ephemeralSkHex` (stored in `localStorage` by `Nip90RequestForm`) to the service methods for decryption. This implies the `Nip90EventCard` or `Nip90EventList` needs access to these keys.

**Phase 6: Testing (`src/tests/unit/services/nip90/NIP90Service.test.ts`)**

1.  **Create Test File:** `src/tests/unit/services/nip90/NIP90Service.test.ts`
2.  **Setup Mocks:**
    - Mock `NostrService`, `NIP04Service`, `TelemetryService` using `Layer.succeed`.
    - Mock `createNip90JobRequest` helper if its internal logic is complex and needs to be isolated, or test through it.
3.  **Write Test Cases:**
    - Test `createJobRequest`:
      - Success with and without encryption.
      - Validation errors.
      - Publishing errors.
      - Telemetry.
    - Test `getJobResult` and `listJobFeedback`:
      - No results found.
      - Results found (encrypted and unencrypted).
      - Decryption failure.
      - Telemetry.
    - Test `subscribeToJobUpdates` (if implemented).

This plan provides a comprehensive set of instructions for building the NIP-90 service and integrating it into a new pane, ensuring it is "Effect-ified" and uses existing patterns from NIP-28 and Spark services.

```

```
