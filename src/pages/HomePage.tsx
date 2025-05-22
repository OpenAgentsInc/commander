import React, { useState, useEffect, useRef, useCallback } from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
import { HandTracking, HandPose } from "@/components/hands";
import {
  type PinchCoordinates,
  type HandLandmarks,
} from "@/components/hands/handPoseTypes";
import { usePaneStore } from "@/stores/pane";
import { useShallow } from "zustand/react/shallow";
import { Hotbar } from "@/components/hud/Hotbar";
import BitcoinBalanceDisplay from "@/components/hud/BitcoinBalanceDisplay";
import { KeyboardControls } from "@react-three/drei";
// Create our own type that matches the one from the library
interface KeyboardControlsState {
  [key: string]: boolean;
}
import { AppControls, appControlsMap } from "@/controls";
import { isMacOs } from "@/utils/os";

interface HandDataContext {
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
  primaryHandLandmarks: HandLandmarks | null;
  trackedHandsCount: number;
}

const TITLE_BAR_HEIGHT = 32; // Title bar height is 2rem = 32px

export default function HomePage() {
  // Default hand tracking to off for "Compute Market" launch
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
  const [handData, setHandData] = useState<HandDataContext | null>(null);

  // Pinch-to-drag state
  const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
  const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Get all necessary functions and state from usePaneStore using a single selector
  const {
    panes,
    bringPaneToFront,
    updatePanePosition,
    activePaneId: currentActivePaneId,
    toggleSellComputePane,
    toggleWalletPane,
    toggleDvmJobHistoryPane,
    toggleAgentChatPane,
  } = usePaneStore(
    useShallow((state) => ({
      panes: state.panes,
      bringPaneToFront: state.bringPaneToFront,
      updatePanePosition: state.updatePanePosition,
      activePaneId: state.activePaneId,
      toggleSellComputePane: state.toggleSellComputePane,
      toggleWalletPane: state.toggleWalletPane,
      toggleDvmJobHistoryPane: state.toggleDvmJobHistoryPane,
      toggleAgentChatPane: state.toggleAgentChatPane,
    })),
  );

  // Wrap toggleHandTracking in useCallback to prevent unnecessary re-renders
  const toggleHandTracking = useCallback(() => {
    const newState = !isHandTrackingActive;
    setIsHandTrackingActive(newState);
    if (!newState && draggingPaneId) {
      // If turning off while dragging
      setDraggingPaneId(null);
      initialPinchPositionRef.current = null;
      paneStartPosRef.current = null;
    }
  }, [isHandTrackingActive, draggingPaneId]);

  // Use a ref to compare previous and current data to avoid unnecessary state updates
  const prevHandDataRef = useRef<HandDataContext | null>(null);

  // Wrap handleHandDataUpdate in useCallback to prevent unnecessary re-renders
  const handleHandDataUpdate = useCallback((data: HandDataContext) => {
    // Only update state if data has meaningfully changed
    // This prevents unnecessary re-renders and update loops
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
  }, []);

  // Effect for pinch-to-drag logic
  useEffect(() => {
    if (
      !isHandTrackingActive ||
      !handData ||
      !handData.pinchMidpoint ||
      handData.trackedHandsCount === 0
    ) {
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
            initialPinchPositionRef.current = {
              x: pinchMidpoint.x,
              y: pinchMidpoint.y,
            };
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
          initialPinchPositionRef.current = {
            x: pinchMidpoint.x,
            y: pinchMidpoint.y,
          };
          paneStartPosRef.current = { x: newX, y: newY };

          // Update the store
          updatePanePosition(draggingPaneId, newX, newY);
        }
      }
    } else {
      // Pinch released or pose changed
      if (draggingPaneId) {
        setDraggingPaneId(null);
        initialPinchPositionRef.current = null;
        paneStartPosRef.current = null;
      }
    }
  }, [
    isHandTrackingActive,
    handData,
    draggingPaneId,
    panes,
    currentActivePaneId,
    bringPaneToFront,
    updatePanePosition,
  ]);

  // Set up a global keydown handler since KeyboardControls doesn't always provide the event
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle modifier + digit combinations
      const modifier = isMacOs() ? event.metaKey : event.ctrlKey;
      if (!modifier) return;

      const digit = parseInt(event.key);
      if (isNaN(digit) || digit < 1 || digit > 9) return;

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
          console.log("Keyboard: Toggle DVM Job History Pane");
          toggleDvmJobHistoryPane();
          break;
        case 4:
          console.log("Keyboard: Toggle Agent Chat Pane");
          toggleAgentChatPane();
          break;
        case 5:
        case 6:
        case 7:
        case 8:
          // No operation for slots 5-8
          break;
        case 9:
          console.log("Keyboard: Toggle Hand Tracking");
          toggleHandTracking();
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
    toggleAgentChatPane,
  ]);

  // Handler for keyboard shortcuts (kept as a backup, but we'll primarily use the global handler)
  const handleKeyboardChange = useCallback(
    (actionName: string, pressed: boolean, kbdState: KeyboardControlsState) => {
      // This function is now a fallback and mainly kept for interface compatibility
      if (!pressed) return;

      // Handle different action types through the above global handler instead
    },
    [],
  );

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
          onToggleAgentChatPane={toggleAgentChatPane}
        />
      </div>
    </KeyboardControls>
  );
}
