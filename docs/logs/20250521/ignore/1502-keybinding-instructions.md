Okay, Agent, your task is to implement keyboard shortcuts for the Hotbar buttons. The shortcuts will be `Cmd+Number` (on macOS) or `Ctrl+Number` (on other OSes) corresponding to the Hotbar slot number. Pressing the shortcut should toggle the associated pane or action, just like clicking the button.

You will use `@react-three/drei`'s `<KeyboardControls>` component for this.

Here are the specific instructions:

**Phase 1: Setup and UI Updates**

1.  **Create `src/utils/os.ts`**:
    *   This file will contain a helper function to detect if the current operating system is macOS.
    ```typescript
    // src/utils/os.ts
    export const isMacOs = (): boolean => {
      if (typeof navigator !== 'undefined') {
        return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      }
      // Fallback for non-browser environments if window.electronAPI.platform is available from preload
      if (typeof window !== 'undefined' && (window as any).electronAPI?.platform) {
        return (window as any).electronAPI.platform === 'darwin';
      }
      // Default if platform cannot be determined, assuming non-Mac for Ctrl key display
      return false;
    };
    ```

2.  **Update `src/components/hud/HotbarItem.tsx`**:
    *   Modify the component to display the keyboard shortcut next to the slot number.
    *   The shortcut should be "⌘N" on macOS and "Ctrl+N" on other systems, where N is the slot number.
    ```typescript
    // src/components/hud/HotbarItem.tsx
    import React from 'react';
    import { cn } from '@/utils/tailwind';
    import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
    import { isMacOs } from '@/utils/os'; // Import the OS detection helper

    interface HotbarItemProps {
      slotNumber: number;
      onClick?: () => void;
      children?: React.ReactNode;
      title?: string;
      isActive?: boolean;
      isGhost?: boolean;
      className?: string;
    }

    export const HotbarItem: React.FC<HotbarItemProps> = ({
      slotNumber,
      onClick,
      children,
      title,
      isActive,
      isGhost,
      className,
    }) => {
      const modifierPrefix = isMacOs() ? '⌘' : 'Ctrl+';
      const shortcutText = `${modifierPrefix}${slotNumber}`;

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              aria-label={title || `Hotbar slot ${slotNumber}`}
              className={cn(
                "relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 border border-border/50 bg-background/70 backdrop-blur-sm rounded-sm shadow-md transition-all duration-150 hover:bg-accent hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                isActive && "bg-primary/20 border-primary ring-1 ring-primary",
                isGhost && "opacity-30 hover:opacity-50 cursor-default", // Added cursor-default for ghost
                className
              )}
              disabled={isGhost} // Disable button if it's a ghost slot
            >
              {children}
              {!isGhost && ( // Only show shortcut if not a ghost
                <div className="absolute bottom-0.5 right-0.5 flex items-center text-[0.5rem] text-muted-foreground px-0.5 bg-background/50 rounded-sm">
                  <span className="mr-0.5">{shortcutText}</span>
                </div>
              )}
            </button>
          </TooltipTrigger>
          {!isGhost && title && ( // Only show tooltip if not a ghost and has title
            <TooltipContent side="top" sideOffset={5}>
              <p>{title} ({shortcutText})</p>
            </TooltipContent>
          )}
        </Tooltip>
      );
    };
    ```
    *   Modify the `HotbarItem` in `Hotbar.tsx` that displays the slot number to:
        ```diff
        - <span className="absolute bottom-0.5 right-0.5 text-[0.5rem] text-muted-foreground px-0.5 bg-background/50 rounded-sm">
        -  {slotNumber}
        -</span>
        + {!isGhost && (
        +   <div className="absolute bottom-0.5 right-0.5 flex items-center text-[0.5rem] text-muted-foreground px-0.5 bg-background/50 rounded-sm leading-none">
        +     <span>{isMacOs() ? '⌘' : 'Ctrl'}</span>
        +     <span>{slotNumber}</span>
        +   </div>
        + )}
        ```
    *   In the `TooltipContent`, also display the shortcut:
        ```diff
        <TooltipContent side="top" sideOffset={5}>
        -  <p>{title || `Slot ${slotNumber}`}</p>
        +  <p>{title || `Slot ${slotNumber}`} ({shortcutText})</p>
        </TooltipContent>
        ```

**Phase 2: Implement Keyboard Controls Logic**

1.  **Create `src/controls.ts`**:
    *   Define an enum `AppControls` for hotbar actions and a map for `KeyboardControls`.
    ```typescript
    // src/controls.ts
    import { type KeyboardControlsEntry } from '@react-three/drei';

    export enum AppControls {
      HOTBAR_1 = 'HOTBAR_1',
      HOTBAR_2 = 'HOTBAR_2',
      HOTBAR_3 = 'HOTBAR_3',
      HOTBAR_4 = 'HOTBAR_4',
      HOTBAR_5 = 'HOTBAR_5',
      // Add HOTBAR_6 through HOTBAR_9 if you expect more than 5 active slots
    }

    export const appControlsMap: KeyboardControlsEntry<AppControls>[] = [
      { name: AppControls.HOTBAR_1, keys: ['Digit1', 'Numpad1'] },
      { name: AppControls.HOTBAR_2, keys: ['Digit2', 'Numpad2'] },
      { name: AppControls.HOTBAR_3, keys: ['Digit3', 'Numpad3'] },
      { name: AppControls.HOTBAR_4, keys: ['Digit4', 'Numpad4'] },
      { name: AppControls.HOTBAR_5, keys: ['Digit5', 'Numpad5'] },
      // Define for 6-9 as well if needed, e.g.:
      // { name: AppControls.HOTBAR_6, keys: ['Digit6', 'Numpad6'] },
      // ...
    ];
    ```

