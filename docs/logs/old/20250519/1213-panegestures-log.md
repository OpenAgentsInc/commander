# Hand Tracking and Pinch-to-Drag Implementation

I'll be implementing a hand tracking toggle button and pinch-to-drag functionality for panes as specified in the instructions. This log tracks my progress.

## Step 1: Create the HandTrackingToggleButton component

Created a new button component that will toggle hand tracking functionality.

```typescript
// src/components/hands/HandTrackingToggleButton.tsx
import React from 'react';
import { Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HandTrackingToggleButtonProps {
  isHandTrackingActive: boolean;
  onToggle: () => void;
  className?: string;
}

const HandTrackingToggleButton: React.FC<HandTrackingToggleButtonProps> = ({
  isHandTrackingActive,
  onToggle,
  className = '',
}) => {
  return (
    <Button
      onClick={onToggle}
      variant="outline"
      size="icon"
      className={`fixed bottom-4 left-16 z-[10000] p-2 !rounded-full shadow-lg transition-colors duration-200 ease-in-out ${
        isHandTrackingActive ? 'bg-primary/90 text-primary-foreground border-primary hover:bg-primary' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border'
      } ${className}`}
      aria-label={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"}
      title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"}
    >
      <Hand className={`h-4 w-4 ${isHandTrackingActive ? 'text-green-400' : 'text-muted-foreground'}`} />
    </Button>
  );
};

export default HandTrackingToggleButton;
```

## Step 2: Update HandTracking component to support data callbacks

Added a new `onHandDataUpdate` callback prop to the HandTracking component that provides hand position and pose data to parent components:

```typescript
// Updated src/components/hands/HandTracking.tsx
import React, { useEffect } from "react";
import { useHandTracking } from "./useHandTracking";
import {
  HandPose,
  type PinchCoordinates,
  type HandLandmarks,
} from "./handPoseTypes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ThreeScene from "./ThreeScene";

interface HandDataForCallback {
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
  primaryHandLandmarks: HandLandmarks | null;
  trackedHandsCount: number;
}

interface HandTrackingProps {
  showHandTracking: boolean;
  setShowHandTracking: (show: boolean) => void;
  onHandDataUpdate?: (data: HandDataForCallback) => void;
}
```

Added an effect to send hand data to parent components:

```typescript
useEffect(() => {
  if (onHandDataUpdate && showHandTracking) {
    const primaryHand = trackedHands.length > 0 ? trackedHands[0] : null;
    onHandDataUpdate({
      activeHandPose: primaryHand ? primaryHand.pose : HandPose.NONE,
      pinchMidpoint: primaryHand ? primaryHand.pinchMidpoint : null,
      primaryHandLandmarks: primaryHand ? primaryHand.landmarks : null,
      trackedHandsCount: trackedHands.length,
    });
  } else if (onHandDataUpdate && !showHandTracking) {
    // Send null/empty data when tracking is off
    onHandDataUpdate({
      activeHandPose: HandPose.NONE,
      pinchMidpoint: null,
      primaryHandLandmarks: null,
      trackedHandsCount: 0,
    });
  }
}, [trackedHands, onHandDataUpdate, showHandTracking]);
```

Also improved handling of pointer events and canvas visibility:

```typescript
<div className="fixed inset-0" style={{ pointerEvents: showHandTracking ? 'auto' : 'none' }}>
  {showHandTracking && <ThreeScene handPosition={handPosition} />}
</div>

<canvas
  ref={landmarkCanvasRef}
  className="absolute w-full h-full transform scale-x-[-1]"
  style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 10, visibility: showHandTracking ? 'visible' : 'hidden' }}
/>
```

## Step 3: Update HomePage component to implement pinch-to-drag

Completely rewrote the HomePage component to add hand tracking toggle button and pinch-to-drag functionality:

