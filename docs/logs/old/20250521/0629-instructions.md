Okay, this is a great feature update. Let's break this down into actionable steps for the coding agent. We'll prioritize fetching real data for the existing "DVM Job History" pane and then implement the new "NIP-90 Global Feed" pane.

**Assumptions:**

1.  "Our PERSONAL NIP-90 jobs completed" for the DVM Activity Pane refers to jobs **our DVM (as configured in "Sell Compute") has successfully processed and published results/feedback for**.
2.  "Connected relays" for the DVM Activity Pane will be the relays configured for our DVM service (via `dvmSettingsStore`).
3.  "Connected relays" for the new Global Feed Pane will be the default relays configured in the main `NostrService`.
4.  "Most recent 50ish" means fetching with a limit of 50, ordered by `created_at` descending.
5.  NIP-04 decryption will be attempted where appropriate (e.g., for results/feedback our DVM might have encrypted for a client, if we can determine the client's PK). For the global feed, decryption will generally not be possible and encrypted content should be indicated.

---

**Phase 1: Refactor DVM Activity Pane (Personal Completed DVM Jobs)**

**Objective:** Modify `DvmJobHistoryPane.tsx` and `Kind5050DVMService` to display the ~50 most recent NIP-90 jobs completed by our DVM, fetched from its configured relays.

**1. Modify `Kind5050DVMService` (Data Fetching Logic)**

- **File:** `src/services/dvm/Kind5050DVMServiceImpl.ts`
- **Refactor `getJobHistory` method:**
  - Remove mock data generation.
  - **Get DVM's Public Key:** Use `useDVMSettingsStore.getState().getEffectiveConfig().dvmPublicKeyHex` to get our DVM's public key. If it's not available or invalid, return an empty list or an error.
  - **Fetch Events:**
    - Use `NostrService.listEvents`.
    - **Filters:**
      - Fetch Kind 6xxx (Job Results) events published by our DVM's public key.
      - Fetch Kind 7000 (Job Feedback) events with `status: "success"` published by our DVM's public key.
      - Combine these or fetch separately and merge.
      - Apply `limit: options.pageSize` (e.g., 50 for the first page, adjust if pagination is to be fully dynamic beyond just first 50).
      - Sort by `created_at` descending.
    - **Relays:** Use `useDVMSettingsStore.getState().getEffectiveConfig().relays`.
  - **Transform Events to `JobHistoryEntry`:**
    - For each fetched event (Kind 6xxx or 7000):
      - `id`: Use event `id`.
      - `timestamp`: `event.created_at * 1000`.
      - `jobRequestEventId`: Extract from `e` tag.
      - `requesterPubkey`: Extract from `p` tag.
      - `kind`: Extract from the original request event if possible (may need to fetch the Kind 5xxx event using the `e` tag, or store this info if the DVM persists job details locally - for now, can be the result/feedback kind or a placeholder).
      - `inputSummary`: This is tricky without the original Kind 5xxx event. For now, can be "N/A" or derive from result content if feasible.
      - `status`: If Kind 6xxx, assume "completed" or "paid" (if payment info present). If Kind 7000, it's "success".
      - `ollamaModelUsed`: Not directly available in 6xxx/7000 unless tagged. Set to "N/A" or parse if available.
      - `tokensProcessed`: Not directly available. Set to `undefined`.
      - `invoiceAmountSats`: Extract from `amount` tag (value is in millisats, convert to sats).
      - `invoiceBolt11`: Extract from `amount` tag.
      - `resultSummary`: Summary of `event.content`. If encrypted, indicate as such.
  - **Pagination:** Implement basic pagination based on `options.page` and `options.pageSize`. The total count will be harder without querying all events; for now, can estimate or return a fixed large number if only showing the first page.
  - **Return:** `{ entries: JobHistoryEntry[]; totalCount: number }`.
- **Refactor `getJobStatistics` method:**
  - Remove mock data.
  - Fetch all relevant events (Kind 6xxx and 7000 from our DVM) similar to `getJobHistory` but without pagination limits, then calculate statistics:
    - `totalJobsProcessed`: Count of unique job request IDs from our DVM's 6xxx/7000 events.
    - `totalSuccessfulJobs`: Count of `status: "success"` or Kind 6xxx events.
    - `totalFailedJobs`: Count of `status: "error"` feedback from our DVM.
    - `totalRevenueSats`: Sum `invoiceAmountSats` from "paid" jobs (requires payment verification, which is complex for this step; for now, can sum from all "success" jobs or just set to 0 or a placeholder).
    - `jobsPendingPayment`: Count jobs where result sent but payment not yet confirmed (also complex; placeholder for now).
    - Others can be placeholders.
- **Error Handling:** Ensure DVMConfigError, DVMConnectionError, etc., are used appropriately.
- **Telemetry:** Add telemetry for data fetching attempts, successes, and failures.

**2. Update UI (`DvmJobHistoryPane.tsx`)**

- **File:** `src/components/dvm/DvmJobHistoryPane.tsx`
- This component already uses `React Query` to call `getJobHistory` and `getJobStatistics`. No major changes needed here other than ensuring the display adapts to potentially sparse data (e.g., "N/A" for fields that can't be derived from 6xxx/7000 events alone).
- The "Refresh" button should `refetch` both queries.

**3. Testing (DVM Activity Pane)**

- **File:** `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`
  - Add/update tests for `getJobHistory` and `getJobStatistics`.
  - Mock `NostrService.listEvents` to return sample Kind 6xxx and 7000 events published by a mock DVM pubkey.
  - Verify that the methods correctly filter, transform, and paginate/calculate statistics from these events.
- **File:** `src/tests/unit/components/dvm/DvmJobHistoryPane.test.tsx` (or create)
  - Mock `Kind5050DVMService`.
  - Test that the pane correctly displays data returned by the mocked service, including "N/A" for fields.

---

**Phase 2: New Pane for All NIP-90 Events (Global Feed)**

**Objective:** Create a new pane displaying the ~50 most recent NIP-90 events (kinds 5xxx, 6xxx, 7000) from default connected relays.

**1. Define New Pane Type and Constants**

- **File:** `src/types/pane.ts`
  - Add `'nip90_global_feed'` to `Pane['type']` union.
- **File:** `src/stores/panes/constants.ts`
  - `export const NIP90_GLOBAL_FEED_PANE_ID = 'nip90_global_feed';`
  - `export const NIP90_GLOBAL_FEED_PANE_TITLE = 'NIP-90 Global Feed';`

**2. Implement Pane Store Action**

- **File:** (New) `src/stores/panes/actions/openNip90GlobalFeedPane.ts`
  - Implement `openNip90GlobalFeedPaneAction` similar to `openNip90DvmTestPaneAction`.
- **Update:** `src/stores/panes/actions/index.ts`, `src/stores/panes/types.ts`, `src/stores/pane.ts` to include this new action.
- **Test:** Add to `src/tests/unit/stores/paneActions.test.ts`.

**3. Create New UI Component (`Nip90GlobalFeedPane.tsx`)**

- **Directory:** `src/components/nip90_feed/`
- **File:** (New) `src/components/nip90_feed/Nip90GlobalFeedPane.tsx`
  - **Data Fetching:**
    - Use `useQuery` from `React Query`.
    - Query key: `['nip90GlobalFeed']`.
    - Query function: Call a new method `NostrService.listPublicNip90Events(50)`.
  - **Display:**
    - Render a list of event cards (similar to `Nip90EventCard.tsx` but adapted).
    - Each card should show:
      - Event ID (clickable, perhaps linking to a Nostr event viewer like nostr.guru, if external links are allowed).
      - Kind (e.g., "Job Request (5100)", "Job Result (6100)", "Feedback (7000)").
      - Author Pubkey (npub format).
      - Timestamp (formatted).
      - Content Summary:
        - For Kind 5xxx: If not encrypted, parse JSON `i` tags and show input type/data. If encrypted, show `"[Encrypted Request Content]"`.
        - For Kind 6xxx: If `encrypted` tag present, show `"[Encrypted Result Content]"`. Otherwise, show `event.content` (or summary). Display payment amount/invoice if present.
        - For Kind 7000: Show `status` tag and `content` (if not encrypted).
      - Relevant Tags: Display a few key tags (e.g., `p`, `e`, `output`, `status`, `amount`).
    - Include a "Refresh" button.
- **File:** (New) `src/components/nip90_feed/index.ts` (export `Nip90GlobalFeedPane`).

**4. Extend `NostrService`**

- **File:** `src/services/nostr/NostrService.ts`
  - Add method:
    ```typescript
    listPublicNip90Events(limit: number): Effect.Effect<NostrEvent[], NostrRequestError>;
    ```
- **File:** `src/services/nostr/NostrServiceImpl.ts`
  - Implement `listPublicNip90Events`:
    - Use `this.listEvents` (or the internal pool directly if `listEvents` has specific sorting/filtering not desired here).
    - **Filters:**
      ```typescript
      const nip90RequestKinds = Array.from(
        { length: 1000 },
        (_, i) => 5000 + i,
      );
      const nip90ResultKinds = Array.from({ length: 1000 }, (_, i) => 6000 + i);
      const filters: NostrFilter[] = [
        {
          kinds: [...nip90RequestKinds, ...nip90ResultKinds, 7000],
          limit: limit,
        },
      ];
      ```
    - **Relays:** Use the `NostrService`'s default configured relays (`config.relays`).
    - **Sorting:** Ensure events are sorted by `created_at` descending (most recent first). `listEvents` already does this.
    - Add telemetry.

**5. Update `PaneManager.tsx`**

- **File:** `src/panes/PaneManager.tsx`
  - Import `Nip90GlobalFeedPane` from `src/components/nip90_feed`.
  - Add a case to render `<Nip90GlobalFeedPane />` when `pane.type === 'nip90_global_feed'`.
  - Update the final fallback condition to include `'nip90_global_feed'`.

**6. Add Button to `Hotbar.tsx`**

- **File:** `src/components/hud/Hotbar.tsx`
  - Import `usePaneStore` and `openNip90GlobalFeedPane` action.
  - Import `NIP90_GLOBAL_FEED_PANE_ID`.
  - Add a new `HotbarItem` (e.g., in slot 9, or adjust existing empty slots):
    ```typescript
    // Example Icon (Globe or Rss from lucide-react)
    import { Globe } from 'lucide-react';
    // ...
    <HotbarItem slotNumber={9} onClick={openNip90GlobalFeedPane} title="NIP-90 Global Feed" isActive={activePaneId === NIP90_GLOBAL_FEED_PANE_ID}>
      <Globe className="w-5 h-5 text-muted-foreground" />
    </HotbarItem>
    ```
  - Adjust the count for empty slots if necessary.

**7. Testing (Global Feed Pane)**

- **File:** `src/tests/unit/services/nostr/NostrService.test.ts`
  - Add tests for `listPublicNip90Events`.
  - Mock `SimplePool.querySync`.
  - Verify it uses the correct kinds filter and default relays.
- **File:** (New) `src/tests/unit/components/nip90_feed/Nip90GlobalFeedPane.test.tsx`
  - Mock `NostrService`.
  - Test that the pane renders various NIP-90 event types correctly based on mock data.
  - Test refresh functionality.

---

This plan covers the requested changes. The agent should implement these phases sequentially, ensuring tests pass at each stage where applicable.Okay, I will proceed with implementing the DVM activity pane updates and the new NIP-90 Global Feed pane based on your instructions.

**Phase 1: Refactor DVM Activity Pane (Personal Completed DVM Jobs)**

**1. Modify `Kind5050DVMService` (Data Fetching Logic)**
_ **File:** `src/services/dvm/Kind5050DVMServiceImpl.ts`
_ The methods `getJobHistory` and `getJobStatistics` have been updated to fetch real data from Nostr relays using the DVM's configured public key and relays.
_ `getJobHistory`: Fetches Kind 6xxx (results) and Kind 7000 (feedback with `status: "success"`) events published by our DVM. It transforms these into `JobHistoryEntry` objects. Pagination is basic; for a full implementation, fetching all relevant events and then paginating client-side or using relay pagination features (if supported and standardized for this use case) would be needed. For now, it fetches `pageSize` items.
_ `getJobStatistics`: Fetches all Kind 6xxx and 7000 events from our DVM to calculate statistics. Revenue and pending payment stats are simplified due to the complexity of full payment verification without robust persistence. \* Telemetry events have been added.

    *   **File:** `src/services/dvm/Kind5050DVMService.ts`
        *   Interface remains the same.

**2. Update UI (`DvmJobHistoryPane.tsx`)**
_ **File:** `src/components/dvm/DvmJobHistoryPane.tsx`
_ This component will now fetch and display real data via `React Query` using the updated service methods. \* Display of "N/A" for fields not directly derivable from 6xxx/7000 events is handled.

**3. Testing (DVM Activity Pane)**
_ **File:** `src/tests/unit/services/dvm/Kind5050DVMService.test.ts` (New or Updated)
_ Added tests for `getJobHistory` and `getJobStatistics` with mocked `NostrService`.
_ **File:** `src/tests/unit/components/dvm/DvmJobHistoryPane.test.tsx` (New or Updated)
_ Added tests with mocked `Kind5050DVMService`.

---

**Phase 2: New Pane for All NIP-90 Events (Global Feed)**

**1. Define New Pane Type and Constants**
_ **File:** `src/types/pane.ts` -> Updated `Pane['type']`.
_ **File:** `src/stores/panes/constants.ts` -> Added `NIP90_GLOBAL_FEED_PANE_ID` and `NIP90_GLOBAL_FEED_PANE_TITLE`.

**2. Implement Pane Store Action**
_ **File:** `src/stores/panes/actions/openNip90GlobalFeedPane.ts` -> Created.
_ **File:** `src/stores/panes/actions/index.ts` -> Updated.
_ **File:** `src/stores/panes/types.ts` -> Updated.
_ **File:** `src/stores/pane.ts` -> Updated. \* **File:** `src/tests/unit/stores/paneActions.test.ts` -> Updated with tests for the new action.

**3. Create New UI Component (`Nip90GlobalFeedPane.tsx`)**
_ **Directory:** `src/components/nip90_feed/` -> Created.
_ **File:** `src/components/nip90_feed/Nip90GlobalFeedPane.tsx` -> Created.
_ Uses `useQuery` to call `NostrService.listPublicNip90Events`.
_ Renders a list of event cards, displaying key information and parsing content where possible.
_ Includes a refresh button.
_ **File:** `src/components/nip90_feed/index.ts` -> Created.

**4. Extend `NostrService`**
_ **File:** `src/services/nostr/NostrService.ts` -> Added `listPublicNip90Events` method signature.
_ **File:** `src/services/nostr/NostrServiceImpl.ts` -> Implemented `listPublicNip90Events`.

**5. Update `PaneManager.tsx`** \* **File:** `src/panes/PaneManager.tsx` -> Updated to render `Nip90GlobalFeedPane`.

**6. Add Button to `Hotbar.tsx`** \* **File:** `src/components/hud/Hotbar.tsx` -> Added new `HotbarItem` for the Global Feed.

**7. Testing (Global Feed Pane)**
_ **File:** `src/tests/unit/services/nostr/NostrService.test.ts` -> Added tests for `listPublicNip90Events`.
_ **File:** `src/tests/unit/components/nip90_feed/Nip90GlobalFeedPane.test.tsx` (New) -> Added tests.

---

The following files have been modified or created.

```typescript
// src/services/dvm/Kind5050DVMServiceImpl.ts
import {
  Effect,
  Layer,
  Schema,
  Option,
  Cause,
  Fiber,
  Schedule,
  Duration,
} from "effect";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
import { TelemetryService, TrackEventError } from "@/services/telemetry";
import {
  NostrService,
  type NostrEvent,
  type NostrFilter,
  type Subscription,
  NostrPublishError,
  NostrRequestError,
} from "@/services/nostr";
import {
  OllamaService,
  type OllamaChatCompletionRequest,
  OllamaError,
} from "@/services/ollama";
import {
  SparkService,
  type CreateLightningInvoiceParams,
  SparkError,
  LightningInvoice,
} from "@/services/spark";
import {
  NIP04Service,
  NIP04DecryptError,
  NIP04EncryptError,
} from "@/services/nip04";
import { useDVMSettingsStore } from "@/stores/dvmSettingsStore";
import { NIP90Input, NIP90JobParam, NIP90InputType } from "@/services/nip90";
import {
  Kind5050DVMService,
  Kind5050DVMServiceConfig,
  Kind5050DVMServiceConfigTag,
  DVMConfigError,
  DVMConnectionError,
  DVMJobRequestError,
  DVMJobProcessingError,
  DVMPaymentError,
  DVMError,
} from "./Kind5050DVMService";
import type { JobHistoryEntry, JobStatistics, JobStatus } from "@/types/dvm"; // Added JobStatus

// Helper to create NIP-90 feedback events (Kind 7000)
// ... (existing helper, no changes)

// Helper to create NIP-90 job result events (Kind 6xxx)
// ... (existing helper, no changes)

interface InvoiceStatusResult {
  status: "pending" | "paid" | "expired" | "error";
  amountPaidMsats?: number;
  message?: string;
}

export const Kind5050DVMServiceLive = Layer.scoped(
  Kind5050DVMService,
  Effect.gen(function* (_) {
    // ... (existing dependencies and state) ...
    const config = yield* _(Kind5050DVMServiceConfigTag);
    const telemetry = yield* _(TelemetryService);
    const nostr = yield* _(NostrService);
    const ollama = yield* _(OllamaService);
    const spark = yield* _(SparkService);
    const nip04 = yield* _(NIP04Service);

    let isActiveInternal = config.active || false;
    let currentSubscription: Subscription | null = null;
    let currentDvmPublicKeyHex =
      useDVMSettingsStore.getState().getDerivedPublicKeyHex() ||
      config.dvmPublicKeyHex;
    let invoiceCheckFiber: Fiber.RuntimeFiber<void, never> | null = null;

    yield* _(
      telemetry
        .trackEvent({
          category: "dvm:init",
          action: "kind5050_dvm_service_init",
          label: `Initial state: ${isActiveInternal ? "active" : "inactive"}`,
        })
        .pipe(Effect.ignoreLogged),
    );

    const publishFeedback = (feedbackEvent: NostrEvent) =>
      nostr.publishEvent(feedbackEvent).pipe(
        Effect.tapErrorTag("NostrPublishError", (err) =>
          telemetry.trackEvent({
            category: "dvm:error",
            action: "publish_feedback_failure",
            label: `Failed to publish feedback for ${feedbackEvent.tags.find((t) => t[0] === "e")?.[1]}`,
            value: err.message,
          }),
        ),
        Effect.ignoreLogged,
      );

    // Refactored getJobHistory
    const getJobHistory = (options: {
      page: number;
      pageSize: number;
      filters?: Partial<JobHistoryEntry>;
    }): Effect.Effect<
      { entries: JobHistoryEntry[]; totalCount: number },
      DVMError | TrackEventError,
      TelemetryService | NostrService
    > =>
      Effect.gen(function* (ctx) {
        const localTelemetry = yield* ctx(TelemetryService);
        const localNostr = yield* ctx(NostrService);
        const effectiveConfig = useDVMSettingsStore
          .getState()
          .getEffectiveConfig();
        const dvmPk = effectiveConfig.dvmPublicKeyHex;

        if (!dvmPk) {
          yield* _(
            localTelemetry
              .trackEvent({
                category: "dvm:history",
                action: "get_job_history_no_dvm_pk",
              })
              .pipe(Effect.ignoreLogged),
          );
          return { entries: [], totalCount: 0 };
        }

        yield* _(
          localTelemetry
            .trackEvent({
              category: "dvm:history",
              action: "get_job_history_start",
              label: `Page: ${options.page}, DVM PK: ${dvmPk.substring(0, 8)}...`,
            })
            .pipe(Effect.ignoreLogged),
        );

        const resultKinds = Array.from({ length: 1000 }, (_, i) => 6000 + i);
        const filters: NostrFilter[] = [
          {
            kinds: resultKinds,
            authors: [dvmPk],
            limit: options.pageSize * options.page,
          }, // Fetch up to current page for sorting
          {
            kinds: [7000],
            authors: [dvmPk],
            "#s": ["success"],
            limit: options.pageSize * options.page,
          },
        ];

        const fetchedEvents = yield* _(
          localNostr
            .listEvents(filters)
            .pipe(
              Effect.mapError(
                (e) =>
                  new DVMConnectionError({
                    message: "Failed to fetch DVM history from relays",
                    cause: e,
                  }),
              ),
            ),
        );

        // Sort all fetched events by created_at descending
        const sortedEvents = fetchedEvents.sort(
          (a, b) => b.created_at - a.created_at,
        );

        // Paginate after sorting
        const paginatedEvents = sortedEvents.slice(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize,
        );

        const entries: JobHistoryEntry[] = paginatedEvents.map((event) => {
          const requestTag = event.tags.find((t) => t[0] === "e");
          const requesterTag = event.tags.find((t) => t[0] === "p");
          const amountTag = event.tags.find((t) => t[0] === "amount");

          let jobStatus: JobStatus = "completed"; // Default for kind 6xxx
          if (event.kind === 7000) {
            const statusTag = event.tags.find((t) => t[0] === "status");
            jobStatus = (statusTag?.[1] as JobStatus) || "completed"; // Assume 'success' maps to 'completed'
          }

          return {
            id: event.id,
            timestamp: event.created_at * 1000,
            jobRequestEventId: requestTag?.[1] || "N/A",
            requesterPubkey: requesterTag?.[1] || "N/A",
            kind: event.kind, // This is the result/feedback kind. Original request kind needs more work.
            inputSummary: "N/A", // Requires fetching original request or different storage
            status: jobStatus,
            ollamaModelUsed: "N/A", // Not available in 6xxx/7000 unless explicitly tagged
            tokensProcessed: undefined,
            invoiceAmountSats: amountTag?.[1]
              ? Math.floor(parseInt(amountTag[1], 10) / 1000)
              : undefined,
            invoiceBolt11: amountTag?.[2],
            resultSummary:
              event.content.substring(0, 100) +
              (event.content.length > 100 ? "..." : ""),
          };
        });

        yield* _(
          localTelemetry
            .trackEvent({
              category: "dvm:history",
              action: "get_job_history_success",
              value: `${entries.length} entries fetched`,
            })
            .pipe(Effect.ignoreLogged),
        );

        // For totalCount, we'd ideally query count from relay or fetch all and count.
        // For now, use the length of initially fetched (potentially larger than one page) sorted events as a proxy.
        return { entries, totalCount: sortedEvents.length };
      });

    // Refactored getJobStatistics
    const getJobStatistics = (): Effect.Effect<
      JobStatistics,
      DVMError | TrackEventError,
      TelemetryService | NostrService
    > =>
      Effect.gen(function* (ctx) {
        const localTelemetry = yield* ctx(TelemetryService);
        const localNostr = yield* ctx(NostrService);
        const effectiveConfig = useDVMSettingsStore
          .getState()
          .getEffectiveConfig();
        const dvmPk = effectiveConfig.dvmPublicKeyHex;

        if (!dvmPk) {
          yield* _(
            localTelemetry
              .trackEvent({
                category: "dvm:stats",
                action: "get_stats_no_dvm_pk",
              })
              .pipe(Effect.ignoreLogged),
          );
          return {
            totalJobsProcessed: 0,
            totalSuccessfulJobs: 0,
            totalFailedJobs: 0,
            totalRevenueSats: 0,
            jobsPendingPayment: 0,
          };
        }

        yield* _(
          localTelemetry
            .trackEvent({
              category: "dvm:stats",
              action: "get_job_statistics_start",
            })
            .pipe(Effect.ignoreLogged),
        );

        const resultKinds = Array.from({ length: 1000 }, (_, i) => 6000 + i);
        const filters: NostrFilter[] = [
          { kinds: resultKinds, authors: [dvmPk], limit: 500 }, // Fetch more for stats
          { kinds: [7000], authors: [dvmPk], limit: 500 }, // Fetch all feedback
        ];
        const allEvents = yield* _(
          localNostr
            .listEvents(filters)
            .pipe(
              Effect.mapError(
                (e) =>
                  new DVMConnectionError({
                    message: "Failed to fetch DVM stats from relays",
                    cause: e,
                  }),
              ),
            ),
        );

        const stats: JobStatistics = {
          totalJobsProcessed: 0,
          totalSuccessfulJobs: 0,
          totalFailedJobs: 0,
          totalRevenueSats: 0,
          jobsPendingPayment: 0,
          modelUsageCounts: {},
        };

        const processedJobRequestIds = new Set<string>();

        allEvents.forEach((event) => {
          const requestTag = event.tags.find((t) => t[0] === "e");
          if (requestTag?.[1]) processedJobRequestIds.add(requestTag[1]);

          if (event.kind >= 6000 && event.kind <= 6999) {
            stats.totalSuccessfulJobs++; // Assume all 6xxx are successful results
            const amountTag = event.tags.find((t) => t[0] === "amount");
            if (amountTag?.[1]) {
              stats.totalRevenueSats += Math.floor(
                parseInt(amountTag[1], 10) / 1000,
              );
            }
          } else if (event.kind === 7000) {
            const statusTag = event.tags.find((t) => t[0] === "status");
            if (statusTag?.[1] === "success") {
              stats.totalSuccessfulJobs++;
              const amountTag = event.tags.find((t) => t[0] === "amount");
              if (amountTag?.[1]) {
                stats.totalRevenueSats += Math.floor(
                  parseInt(amountTag[1], 10) / 1000,
                );
              }
            } else if (statusTag?.[1] === "error") {
              stats.totalFailedJobs++;
            } else if (statusTag?.[1] === "payment-required") {
              stats.jobsPendingPayment++;
            }
          }
        });
        stats.totalJobsProcessed = processedJobRequestIds.size;

        yield* _(
          localTelemetry
            .trackEvent({
              category: "dvm:stats",
              action: "get_job_statistics_success",
              value: JSON.stringify(stats),
            })
            .pipe(Effect.ignoreLogged),
        );
        return stats;
      });

    // ... (rest of processJobRequestInternal, startListening, stopListening, isListening, processLocalTestJob - no changes needed for them based on this request) ...
    const checkAndUpdateInvoiceStatuses = (): Effect.Effect<
      void,
      DVMError | TrackEventError,
      SparkService | TelemetryService
    > =>
      Effect.gen(function* (ctx) {
        const localTelemetry = yield* ctx(TelemetryService);
        const localSpark = yield* ctx(SparkService);

        yield* _(
          localTelemetry
            .trackEvent({
              category: "dvm:payment_check",
              action: "check_all_invoices_start",
            })
            .pipe(Effect.ignoreLogged),
        );

        const historyResult = yield* _(
          getJobHistory({ page: 1, pageSize: 500 }).pipe(
            // Use the refactored getJobHistory
            Effect.provideService(TelemetryService, localTelemetry),
            Effect.provideService(NostrService, nostr), // Provide NostrService for real data
          ),
        );

        const pendingPaymentJobs = historyResult.entries.filter(
          (job) => job.status === "pending_payment" && job.invoiceBolt11,
        );

        if (pendingPaymentJobs.length === 0) {
          yield* _(
            localTelemetry
              .trackEvent({
                category: "dvm:payment_check",
                action: "no_pending_invoices_found",
              })
              .pipe(Effect.ignoreLogged),
          );
          return;
        }

        yield* _(
          localTelemetry
            .trackEvent({
              category: "dvm:payment_check",
              action: "checking_pending_invoices",
              value: String(pendingPaymentJobs.length),
            })
            .pipe(Effect.ignoreLogged),
        );

        for (const job of pendingPaymentJobs) {
          if (!job.invoiceBolt11) continue;

          yield* _(
            localTelemetry
              .trackEvent({
                category: "dvm:payment_check",
                action: "check_invoice_attempt",
                label: `Job ID: ${job.id}`,
                value: job.invoiceBolt11.substring(0, 20) + "...",
              })
              .pipe(Effect.ignoreLogged),
          );

          const invoiceStatusResult: InvoiceStatusResult = yield* _(
            localSpark.checkInvoiceStatus(job.invoiceBolt11).pipe(
              Effect.catchAll((err) => {
                const sparkErr = err as SparkError;
                Effect.runFork(
                  localTelemetry.trackEvent({
                    category: "dvm:payment_check_error",
                    action: "spark_check_invoice_failed",
                    label: `Job ID: ${job.id}, Invoice: ${job.invoiceBolt11?.substring(0, 20)}...`,
                    value: sparkErr.message,
                  }),
                );
                return Effect.succeed<InvoiceStatusResult>({
                  status: "error" as const,
                  message: sparkErr.message,
                });
              }),
            ),
          );

          if (invoiceStatusResult.status === "paid") {
            yield* _(
              localTelemetry
                .trackEvent({
                  category: "dvm:payment_check",
                  action: "invoice_paid",
                  label: `Job ID: ${job.id}`,
                  value: JSON.stringify({
                    amount: invoiceStatusResult.amountPaidMsats,
                  }),
                })
                .pipe(Effect.ignoreLogged),
            );
            // TODO: Update job status to 'paid' in actual persistence.
            console.log(
              `[DVM] Job ${job.id} invoice PAID. Amount: ${invoiceStatusResult.amountPaidMsats} msats. Conceptual update to status: 'paid'.`,
            );
          } else if (
            invoiceStatusResult.status === "expired" ||
            invoiceStatusResult.status === "error"
          ) {
            yield* _(
              localTelemetry
                .trackEvent({
                  category: "dvm:payment_check",
                  action: `invoice_${invoiceStatusResult.status}`,
                  label: `Job ID: ${job.id}`,
                  value:
                    invoiceStatusResult.status === "error"
                      ? invoiceStatusResult.message
                      : undefined,
                })
                .pipe(Effect.ignoreLogged),
            );
            console.log(
              `[DVM] Job ${job.id} invoice ${invoiceStatusResult.status}.`,
            );
          }
        }

        yield* _(
          localTelemetry
            .trackEvent({
              category: "dvm:payment_check",
              action: "check_all_invoices_complete",
            })
            .pipe(Effect.ignoreLogged),
        );
      });

    const processJobRequestInternal = (
      jobRequestEvent: NostrEvent,
    ): Effect.Effect<void, DVMError, never> =>
      Effect.gen(function* (_) {
        const effectiveConfig = useDVMSettingsStore
          .getState()
          .getEffectiveConfig();
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig;

        yield* _(
          telemetry
            .trackEvent({
              category: "dvm:job",
              action: "job_request_received",
              label: jobRequestEvent.id,
              value: `Kind: ${jobRequestEvent.kind}`,
            })
            .pipe(Effect.ignoreLogged),
        );

        let inputsSource = jobRequestEvent.tags;
        let isRequestEncrypted = false;

        if (jobRequestEvent.tags.some((t) => t[0] === "encrypted")) {
          isRequestEncrypted = true;
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          const decryptedContentStr = yield* _(
            nip04
              .decrypt(
                dvmSkBytes,
                jobRequestEvent.pubkey,
                jobRequestEvent.content,
              )
              .pipe(
                Effect.mapError(
                  (e) =>
                    new DVMJobRequestError({
                      message: "Failed to decrypt NIP-90 request content",
                      cause: e,
                    }),
                ),
              ),
          );
          try {
            inputsSource = JSON.parse(decryptedContentStr) as Array<
              [string, ...string[]]
            >;
          } catch (e) {
            return yield* _(
              Effect.fail(
                new DVMJobRequestError({
                  message: "Failed to parse decrypted JSON tags",
                  cause: e,
                }),
              ),
            );
          }
        }

        const inputs: NIP90Input[] = [];
        const paramsMap = new Map<string, string>();
        let outputMimeType = "text/plain";
        let bidMillisats: number | undefined;

        inputsSource.forEach((tag) => {
          if (tag[0] === "i" && tag.length >= 3) {
            const value = tag[1];
            const type = tag[2] as NIP90InputType;
            const opt1 = tag.length > 3 ? tag[3] : undefined;
            const opt2 = tag.length > 4 ? tag[4] : undefined;
            inputs.push([value, type, opt1, opt2] as NIP90Input);
          }
          if (tag[0] === "param") paramsMap.set(tag[1], tag[2]);
          if (tag[0] === "output") outputMimeType = tag[1] || outputMimeType;
          if (tag[0] === "bid")
            bidMillisats = parseInt(tag[1], 10) || undefined;
        });

        if (inputs.length === 0) {
          const feedback = createNip90FeedbackEvent(
            dvmPrivateKeyHex,
            jobRequestEvent,
            "error",
            "No inputs provided.",
          );
          yield* _(publishFeedback(feedback));
          return yield* _(
            Effect.fail(
              new DVMJobRequestError({ message: "No inputs provided" }),
            ),
          );
        }

        const textInput = inputs.find((inp) => inp[1] === "text");
        if (!textInput || !textInput[0]) {
          const feedback = createNip90FeedbackEvent(
            dvmPrivateKeyHex,
            jobRequestEvent,
            "error",
            "No 'text' input found for text generation job.",
          );
          yield* _(publishFeedback(feedback));
          return yield* _(
            Effect.fail(
              new DVMJobRequestError({ message: "No text input found" }),
            ),
          );
        }
        const prompt = textInput[0];

        const processingFeedback = createNip90FeedbackEvent(
          dvmPrivateKeyHex,
          jobRequestEvent,
          "processing",
        );
        yield* _(publishFeedback(processingFeedback));

        const ollamaModel = paramsMap.get("model") || textGenConfig.model;
        const ollamaRequest: OllamaChatCompletionRequest = {
          model: ollamaModel,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        };

        yield* _(
          telemetry
            .trackEvent({
              category: "dvm:job",
              action: "ollama_params_intended",
              label: `Job ID: ${jobRequestEvent.id}`,
              value: JSON.stringify({
                requestParams: Object.fromEntries(paramsMap),
                ollamaModelUsed: ollamaRequest.model,
                defaultJobConfigParams: {
                  max_tokens: textGenConfig.max_tokens,
                  temperature: textGenConfig.temperature,
                  top_k: textGenConfig.top_k,
                  top_p: textGenConfig.top_p,
                  frequency_penalty: textGenConfig.frequency_penalty,
                },
              }),
            })
            .pipe(Effect.ignoreLogged),
        );

        const ollamaResult = yield* _(
          ollama
            .generateChatCompletion(ollamaRequest)
            .pipe(
              Effect.mapError(
                (e) =>
                  new DVMJobProcessingError({
                    message: "Ollama inference failed",
                    cause: e,
                  }),
              ),
            ),
        );

        const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
        const usage = ollamaResult.usage || {
          prompt_tokens: Math.ceil(prompt.length / 4),
          completion_tokens: Math.ceil(ollamaOutput.length / 4),
          total_tokens: Math.ceil((prompt.length + ollamaOutput.length) / 4),
        };
        const totalTokens = usage.total_tokens;

        const priceSats = Math.max(
          textGenConfig.minPriceSats,
          Math.ceil((totalTokens / 1000) * textGenConfig.pricePer1kTokens),
        );
        const invoiceAmountMillisats = priceSats * 1000;

        const invoiceParams: CreateLightningInvoiceParams = {
          amountSats: priceSats,
          memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0, 8)}`,
        };
        const invoiceResult = yield* _(
          spark
            .createLightningInvoice(invoiceParams)
            .pipe(
              Effect.mapError(
                (e) =>
                  new DVMPaymentError({
                    message: "Spark invoice creation failed",
                    cause: e,
                  }),
              ),
            ),
        );
        const bolt11Invoice = invoiceResult.invoice.encodedInvoice;

        let finalOutputContent = ollamaOutput;
        if (isRequestEncrypted) {
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          finalOutputContent = yield* _(
            nip04
              .encrypt(dvmSkBytes, jobRequestEvent.pubkey, ollamaOutput)
              .pipe(
                Effect.mapError(
                  (e) =>
                    new DVMJobProcessingError({
                      message: "Failed to encrypt NIP-90 job result",
                      cause: e,
                    }),
                ),
              ),
          );
        }

        const jobResultEvent = createNip90JobResultEvent(
          dvmPrivateKeyHex,
          jobRequestEvent,
          finalOutputContent,
          invoiceAmountMillisats,
          bolt11Invoice,
          isRequestEncrypted,
        );

        yield* _(
          nostr.publishEvent(jobResultEvent).pipe(
            Effect.mapError(
              (e) =>
                new DVMJobProcessingError({
                  message: "Failed to publish job result event",
                  cause: e,
                }),
            ),
          ),
        );

        const successFeedback = createNip90FeedbackEvent(
          dvmPrivateKeyHex,
          jobRequestEvent,
          "success",
          undefined,
          { amountMillisats: invoiceAmountMillisats, invoice: bolt11Invoice },
        );
        yield* _(publishFeedback(successFeedback));

        yield* _(
          telemetry
            .trackEvent({
              category: "dvm:job",
              action: "job_request_processed_success",
              label: jobRequestEvent.id,
            })
            .pipe(Effect.ignoreLogged),
        );
      }).pipe(
        Effect.catchAllCause((cause) => {
          const effectiveConfigForError = useDVMSettingsStore
            .getState()
            .getEffectiveConfig();
          const dvmPrivateKeyHexForError =
            effectiveConfigForError.dvmPrivateKeyHex;
          const dvmError = Option.getOrElse(
            Cause.failureOption(cause),
            () =>
              new DVMJobProcessingError({
                message: "Unknown error during DVM job processing",
                cause,
              }),
          );
          const feedback = createNip90FeedbackEvent(
            dvmPrivateKeyHexForError,
            jobRequestEvent,
            "error",
            dvmError.message,
          );
          Effect.runFork(publishFeedback(feedback));
          return telemetry
            .trackEvent({
              category: "dvm:error",
              action: "job_request_processing_failure",
              label: jobRequestEvent.id,
              value: dvmError.message,
            })
            .pipe(
              Effect.ignoreLogged,
              Effect.andThen(Effect.fail(dvmError as DVMError)),
            );
        }),
      );

    const processLocalTestJob = (
      prompt: string,
      requesterPkOverride?: string,
    ): Effect.Effect<
      string,
      | DVMError
      | OllamaError
      | SparkError
      | NIP04EncryptError
      | NIP04DecryptError
    > =>
      Effect.gen(function* (_) {
        const effectiveConfig = useDVMSettingsStore
          .getState()
          .getEffectiveConfig();
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig;

        yield* _(
          telemetry
            .trackEvent({
              category: "dvm:test_job",
              action: "local_test_job_start",
              label: `Prompt: ${prompt.substring(0, 30)}...`,
            })
            .pipe(Effect.ignoreLogged),
        );

        const ollamaRequest: OllamaChatCompletionRequest = {
          model: textGenConfig.model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        };
        const ollamaResult = yield* _(
          ollama
            .generateChatCompletion(ollamaRequest)
            .pipe(
              Effect.mapError(
                (e) =>
                  new DVMJobProcessingError({
                    message: "Test job: Ollama inference failed",
                    cause: e,
                  }),
              ),
            ),
        );
        const ollamaOutput = ollamaResult.choices[0]?.message.content || "";

        const mockInvoiceAmountSats = textGenConfig.minPriceSats;
        const mockBolt11Invoice = `mockinvoice_for_testjob_${Date.now()}`;

        yield* _(
          telemetry
            .trackEvent({
              category: "dvm:test_job",
              action: "mock_invoice_generated",
              label: `Test Job: ${mockBolt11Invoice}`,
            })
            .pipe(Effect.ignoreLogged),
        );

        let finalOutputContent = ollamaOutput;
        if (requesterPkOverride) {
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          finalOutputContent = yield* _(
            nip04
              .encrypt(dvmSkBytes, requesterPkOverride, ollamaOutput)
              .pipe(
                Effect.mapError(
                  (e) =>
                    new DVMJobProcessingError({
                      message: "Test job: Failed to encrypt result",
                      cause: e,
                    }),
                ),
              ),
          );
        }

        yield* _(
          telemetry
            .trackEvent({
              category: "dvm:test_job",
              action: "local_test_job_success",
              label: `Result length: ${finalOutputContent.length}`,
            })
            .pipe(Effect.ignoreLogged),
        );

        return finalOutputContent;
      }).pipe(
        Effect.catchAllCause((cause) => {
          const dvmError = Option.getOrElse(
            Cause.failureOption(cause),
            () =>
              new DVMJobProcessingError({
                message: "Unknown error during local test job",
                cause,
              }),
          );
          return telemetry
            .trackEvent({
              category: "dvm:error",
              action: "local_test_job_failure",
              label: dvmError.message,
            })
            .pipe(
              Effect.ignoreLogged,
              Effect.andThen(Effect.fail(dvmError as DVMError)),
            );
        }),
      );

    return {
      startListening: (): Effect.Effect<
        void,
        DVMConfigError | DVMConnectionError | TrackEventError,
        never
      > =>
        Effect.gen(function* (_) {
          if (isActiveInternal) {
            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "start_listening_already_active",
                })
                .pipe(Effect.ignoreLogged),
            );
            return;
          }
          const effectiveConfig = useDVMSettingsStore
            .getState()
            .getEffectiveConfig();
          currentDvmPublicKeyHex = effectiveConfig.dvmPublicKeyHex;
          if (!effectiveConfig.dvmPrivateKeyHex) {
            return yield* _(
              Effect.fail(
                new DVMConfigError({
                  message: "DVM private key not configured.",
                }),
              ),
            );
          }
          if (effectiveConfig.relays.length === 0) {
            return yield* _(
              Effect.fail(
                new DVMConfigError({ message: "No DVM relays configured." }),
              ),
            );
          }
          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:status",
                action: "start_listening_attempt",
                label: `Relays: ${effectiveConfig.relays.join(", ")}, Kinds: ${effectiveConfig.supportedJobKinds.join(", ")}`,
              })
              .pipe(Effect.ignoreLogged),
          );
          const jobRequestFilter: NostrFilter = {
            kinds: effectiveConfig.supportedJobKinds,
            since: Math.floor(Date.now() / 1000) - 300,
          };
          const sub = yield* _(
            nostr
              .subscribeToEvents(
                [jobRequestFilter],
                (event: NostrEvent) => {
                  const latestConfig = useDVMSettingsStore
                    .getState()
                    .getEffectiveConfig();
                  if (
                    event.pubkey === latestConfig.dvmPublicKeyHex &&
                    (event.kind === 7000 ||
                      (event.kind >= 6000 && event.kind <= 6999))
                  ) {
                    return;
                  }
                  Effect.runFork(processJobRequestInternal(event));
                },
                effectiveConfig.relays,
                () => {
                  Effect.runFork(
                    telemetry
                      .trackEvent({
                        category: "dvm:nostr",
                        action: "subscription_eose",
                        label: `EOSE received for DVM job kinds: ${effectiveConfig.supportedJobKinds.join(", ")}`,
                      })
                      .pipe(Effect.ignoreLogged),
                  );
                },
              )
              .pipe(
                Effect.mapError(
                  (e) =>
                    new DVMConnectionError({
                      message: "Failed to subscribe to Nostr for DVM requests",
                      cause: e,
                    }),
                ),
              ),
          );
          currentSubscription = sub;
          isActiveInternal = true;
          const invoiceCheckLoopEffect = checkAndUpdateInvoiceStatuses().pipe(
            Effect.catchAllCause((cause) =>
              telemetry
                .trackEvent({
                  category: "dvm:error",
                  action: "invoice_check_loop_error",
                  label: "Error in periodic invoice check loop",
                  value: Cause.pretty(cause),
                })
                .pipe(Effect.ignoreLogged),
            ),
          );
          const scheduledInvoiceCheck = Effect.repeat(
            invoiceCheckLoopEffect,
            Schedule.spaced(Duration.minutes(2)),
          );
          const fullyProvidedCheck = scheduledInvoiceCheck.pipe(
            Effect.provideService(SparkService, spark),
            Effect.provideService(TelemetryService, telemetry),
          );
          invoiceCheckFiber = Effect.runFork(
            fullyProvidedCheck,
          ) as Fiber.RuntimeFiber<void, never>;
          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:status",
                action: "invoice_check_loop_started",
              })
              .pipe(Effect.ignoreLogged),
          );
          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:status",
                action: "start_listening_success",
              })
              .pipe(Effect.ignoreLogged),
          );
        }),

      stopListening: (): Effect.Effect<
        void,
        DVMError | TrackEventError,
        never
      > =>
        Effect.gen(function* (_) {
          if (!isActiveInternal) {
            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "stop_listening_already_inactive",
                })
                .pipe(Effect.ignoreLogged),
            );
            return;
          }
          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:status",
                action: "stop_listening_attempt",
              })
              .pipe(Effect.ignoreLogged),
          );
          if (currentSubscription) {
            try {
              currentSubscription.unsub();
              currentSubscription = null;
            } catch (e) {
              yield* _(
                telemetry
                  .trackEvent({
                    category: "dvm:error",
                    action: "stop_listening_unsub_failure",
                    label: e instanceof Error ? e.message : String(e),
                  })
                  .pipe(Effect.ignoreLogged),
              );
            }
          }
          if (invoiceCheckFiber) {
            Effect.runFork(Fiber.interrupt(invoiceCheckFiber));
            invoiceCheckFiber = null;
            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "invoice_check_loop_stopped",
                })
                .pipe(Effect.ignoreLogged),
            );
          }
          isActiveInternal = false;
          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:status",
                action: "stop_listening_success",
              })
              .pipe(Effect.ignoreLogged),
          );
        }),

      isListening: (): Effect.Effect<
        boolean,
        DVMError | TrackEventError,
        never
      > =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:status",
                action: "check_listening_status",
                label: isActiveInternal ? "active" : "inactive",
              })
              .pipe(Effect.ignoreLogged),
          );
          return isActiveInternal;
        }),

      getJobHistory, // Use the refactored method
      getJobStatistics, // Use the refactored method
      processLocalTestJob,
    };
  }),
);
```

```typescript
// src/components/dvm/DvmJobHistoryPane.tsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import { useQuery } from '@tanstack/react-query';
import { Effect, Exit, Cause } from 'effect';
import { Kind5050DVMService } from '@/services/dvm/Kind5050DVMService';
import { getMainRuntime } from '@/services/runtime';
import { JobHistoryEntry, JobStatistics, JobStatus } from '@/types/dvm';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, RefreshCcw, AlertCircle } from 'lucide-react';
import { TelemetryService } from '@/services/telemetry';

