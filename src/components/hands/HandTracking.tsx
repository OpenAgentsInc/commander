import React, { useEffect, useRef } from 'react';
import { useHandTracking } from './useHandTracking';
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
    handPosition,
    handTrackingStatus,
    activeHandPose,
    pinchMidpoint,
    trackedHands
  } = useHandTracking({ enabled: showHandTracking });

  // Send hand data to parent component via callback
  // Using refs to prevent update loops
  const prevHandDataRef = useRef<{
    activeHandPose: HandPose;
    pinchCoords: string | null;
    trackedHandsCount: number;
  }>({
    activeHandPose: HandPose.NONE,
    pinchCoords: null,
    trackedHandsCount: 0
  });

  useEffect(() => {
    // Skip if no callback provided
    if (!onHandDataUpdate) return;
    
    // Prepare current data
    let data: HandDataForCallback;
    
    if (showHandTracking) {
      const primaryHand = trackedHands.length > 0 ? trackedHands[0] : null;
      const currentHandPose = primaryHand ? primaryHand.pose : HandPose.NONE;
      const currentPinchMidpoint = primaryHand ? primaryHand.pinchMidpoint : null;
      
      // Serialize pinch coords for comparison (if they exist)
      const currentPinchCoords = currentPinchMidpoint 
        ? `${Math.round(currentPinchMidpoint.x)},${Math.round(currentPinchMidpoint.y)}`
        : null;
        
      // Only update if data has meaningfully changed
      const hasChanged = 
        currentHandPose !== prevHandDataRef.current.activeHandPose ||
        currentPinchCoords !== prevHandDataRef.current.pinchCoords ||
        trackedHands.length !== prevHandDataRef.current.trackedHandsCount;
      
      if (hasChanged) {
        // Update the data to send
        data = {
          activeHandPose: currentHandPose,
          pinchMidpoint: currentPinchMidpoint,
          primaryHandLandmarks: primaryHand ? primaryHand.landmarks : null,
          trackedHandsCount: trackedHands.length
        };
        
        // Update our prev data ref
        prevHandDataRef.current = {
          activeHandPose: currentHandPose,
          pinchCoords: currentPinchCoords,
          trackedHandsCount: trackedHands.length
        };
        
        // Send the data
        onHandDataUpdate(data);
      }
    } else if (prevHandDataRef.current.activeHandPose !== HandPose.NONE || 
              prevHandDataRef.current.trackedHandsCount !== 0) {
      // Reset data when tracking is turned off (but only if we need to reset)
      data = {
        activeHandPose: HandPose.NONE,
        pinchMidpoint: null,
        primaryHandLandmarks: null,
        trackedHandsCount: 0
      };
      
      // Update prev data ref
      prevHandDataRef.current = {
        activeHandPose: HandPose.NONE,
        pinchCoords: null,
        trackedHandsCount: 0
      };
      
      // Send the reset data
      onHandDataUpdate(data);
    }
  }, [trackedHands, onHandDataUpdate, showHandTracking]);

  return (
    <>
      {/* No 3D scene as requested - only track hands */}

      {/* Remove all the UI controls as requested - just use the toggle button in HomePage */}

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