import React, { useEffect } from 'react';
import { HandPose, type PinchCoordinates } from './handPoseTypes';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface HandTrackingUIControlsProps {
  showHandTracking: boolean;
  setShowHandTracking: (show: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarkCanvasRef: React.RefObject<HTMLCanvasElement>;
  handTrackingStatus: string;
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
}

export default function HandTrackingUIControls({
  showHandTracking,
  setShowHandTracking,
  videoRef,
  landmarkCanvasRef,
  handTrackingStatus,
  activeHandPose,
  pinchMidpoint
}: HandTrackingUIControlsProps) {
  
  useEffect(() => {
    // This effect just observes prop changes for debugging
    console.log("[HandTrackingUIControls] showHandTracking:", showHandTracking);
  }, [showHandTracking]);

  return (
    <>
      {/* Hand tracking UI controls */}
      <div className="absolute top-5 right-5 flex flex-col gap-3 z-30" style={{ pointerEvents: 'auto' }}>
        <div className="flex items-center space-x-2 bg-black bg-opacity-50 p-2 rounded">
          <Switch
            id="hand-tracking-toggle-main"
            checked={showHandTracking}
            onCheckedChange={setShowHandTracking}
          />
          <Label htmlFor="hand-tracking-toggle-main" className="text-white">Hand Tracking</Label>
        </div>

        {showHandTracking && (
          <>
            <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs">
              Status: {handTrackingStatus}
            </p>
            <p className="bg-black bg-opacity-50 text-white p-2 rounded text-xs transition-colors">
              Pose: <span className={activeHandPose === HandPose.PINCH_CLOSED ? 'text-primary font-bold' : ''}>{activeHandPose === HandPose.NONE ? 'N/A' : activeHandPose}</span>
            </p>
          </>
        )}
      </div>
      
      {/* Pinch coordinate display on LEFT side of screen */}
      {showHandTracking && pinchMidpoint && (
        <div className="absolute top-5 left-5 z-30" style={{ pointerEvents: 'auto' }}>
          <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            Pinch: {Math.round(pinchMidpoint.x)}, {Math.round(pinchMidpoint.y)} px
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
        style={{
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 10,
          visibility: showHandTracking ? 'visible' : 'hidden'
        }}
      />
    </>
  );
}