2.  **Create Toggle Actions in `usePaneStore` (`src/stores/pane.ts`)**:
    *   For each Hotbar item that opens a pane, create a corresponding `toggle[PaneName]` action.
    *   This action should check if the pane is currently active. If so, it removes the pane. Otherwise, it opens/activates the pane.
    *   Reference the Hotbar order after `1143-wallet-log.md`:
        1.  Sell Compute
        2.  Wallet
        3.  Hand Tracking (This is a boolean toggle, not a pane toggle from `usePaneStore`)
        4.  DVM Job History
        5.  Reset HUD (This is a one-shot action, not a toggle)
    ```typescript
    // src/stores/pane.ts
    // ... other imports ...
    import {
      SELL_COMPUTE_PANE_ID_CONST, // Ensure this exists and is used by openSellComputePaneAction
      WALLET_PANE_ID, // Ensure this exists
      // DVM_JOB_HISTORY_PANE_ID, // Ensure this exists (might be in its open...action file)
    } from './panes/constants';
    import { DVM_JOB_HISTORY_PANE_ID } from './panes/actions/openDvmJobHistoryPane'; // More likely path

    // ... inside create<PaneStoreType>()(persist(...)) ...
    // (set, get) => ({
    //   ...initialState,
    //   ...other actions...

      toggleSellComputePane: () => set((state) => {
        const paneId = SELL_COMPUTE_PANE_ID_CONST;
        const existingPane = state.panes.find(p => p.id === paneId);
        if (existingPane && state.activePaneId === paneId) {
          // Logic from removePaneAction, adapted
          const remainingPanes = state.panes.filter(pane => pane.id !== paneId);
          let newActivePaneId: string | null = null;
          if (remainingPanes.length > 0) newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
          const updatedPanes = remainingPanes.map(p => ({ ...p, isActive: p.id === newActivePaneId }));
          return { ...state, panes: updatedPanes, activePaneId: newActivePaneId };
        } else {
          // Use the existing openSellComputePaneAction's logic for opening/focusing
          // This requires openSellComputePaneAction to be a function that transforms state
          // Assuming openSellComputePaneAction is available and correctly implemented in actions/
          const nextState = { ...state };
          openSellComputePaneAction(s => { Object.assign(nextState, s(nextState)); })(nextState); // Simulate calling it
          // More direct: copy logic from openSellComputePaneAction and addPaneActionLogic
          let targetPane = state.panes.find(p => p.id === paneId);
          let newPanesArray = [...state.panes];
          let newActiveId = paneId;
          if (!targetPane) {
              const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
              const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
              const newPaneConfig: Pane = {
                  id: SELL_COMPUTE_PANE_ID_CONST, type: 'sell_compute', title: 'Sell Compute Power',
                  x: Math.max(20, (screenWidth - 550) / 2),
                  y: Math.max(20, (screenHeight - 420) / 3),
                  width: 550, height: 420, dismissable: true, content: {}, isActive: true
              };
              targetPane = newPaneConfig;
              newPanesArray.push(targetPane);
          } else {
              newPanesArray = newPanesArray.filter(p => p.id !== paneId);
              newPanesArray.push({ ...targetPane, isActive: true });
          }
          const finalPanes = newPanesArray.map(p => (p.id === newActiveId ? p : ({...p, isActive: false})));
          return { ...state, panes: finalPanes, activePaneId: newActiveId };
        }
      }),

      toggleWalletPane: () => set((state) => {
        const paneId = WALLET_PANE_ID;
        const existingPane = state.panes.find(p => p.id === paneId);
        if (existingPane && state.activePaneId === paneId) {
          const remainingPanes = state.panes.filter(pane => pane.id !== paneId);
          let newActivePaneId: string | null = null;
          if (remainingPanes.length > 0) newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
          const updatedPanes = remainingPanes.map(p => ({ ...p, isActive: p.id === newActivePaneId }));
          return { ...state, panes: updatedPanes, activePaneId: newActivePaneId };
        } else {
          let targetPane = state.panes.find(p => p.id === paneId);
          let newPanesArray = [...state.panes];
          let newActiveId = paneId;
          if (!targetPane) {
              const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
              const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
              const newPaneConfig: Pane = {
                  id: WALLET_PANE_ID, type: 'wallet', title: 'Bitcoin Wallet',
                  x: Math.max(20, (screenWidth - 450) / 2 + 50), // Offset a bit
                  y: Math.max(20, (screenHeight - 550) / 3 + 50),
                  width: 450, height: 550, dismissable: true, content: {}, isActive: true
              };
              targetPane = newPaneConfig;
              newPanesArray.push(targetPane);
          } else {
              newPanesArray = newPanesArray.filter(p => p.id !== paneId);
              newPanesArray.push({ ...targetPane, isActive: true });
          }
          const finalPanes = newPanesArray.map(p => (p.id === newActiveId ? p : ({...p, isActive: false})));
          return { ...state, panes: finalPanes, activePaneId: newActiveId };
        }
      }),

      toggleDvmJobHistoryPane: () => set((state) => {
        const paneId = DVM_JOB_HISTORY_PANE_ID;
        const existingPane = state.panes.find(p => p.id === paneId);
        if (existingPane && state.activePaneId === paneId) {
          const remainingPanes = state.panes.filter(pane => pane.id !== paneId);
          let newActivePaneId: string | null = null;
          if (remainingPanes.length > 0) newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
          const updatedPanes = remainingPanes.map(p => ({ ...p, isActive: p.id === newActivePaneId }));
          return { ...state, panes: updatedPanes, activePaneId: newActivePaneId };
        } else {
          let targetPane = state.panes.find(p => p.id === paneId);
          let newPanesArray = [...state.panes];
          let newActiveId = paneId;
          if (!targetPane) {
              const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
              const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
              const newPaneConfig: Pane = {
                  id: DVM_JOB_HISTORY_PANE_ID, type: 'dvm_job_history', title: 'DVM Job History & Stats',
                  x: Math.max(20, (screenWidth - 800) / 2 - 50), // Offset a bit
                  y: Math.max(20, (screenHeight - 600) / 3 - 50),
                  width: 800, height: 600, dismissable: true, content: {}, isActive: true
              };
              targetPane = newPaneConfig;
              newPanesArray.push(targetPane);
          } else {
              newPanesArray = newPanesArray.filter(p => p.id !== paneId);
              newPanesArray.push({ ...targetPane, isActive: true });
          }
          const finalPanes = newPanesArray.map(p => (p.id === newActiveId ? p : ({...p, isActive: false})));
          return { ...state, panes: finalPanes, activePaneId: newActiveId };
        }
      }),
    // })
    ```
    *   Add these toggle action signatures to `src/stores/panes/types.ts` for `PaneStoreType`.

