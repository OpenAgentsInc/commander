import React, { useState, useEffect, useRef } from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
import { HandTracking, HandPose } from "@/components/hands";
import { type PinchCoordinates, type HandLandmarks } from "@/components/hands/handPoseTypes";
import { usePaneStore } from "@/stores/pane";
import { Hotbar } from "@/components/hud/Hotbar";

interface HandDataContext {
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
  primaryHandLandmarks: HandLandmarks | null;
  trackedHandsCount: number;
}

const TITLE_BAR_HEIGHT = 32; // Title bar height is 2rem = 32px

export default function HomePage() {
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
  const [handData, setHandData] = useState<HandDataContext | null>(null);

  // Pinch-to-drag state
  const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
  const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const { panes, bringPaneToFront, updatePanePosition, activePaneId: currentActivePaneId, openSellComputePane, openDvmJobHistoryPane } = usePaneStore();

  const toggleHandTracking = () => {
    const newState = !isHandTrackingActive;
    setIsHandTrackingActive(newState);
    if (!newState && draggingPaneId) { // If turning off while dragging
      setDraggingPaneId(null);
      initialPinchPositionRef.current = null;
      paneStartPosRef.current = null;
    }
  };

  // Use a ref to compare previous and current data to avoid unnecessary state updates
  const prevHandDataRef = useRef<HandDataContext | null>(null);
  
  const handleHandDataUpdate = (data: HandDataContext) => {
    // Only update state if data has meaningfully changed
    // This prevents unnecessary re-renders and update loops
    if (!prevHandDataRef.current || 
        data.activeHandPose !== prevHandDataRef.current.activeHandPose ||
        data.trackedHandsCount !== prevHandDataRef.current.trackedHandsCount ||
        JSON.stringify(data.pinchMidpoint) !== JSON.stringify(prevHandDataRef.current.pinchMidpoint)) {
      
      prevHandDataRef.current = data;
      setHandData(data);
    }
  };

  // Effect for pinch-to-drag logic
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
        // Check from topmost pane (end of array) to find pinch target
        for (let i = panes.length - 1; i >= 0; i--) {
          const pane = panes[i];
          // Check if pinch is in the title bar area
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
        // Continue dragging - avoid calling updatePanePosition on every tiny change
        // We need to throttle or only update significantly different positions
        const deltaX = pinchMidpoint.x - initialPinchPositionRef.current.x;
        const deltaY = pinchMidpoint.y - initialPinchPositionRef.current.y;

        // Only update if the move is at least 1px in either direction
        if (Math.abs(deltaX) >= 1 || Math.abs(deltaY) >= 1) {
          const newX = paneStartPosRef.current.x + deltaX;
          const newY = paneStartPosRef.current.y + deltaY;
          
          // Update the refs to the new values to track relative movement
          initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
          paneStartPosRef.current = { x: newX, y: newY };
          
          // Update the store
          updatePanePosition(draggingPaneId, newX, newY);
        }
      }
    } else { // Pinch released or pose changed
      if (draggingPaneId) {
        setDraggingPaneId(null);
        initialPinchPositionRef.current = null;
        paneStartPosRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHandTrackingActive, handData, draggingPaneId]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <SimpleGrid />
      <PaneManager />

      <HandTracking
        showHandTracking={isHandTrackingActive}
        setShowHandTracking={setIsHandTrackingActive}
        onHandDataUpdate={handleHandDataUpdate}
      />

      <Hotbar
        isHandTrackingActive={isHandTrackingActive}
        onToggleHandTracking={toggleHandTracking}
        onOpenSellComputePane={openSellComputePane}
        onOpenDvmJobHistoryPane={openDvmJobHistoryPane}
      />
    </div>
  );
}