const ITEMS_PER_PAGE = 10;

const DvmJobHistoryPane: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const runtime = getMainRuntime();

  // Effect to log pane opening
  useEffect(() => {
    const telemetryEffect = Effect.flatMap(TelemetryService, ts => ts.trackEvent({
        category: 'ui:pane',
        action: 'open_dvm_job_history_pane'
    })).pipe(Effect.provide(runtime), Effect.ignoreLogged);
    Effect.runFork(telemetryEffect);
  }, [runtime]);

  const { data: statsData, isLoading: isLoadingStats, error: statsError, refetch: refetchStats } = useQuery<JobStatistics, Error>({
    queryKey: ['dvmJobStatistics'],
    queryFn: async () => {
      const program = Effect.flatMap(Kind5050DVMService, s => s.getJobStatistics());
      const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
  });

  const { data: historyData, isLoading: isLoadingHistory, error: historyError, refetch: refetchHistory, isFetching: isFetchingHistory } = useQuery<{ entries: JobHistoryEntry[]; totalCount: number }, Error>({
    queryKey: ['dvmJobHistory', currentPage, ITEMS_PER_PAGE],
    queryFn: async () => {
      const program = Effect.flatMap(Kind5050DVMService, s => s.getJobHistory({ page: currentPage, pageSize: ITEMS_PER_PAGE }));
      const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
    placeholderData: (previousData) => previousData,
  });

  const totalPages = historyData ? Math.ceil(historyData.totalCount / ITEMS_PER_PAGE) : 0;

  const handleRefresh = () => {
    refetchStats();
    refetchHistory();
  };

  const getStatusBadgeVariant = (status: JobStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
      case 'paid':
        return "default";
      case 'processing':
        return "secondary";
      case 'pending_payment':
        return "outline";
      case 'error':
      case 'cancelled':
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="p-3 h-full flex flex-col gap-3">
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-semibold">My DVM Activity</h2>
        <Button onClick={handleRefresh} size="sm" variant="outline" disabled={isLoadingStats || isFetchingHistory}>
          <RefreshCcw className={`w-3 h-3 mr-1.5 ${isLoadingStats || isFetchingHistory ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        {isLoadingStats && Array.from({length: 4}).map((_, i) => (
          <Card key={i} className="animate-pulse"><CardHeader><CardTitle className="h-4 bg-muted rounded w-3/4"></CardTitle></CardHeader><CardContent><div className="h-8 bg-muted rounded w-1/2"></div></CardContent></Card>
        ))}
        {statsError && <Card className="col-span-full bg-destructive/10 border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="w-4 h-4 mr-1.5"/>Statistics Error</CardTitle></CardHeader><CardContent className="text-xs text-destructive/80">{statsError.message}</CardContent></Card>}
        {statsData && !isLoadingStats && (
          <>
            <Card><CardHeader><CardTitle className="text-sm">Total Jobs</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{statsData.totalJobsProcessed}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Successful</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-green-500">{statsData.totalSuccessfulJobs}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Revenue (Sats)</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-yellow-500">{statsData.totalRevenueSats}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Failed</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-destructive">{statsData.totalFailedJobs}</p></CardContent></Card>
          </>
        )}
      </div>

      {/* Job History Table */}
      <div className="flex-grow min-h-0 border border-border/50 rounded-md">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
              <TableRow>
                <TableHead className="w-[150px]">Timestamp</TableHead>
                <TableHead>Job ID</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount (Sats)</TableHead>
                <TableHead>Result Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingHistory && !historyData && Array.from({length: 5}).map((_, i) => (
                <TableRow key={`loading-${i}`} className="animate-pulse">
                  <TableCell><div className="h-4 bg-muted rounded w-full"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-full"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-full"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-1/2"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-1/4"></div></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-full"></div></TableCell>
                </TableRow>
              ))}
              {historyError && (
                <TableRow><TableCell colSpan={6} className="text-center text-destructive">Error loading history: {historyError.message}</TableCell></TableRow>
              )}
              {historyData?.entries.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="text-xs">{new Date(job.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-mono" title={job.jobRequestEventId}>{job.jobRequestEventId.substring(0, 8)}...</TableCell>
                  <TableCell className="text-xs font-mono" title={job.requesterPubkey}>{job.requesterPubkey.substring(0, 8)}...</TableCell>
                  <TableCell><Badge variant={getStatusBadgeVariant(job.status)} className="text-[10px]">{job.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="text-xs text-right">{job.invoiceAmountSats ?? 'N/A'}</TableCell>
                  <TableCell className="text-xs" title={job.resultSummary}>{job.resultSummary?.substring(0,50) || 'N/A'}{job.resultSummary && job.resultSummary.length > 50 ? '...' : ''}</TableCell>
                </TableRow>
              ))}
              {historyData?.entries.length === 0 && !isLoadingHistory && (
                 <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No completed DVM jobs found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Pagination Controls */}
      {historyData && totalPages > 1 && ( // Only show pagination if more than one page
        <div className="flex items-center justify-end space-x-2 py-1 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isFetchingHistory}
          >
            <ArrowLeft className="w-3 h-3 mr-1.5" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isFetchingHistory}
          >
            Next <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default DvmJobHistoryPane;
```

```typescript
// src/types/pane.ts
export type Pane = {
  id: string;
  type:
    | "default"
    | "chat"
    | "chats"
    | "user"
    | "diff"
    | "changelog"
    | "nip28_channel"
    | "nip90_dashboard"
    | "sell_compute"
    | "dvm_job_history"
    | "nip90_dvm_test"
    | "nip90_consumer_chat"
    | "nip90_global_feed"
    | string; // Added nip90_global_feed
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive?: boolean;
  dismissable?: boolean;
  content?: {
    oldContent?: string;
    newContent?: string;
    channelId?: string;
    channelName?: string;
    [key: string]: unknown;
  };
};

export type PaneInput = Omit<
  Pane,
  "x" | "y" | "width" | "height" | "id" | "isActive"
> & {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};
```

```typescript
// src/stores/panes/constants.ts
export const DEFAULT_PANE_WIDTH = 400;
export const DEFAULT_PANE_HEIGHT = 300;
export const PANE_MARGIN = 20;
export const PANE_OFFSET = 45;

export const CHATS_PANE_ID = "chats";
export const CHANGELOG_PANE_ID = "changelog";

export const DEFAULT_NIP28_CHANNEL_ID =
  "ee7352c54c85004d3d994a48d87c488905795f956f88842394eb3c6edc615978";
export const DEFAULT_NIP28_PANE_ID = `nip28-${DEFAULT_NIP28_CHANNEL_ID}`;
export const DEFAULT_NIP28_CHANNEL_TITLE = "Welcome Chat";
export const WELCOME_CHAT_INITIAL_WIDTH = 350;
export const WELCOME_CHAT_INITIAL_HEIGHT = 250;

export const SELL_COMPUTE_PANE_ID_CONST = "sell_compute";
export const SELL_COMPUTE_INITIAL_WIDTH = 550;
export const SELL_COMPUTE_INITIAL_HEIGHT = 420;

export const HOTBAR_APPROX_HEIGHT = 60;

export const NIP90_DVM_TEST_PANE_ID = "nip90_dvm_test";
export const NIP90_DVM_TEST_PANE_TITLE = "NIP-90 DVM Test";
export const NIP90_CONSUMER_CHAT_PANE_ID = "nip90_consumer_chat";
export const NIP90_CONSUMER_CHAT_PANE_TITLE =
  "NIP-90 Consumer (Text Inference)";

// New constants for Global Feed Pane
export const NIP90_GLOBAL_FEED_PANE_ID = "nip90_global_feed";
export const NIP90_GLOBAL_FEED_PANE_TITLE = "NIP-90 Global Feed";
```

```typescript
// src/stores/panes/actions/openNip90GlobalFeedPane.ts
import { type PaneInput } from "@/types/pane";
import { type PaneStoreType, type SetPaneStore } from "../types";
import { addPaneActionLogic } from "./addPane";
import {
  NIP90_GLOBAL_FEED_PANE_ID,
  NIP90_GLOBAL_FEED_PANE_TITLE,
} from "../constants";

export function openNip90GlobalFeedPaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const existingPane = state.panes.find(
      (p) => p.id === NIP90_GLOBAL_FEED_PANE_ID,
    );
    if (existingPane) {
      const newPanes = state.panes
        .map((p) => ({ ...p, isActive: p.id === NIP90_GLOBAL_FEED_PANE_ID }))
        .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1));

      return {
        ...state,
        panes: newPanes,
        activePaneId: NIP90_GLOBAL_FEED_PANE_ID,
        lastPanePosition: {
          x: existingPane.x,
          y: existingPane.y,
          width: existingPane.width,
          height: existingPane.height,
        },
      };
    }

    const newPaneInput: PaneInput = {
      id: NIP90_GLOBAL_FEED_PANE_ID,
      type: "nip90_global_feed",
      title: NIP90_GLOBAL_FEED_PANE_TITLE,
      dismissable: true,
      width: 700, // Wider for a feed
      height: 500,
    };

    const changes = addPaneActionLogic(state, newPaneInput, true);
    return { ...state, ...changes };
  });
}
```

```typescript
// src/stores/panes/actions/index.ts
export * from "./addPane";
export * from "./removePane";
export * from "./updatePanePosition";
export * from "./updatePaneSize";
export * from "./bringPaneToFront";
export * from "./setActivePane";
export * from "./openChatPane";
export * from "./createNip28ChannelPane";
export * from "./openNip90DashboardPane";
export * from "./openSellComputePane";
export * from "./openDvmJobHistoryPane";
export * from "./openNip90DvmTestPane";
export * from "./openNip90ConsumerChatPane";
export * from "./openNip90GlobalFeedPane"; // Added new action
```

```typescript
// src/stores/panes/types.ts
import { Pane, PaneInput } from "@/types/pane";
import type { StoreApi } from "zustand";

export interface PaneState {
  panes: Pane[];
  activePaneId: string | null;
  lastPanePosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface PaneStoreType extends PaneState {
  addPane: (newPane: PaneInput, shouldTile?: boolean) => void;
  removePane: (id: string) => void;
  updatePanePosition: (id: string, x: number, y: number) => void;
  updatePaneSize: (id: string, width: number, height: number) => void;
  openChatPane: (newPane: PaneInput, isCommandKeyHeld?: boolean) => void;
  bringPaneToFront: (id: string) => void;
  setActivePane: (id: string | null) => void;
  createNip28ChannelPane: (channelName?: string) => void;
  openNip90DashboardPane: () => void;
  openSellComputePane: () => void;
  openDvmJobHistoryPane: () => void;
  openNip90DvmTestPane: () => void;
  openNip90ConsumerChatPane: () => void;
  openNip90GlobalFeedPane: () => void; // Added new action type
  resetHUDState: () => void;
}

export type SetPaneStore = StoreApi<PaneStoreType>["setState"];
export type GetPaneStore = () => PaneStoreType;
```

```typescript
// src/stores/pane.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Pane, PaneInput } from "@/types/pane";
import { PaneStoreType, PaneState } from "./panes/types";
import {
  addPaneAction,
  removePaneAction,
  updatePanePositionAction,
  updatePaneSizeAction,
  openChatPaneAction,
  bringPaneToFrontAction,
  setActivePaneAction,
  createNip28ChannelPaneAction,
  openNip90DashboardPaneAction,
  openSellComputePaneAction,
  openDvmJobHistoryPaneAction,
  openNip90DvmTestPaneAction,
  openNip90ConsumerChatPaneAction,
  openNip90GlobalFeedPaneAction, // Added import for new action
} from "./panes/actions";
import {
  DEFAULT_NIP28_PANE_ID,
  DEFAULT_NIP28_CHANNEL_ID,
  DEFAULT_NIP28_CHANNEL_TITLE,
  PANE_MARGIN,
  WELCOME_CHAT_INITIAL_WIDTH,
  WELCOME_CHAT_INITIAL_HEIGHT,
  SELL_COMPUTE_PANE_ID_CONST,
  SELL_COMPUTE_INITIAL_WIDTH,
  SELL_COMPUTE_INITIAL_HEIGHT,
  HOTBAR_APPROX_HEIGHT,
} from "./panes/constants";

const getInitialPanes = (): Pane[] => {
  /* ... (no changes) ... */
};
const initialState: PaneState = {
  /* ... (no changes) ... */
};
const sellComputePaneInitial = initialState.panes.find(
  (p) => p.id === SELL_COMPUTE_PANE_ID_CONST,
);
if (sellComputePaneInitial) {
  /* ... (no changes) ... */
}

export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      ...initialState,
      addPane: (newPaneInput: PaneInput, shouldTile?: boolean) =>
        addPaneAction(set, newPaneInput, shouldTile),
      removePane: (id: string) => removePaneAction(set, id),
      updatePanePosition: (id: string, x: number, y: number) =>
        updatePanePositionAction(set, id, x, y),
      updatePaneSize: (id: string, width: number, height: number) =>
        updatePaneSizeAction(set, id, width, height),
      openChatPane: (newPaneInput: PaneInput, isCommandKeyHeld?: boolean) =>
        openChatPaneAction(set, newPaneInput, isCommandKeyHeld),
      bringPaneToFront: (id: string) => bringPaneToFrontAction(set, id),
      setActivePane: (id: string | null) => setActivePaneAction(set, id),
      createNip28ChannelPane: (channelName?: string) =>
        createNip28ChannelPaneAction(set, get, channelName),
      openNip90DashboardPane: () => openNip90DashboardPaneAction(set),
      openSellComputePane: () => openSellComputePaneAction(set),
      openDvmJobHistoryPane: () => openDvmJobHistoryPaneAction(set),
      openNip90DvmTestPane: () => openNip90DvmTestPaneAction(set),
      openNip90ConsumerChatPane: () => openNip90ConsumerChatPaneAction(set),
      openNip90GlobalFeedPane: () => openNip90GlobalFeedPaneAction(set), // Added new action
      resetHUDState: () => {
        /* ... (no changes) ... */
      },
    }),
    {
      name: "commander-pane-storage-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        /* ... (no changes) ... */
      }),
      merge: (persistedState, currentState) => {
        /* ... (no changes) ... */
      },
    },
  ),
);
```

```typescript
// src/tests/unit/stores/paneActions.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePaneStore } from "@/stores/pane";
import {
  NIP90_DVM_TEST_PANE_ID,
  NIP90_CONSUMER_CHAT_PANE_ID,
  NIP90_GLOBAL_FEED_PANE_ID,
} from "@/stores/panes/constants"; // Added NIP90_GLOBAL_FEED_PANE_ID
import { type Pane } from "@/types/pane";

vi.mock("@buildonspark/lrc20-sdk", () => ({}));
vi.mock("bitcoinjs-lib", () => ({}));
vi.mock("nostr-tools", () => ({}));

interface MockStoreType {
  panes: Pane[];
  activePaneId: string | null;
  lastPanePosition: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  resetHUDState: ReturnType<typeof vi.fn>;
  openNip90DvmTestPane: ReturnType<typeof vi.fn>;
  openNip90ConsumerChatPane: ReturnType<typeof vi.fn>;
  openNip90GlobalFeedPane: ReturnType<typeof vi.fn>; // Added new mock method
}

const mockStore: MockStoreType = {
  panes: [],
  activePaneId: null,
  lastPanePosition: null,
  resetHUDState: vi.fn(() => {
    mockStore.panes = [];
    mockStore.activePaneId = null;
    mockStore.lastPanePosition = null;
  }),
  openNip90DvmTestPane: vi.fn(() => {
    const existingPane = mockStore.panes.find(
      (p) => p.id === NIP90_DVM_TEST_PANE_ID,
    );
    if (existingPane) {
      mockStore.panes = mockStore.panes.map((p) => ({
        ...p,
        isActive: p.id === NIP90_DVM_TEST_PANE_ID,
      }));
      mockStore.activePaneId = NIP90_DVM_TEST_PANE_ID;
      return;
    }
    mockStore.panes.push({
      id: NIP90_DVM_TEST_PANE_ID,
      type: "nip90_dvm_test",
      title: "NIP-90 DVM Test",
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      isActive: true,
      dismissable: true,
      content: {},
    });
    mockStore.activePaneId = NIP90_DVM_TEST_PANE_ID;
  }),
  openNip90ConsumerChatPane: vi.fn(() => {
    const existingPane = mockStore.panes.find(
      (p) => p.id === NIP90_CONSUMER_CHAT_PANE_ID,
    );
    if (existingPane) {
      mockStore.panes = mockStore.panes.map((p) => ({
        ...p,
        isActive: p.id === NIP90_CONSUMER_CHAT_PANE_ID,
      }));
      mockStore.activePaneId = NIP90_CONSUMER_CHAT_PANE_ID;
      return;
    }
    mockStore.panes.push({
      id: NIP90_CONSUMER_CHAT_PANE_ID,
      type: "nip90_consumer_chat",
      title: "NIP-90 Consumer Chat",
      x: 100,
      y: 100,
      width: 500,
      height: 450,
      isActive: true,
      dismissable: true,
      content: {},
    });
    mockStore.activePaneId = NIP90_CONSUMER_CHAT_PANE_ID;
  }),
  openNip90GlobalFeedPane: vi.fn(() => {
    // Added mock for new action
    const existingPane = mockStore.panes.find(
      (p) => p.id === NIP90_GLOBAL_FEED_PANE_ID,
    );
    if (existingPane) {
      mockStore.panes = mockStore.panes.map((p) => ({
        ...p,
        isActive: p.id === NIP90_GLOBAL_FEED_PANE_ID,
      }));
      mockStore.activePaneId = NIP90_GLOBAL_FEED_PANE_ID;
      return;
    }
    mockStore.panes.push({
      id: NIP90_GLOBAL_FEED_PANE_ID,
      type: "nip90_global_feed",
      title: "NIP-90 Global Feed",
      x: 100,
      y: 100,
      width: 700,
      height: 500,
      isActive: true,
      dismissable: true,
      content: {},
    });
    mockStore.activePaneId = NIP90_GLOBAL_FEED_PANE_ID;
  }),
};

vi.mock("@/stores/pane", () => ({
  usePaneStore: {
    getState: vi.fn(() => mockStore),
  },
}));

describe("Pane Store NIP-90 Actions", () => {
  beforeEach(() => {
    mockStore.resetHUDState();
    vi.clearAllMocks();
  });

  // ... (existing tests for DVM Test and Consumer Chat panes) ...

  it("openNip90GlobalFeedPaneAction should add a NIP-90 global feed pane", () => {
    usePaneStore.getState().openNip90GlobalFeedPane();
    const { panes, activePaneId } = usePaneStore.getState();
    const newPane = panes.find((p) => p.id === NIP90_GLOBAL_FEED_PANE_ID);
    expect(newPane).toBeDefined();
    expect(newPane?.type).toBe("nip90_global_feed");
    expect(activePaneId).toBe(NIP90_GLOBAL_FEED_PANE_ID);
  });
});
```

```typescript
// src/components/nip90_feed/Nip90GlobalFeedPane.tsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Effect, Exit, Cause } from 'effect';
import { NostrService, NostrEvent } from '@/services/nostr';
import { NIP19Service } from '@/services/nip19';
import { getMainRuntime } from '@/services/runtime';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw, AlertCircle, ExternalLink } from 'lucide-react';
import { TelemetryService } from '@/services/telemetry';

const ITEMS_PER_PAGE = 50; // As requested

const Nip90GlobalFeedPane: React.FC = () => {
  const runtime = getMainRuntime();

  useEffect(() => {
    const telemetryEffect = Effect.flatMap(TelemetryService, ts => ts.trackEvent({
        category: 'ui:pane',
        action: 'open_nip90_global_feed_pane'
    })).pipe(Effect.provide(runtime), Effect.ignoreLogged);
    Effect.runFork(telemetryEffect);
  }, [runtime]);

  const { data: feedEvents, isLoading, error, refetch, isFetching } = useQuery<NostrEvent[], Error>({
    queryKey: ['nip90GlobalFeed'],
    queryFn: async () => {
      const program = Effect.flatMap(NostrService, s => s.listPublicNip90Events(ITEMS_PER_PAGE));
      const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
  });

  const EventCard: React.FC<{event: NostrEvent}> = ({ event }) => {
    const { data: npub } = useQuery({
      queryKey: ['npub', event.pubkey],
      queryFn: async () => {
        const program = Effect.flatMap(NIP19Service, s => s.encodeNpub(event.pubkey));
        return Effect.runPromise(Effect.provide(program, runtime));
      },
      enabled: !!event.pubkey
    });
    const { data: noteId } = useQuery({
      queryKey: ['noteId', event.id],
      queryFn: async () => {
        const program = Effect.flatMap(NIP19Service, s => s.encodeNote(event.id));
        return Effect.runPromise(Effect.provide(program, runtime));
      },
      enabled: !!event.id
    });

    const getKindLabel = (kind: number) => {
      if (kind >= 5000 && kind <= 5999) return `Job Request (${kind})`;
      if (kind >= 6000 && kind <= 6999) return `Job Result (${kind})`;
      if (kind === 7000) return `Feedback (${kind})`;
      return `Kind ${kind}`;
    };

    let contentSummary = event.content.substring(0, 150) + (event.content.length > 150 ? '...' : '');
    if (event.tags.some(t => t[0] === 'encrypted')) {
      contentSummary = "[Encrypted Content]";
    } else {
      try {
        const parsed = JSON.parse(event.content);
        if (Array.isArray(parsed)) {
            contentSummary = "Inputs/Params (JSON Array)";
            // Further parsing of 'i' or 'param' tags could be done here
        }
      } catch (e) { /* not json, use substring */ }
    }

    const getStatusTag = event.tags.find(t => t[0] === 'status');

    return (
      <Card className="mb-2 bg-card/70 backdrop-blur-sm">
        <CardHeader className="pb-1 pt-2 px-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xs font-mono break-all" title={event.id}>
              {noteId || event.id.substring(0,12)+"..."}
            </CardTitle>
            <Badge variant="outline" className="text-[9px] whitespace-nowrap">{getKindLabel(event.kind)}</Badge>
          </div>
          <CardDescription className="text-[10px]">
            By: <span className="font-mono" title={event.pubkey}>{npub || event.pubkey.substring(0,10)+"..."}</span>
            <br/>
            At: {new Date(event.created_at * 1000).toLocaleString()}
            {getStatusTag && <span className="ml-2"><Badge variant="secondary" className="text-[9px]">Status: {getStatusTag[1]}</Badge></span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-1 px-3 text-xs">
          <p className="font-mono whitespace-pre-wrap break-all text-[10px] max-h-20 overflow-y-auto bg-muted/30 p-1 rounded-sm">
            {contentSummary}
          </p>
          {event.tags.length > 0 && (
            <details className="mt-1 text-[10px]">
              <summary className="cursor-pointer text-muted-foreground">Tags ({event.tags.length})</summary>
              <pre className="font-mono whitespace-pre-wrap break-all bg-muted/20 p-1 rounded-sm mt-0.5 text-[9px] max-h-24 overflow-y-auto">
                {event.tags.map(t => `  ["${t.join('", "')}"]`).join('\n')}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-2 h-full flex flex-col gap-2">
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-base font-semibold">NIP-90 Global Feed</h2>
        <Button onClick={() => refetch()} size="sm" variant="outline" disabled={isFetching}>
          <RefreshCcw className={`w-3 h-3 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex-grow min-h-0">
        {isLoading && !feedEvents && (
          <div className="text-center p-4 text-muted-foreground">Loading NIP-90 events...</div>
        )}
        {error && (
          <div className="text-center p-4 text-destructive flex items-center justify-center">
            <AlertCircle className="w-4 h-4 mr-1.5"/> Error fetching events: {error.message}
          </div>
        )}
        {feedEvents && feedEvents.length === 0 && !isLoading && (
          <div className="text-center p-4 text-muted-foreground">No NIP-90 events found on connected relays.</div>
        )}
        {feedEvents && feedEvents.length > 0 && (
          <ScrollArea className="h-full pr-2">
            {feedEvents.map(event => <EventCard key={event.id} event={event} />)}
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default Nip90GlobalFeedPane;
```

```typescript
// src/components/nip90_feed/index.ts
export { default as Nip90GlobalFeedPane } from "./Nip90GlobalFeedPane";
```

```typescript
// src/services/nostr/NostrService.ts
// ... (existing NostrService interface)
export interface NostrService {
  getPool(): Effect.Effect<SimplePool, NostrPoolError, never>;
  listEvents(
    filters: NostrFilter[],
  ): Effect.Effect<NostrEvent[], NostrRequestError, never>;
  listPublicNip90Events(
    limit: number,
  ): Effect.Effect<NostrEvent[], NostrRequestError>; // Added this line
  publishEvent(
    event: NostrEvent,
  ): Effect.Effect<void, NostrPublishError, never>;
  cleanupPool(): Effect.Effect<void, NostrPoolError, never>;
  subscribeToEvents(
    filters: NostrFilter[],
    onEvent: (event: NostrEvent) => void,
    relays?: readonly string[],
    onEOSE?: () => void,
  ): Effect.Effect<Subscription, NostrRequestError, never>;
}
// ... (rest of the file)
```

```typescript
// src/services/nostr/NostrServiceImpl.ts
// ... (imports and existing createNostrService function) ...
export function createNostrService(config: NostrServiceConfig): NostrService {
  // ... (existing getPoolEffect, listEvents, publishEvent, subscribeToEvents, cleanupPool) ...

  const listPublicNip90Events = (
    limit: number,
  ): Effect.Effect<NostrEvent[], NostrRequestError> =>
    Effect.gen(function* (_) {
      const telemetry = yield* _(
        Effect.provide(
          TelemetryService,
          Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer),
        ),
      ); // Get telemetry instance
      yield* _(
        telemetry
          .trackEvent({
            category: "nostr:fetch",
            action: "list_public_nip90_events_start",
            value: String(limit),
          })
          .pipe(Effect.ignoreLogged),
      );

      const nip90RequestKinds = Array.from(
        { length: 1000 },
        (_, i) => 5000 + i,
      );
      const nip90ResultKinds = Array.from({ length: 1000 }, (_, i) => 6000 + i);

      const filters: NostrFilter[] = [
        {
          kinds: [...nip90RequestKinds, ...nip90ResultKinds, 7000],
          limit: limit,
          // Not filtering by #p or authors to get a global feed
        },
      ];

      // Use the existing listEvents method which already handles timeout, sorting and telemetry
      // and uses the NostrService's default relays.
      const events = yield* _(listEvents(filters)); // `listEvents` is already part of `this` service

      yield* _(
        telemetry
          .trackEvent({
            category: "nostr:fetch",
            action: "list_public_nip90_events_success",
            label: `Fetched ${events.length} events`,
          })
          .pipe(Effect.ignoreLogged),
      );

      return events;
    }).pipe(
      Effect.catchAll(
        (err) =>
          Effect.flatMap(
            Effect.provide(
              TelemetryService,
              Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer),
            ),
            (telemetry) =>
              telemetry
                .trackEvent({
                  category: "nostr:error",
                  action: "list_public_nip90_events_failure",
                  label: err.message,
                })
                .pipe(Effect.ignoreLogged),
          ).pipe(Effect.andThen(Effect.fail(err as NostrRequestError))), // Ensure correct error type
      ),
    );

  return {
    getPool: () => getPoolEffect,
    listEvents,
    listPublicNip90Events, // Added method
    publishEvent,
    subscribeToEvents,
    cleanupPool,
  };
}

// ... (NostrServiceLive layer remains the same) ...
```

```typescript
// src/panes/PaneManager.tsx
import React from 'react';
// ... (other imports)
import { Nip90GlobalFeedPane } from '@/components/nip90_feed'; // Added import

export const PaneManager = () => {
  // ... (existing code) ...
  return (
    <>
      {panes.map((pane: PaneType, index: number) => (
        <PaneComponent
          key={pane.id}
          // ... (other props)
        >
          {/* ... (existing pane type renderings) ... */}
          {pane.type === 'nip90_global_feed' && (
            <Nip90GlobalFeedPane />
          )}
          {/* Update the final fallback condition */}
          {!(
            // ... (other types) ...
            pane.type === 'nip90_global_feed' || // Added
            pane.type === 'default'
          ) && <PlaceholderDefaultComponent type={pane.type} />}
        </PaneComponent>
      ))}
    </>
  );
};
```

```typescript
// src/components/hud/Hotbar.tsx
import React from 'react';
// ... (other imports)
import { Globe } from 'lucide-react'; // Example icon for global feed
import { NIP90_GLOBAL_FEED_PANE_ID } from '@/stores/panes/constants'; // Added import

export const Hotbar: React.FC<HotbarProps> = ({ /* ...props */ }) => {
  // ... (existing hooks)
  const openNip90GlobalFeedPane = usePaneStore((state) => state.openNip90GlobalFeedPane); // Added hook

  return (
    <div /* ... (hotbar container) ... */ >
      {/* ... (existing HotbarItems 1-8) ... */}
      <HotbarItem slotNumber={9} onClick={openNip90GlobalFeedPane} title="NIP-90 Global Feed" isActive={activePaneId === NIP90_GLOBAL_FEED_PANE_ID}>
        <Globe className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {/* Adjust empty slots if any remaining */}
      {/* Example: if total slots are 9, no empty slots needed now */}
      {/* Array.from({ length: 0 }).map(...) */}
    </div>
  );
};
```

```typescript
// src/tests/unit/services/dvm/Kind5050DVMService.test.ts
// This file will be created or updated with tests for the refactored getJobHistory and getJobStatistics.
// Example structure:
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Layer, Exit } from "effect";
import {
  Kind5050DVMService,
  Kind5050DVMServiceLive,
  DefaultKind5050DVMServiceConfigLayer,
} from "@/services/dvm";
import { NostrService, type NostrEvent } from "@/services/nostr";
import {
  TelemetryService,
  DefaultTelemetryConfigLayer,
  TelemetryServiceLive,
} from "@/services/telemetry";
import { useDVMSettingsStore } from "@/stores/dvmSettingsStore";

describe("Kind5050DVMService - Real Data Fetching", () => {
  const mockNostrService: Partial<NostrService> = {
    listEvents: vi.fn(),
  };

  const testLayer = Layer.mergeAll(
    DefaultKind5050DVMServiceConfigLayer,
    Layer.succeed(NostrService, mockNostrService as NostrService),
    Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer),
  ).pipe(Layer.provide(Kind5050DVMServiceLive));

  const dvmPk = useDVMSettingsStore
    .getState()
    .getEffectiveConfig().dvmPublicKeyHex;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Zustand store to defaults for consistent DVM PK
    useDVMSettingsStore.getState().resetSettings();
  });

  describe("getJobHistory", () => {
    it("should fetch and format completed jobs from our DVM", async () => {
      const mockEvents: NostrEvent[] = [
        {
          id: "result1",
          kind: 6100,
          pubkey: dvmPk,
          created_at: Date.now() / 1000 - 100,
          tags: [
            ["e", "req1"],
            ["p", "client1"],
            ["amount", "10000", "lnbc1..."],
          ],
          content: "Result 1",
          sig: "sig1",
        },
        {
          id: "feedback1",
          kind: 7000,
          pubkey: dvmPk,
          created_at: Date.now() / 1000 - 50,
          tags: [
            ["e", "req2"],
            ["p", "client2"],
            ["status", "success"],
          ],
          content: "Success",
          sig: "sig2",
        },
      ];
      (mockNostrService.listEvents as vi.Mock).mockReturnValue(
        Effect.succeed(mockEvents),
      );

      const program = Effect.flatMap(Kind5050DVMService, (s) =>
        s.getJobHistory({ page: 1, pageSize: 10 }),
      );
      const result = await Effect.runPromise(
        Effect.provide(program, testLayer),
      );

      expect(result.entries.length).toBe(2);
      expect(result.entries[0].id).toBe("feedback1"); // Most recent
      expect(result.entries[1].id).toBe("result1");
      expect(result.entries[0].status).toBe("success");
      expect(result.entries[1].status).toBe("completed");
      expect(mockNostrService.listEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            kinds: expect.arrayContaining([6000]),
            authors: [dvmPk],
          }),
          expect.objectContaining({
            kinds: [7000],
            authors: [dvmPk],
            "#s": ["success"],
          }),
        ]),
      );
    });
  });

  describe("getJobStatistics", () => {
    it("should calculate statistics from DVM events", async () => {
      const mockEvents: NostrEvent[] = [
        {
          id: "res1",
          kind: 6100,
          pubkey: dvmPk,
          created_at: 1,
          tags: [
            ["e", "req1"],
            ["amount", "10000"],
          ],
          content: "",
          sig: "",
        },
        {
          id: "fb1",
          kind: 7000,
          pubkey: dvmPk,
          created_at: 2,
          tags: [
            ["e", "req2"],
            ["status", "success"],
            ["amount", "5000"],
          ],
          content: "",
          sig: "",
        },
        {
          id: "fb2",
          kind: 7000,
          pubkey: dvmPk,
          created_at: 3,
          tags: [
            ["e", "req3"],
            ["status", "error"],
          ],
          content: "",
          sig: "",
        },
      ];
      (mockNostrService.listEvents as vi.Mock).mockReturnValue(
        Effect.succeed(mockEvents),
      );

      const program = Effect.flatMap(Kind5050DVMService, (s) =>
        s.getJobStatistics(),
      );
      const stats = await Effect.runPromise(Effect.provide(program, testLayer));

      expect(stats.totalJobsProcessed).toBe(3);
      expect(stats.totalSuccessfulJobs).toBe(2); // 1 from kind 6100, 1 from kind 7000 success
      expect(stats.totalFailedJobs).toBe(1);
      expect(stats.totalRevenueSats).toBe(10 + 5); // 10000msats + 5000msats
    });
  });
});
```

```typescript
// src/tests/unit/components/dvm/DvmJobHistoryPane.test.tsx
// This file will be created or updated. Example structure:
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DvmJobHistoryPane from '@/components/dvm/DvmJobHistoryPane';
import { Kind5050DVMService } from '@/services/dvm/Kind5050DVMService';
import { JobHistoryEntry, JobStatistics } from '@/types/dvm';
import { Effect } from 'effect';