3.  **Update `src/components/hud/Hotbar.tsx`**:
    *   Import the new toggle actions from `usePaneStore`.
    *   Wire them to the `onClick` handlers of the corresponding `HotbarItem`s.
    ```typescript
    // src/components/hud/Hotbar.tsx
    // ...
    const {
      resetHUDState,
      toggleSellComputePane,
      toggleWalletPane,
      toggleDvmJobHistoryPane,
      activePaneId
    } = usePaneStore(
      useShallow((state) => ({ // Use useShallow if selecting multiple state pieces
        resetHUDState: state.resetHUDState,
        toggleSellComputePane: state.toggleSellComputePane,
        toggleWalletPane: state.toggleWalletPane,
        toggleDvmJobHistoryPane: state.toggleDvmJobHistoryPane,
        activePaneId: state.activePaneId,
      }))
    );
    // ...
    // onClick handlers should now call these, e.g.:
    // <HotbarItem slotNumber={1} onClick={toggleSellComputePane} ... >
    // <HotbarItem slotNumber={2} onClick={toggleWalletPane} ... > (This was Slot 5)
    // <HotbarItem slotNumber={4} onClick={toggleDvmJobHistoryPane} ... > (This was Slot 2, then 3)
    // Need to adjust slot numbers based on the final desired Hotbar layout.
    // Let's use the current Hotbar.tsx as the source of truth for slot order:
    // Slot 1: Sell Compute (was onOpenSellComputePane, now toggleSellComputePane)
    // Slot 2: Wallet (was openWalletPane, now toggleWalletPane)
    // Slot 3: Hand Tracking (onToggleHandTracking - this is fine, not a pane store action)
    // Slot 4: DVM Job History (was onOpenDvmJobHistoryPane, now toggleDvmJobHistoryPane)
    // Slot 5: Reset HUD (resetHUDState - this is fine, not a toggle)
    ```
    *Adjust `Hotbar.tsx` to use the new toggle functions and the correct slot numbers as per the final layout.*

4.  **Integrate `KeyboardControls` in `src/pages/HomePage.tsx`**:
    *   Wrap the main `div` with `<KeyboardControls map={appControlsMap} onChange={handleKeyboardChange}>`.
    *   Implement `handleKeyboardChange` to call the correct store toggle actions or direct functions based on the `actionName` and modifier keys.
    ```typescript
    // src/pages/HomePage.tsx
    import React, { useState, useEffect, useRef, useCallback } from "react"; // Added useCallback
    import { PaneManager } from "@/panes/PaneManager";
    import { SimpleGrid } from "@/components/home/SimpleGrid";
    import { HandTracking, HandPose, type PinchCoordinates, type HandLandmarks } from "@/components/hands";
    import { usePaneStore } from "@/stores/pane";
    import { useShallow } from 'zustand/react/shallow';
    import { Hotbar } from "@/components/hud/Hotbar";
    import BitcoinBalanceDisplay from "@/components/hud/BitcoinBalanceDisplay";
    import { KeyboardControls, type KeyboardControlsState } from '@react-three/drei';
    import { AppControls, appControlsMap } from '@/controls';
    import { isMacOs } from '@/utils/os';

    // ... (HandDataContext and TITLE_BAR_HEIGHT remain) ...

    export default function HomePage() {
      const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
      const [handData, setHandData] = useState<HandDataContext | null>(null);
      const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
      const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
      const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

      // Get all necessary functions and state from usePaneStore using a single selector with useShallow
      const {
        panes,
        bringPaneToFront,
        updatePanePosition,
        activePaneId: currentActivePaneId,
        // Actions for Hotbar props and keyboard shortcuts
        toggleSellComputePane,
        toggleWalletPane,
        toggleDvmJobHistoryPane,
        resetHUDState,
      } = usePaneStore(
        useShallow((state) => ({
          panes: state.panes,
          bringPaneToFront: state.bringPaneToFront,
          updatePanePosition: state.updatePanePosition,
          activePaneId: state.activePaneId,
          toggleSellComputePane: state.toggleSellComputePane,
          toggleWalletPane: state.toggleWalletPane,
          toggleDvmJobHistoryPane: state.toggleDvmJobHistoryPane,
          resetHUDState: state.resetHUDState,
        }))
      );

      const toggleHandTracking = useCallback(() => { // Wrap in useCallback
        const newState = !isHandTrackingActive;
        setIsHandTrackingActive(newState);
        if (!newState && draggingPaneId) {
          setDraggingPaneId(null);
          initialPinchPositionRef.current = null;
          paneStartPosRef.current = null;
        }
      }, [isHandTrackingActive, draggingPaneId]);


      const prevHandDataRef = useRef<HandDataContext | null>(null);
      const handleHandDataUpdate = useCallback((data: HandDataContext) => { // Wrap in useCallback
        if ( !prevHandDataRef.current ||
            data.activeHandPose !== prevHandDataRef.current.activeHandPose ||
            data.trackedHandsCount !== prevHandDataRef.current.trackedHandsCount ||
            JSON.stringify(data.pinchMidpoint) !== JSON.stringify(prevHandDataRef.current.pinchMidpoint)
        ) {
            prevHandDataRef.current = data;
            setHandData(data);
        }
      }, []); // Empty dependency array as setHandData is stable

      // Pinch-to-drag useEffect remains the same
      useEffect(() => {
        // ... (existing pinch-to-drag logic) ...
      }, [isHandTrackingActive, handData, draggingPaneId, panes, currentActivePaneId, bringPaneToFront, updatePanePosition]);


      // Keyboard handling logic
      const handleKeyboardChange = useCallback((actionName: string, pressed: boolean, kbdState: KeyboardControlsState<AppControls>) => {
        if (!pressed) return;

        const event = kbdState.event as KeyboardEvent | undefined;
        if (!event) {
            console.warn("KeyboardControls: Event object not found in state.");
            return;
        }

        const modifier = isMacOs() ? event.metaKey : event.ctrlKey;
        if (!modifier) return;

        event.preventDefault();

        switch (actionName as AppControls) {
          case AppControls.HOTBAR_1:
            console.log('Keyboard: Toggle Sell Compute');
            if (toggleSellComputePane) toggleSellComputePane();
            break;
          case AppControls.HOTBAR_2:
            console.log('Keyboard: Toggle Wallet Pane');
            if (toggleWalletPane) toggleWalletPane();
            break;
          case AppControls.HOTBAR_3:
            console.log('Keyboard: Toggle Hand Tracking');
            toggleHandTracking();
            break;
          case AppControls.HOTBAR_4:
            console.log('Keyboard: Toggle DVM Job History Pane');
            if (toggleDvmJobHistoryPane) toggleDvmJobHistoryPane();
            break;
          case AppControls.HOTBAR_5:
            console.log('Keyboard: Reset HUD');
            resetHUDState();
            break;
          default:
            break;
        }
      }, [toggleSellComputePane, toggleWalletPane, toggleHandTracking, toggleDvmJobHistoryPane, resetHUDState]); // Add dependencies

      return (
        <KeyboardControls map={appControlsMap} onChange={handleKeyboardChange}>
          <div className="relative h-full w-full overflow-hidden">
            <SimpleGrid />
            <PaneManager />
            <BitcoinBalanceDisplay />
            <HandTracking
              showHandTracking={isHandTrackingActive}
              setShowHandTracking={setIsHandTrackingActive}
              onHandDataUpdate={handleHandDataUpdate}
            />
            <Hotbar
              isHandTrackingActive={isHandTrackingActive}
              onToggleHandTracking={toggleHandTracking}
              // Pass the toggle functions directly
              onOpenSellComputePane={toggleSellComputePane}
              onOpenWalletPane={toggleWalletPane}
              onOpenDvmJobHistoryPane={toggleDvmJobHistoryPane}
            />
          </div>
        </KeyboardControls>
      );
    }
    ```

