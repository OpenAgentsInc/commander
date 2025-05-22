Okay, I will provide specific instructions to implement the hand tracking toggle button and pinch-to-drag functionality for panes.

**I. Add Hand Tracking Toggle Button**

1.  **Create `src/components/hands/HandTrackingToggleButton.tsx`**:
    Create a new file for the button component. This button will be responsible for toggling the hand tracking feature.

    ```typescript
    // src/components/hands/HandTrackingToggleButton.tsx
    import React from 'react';
    import { Hand } from 'lucide-react'; // Using lucide-react for icons
    import { Button } from '@/components/ui/button'; // Assuming your Button component

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
          variant="outline" // Or any variant you prefer
          size="icon" // Assuming your Button component supports an icon size
          className={`fixed bottom-4 left-16 z-[10000] p-2 !rounded-full shadow-lg ${
            isHandTrackingActive ? 'bg-primary/80 text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          } ${className}`}
          aria-label={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"}
          title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"}
        >
          <Hand className={`h-4 w-4 ${isHandTrackingActive ? 'text-green-400' : ''}`} />
        </Button>
      );
    };

    export default HandTrackingToggleButton;
    ```

2.  **Update `src/pages/HomePage.tsx`**:

    - Import the new button and `HandTracking` component.
    - Add state to manage hand tracking activation.
    - Render the button and pass the state to the `HandTracking` component.
    - Implement the pinch-to-drag logic here.

    ```typescript
    // src/pages/HomePage.tsx
    import React, { useState, useEffect, useRef } from "react";
    import { PaneManager } from "@/panes/PaneManager";
    import { SimpleGrid } from "@/components/home/SimpleGrid";
    import ResetHUDButton from "@/components/ResetHUDButton";
    import HandTrackingToggleButton from "@/components/hands/HandTrackingToggleButton"; // Import new button
    import { HandTracking, type HandPosition } from "@/components/hands"; // Import HandTracking and its types
    import { type HandPose, type PinchCoordinates, type HandLandmarks } from "@/components/hands/handPoseTypes";
    import { usePaneStore } from "@/stores/pane";

    interface HandData {
      activeHandPose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
      primaryHandLandmarks: HandLandmarks | null; // Not used for drag, but good to have
      trackedHandsCount: number;
    }

    const TITLE_BAR_HEIGHT = 32; // From Pane.tsx h-8 (2rem = 32px)

    export default function HomePage() {
      const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
      const [handData, setHandData] = useState<HandData | null>(null);

      // Pinch-to-drag state
      const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
      const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
      const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

      const { panes, bringPaneToFront, updatePanePosition, setActivePane } = usePaneStore();

      const toggleHandTracking = () => {
        setIsHandTrackingActive(prev => !prev);
        if (isHandTrackingActive) { // If it was active, now it's being turned off
          setDraggingPaneId(null); // Reset dragging state
          initialPinchPositionRef.current = null;
          paneStartPosRef.current = null;
        }
      };

      const handleHandDataUpdate = (data: HandData) => {
        setHandData(data);
      };

      // Effect for pinch-to-drag logic
      useEffect(() => {
        if (!isHandTrackingActive || !handData) {
          if (draggingPaneId) { // If hand tracking is disabled while dragging, stop dragging
            setDraggingPaneId(null);
            initialPinchPositionRef.current = null;
            paneStartPosRef.current = null;
          }
          return;
        }

        const { activeHandPose, pinchMidpoint } = handData;

        if (activeHandPose === HandPose.PINCH_CLOSED && pinchMidpoint) {
          if (!draggingPaneId) { // Start dragging
            // Iterate panes in reverse to check topmost panes first
            for (let i = panes.length - 1; i >= 0; i--) {
              const pane = panes[i];
              if (
                pinchMidpoint.x >= pane.x &&
                pinchMidpoint.x <= pane.x + pane.width &&
                pinchMidpoint.y >= pane.y &&
                pinchMidpoint.y <= pane.y + TITLE_BAR_HEIGHT
              ) {
                setDraggingPaneId(pane.id);
                paneStartPosRef.current = { x: pane.x, y: pane.y };
                initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
                if (pane.id !== usePaneStore.getState().activePaneId) {
                  bringPaneToFront(pane.id); // This also sets it active
                }
                break;
              }
            }
          } else if (draggingPaneId && initialPinchPositionRef.current && paneStartPosRef.current) { // Continue dragging
            const deltaX = pinchMidpoint.x - initialPinchPositionRef.current.x;
            const deltaY = pinchMidpoint.y - initialPinchPositionRef.current.y;

            const newX = paneStartPosRef.current.x + deltaX;
            const newY = paneStartPosRef.current.y + deltaY;

            // Update pane position directly (the store action handles bounds checking)
            updatePanePosition(draggingPaneId, newX, newY);
          }
        } else { // Pinch released or pose changed
          if (draggingPaneId) {
            setDraggingPaneId(null);
            initialPinchPositionRef.current = null;
            paneStartPosRef.current = null;
          }
        }
      }, [isHandTrackingActive, handData, panes, draggingPaneId, bringPaneToFront, updatePanePosition, setActivePane]);


      return (
        <div className="relative w-full h-full overflow-hidden">
          <SimpleGrid />
          <PaneManager />

          {/* Hand Tracking Component - always rendered but controlled by showHandTracking */}
          {/* The HandTracking component itself has UI, but we also add our global toggle */}
          <HandTracking
            showHandTracking={isHandTrackingActive}
            setShowHandTracking={setIsHandTrackingActive} // Allow internal switch to also control state
            onHandDataUpdate={handleHandDataUpdate} // Callback to get hand data
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

3.  **Modify `src/components/hands/HandTracking.tsx` to add `onHandDataUpdate` prop**:

    ```typescript
    // src/components/hands/HandTracking.tsx
    import React, { useEffect } from 'react'; // Added useEffect
    import { useHandTracking, type HandPosition } from './useHandTracking'; // Ensure HandPosition is exported
    import { HandPose, type PinchCoordinates, type HandLandmarks } from './handPoseTypes'; // Ensure these are exported
    import { Switch } from "@/components/ui/switch";
    import { Label } from "@/components/ui/label";
    import ThreeScene from './ThreeScene';

    interface HandDataForCallback {
      activeHandPose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
      primaryHandLandmarks: HandLandmarks | null;
      trackedHandsCount: number;
    }

    interface HandTrackingProps {
      showHandTracking: boolean;
      setShowHandTracking: (show: boolean) => void;
      onHandDataUpdate?: (data: HandDataForCallback) => void; // New callback prop
    }

    export default function HandTracking({
      showHandTracking,
      setShowHandTracking,
      onHandDataUpdate // Destructure new prop
    }: HandTrackingProps) {
      const {
        videoRef,
        landmarkCanvasRef,
        handPosition, // This is for the 3D pointer, might be different from pinchMidpoint
        handTrackingStatus,
        // activeHandPose, // These will be derived from trackedHands
        // pinchMidpoint,  // for the primary hand
        trackedHands    // Use this for more detailed info
      } = useHandTracking({ enabled: showHandTracking });

      // Derive primary hand data for the callback
      useEffect(() => {
        if (onHandDataUpdate) {
          const primaryHand = trackedHands.length > 0 ? trackedHands[0] : null;
          onHandDataUpdate({
            activeHandPose: primaryHand ? primaryHand.pose : HandPose.NONE,
            pinchMidpoint: primaryHand ? primaryHand.pinchMidpoint : null,
            primaryHandLandmarks: primaryHand ? primaryHand.landmarks : null,
            trackedHandsCount: trackedHands.length
          });
        }
      }, [trackedHands, onHandDataUpdate, showHandTracking]);

      // Get activeHandPose and pinchMidpoint for UI display from the first tracked hand
      const displayHand = trackedHands.length > 0 ? trackedHands[0] : null;
      const displayActiveHandPose = displayHand ? displayHand.pose : HandPose.NONE;
      const displayPinchMidpoint = displayHand ? displayHand.pinchMidpoint : null;

      return (
        <>
          {/* Three.js scene with hand position tracking */}
          <div className="fixed inset-0" style={{ pointerEvents: showHandTracking ? 'auto' : 'none' }}> {/* Conditional pointer events */}
            {showHandTracking && <ThreeScene handPosition={handPosition} />}
          </div>

          {/* Hand tracking controls - split between left and right sides */}
          <div className="absolute top-5 right-5 flex flex-col gap-3 z-30" style={{ pointerEvents: 'auto' }}>
            {/* The HandTrackingToggleButton is now the primary global toggle.
                This internal switch can remain for visual feedback or be removed if desired.
                For now, it reflects the global state. */}
            <div className="flex items-center space-x-2 bg-black bg-opacity-50 p-2 rounded">
              <Switch
                id="hand-tracking-internal"
                checked={showHandTracking}
                onCheckedChange={setShowHandTracking} // This allows internal toggle to also work
              />
              <Label htmlFor="hand-tracking-internal" className="text-white">Hand Tracking</Label>
            </div>

            {showHandTracking && (
              <>
                <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs">
                  Status: {handTrackingStatus}
                </p>
                <p className="bg-black bg-opacity-50 text-white p-2 rounded text-xs transition-colors">
                  Pose: <span className={displayActiveHandPose === HandPose.PINCH_CLOSED ? 'text-primary font-bold' : ''}>{displayActiveHandPose === HandPose.NONE ? 'N/A' : displayActiveHandPose}</span>
                </p>
              </>
            )}
          </div>

          {/* Pinch coordinate display on LEFT side of screen */}
          {showHandTracking && displayPinchMidpoint && (
            <div className="absolute top-5 left-5 z-30" style={{ pointerEvents: 'auto' }}>
              <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                Pinch: {Math.round(displayPinchMidpoint.x)}, {Math.round(displayPinchMidpoint.y)} px
              </p>
            </div>
          )}

          {/* Hidden video element for camera input */}
          {showHandTracking && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute w-full h-full object-cover transform scale-x-[-1]"
              style={{ top: 0, left: 0, zIndex: 1, opacity: 0, pointerEvents: 'none' }}
            />
          )}

          {/* Canvas for hand landmarks */}
          <canvas
            ref={landmarkCanvasRef}
            className="absolute w-full h-full transform scale-x-[-1]"
            style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 10, visibility: showHandTracking ? 'visible' : 'hidden' }}
          />
        </>
      );
    }
    ```

4.  **Modify `src/components/hands/useHandTracking.ts` to expose `trackedHands`**:
    The hook already returns `trackedHands`. Ensure its type `TrackedHandInfo` (and `HandLandmarks`, `PinchCoordinates` from `handPoseTypes.ts`) is correctly defined and exported.

    ```typescript
    // src/components/hands/useHandTracking.ts
    // ... (ensure imports for HandPose, HandLandmarks, PinchCoordinates are correct)
    // import { HandPose, type HandLandmarks, type PinchCoordinates } from "./handPoseTypes";
    // ...

    // Ensure TrackedHandInfo is defined or imported correctly
    interface TrackedHandInfo {
      // Make sure this matches or is imported
      landmarks: HandLandmarks;
      pose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
      handedness: string;
    }

    // ... existing code ...

    export function useHandTracking({ enabled }: UseHandTrackingOptions) {
      // ... existing state ...
      const [trackedHands, setTrackedHands] = useState<TrackedHandInfo[]>([]); // Already exists

      const onHandTrackingResults = useCallback(
        (results: HandResults) => {
          // ... existing logic to populate currentFrameTrackedHands ...
          // Ensure currentPinchMidpoint is calculated and assigned to currentFrameTrackedHands[index].pinchMidpoint
          // Example snippet for pinchMidpoint calculation within the loop:
          /*
            if (pose === HandPose.PINCH_CLOSED) {
              const thumbTip = landmarks[4];
              const indexTip = landmarks[8];
              if (thumbTip && indexTip && landmarkCanvasRef.current) {
                const normalizedMidX = (thumbTip.x + indexTip.x) / 2;
                const normalizedMidY = (thumbTip.y + indexTip.y) / 2;
                const mirroredNormalizedMidX = 1 - normalizedMidX; // Flip X
                currentPinchMidpoint = {
                  x: mirroredNormalizedMidX * window.innerWidth, // Screen coords
                  y: normalizedMidY * window.innerHeight,      // Screen coords
                  z: (thumbTip.z + indexTip.z) / 2,
                  normalizedMidX: normalizedMidX, // Keep original normalized for drawing on canvas
                  normalizedMidY: normalizedMidY,
                };
              }
            }
            currentFrameTrackedHands.push({
              landmarks,
              pose,
              pinchMidpoint: currentPinchMidpoint, // Make sure this is assigned
              handedness
            });
          */
          // ... rest of onHandTrackingResults ...
          setTrackedHands(currentFrameTrackedHands); // This updates the state used by HomePage
        },
        [enabled /*, any other dependencies like landmarkCanvasRef */],
      );

      // ... rest of the hook ...

      // The returned object already includes trackedHands, activeHandPose, and pinchMidpoint
      // but activeHandPose and pinchMidpoint here are for the *first* hand.
      // The callback in HandTracking.tsx will provide data for the primary hand specifically.
      // It might be cleaner for HomePage to directly use `trackedHands[0]` if available.
      // For now, the callback approach is fine.

      // Ensure returned values are consistent with what HandTracking.tsx expects:
      const primaryHand = trackedHands.length > 0 ? trackedHands[0] : null;
      const activeHandPose = primaryHand ? primaryHand.pose : HandPose.NONE;
      const pinchMidpoint = primaryHand ? primaryHand.pinchMidpoint : null;

      return {
        videoRef,
        landmarkCanvasRef,
        handPosition, // This is the index finger tip of the first hand for 3D pointer
        handTrackingStatus,
        activeHandPose, // For the primary hand, used by HandTracking.tsx UI
        pinchMidpoint, // For the primary hand, used by HandTracking.tsx UI
        trackedHands, // Array of all tracked hands with their individual data
      };
    }
    ```

5.  **Ensure `src/components/hands/index.ts` exports necessary types**:
    ```typescript
    // src/components/hands/index.ts
    export { default as HandTracking } from "./HandTracking";
    // ... other exports ...
    export { useHandTracking, type HandPosition } from "./useHandTracking"; // Export HandPosition
    export {
      HandPose,
      type HandLandmarks,
      type PinchCoordinates,
    } from "./handPoseTypes"; // Ensure these are exported
    // ...
    ```

This completes the setup for the hand tracking toggle button and the data flow for pinch gestures. The pinch-to-drag logic is now implemented in `HomePage.tsx`.

One final check: The `PaneManager` component renders panes based on the `panes` array from `usePaneStore`. When `updatePanePosition` is called, the `panes` array will be updated, and `PaneManager` will re-render, causing the `PaneComponent` instances to receive new `x` and `y` props. The `PaneComponent` itself uses local state for rendering its position and size, but it should update this local state when its initial props change (if not interacting). The `useResizeHandlers` hook in `Pane.tsx` needs to correctly handle updates to `initialPosition` and `initialSize` props when `isCurrentlyInteracting` is false.

Adjust `Pane.tsx`'s `useResizeHandlers` hook:

```typescript
// src/panes/Pane.tsx
// Inside useResizeHandlers:
// ...
const [position, setPosition] = useState(initialPosition);
const [size, setSize] = useState(initialSize);

// Using refs to keep track of prev values to avoid unnecessary state updates
// and to correctly reflect store changes when not interacting.
const prevPositionRef = useRef(initialPosition);
const prevSizeRef = useRef(initialSize);

useEffect(() => {
  // If not currently interacting (dragging/resizing via this pane's own gestures)
  // AND the initialPosition prop from the store has changed since last sync
  // AND the local position is different from the new prop (to avoid redundant sets)
  if (
    !isCurrentlyInteracting &&
    (initialPosition.x !== prevPositionRef.current.x ||
      initialPosition.y !== prevPositionRef.current.y) &&
    (position.x !== initialPosition.x || position.y !== initialPosition.y)
  ) {
    setPosition(initialPosition);
  }
  // Always update the ref to the latest prop value when not interacting,
  // so we can detect the *next* change from the store.
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

useEffect(() => {
  if (
    !isCurrentlyInteracting &&
    (initialSize.width !== prevSizeRef.current.width ||
      initialSize.height !== prevSizeRef.current.height) &&
    (size.width !== initialSize.width || size.height !== initialSize.height)
  ) {
    setSize(initialSize);
  }
  if (!isCurrentlyInteracting) {
    prevSizeRef.current = initialSize;
  }
}, [
  initialSize.width,
  initialSize.height,
  isCurrentlyInteracting,
  size.width,
  size.height,
]);
// ...
```

This ensures that if `HomePage.tsx` updates a pane's position in the store due to a pinch drag, the `Pane` component will visually update to that new position because its `initialX` and `initialY` props will change, triggering the `useEffect`. The `isCurrentlyInteracting` flag (derived from `isDragging` or `isResizing` within `Pane.tsx`) ensures that the pane's own mouse/touch interactions don't get overridden by prop changes during an interaction.

For pinch-to-drag, `isCurrentlyInteracting` in `Pane.tsx` would be `false`, allowing the prop-driven updates from the store (triggered by `HomePage.tsx`'s pinch logic) to take effect.Okay, let's integrate the hand-tracking toggle button and the pinch-to-drag functionality.

**I. Add Hand Tracking Toggle Button**

1.  **Create `src/components/hands/HandTrackingToggleButton.tsx`**:

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

2.  **Modify `src/pages/HomePage.tsx`**:

    - Import necessary components and types.
    - Add state for hand tracking and hand data.
    - Implement the pinch-to-drag logic.

    ```typescript
    // src/pages/HomePage.tsx
    import React, { useState, useEffect, useRef } from "react";
    import { PaneManager } from "@/panes/PaneManager";
    import { SimpleGrid } from "@/components/home/SimpleGrid";
    import ResetHUDButton from "@/components/ResetHUDButton";
    import HandTrackingToggleButton from "@/components/hands/HandTrackingToggleButton";
    import { HandTracking } from "@/components/hands";
    import { type HandPose, type PinchCoordinates, type HandLandmarks } from "@/components/hands/handPoseTypes";
    import { usePaneStore } from "@/stores/pane";

    interface HandDataContext {
      activeHandPose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
      primaryHandLandmarks: HandLandmarks | null;
      trackedHandsCount: number;
    }

    const TITLE_BAR_HEIGHT = 32; // From Pane.tsx h-8 (2rem approx 32px)

    export default function HomePage() {
      const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
      const [handData, setHandData] = useState<HandDataContext | null>(null);

      const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
      const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
      const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

      const { panes, bringPaneToFront, updatePanePosition, activePaneId: currentActivePaneId } = usePaneStore();

      const toggleHandTracking = () => {
        const newState = !isHandTrackingActive;
        setIsHandTrackingActive(newState);
        if (!newState && draggingPaneId) { // If turning off while dragging
          setDraggingPaneId(null);
          initialPinchPositionRef.current = null;
          paneStartPosRef.current = null;
        }
      };

      const handleHandDataUpdate = (data: HandDataContext) => {
        setHandData(data);
      };

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
            // Check from topmost pane (end of array)
            for (let i = panes.length - 1; i >= 0; i--) {
              const pane = panes[i];
              if (
                pinchMidpoint.x >= pane.x &&
                pinchMidpoint.x <= pane.x + pane.width &&
                pinchMidpoint.y >= pane.y &&
                pinchMidpoint.y <= pane.y + TITLE_BAR_HEIGHT
              ) {
                setDraggingPaneId(pane.id);
                paneStartPosRef.current = { x: pane.x, y: pane.y };
                initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
                if (pane.id !== currentActivePaneId) {
                   bringPaneToFront(pane.id);
                }
                break;
              }
            }
          } else if (initialPinchPositionRef.current && paneStartPosRef.current) {
            const deltaX = pinchMidpoint.x - initialPinchPositionRef.current.x;
            const deltaY = pinchMidpoint.y - initialPinchPositionRef.current.y;

            const newX = paneStartPosRef.current.x + deltaX;
            const newY = paneStartPosRef.current.y + deltaY;

            updatePanePosition(draggingPaneId, newX, newY);
          }
        } else { // Pinch released or pose changed
          if (draggingPaneId) {
            setDraggingPaneId(null);
            initialPinchPositionRef.current = null;
            paneStartPosRef.current = null;
          }
        }
      }, [
          isHandTrackingActive,
          handData,
          panes,
          draggingPaneId,
          bringPaneToFront,
          updatePanePosition,
          currentActivePaneId
        ]);

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

3.  **Modify `src/components/hands/HandTracking.tsx` to include `onHandDataUpdate` prop**:

    ```typescript
    // src/components/hands/HandTracking.tsx
    import React, { useEffect } from 'react';
    import { useHandTracking, type HandPosition } from './useHandTracking';
    import { HandPose, type PinchCoordinates, type HandLandmarks } from './handPoseTypes';
    import { Switch } from "@/components/ui/switch";
    import { Label } from "@/components/ui/label";
    import ThreeScene from './ThreeScene';

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

    export default function HandTracking({
      showHandTracking,
      setShowHandTracking,
      onHandDataUpdate
    }: HandTrackingProps) {
      const {
        videoRef,
        landmarkCanvasRef,
        handPosition, // For 3D pointer
        handTrackingStatus,
        trackedHands
      } = useHandTracking({ enabled: showHandTracking });

      useEffect(() => {
        if (onHandDataUpdate && showHandTracking) { // Only send data if tracking is active
          const primaryHand = trackedHands.length > 0 ? trackedHands[0] : null;
          onHandDataUpdate({
            activeHandPose: primaryHand ? primaryHand.pose : HandPose.NONE,
            pinchMidpoint: primaryHand ? primaryHand.pinchMidpoint : null,
            primaryHandLandmarks: primaryHand ? primaryHand.landmarks : null,
            trackedHandsCount: trackedHands.length
          });
        } else if (onHandDataUpdate && !showHandTracking) {
          // Send null/empty data when tracking is off
           onHandDataUpdate({
            activeHandPose: HandPose.NONE,
            pinchMidpoint: null,
            primaryHandLandmarks: null,
            trackedHandsCount: 0
          });
        }
      }, [trackedHands, onHandDataUpdate, showHandTracking]);

      const displayHand = trackedHands.length > 0 ? trackedHands[0] : null;
      const displayActiveHandPose = displayHand ? displayHand.pose : HandPose.NONE;
      const displayPinchMidpoint = displayHand ? displayHand.pinchMidpoint : null;

      return (
        <>
          <div className="fixed inset-0" style={{ pointerEvents: showHandTracking ? 'auto' : 'none' }}>
            {showHandTracking && <ThreeScene handPosition={handPosition} />}
          </div>

          <div className="absolute top-5 right-5 flex flex-col gap-3 z-30" style={{ pointerEvents: 'auto' }}>
            <div className="flex items-center space-x-2 bg-black bg-opacity-50 p-2 rounded">
              <Switch
                id="hand-tracking-internal-switch"
                checked={showHandTracking}
                onCheckedChange={setShowHandTracking}
              />
              <Label htmlFor="hand-tracking-internal-switch" className="text-white">Hand Tracking</Label>
            </div>

            {showHandTracking && (
              <>
                <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs">
                  Status: {handTrackingStatus}
                </p>
                <p className="bg-black bg-opacity-50 text-white p-2 rounded text-xs transition-colors">
                  Pose: <span className={displayActiveHandPose === HandPose.PINCH_CLOSED ? 'text-primary font-bold' : ''}>{displayActiveHandPose === HandPose.NONE ? 'N/A' : displayActiveHandPose}</span>
                </p>
              </>
            )}
          </div>

          {showHandTracking && displayPinchMidpoint && (
            <div className="absolute top-5 left-5 z-30" style={{ pointerEvents: 'auto' }}>
              <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                Pinch: {Math.round(displayPinchMidpoint.x)}, {Math.round(displayPinchMidpoint.y)} px
              </p>
            </div>
          )}

          {showHandTracking && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute w-full h-full object-cover transform scale-x-[-1]"
              style={{ top: 0, left: 0, zIndex: 1, opacity: 0, pointerEvents: 'none' }}
            />
          )}

          <canvas
            ref={landmarkCanvasRef}
            className="absolute w-full h-full transform scale-x-[-1]"
            style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 10, visibility: showHandTracking ? 'visible' : 'hidden' }}
          />
        </>
      );
    }
    ```

4.  **Modify `src/components/hands/useHandTracking.ts` for correct `pinchMidpoint` coordinates**:
    The `pinchMidpoint` should be consistently in screen coordinates. The existing calculation seems to do this. Just double check the `mirroredNormalizedMidX` part if `landmarkCanvasRef` mirroring is already handled. The current `onHandTrackingResults` callback calculates screen pixel coordinates for `currentPinchMidpoint.x` and `currentPinchMidpoint.y` which is correct for UI interaction.

5.  **Adjust `src/panes/Pane.tsx`'s `useResizeHandlers` for external updates**:
    Update the `useEffect` hooks in `useResizeHandlers` to correctly sync with prop changes when the pane is not being interacted with by its own drag/resize handlers.

    ```typescript
    // src/panes/Pane.tsx
    // (Inside useResizeHandlers hook)

    // ... (position and size state declarations) ...
    const prevPositionRef = useRef(initialPosition);
    const prevSizeRef = useRef(initialSize);

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

    useEffect(() => {
      if (
        !isCurrentlyInteracting &&
        (initialSize.width !== prevSizeRef.current.width ||
          initialSize.height !== prevSizeRef.current.height) &&
        (size.width !== initialSize.width || size.height !== initialSize.height)
      ) {
        setSize(initialSize);
      }
      if (!isCurrentlyInteracting) {
        prevSizeRef.current = initialSize;
      }
    }, [
      initialSize.width,
      initialSize.height,
      isCurrentlyInteracting,
      size.width,
      size.height,
    ]);

    // ... (rest of the useResizeHandlers hook) ...
    ```

    And ensure `isCurrentlyInteracting` is correctly passed to `useResizeHandlers` from `Pane.tsx`.
    In `Pane.tsx`:

    ```typescript
    // src/panes/Pane.tsx
    // ...
    const [isMouseDragging, setIsMouseDragging] = useState(false); // Renamed from isDragging
    const [isResizing, setIsResizing] = useState(false);
    const isInteractingSelf = isMouseDragging || isResizing; // Interaction by this pane's own mouse/touch handlers

    const { position, size, setPosition, resizeHandlers } = useResizeHandlers(
      id,
      { x: initialX, y: initialY },
      { width: initialWidth, height: initialHeight },
      updatePanePosition,
      updatePaneSize,
      isInteractingSelf, // Pass this down
      setIsResizing,
    );
    // ...
    // In bindDrag:
    // ...
    // if (first) {
    //   ...
    //   setIsMouseDragging(true); // Use setIsMouseDragging
    //   return initialMemo;
    // }
    // ...
    // if (last) {
    //   updatePanePosition(id, newX, newY);
    //   setIsMouseDragging(false); // Use setIsMouseDragging
    // } else if (!active) {
    //   setIsMouseDragging(false); // Use setIsMouseDragging if drag ends due to !active
    // }
    // ...
    ```

    The `setIsResizing(active)` call inside `makeResizeHandler` in `Pane.tsx` will correctly update the `isResizing` state.

This setup should provide a functional hand tracking toggle and enable pinch-to-drag for panes. Test thoroughly, especially the coordinate systems and interaction between hand tracking and mouse interactions.
