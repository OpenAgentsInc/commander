Okay, I will provide specific instructions for the coding agent to implement the "Coder" mode.

**I. Project Setup & Dependencies**

- No new dependencies are required for this initial implementation.
- Ensure `lucide-react` is already in `package.json` for icons.

**II. Implement the "Coder" Mode UI and Logic**

**1. Create the Coder View Component**

- Create a new directory: `src/components/coder/`
- Create a new file: `src/components/coder/CoderView.tsx`
- **Content for `src/components/coder/CoderView.tsx`:**

  ```typescript
  import React from 'react';
  import { Button } from '@/components/ui/button';
  import { Pencil, X } from 'lucide-react'; // Pencil for Edit, X for potential close
  import { useNavigate } from '@tanstack/react-router';
  import { Effect } from 'effect';
  import { TelemetryService } from '@/services/telemetry';
  import { getMainRuntime } from '@/services/runtime';

  const CoderView: React.FC = () => {
    const navigate = useNavigate();
    const runtime = getMainRuntime(); // For telemetry

    const handleEditClick = () => {
      Effect.runFork(
        Effect.flatMap(TelemetryService, (ts) =>
          ts.trackEvent({
            category: 'coder_mode',
            action: 'edit_button_click',
          }),
        ).pipe(Effect.provide(runtime)),
      );
      // TODO: Define actual "Edit" functionality.
      // For now, it could log or be a placeholder.
      console.log("Coder Mode: Edit button clicked.");
    };

    const handleExitCoderMode = React.useCallback(() => {
      Effect.runFork(
        Effect.flatMap(TelemetryService, (ts) =>
          ts.trackEvent({
            category: 'coder_mode',
            action: 'exit_coder_mode_escape',
          }),
        ).pipe(Effect.provide(runtime)),
      );
      navigate({ to: '/' });
    }, [navigate, runtime]);

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          handleExitCoderMode();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [handleExitCoderMode]);

    // Track Coder Mode open event
    React.useEffect(() => {
      Effect.runFork(
        Effect.flatMap(TelemetryService, (ts) =>
          ts.trackEvent({
            category: 'coder_mode',
            action: 'coder_mode_opened',
          }),
        ).pipe(Effect.provide(runtime)),
      );
    }, [runtime]);

    return (
      <div className="fixed inset-0 z-[9998] flex h-screen w-screen flex-col items-center bg-black p-4">
        {/* Top bar for Edit button and potential future controls */}
        <div className="absolute top-0 left-0 right-0 flex justify-center p-3">
          <Button
            variant="outline"
            className="border-gray-700 bg-black text-gray-400 hover:border-gray-500 hover:bg-gray-900 hover:text-gray-200"
            onClick={handleEditClick}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
        {/*
          Coder Mode Content Area:
          This is where the main content for Coder Mode will go.
          For now, it's just a black screen.
          Example: A large text editor or code display area.
        */}
      </div>
    );
  };

  export default CoderView;
  ```

- Create an `index.ts` in `src/components/coder/`:
  ```typescript
  // src/components/coder/index.ts
  export { default as CoderView } from "./CoderView";
  ```

**2. Add Routing for Coder Mode**

- **Modify `src/routes/routes.tsx`:**

  ```typescript
  import { RootRoute } from "./__root";
  import HomePage from "../pages/HomePage";
  import { CoderView } from "@/components/coder"; // Import CoderView
  import { createRoute } from "@tanstack/react-router";

  export const HomeRoute = createRoute({
    getParentRoute: () => RootRoute,
    path: "/",
    component: HomePage,
  });

  // New Coder Mode Route
  export const CoderRoute = createRoute({
    getParentRoute: () => RootRoute, // Assumes Coder Mode uses the BaseLayout for window dragging
    path: "/coder",
    component: CoderView,
  });

  export const rootTree = RootRoute.addChildren([
    HomeRoute,
    CoderRoute, // Add the new route
    // Ensure other routes like SecondPageRoute are also here if they exist
  ]);
  ```