**Phase 3: Update `Hotbar.tsx` to use toggle actions**

*   Modify `Hotbar.tsx` props and `onClick` handlers to use the new toggle functions.
    ```typescript
    // src/components/hud/Hotbar.tsx
    // ... imports ...
    interface HotbarProps {
      className?: string;
      isHandTrackingActive: boolean;
      onToggleHandTracking: () => void;
      // Change prop names to reflect toggle nature for panes
      onToggleSellComputePane: () => void;
      onToggleWalletPane: () => void;
      onToggleDvmJobHistoryPane: () => void;
    }

    export const Hotbar: React.FC<HotbarProps> = ({
      className,
      isHandTrackingActive,
      onToggleHandTracking,
      onToggleSellComputePane, // New prop
      onToggleWalletPane,      // New prop
      onToggleDvmJobHistoryPane, // New prop
    }) => {
      const resetHUDState = usePaneStore((state) => state.resetHUDState);
      const activePaneId = usePaneStore((state) => state.activePaneId);
      // ... (other constants like SELL_COMPUTE_PANE_ID, etc.)

      return (
        <div /* ... */ >
          <HotbarItem slotNumber={1} onClick={onToggleSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}>
            <Store className="w-5 h-5 text-muted-foreground" />
          </HotbarItem>
          <HotbarItem slotNumber={2} onClick={onToggleWalletPane} title="Wallet" isActive={activePaneId === WALLET_PANE_ID}>
            <Wallet className="w-5 h-5 text-muted-foreground" />
          </HotbarItem>
          <HotbarItem slotNumber={3} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
            <Hand className="w-5 h-5 text-muted-foreground" />
          </HotbarItem>
          <HotbarItem slotNumber={4} onClick={onToggleDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
            <History className="w-5 h-5 text-muted-foreground" />
          </HotbarItem>
          <HotbarItem slotNumber={5} onClick={resetHUDState} title="Reset HUD Layout"> {/* Reset is not a toggle */}
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </HotbarItem>
          {/* Empty slots */}
          {Array.from({ length: 4 }).map((_, i) => ( // 9 total - 5 used = 4 empty
            <HotbarItem key={`empty-slot-${i}`} slotNumber={i + 6} isGhost>
              <span className="w-5 h-5" />
            </HotbarItem>
          ))}
        </div>
      );
    };
    ```

This structure ensures that `@react-three/drei`'s `KeyboardControls` is used as requested, and the logic for handling the shortcuts resides in `HomePage.tsx`, which has access to all necessary store actions and local state toggles.
The Hotbar button UI is also updated to display the shortcuts.
The pane store toggle actions handle the open/close/focus logic.Okay, I will implement the keyboard shortcuts for the Hotbar buttons using `@react-three/drei`'s `<KeyboardControls>` component as requested.

Here's the implementation plan:

**Phase 1: Setup and UI Updates**
1.  **Create `src/utils/os.ts`**:
    *   Implement `isMacOs()` helper function.
2.  **Update `src/components/hud/HotbarItem.tsx`**:
    *   Display `Cmd+N` or `Ctrl+N` shortcut next to the slot number.
    *   Update tooltip to include the shortcut.
    *   Ensure ghost slots don't show shortcut text and are disabled.

**Phase 2: Implement Keyboard Controls Logic**
1.  **Create `src/controls.ts`**:
    *   Define `AppControls` enum (`HOTBAR_1` to `HOTBAR_5`).
    *   Define `appControlsMap` for `KeyboardControls` mapping `Digit1` to `HOTBAR_1`, etc.
