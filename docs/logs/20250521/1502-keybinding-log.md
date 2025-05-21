# Implementing Keyboard Shortcuts for Hotbar Buttons

## Initial Analysis
- Task: Implement keyboard shortcuts for the Hotbar buttons using `Cmd+Number` (macOS) or `Ctrl+Number` (other platforms)
- The shortcuts should toggle the associated pane or action, just like clicking the button
- Will use `@react-three/drei`'s `KeyboardControls` component for implementation

## Implementation Plan
1. Create a utility function to detect OS (for Mac vs. non-Mac key display)
2. Update the HotbarItem component to show the keyboard shortcut
3. Create keyboard controls mapping
4. Add toggle actions to the pane store
5. Update the HomePage component to handle keyboard shortcuts

## Implementation Steps

### 1. Creating OS Detection Utility
First, I'll create the OS detection utility in `src/utils/os.ts`:

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

This utility function will help us determine whether to show ⌘ (Command) or Ctrl in the UI.

### 2. Creating Keyboard Controls Map
Next, I'll create a controls file to define the keyboard mapping:

```typescript
// src/controls.ts
import { type KeyboardControlsEntry } from '@react-three/drei';

export enum AppControls {
  HOTBAR_1 = 'HOTBAR_1',
  HOTBAR_2 = 'HOTBAR_2',
  HOTBAR_3 = 'HOTBAR_3',
  HOTBAR_4 = 'HOTBAR_4',
  HOTBAR_5 = 'HOTBAR_5',
}

export const appControlsMap: KeyboardControlsEntry<AppControls>[] = [
  { name: AppControls.HOTBAR_1, keys: ['Digit1', 'Numpad1'] },
  { name: AppControls.HOTBAR_2, keys: ['Digit2', 'Numpad2'] },
  { name: AppControls.HOTBAR_3, keys: ['Digit3', 'Numpad3'] },
  { name: AppControls.HOTBAR_4, keys: ['Digit4', 'Numpad4'] },
  { name: AppControls.HOTBAR_5, keys: ['Digit5', 'Numpad5'] },
];
```

This defines the keyboard controls for the five active hotbar slots.

### 3. Updating HotbarItem Component
Now I'll update the HotbarItem component to display the keyboard shortcut:

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
              <span className="font-sans">{modifierText}</span>
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

This updates the HotbarItem to display the appropriate shortcut indicator (⌘ or Ctrl) along with the slot number. It also adds the shortcut to the tooltip.

### 4. Implementing Toggle Actions in Pane Store
After examining the codebase, I'll add toggle actions to the pane store. These actions will check if a pane is already open and active, and either close it or open it.

First, I need to update the `PaneStoreType` to include the new toggle actions:

```typescript
// Adding to src/stores/panes/types.ts
export interface PaneStoreType extends PaneState {
  // ...existing actions...
  
  // New Toggle Actions
  toggleSellComputePane: () => void;
  toggleWalletPane: () => void;
  toggleDvmJobHistoryPane: () => void;
}
```

Then, I'll implement these toggle actions in the pane store:

```typescript
// Adding to src/stores/pane.ts
// Inside the create<PaneStoreType>()(persist((set, get) => ({...})))

// New Toggle Actions
toggleSellComputePane: () => set((state) => {
  const paneId = SELL_COMPUTE_PANE_ID_CONST;
  const existingPane = state.panes.find(p => p.id === paneId);
  if (existingPane && state.activePaneId === paneId) {
    // Close pane logic
    const remainingPanes = state.panes.filter(p => p.id !== paneId);
    let newActivePaneId: string | null = null;
    if (remainingPanes.length > 0) newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
    const updatedPanes = remainingPanes.map(p => ({ ...p, isActive: p.id === newActivePaneId }));
    return { ...state, panes: updatedPanes, activePaneId: newActivePaneId };
  } else {
    // Open pane logic using addPaneActionLogic
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const newPaneInput: PaneInput = {
      id: SELL_COMPUTE_PANE_ID_CONST, 
      type: 'sell_compute',
      title: 'Sell Compute Power',
      x: Math.max(20, (screenWidth - 550) / 2),
      y: Math.max(20, (screenHeight - 420) / 3),
      width: 550,
      height: 420,
      dismissable: true,
      content: {}
    };
    return addPaneActionLogic(state, newPaneInput, false);
  }
}),

toggleWalletPane: () => set((state) => {
  const paneId = WALLET_PANE_ID;
  const existingPane = state.panes.find(p => p.id === paneId);
  if (existingPane && state.activePaneId === paneId) {
    // Close pane logic
    const remainingPanes = state.panes.filter(p => p.id !== paneId);
    let newActivePaneId: string | null = null;
    if (remainingPanes.length > 0) newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
    const updatedPanes = remainingPanes.map(p => ({ ...p, isActive: p.id === newActivePaneId }));
    return { ...state, panes: updatedPanes, activePaneId: newActivePaneId };
  } else {
    // Open pane logic
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const newPaneInput: PaneInput = {
      id: WALLET_PANE_ID,
      type: 'wallet',
      title: WALLET_PANE_TITLE,
      x: Math.max(20, (screenWidth - 450) / 2 + 50),
      y: Math.max(20, (screenHeight - 550) / 3 + 50),
      width: 450,
      height: 550,
      dismissable: true,
      content: {}
    };
    return addPaneActionLogic(state, newPaneInput, false);
  }
}),

toggleDvmJobHistoryPane: () => set((state) => {
  const paneId = DVM_JOB_HISTORY_PANE_ID;
  const existingPane = state.panes.find(p => p.id === paneId);
  if (existingPane && state.activePaneId === paneId) {
    // Close pane logic
    const remainingPanes = state.panes.filter(p => p.id !== paneId);
    let newActivePaneId: string | null = null;
    if (remainingPanes.length > 0) newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
    const updatedPanes = remainingPanes.map(p => ({ ...p, isActive: p.id === newActivePaneId }));
    return { ...state, panes: updatedPanes, activePaneId: newActivePaneId };
  } else {
    // Open pane logic
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const newPaneInput: PaneInput = {
      id: DVM_JOB_HISTORY_PANE_ID,
      type: 'dvm_job_history',
      title: 'DVM Job History & Stats',
      x: Math.max(20, (screenWidth - 800) / 2 - 50),
      y: Math.max(20, (screenHeight - 600) / 3 - 50),
      width: 800,
      height: 600,
      dismissable: true,
      content: {}
    };
    return addPaneActionLogic(state, newPaneInput, false);
  }
}),
```

These actions will toggle (open/close) the Sell Compute, Wallet, and DVM Job History panes.

### 5. Update Hotbar Component Props
Now I'll update the Hotbar component to use the new toggle function props:

```typescript
// src/components/hud/Hotbar.tsx
// Updating interface and component parameters
interface HotbarProps {
  className?: string;
  isHandTrackingActive: boolean;
  onToggleHandTracking: () => void;
  // Changed prop names to reflect toggle nature
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
  const resetHUDState = usePaneStore((state) => state.resetHUDState);
  const activePaneId = usePaneStore((state) => state.activePaneId);
  
  // Rest of component...
  
  // Use the toggle function props in onClick handlers
  <HotbarItem slotNumber={1} onClick={onToggleSellComputePane} ... />
  <HotbarItem slotNumber={2} onClick={onToggleWalletPane} ... />
  <HotbarItem slotNumber={3} onClick={onToggleHandTracking} ... />
  <HotbarItem slotNumber={4} onClick={onToggleDvmJobHistoryPane} ... />
  <HotbarItem slotNumber={5} onClick={resetHUDState} ... />
}
```

### 6. Integrate KeyboardControls in HomePage
Finally, I'll integrate the KeyboardControls component in HomePage and implement the keyboard shortcut handler:

```typescript
// src/pages/HomePage.tsx
// Add imports
import { KeyboardControls, type KeyboardControlsState } from '@react-three/drei';
import { AppControls, appControlsMap } from '@/controls';
import { isMacOs } from '@/utils/os';

// Inside HomePage component
// Get toggle functions from pane store
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

// Add keyboard handler function
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

// Wrap the return value with KeyboardControls
return (
  <KeyboardControls map={appControlsMap} onChange={handleKeyboardChange}>
    <div className="relative h-full w-full overflow-hidden">
      {/* ...existing content... */}
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
```

## Testing Plan
After implementing these changes, I'll test:
1. Keyboard shortcuts: Press Cmd+1 through Cmd+5 (on macOS) or Ctrl+1 through Ctrl+5 (on other platforms) to verify they toggle the correct panes or actions
2. UI display: Verify the shortcuts are correctly displayed in the Hotbar buttons and tooltips
3. Toggle functionality: Ensure that pressing a shortcut when a pane is open closes it, and when a pane is closed opens it

## Conclusion
The implementation adds keyboard shortcuts to the Hotbar, providing a more efficient way for users to interact with the application. The keyboard shortcuts follow platform conventions (Cmd on macOS, Ctrl elsewhere) and are clearly labeled in the UI.