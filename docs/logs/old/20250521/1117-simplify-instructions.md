Okay, this is a clear direction for a "Compute Market" focused launch! We'll simplify the UI by hiding extraneous elements from the Hotbar and default view, concentrating on the "Sell Compute" workflow and adding a Bitcoin balance display.

Here are the specific instructions for the coding agent:

## UI Simplification for "Compute Market" Launch

**Guiding Principle:** "GO ONLINE, EARN BITCOIN" - The UI should be as simple as possible to support this core loop.

**Overall Objective:** Modify the Hotbar and default pane layout to present only essential elements for selling compute. Add a persistent Bitcoin balance display. Do _not_ remove any existing code from the codebase; only hide UI elements or change their default visibility/behavior.

---

**1. Modify Hotbar (`src/components/hud/Hotbar.tsx`)**

- **Objective:** Reduce Hotbar items to only those essential for the "Sell Compute" functionality.
- **Instructions:**
  1.  Open `src/components/hud/Hotbar.tsx`.
  2.  **Remove the following `HotbarItem` entries:**
      - The item for "New NIP-28 Channel" (originally Slot 3, `MessageSquarePlus` icon).
      - The item for "NIP-90 DVM Dashboard" (originally Slot 4, `Cpu` icon).
      - The item for "Toggle Hand Tracking" (originally Slot 2, `Hand` icon).
      - The item for "NIP-90 DVM Test" (originally Slot 7, `TestTube` icon).
      - The item for "NIP-90 Consumer Chat" (originally Slot 8, `MessageSquare` icon).
      - The item for "NIP-90 Global Feed" (originally Slot 9, `Globe` icon).
  3.  **Keep and Reorder the following `HotbarItem` entries:**
      - **Sell Compute:**
        - Icon: `Store`
        - Action: `onOpenSellComputePane`
        - Title: "Sell Compute"
        - **New Slot Number:** 1
        - Ensure `isActive` prop correctly reflects if `SELL_COMPUTE_PANE_ID` is the `activePaneId`.
      - **DVM Job History:**
        - Icon: `History`
        - Action: `onOpenDvmJobHistoryPane`
        - Title: "DVM Job History"
        - **New Slot Number:** 2
        - Ensure `isActive` prop correctly reflects if `DVM_JOB_HISTORY_PANE_ID` is the `activePaneId`.
      - **Reset HUD Layout:**
        - Icon: `RefreshCw`
        - Action: `resetHUDState`
        - Title: "Reset HUD Layout"
        - **New Slot Number:** 3
  4.  **Adjust Empty Slots:**
      - If the Hotbar is designed to have a fixed number of total slots (e.g., 9), update the `Array.from({ length: ... })` line that generates empty `HotbarItem`s to fill the remaining slots. For example, if you now have 3 active items and want 9 total slots, it would be `Array.from({ length: 6 })`.
      - Alternatively, if a dynamically sized Hotbar is preferred, remove the empty slot generation entirely so the Hotbar only shows the 3 active items. For simplicity, let's assume we want to keep the existing Hotbar structure and just fill remaining slots.

---

**2. Modify Default Pane Configuration (`src/stores/pane.ts`)**