2.  **Create Toggle Actions in `usePaneStore` (`src/stores/pane.ts`)**:
    *   Implement `toggleSellComputePane`, `toggleWalletPane`, `toggleDvmJobHistoryPane` actions.
    *   These actions will check if the respective pane is active. If active, remove it. Otherwise, open/focus it using the existing `open...Action` logic patterns.
    *   Update `PaneStoreType` in `src/stores/panes/types.ts` with these new toggle actions.
3.  **Update `src/components/hud/Hotbar.tsx`**:
    *   Modify props to accept `onToggleSellComputePane`, `onToggleWalletPane`, `onToggleDvmJobHistoryPane`.
    *   Update `onClick` handlers for the `HotbarItem`s to call these new toggle functions.
4.  **Integrate `KeyboardControls` in `src/pages/HomePage.tsx`**:
    *   Wrap the main content with `<KeyboardControls map={appControlsMap} onChange={handleKeyboardChange}>`.
    *   Implement `handleKeyboardChange` to:
        *   Check for Cmd (Mac) or Ctrl (Others) modifier keys.
        *   Prevent default browser behavior for these shortcuts.
        *   Call the appropriate `toggle...` action from `usePaneStore` or direct functions (`toggleHandTracking`, `resetHUDState`) based on the `actionName` from `AppControls`.

I will proceed with these changes.

```typescript
// src/utils/os.ts
export const isMacOs = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }
  // Fallback for non-browser environments if window.electronAPI.platform is available from preload
  if (typeof window !== 'undefined' && (window as any).electronAPI?.platform) {
    return (window as any).electronAPI.platform === 'darwin';
  }
  // Default if platform cannot be determined, assuming non-Mac for Ctrl key display
  return false;
};
```

```typescript
// src/components/hud/HotbarItem.tsx
import React from 'react';
import { cn } from '@/utils/tailwind';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isMacOs } from '@/utils/os';

interface HotbarItemProps {
  slotNumber: number;
  onClick?: () => void;
  children?: React.ReactNode;
  title?: string;
  isActive?: boolean;
  isGhost?: boolean;
  className?: string;
}

export const HotbarItem: React.FC<HotbarItemProps> = ({
  slotNumber,
  onClick,
  children,
  title,
  isActive,
  isGhost,
  className,
}) => {
  const modifierText = isMacOs() ? '⌘' : 'Ctrl';
  const shortcutTextDisplay = `${modifierText}${slotNumber}`;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={title || `Hotbar slot ${slotNumber}`}
          className={cn(
            "relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 border border-border/50 bg-background/70 backdrop-blur-sm rounded-sm shadow-md transition-all duration-150 hover:bg-accent hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
            isActive && "bg-primary/20 border-primary ring-1 ring-primary",
            isGhost && "opacity-30 hover:opacity-50 cursor-default",
            className
          )}
          disabled={isGhost}
        >
          {children}
          {!isGhost && (
            <div className="absolute bottom-0.5 right-0.5 flex items-center text-[0.5rem] text-muted-foreground px-0.5 bg-background/50 rounded-sm leading-none">
              {/* Display Cmd or Ctrl symbol based on OS */}
              <span className="font-sans">{modifierText}</span>
              {/* Display slot number */}
              <span>{slotNumber}</span>
            </div>
          )}
        </button>
      </TooltipTrigger>
      {!isGhost && title && (
        <TooltipContent side="top" sideOffset={5}>
          <p>{title} ({shortcutTextDisplay})</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};
```

```typescript
// src/controls.ts
import { type KeyboardControlsEntry } from '@react-three/drei';

export enum AppControls {
  HOTBAR_1 = 'HOTBAR_1',
  HOTBAR_2 = 'HOTBAR_2',
  HOTBAR_3 = 'HOTBAR_3',
  HOTBAR_4 = 'HOTBAR_4',
  HOTBAR_5 = 'HOTBAR_5',
  // HOTBAR_6 = 'HOTBAR_6', // In case more are needed
  // HOTBAR_7 = 'HOTBAR_7',
  // HOTBAR_8 = 'HOTBAR_8',
  // HOTBAR_9 = 'HOTBAR_9',
}

export const appControlsMap: KeyboardControlsEntry<AppControls>[] = [
  { name: AppControls.HOTBAR_1, keys: ['Digit1', 'Numpad1'] },
  { name: AppControls.HOTBAR_2, keys: ['Digit2', 'Numpad2'] },
  { name: AppControls.HOTBAR_3, keys: ['Digit3', 'Numpad3'] },
  { name: AppControls.HOTBAR_4, keys: ['Digit4', 'Numpad4'] },
  { name: AppControls.HOTBAR_5, keys: ['Digit5', 'Numpad5'] },
  // { name: AppControls.HOTBAR_6, keys: ['Digit6', 'Numpad6'] },
  // { name: AppControls.HOTBAR_7, keys: ['Digit7', 'Numpad7'] },
  // { name: AppControls.HOTBAR_8, keys: ['Digit8', 'Numpad8'] },
  // { name: AppControls.HOTBAR_9, keys: ['Digit9', 'Numpad9'] },
];
```

```typescript
// src/stores/panes/types.ts
import { Pane, PaneInput } from '@/types/pane';
import type { StoreApi } from 'zustand';
import type { OpenSeedPhraseBackupPaneParams } from './actions/openSeedPhraseBackupPane';

export interface PaneState {
  panes: Pane[];
  activePaneId: string | null;
  lastPanePosition: { x: number; y: number; width: number; height: number } | null;
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
  openNip90GlobalFeedPane: () => void;
  openWalletPane: () => void;
  resetHUDState: () => void;

  openSecondPagePane: () => void;
  openWalletSetupPane: () => void;
  openSeedPhraseBackupPane: (params: OpenSeedPhraseBackupPaneParams) => void;
  openRestoreWalletPane: () => void;

  // New Toggle Actions
  toggleSellComputePane: () => void;
  toggleWalletPane: () => void;
  toggleDvmJobHistoryPane: () => void;
}

export type SetPaneStore = StoreApi<PaneStoreType>['setState'];
export type GetPaneStore = () => PaneStoreType;
```

