Okay, Agent, your next task is to implement the "UI for displaying job history and statistics" for the Selling Compute feature. This will involve creating a new pane that shows an overview of DVM activity, earnings, and a list of past jobs.

**Preamble:**

*   **Data Persistence:** This UI will display job history and statistics. The `Kind5050DVMService` is responsible for processing jobs. For this UI task, you will assume that `Kind5050DVMService` will be enhanced (in a separate future task) to persist job details and calculate statistics, making them available through new service methods.
*   **Your Focus:** Your primary focus is on building the UI components and integrating them with placeholder/stubbed service methods.
*   **Mock Data:** For now, the new service methods in `Kind5050DVMService` should return mock data until the persistence layer is implemented.

Here are the specific instructions:

**1. Define Data Structures for Job History and Statistics**

*   Create a new file: `src/types/dvm.ts`
*   Add the following interfaces to this file:

    ```typescript
    // src/types/dvm.ts

    export type JobStatus = 'pending_payment' | 'processing' | 'paid' | 'completed' | 'error' | 'cancelled';

    export interface JobHistoryEntry {
      id: string; // Unique ID for the history entry (e.g., could be derived from jobRequestEventId or a UUID)
      timestamp: number; // Unix timestamp of when the job request was received or processed
      jobRequestEventId: string; // ID of the original NIP-90 job request event (kind 5xxx)
      requesterPubkey: string; // Pubkey of the user who requested the job
      kind: number; // Original job kind (e.g., 5100)
      inputSummary: string; // A brief summary of the job input (e.g., first 50 chars of a prompt)
      status: JobStatus;
      ollamaModelUsed?: string; // Model used for processing
      tokensProcessed?: number; // If applicable, e.g., for text generation
      invoiceAmountSats?: number; // Amount in sats requested
      paymentReceivedSats?: number; // Amount in sats actually received (for future payment verification)
      resultSummary?: string; // Brief summary of the result or "N/A"
      errorDetails?: string; // If status is 'error', details of the error
    }

    export interface JobStatistics {
      totalJobsProcessed: number;
      totalSuccessfulJobs: number;
      totalFailedJobs: number;
      totalRevenueSats: number; // Sum of `paymentReceivedSats` for paid/completed jobs
      jobsPendingPayment: number;
      averageProcessingTimeMs?: number; // Optional: For future calculation
      modelUsageCounts?: Record<string, number>; // e.g., { "gemma2:latest": 50, "llama3": 20 }
      // Add other relevant statistics as needed
    }
    ```

**2. Update `Kind5050DVMService` Interface and Implementation (with Stubs)**

*   **File:** `src/services/dvm/Kind5050DVMService.ts`
    *   Import `JobHistoryEntry` and `JobStatistics` from `src/types/dvm.ts`.
    *   Add the following methods to the `Kind5050DVMService` interface:

        ```typescript
        // ... existing interface methods ...
        getJobHistory(options: { page: number; pageSize: number; filters?: Partial<JobHistoryEntry> }): Effect.Effect<{ entries: JobHistoryEntry[]; totalCount: number }, DVMError | TrackEventError, never>;
        getJobStatistics(): Effect.Effect<JobStatistics, DVMError | TrackEventError, never>;
        ```