- **Objective:** Ensure only the "Sell Compute" pane is open by default and is the active pane.
- **Instructions:**

  1.  Open `src/stores/pane.ts`.
  2.  Locate the `getInitialPanes` function.
  3.  Modify this function so that it _only_ creates and returns an array containing the "Sell Compute" pane configuration.

      - Remove the logic that adds the `DEFAULT_NIP28_PANE_ID` (Welcome Chat) pane.
      - The "Sell Compute" pane should be configured as `isActive: true`.
      - Example for the new `getInitialPanes` return:

        ```typescript
        const getInitialPanes = (): Pane[] => {
          const screenWidth =
            typeof window !== "undefined" ? window.innerWidth : 1920;
          const screenHeight =
            typeof window !== "undefined" ? window.innerHeight : 1080;

          return [
            {
              id: SELL_COMPUTE_PANE_ID_CONST,
              type: "sell_compute",
              title: "Sell Compute",
              x: Math.max(
                PANE_MARGIN,
                (screenWidth - SELL_COMPUTE_INITIAL_WIDTH) / 2,
              ),
              y: Math.max(
                PANE_MARGIN,
                (screenHeight - SELL_COMPUTE_INITIAL_HEIGHT) / 3,
              ),
              width: SELL_COMPUTE_INITIAL_WIDTH,
              height: SELL_COMPUTE_INITIAL_HEIGHT,
              isActive: true,
              dismissable: true,
              content: {},
            },
          ];
        };
        ```

  4.  Update the `initialState` definition:

      - `activePaneId` should be `SELL_COMPUTE_PANE_ID_CONST`.
      - `lastPanePosition` should be set based on the "Sell Compute" pane's initial position.

        ```typescript
        const initialState: PaneState = {
          panes: getInitialPanes(),
          activePaneId: SELL_COMPUTE_PANE_ID_CONST,
          lastPanePosition: null, // Will be set below
        };

        const sellComputePaneInitial = initialState.panes.find(
          (p) => p.id === SELL_COMPUTE_PANE_ID_CONST,
        );
        if (sellComputePaneInitial) {
          initialState.lastPanePosition = {
            x: sellComputePaneInitial.x,
            y: sellComputePaneInitial.y,
            width: sellComputePaneInitial.width,
            height: sellComputePaneInitial.height,
          };
        }
        ```

  5.  Review the `merge` function within the `persist` middleware options:
      - Ensure that if persisted state is loaded (e.g., from a previous session with multiple panes), it is overridden or merged in a way that results in only the "Sell Compute" pane being open initially, as per the new default.
      - A simple approach for the launch could be to largely ignore persisted pane layout if it doesn't match the new single-pane default, or to filter it to only keep/re-initialize the "Sell Compute" pane. The current `merge` function already has logic to reset if `SELL_COMPUTE_PANE_ID_CONST` is not the active pane. This might be sufficient, but verify it leads to the desired single "Sell Compute" pane on startup, even with old localStorage data.

---

**3. Create and Integrate Bitcoin Balance Display Component**

- **Objective:** Add a new, always-visible HUD element in the top-right corner to display the user's Bitcoin balance and allow opening the "Sell Compute" pane (acting as the wallet interface for now).
- **Instructions:**

  1.  **Create `src/components/hud/BitcoinBalanceDisplay.tsx`:**

      ```typescript
      // src/components/hud/BitcoinBalanceDisplay.tsx
      import React from 'react';
      import { useQuery } from '@tanstack/react-query';
      import { Effect, Exit, Cause } from 'effect';
      import { SparkService, type BalanceInfo } from '@/services/spark';
      import { getMainRuntime } from '@/services/runtime';
      import { usePaneStore } from '@/stores/pane';
      import { Button } from '@/components/ui/button'; // Or a simple div
      import { Bitcoin, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

      const BitcoinBalanceDisplay: React.FC = () => {
        const runtime = getMainRuntime();
        const openSellComputePane = usePaneStore((state) => state.openSellComputePane);

        const { data: balanceData, isLoading, error, refetch, isFetching } = useQuery<BalanceInfo, Error>({
          queryKey: ['bitcoinBalance'],
          queryFn: async () => {
            const program = Effect.flatMap(SparkService, s => s.getBalance());
            const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
            if (Exit.isSuccess(exitResult)) {
              return exitResult.value;
            }
            throw Cause.squash(exitResult.cause);
          },
          refetchInterval: 30000, // Refetch every 30 seconds
          refetchIntervalInBackground: true,
        });

        const handleDisplayClick = () => {
          openSellComputePane();
        };

        let displayContent;
        if (isLoading && !balanceData) {
          displayContent = <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading...</>;
        } else if (error) {
          displayContent = <><AlertTriangle className="h-3 w-3 mr-1 text-destructive" /> Error</>;
        } else if (balanceData) {
          displayContent = `⚡ ${balanceData.balance.toString()} sats`;
        } else {
          displayContent = <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Initializing...</>;
        }

        return (
          <div
            onClick={handleDisplayClick}
            title="Open Wallet / Sell Compute Pane"
            className="fixed top-4 right-4 z-[10000] p-2 h-8 flex items-center bg-background/70 border border-border/30 rounded-md shadow-lg backdrop-blur-sm text-xs font-mono text-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Bitcoin className="h-3 w-3 mr-1.5 text-yellow-500" />
            {displayContent}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); refetch(); }}
              disabled={isFetching || isLoading}
              className="ml-1.5 h-5 w-5 p-0"
              title="Refresh Balance"
            >
              {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>
        );
      };

      export default BitcoinBalanceDisplay;
      ```

  2.  **Add to `src/components/hud/index.ts` (optional but good practice):**
      ```typescript
      // src/components/hud/index.ts
      // ... existing exports ...
      export { default as BitcoinBalanceDisplay } from "./BitcoinBalanceDisplay";
      ```

