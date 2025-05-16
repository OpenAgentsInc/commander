import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from 'three';
import { type OllamaChatCompletionRequest, uiOllamaConfig } from "@/services/ollama/OllamaService";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatMessageProps } from "@/components/chat/ChatMessage";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import { Environment } from '@react-three/drei';
import { Button } from "@/components/ui/button";
import { Hands, Results as HandResults, LandmarkConnectionArray, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils';

// Fix for the WebAssembly issues in Electron
declare global {
  interface Window {
    moduleInitialized: boolean;
  }
}

interface HandPosition {
  x: number;
  y: number;
}

// Dynamic pointer component for hand tracking integration
function DynamicPointer({ handPosition, vec = new THREE.Vector3() }: { handPosition: HandPosition, vec?: THREE.Vector3 }) {
  const ref = useRef<any>(null);
  const { invalidate, viewport } = useThree();

  useFrame(() => {
    if (ref.current && handPosition) {
      // Map hand position (0-1) to viewport coordinates
      // Invert X to match mirrored hand tracking, shift Y to match viewport
      const x = (1 - handPosition.x) * viewport.width - viewport.width / 2;
      const y = (1 - handPosition.y) * viewport.height - viewport.height / 2;

      vec.set(x, y, 0);
      ref.current.setNextKinematicTranslation(vec);
      invalidate();
    }
  });

  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <CuboidCollider args={[1.5, 1.5, 1.5]} />
      {/* Invisible mesh for the hand pointer */}
      <mesh visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#00ff00" wireframe />
      </mesh>
    </RigidBody>
  );
}

// Mouse-controlled pointer for when hand tracking is off
function MousePointer({ vec = new THREE.Vector3() }: { vec?: THREE.Vector3 }) {
  const ref = useRef<any>(null);
  const { invalidate, viewport, mouse } = useThree();

  useFrame(() => {
    if (ref.current) {
      // Map mouse position to viewport coordinates
      const x = (mouse.x * viewport.width) / 2;
      const y = (mouse.y * viewport.height) / 2;

      vec.set(x, y, 0);
      ref.current.setNextKinematicTranslation(vec);
      invalidate();
    }
  });

  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <CuboidCollider args={[1, 1, 1]} />
    </RigidBody>
  );
}

