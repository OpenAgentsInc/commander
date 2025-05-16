import React, { useState, useEffect, useRef, useCallback } from "react";
import { HandTracking, HandPose, type PinchCoordinates, useHandTracking } from "@/components/hands";
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
      if (windowElem) {
        const bounds = windowElem.getBoundingClientRect();
        const isPinchOverWindow = 
          pinchMidpoint.x >= bounds.left && 
          pinchMidpoint.x <= bounds.right && 
          pinchMidpoint.y >= bounds.top && 
          pinchMidpoint.y <= bounds.bottom;
        
        if (isPinchOverWindow) {
          console.log("STARTING PINCH DRAG at", `${Math.round(pinchMidpoint.x)}, ${Math.round(pinchMidpoint.y)} px`);
          console.log("WINDOW BOUNDS:", bounds);
          setIsPinchDragging(true);
          pinchDragStartRef.current = pinchMidpoint; // These are already screen coordinates
          initialElementPosRef.current = elementState.position;
          pinElement(chatWindowId, elementState.position);
        } else {
          console.log("Pinch detected but not over the window", `Pinch: ${Math.round(pinchMidpoint.x)}, ${Math.round(pinchMidpoint.y)} px`, `Window: ${bounds.left}, ${bounds.top}, ${bounds.right}, ${bounds.bottom}`);
        }
      }
    } 
    else if (isPinchDragging && isPinching && pinchMidpoint && pinchDragStartRef.current && initialElementPosRef.current) {
      // Continue pinch drag - calculate direct deltas in screen pixels
      const deltaX = pinchMidpoint.x - pinchDragStartRef.current.x;
      const deltaY = pinchMidpoint.y - pinchDragStartRef.current.y;
      
      // Calculate new position directly from pixel coordinates
      const newX = initialElementPosRef.current.x + deltaX;
      const newY = initialElementPosRef.current.y + deltaY;
      
      console.log("MOVING WITH PINCH", { 
        delta: `${Math.round(deltaX)}, ${Math.round(deltaY)} px`,
        newPosition: `${Math.round(newX)}, ${Math.round(newY)} px`,
        chatWindowBounds: document.getElementById(chatWindowId)?.getBoundingClientRect() || 'unknown'
      });
      
      // Apply the movement delta to the initial position
      setPosition(chatWindowId, { x: newX, y: newY });
    }
    else if (isPinchDragging && !isPinching) {
      // End pinch drag
      console.log("ENDING PINCH DRAG");
      setIsPinchDragging(false);
      pinchDragStartRef.current = null;
      initialElementPosRef.current = null;
      if (elementState.isPinned) {
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
        <div className="absolute inset-0 border-4 border-dashed border-primary animate-pulse z-40 pointer-events-none" 
             style={{ margin: "-4px" }}>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs px-2 py-1 rounded-full">
            Ready to Grab
          </div>
        </div>
      )}
      <div 
        className={`h-80 border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden transition-all duration-200 relative
                   ${isPinchDragging ? 'scale-105 opacity-100 border-primary border-2 shadow-[0_0_15px_rgba(0,0,0,0.3),0_0_10px_rgba(16,185,129,0.5)] ring-2 ring-primary/50' : 'opacity-85 hover:opacity-100 border-border'}`}
      >
        {/* Pinch overlay indicator - only shows when pinching */}
        {isPinchDragging && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-primary/30 text-white font-bold text-center p-4 rounded-lg animate-pulse">
              PINCHING
              <div className="text-xs mt-1">Move hand to drag window</div>
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
  
  // Get hand tracking data from the hook directly in HomePage to pass to PinnableChatWindow
  const { activeHandPose, pinchMidpoint } = useHandTracking({ enabled: showHandTracking });

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      {/* Hand tracking component */}
      <HandTracking
        showHandTracking={showHandTracking}
        setShowHandTracking={setShowHandTracking}
      />

      {/* UI Overlay */}
      <div className="relative w-full h-full" style={{ pointerEvents: 'none' }}>
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