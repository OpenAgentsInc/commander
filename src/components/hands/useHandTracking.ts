import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "@mediapipe/camera_utils";
import {
  Hands,
  Results as HandResults,
  LandmarkConnectionArray,
  HAND_CONNECTIONS,
} from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import {
  HandPose,
  type HandLandmarks,
  type PinchCoordinates,
} from "./handPoseTypes";
import { recognizeHandPose } from "./handPoseRecognition";

interface TrackedHandInfo {
  landmarks: HandLandmarks; // from @mediapipe/hands
  pose: HandPose;           // from ./handPoseTypes
  pinchMidpoint: PinchCoordinates | null; // from ./handPoseTypes
  handedness: string;       // e.g., "Left" or "Right"
}

// Fix for the WebAssembly issues in Electron
declare global {
  interface Window {
    moduleInitialized: boolean;
  }
}

export interface HandPosition {
  x: number;
  y: number;
}

interface UseHandTrackingOptions {
  enabled: boolean;
}

export function useHandTracking({ enabled }: UseHandTrackingOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const [handTrackingStatus, setHandTrackingStatus] = useState("Inactive");
  const [handPosition, setHandPosition] = useState<HandPosition | null>(null);
  const [trackedHands, setTrackedHands] = useState<TrackedHandInfo[]>([]);

  // Process MediaPipe results
  const onHandTrackingResults = useCallback(
    (results: HandResults) => {
      if (!landmarkCanvasRef.current || !enabled) {
        if (landmarkCanvasRef.current) {
          const canvasCtx = landmarkCanvasRef.current.getContext("2d")!;
          canvasCtx.clearRect(
            0,
            0,
            landmarkCanvasRef.current.width,
            landmarkCanvasRef.current.height,
          );
        }
        setHandPosition(null);
        setTrackedHands([]);
        return;
      }

      const canvasCtx = landmarkCanvasRef.current.getContext("2d")!;
      canvasCtx.save();
      canvasCtx.clearRect(
        0,
        0,
        landmarkCanvasRef.current.width,
        landmarkCanvasRef.current.height,
      );

      let handsDetected = 0;
      const currentFrameTrackedHands: TrackedHandInfo[] = [];

      if (results.multiHandLandmarks && results.multiHandedness) {
        handsDetected = results.multiHandLandmarks.length;
        for (
          let index = 0;
          index < results.multiHandLandmarks.length;
          index++
        ) {
          const classification = results.multiHandedness[index];
          const handedness = classification.label; // "Right" or "Left"
          const landmarks = results.multiHandLandmarks[index] as HandLandmarks;
          const pose = recognizeHandPose(landmarks);

          // Calculate pinch midpoint for the current hand
          let currentPinchMidpoint: PinchCoordinates | null = null;
          if (pose === HandPose.PINCH_CLOSED) {
            const thumbTip = landmarks[4]; // THUMB_TIP index
            const indexTip = landmarks[8]; // INDEX_FINGER_TIP index

            if (thumbTip && indexTip && landmarkCanvasRef.current) {
              const normalizedMidX = (thumbTip.x + indexTip.x) / 2;
              const normalizedMidY = (thumbTip.y + indexTip.y) / 2;

              // Convert to screen pixel coordinates (relative to viewport)
              // Ensure X is flipped to match mirrored camera view for UI interaction
              const mirroredNormalizedMidX = 1 - normalizedMidX;
              const screenPinchX = mirroredNormalizedMidX * window.innerWidth;
              const screenPinchY = normalizedMidY * window.innerHeight;

              currentPinchMidpoint = {
                x: screenPinchX,
                y: screenPinchY,
                z: (thumbTip.z + indexTip.z) / 2, // Keep Z for potential 3D use
              };

              // Update console log for better debugging of multiple pinches
              console.log(
                `PINCH COORDS for hand ${index} (${handedness}): screen(${Math.round(screenPinchX)}, ${Math.round(screenPinchY)}px)`
              );

              // Draw a circle at the pinch midpoint for visual debugging
              const canvas = landmarkCanvasRef.current;
              const ctx = canvasCtx;
              const canvasWidth = canvas.width;
              const canvasHeight = canvas.height;
              
              // --- Visual Debugging on Canvas (landmarkCanvasRef) ---
              // canvasDrawX_unmirrored: X coord of pinch point on an unmirrored canvas (0=left, canvasWidth=right)
              // If hand is visually on left (user's right hand), NMX_orig_MP is large, so canvasDrawX_unmirrored is large.
              const canvasDrawX_unmirrored = normalizedMidX * canvasWidth;
              const canvasDrawY_unmirrored = normalizedMidY * canvasHeight;

              // 1. Draw the green circle for the pinch point.
              // Since canvas is CSS-mirrored, drawing at canvasDrawX_unmirrored will make it appear at the correct visual spot.
              ctx.beginPath();
              ctx.arc(
                canvasDrawX_unmirrored,
                canvasDrawY_unmirrored,
                10,
                0,
                2 * Math.PI,
              ); // Radius 10px
              ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"; // White
              ctx.lineWidth = 2;
              ctx.stroke();

              // 2. Draw the coordinate text (readable and positioned visually to the RIGHT of the circle)
              // screenPinchX already holds the visually correct X value for the label's text content.
              const coordText = `Pinch: ${Math.round(screenPinchX)}, ${Math.round(screenPinchY)} px`;

              ctx.save(); // Save current context state
              ctx.scale(-1, 1); // Flip the context horizontally to make text readable (counteracts CSS mirror)

              ctx.font = "bold 12px Berkeley Mono";
              const textMetrics = ctx.measureText(coordText);
              const textWidth = textMetrics.width;
              const textHeight = 14; // Approximate height for background

              // Calculate visual X of the pinch circle's center on the screen
              // normalizedMidX is raw from MediaPipe. If hand visually left, normalizedMidX is large (e.g. 0.8).
              // Visual X for circle center: (1 - normalizedMidX) * canvasWidth
              const visualCircleCenterX = (1 - normalizedMidX) * canvasWidth;

              // Determine the visual X for the left anchor of the text, to the right of the circle
              const circleRadius = 10;
              const padding = 5;
              const visualTextAnchorLeftX =
                visualCircleCenterX + circleRadius + padding;

              // Convert this desired visual X to the X coordinate needed for drawing in the flipped context
              // If visX is desired visual X, draw_X_in_flipped_ctx = -(canvasWidth - visX).
              const drawTextAnchorLeftX_in_flipped_ctx = -(
                canvasWidth - visualTextAnchorLeftX
              );

              const textY = canvasDrawY_unmirrored; // Use unmirrored Y for vertical positioning

              ctx.textAlign = "left"; // Align text to its left edge

              // Draw background for readability
              ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
              ctx.fillRect(
                drawTextAnchorLeftX_in_flipped_ctx - 2, // Background rect left edge
                textY - textHeight, // Background rect top edge (approx for text baseline)
                textWidth + 4, // Background rect width
                textHeight + 4, // Background rect height
              );

              // Draw the actual text
              ctx.fillStyle = "rgba(255, 255, 255, 1)"; // White text
              ctx.fillText(
                coordText,
                drawTextAnchorLeftX_in_flipped_ctx,
                textY - 3,
              ); // Adjusted Y for better visual centering

              ctx.restore(); // Restore the context to its original state (mirrored by CSS, but scale(1,1))
            }
          }
          
          // Add the hand data to the tracked hands array
          currentFrameTrackedHands.push({
            landmarks,
            pose,
            pinchMidpoint: currentPinchMidpoint,
            handedness
          });

          // Use the first hand for the 3D pointer (handPosition)
          if (index === 0) {
            if (landmarks.length > 8) {
              const indexFingerTip = landmarks[8];
              setHandPosition({
                x: indexFingerTip.x,
                y: indexFingerTip.y,
              });
            }
          }

          drawConnectors(
            canvasCtx,
            landmarks,
            HAND_CONNECTIONS as LandmarkConnectionArray,
            {
              color: "#3f3f46",
              lineWidth: 1,
            },
          );

          drawLandmarks(canvasCtx, landmarks, {
            color: "#fff",
            lineWidth: 1,
            fillColor: "#000",
            radius: 4, // Fixed radius for all landmarks
          });

          // Highlight thumb tip (4) and index tip (8) with larger dots
          if (landmarks.length > 8) {
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];

            canvasCtx.beginPath();
            canvasCtx.arc(
              thumbTip.x * landmarkCanvasRef.current.width,
              thumbTip.y * landmarkCanvasRef.current.height,
              6,
              0,
              2 * Math.PI,
            );
            canvasCtx.fillStyle = "#ffffff"; // White for thumb
            canvasCtx.fill();

            canvasCtx.beginPath();
            canvasCtx.arc(
              indexTip.x * landmarkCanvasRef.current.width,
              indexTip.y * landmarkCanvasRef.current.height,
              6,
              0,
              2 * Math.PI,
            );
            canvasCtx.fillStyle = "#ffffff"; // White for index
            canvasCtx.fill();
          }
        }
      }

      // Update the tracked hands state with the hands from the current frame
      setTrackedHands(currentFrameTrackedHands);

      // If no hands were detected, reset the hand position
      if (currentFrameTrackedHands.length === 0) {
        setHandPosition(null);
      }

      if (enabled) {
        setHandTrackingStatus(
          handsDetected > 0
            ? `${handsDetected} hand(s) detected`
            : "No hands detected",
        );
      }
      canvasCtx.restore();
    },
    [enabled],
  );

  // Initialize hand tracking
  useEffect(() => {
    if (!enabled) {
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
          if (handsRef.current) {
            handsRef.current.close();
          }
        } catch (err) {
          console.error("Cleanup error:", err);
        }
      }
      setHandTrackingStatus("Inactive");
      setTrackedHands([]);
      return;
    }

    if (!videoRef.current || !landmarkCanvasRef.current) return;

    window.moduleInitialized = false;

    try {
      setHandTrackingStatus("Initializing MediaPipe...");

      handsRef.current = new Hands({
        locateFile: (file) => {
          return `/mediapipe/hands/${file}`;
        },
      });

      handsRef.current.setOptions({
        selfieMode: false,
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      handsRef.current.onResults(onHandTrackingResults);
      setHandTrackingStatus("MediaPipe initialized");

      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch (err) {
              console.log("Frame error (normal during tracking)");
            }
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current.start();
      setHandTrackingStatus("Tracking active");
    } catch (error) {
      console.error("Init error:", error);
      setHandTrackingStatus(
        `Error initializing MediaPipe: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return () => {
      try {
        cameraRef.current?.stop();
        if (handsRef.current) {
          handsRef.current.close();
        }
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    };
  }, [enabled, onHandTrackingResults]);

  // Canvas dimensions effect
  useEffect(() => {
    if (!enabled) return;

    const updateCanvasDimensions = () => {
      if (videoRef.current && landmarkCanvasRef.current) {
        const videoWidth =
          videoRef.current.videoWidth || videoRef.current.clientWidth;
        const videoHeight =
          videoRef.current.videoHeight || videoRef.current.clientHeight;

        if (videoWidth > 0 && videoHeight > 0) {
          landmarkCanvasRef.current.width = videoWidth;
          landmarkCanvasRef.current.height = videoHeight;
        } else {
          landmarkCanvasRef.current.width = videoRef.current.offsetWidth;
          landmarkCanvasRef.current.height = videoRef.current.offsetHeight;
        }
      }
    };

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.addEventListener("loadedmetadata", updateCanvasDimensions);
      videoEl.addEventListener("play", updateCanvasDimensions);
    }

    window.addEventListener("resize", updateCanvasDimensions);
    updateCanvasDimensions();

    return () => {
      if (videoEl) {
        videoEl.removeEventListener("loadedmetadata", updateCanvasDimensions);
        videoEl.removeEventListener("play", updateCanvasDimensions);
      }
      window.removeEventListener("resize", updateCanvasDimensions);
    };
  }, [enabled]);

  return {
    videoRef,
    landmarkCanvasRef,
    handPosition,
    handTrackingStatus,
    trackedHands, // Replaced activeHandPose and pinchMidpoint with trackedHands array
  };
}