```typescript
// src/stores/pane.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Pane, PaneInput } from "@/types/pane";
import { PaneStoreType, PaneState, GetPaneStore, SetPaneStore } from "./panes/types"; // Added GetPaneStore, SetPaneStore
import {
  addPaneActionLogic, // Changed from addPaneAction
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
  openNip90GlobalFeedPaneAction,
  openWalletPaneAction,
  openSecondPagePaneAction,
  openWalletSetupPaneAction,
  openSeedPhraseBackupPaneAction,
  openRestoreWalletPaneAction,
} from "./panes/actions";
import {
  PANE_MARGIN,
  SELL_COMPUTE_PANE_ID_CONST,
  SELL_COMPUTE_INITIAL_WIDTH,
  SELL_COMPUTE_INITIAL_HEIGHT,
  WALLET_PANE_ID,
  WALLET_PANE_TITLE,
  DVM_JOB_HISTORY_PANE_ID,
  // DVM_JOB_HISTORY_PANE_TITLE, // Not needed here for logic
} from "./panes/constants";
import type { OpenSeedPhraseBackupPaneParams } from "./panes/actions/openSeedPhraseBackupPane";


const getInitialPanes = (): Pane[] => {
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  return [{
    id: SELL_COMPUTE_PANE_ID_CONST,
    type: 'sell_compute',
    title: 'Sell Compute Power',
    x: Math.max(PANE_MARGIN, (screenWidth - SELL_COMPUTE_INITIAL_WIDTH) / 2),
    y: Math.max(PANE_MARGIN, (screenHeight - SELL_COMPUTE_INITIAL_HEIGHT) / 3),
    width: SELL_COMPUTE_INITIAL_WIDTH,
    height: SELL_COMPUTE_INITIAL_HEIGHT,
    isActive: true,
    dismissable: true,
    content: {},
  }];
};

const initialState: PaneState = {
  panes: getInitialPanes(),
  activePaneId: SELL_COMPUTE_PANE_ID_CONST,
  lastPanePosition: null,
};

const sellComputePaneInitial = initialState.panes.find(p => p.id === SELL_COMPUTE_PANE_ID_CONST);
if (sellComputePaneInitial) {
    initialState.lastPanePosition = {
        x: sellComputePaneInitial.x,
        y: sellComputePaneInitial.y,
        width: sellComputePaneInitial.width,
        height: sellComputePaneInitial.height
    };
}

export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      ...initialState,
      addPane: (newPaneInput: PaneInput, shouldTile?: boolean) => set(addPaneActionLogic(get(), newPaneInput, shouldTile)),
      removePane: (id: string) => removePaneAction(set as SetPaneStore, id), // Cast for now
      updatePanePosition: (id: string, x: number, y: number) => updatePanePositionAction(set as SetPaneStore, id, x, y),
      updatePaneSize: (id: string, width: number, height: number) => updatePaneSizeAction(set as SetPaneStore, id, width, height),
      openChatPane: (newPaneInput: PaneInput, isCommandKeyHeld?: boolean) => openChatPaneAction(set as SetPaneStore, newPaneInput, isCommandKeyHeld),
      bringPaneToFront: (id: string) => bringPaneToFrontAction(set as SetPaneStore, id),
      setActivePane: (id: string | null) => setActivePaneAction(set as SetPaneStore, id),
      createNip28ChannelPane: (channelName?: string) => createNip28ChannelPaneAction(set as SetPaneStore, get, channelName),
      openNip90DashboardPane: () => openNip90DashboardPaneAction(set as SetPaneStore),
      openSellComputePane: () => openSellComputePaneAction(set as SetPaneStore),
      openDvmJobHistoryPane: () => openDvmJobHistoryPaneAction(set as SetPaneStore),
      openNip90DvmTestPane: () => openNip90DvmTestPaneAction(set as SetPaneStore),
      openNip90ConsumerChatPane: () => openNip90ConsumerChatPaneAction(set as SetPaneStore),
      openNip90GlobalFeedPane: () => openNip90GlobalFeedPaneAction(set as SetPaneStore),
      openWalletPane: () => openWalletPaneAction(set as SetPaneStore),

      openSecondPagePane: () => openSecondPagePaneAction(set as SetPaneStore),
      openWalletSetupPane: () => openWalletSetupPaneAction(set as SetPaneStore),
      openSeedPhraseBackupPane: (params: OpenSeedPhraseBackupPaneParams) => openSeedPhraseBackupPaneAction(set as SetPaneStore, params),
      openRestoreWalletPane: () => openRestoreWalletPaneAction(set as SetPaneStore),

      resetHUDState: () => { /* ... existing reset logic ... */ },

      // New Toggle Actions
      toggleSellComputePane: () => set((state) => {
        const paneId = SELL_COMPUTE_PANE_ID_CONST;
        const existingPane = state.panes.find(p => p.id === paneId);
        if (existingPane && state.activePaneId === paneId) {
          // Logic from removePaneAction, adapted
          const remainingPanes = state.panes.filter(p => p.id !== paneId);
          let newActivePaneId: string | null = null;
          if (remainingPanes.length > 0) newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
          const updatedPanes = remainingPanes.map(p => ({ ...p, isActive: p.id === newActivePaneId }));
          return { ...state, panes: updatedPanes, activePaneId: newActivePaneId };
        } else {
          // Use addPaneActionLogic for opening/focusing
          const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
          const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
          const newPaneInput: PaneInput = {
              id: SELL_COMPUTE_PANE_ID_CONST, type: 'sell_compute', title: 'Sell Compute Power',
              x: Math.max(20, (screenWidth - 550) / 2),
              y: Math.max(20, (screenHeight - 420) / 3),
              width: 550, height: 420, dismissable: true, content: {}
          };
          return addPaneActionLogic(state, newPaneInput, false); // false to use provided x,y
        }
      }),

      toggleWalletPane: () => set((state) => {
        const paneId = WALLET_PANE_ID;
        const existingPane = state.panes.find(p => p.id === paneId);
        if (existingPane && state.activePaneId === paneId) {
          const remainingPanes = state.panes.filter(p => p.id !== paneId);
          let newActivePaneId: string | null = null;
          if (remainingPanes.length > 0) newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
          const updatedPanes = remainingPanes.map(p => ({ ...p, isActive: p.id === newActivePaneId }));
          return { ...state, panes: updatedPanes, activePaneId: newActivePaneId };
        } else {
          const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
          const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
          const newPaneInput: PaneInput = {
              id: WALLET_PANE_ID, type: 'wallet', title: WALLET_PANE_TITLE,
              x: Math.max(20, (screenWidth - 450) / 2 + 50),
              y: Math.max(20, (screenHeight - 550) / 3 + 50),
              width: 450, height: 550, dismissable: true, content: {}
          };
          return addPaneActionLogic(state, newPaneInput, false);
        }
      }),

      toggleDvmJobHistoryPane: () => set((state) => {
        const paneId = DVM_JOB_HISTORY_PANE_ID;
        const existingPane = state.panes.find(p => p.id === paneId);
        if (existingPane && state.activePaneId === paneId) {
          const remainingPanes = state.panes.filter(p => p.id !== paneId);
          let newActivePaneId: string | null = null;
          if (remainingPanes.length > 0) newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
          const updatedPanes = remainingPanes.map(p => ({ ...p, isActive: p.id === newActivePaneId }));
          return { ...state, panes: updatedPanes, activePaneId: newActivePaneId };
        } else {
          const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
          const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
          const newPaneInput: PaneInput = {
              id: DVM_JOB_HISTORY_PANE_ID, type: 'dvm_job_history', title: 'DVM Job History & Stats',
              x: Math.max(20, (screenWidth - 800) / 2 - 50),
              y: Math.max(20, (screenHeight - 600) / 3 - 50),
              width: 800, height: 600, dismissable: true, content: {}
          };
          return addPaneActionLogic(state, newPaneInput, false);
        }
      }),
    }),
    { /* ... persist options ... */ }
  )
);
```

