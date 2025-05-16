import React from 'react';
import { useHandTracking } from './useHandTracking';
import { HandPose, PinchCoordinates } from './handPoseTypes';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ThreeScene from './ThreeScene';

interface HandTrackingProps {
  showHandTracking: boolean;
  setShowHandTracking: (show: boolean) => void;
}

export default function HandTracking({ showHandTracking, setShowHandTracking }: HandTrackingProps) {
  const {
    videoRef,
    landmarkCanvasRef,
    handPosition,
    handTrackingStatus,
    activeHandPose,
    pinchMidpoint,
  } = useHandTracking({ enabled: showHandTracking });

  return (
    <>
      {/* Three.js scene with hand position tracking */}
      <div className="fixed inset-0" style={{ pointerEvents: 'auto' }}>
        {showHandTracking && <ThreeScene handPosition={handPosition} />}
      </div>

      {/* Hand tracking controls */}
      <div className="absolute top-5 right-5 flex flex-col gap-3 z-30" style={{ pointerEvents: 'auto' }}>
        <div className="flex items-center space-x-2 bg-black bg-opacity-50 p-2 rounded">
          <Switch
            id="hand-tracking"
            checked={showHandTracking}
            onCheckedChange={setShowHandTracking}
          />
          <Label htmlFor="hand-tracking" className="text-white">Hand Tracking</Label>
        </div>

        {showHandTracking && (
          <>
            <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs">
              Status: {handTrackingStatus}
            </p>
            {/* Display active hand pose with special highlight for pinch but no background */}
            <p className="bg-black bg-opacity-50 text-white p-2 rounded text-xs transition-colors">
              Pose: <span className={activeHandPose === HandPose.PINCH_CLOSED ? 'text-primary font-bold' : ''}>{activeHandPose === HandPose.NONE ? 'N/A' : activeHandPose}</span>
            </p>
            
            {/* Display pinch midpoint if available - now showing screen coordinates */}
            {pinchMidpoint && (
              <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                Pinch: {Math.round(pinchMidpoint.x)}, {Math.round(pinchMidpoint.y)} px
              </p>
            )}
          </>
        )}
      </div>

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
        style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
      />
    </>
  );
}