*   **File:** `src/services/dvm/Kind5050DVMServiceImpl.ts`
    *   Import the new types.
    *   Add stub implementations for the new methods within the object returned by `Effect.gen(function* (_) { ... })`. These stubs should return mock data.

    ```typescript
    // src/services/dvm/Kind5050DVMServiceImpl.ts
    // ... other imports
    import type { JobHistoryEntry, JobStatistics } from '@/types/dvm'; // Import new types

    // ... inside Kind5050DVMServiceLive = Layer.scoped(...) return { ... }

        // ... existing methods: startListening, stopListening, isListening ...

        getJobHistory: (options: { page: number; pageSize: number; filters?: Partial<JobHistoryEntry> }) => Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({ category: 'dvm:history', action: 'get_job_history_stub', label: `Page: ${options.page}` }).pipe(Effect.ignoreLogged));
          // Mock data for now
          const mockHistory: JobHistoryEntry[] = [
            { id: 'job1', timestamp: Date.now() - 3600000, jobRequestEventId: 'req1', requesterPubkey: 'pk_requester1', kind: 5100, inputSummary: 'Translate to French: Hello world', status: 'completed', ollamaModelUsed: 'gemma2:latest', tokensProcessed: 120, invoiceAmountSats: 20, paymentReceivedSats: 20, resultSummary: 'Bonjour le monde' },
            { id: 'job2', timestamp: Date.now() - 7200000, jobRequestEventId: 'req2', requesterPubkey: 'pk_requester2', kind: 5100, inputSummary: 'Summarize this article...', status: 'error', ollamaModelUsed: 'gemma2:latest', errorDetails: 'Ollama connection failed' },
            { id: 'job3', timestamp: Date.now() - 10800000, jobRequestEventId: 'req3', requesterPubkey: 'pk_requester1', kind: 5000, inputSummary: 'Image generation: cat astronaut', status: 'pending_payment', ollamaModelUsed: 'dall-e-stub', invoiceAmountSats: 100 },
          ];
          const paginatedEntries = mockHistory.slice((options.page - 1) * options.pageSize, options.page * options.pageSize);
          return { entries: paginatedEntries, totalCount: mockHistory.length };
        }),

        getJobStatistics: () => Effect.gen(function* (_) {
          yield* _(telemetry.trackEvent({ category: 'dvm:stats', action: 'get_job_statistics_stub' }).pipe(Effect.ignoreLogged));
          // Mock data for now
          const mockStats: JobStatistics = {
            totalJobsProcessed: 125,
            totalSuccessfulJobs: 90,
            totalFailedJobs: 15,
            totalRevenueSats: 1850,
            jobsPendingPayment: 20,
            modelUsageCounts: { "gemma2:latest": 70, "llama3:instruct": 20, "other_model": 5 },
          };
          return mockStats;
        }),
    // ...
    ```

**3. Create New Pane Type and Store Integration**

*   **File:** `src/types/pane.ts`
    *   Add `'dvm_job_history'` to the `Pane.type` union:
        ```typescript
        export type Pane = {
          // ...
          type: 'default' | 'chat' | 'chats' | /* ...other types... */ | 'sell_compute' | 'dvm_job_history' | string;
          // ...
        }
        ```
*   **Create File:** `src/stores/panes/actions/openDvmJobHistoryPane.ts`
    ```typescript
    // src/stores/panes/actions/openDvmJobHistoryPane.ts
    import { type PaneInput } from '@/types/pane';
    import { type PaneStoreType, type SetPaneStore } from '../types';
    import { addPaneActionLogic } from './addPane';

    export const DVM_JOB_HISTORY_PANE_ID = 'dvm_job_history';

    export function openDvmJobHistoryPaneAction(set: SetPaneStore) {
      set((state: PaneStoreType) => {
        const existingPane = state.panes.find(p => p.id === DVM_JOB_HISTORY_PANE_ID);
        if (existingPane) {
          const newPanes = state.panes
            .map(p => ({ ...p, isActive: p.id === DVM_JOB_HISTORY_PANE_ID }))
            .sort((a, b) => (a.isActive ? 1 : -1)); // Active last
          return { ...state, panes: newPanes, activePaneId: DVM_JOB_HISTORY_PANE_ID, lastPanePosition: { x: existingPane.x, y: existingPane.y, width: existingPane.width, height: existingPane.height }};
        }

        const newPaneInput: PaneInput = {
          id: DVM_JOB_HISTORY_PANE_ID,
          type: 'dvm_job_history',
          title: 'DVM Job History & Stats',
          dismissable: true,
          width: 800, // Larger default size
          height: 600,
        };
        const changes = addPaneActionLogic(state, newPaneInput, true);
        return { ...state, ...changes };
      });
    }
    ```