// Memoized Canvas component without postprocessing effects to prevent conflicts
const R3FBackground = React.memo(({ handPosition }: { handPosition: { x: number, y: number } | null }) => {
  const { invalidate } = useThree();

  // Request frames on mouse move
  useEffect(() => {
    const handleMouseMove = () => invalidate();
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [invalidate]);

  return (
    <>
      <color attach="background" args={['#000000']} />

      {/* Environment for reflections with a preset that's more likely to be available */}
      <Environment preset="sunset" />

      <Physics colliders={undefined} gravity={[6.4, 6.4, 4.4]}>
        {/* Use hand position for the pointer if available, otherwise use mouse */}
        {handPosition ? (
          <DynamicPointer handPosition={handPosition} />
        ) : (
          <MousePointer />
        )}

        {/* Scene objects */}
        {Array.from({ length: 16 }).map((_, i) => (
          <RigidBody
            key={i}
            linearDamping={4}
            angularDamping={1}
            friction={0.1}
            position={[THREE.MathUtils.randFloatSpread(10), THREE.MathUtils.randFloatSpread(10), THREE.MathUtils.randFloatSpread(10)]}
          >
            <CuboidCollider args={[0.5, 0.5, 0.5]} />
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial
                color="#ffffff"
                roughness={0.1}
                metalness={0.9}
                envMapIntensity={1}
              />
            </mesh>
          </RigidBody>
        ))}
      </Physics>

      {/* Enhanced lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} castShadow />
      <pointLight position={[10, 10, 10]} intensity={1} />
    </>
  );
});

// Wrapper component that includes Three.js canvas configuration
const ThreeScene = ({ handPosition }: { handPosition: { x: number, y: number } | null }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 30], fov: 17.5, near: 10, far: 40 }}
      shadows
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      frameloop="demand"
      performance={{ min: 0.5 }}
    >
      <R3FBackground handPosition={handPosition} />
    </Canvas>
  );
};

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessageProps[]>([
    {
      role: "system",
      content: "You are an AI agent inside an app used by a human called Commander. When asked, identify yourself simply as 'Agent'. Respond helpfully but extremely concisely, in 1-2 sentences."
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState<string>("");
  // Always use streaming
  const useStreaming = true;

  // Hand tracking state
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const [handTrackingStatus, setHandTrackingStatus] = useState('Inactive');
  const [showHandTracking, setShowHandTracking] = useState(false);

  // For streaming cancellation
  const streamCancelRef = useRef<(() => void) | null>(null);

  // For accumulating streamed content
  const streamedContentRef = useRef<string>("");
  const streamedMessageRef = useRef<ChatMessageProps | null>(null);

  // Add state for hand position to control 3D objects
  const [handPosition, setHandPosition] = useState<{ x: number, y: number } | null>(null);

  // Process MediaPipe results
  const onHandTrackingResults = useCallback((results: HandResults) => {
    if (!landmarkCanvasRef.current || !showHandTracking) {
      // If hand tracking is disabled, just clear the canvas
      if (landmarkCanvasRef.current) {
        const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
        canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);
      }
      // Also clear hand position when tracking is disabled
      setHandPosition(null);
      return;
    }

    const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);

    let handsDetected = 0;
    let rightHandIndex = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
      handsDetected = results.multiHandLandmarks.length;
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        // Fix hand orientation by flipping the labels (since camera is mirrored)
        const isRightHand = classification.label !== 'Right'; // Invert label
        const landmarks = results.multiHandLandmarks[index];

        // Track right hand index finger position for 3D interaction
        if (isRightHand && landmarks.length > 8) {
          rightHandIndex = landmarks[8]; // INDEX_FINGER_TIP
          // Update hand position for 3D scene interaction
          setHandPosition({
            x: rightHandIndex.x,
            y: rightHandIndex.y
          });
        }

        console.log(landmarks)

        // Draw landmarks and connectors with enhanced visibility
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS as LandmarkConnectionArray, {
          color: "#3f3f46", // isRightHand ? '#00FF00' : '#FF0000',
          lineWidth: 1
        });

        drawLandmarks(canvasCtx, landmarks, {
          color: "#fff", // isRightHand ? '#FFFFFF' : '#CCCCCC',
          lineWidth: 1,
          fillColor: '#000',
          radius: 4
          // radius: (landmarkData) => {
          //   // Make thumb and index fingertips larger for better visibility
          //   return (landmarkData.index === 4 || landmarkData.index === 8) ? 6 : 3;
          // }
        });
      }
    }

    // If no right hand detected, clear hand position
    if (!rightHandIndex) {
      setHandPosition(null);
    }

    if (showHandTracking) {
      setHandTrackingStatus(handsDetected > 0 ? `${handsDetected} hand(s) detected` : 'No hands detected');
    }
    canvasCtx.restore();
  }, [showHandTracking]);

  // Initialize hand tracking
  useEffect(() => {
    if (!showHandTracking) {
      // Clean up existing tracking if it's being disabled
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
      return;
    }

    if (!videoRef.current || !landmarkCanvasRef.current) return;

    // Set a global flag to prevent MediaPipe from reloading its WebAssembly module
    window.moduleInitialized = false;

    try {
      setHandTrackingStatus('Initializing MediaPipe...');

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

      handsRef.current.onResults(onHandTrackingResults);
      setHandTrackingStatus('MediaPipe initialized');

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
  }, [showHandTracking, onHandTrackingResults]);

  // Ensure canvas dimensions match video dimensions
  useEffect(() => {
    if (!showHandTracking) return;

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
  }, [showHandTracking]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    // Add user message to chat
    const userMessage: ChatMessageProps = {
      role: "user",
      content: userInput.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Clear input field
    setUserInput("");

    // Get the system message from our messages state or use a default one
    const systemMessage = messages.find(m => m.role === "system")?.content ||
      "You are an AI agent inside an app used by a human called Commander. When asked, identify yourself simply as 'Agent'. Respond helpfully but extremely concisely, in 1-2 sentences.";

    const requestPayload: OllamaChatCompletionRequest = {
      model: "gemma3:1b",
      messages: [
        { role: "system", content: systemMessage },
        ...messages
          .filter(m => m.role !== "system") // Filter out client-side system messages
          .map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage.content }
      ],
      stream: useStreaming
    };

    if (useStreaming) {
      await handleStreamingRequest(requestPayload);
    } else {
      await handleNonStreamingRequest(requestPayload);
    }
  };

  const handleNonStreamingRequest = async (requestPayload: OllamaChatCompletionRequest) => {
    try {
      // Call the Ollama service through IPC
      const result = await window.electronAPI.ollama.generateChatCompletion(requestPayload);

      // Check if we received an error through IPC
      if (result && result.__error) {
        throw new Error(result.message || "Unknown error occurred");
      }

      // Add assistant response to chat
      if (result.choices && result.choices.length > 0) {
        const assistantMessage: ChatMessageProps = {
          role: "assistant",
          content: result.choices[0].message.content
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Handle empty response
        const errorMessage: ChatMessageProps = {
          role: "system",
          content: "No response received from the assistant."
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      // Add error message to chat
      const errorMessage: ChatMessageProps = {
        role: "system",
        content: `Error: ${error.message || "Unknown error occurred"}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamingRequest = async (requestPayload: OllamaChatCompletionRequest) => {
    // For tracking token count to reduce logging
    let tokenCounter = 0;

    // Reset streaming state
    streamedContentRef.current = "";

    // Create a new message object for streaming
    const newAssistantMessage: ChatMessageProps = {
      role: "assistant",
      content: "", // Start with empty content
      isStreaming: true,
    };

    // Add to messages state and store reference
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, newAssistantMessage];
      // Store a reference to the message for updates
      streamedMessageRef.current = newAssistantMessage;
      return updatedMessages;
    });

    try {
      // Handler for each incoming chunk
      const onChunk = (chunk: any) => {
        // Extract content from the chunk if available
        if (chunk.choices && chunk.choices.length > 0) {
          const choice = chunk.choices[0];

          if (choice.delta && choice.delta.content) {
            const newToken = choice.delta.content;
            tokenCounter++;

            // Update our accumulated content
            streamedContentRef.current += newToken;
            const currentContent = streamedContentRef.current;

            // IMPORTANT: Create a completely new message object
            // Force a new object reference so React will re-render
            const updatedMessage: ChatMessageProps = {
              role: "assistant",
              content: currentContent,
              isStreaming: true,
              _updateId: Date.now(), // Force reference change
            };

            // Update the messages array, replacing the streaming message
            setMessages(prevMessages => {
              return prevMessages.map(msg => {
                // Match by reference to find the streaming message
                if (msg === streamedMessageRef.current) {
                  // Replace with our updated message
                  streamedMessageRef.current = updatedMessage; // Update our reference
                  return updatedMessage;
                }
                return msg;
              });
            });
          }
        }
      };

      // Handler for stream completion
      const onDone = () => {
        // Create final message without streaming indicators
        const finalMessage: ChatMessageProps = {
          role: "assistant",
          content: streamedContentRef.current,
          // No isStreaming flag
        };

        // Replace the streaming message with the final version
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg === streamedMessageRef.current ? finalMessage : msg
          )
        );

        // Clean up
        streamedMessageRef.current = null;
        streamedContentRef.current = "";
        streamCancelRef.current = null;
        setIsLoading(false);
      };

      // Handler for errors
      const onError = (error: any) => {
        const errorContent = streamedContentRef.current
          ? `${streamedContentRef.current}\n\n[Error: Stream interrupted - ${error.message || "Unknown error"}]`
          : `Error: ${error.message || "Unknown error occurred"}`;

        // Create error message
        const errorMessage: ChatMessageProps = {
          role: streamedContentRef.current ? "assistant" : "system",
          content: errorContent
        };

        // Replace streaming message with error message
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg === streamedMessageRef.current ? errorMessage : msg
          )
        );

        // Clean up
        streamedMessageRef.current = null;
        streamedContentRef.current = "";
        streamCancelRef.current = null;
        setIsLoading(false);
      };

      // Start streaming request
      const cancelFn = window.electronAPI.ollama.generateChatCompletionStream(
        requestPayload,
        onChunk,
        onDone,
        onError
      );

      // Save cancel function for cleanup
      streamCancelRef.current = cancelFn;

    } catch (error: any) {
      // Add error message to chat
      const errorMessage: ChatMessageProps = {
        role: "system",
        content: `Error: ${error.message || "Unknown error occurred"}`
      };

      // Replace the streaming message with error or append
      if (streamedMessageRef.current) {
        setMessages(prev =>
          prev.map(msg => msg === streamedMessageRef.current ? errorMessage : msg)
        );
      } else {
        setMessages(prev => [...prev, errorMessage]);
      }

      // Reset references
      streamedMessageRef.current = null;
      streamedContentRef.current = "";
      streamCancelRef.current = null;

      // Done loading
      setIsLoading(false);
    }
  };

  // Cleanup streaming and hand tracking on unmount
  useEffect(() => {
    return () => {
      if (streamCancelRef.current) {
        streamCancelRef.current();
        streamCancelRef.current = null;
      }

      // Clean up hand tracking
      try {
        cameraRef.current?.stop();
        if (handsRef.current) {
          handsRef.current.close();
        }
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Three.js scene with hand position tracking */}
      <div className="fixed inset-0" style={{ pointerEvents: 'auto' }}>
        {/* <ThreeScene handPosition={handPosition} /> */}
      </div>

      {/* UI Overlay - use pointer-events: none to let clicks pass through to the canvas
           except for specific UI elements that need interaction */}
      <div className="relative w-full h-full flex" style={{ pointerEvents: 'none' }}>

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
            <p className="text-white bg-black bg-opacity-50 p-2 rounded">
              {handTrackingStatus}
            </p>
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

        {/* Chat window positioned at bottom-left */}
        <div
          className="absolute bottom-0 left-0 w-[32rem] p-1"
          style={{ pointerEvents: 'auto' }} // This restores pointer events for the chat window
        >
          {/* Empty space above chat window */}
          <div className="mb-1"></div>

          {/* Chat window */}
          <div className="h-80">
            <ChatWindow
              messages={messages}
              userInput={userInput}
              onUserInputChange={setUserInput}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