- **Review `src/routes/__root.tsx`:**
  - The current `BaseLayout` includes `DragWindowRegion`. This is desirable for Coder Mode to keep the app window draggable.
  - `BaseLayout` also has `p-2` padding on `main`. The `CoderView` component uses `fixed inset-0` which should cover this padding and make the background fully black.
  - The Hotbar is rendered within `HomePage.tsx`, so it will not be visible on the `/coder` route, which is correct.

**III. Update Hotbar Functionality**

**1. Modify `src/components/hud/Hotbar.tsx`:**

- Import the `CodeXml` icon from `lucide-react`.
- Import `useNavigate` and `useRouterState` from `@tanstack/react-router`.
- Update the component to include the new Coder Mode button as slot 1 and adjust others.

  ```typescript
  import React from "react";
  import { cn } from "@/utils/tailwind";
  import { HotbarItem } from "./HotbarItem";
  import { Store, History, Wallet, Bot, MessageSquare, CodeXml, Hand } from "lucide-react"; // Added CodeXml and Hand
  import { usePaneStore } from "@/stores/pane";
  import { useShallow } from "zustand/react/shallow";
  import { useNavigate, useRouterState } from "@tanstack/react-router"; // Added router hooks
  import { Effect } from 'effect';
  import { TelemetryService } from '@/services/telemetry';
  import { getMainRuntime } from '@/services/runtime';
  import {
    SELL_COMPUTE_PANE_ID_CONST,
    WALLET_PANE_ID,
    AGENT_CHAT_PANE_ID,
    PREVIOUS_CHATS_PANE_ID,
  } from "@/stores/panes/constants";
  import { DVM_JOB_HISTORY_PANE_ID } from "@/stores/panes/actions/openDvmJobHistoryPane";


  interface HotbarProps {
    className?: string;
    isHandTrackingActive: boolean;
    onToggleHandTracking: () => void;
    // Keep existing toggle functions for other panes
    onToggleSellComputePane: () => void;
    onToggleWalletPane: () => void;
    onToggleDvmJobHistoryPane: () => void;
    onToggleAgentChatPane: () => void;
    onTogglePreviousChatsPane?: () => void;
  }

  export const Hotbar: React.FC<HotbarProps> = ({
    className,
    isHandTrackingActive,
    onToggleHandTracking,
    onToggleSellComputePane,
    onToggleWalletPane,
    onToggleDvmJobHistoryPane,
    onToggleAgentChatPane,
    onTogglePreviousChatsPane,
  }) => {
    const navigate = useNavigate();
    const routerState = useRouterState();
    const runtime = getMainRuntime();

    const { activePaneId } = usePaneStore(
      useShallow((state) => ({
        activePaneId: state.activePaneId,
      })),
    );

    const isCoderModeActive = routerState.location.pathname === '/coder';

    const handleCoderModeClick = () => {
      Effect.runFork(
        Effect.flatMap(TelemetryService, (ts) =>
          ts.trackEvent({
            category: 'coder_mode',
            action: 'hotbar_button_click',
          }),
        ).pipe(Effect.provide(runtime)),
      );
      if (isCoderModeActive) {
        navigate({ to: '/' }); // Navigate back to home if already in Coder Mode
      } else {
        navigate({ to: '/coder' });
      }
    };

    const numActualItems = 4 + (onTogglePreviousChatsPane ? 1 : 0) + 1; // +1 for Coder mode, +1 for Hand tracking
    const numEmptySlots = Math.max(0, 9 - numActualItems);


    return (
      <div
        className={cn(
          "bg-background/50 border-border/30 fixed bottom-4 left-1/2 z-[10000] flex -translate-x-1/2 transform space-x-1 rounded-md border p-1 shadow-lg backdrop-blur-sm",
          className,
        )}
      >
        {/* Slot 1: Coder Mode */}
        <HotbarItem
          slotNumber={1}
          onClick={handleCoderModeClick}
          title={isCoderModeActive ? "Exit Coder Mode" : "Coder Mode"}
          isActive={isCoderModeActive}
        >
          <CodeXml className="text-muted-foreground h-5 w-5" />
        </HotbarItem>

        {/* Slot 2: Sell Compute (was 1) */}
        <HotbarItem
          slotNumber={2}
          onClick={onToggleSellComputePane}
          title="Sell Compute"
          isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}
        >
          <Store className="text-muted-foreground h-5 w-5" />
        </HotbarItem>

        {/* Slot 3: Wallet (was 2) */}
        <HotbarItem
          slotNumber={3}
          onClick={onToggleWalletPane}
          title="Wallet"
          isActive={activePaneId === WALLET_PANE_ID}
        >
          <Wallet className="text-muted-foreground h-5 w-5" />
        </HotbarItem>

        {/* Slot 4: DVM Job History (was 3) */}
        <HotbarItem
          slotNumber={4}
          onClick={onToggleDvmJobHistoryPane}
          title="DVM Job History"
          isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}
        >
          <History className="text-muted-foreground h-5 w-5" />
        </HotbarItem>

        {/* Slot 5: Agent Chat (was 4) */}
        <HotbarItem
          slotNumber={5}
          onClick={onToggleAgentChatPane}
          title="Agent Chat"
          isActive={activePaneId === AGENT_CHAT_PANE_ID}
        >
          <Bot className="text-muted-foreground h-5 w-5" />
        </HotbarItem>

        {/* Slot 6: Previous Chats (was 5, conditional) */}
        {onTogglePreviousChatsPane && (
          <HotbarItem
            slotNumber={6}
            onClick={onTogglePreviousChatsPane}
            title="Chat History"
            isActive={activePaneId === PREVIOUS_CHATS_PANE_ID}
          >
            <MessageSquare className="text-muted-foreground h-5 w-5" />
          </HotbarItem>
        )}

        {/* Fill remaining slots with empty HotbarItems up to slot 8 */}
        {/* Max 3 empty slots if previous chats is present, max 4 if not */}
        {Array.from({ length: onTogglePreviousChatsPane ? 2 : 3 }).map((_, i) => (
           <HotbarItem key={`empty-slot-${i}`} slotNumber={i + (onTogglePreviousChatsPane ? 7 : 6)} isGhost>
             <span className="h-5 w-5" />
           </HotbarItem>
         ))}

        {/* Slot 9: Hand Tracking (remains slot 9) */}
        <HotbarItem
          slotNumber={9}
          onClick={onToggleHandTracking}
          title={
            isHandTrackingActive
              ? "Disable Hand Tracking"
              : "Enable Hand Tracking"
          }
          isActive={isHandTrackingActive}
        >
          <Hand className="text-muted-foreground h-5 w-5" />
        </HotbarItem>
      </div>
    );
  };
  ```