*   **File:** `src/stores/panes/actions/index.ts`
    *   Export the new action: `export * from './openDvmJobHistoryPane';`
*   **File:** `src/stores/panes/types.ts`
    *   Add the action to `PaneStoreType`: `openDvmJobHistoryPane: () => void;`
*   **File:** `src/stores/pane.ts`
    *   Import and wire up the action:
        ```typescript
        import { /* ..., */ openDvmJobHistoryPaneAction } from "./panes/actions";
        // ...
        export const usePaneStore = create<PaneStoreType>()(
          persist(
            (set, get) => ({
              // ... existing actions
              openDvmJobHistoryPane: () => openDvmJobHistoryPaneAction(set),
            }), /* ... */
          )
        );
        ```

**4. Add Button to Hotbar**

*   **File:** `src/components/hud/Hotbar.tsx`
    *   Import a suitable icon, e.g., `History` or `ListChecks` from `lucide-react`.
    *   Add a new `HotbarItem` to open the DVM Job History pane. Assign it to an available slot (e.g., slot 6).

    ```typescript
    // src/components/hud/Hotbar.tsx
    import { RefreshCw, Hand, MessageSquarePlus, Cpu, Store, History } from 'lucide-react'; // Added History
    // ...
    interface HotbarProps {
      // ...
      onOpenDvmJobHistoryPane: () => void; // Add new prop
    }

    export const Hotbar: React.FC<HotbarProps> = ({ /*...,*/ onOpenDvmJobHistoryPane }) => {
      // ...
      const DVM_JOB_HISTORY_PANE_ID = 'dvm_job_history'; // Define constant
      // ...
      return (
        <div /* ... */>
          {/* ... existing items ... */}
          <HotbarItem slotNumber={5} onClick={onOpenSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID}>
            <Store className="w-5 h-5 text-muted-foreground" />
          </HotbarItem>
          <HotbarItem slotNumber={6} onClick={onOpenDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
            <History className="w-5 h-5 text-muted-foreground" />
          </HotbarItem>
          {/* Adjust placeholder slots accordingly, e.g., Array.from({ length: 3 }) for slots 7-9 */}
          {Array.from({ length: 3 }).map((_, index) => (
            <HotbarItem key={`empty-${7 + index}`} slotNumber={7 + index} title={`Slot ${7 + index}`} className="opacity-30 cursor-not-allowed hover:bg-background/70">
            </HotbarItem>
          ))}
        </div>
      );
    };
    ```
*   **File:** `src/pages/HomePage.tsx`
    *   Update the `usePaneStore` selector to include `openDvmJobHistoryPane`.
    *   Pass `onOpenDvmJobHistoryPane={openDvmJobHistoryPane}` to the `Hotbar` component.

    ```typescript
    // src/pages/HomePage.tsx
    // ...
    export default function HomePage() {
      // ...
      const { panes, bringPaneToFront, updatePanePosition, activePaneId, openSellComputePane, openDvmJobHistoryPane } = usePaneStore(
        (state) => ({
          // ... existing
          openDvmJobHistoryPane: state.openDvmJobHistoryPane, // Add this
        })
      );
      // ...
      return (
        // ...
        <Hotbar
          isHandTrackingActive={isHandTrackingActive}
          onToggleHandTracking={toggleHandTracking}
          onOpenSellComputePane={openSellComputePane}
          onOpenDvmJobHistoryPane={openDvmJobHistoryPane} // Pass new prop
        />
        // ...
      );
    }
    ```

**5. Create `DvmJobHistoryPane.tsx` Component**

