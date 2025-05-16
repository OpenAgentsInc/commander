import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, Results as HandResults, LandmarkConnectionArray, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils';
import { Canvas as R3FCanvas } from '@react-three/fiber';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import PhysicsBallsScene from '@/components/r3f/PhysicsBallsScene';

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
  const [showHandTracking, setShowHandTracking] = useState(true);

  // Process MediaPipe results
  const onResults = useCallback((results: HandResults) => {
    if (!landmarkCanvasRef.current || !showHandTracking) {
      // If hand tracking is disabled, just clear the canvas
      if (landmarkCanvasRef.current) {
        const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
        canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);
      }
      return;
    }

    const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);

    let handsDetected = 0;

    if (results.multiHandLandmarks && results.multiHandedness) {
      handsDetected = results.multiHandLandmarks.length;
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        // Fix hand orientation by flipping the labels (since camera is mirrored)
        const isRightHand = classification.label !== 'Right'; // Invert label
        const landmarks = results.multiHandLandmarks[index];

        // Draw landmarks and connectors with enhanced visibility
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS as LandmarkConnectionArray, {
          color: isRightHand ? '#00FF00' : '#FF0000',
          lineWidth: 5
        });

        drawLandmarks(canvasCtx, landmarks, {
          color: isRightHand ? '#FFFFFF' : '#CCCCCC',
          lineWidth: 3,
          radius: (landmarkData) => {
            // Make thumb and index fingertips larger for better visibility
            return (landmarkData.index === 4 || landmarkData.index === 8) ? 10 : 6;
          }
        });
      }
    }

    if (showHandTracking) {
      setStatus(handsDetected > 0 ? `${handsDetected} hand(s) detected` : 'No hands detected');
    }
    canvasCtx.restore();
  }, [showHandTracking]);

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
        selfieMode: false, // Changed to false for corrected mirroring
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
      {/* Status and Controls Overlay */}
      <div className="absolute top-5 left-5 flex flex-col gap-3 z-30">
        <p className="text-white bg-black bg-opacity-50 p-2 rounded">
          {showHandTracking ? status : 'Hand tracking disabled'}
        </p>
        
        <div className="flex items-center space-x-2 bg-black bg-opacity-50 p-2 rounded">
          <Switch 
            id="hand-tracking"
            checked={showHandTracking}
            onCheckedChange={setShowHandTracking}
          />
          <Label htmlFor="hand-tracking" className="text-white">Hand Tracking</Label>
        </div>
      </div>

      {/* Hidden video element for camera input */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute w-full h-full object-cover transform scale-x-[-1]"
        style={{ top: 0, left: 0, zIndex: 1, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Canvas for hand landmarks */}
      <canvas
        ref={landmarkCanvasRef}
        className="absolute w-full h-full transform scale-x-[-1]"
        style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
      />

      {/* Physics Scene Background */}
      <div className="fixed inset-0" style={{ pointerEvents: 'auto', zIndex: 0 }}>
        <R3FCanvas
          camera={{ position: [0, 0, 30], fov: 17.5, near: 10, far: 40 }}
          flat
          gl={{ antialias: false }}
          dpr={[1, 1.5]}
          frameloop="demand"
          performance={{ min: 0.5 }}
        >
          <PhysicsBallsScene />
        </R3FCanvas>
      </div>
    </div>
  );
};

export default HandTrackingDemoPage;