**2. Update Keyboard Shortcuts in `src/pages/HomePage.tsx`:**

- Modify the `handleGlobalKeyDown` function to map `Ctrl+1`/`Cmd+1` to navigate to `/coder`.
- Adjust other hotkeys to their new slot numbers.

  ```typescript
  // Inside src/pages/HomePage.tsx
  // ... other imports ...
  import { useNavigate } from "@tanstack/react-router"; // Add this

  export default function HomePage() {
    const navigate = useNavigate(); // Add this
    // ... existing state and store hooks ...

    // Update toggleSellComputePane to match new hotbar slot number if needed
    // For example, if it moved from 1 to 2
    // const { panes, ..., toggleSellComputePane: originalToggleSellComputePane } = usePaneStore(...)
    // const toggleSellComputePane = useCallback(() => {
    //    console.log("Hotkey for Sell Compute (now slot 2) triggered");
    //    originalToggleSellComputePane();
    // }, [originalToggleSellComputePane]);
    // Repeat for other hotbar actions that shifted.

    useEffect(() => {
      const handleGlobalKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          // ... (existing Escape logic) ...
          return;
        }

        const modifier = isMacOs() ? event.metaKey : event.ctrlKey;
        if (!modifier) return;

        const digit = parseInt(event.key);
        if (isNaN(digit) || digit < 1 || digit > 9) return;

        event.preventDefault();

        switch (digit) {
          case 1: // New: Coder Mode
            console.log("Keyboard: Toggle Coder Mode");
            // If already in coder mode, navigate home, else navigate to coder
            if (window.location.pathname === "/coder") {
              navigate({ to: "/" });
            } else {
              navigate({ to: "/coder" });
            }
            break;
          case 2: // Was 1: Sell Compute
            console.log("Keyboard: Toggle Sell Compute");
            toggleSellComputePane();
            break;
          case 3: // Was 2: Wallet Pane
            console.log("Keyboard: Toggle Wallet Pane");
            toggleWalletPane();
            break;
          case 4: // Was 3: DVM Job History
            console.log("Keyboard: Toggle DVM Job History Pane");
            toggleDvmJobHistoryPane();
            break;
          case 5: // Was 4: Agent Chat
            console.log("Keyboard: Toggle Agent Chat Pane");
            toggleAgentChatPane();
            break;
          case 6: // Was 5: Previous Chats (if enabled)
            if (togglePreviousChatsPane) {
              console.log("Keyboard: Toggle Previous Chats Pane");
              togglePreviousChatsPane();
            }
            break;
          // Slots 7 and 8 are currently unassigned
          case 7:
          case 8:
            break;
          case 9: // Hand Tracking (remains 9)
            console.log("Keyboard: Toggle Hand Tracking");
            toggleHandTracking();
            break;
        }
      };

      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => {
        window.removeEventListener("keydown", handleGlobalKeyDown);
      };
    }, [
      navigate, // Add navigate
      toggleSellComputePane,
      toggleWalletPane,
      toggleHandTracking,
      toggleDvmJobHistoryPane,
      toggleAgentChatPane,
      togglePreviousChatsPane,
    ]);

    // ... rest of HomePage component ...
  }
  ```