*   **Create File:** `src/components/dvm/DvmJobHistoryPane.tsx`
*   **Content:**

    ```typescript
    // src/components/dvm/DvmJobHistoryPane.tsx
    import React, { useState } from 'react';
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
        keepPreviousData: true,
      });

      // Telemetry for opening the pane
      Effect.runFork(
        Effect.flatMap(TelemetryService, ts => ts.trackEvent({
            category: 'ui:pane',
            action: 'open_dvm_job_history_pane'
        })).pipe(Effect.provide(runtime))
      );


      const totalPages = historyData ? Math.ceil(historyData.totalCount / ITEMS_PER_PAGE) : 0;

      const handleRefresh = () => {
        refetchStats();
        refetchHistory();
      };

      const getStatusBadgeVariant = (status: JobStatus): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
          case 'completed':
          case 'paid':
            return "default"; // Greenish in dark theme (assuming primary is "success like")
          case 'processing':
            return "secondary"; // Bluish or Greyish
          case 'pending_payment':
            return "outline"; // Yellowish or default outline
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
            <h2 className="text-lg font-semibold">DVM Activity Overview</h2>
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
                    <TableHead>Kind</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount (Sats)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingHistory && !historyData && Array.from({length: 5}).map((_, i) => (
                    <TableRow key={`loading-${i}`} className="animate-pulse">
                      <TableCell><div className="h-4 bg-muted rounded w-full"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-full"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-full"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-1/4"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-1/2"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-1/4"></div></TableCell>
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
                      <TableCell className="text-xs">{job.kind}</TableCell>
                      <TableCell><Badge variant={getStatusBadgeVariant(job.status)} className="text-[10px]">{job.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-xs text-right">{job.invoiceAmountSats ?? 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {historyData?.entries.length === 0 && !isLoadingHistory && (
                     <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No job history available.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Pagination Controls */}
          {historyData && totalPages > 0 && (
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
*   **Create File:** `src/components/dvm/index.ts` (if it doesn't exist, otherwise update it)
    ```typescript
    export { default as DVMSettingsDialog } from './DVMSettingsDialog'; // Assuming this was created
    export { default as DvmJobHistoryPane } from './DvmJobHistoryPane';
    ```

**6. Integrate `DvmJobHistoryPane` into `PaneManager.tsx`**

*   **File:** `src/panes/PaneManager.tsx`
    *   Import `DvmJobHistoryPane` from `@/components/dvm`.
    *   Add a case to render it:
        ```typescript
        // ...
        import { DvmJobHistoryPane } from '@/components/dvm'; // Add this
        // ...
        // Inside the map function:
        {pane.type === 'dvm_job_history' && <DvmJobHistoryPane />}
        // Ensure it's added to the exclusion list for the default placeholder too:
        // !( ... || pane.type === 'dvm_job_history' || ... )
        // And to the list of known types:
        /*
          ...
          pane.type === 'sell_compute' ||
          pane.type === 'dvm_job_history' || // Add this line
          pane.type === 'default'
        ) && <PlaceholderDefaultComponent type={pane.type} />}
        */
        ```

**7. Styling and UI Polish**

*   Use Tailwind CSS and Shadcn UI components consistently for styling.
*   Ensure the new pane fits well within the existing dark theme and HUD aesthetic.
*   Make the history table scrollable if content overflows.
*   The statistics section should be clear and easy to read.

**8. Telemetry**

*   In `DvmJobHistoryPane.tsx`:
    *   Track an event when the pane is opened.
    *   Track errors if data fetching for statistics or history fails, using `TelemetryService`.
*   In `Kind5050DVMServiceImpl.ts` (stubs):
    *   Add telemetry for when `getJobHistory` or `getJobStatistics` stubs are called.

**9. Testing (Conceptual)**

*   **Unit Tests for `DvmJobHistoryPane.tsx`:**
    *   Mock `Kind5050DVMService` and `useQuery`.
    *   Test that statistics are displayed correctly with mock data.
    *   Test that job history entries are rendered in the table.
    *   Test pagination functionality.
    *   Test loading and error states.
*   **Unit Tests for `useDVMSettingsStore.ts` (if modified for other reasons, not directly by this task).**
*   **E2E Tests (Playwright):**
    *   Test opening the DVM Job History pane from the Hotbar.
    *   Verify that (mock) data appears in the stats cards and history table.

This completes the instructions for the UI phase of displaying job history and statistics. The actual data population and persistence will be a subsequent task focused on the `Kind5050DVMService` backend.
