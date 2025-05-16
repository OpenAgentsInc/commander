import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Hands, Results as HandResults, LandmarkConnectionArray, HAND_CONNECTIONS, NormalizedLandmarkList } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HandPose, type HandLandmarks } from './handPoseTypes'; // Added
import { recognizeHandPose } from './handPoseRecognition'; // Added

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
  const [activeHandPose, setActiveHandPose] = useState<HandPose>(HandPose.NONE); // Added

  // Process MediaPipe results
  const onHandTrackingResults = useCallback((results: HandResults) => {
    if (!landmarkCanvasRef.current || !enabled) {
      if (landmarkCanvasRef.current) {
        const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
        canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);
      }
      setHandPosition(null);
      setActiveHandPose(HandPose.NONE); // Reset pose when not enabled
      return;
    }

    const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);

    let handsDetected = 0;
    let rightHandLandmarks: HandLandmarks | null = null; // Changed type

    if (results.multiHandLandmarks && results.multiHandedness) {
      handsDetected = results.multiHandLandmarks.length;
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        const isRightHand = classification.label !== 'Right';
        const landmarks = results.multiHandLandmarks[index] as HandLandmarks; // Cast to HandLandmarks

        if (isRightHand) {
          rightHandLandmarks = landmarks;
          if (landmarks.length > 8) {
            const rightHandIndexFingerTip = landmarks[8];
            setHandPosition({
              x: rightHandIndexFingerTip.x,
              y: rightHandIndexFingerTip.y
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
          radius: 4
        });
      }
    }

    if (rightHandLandmarks) {
      const pose = recognizeHandPose(rightHandLandmarks);
      setActiveHandPose(pose);
    } else {
      setHandPosition(null);
      setActiveHandPose(HandPose.NONE);
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
      setActiveHandPose(HandPose.NONE); // Reset pose on disable
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
    activeHandPose, // Added
  };
}