**3. Ensure `src/controls.ts` reflects the new Hotbar assignments if `KeyboardControls` component is still used for other R3F interactions.**
_ The `appControlsMap` should be updated if the hotbar items it refers to have changed slot numbers.
_ The global keydown handler in `HomePage.tsx` is now the primary driver for Hotbar shortcuts. The `KeyboardControls` component might be for R3F scene-specific controls. The prompt did not ask to change this, so I will assume it's separate. If hotbar slots 5-8 were previously mapped here, they should be removed or updated.
```typescript
// src/controls.ts
export enum AppControls {
CODER_MODE = "CODER_MODE", // New
SELL_COMPUTE = "SELL_COMPUTE", // Was HOTBAR_1
WALLET_PANE = "WALLET_PANE", // Was HOTBAR_2
DVM_HISTORY = "DVM_HISTORY", // Was HOTBAR_3
AGENT_CHAT = "AGENT_CHAT", // Was HOTBAR_4
PREVIOUS_CHATS = "PREVIOUS_CHATS", // Was HOTBAR_5 (if applicable)
// Slots 6, 7, 8 are conceptually empty for direct hotbar shortcuts
HOTBAR_9 = "HOTBAR_9", // Hand Tracking
}

        export const appControlsMap: KeyboardControlsEntry<AppControls>[] = [
          { name: AppControls.CODER_MODE, keys: ["Digit1", "Numpad1"] },
          { name: AppControls.SELL_COMPUTE, keys: ["Digit2", "Numpad2"] },
          { name: AppControls.WALLET_PANE, keys: ["Digit3", "Numpad3"] },
          { name: AppControls.DVM_HISTORY, keys: ["Digit4", "Numpad4"] },
          { name: AppControls.AGENT_CHAT, keys: ["Digit5", "Numpad5"] },
          { name: AppControls.PREVIOUS_CHATS, keys: ["Digit6", "Numpad6"] }, // If active
          // No Digit7, Digit8 for now
          { name: AppControls.HOTBAR_9, keys: ["Digit9", "Numpad9"] },
        ];
        ```
        **Note:** The `KeyboardControls` component's `onChange` handler in `HomePage.tsx` might need adjustment if it was directly calling actions based on `AppControls.HOTBAR_X` enum members. The global keydown listener is now more direct.