```typescript
import React, { useState, useEffect, useRef } from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
import ResetHUDButton from "@/components/ResetHUDButton";
import HandTrackingToggleButton from "@/components/hands/HandTrackingToggleButton";
import { HandTracking } from "@/components/hands";
import { type HandPose, type PinchCoordinates, type HandLandmarks } from "@/components/hands/handPoseTypes";
import { usePaneStore } from "@/stores/pane";

// ...interface definition and constants...

export default function HomePage() {
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
  const [handData, setHandData] = useState<HandDataContext | null>(null);

  // Pinch-to-drag state
  const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
  const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const { panes, bringPaneToFront, updatePanePosition, activePaneId } = usePaneStore();

  // ...toggleHandTracking and handleHandDataUpdate functions...

  // Effect for pinch-to-drag logic
  useEffect(() => {
    if (!isHandTrackingActive || !handData) return;

    const { activeHandPose, pinchMidpoint } = handData;

    if (activeHandPose === HandPose.PINCH_CLOSED && pinchMidpoint) {
      // Logic for starting or continuing a drag operation
      // ...
    } else if (draggingPaneId) {
      // Reset drag state when pose changes
      setDraggingPaneId(null);
      initialPinchPositionRef.current = null;
      paneStartPosRef.current = null;
    }
  }, [isHandTrackingActive, handData, panes, draggingPaneId /* ... more deps ... */]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <SimpleGrid />
      <PaneManager />
      <HandTracking
        showHandTracking={isHandTrackingActive}
        setShowHandTracking={setIsHandTrackingActive}
        onHandDataUpdate={handleHandDataUpdate}
      />
      <ResetHUDButton />
      <HandTrackingToggleButton
        isHandTrackingActive={isHandTrackingActive}
        onToggle={toggleHandTracking}
      />
    </div>
  );
}
```

## Step 4: Update Pane component to handle external position updates

Updated the `useResizeHandlers` hook in Pane.tsx to better respond to position updates from external sources (like pinch-to-drag):

```typescript
useEffect(() => {
  if (
    !isCurrentlyInteracting &&
    (initialPosition.x !== prevPositionRef.current.x ||
      initialPosition.y !== prevPositionRef.current.y) &&
    (position.x !== initialPosition.x || position.y !== initialPosition.y)
  ) {
    setPosition(initialPosition);
  }
  if (!isCurrentlyInteracting) {
    prevPositionRef.current = initialPosition;
  }
}, [
  initialPosition.x,
  initialPosition.y,
  isCurrentlyInteracting,
  position.x,
  position.y,
]);
```

The same approach was applied to the size effect to ensure proper synchronization between the store and the component's local state.

## Summary of Changes

1. **Added HandTrackingToggleButton Component**

   - Created a new component that provides a visually appealing toggle button
   - Positioned at bottom left of the screen for easy access
   - Shows active/inactive state with appropriate styling

2. **Enhanced HandTracking Component**

   - Added support for external data callbacks with `onHandDataUpdate` prop
   - Improved pointer events handling based on activation state
   - Fixed canvas visibility to hide when hand tracking is disabled

3. **Updated HomePage Component**

   - Added state management for hand tracking activation
   - Implemented pinch-to-drag detection logic in the title bar area
   - Created a system to track initial pinch position and pane position
   - Added delta calculation to move panes based on pinch movement

4. **Fixed Pane Component**
   - Updated the position and size synchronization logic
   - Ensured smooth transitions between mouse/touch and hand gestures
   - Fixed dependency arrays to properly react to position changes

The implementation now allows users to toggle hand tracking on and off with a button, and when active, they can pinch the title bar of any pane to drag it around the screen. This creates a more immersive and natural interaction model for the application.

## Testing and Verification

1. **Type Checking**

   - Fixed an issue with HandPose import in HomePage.tsx
   - Changed from `import { type HandPose, ... }` to `import { HandPose } from "@/components/hands"`
   - All TypeScript type checks now pass with `pnpm tsc --noEmit`

2. **Linting**
   - All lint errors are existing issues in third-party code (MediaPipe library)
   - Our new code follows the project's coding style and conventions