```typescript
// src/components/hud/Hotbar.tsx
import React from 'react';
import { cn } from '@/utils/tailwind';
import { HotbarItem } from './HotbarItem';
import { RefreshCw, Store, History, Hand, Wallet } from 'lucide-react';
import { usePaneStore } from '@/stores/pane';
import { useShallow } from 'zustand/react/shallow'; // For selecting multiple state pieces
import {
  SELL_COMPUTE_PANE_ID_CONST,
  WALLET_PANE_ID,
  // DVM_JOB_HISTORY_PANE_ID, // Not needed if using action from props
} from '@/stores/panes/constants';
import { DVM_JOB_HISTORY_PANE_ID } from '@/stores/panes/actions/openDvmJobHistoryPane';


interface HotbarProps {
  className?: string;
  isHandTrackingActive: boolean;
  onToggleHandTracking: () => void;
  // Changed prop names to reflect toggle actions
  onToggleSellComputePane: () => void;
  onToggleWalletPane: () => void;
  onToggleDvmJobHistoryPane: () => void;
}

export const Hotbar: React.FC<HotbarProps> = ({
  className,
  isHandTrackingActive,
  onToggleHandTracking,
  onToggleSellComputePane,
  onToggleWalletPane,
  onToggleDvmJobHistoryPane,
}) => {
  const { resetHUDState, activePaneId } = usePaneStore(
    useShallow((state) => ({
      resetHUDState: state.resetHUDState,
      activePaneId: state.activePaneId,
    }))
  );

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10000] flex space-x-1 p-1 bg-background/50 border border-border/30 rounded-md shadow-lg backdrop-blur-sm",
        className
      )}
    >
      {/* Slot 1: Sell Compute */}
      <HotbarItem slotNumber={1} onClick={onToggleSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID_CONST}>
        <Store className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {/* Slot 2: Wallet */}
      <HotbarItem slotNumber={2} onClick={onToggleWalletPane} title="Wallet" isActive={activePaneId === WALLET_PANE_ID}>
        <Wallet className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {/* Slot 3: Hand Tracking Toggle */}
      <HotbarItem slotNumber={3} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
        <Hand className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {/* Slot 4: DVM Job History */}
      <HotbarItem slotNumber={4} onClick={onToggleDvmJobHistoryPane} title="DVM Job History" isActive={activePaneId === DVM_JOB_HISTORY_PANE_ID}>
        <History className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {/* Slot 5: Reset HUD Layout */}
      <HotbarItem slotNumber={5} onClick={resetHUDState} title="Reset HUD Layout">
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>

      {/* Empty slots to maintain size (9 total slots - 5 used = 4 empty) */}
      {Array.from({ length: 4 }).map((_, i) => (
        <HotbarItem key={`empty-slot-${i}`} slotNumber={i + 6} isGhost>
          <span className="w-5 h-5" />
        </HotbarItem>
      ))}
    </div>
  );
};
```