**IV. Review and Test**

- **Functionality:**
  - Verify the "Coder Mode" button (now slot 1) opens the fullscreen black view with the "Edit" button.
  - Verify other Hotbar buttons are shifted and still work correctly (open their respective panes).
  - Verify keyboard shortcuts (Ctrl+1/Cmd+1 for Coder, Ctrl+2/Cmd+2 for Sell Compute, etc.) work as expected.
  - Verify pressing "Escape" in Coder Mode navigates back to the home view (`/`).
  - Ensure the "Edit" button in Coder Mode logs to console (actual functionality TBD).
- **UI:**
  - Coder Mode is fully black and fullscreen.
  - The "Edit" button is visible and styled minimally.
  - The `DragWindowRegion` is still functional, allowing the app window to be moved even in Coder Mode.
  - The Hotbar is hidden when Coder Mode is active.
- **Console:** Check for any new errors or warnings.
- **Telemetry:** Confirm telemetry events for Coder Mode (open, edit click, exit) are firing.

This provides a foundational Coder Mode. The "Edit" button's functionality will be a subsequent step.Okay, Agent, let's get this "Coder" mode implemented.

Here are the specific instructions:

**I. Update Hotbar and Related Controls**

1.  **Modify `src/components/hud/Hotbar.tsx`:**

    - Import `CodeXml` from `lucide-react`.
    - Import `useNavigate` and `useRouterState` from `@tanstack/react-router`.
    - Add telemetry dependencies: `Effect`, `TelemetryService`, `getMainRuntime`.
    - Implement the new Hotbar layout:
      - **Slot 1:** "Coder Mode" button.
        - Icon: `<CodeXml />`
        - `onClick`: Navigates to `/coder` or `/` if already on `/coder`.
        - `isActive`: `routerState.location.pathname === '/coder'`.
        - Title: Dynamically "Exit Coder Mode" or "Coder Mode".
        - Track click with telemetry: `category: 'coder_mode', action: 'hotbar_button_click'`.
      - **Slot 2:** "Sell Compute" button (was Slot 1).
      - **Slot 3:** "Wallet" button (was Slot 2).
      - **Slot 4:** "DVM Job History" button (was Slot 3).
      - **Slot 5:** "Agent Chat" button (was Slot 4).
      - **Slot 6:** "Chat History" button (was Slot 5, if `onTogglePreviousChatsPane` is provided).
      - Adjust empty slots to fill up to Slot 8.
      - **Slot 9:** "Hand Tracking" button (remains Slot 9).

2.  **Modify `src/pages/HomePage.tsx` (Keyboard Shortcuts):**

    - Import `useNavigate` from `@tanstack/react-router`.
    - In the `handleGlobalKeyDown` function (within the `useEffect` hook):
      - Change `Ctrl+1`/`Cmd+1` to navigate to `/coder` (or `/` if already on `/coder`).
      - Update `Ctrl+2`/`Cmd+2` to call `toggleSellComputePane()`.
      - Update `Ctrl+3`/`Cmd+3` to call `toggleWalletPane()`.
      - Update `Ctrl+4`/`Cmd+4` to call `toggleDvmJobHistoryPane()`.
      - Update `Ctrl+5`/`Cmd+5` to call `toggleAgentChatPane()`.
      - Update `Ctrl+6`/`Cmd+6` to call `togglePreviousChatsPane()` (if available).
      - Leave `Ctrl+9`/`Cmd+9` for `toggleHandTracking()`.
    - Add `navigate` to the `useEffect` dependency array.

