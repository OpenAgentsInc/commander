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
    if (!isHandTrackingActive || !elementState || isMouseDragging) return;
    
    const isPinching = activeHandPose === HandPose.PINCH_CLOSED;
    
    if (isPinching && pinchMidpoint && !isPinchDragging) {
      // Start pinch drag
      setIsPinchDragging(true);
      pinchDragStartRef.current = pinchMidpoint; // Store normalized coords (0-1)
      initialElementPosRef.current = elementState.position;
      pinElement(chatWindowId, elementState.position);
    } 
    else if (isPinchDragging && isPinching && pinchMidpoint && pinchDragStartRef.current && initialElementPosRef.current) {
      // Continue pinch drag - calculate deltas in normalized coordinates
      const dxNormalized = pinchMidpoint.x - pinchDragStartRef.current.x;
      const dyNormalized = pinchMidpoint.y - pinchDragStartRef.current.y;
      
      // Convert normalized deltas to screen pixels
      const deltaXScreen = dxNormalized * window.innerWidth;
      const deltaYScreen = dyNormalized * window.innerHeight;
      
      // Apply the movement delta to the initial position
      setPosition(chatWindowId, {
        x: initialElementPosRef.current.x + deltaXScreen,
        y: initialElementPosRef.current.y + deltaYScreen
      });
    }
    else if (isPinchDragging && !isPinching) {
      // End pinch drag
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
      <div 
        className={`h-80 border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden transition-all duration-200
                   ${isPinchDragging ? 'scale-105 opacity-100 border-primary shadow-primary/50' : 'opacity-85 hover:opacity-100 border-border'}`}
      >
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