The implementation is now ready for use and should provide a seamless experience transitioning between mouse/touch controls and hand gesture controls.

## Bug Fix: Infinite Update Loop

After testing in the app, we discovered an issue where the pinch-to-drag feature was causing an infinite update loop with the error:

```
Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

This was fixed by making changes in both the HomePage and HandTracking components:

### In the HandTracking component:

1. Added a `prevHandDataRef` to track previous hand tracking data states
2. Implemented change detection to only send updates when data meaningfully changes
3. Debounced hand position updates by rounding coordinate values
4. Added conditional checks to avoid unnecessary callbacks
5. Improved handling of tracking on/off state transitions

```typescript
// Using refs to prevent update loops
const prevHandDataRef = useRef<{
  activeHandPose: HandPose;
  pinchCoords: string | null;
  trackedHandsCount: number;
}>({
  activeHandPose: HandPose.NONE,
  pinchCoords: null,
  trackedHandsCount: 0,
});

// Only update if data has meaningfully changed
const hasChanged =
  currentHandPose !== prevHandDataRef.current.activeHandPose ||
  currentPinchCoords !== prevHandDataRef.current.pinchCoords ||
  trackedHands.length !== prevHandDataRef.current.trackedHandsCount;

if (hasChanged) {
  // Update and send data
  // ...
}
```

### In the HomePage component:

1. Added change detection to prevent unnecessary state updates
2. Used a ref to compare previous and current hand data
3. Added position change threshold detection for dragging
4. Updated reference points during dragging to track relative movement
5. Reduced dependencies in the useEffect hook:
   ```typescript
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isHandTrackingActive, handData, draggingPaneId]);
   ```

```typescript
// In HomePage.tsx - improved handler to prevent update loops
const prevHandDataRef = useRef<HandDataContext | null>(null);

const handleHandDataUpdate = (data: HandDataContext) => {
  // Only update state if data has meaningfully changed
  if (
    !prevHandDataRef.current ||
    data.activeHandPose !== prevHandDataRef.current.activeHandPose ||
    data.trackedHandsCount !== prevHandDataRef.current.trackedHandsCount ||
    JSON.stringify(data.pinchMidpoint) !==
      JSON.stringify(prevHandDataRef.current.pinchMidpoint)
  ) {
    prevHandDataRef.current = data;
    setHandData(data);
  }
};
```

The implementation now properly handles pinch-to-drag without performance issues or infinite update loops, even when the app first loads.

## Final Bugfixes

Fixed a missing import in HandTracking.tsx:

```typescript
import React, { useEffect, useRef } from "react";
```

All the changes have been tested and the application now runs without any "Maximum update depth exceeded" errors. The hand tracking toggle button works properly and the pinch-to-drag functionality operates smoothly without causing infinite update loops.

## UI Refinements

Based on user feedback, we made the following UI refinements:

1. **Removed UI Controls from HandTracking Component**:

   - Eliminated all status, pose, and switch controls from the top corners
   - Removed pinch coordinate displays
   - Simplified to just rely on the toggle button in the bottom left

2. **Simplified HandTrackingToggleButton**:
   - Changed the icon color to use a neutral black foreground color instead of green
   - Simplified the icon appearance to be more subtle

The interface is now much cleaner with just a single toggle button in the bottom left corner, eliminating all the additional debugging UI elements that were previously visible.

## Additional Transparency Improvements

Further improved the UI based on user feedback:

1. **Removed 3D Scene**:

   - Completely removed the ThreeScene component to show only the hand tracking
   - Eliminated all the 3D boxes/visuals from the interface

2. **Increased Pane Transparency**:
   - Made panes semi-transparent (90% opacity) and added backdrop blur
   - Added `bg-black/60` to pane content for better transparency
   - Changed title bar to `bg-black/80` for improved visibility of hands
   - These changes allow users to see hand tracking through panes

These transparency improvements make it easier to see the hand tracking feature while still maintaining the usability of the panes. The semi-transparent design creates a more immersive experience where users can see their hands behind the panes they're manipulating.
