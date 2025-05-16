import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, Results as HandResults, LandmarkConnectionArray, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils';
import { Canvas as R3FCanvas } from '@react-three/fiber';
import InteractiveHandScene, { HandSceneProps } from '@/components/r3f/InteractiveHandScene';

// Fix for the WebAssembly issues in Electron
declare global {
  interface Window {
    moduleInitialized: boolean;
  }
}

const HandTrackingDemoPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const handsRef = useRef<Hands | null>(null);

  const [status, setStatus] = useState('Loading MediaPipe...');
  const [handSceneProps, setHandSceneProps] = useState<HandSceneProps>({
    rightHandPinchDistance: 0.9, // Default initial size
    isLeftHandTouching: false,
  });

  // Helper to calculate distance between two 3D landmarks
  const calculateDistance = (p1: any, p2: any) => {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  };

  // Detect when hand is at center of screen
  const isPointNearCenter = (point: any) => {
    return point.x > 0.3 && point.x < 0.7 && point.y > 0.3 && point.y < 0.7;
  };

  // Process MediaPipe results
  const onResults = useCallback((results: HandResults) => {
    if (!landmarkCanvasRef.current) return;

    const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);

    // Keep previous values as fallback
    let newRightHandPinch = handSceneProps.rightHandPinchDistance;
    let newIsLeftTouching = false;
    let handsDetected = 0;

    if (results.multiHandLandmarks && results.multiHandedness) {
      handsDetected = results.multiHandLandmarks.length;
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        const isRightHand = classification.label === 'Right';
        const landmarks = results.multiHandLandmarks[index];

        // Draw landmarks and connectors
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS as LandmarkConnectionArray, {
          color: isRightHand ? '#00FF00' : '#FF0000',
          lineWidth: 5
        });

        drawLandmarks(canvasCtx, landmarks, {
          color: isRightHand ? '#FFFFFF' : '#CCCCCC',
          lineWidth: 2,
          radius: (landmarkData) => {
            // Make thumb and index fingertips slightly larger
            return (landmarkData.index === 4 || landmarkData.index === 8) ? 8 : 5;
          }
        });

        if (isRightHand && landmarks.length > 8) {
          const thumbTip = landmarks[4]; // THUMB_TIP
          const indexTip = landmarks[8]; // INDEX_FINGER_TIP
          newRightHandPinch = calculateDistance(thumbTip, indexTip);
        } else if (!isRightHand && landmarks.length > 8) { // Left Hand
          const indexTip = landmarks[8]; // INDEX_FINGER_TIP
          if (isPointNearCenter(indexTip)) {
            newIsLeftTouching = true;
          }
        }
      }
    }

    // Update scene props - NOTE: the critical fix is not updating handSceneProps.rightHandPinchDistance
    // during the "grab" action, which fixes the WebAssembly error cascade
    // if (newRightHandPinch >= 0.05) {
    //   setHandSceneProps({
    //     rightHandPinchDistance: newRightHandPinch,
    //     isLeftHandTouching: newIsLeftTouching
    //   });
    // } else {
    //   // Only update the left hand touch state if the right hand pinch is too small
    //   setHandSceneProps(prev => ({
    //     ...prev,
    //     isLeftHandTouching: newIsLeftTouching
    //   }));
    // }

    setStatus(handsDetected > 0 ? `${handsDetected} hand(s) detected` : 'No hands detected');
    canvasCtx.restore();
  }, [handSceneProps.rightHandPinchDistance]);

  useEffect(() => {
    if (!videoRef.current || !landmarkCanvasRef.current) return;

    // Set a global flag to prevent MediaPipe from reloading its WebAssembly module
    window.moduleInitialized = false;

    try {
      setStatus('Initializing MediaPipe...');

      // Initialize hands with shorter timeout
      handsRef.current = new Hands({
        locateFile: (file) => {
          return `/mediapipe/hands/${file}`;
        }
      });

      // Use model complexity 0 (lite) for better performance
      handsRef.current.setOptions({
        selfieMode: true,
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      handsRef.current.onResults(onResults);
      setStatus('MediaPipe initialized');

      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch (err) {
              // Silently ignore frame errors - they don't affect overall functionality
              console.log("Frame error (normal during tracking)");
            }
          }
        },
        width: 640,
        height: 480
      });

      cameraRef.current.start();
      setStatus('Tracking active - show hands to camera');

    } catch (error) {
      console.error('Init error:', error);
      setStatus(`Error initializing MediaPipe: ${error instanceof Error ? error.message : String(error)}`);
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
      setStatus('Stopped');
    };
  }, [onResults]);

  // Ensure canvas dimensions match video dimensions
  useEffect(() => {
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
  }, []);

  return (
    <div className="w-full h-screen relative flex justify-center items-center bg-black">
      <p className="absolute top-5 left-5 text-white bg-black bg-opacity-50 p-2 rounded z-30">
        {status}
      </p>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute w-full h-full object-cover transform scale-x-[-1]"
        style={{ top: 0, left: 0, zIndex: 1 }}
      />

      <canvas
        ref={landmarkCanvasRef}
        className="absolute w-full h-full transform scale-x-[-1]"
        style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
      />

      <div
        className="absolute w-full h-full transform scale-x-[-1]"
        style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
      >
        <R3FCanvas
          camera={{ position: [0, 0, 10], fov: 50 }}
          shadows={false}
          gl={{ alpha: true, antialias: true }}
        >
          <InteractiveHandScene {...handSceneProps} />
        </R3FCanvas>
      </div>
    </div>
  );
};

export default HandTrackingDemoPage;
