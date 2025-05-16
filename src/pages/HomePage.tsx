import React, { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from '@react-three/fiber';
import { HandTrackingUIControls, MainSceneContent, HandPose, type PinchCoordinates, useHandTracking } from "@/components/hands";
import { ChatContainer } from "@/components/chat";
import { useUIElementsStore, UIPosition } from "@/stores/uiElementsStore";

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
      console.log(`PinnableChatWindow RX pinchMidpoint: X=${pinchMidpoint.x.toFixed(0)}, Y=${pinchMidpoint.y.toFixed(0)} (Screen Pixels)`);
    }
    
    // Log current state for debugging - now using screen coordinates
    console.log("Hand state:", { 
      isPinching, 
      isPinchDragging, 
      pinchMidpoint: pinchMidpoint ? `${Math.round(pinchMidpoint.x)}, ${Math.round(pinchMidpoint.y)} px` : null,
      activeHandPose,
      windowPosition: elementState.position ? `${elementState.position.x}, ${elementState.position.y} px` : null
    });
    
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
        console.log(`PINCH LOCATION TEST: 
          pinch @ (${Math.round(pinchMidpoint.x)}, ${Math.round(pinchMidpoint.y)}) px
          window @ L:${Math.round(bounds.left)} T:${Math.round(bounds.top)} R:${Math.round(bounds.right)} B:${Math.round(bounds.bottom)} px
          intersection: ${isCurrentlyPinchOverWindow}
        `);
        
        // Temporarily comment out the check to allow pinch from anywhere
        // if (isCurrentlyPinchOverWindow) {
          console.log(`%cSTARTING PINCH DRAG (OVERRIDE)%c @ ${Math.round(pinchMidpoint.x)},${Math.round(pinchMidpoint.y)}px. Window: L${Math.round(bounds.left)} T${Math.round(bounds.top)} R${Math.round(bounds.right)} B${Math.round(bounds.bottom)}`, "color: purple; font-weight: bold;", "color: purple;");
          setIsPinchDragging(true);
          pinchDragStartRef.current = { ...pinchMidpoint }; // Store a copy
          initialElementPosRef.current = { ...elementState.position }; // Store a copy
          pinElement(chatWindowId, elementState.position);
        // } else if (pinchMidpoint) {
        //   console.warn(`Pinch Closed DETECTED BUT NOT OVER WINDOW. Pinch @ ${Math.round(pinchMidpoint.x)},${Math.round(pinchMidpoint.y)}px. Window Rect: L${Math.round(bounds.left)} T${Math.round(bounds.top)} R${Math.round(bounds.right)} B${Math.round(bounds.bottom)}`);
        // }
      }
    } 
    else if (isPinchDragging && isPinching && pinchMidpoint && pinchDragStartRef.current && initialElementPosRef.current) {
      // Continue pinch drag - calculate direct deltas in screen pixels
      const deltaX = pinchMidpoint.x - pinchDragStartRef.current.x;
      const deltaY = pinchMidpoint.y - pinchDragStartRef.current.y;
      
      // Calculate new position directly from pixel coordinates
      const newX = initialElementPosRef.current.x + deltaX;
      const newY = initialElementPosRef.current.y + deltaY;
      
      const bounds = document.getElementById(chatWindowId)?.getBoundingClientRect();
      console.log(`%cMOVING WITH PINCH%c Delta: ${Math.round(deltaX)},${Math.round(deltaY)}px | New: ${Math.round(newX)},${Math.round(newY)}px | Bounds: L${bounds ? Math.round(bounds.left) : '?'} T${bounds ? Math.round(bounds.top) : '?'} R${bounds ? Math.round(bounds.right) : '?'} B${bounds ? Math.round(bounds.bottom) : '?'}`, 
        "color: blue; font-weight: bold;", 
        "color: blue;");
      
      // Apply the movement delta to the initial position
      setPosition(chatWindowId, { x: newX, y: newY });
    }
    else if (isPinchDragging && !isPinching) {
      // End pinch drag
      console.log("%cENDING PINCH DRAG%c - Final position: " + 
        (elementState ? `${Math.round(elementState.position.x)},${Math.round(elementState.position.y)}px` : "unknown"),
        "color: purple; font-weight: bold;",
        "color: purple;"
      );
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
    if (isHandTrackingActive || !elementState || isPinchDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsMouseDragging(true);
    mouseDragStartRef.current = { x: e.clientX, y: e.clientY };
    initialElementPosRef.current = currentPosition;
    pinElement(chatWindowId, currentPosition);
  }, [isHandTrackingActive, elementState, pinElement, currentPosition, chatWindowId, isPinchDragging]);
  
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
      {/* Targeting indicator - shows when pinch is over the window but not yet dragging */}
      {isTargeted && (
        <div
          className="absolute inset-0 border-4 border-dashed border-blue-500 animate-pulse z-40 pointer-events-none rounded-md"
          style={{ margin: "-2px" }}
        >
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 -translate-y-full bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
            TARGETED
          </div>
        </div>
      )}
      <div 
        className={`h-80 border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden transition-all duration-200 relative
                   ${isPinchDragging ? 'scale-105 opacity-100 border-primary border-4 shadow-2xl shadow-primary/70 ring-4 ring-primary/70' : isTargeted ? 'opacity-95 border-blue-600 border-2 shadow-xl shadow-blue-600/50' : 'opacity-85 hover:opacity-100 border-border'}`}
      >
        {/* Pinch overlay indicator - only shows when pinching */}
        {isPinchDragging && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-primary/20 backdrop-blur-sm rounded-md">
            <div className="bg-primary text-primary-foreground font-bold text-lg text-center p-3 rounded-lg animate-pulse shadow-2xl ring-4 ring-offset-2 ring-offset-background ring-primary">
              PINCHING
              <div className="text-sm mt-1 font-normal">Move hand to drag</div>
            </div>
          </div>
        )}
        <ChatContainer
          className="bg-transparent !h-full"
          systemMessage="You are an AI agent inside an app used by a human called Commander. When asked, identify yourself simply as 'Agent'. Respond helpfully but extremely concisely, in 1-2 sentences."
          model="gemma3:1b"
        />
      </div>
    </div>
  );
};

export default function HomePage() {
  const [showHandTracking, setShowHandTracking] = useState(false);
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
    console.log("[HomePage] Added WebGL context listeners to main canvas");

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      console.log("[HomePage] Removed WebGL context listeners from main canvas");
    };
  }, []); // Empty dependency array to run once after initial mount
  
  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-black">
      {/* Main R3F Canvas - ALWAYS rendered, not conditional on showHandTracking */}
      <div ref={mainCanvasContainerRef} className="fixed inset-0 z-0">
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0, 30], fov: 17.5, near: 10, far: 40 }}
          shadows
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false
          }}
          dpr={[1, 1.5]}
          performance={{ min: 0.5 }}
          onCreated={({ gl }) => {
            console.log("[HomePage] Main R3F Canvas CREATED");
            
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
          <MainSceneContent handPosition={handPosition} />
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
      </div>
    </div>
  );
}