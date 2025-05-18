import React, { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { HandTrackingUIControls, MainSceneContent, HandPose, type PinchCoordinates, useHandTracking } from "@/components/hands";
import { ChatContainer } from "@/components/chat";
import { useUIElementsStore, UIPosition } from "@/stores/uiElementsStore";
import { Effect, Exit, Cause } from "effect";
import { BIP39Service, BIP39ServiceLive } from "@/services/bip39";
import { BIP32Service, BIP32ServiceLive } from "@/services/bip32";
import { Button } from "@/components/ui/button";

// Pinnable Chat Window Component
interface PinnableChatWindowProps {
  isHandTrackingActive: boolean;
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
}

const PinnableChatWindow: React.FC<PinnableChatWindowProps> = ({
  isHandTrackingActive,
  activeHandPose,
  pinchMidpoint,
}) => {
  const chatWindowId = 'chatWindow';
  const defaultPosition = { x: 16, y: window.innerHeight - 366 }; // 350px height + 16px padding

  // Ensure element exists in store with default position
  useUIElementsStore.getState().ensureElement(chatWindowId, defaultPosition);

  // Get element state and store actions
  const elementState = useUIElementsStore(useCallback(state => state.getElement(chatWindowId), [chatWindowId]));
  const setPosition = useUIElementsStore(state => state.setElementPosition);
  const pinElement = useUIElementsStore(state => state.pinElement);
  const unpinElement = useUIElementsStore(state => state.unpinElement);

  // Mouse drag state
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const mouseDragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Pinch drag state
  const [isPinchDragging, setIsPinchDragging] = useState(false);
  const pinchDragStartRef = useRef<PinchCoordinates | null>(null);

  // Common initial position ref for both mouse and pinch dragging
  const initialElementPosRef = useRef<UIPosition | null>(null);

  // Derived position, with fallback just in case
  const currentPosition = elementState?.position || defaultPosition;

  // Effect for Pinch-to-Move using Hand Tracking
  useEffect(() => {
    if (!isHandTrackingActive || !elementState || isMouseDragging) {
      // Don't process pinch gestures if hand tracking is not active or mouse is being used
      return;
    }

    // Check if the pose is a pinch
    const isPinching = activeHandPose === HandPose.PINCH_CLOSED;

    // Log pinchMidpoint as soon as it's received from props
    if (isHandTrackingActive && pinchMidpoint) {
      // Received pinch midpoint
    }

    // Log current state for debugging - now using screen coordinates
    // Hand state tracking

    if (isPinching && pinchMidpoint && !isPinchDragging) {
      // Only start dragging if the pinch is over the chat window
      const windowElem = document.getElementById(chatWindowId);
      if (windowElem && elementState) {
        const bounds = windowElem.getBoundingClientRect();
        // Extract specific check to a const for clarity
        const isCurrentlyPinchOverWindow =
          pinchMidpoint.x >= bounds.left &&
          pinchMidpoint.x <= bounds.right &&
          pinchMidpoint.y >= bounds.top &&
          pinchMidpoint.y <= bounds.bottom;

        // Log intersection test for debugging
        // Pinch location test

        // Now we ONLY allow dragging when pinch is over the window
        if (isCurrentlyPinchOverWindow) {
          // Starting pinch drag
          setIsPinchDragging(true);
          pinchDragStartRef.current = { ...pinchMidpoint }; // Store a copy
          initialElementPosRef.current = { ...elementState.position }; // Store a copy
          pinElement(chatWindowId, elementState.position);
        } else if (pinchMidpoint) {
          // Pinch closed but not over window
        }
      }
    }
    else if (isPinchDragging && isPinching && pinchMidpoint && pinchDragStartRef.current && initialElementPosRef.current) {
      // Continue pinch drag - calculate direct deltas in screen pixels
      const deltaX = pinchMidpoint.x - pinchDragStartRef.current.x;
      const deltaY = pinchMidpoint.y - pinchDragStartRef.current.y;

      // Only update position if there's meaningful movement to prevent infinite loops
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        // Calculate new position directly from pixel coordinates
        const newX = initialElementPosRef.current.x + deltaX;
        const newY = initialElementPosRef.current.y + deltaY;

        const bounds = document.getElementById(chatWindowId)?.getBoundingClientRect();
        // Moving with pinch

        // Update the start position to current position to prevent jitter
        pinchDragStartRef.current = { ...pinchMidpoint };

        // Apply the movement delta to the initial position
        setPosition(chatWindowId, { x: newX, y: newY });

        // Update the initial position ref to match the new position
        initialElementPosRef.current = { x: newX, y: newY };
      }
    }
    else if (isPinchDragging && !isPinching) {
      // End pinch drag
      // Ending pinch drag
      setIsPinchDragging(false);
      pinchDragStartRef.current = null;
      initialElementPosRef.current = null;
      if (elementState?.isPinned) {
        unpinElement(chatWindowId);
      }
    }
  }, [
    isHandTrackingActive,
    activeHandPose,
    pinchMidpoint,
    isPinchDragging,
    elementState,
    setPosition,
    pinElement,
    unpinElement,
    chatWindowId,
    isMouseDragging
  ]);

  // Mouse Drag Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!elementState || isPinchDragging) return; // Allow mouse dragging even with hand tracking on

    e.preventDefault();
    e.stopPropagation();

    setIsMouseDragging(true);
    mouseDragStartRef.current = { x: e.clientX, y: e.clientY };
    initialElementPosRef.current = currentPosition;
    pinElement(chatWindowId, currentPosition);
  }, [elementState, pinElement, currentPosition, chatWindowId, isPinchDragging]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isMouseDragging || !mouseDragStartRef.current || !initialElementPosRef.current || !elementState?.isPinned || isPinchDragging) return;

    const dx = e.clientX - mouseDragStartRef.current.x;
    const dy = e.clientY - mouseDragStartRef.current.y;

    setPosition(chatWindowId, {
      x: initialElementPosRef.current.x + dx,
      y: initialElementPosRef.current.y + dy
    });
  }, [isMouseDragging, elementState?.isPinned, setPosition, chatWindowId, isPinchDragging]);

  const handleMouseUp = useCallback(() => {
    if (!isMouseDragging || !elementState?.isPinned || isPinchDragging) return;

    setIsMouseDragging(false);
    mouseDragStartRef.current = null;
    initialElementPosRef.current = null;
    unpinElement(chatWindowId);
  }, [isMouseDragging, elementState?.isPinned, unpinElement, chatWindowId, isPinchDragging]);

  // Add global event listeners while dragging
  useEffect(() => {
    if (isMouseDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMouseDragging, handleMouseMove, handleMouseUp]);

  // Determine if the element is currently being interacted with (mouse or pinch)
  const isInteracting = isMouseDragging || isPinchDragging;

  // Calculate if the pinch is over the chat window
  const isPinchOverWindow = useCallback(() => {
    if (!pinchMidpoint || !elementState) return false;

    // Get chat window bounds
    const windowElem = document.getElementById(chatWindowId);
    if (!windowElem) return false;

    const bounds = windowElem.getBoundingClientRect();

    // Check if pinch is within bounds
    return (
      pinchMidpoint.x >= bounds.left &&
      pinchMidpoint.x <= bounds.right &&
      pinchMidpoint.y >= bounds.top &&
      pinchMidpoint.y <= bounds.bottom
    );
  }, [pinchMidpoint, elementState, chatWindowId]);

  // Determine if the pinch is targeting this window but not yet dragging
  const isTargeted = activeHandPose === HandPose.PINCH_CLOSED &&
    isHandTrackingActive &&
    isPinchOverWindow() &&
    !isPinchDragging;

  return (
    <div
      id={chatWindowId}
      className={`absolute w-[32rem] p-1 ${isInteracting ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
        pointerEvents: 'auto',
        userSelect: isInteracting ? 'none' : 'auto',
        zIndex: isInteracting ? 1000 : 50,
        transition: isPinchDragging ? 'none' : 'all 0.05s ease-out', // Smooth for mouse drag, instant for pinch
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Removed targeting indicator */}
      <div
        className={`h-80 border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden transition-all duration-200 relative
                   ${isPinchDragging ? 'scale-105 opacity-90' : 'opacity-85 hover:opacity-100 border-border'}`}
      >
        {/* Removed the pinch overlay indicator */}
        <ChatContainer
          className="bg-transparent !h-full"
          systemMessage="You are an AI agent named 'Agent' inside an app used by a human called Commander. Respond helpfully but concisely, in 2-3 sentences."
          model="gemma3:1b"
        />
      </div>
    </div>
  );
};

export default function HomePage() {
  const [showHandTracking, setShowHandTracking] = useState(false);
  const [mnemonicResult, setMnemonicResult] = useState<string | null>(null);
  const [bip32Result, setBip32Result] = useState<string | null>(null);
  const mainCanvasContainerRef = useRef<HTMLDivElement>(null);

  // Use hand tracking hook directly in HomePage
  const {
    videoRef,
    landmarkCanvasRef,
    handPosition,
    handTrackingStatus,
    activeHandPose,
    pinchMidpoint,
  } = useHandTracking({ enabled: showHandTracking });
  
  // Handler for generating a mnemonic using the BIP39Service
  const handleGenerateMnemonicClick = async () => {
    const program = Effect.gen(function* (_) {
      // Access the BIP39Service
      const bip39Service = yield* _(BIP39Service);
      // Call the generateMnemonic method
      return yield* _(bip39Service.generateMnemonic());
    }).pipe(Effect.provide(BIP39ServiceLive));
    
    // Run the program and handle the result
    const result = await Effect.runPromiseExit(program);
    
    Exit.match(result, {
      onSuccess: (mnemonic) => {
        console.log("Generated Mnemonic:", mnemonic);
        setMnemonicResult(mnemonic);
      },
      onFailure: (cause) => {
        console.error("Failed to generate mnemonic:", Cause.pretty(cause));
        setMnemonicResult("Error generating mnemonic. See console for details.");
      }
    });
  };
  
  // Helper function to convert Uint8Array to hex string (browser-safe replacement for Buffer)
  const toHexString = (bytes: Uint8Array): string => {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };
  
  // Handler for testing the BIP32 derivation process
  const handleTestBIP32Click = async () => {
    // Create a program that:
    // 1. Generates a mnemonic
    // 2. Converts the mnemonic to a seed
    // 3. Derives a BIP44 address from the seed
    const program = Effect.gen(function* (_) {
      // Access both services
      const bip39Service = yield* _(BIP39Service);
      const bip32Service = yield* _(BIP32Service);
      
      // 1. Generate a mnemonic phrase
      const mnemonic = yield* _(bip39Service.generateMnemonic());
      console.log("Generated mnemonic:", mnemonic);
      
      // 2. Convert the mnemonic to a seed
      const seed = yield* _(bip39Service.mnemonicToSeed(mnemonic));
      const seedHex = toHexString(seed);
      console.log("Generated seed (hex):", seedHex);
      
      // 3. Derive a BIP44 address path (m/44'/0'/0'/0/0)
      const addressDetails = yield* _(bip32Service.deriveBIP44Address(seed, 0, 0, false));
      console.log("Derived BIP44 address:", addressDetails);
      
      return {
        mnemonic,
        seedHex: seedHex.substring(0, 8) + '...',
        path: addressDetails.path,
        publicKey: addressDetails.publicKey.substring(0, 8) + '...',
        privateKey: addressDetails.privateKey ? 
          addressDetails.privateKey.substring(0, 8) + '...' : 
          '(no private key)'
      };
    }).pipe(
      Effect.provide(BIP39ServiceLive),
      Effect.provide(BIP32ServiceLive)
    );
    
    // Run the program and handle the result
    const result = await Effect.runPromiseExit(program);
    
    Exit.match(result, {
      onSuccess: (details) => {
        console.log("BIP32 Derivation Process Complete:", details);
        setBip32Result(JSON.stringify(details, null, 2));
      },
      onFailure: (cause) => {
        console.error("Failed to derive BIP32 address:", Cause.pretty(cause));
        setBip32Result("Error in BIP32 derivation process. See console for details.");
      }
    });
  };

  // Add WebGL context lost/restored event listeners
  useEffect(() => {
    const canvas = mainCanvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      console.error('[HomePage] WebGL Context Lost:', event);
      event.preventDefault(); // Try to prevent default behavior
    };

    const handleContextRestored = (event: Event) => {
      console.log('[HomePage] WebGL Context Restored:', event);
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    // Added WebGL context listeners

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      // Removed WebGL context listeners
    };
  }, []); // Empty dependency array to run once after initial mount

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-black">
      {/* Semi-transparent overlay */}
      <div className="canvas-overlay" />

      {/* Main R3F Canvas - ALWAYS rendered, not conditional on showHandTracking */}
      <div ref={mainCanvasContainerRef} className="fixed inset-0 z-0">
        <Canvas
          frameloop="always" // Changed from "demand" to ensure continual updates
          camera={{ position: [0, 0, 15], fov: 45, near: 0.1, far: 1000 }}
          shadows
          gl={{
            antialias: true,
            alpha: false, // Set to false for better performance
            powerPreference: "default", // Less aggressive than high-performance
            failIfMajorPerformanceCaveat: false,
            depth: true,
            stencil: false,
            preserveDrawingBuffer: true // Can help with context issues
          }}
          dpr={1} // Fixed DPR instead of range for more stability
          onCreated={({ gl, scene }) => {
            // Main R3F Canvas created
            // Set clear color and clear buffers
            gl.setClearColor(0x000000, 1);
            gl.clear();

            // Setup shadows
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;

            // Add WebGL context listeners directly to the gl object
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              console.error('[HomePage] WebGL Context Lost (from onCreated):', event);
              event.preventDefault();
            }, false);

            gl.domElement.addEventListener('webglcontextrestored', () => {
              console.log('[HomePage] WebGL Context Restored (from onCreated)');
            }, false);
          }}
        >
          <MainSceneContent handPosition={handPosition} activeHandPose={activeHandPose} />
        </Canvas>
      </div>

      {/* Hand tracking UI controls (switch, video, canvas, etc.) */}
      <HandTrackingUIControls
        showHandTracking={showHandTracking}
        setShowHandTracking={setShowHandTracking}
        videoRef={videoRef}
        landmarkCanvasRef={landmarkCanvasRef}
        handTrackingStatus={handTrackingStatus}
        activeHandPose={activeHandPose}
        pinchMidpoint={pinchMidpoint}
      />

      {/* UI Overlay */}
      <div className="relative w-full h-full z-10" style={{ pointerEvents: 'none' }}>
        {/* Pinnable chat window */}
        <PinnableChatWindow
          isHandTrackingActive={showHandTracking}
          activeHandPose={activeHandPose}
          pinchMidpoint={pinchMidpoint}
        />
        
        {/* Test Buttons */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2" style={{ pointerEvents: 'auto' }}>
          <div>
            <Button onClick={handleGenerateMnemonicClick} variant="secondary" className="mb-1">
              Generate Test Mnemonic
            </Button>
            
            {mnemonicResult && (
              <div className="p-2 bg-background/80 backdrop-blur-sm rounded-md text-sm max-w-96 overflow-hidden text-ellipsis whitespace-nowrap">
                {mnemonicResult}
              </div>
            )}
          </div>
          
          <div>
            <Button onClick={handleTestBIP32Click} variant="secondary" className="mb-1">
              Test BIP32 Derivation
            </Button>
            
            {bip32Result && (
              <div className="p-2 bg-background/80 backdrop-blur-sm rounded-md text-sm max-w-96 overflow-auto whitespace-pre-wrap" style={{ maxHeight: '12rem' }}>
                {bip32Result}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