3.  **Modify `src/controls.ts` (for R3F KeyboardControls, if still used for these actions):**
    - Define `AppControls.CODER_MODE`.
    - Update `appControlsMap` to reflect the new slot assignments:
      - `CODER_MODE`: `Digit1`
      - `SELL_COMPUTE`: `Digit2` (was `HOTBAR_1`)
      - `WALLET_PANE`: `Digit3` (was `HOTBAR_2`)
      - `DVM_HISTORY`: `Digit4` (was `HOTBAR_3`)
      - `AGENT_CHAT`: `Digit5` (was `HOTBAR_4`)
      - `PREVIOUS_CHATS`: `Digit6` (was `HOTBAR_5`)
      - `HOTBAR_9` remains `Digit9`.

**II. Create Coder Mode View and Routing**

1.  **Create `src/components/coder/` directory.**

2.  **Create `src/components/coder/CoderView.tsx`:**

    - Implement a React functional component named `CoderView`.
    - Import `Button` from ` '@/components/ui/button'`.
    - Import `Pencil` from `lucide-react`.
    - Import `useNavigate` from `@tanstack/react-router`.
    - Import `Effect`, `TelemetryService`, `getMainRuntime`.
    - **Main Div:**
      - Style: `fixed inset-0 z-[9998] flex h-screen w-screen flex-col items-center bg-black p-4`. The `z-[9998]` should place it above the `SimpleGrid` (z-0) and below the highest HUD elements (z-[10000] like Hotbar, but Hotbar won't be on this route).
    - **Top Bar Div:**
      - Style: `absolute top-0 left-0 right-0 flex justify-center p-3`.
    - **Edit Button:**
      - Inside the top bar div.
      - Use `<Button variant="outline" ...>`.
      - Style: `className="border-gray-700 bg-black text-gray-400 hover:border-gray-500 hover:bg-gray-900 hover:text-gray-200"`.
      - Icon: `<Pencil className="mr-2 h-4 w-4" />`.
      - Text: "Edit".
      - `onClick`: Call `handleEditClick`.
    - **`handleEditClick` function:**
      - Log "Coder Mode: Edit button clicked." to the console.
      - Track telemetry event: `category: 'coder_mode', action: 'edit_button_click'`.
    - **`handleExitCoderMode` function (use `React.useCallback`):**
      - Navigates to `/`.
      - Track telemetry event: `category: 'coder_mode', action: 'exit_coder_mode_escape'`.
    - **`useEffect` for Escape Key:**
      - Add an event listener for `keydown`.
      - If `event.key === 'Escape'`, call `handleExitCoderMode`.
      - Clean up the event listener on unmount.
    - **`useEffect` for Open Event:**
      - On mount, track telemetry event: `category: 'coder_mode', action: 'coder_mode_opened'`.

3.  **Create `src/components/coder/index.ts`:**

    - Export `CoderView` as default: `export { default as CoderView } from "./CoderView";`

4.  **Modify `src/routes/routes.tsx`:**
    - Import `CoderView` from ` '@/components/coder'`.
    - Define `CoderRoute`:
      ```typescript
      export const CoderRoute = createRoute({
        getParentRoute: () => RootRoute,
        path: "/coder",
        component: CoderView,
      });
      ```
    - Add `CoderRoute` to `rootTree`: `export const rootTree = RootRoute.addChildren([HomeRoute, CoderRoute /*, ...other routes */]);`

**III. Final Review**

- Ensure `BaseLayout.tsx` is used by `RootRoute` so the `DragWindowRegion` remains. The `CoderView`'s `fixed inset-0 bg-black` style should cover the `BaseLayout`'s padding and default background.
- The Hotbar is part of `HomePage.tsx`. When navigating to `/coder`, `HomePage` is unmounted, effectively hiding the Hotbar. This is the desired behavior.
- Confirm telemetry tracking for Coder Mode interactions.

This implementation will establish the Coder Mode with its basic UI structure and navigation. The "Edit" button's actual function can be expanded in a future iteration.
