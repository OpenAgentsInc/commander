import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Hands, Results as HandResults, LandmarkConnectionArray, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HandPose, type HandLandmarks, type PinchCoordinates } from './handPoseTypes';
import { recognizeHandPose } from './handPoseRecognition';

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
  const [handTrackingStatus, setHandTrackingStatus] = useState('Inactive');
  const [handPosition, setHandPosition] = useState<HandPosition | null>(null);
  const [activeHandPose, setActiveHandPose] = useState<HandPose>(HandPose.NONE);
  const [pinchMidpoint, setPinchMidpoint] = useState<PinchCoordinates | null>(null);

  // Process MediaPipe results
  const onHandTrackingResults = useCallback((results: HandResults) => {
    if (!landmarkCanvasRef.current || !enabled) {
      if (landmarkCanvasRef.current) {
        const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
        canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);
      }
      setHandPosition(null);
      setActiveHandPose(HandPose.NONE);
      setPinchMidpoint(null);
      return;
    }

    const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);

    let handsDetected = 0;
    let rightHandLandmarks: HandLandmarks | null = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
      handsDetected = results.multiHandLandmarks.length;
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        const isRightHand = classification.label === 'Right'; // Note: MediaPipe labels are for the actual hand, not mirrored view
        const landmarks = results.multiHandLandmarks[index] as HandLandmarks;

        // Use the first hand as primary for simplicity, or preferably the right hand if detected
        if (index === 0 || isRightHand) {
          rightHandLandmarks = landmarks;
          if (landmarks.length > 8) {
            const indexFingerTip = landmarks[8];
            setHandPosition({
              x: indexFingerTip.x,
              y: indexFingerTip.y
            });
          }
        }

        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS as LandmarkConnectionArray, {
          color: "#3f3f46",
          lineWidth: 1
        });

        drawLandmarks(canvasCtx, landmarks, {
          color: "#fff",
          lineWidth: 1,
          fillColor: '#000',
          radius: 4 // Fixed radius for all landmarks
        });
        
        // Highlight thumb tip (4) and index tip (8) with larger dots
        if (landmarks.length > 8) {
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          
          canvasCtx.beginPath();
          canvasCtx.arc(thumbTip.x * landmarkCanvasRef.current.width, thumbTip.y * landmarkCanvasRef.current.height, 6, 0, 2 * Math.PI);
          canvasCtx.fillStyle = "#22c55e"; // Green for thumb
          canvasCtx.fill();
          
          canvasCtx.beginPath();
          canvasCtx.arc(indexTip.x * landmarkCanvasRef.current.width, indexTip.y * landmarkCanvasRef.current.height, 6, 0, 2 * Math.PI);
          canvasCtx.fillStyle = "#3b82f6"; // Blue for index
          canvasCtx.fill();
        }
      }
    }

    if (rightHandLandmarks) {
      const pose = recognizeHandPose(rightHandLandmarks);
      setActiveHandPose(pose);

      // If we detect PINCH_CLOSED pose, calculate and set the pinch midpoint
      if (pose === HandPose.PINCH_CLOSED) {
        const thumbTip = rightHandLandmarks[4]; // THUMB_TIP
        const indexTip = rightHandLandmarks[8]; // INDEX_FINGER_TIP
        
        if (thumbTip && indexTip) {
          // The midpoint between thumb and index finger
          // Convert from normalized (0-1) to screen pixel coordinates
          const midpointX = (thumbTip.x + indexTip.x) / 2;
          const midpointY = (thumbTip.y + indexTip.y) / 2;
          
          // Draw a circle at the pinch midpoint for visual debugging
          if (thumbTip && indexTip && landmarkCanvasRef.current) {
            const canvas = landmarkCanvasRef.current;
            const ctx = canvasCtx;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            // Normalized midpoint on the input video/canvas plane
            const normalizedMidX = (thumbTip.x + indexTip.x) / 2;
            const normalizedMidY = (thumbTip.y + indexTip.y) / 2;

            // --- Screen Pixel Coordinates for Logic and UI Display (outside canvas) ---
            // These are used by HomePage.tsx for moving the chat window
            // FLIP X coordinate for both display and logic to match visual screen position
            const mirroredNormalizedMidX = 1 - normalizedMidX; // Flip normalized X (0-1)
            const screenPinchX = mirroredNormalizedMidX * window.innerWidth; // Use flipped X
            const screenPinchY = normalizedMidY * window.innerHeight; // Y is correct as is
            
            // Debug log to see raw values
            console.log(`PINCH COORDS: original(${normalizedMidX.toFixed(3)}) -> mirrored(${mirroredNormalizedMidX.toFixed(3)}) -> screen(${Math.round(screenPinchX)},${Math.round(screenPinchY)})`);

            setPinchMidpoint({
                x: screenPinchX, // This is now the flipped X coordinate
                y: screenPinchY,
                z: (thumbTip.z + indexTip.z) / 2,
            });

            // --- Visual Debugging on Canvas (landmarkCanvasRef) ---
            // canvasDrawX_unmirrored: X coord of pinch point on an unmirrored canvas (0=left, canvasWidth=right)
            // If hand is visually on left (user's right hand), NMX_orig_MP is large, so canvasDrawX_unmirrored is large.
            const canvasDrawX_unmirrored = normalizedMidX * canvasWidth; // NMX_orig_MP is normalizedMidX here
            const canvasDrawY_unmirrored = normalizedMidY * canvasHeight; // NMY_orig_MP is normalizedMidY here

            // 1. Draw the green circle for the pinch point.
            // Since canvas is CSS-mirrored, drawing at canvasDrawX_unmirrored will make it appear at the correct visual spot.
            ctx.beginPath();
            ctx.arc(canvasDrawX_unmirrored, canvasDrawY_unmirrored, 10, 0, 2 * Math.PI); // Radius 10px
            ctx.strokeStyle = "rgba(50, 205, 50, 0.9)"; // Lime green
            ctx.lineWidth = 2;
            ctx.stroke();

            // 2. Draw the coordinate text (readable and positioned visually to the RIGHT of the circle)
            // screenPinchX already holds the visually correct X value for the label's text content.
            const coordText = `Pinch: ${Math.round(screenPinchX)}, ${Math.round(screenPinchY)} px`;

            ctx.save(); // Save current context state
            ctx.scale(-1, 1); // Flip the context horizontally to make text readable (counteracts CSS mirror)

            ctx.font = "bold 12px Arial";
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
            const visualTextAnchorLeftX = visualCircleCenterX + circleRadius + padding;

            // Convert this desired visual X to the X coordinate needed for drawing in the flipped context
            // If visX is desired visual X, draw_X_in_flipped_ctx = -(canvasWidth - visX).
            const drawTextAnchorLeftX_in_flipped_ctx = -(canvasWidth - visualTextAnchorLeftX);

            const textY = canvasDrawY_unmirrored; // Use unmirrored Y for vertical positioning

            ctx.textAlign = "left"; // Align text to its left edge

            // Draw background for readability
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.fillRect(
                drawTextAnchorLeftX_in_flipped_ctx - 2,       // Background rect left edge
                textY - textHeight,                       // Background rect top edge (approx for text baseline)
                textWidth + 4,                             // Background rect width
                textHeight + 4                             // Background rect height
            );

            // Draw the actual text
            ctx.fillStyle = "rgba(50, 205, 50, 1)"; // Lime green text
            ctx.fillText(coordText, drawTextAnchorLeftX_in_flipped_ctx, textY - 3); // Adjusted Y for better visual centering

            ctx.restore(); // Restore the context to its original state (mirrored by CSS, but scale(1,1))
          }
        } else if (pose !== HandPose.PINCH_CLOSED) {
          // If not in pinch pose, ensure pinchMidpoint is nullified
          setPinchMidpoint(null);
        }
      } else {
        // If no hand landmarks detected
        setPinchMidpoint(null);
      }
    } else {
      setHandPosition(null);
      setActiveHandPose(HandPose.NONE);
      setPinchMidpoint(null);
    }

    if (enabled) {
      setHandTrackingStatus(handsDetected > 0 ? `${handsDetected} hand(s) detected` : 'No hands detected');
    }
    canvasCtx.restore();
  }, [enabled]);

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
          console.error('Cleanup error:', err);
        }
      }
      setHandTrackingStatus('Inactive');
      setActiveHandPose(HandPose.NONE);
      setPinchMidpoint(null);
      return;
    }

    if (!videoRef.current || !landmarkCanvasRef.current) return;

    window.moduleInitialized = false;

    try {
      setHandTrackingStatus('Initializing MediaPipe...');

      handsRef.current = new Hands({
        locateFile: (file) => {
          return `/mediapipe/hands/${file}`;
        }
      });

      handsRef.current.setOptions({
        selfieMode: false,
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      handsRef.current.onResults(onHandTrackingResults);
      setHandTrackingStatus('MediaPipe initialized');

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
        height: 480
      });

      cameraRef.current.start();
      setHandTrackingStatus('Tracking active');

    } catch (error) {
      console.error('Init error:', error);
      setHandTrackingStatus(`Error initializing MediaPipe: ${error instanceof Error ? error.message : String(error)}`);
    }

    return () => {
      try {
        cameraRef.current?.stop();
        if (handsRef.current) {
          handsRef.current.close();
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    };
  }, [enabled, onHandTrackingResults]);

  // Canvas dimensions effect
  useEffect(() => {
    if (!enabled) return;

    const updateCanvasDimensions = () => {
      if (videoRef.current && landmarkCanvasRef.current) {
        const videoWidth = videoRef.current.videoWidth || videoRef.current.clientWidth;
        const videoHeight = videoRef.current.videoHeight || videoRef.current.clientHeight;

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
      videoEl.addEventListener('loadedmetadata', updateCanvasDimensions);
      videoEl.addEventListener('play', updateCanvasDimensions);
    }

    window.addEventListener('resize', updateCanvasDimensions);
    updateCanvasDimensions();

    return () => {
      if (videoEl) {
        videoEl.removeEventListener('loadedmetadata', updateCanvasDimensions);
        videoEl.removeEventListener('play', updateCanvasDimensions);
      }
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, [enabled]);

  return {
    videoRef,
    landmarkCanvasRef,
    handPosition,
    handTrackingStatus,
    activeHandPose,
    pinchMidpoint, // Expose pinch midpoint
  };
}