---

**4. Modify Main Page (`src/pages/HomePage.tsx`)**

- **Objective:** Integrate the new `BitcoinBalanceDisplay` and remove UI elements for features being hidden. Default hand tracking to off.
- **Instructions:**
  1.  Open `src/pages/HomePage.tsx`.
  2.  **Import `BitcoinBalanceDisplay`:**
      ```typescript
      import BitcoinBalanceDisplay from "@/components/hud/BitcoinBalanceDisplay"; // Adjust path if index.ts is not used
      ```
  3.  **Render `BitcoinBalanceDisplay`:** Add `<BitcoinBalanceDisplay />` within the main returned JSX, ensuring it's not nested inside elements that would prevent its fixed positioning.
      ```typescript
      export default function HomePage() {
        // ... existing state and hooks ...
        return (
          <div className="relative w-full h-full overflow-hidden">
            <SimpleGrid />
            <PaneManager />
            <BitcoinBalanceDisplay /> {/* Add this line */}
            {/* HandTracking component is still here but its toggle is removed from UI */}
            <HandTracking
              showHandTracking={isHandTrackingActive}
              setShowHandTracking={setIsHandTrackingActive}
              onHandDataUpdate={handleHandDataUpdate}
            />
            <Hotbar /* ...props... */ />
          </div>
        );
      }
      ```
  4.  **Remove Standalone HUD Buttons:**
      - Delete the rendering of `<HandTrackingToggleButton ... />`.
      - Delete the rendering of `<NewChannelButton ... />`.
      - Delete the rendering of `<Nip90DashboardButton ... />`.
  5.  **Default Hand Tracking to Off:**
      - In the `useState` for `isHandTrackingActive`, change the default value to `false`:
        ```typescript
        const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
        ```
      - The `toggleHandTracking` function and `onHandDataUpdate` related to the `HandTracking` component should remain, as the core hand tracking code is preserved. The UI toggle is simply removed.

---

**Verification Steps after Implementation:**

1.  Start the application (`pnpm start`).
2.  **Hotbar:** Verify only three items appear: "Sell Compute", "DVM Job History", and "Reset HUD", in that order (or with empty slots if preferred).
3.  **Default Panes:** On fresh launch (or after clearing `localStorage` for `commander-pane-storage-v2`), verify that only the "Sell Compute" pane is open and active.
4.  **Bitcoin Balance Display:**
    - Verify a balance display appears in the top-right corner.
    - It should show a loading state initially, then the balance (or an error if `SparkService` fails).
    - Verify clicking the balance display opens (or brings to front and activates) the "Sell Compute" pane.
    - Verify the refresh button on the balance display works.
5.  **Hidden Features:**
    - Confirm no buttons for NIP-28, NIP-90 Dashboard, Hand Tracking toggle, etc., are visible on the main HUD.
    - Confirm hand tracking is off by default. (The debug hand landmarks overlay from `HandTracking.tsx` should not be visible).
6.  **Core "Sell Compute" Workflow:** Test that the "Sell Compute" pane functions as expected (checking Spark/Ollama status, going online/offline). This ensures that removing other UI elements hasn't broken the core feature.

This set of changes should achieve the desired simplified UI for the "Compute Market" launch.