```typescript
// src/pages/HomePage.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
import { HandTracking, HandPose, type PinchCoordinates, type HandLandmarks } from "@/components/hands";
import { usePaneStore } from "@/stores/pane";
import { useShallow } from 'zustand/react/shallow';
import { Hotbar } from "@/components/hud/Hotbar";
import BitcoinBalanceDisplay from "@/components/hud/BitcoinBalanceDisplay";
import { KeyboardControls, type KeyboardControlsState } from '@react-three/drei';
import { AppControls, appControlsMap } from '@/controls';
import { isMacOs } from '@/utils/os';

interface HandDataContext {
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
  primaryHandLandmarks: HandLandmarks | null;
  trackedHandsCount: number;
}

const TITLE_BAR_HEIGHT = 32;

export default function HomePage() {
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
  const [handData, setHandData] = useState<HandDataContext | null>(null);
  const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
  const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const {
    panes,
    bringPaneToFront,
    updatePanePosition,
    activePaneId: currentActivePaneId,
    toggleSellComputePane,
    toggleWalletPane,
    toggleDvmJobHistoryPane,
    resetHUDState,
  } = usePaneStore(
    useShallow((state) => ({
      panes: state.panes,
      bringPaneToFront: state.bringPaneToFront,
      updatePanePosition: state.updatePanePosition,
      activePaneId: state.activePaneId,
      toggleSellComputePane: state.toggleSellComputePane,
      toggleWalletPane: state.toggleWalletPane,
      toggleDvmJobHistoryPane: state.toggleDvmJobHistoryPane,
      resetHUDState: state.resetHUDState,
    }))
  );

  const toggleHandTracking = useCallback(() => {
    const newState = !isHandTrackingActive;
    setIsHandTrackingActive(newState);
    if (!newState && draggingPaneId) {
      setDraggingPaneId(null);
      initialPinchPositionRef.current = null;
      paneStartPosRef.current = null;
    }
  }, [isHandTrackingActive, draggingPaneId]);

  const prevHandDataRef = useRef<HandDataContext | null>(null);
  const handleHandDataUpdate = useCallback((data: HandDataContext) => {
    if (!prevHandDataRef.current ||
        data.activeHandPose !== prevHandDataRef.current.activeHandPose ||
        data.trackedHandsCount !== prevHandDataRef.current.trackedHandsCount ||
        JSON.stringify(data.pinchMidpoint) !== JSON.stringify(prevHandDataRef.current.pinchMidpoint)
    ) {
        prevHandDataRef.current = data;
        setHandData(data);
    }
  }, []);

  useEffect(() => {
    if (!isHandTrackingActive || !handData || !handData.pinchMidpoint || handData.trackedHandsCount === 0) {
      if (draggingPaneId) {
        setDraggingPaneId(null);
        initialPinchPositionRef.current = null;
        paneStartPosRef.current = null;
      }
      return;
    }
    const { activeHandPose, pinchMidpoint } = handData;
    if (activeHandPose === HandPose.PINCH_CLOSED) {
      if (!draggingPaneId) {
        for (let i = panes.length - 1; i >= 0; i--) {
          const pane = panes[i];
          if (pinchMidpoint.x >= pane.x && pinchMidpoint.x <= pane.x + pane.width &&
              pinchMidpoint.y >= pane.y && pinchMidpoint.y <= pane.y + TITLE_BAR_HEIGHT) {
            setDraggingPaneId(pane.id);
            paneStartPosRef.current = { x: pane.x, y: pane.y };
            initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
            if (pane.id !== currentActivePaneId) bringPaneToFront(pane.id);
            break;
          }
        }
      } else if (initialPinchPositionRef.current && paneStartPosRef.current) {
        const deltaX = pinchMidpoint.x - initialPinchPositionRef.current.x;
        const deltaY = pinchMidpoint.y - initialPinchPositionRef.current.y;
        if (Math.abs(deltaX) >= 1 || Math.abs(deltaY) >= 1) {
          const newX = paneStartPosRef.current.x + deltaX;
          const newY = paneStartPosRef.current.y + deltaY;
          initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
          paneStartPosRef.current = { x: newX, y: newY };
          updatePanePosition(draggingPaneId, newX, newY);
        }
      }
    } else {
      if (draggingPaneId) {
        setDraggingPaneId(null);
        initialPinchPositionRef.current = null;
        paneStartPosRef.current = null;
      }
    }
  }, [isHandTrackingActive, handData, draggingPaneId, panes, currentActivePaneId, bringPaneToFront, updatePanePosition]);

  const handleKeyboardChange = useCallback((actionName: string, pressed: boolean, kbdState: KeyboardControlsState<AppControls>) => {
    if (!pressed) return;

    const event = kbdState.event as KeyboardEvent | undefined;
    if (!event) {
        console.warn("KeyboardControls: Event object not found in state.");
        return;
    }

    const modifier = isMacOs() ? event.metaKey : event.ctrlKey;
    if (!modifier) return;

    event.preventDefault();

    switch (actionName as AppControls) {
      case AppControls.HOTBAR_1:
        console.log('Keyboard: Toggle Sell Compute');
        if (toggleSellComputePane) toggleSellComputePane();
        break;
      case AppControls.HOTBAR_2:
        console.log('Keyboard: Toggle Wallet Pane');
        if (toggleWalletPane) toggleWalletPane();
        break;
      case AppControls.HOTBAR_3:
        console.log('Keyboard: Toggle Hand Tracking');
        toggleHandTracking();
        break;
      case AppControls.HOTBAR_4:
        console.log('Keyboard: Toggle DVM Job History Pane');
        if (toggleDvmJobHistoryPane) toggleDvmJobHistoryPane();
        break;
      case AppControls.HOTBAR_5:
        console.log('Keyboard: Reset HUD');
        resetHUDState();
        break;
      default:
        break;
    }
  }, [toggleSellComputePane, toggleWalletPane, toggleHandTracking, toggleDvmJobHistoryPane, resetHUDState]);

  return (
    <KeyboardControls map={appControlsMap} onChange={handleKeyboardChange}>
      <div className="relative h-full w-full overflow-hidden">
        <SimpleGrid />
        <PaneManager />
        <BitcoinBalanceDisplay />
        <HandTracking
          showHandTracking={isHandTrackingActive}
          setShowHandTracking={setIsHandTrackingActive}
          onHandDataUpdate={handleHandDataUpdate}
        />
        <Hotbar
          isHandTrackingActive={isHandTrackingActive}
          onToggleHandTracking={toggleHandTracking}
          onToggleSellComputePane={toggleSellComputePane}
          onToggleWalletPane={toggleWalletPane}
          onToggleDvmJobHistoryPane={toggleDvmJobHistoryPane}
        />
      </div>
    </KeyboardControls>
  );
}

```