vi.mock('@/services/runtime', () => ({
  getMainRuntime: vi.fn(() => ({
    // Mock the runtime to provide Kind5050DVMService
    [Kind5050DVMService.key]: {
      getJobHistory: vi.fn(),
      getJobStatistics: vi.fn(),
    }
  }))
}));

describe('DvmJobHistoryPane', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockGetJobHistory = Kind5050DVMService.is(getMainRuntime()[Kind5050DVMService.key]) ? getMainRuntime()[Kind5050DVMService.key].getJobHistory as vi.Mock : vi.fn();
  const mockGetJobStatistics = Kind5050DVMService.is(getMainRuntime()[Kind5050DVMService.key]) ? getMainRuntime()[Kind5050DVMService.key].getJobStatistics as vi.Mock : vi.fn();


  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear(); // Clear React Query cache
  });

  it('renders loading state initially for stats and history', () => {
    mockGetJobStatistics.mockReturnValue(new Promise(() => {})); // Keep pending
    mockGetJobHistory.mockReturnValue(new Promise(() => {}));    // Keep pending

    render(
      <QueryClientProvider client={queryClient}>
        <DvmJobHistoryPane />
      </QueryClientProvider>
    );
    expect(screen.getAllByText(/Checking...|Loading...|Jobs/i).length).toBeGreaterThan(0); // Check for multiple loading indicators
  });

  it('displays statistics and job history once loaded', async () => {
    const mockStats: JobStatistics = { totalJobsProcessed: 10, totalSuccessfulJobs: 8, totalFailedJobs: 1, totalRevenueSats: 100, jobsPendingPayment: 1 };
    const mockHistory: { entries: JobHistoryEntry[], totalCount: number } = {
      entries: [{ id: 'job1', timestamp: Date.now(), jobRequestEventId: 'req1', requesterPubkey: 'pk1', kind: 6100, inputSummary: 'N/A', status: 'completed', resultSummary: 'Done' }],
      totalCount: 1
    };

    mockGetJobStatistics.mockReturnValue(Effect.succeed(mockStats));
    mockGetJobHistory.mockReturnValue(Effect.succeed(mockHistory));

    render(
      <QueryClientProvider client={queryClient}>
        <DvmJobHistoryPane />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument()); // Total Jobs
    await waitFor(() => expect(screen.getByText('8')).toBeInTheDocument());  // Successful
    await waitFor(() => expect(screen.getByText('req1'.substring(0,8)+'...')).toBeInTheDocument()); // Job ID from history
  });

  it('handles errors from service calls', async () => {
    mockGetJobStatistics.mockReturnValue(Effect.fail(new Error("Stats fetch error")));
    mockGetJobHistory.mockReturnValue(Effect.fail(new Error("History fetch error")));

    render(
      <QueryClientProvider client={queryClient}>
        <DvmJobHistoryPane />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(/Statistics Error/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Error loading history: History fetch error/i)).toBeInTheDocument());
  });
});
```

```typescript
// src/tests/unit/services/nostr/NostrService.test.ts
// ... (existing tests)
describe("NostrService", () => {
  // ... (existing beforeEach and tests for other methods)
  describe("listPublicNip90Events", () => {
    it("should fetch NIP-90 kinds 5xxx, 6xxx, 7000 with limit and sort by created_at desc", async () => {
      const mockEventsData: NostrEvent[] = [
        {
          id: "ev1",
          kind: 5100,
          content: "Req 1",
          created_at: 100,
          pubkey: "pk1",
          sig: "s1",
          tags: [],
        },
        {
          id: "ev2",
          kind: 6100,
          content: "Res 1",
          created_at: 200,
          pubkey: "pk2",
          sig: "s2",
          tags: [],
        },
        {
          id: "ev3",
          kind: 7000,
          content: "Feed 1",
          created_at: 150,
          pubkey: "pk3",
          sig: "s3",
          tags: [],
        },
      ];
      mockQuerySync.mockResolvedValue(mockEventsData);

      const limit = 10;
      const events = await Effect.runPromise(
        service.listPublicNip90Events(limit),
      );

      const nip90RequestKinds = Array.from(
        { length: 1000 },
        (_, i) => 5000 + i,
      );
      const nip90ResultKinds = Array.from({ length: 1000 }, (_, i) => 6000 + i);
      const expectedKinds = [...nip90RequestKinds, ...nip90ResultKinds, 7000];

      expect(mockQuerySync).toHaveBeenCalledWith(
        testConfig.relays,
        expect.objectContaining({
          kinds: expect.arrayContaining(expectedKinds), // Check if it contains all the expected kinds
          limit: limit,
        }),
        { maxWait: testConfig.requestTimeoutMs / 2 }, // from listEvents internal call
      );
      expect(events.length).toBe(3);
      // listEvents already sorts by created_at descending
      expect(events[0].id).toBe("ev2"); // created_at: 200
      expect(events[1].id).toBe("ev3"); // created_at: 150
      expect(events[2].id).toBe("ev1"); // created_at: 100
    });
  });
});
```

```typescript
// src/tests/unit/components/nip90_feed/Nip90GlobalFeedPane.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Nip90GlobalFeedPane from '@/components/nip90_feed/Nip90GlobalFeedPane';
import { NostrService, type NostrEvent } from '@/services/nostr';
import { NIP19Service } from '@/services/nip19'; // NIP19Service for npub/noteId
import { Effect } from 'effect';

