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
          if (landmarkCanvasRef.current) {
            const canvas = landmarkCanvasRef.current;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            // Calculate the normalized values for drawing on canvas
            const normalizedMidX = midpointX;
            const normalizedMidY = midpointY;
            
            // Calculate canvas coordinates
            const canvasPinchX = normalizedMidX * canvasWidth;
            const canvasPinchY = normalizedMidY * canvasHeight;
            
            // 1. Draw the green circle (this will be mirrored, which is fine for a circle)
            canvasCtx.beginPath();
            canvasCtx.arc(canvasPinchX, canvasPinchY, 15, 0, 2 * Math.PI);
            canvasCtx.strokeStyle = "rgba(16, 185, 129, 0.8)"; // Primary green with transparency
            canvasCtx.lineWidth = 3;
            canvasCtx.stroke();
            
            // 2. Draw the coordinate text (unmirrored)
            const screenX = Math.round(normalizedMidX * window.innerWidth);
            const screenY = Math.round(normalizedMidY * window.innerHeight);
            const coordText = `Pinch: ${screenX}px, ${screenY}px`;
            
            canvasCtx.font = "bold 11px sans-serif";
            const textMetrics = canvasCtx.measureText(coordText);
            const textWidth = textMetrics.width;
            const textHeight = 11;
            
            // Position text to right of circle
            const textStartXUnmirrored = canvasPinchX + 25; // 15 (radius) + 10 (padding)
            const textStartYUnmirrored = canvasPinchY + (textHeight / 3); // Vertical center approx
            
            // Need to adjust for mirrored canvas
            canvasCtx.save();
            // Canvas is CSS transformed with scale-x: -1
            // To draw unmirrored text:
            // 1. Scale context by (-1, 1) to flip it
            // 2. Adjust X coordinate for the flipped context
            canvasCtx.scale(-1, 1);
            
            const mirroredTextX = -(canvasWidth - textStartXUnmirrored);
            
            // Background for text
            canvasCtx.fillStyle = "rgba(0, 0, 0, 0.6)";
            canvasCtx.fillRect(mirroredTextX - 5, textStartYUnmirrored - textHeight, textWidth + 10, textHeight + 4);
            
            // Actual text
            canvasCtx.fillStyle = "rgba(16, 185, 129, 1)"; // Brighter green for text
            canvasCtx.textAlign = "left";
            canvasCtx.fillText(coordText, mirroredTextX, textStartYUnmirrored);
            
            canvasCtx.restore();
          }
          
          // Store the screen pixel coordinates in state, not normalized values
          setPinchMidpoint({
            x: midpointX * window.innerWidth,  // Convert to actual screen X
            y: midpointY * window.innerHeight, // Convert to actual screen Y
            z: (thumbTip.z + indexTip.z) / 2
          });
        }
      } else {
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