# Implementing Keyboard Shortcuts for Hotbar Buttons

## Initial Analysis

- Task: Implement keyboard shortcuts for the Hotbar buttons using `Cmd+Number` (macOS) or `Ctrl+Number` (other platforms)
- The shortcuts should toggle the associated pane or action, just like clicking the button
- Will use `@react-three/drei`'s `KeyboardControls` component for implementation initially but switch to native DOM event listeners due to issues

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
  if (typeof navigator !== "undefined") {
    return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  }
  // Fallback for non-browser environments if window.electronAPI.platform is available from preload
  if (typeof window !== "undefined" && (window as any).electronAPI?.platform) {
    return (window as any).electronAPI.platform === "darwin";
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
import { type KeyboardControlsEntry } from "@react-three/drei";

export enum AppControls {
  HOTBAR_1 = "HOTBAR_1",
  HOTBAR_2 = "HOTBAR_2",
  HOTBAR_3 = "HOTBAR_3",
  HOTBAR_4 = "HOTBAR_4",
  HOTBAR_5 = "HOTBAR_5",
}

export const appControlsMap: KeyboardControlsEntry<AppControls>[] = [
  { name: AppControls.HOTBAR_1, keys: ["Digit1", "Numpad1"] },
  { name: AppControls.HOTBAR_2, keys: ["Digit2", "Numpad2"] },
  { name: AppControls.HOTBAR_3, keys: ["Digit3", "Numpad3"] },
  { name: AppControls.HOTBAR_4, keys: ["Digit4", "Numpad4"] },
  { name: AppControls.HOTBAR_5, keys: ["Digit5", "Numpad5"] },
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

// Toggle actions for keyboard shortcuts
toggleSellComputePane: () => set((state) => {
  const paneId = SELL_COMPUTE_PANE_ID_CONST;
  const existingPane = state.panes.find(p => p.id === paneId);

  if (existingPane && state.activePaneId === paneId) {
    // Pane is open and active, so remove it
    const remainingPanes = state.panes.filter(pane => pane.id !== paneId);
    let newActivePaneId: string | null = null;
    if (remainingPanes.length > 0) {
      newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
    }
    const updatedPanes = remainingPanes.map(p => ({
      ...p,
      isActive: p.id === newActivePaneId
    }));

    return {
      ...state,
      panes: updatedPanes,
      activePaneId: newActivePaneId
    };
  } else {
    // Pane doesn't exist or isn't active, so open/activate it
    if (existingPane) {
      // Pane exists but isn't active, bring it to front
      const updatedPanes = state.panes.map(p => ({
        ...p,
        isActive: p.id === paneId
      }));

      return {
        ...state,
        panes: updatedPanes,
        activePaneId: paneId
      };
    } else {
      // Pane doesn't exist, create it
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

      const newPaneInput: PaneInput = {
        id: paneId,
        type: 'sell_compute',
        title: 'Sell Compute',
        x: Math.max(PANE_MARGIN, (screenWidth - SELL_COMPUTE_INITIAL_WIDTH) / 2),
        y: Math.max(PANE_MARGIN, (screenHeight - SELL_COMPUTE_INITIAL_HEIGHT) / 3),
        width: SELL_COMPUTE_INITIAL_WIDTH,
        height: SELL_COMPUTE_INITIAL_HEIGHT,
        dismissable: true,
        content: {}
      };

      return addPaneAction(set, newPaneInput, false)(state);
    }
  }
}),

// Similar implementations for toggleWalletPane and toggleDvmJobHistoryPane...
```

These actions toggle (open/close) the Sell Compute, Wallet, and DVM Job History panes.

### 5. Update Hotbar Component

Next, I updated the Hotbar component to use the new toggle functions:

```typescript
// src/components/hud/Hotbar.tsx
interface HotbarProps {
  className?: string;
  isHandTrackingActive: boolean;
  onToggleHandTracking: () => void;
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
  onToggleDvmJobHistoryPane
}) => {
  const { resetHUDState, activePaneId } = usePaneStore(
    useShallow(state => ({
      resetHUDState: state.resetHUDState,
      activePaneId: state.activePaneId
    }))
  );

  return (
    <div className={/* ... */}>
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
      <HotbarItem slotNumber={5} onClick={resetHUDState} title="Reset HUD Layout">
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>

      {/* Fill the remaining slots with empty HotbarItems */}
      {Array.from({ length: 4 }).map((_, i) => (
        <HotbarItem key={`empty-slot-${i}`} slotNumber={i + 6} isGhost>
          <span className="w-5 h-5" />
        </HotbarItem>
      ))}
    </div>
  );
};
```

### 6. Adding Keyboard Shortcut Handlers to HomePage

Initially, I implemented keyboard shortcuts using `@react-three/drei`'s `KeyboardControls`, but encountered an issue where the event object was not available in the state, causing warnings:

```
HomePage.tsx:172 KeyboardControls: Event object not found in state.
```

To fix this, I switched to using a global event listener with useEffect:

```typescript
// Set up a global keydown handler since KeyboardControls doesn't always provide the event
useEffect(() => {
  const handleGlobalKeyDown = (event: KeyboardEvent) => {
    // Only handle modifier + digit combinations
    const modifier = isMacOs() ? event.metaKey : event.ctrlKey;
    if (!modifier) return;

    const digit = parseInt(event.key);
    if (isNaN(digit) || digit < 1 || digit > 5) return;

    event.preventDefault();

    // Call the appropriate toggle function based on the digit
    switch (digit) {
      case 1:
        console.log("Keyboard: Toggle Sell Compute");
        toggleSellComputePane();
        break;
      case 2:
        console.log("Keyboard: Toggle Wallet Pane");
        toggleWalletPane();
        break;
      case 3:
        console.log("Keyboard: Toggle Hand Tracking");
        toggleHandTracking();
        break;
      case 4:
        console.log("Keyboard: Toggle DVM Job History Pane");
        toggleDvmJobHistoryPane();
        break;
      case 5:
        console.log("Keyboard: Reset HUD");
        resetHUDState();
        break;
    }
  };

  // Add global event listener
  window.addEventListener("keydown", handleGlobalKeyDown);

  // Cleanup
  return () => {
    window.removeEventListener("keydown", handleGlobalKeyDown);
  };
}, [
  toggleSellComputePane,
  toggleWalletPane,
  toggleHandTracking,
  toggleDvmJobHistoryPane,
  resetHUDState,
]);
```

I kept the `KeyboardControls` wrapper for compatibility but made it a stub that doesn't try to use the event object.

## Testing

After implementing these changes, I tested:

1. Keyboard shortcuts: Confirmed that Cmd+1 through Cmd+5 (on macOS) or Ctrl+1 through Ctrl+5 (on other platforms) correctly toggle the associated panes/actions
2. UI display: Verified that shortcuts are correctly displayed in the Hotbar buttons and tooltips
3. Toggle functionality: Verified that pressing a shortcut when a pane is open closes it, and when a pane is closed opens it

## Issues and Solutions

- The `@react-three/drei` `KeyboardControls` component worked for displaying shortcuts but had issues with event handling outside of a Three.js context
- Solution: Implemented a native keydown event listener using useEffect for more reliable keyboard shortcut handling

## Conclusion

The implementation adds keyboard shortcuts to the Hotbar, providing a more efficient way for users to interact with the application. The keyboard shortcuts follow platform conventions (Cmd on macOS, Ctrl elsewhere) and are clearly labeled in the UI.

The change to native event handling ensures that the keyboard shortcuts work reliably across all platforms and environments, even without a proper Three.js context.
