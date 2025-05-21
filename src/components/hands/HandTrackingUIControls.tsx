import React, { useEffect } from "react";
import { HandPose, type PinchCoordinates } from "./handPoseTypes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface HandTrackingUIControlsProps {
  showHandTracking: boolean;
  setShowHandTracking: (show: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarkCanvasRef: React.RefObject<HTMLCanvasElement | null>;
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
  pinchMidpoint,
}: HandTrackingUIControlsProps) {
  // No need for debug logging effect

  return (
    <>
      {/* Hand tracking UI controls */}
      <div
        className="absolute top-5 right-5 z-30 flex flex-col gap-3"
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex items-center space-x-2 p-2">
          <Switch
            id="hand-tracking-toggle-main"
            checked={showHandTracking}
            onCheckedChange={setShowHandTracking}
          />
          <Label htmlFor="hand-tracking-toggle-main" className="text-white">
            Hand Tracking
          </Label>
        </div>

        {showHandTracking && (
          <>
            <p className="p-2 text-xs text-white">
              Status: {handTrackingStatus}
            </p>
            <p className="p-2 text-xs text-white transition-colors">
              Pose:{" "}
              <span
                className={
                  activeHandPose === HandPose.PINCH_CLOSED
                    ? "text-primary font-bold"
                    : ""
                }
              >
                {activeHandPose === HandPose.NONE ? "N/A" : activeHandPose}
              </span>
            </p>
          </>
        )}
      </div>

      {/* Removed pinch coordinate display */}

      {/* Hidden video element for camera input */}
      {showHandTracking && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute h-full w-full scale-x-[-1] transform object-cover"
          style={{
            top: 0,
            left: 0,
            zIndex: 1,
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Canvas for hand landmarks */}
      <canvas
        ref={landmarkCanvasRef}
        className="absolute h-full w-full scale-x-[-1] transform"
        style={{
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 10,
          visibility: showHandTracking ? "visible" : "hidden",
        }}
      />
    </>
  );
}