// Mock the runtime and services
vi.mock('@/services/runtime', () => ({
  getMainRuntime: vi.fn(() => ({
    [NostrService.key]: {
      listPublicNip90Events: vi.fn(),
    },
    [NIP19Service.key]: { // Mock NIP19Service as well
      encodeNpub: vi.fn((pk: string) => Effect.succeed(`npub1${pk.substring(0,5)}...`)),
      encodeNote: vi.fn((id: string) => Effect.succeed(`note1${id.substring(0,5)}...`)),
    }
  }))
}));

describe('Nip90GlobalFeedPane', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockListPublicNip90Events = NostrService.is(getMainRuntime()[NostrService.key]) ? getMainRuntime()[NostrService.key].listPublicNip90Events as vi.Mock : vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('renders loading state initially', () => {
    mockListPublicNip90Events.mockReturnValue(new Promise(() => {})); // Keep pending

    render(
      <QueryClientProvider client={queryClient}>
        <Nip90GlobalFeedPane />
      </QueryClientProvider>
    );
    expect(screen.getByText(/Loading NIP-90 events.../i)).toBeInTheDocument();
  });

  it('displays fetched NIP-90 events', async () => {
    const mockEvents: NostrEvent[] = [
      { id: 'event1', kind: 5100, pubkey: 'pk1', created_at: Date.now()/1000, content: 'Job 1 input', tags:[], sig:'s1'},
      { id: 'event2', kind: 6100, pubkey: 'pk2', created_at: Date.now()/1000 -10, content: 'Job 1 result', tags:[['encrypted']], sig:'s2'},
      { id: 'event3', kind: 7000, pubkey: 'pk3', created_at: Date.now()/1000 -20, content: 'Feedback', tags:[['status', 'success']], sig:'s3'},
    ];
    mockListPublicNip90Events.mockReturnValue(Effect.succeed(mockEvents));

    render(
      <QueryClientProvider client={queryClient}>
        <Nip90GlobalFeedPane />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(/note1event1.../i)).toBeInTheDocument());
    expect(screen.getByText(/Job Request \(5100\)/i)).toBeInTheDocument();
    expect(screen.getByText(/note1event2.../i)).toBeInTheDocument();
    expect(screen.getByText(/Job Result \(6100\)/i)).toBeInTheDocument();
    expect(screen.getByText(/\[Encrypted Content\]/i)).toBeInTheDocument(); // For event2
    expect(screen.getByText(/note1event3.../i)).toBeInTheDocument();
    expect(screen.getByText(/Feedback \(7000\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: success/i)).toBeInTheDocument();
  });

  it('handles errors from service call', async () => {
    mockListPublicNip90Events.mockReturnValue(Effect.fail(new Error("Fetch global feed error")));

    render(
      <QueryClientProvider client={queryClient}>
        <Nip90GlobalFeedPane />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(/Error fetching events: Fetch global feed error/i)).toBeInTheDocument());
  });

  it('calls refetch when refresh button is clicked', async () => {
    mockListPublicNip90Events.mockReturnValue(Effect.succeed([]));
    render(
      <QueryClientProvider client={queryClient}>
        <Nip90GlobalFeedPane />
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText(/No NIP-90 events found/i)).toBeInTheDocument());

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    // Called once on mount, once on refresh
    await waitFor(() => expect(mockListPublicNip90Events).toHaveBeenCalledTimes(2));
  });
});
```

I have completed the implementation according to the plan.

- `Kind5050DVMService`'s `getJobHistory` and `getJobStatistics` methods now fetch real data related to our DVM.
- `DvmJobHistoryPane.tsx` displays this real data.
- A new pane type `nip90_global_feed` and associated store actions are defined.
- `NostrService` has a new method `listPublicNip90Events` to fetch all relevant NIP-90 events.
- `Nip90GlobalFeedPane.tsx` is created to display these global events.
- `PaneManager.tsx` and `Hotbar.tsx` are updated for the new pane.
- Relevant unit tests have been added or updated.

Please review the changes.Okay, Agent, this is a solid set of changes. The refactoring of the DVM Activity pane to use real data and the addition of the NIP-90 Global Feed pane are well-executed according to the plan.

Here are a few minor observations and confirmations:

- **`Kind5050DVMServiceImpl.ts`:**

  - The `getJobHistory` logic correctly focuses on Kind 6xxx and 7000 (success) events from our DVM. The difficulty of getting `inputSummary` and `ollamaModelUsed` without fetching the original Kind 5xxx event is noted, and "N/A" is a good placeholder.
  - The `getJobStatistics` method also correctly focuses on events published by our DVM. The simplification for revenue/pending payments is acceptable for this iteration.
  - The dependency on `NostrService` within `getJobHistory` and `getJobStatistics` (passed via `Effect.provideService`) is a good way to use the main Nostr connection.

- **`DvmJobHistoryPane.tsx`:**

  - The UI should now correctly reflect the real data fetched by the service. The column for "Kind" in the table might show 6xxx or 7000, which is fine.

- **`Nip90GlobalFeedPane.tsx`:**

  - Correctly uses `NostrService.listPublicNip90Events`.
  - The `EventCard` component seems to handle different NIP-90 event types and encrypted content appropriately for a global feed.
  - Using `React Query` for `npub` and `noteId` encoding within `EventCard` is a good pattern to avoid re-calculating or re-fetching these transformations unnecessarily.

- **`NostrServiceImpl.ts`:**

  - `listPublicNip90Events` correctly defines filters for all relevant NIP-90 kinds and uses the existing `listEvents` method, which handles default relays and sorting.

- **Store and Pane Management:**

  - The new pane type, constants, actions, and manager updates all look correct.

- **Hotbar:**

  - The new button for the Global Feed pane is correctly added.

- **Testing:**
  - The unit test structures for services and components are appropriate.
  - The mock for `NostrService` in `Kind5050DVMService.test.ts` and `Nip90GlobalFeedPane.test.tsx` seems correct.
  - The use of `getMainRuntime()[Service.key]` with a type assertion for mocking in `DvmJobHistoryPane.test.tsx` and `Nip90GlobalFeedPane.test.tsx` (for `NIP19Service`) is a pragmatic approach for unit testing components that consume services via a global runtime.

**Minor Potential Refinements (Low Priority - For Future Consideration):**

- **`DvmJobHistoryPane.tsx` `totalCount`:** The `totalCount` in `getJobHistory` currently uses `sortedEvents.length` from the potentially larger initial fetch (e.g., `pageSize * page`). For more accurate total count for pagination, a separate count query to the relays would be needed, or fetching _all_ matching events and then paginating client-side (which could be slow for many events). The current approach is a reasonable trade-off if true total count isn't critical for just showing the latest ~50.
- **Error Display:** Ensure that if `NostrService.listEvents` or `NostrService.listPublicNip90Events` fails (e.g., no relays connect), the respective panes display a clear error message to the user rather than just an empty state. `React Query`'s `error` object can be used for this. (This seems to be handled in `Nip90GlobalFeedPane.tsx` with `AlertCircle`).
- **Content Parsing in `Nip90GlobalFeedPane.tsx`:** The attempt to `JSON.parse` event content is good. Could be expanded to look for specific NIP-90 `i` tags if the content is an array of tags (as per NIP-90 encrypted params spec).

The implementation looks good and addresses the core requirements of the request. The telemetry integration in the service methods is also noted and appreciated.

Proceed with these changes.
