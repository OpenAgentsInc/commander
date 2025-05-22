import React, { useState, useEffect, useRef } from "react";
import { useDrag } from "@use-gesture/react";
import { X as IconX } from "lucide-react";
import { Pane as PaneType } from "@/types/pane";
import { usePaneStore } from "@/stores/pane";
import type { FullGestureState } from "@use-gesture/react";

type PaneProps = PaneType & {
  children?: React.ReactNode;
  titleBarButtons?: React.ReactNode;
  style?: React.CSSProperties;
  content?: PaneType["content"];
};

type ResizeCorner =
  | "topleft"
  | "top"
  | "topright"
  | "right"
  | "bottomright"
  | "bottom"
  | "bottomleft"
  | "left";

const useResizeHandlers = (
  id: string,
  initialPosition: { x: number; y: number },
  initialSize: { width: number; height: number },
  updatePanePosition: (id: string, x: number, y: number) => void,
  updatePaneSize: (id: string, width: number, height: number) => void,
  isCurrentlyInteracting: boolean,
  setIsResizing: (isResizing: boolean) => void,
) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);

  // Using refs to keep track of prev values to avoid unnecessary state updates
  const prevPositionRef = useRef(initialPosition);
  const prevSizeRef = useRef(initialSize);

  useEffect(() => {
    if (
      !isCurrentlyInteracting &&
      (initialPosition.x !== prevPositionRef.current.x ||
        initialPosition.y !== prevPositionRef.current.y) &&
      (position.x !== initialPosition.x || position.y !== initialPosition.y)
    ) {
      setPosition(initialPosition);
    }
    if (!isCurrentlyInteracting) {
      prevPositionRef.current = initialPosition;
    }
  }, [
    initialPosition.x,
    initialPosition.y,
    isCurrentlyInteracting,
    position.x,
    position.y,
  ]);

  useEffect(() => {
    if (
      !isCurrentlyInteracting &&
      (initialSize.width !== prevSizeRef.current.width ||
        initialSize.height !== prevSizeRef.current.height) &&
      (size.width !== initialSize.width || size.height !== initialSize.height)
    ) {
      setSize(initialSize);
    }
    if (!isCurrentlyInteracting) {
      prevSizeRef.current = initialSize;
    }
  }, [
    initialSize.width,
    initialSize.height,
    isCurrentlyInteracting,
    size.width,
    size.height,
  ]);

  const minWidth = 200;
  const minHeight = 100;

  // Memo ref for resize start state
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Define a more accurate type based on what use-gesture provides
  type ResizeHandlerParams = Omit<FullGestureState<"drag">, "memo"> & {
    memo?: typeof resizeStartRef.current | null;
  };

  const makeResizeHandler = (corner: ResizeCorner) => {
    return ({
      active,
      movement: [deltaX, deltaY],
      first,
      last,
      memo,
      event,
    }: ResizeHandlerParams) => {
      setIsResizing(active);
      let currentMemo = memo || null;

      if (first) {
        currentMemo = {
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
        };
        // Store starting values in ref for future use if needed
        resizeStartRef.current = currentMemo;
      }

      // Safety check - should never happen with the first handler above
      if (!currentMemo) {
        return null;
      }

      let newX = currentMemo.x;
      let newY = currentMemo.y;
      let newWidth = currentMemo.width;
      let newHeight = currentMemo.height;

      switch (corner) {
        case "topleft":
          newWidth = Math.max(minWidth, currentMemo.width - deltaX);
          newHeight = Math.max(minHeight, currentMemo.height - deltaY);
          newX = currentMemo.x + (currentMemo.width - newWidth);
          newY = currentMemo.y + (currentMemo.height - newHeight);
          break;
        case "top":
          newHeight = Math.max(minHeight, currentMemo.height - deltaY);
          newY = currentMemo.y + (currentMemo.height - newHeight);
          newX = currentMemo.x; // Ensure x doesn't change
          newWidth = currentMemo.width; // Ensure width doesn't change
          break;
        case "topright":
          newWidth = Math.max(minWidth, currentMemo.width + deltaX);
          newHeight = Math.max(minHeight, currentMemo.height - deltaY);
          newY = currentMemo.y + (currentMemo.height - newHeight);
          newX = currentMemo.x; // Ensure x doesn't change
          break;
        case "right":
          newWidth = Math.max(minWidth, currentMemo.width + deltaX);
          newX = currentMemo.x; // Ensure x doesn't change
          newY = currentMemo.y; // Ensure y doesn't change
          newHeight = currentMemo.height; // Ensure height doesn't change
          break;
        case "bottomright":
          newWidth = Math.max(minWidth, currentMemo.width + deltaX);
          newHeight = Math.max(minHeight, currentMemo.height + deltaY);
          newX = currentMemo.x; // Ensure x doesn't change
          newY = currentMemo.y; // Ensure y doesn't change
          break;
        case "bottom":
          newHeight = Math.max(minHeight, currentMemo.height + deltaY);
          newX = currentMemo.x; // Ensure x doesn't change
          newY = currentMemo.y; // Ensure y doesn't change
          newWidth = currentMemo.width; // Ensure width doesn't change
          break;
        case "bottomleft":
          newWidth = Math.max(minWidth, currentMemo.width - deltaX);
          newX = currentMemo.x + (currentMemo.width - newWidth);
          newHeight = Math.max(minHeight, currentMemo.height + deltaY);
          newY = currentMemo.y; // Ensure y doesn't change
          break;
        case "left":
          newWidth = Math.max(minWidth, currentMemo.width - deltaX);
          newX = currentMemo.x + (currentMemo.width - newWidth);
          newY = currentMemo.y; // Ensure y doesn't change
          newHeight = currentMemo.height; // Ensure height doesn't change
          break;
      }

      setPosition({ x: newX, y: newY });
      setSize({ width: newWidth, height: newHeight });

      if (last) {
        updatePanePosition(id, newX, newY);
        updatePaneSize(id, newWidth, newHeight);

        // Update refs with final position/size
        prevPositionRef.current = { x: newX, y: newY };
        prevSizeRef.current = { width: newWidth, height: newHeight };
      }
      return currentMemo;
    };
  };

  const resizeHandlers = {
    topleft: useDrag(makeResizeHandler("topleft")),
    top: useDrag(makeResizeHandler("top")),
    topright: useDrag(makeResizeHandler("topright")),
    right: useDrag(makeResizeHandler("right")),
    bottomright: useDrag(makeResizeHandler("bottomright")),
    bottom: useDrag(makeResizeHandler("bottom")),
    bottomleft: useDrag(makeResizeHandler("bottomleft")),
    left: useDrag(makeResizeHandler("left")),
  };

  return { position, size, setPosition, resizeHandlers };
};

export const Pane: React.FC<PaneProps> = ({
  id,
  title,
  x: initialX,
  y: initialY,
  width: initialWidth,
  height: initialHeight,
  type,
  isActive,
  children,
  titleBarButtons,
  dismissable = true,
  style = {},
}) => {
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  });
  const updatePanePosition = usePaneStore((state) => state.updatePanePosition);
  const updatePaneSize = usePaneStore((state) => state.updatePaneSize);
  const removePane = usePaneStore((state) => state.removePane);
  const bringPaneToFront = usePaneStore((state) => state.bringPaneToFront);
  // setActivePane is handled by bringPaneToFront now

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const isInteracting = isDragging || isResizing;

  // We're using memo pattern from use-gesture for drag state tracking

  const { position, size, setPosition, resizeHandlers } = useResizeHandlers(
    id,
    { x: initialX, y: initialY },
    { width: initialWidth, height: initialHeight },
    updatePanePosition,
    updatePaneSize,
    isInteracting,
    setIsResizing,
  );

  useEffect(() => {
    const updateBounds = () => {
      const handleSize = 50;
      setBounds({
        left: -size.width + handleSize,
        top: 0,
        right: window.innerWidth - handleSize,
        bottom: window.innerHeight - handleSize,
      });
    };
    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, [size.width, size.height]);

  interface DragStartMemo {
    startX: number;
    startY: number;
    paneX: number;
    paneY: number;
  }

  const bindDrag = useDrag<DragStartMemo>(
    ({ active, xy: [pointerX, pointerY], first, last, event, memo }) => {
      // Handle the event properly, checking both existence and type
      if (
        event &&
        "stopPropagation" in event &&
        typeof event.stopPropagation === "function"
      ) {
        event.stopPropagation();
      }

      // Use memo to store initial state across the entire drag
      if (first) {
        // Capture current position BEFORE activating the pane
        const initialMemo: DragStartMemo = {
          startX: pointerX,
          startY: pointerY,
          paneX: position.x,
          paneY: position.y,
        };

        // Only activate the pane if not already active
        if (!isActive) {
          bringPaneToFront(id);
        }

        setIsDragging(true);
        return initialMemo; // Return memo for use in subsequent callbacks
      }

      // Use memo for stable position calculations throughout drag
      if (active && memo) {
        const deltaX = pointerX - memo.startX;
        const deltaY = pointerY - memo.startY;

        let newX = memo.paneX + deltaX;
        let newY = memo.paneY + deltaY;

        // Apply bounds constraints
        newX = Math.max(bounds.left, Math.min(newX, bounds.right));
        newY = Math.max(bounds.top, Math.min(newY, bounds.bottom));

        setPosition({ x: newX, y: newY });

        if (last) {
          updatePanePosition(id, newX, newY);
          setIsDragging(false);
        }
      } else if (!active) {
        setIsDragging(false);
      }

      // Keep returning memo to maintain continuity through the drag
      return memo;
    },
    {
      filterTaps: true,
    },
  );

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    removePane(id);
  };

  const handlePaneMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.classList.contains("resize-handle") ||
      target.closest(".title-bar-button-container")
    ) {
      return;
    }
    // Only activate the pane - the drag is handled separately by bindDrag
    if (!isActive) {
      bringPaneToFront(id);
    }
  };

  const resizeHandleClasses = "absolute bg-transparent pointer-events-auto";
  const resizeHandleSize = "8px";
  const resizeHandleOffset = "-4px";

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        ...style, // Apply styles from props (including zIndex from PaneManager)
      }}
      className={`pane-container pointer-events-auto flex flex-col overflow-hidden rounded-lg border bg-black/90 shadow-lg backdrop-blur-sm ${isActive ? "border-primary ring-primary ring-1" : "border-border/20"} ${!isInteracting ? "transition-all duration-100 ease-out" : ""}`}
      onMouseDownCapture={handlePaneMouseDown}
    >
      <div
        {...bindDrag()}
        className="pane-title-bar border-border/20 flex h-8 cursor-grab touch-none items-center justify-between border-b bg-black/80 px-3 py-1.5 font-bold text-white/90 select-none active:cursor-grabbing"
        style={{ touchAction: "none" }} // Add this to fix the touch-action warning
      >
        <span className="truncate text-xs">{title}</span>
        <div className="title-bar-button-container flex items-center space-x-1">
          {titleBarButtons}
          {dismissable && (
            <button
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="hover:text-destructive ml-1 rounded p-0.5 text-white/70 hover:bg-white/10 focus:outline-none"
              aria-label="Close pane"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="pane-content h-[calc(100%-2rem)] flex-grow overflow-auto bg-black/60 p-1 text-white">
        {children}
      </div>
      {/* Resize Handles */}
      <div
        {...resizeHandlers.topleft()}
        style={{
          top: resizeHandleOffset,
          left: resizeHandleOffset,
          width: resizeHandleSize,
          height: resizeHandleSize,
          cursor: "nwse-resize",
          touchAction: "none",
        }}
        className={resizeHandleClasses + " resize-handle"}
      />
      <div
        {...resizeHandlers.top()}
        style={{
          top: resizeHandleOffset,
          left: resizeHandleSize,
          right: resizeHandleSize,
          height: resizeHandleSize,
          cursor: "ns-resize",
          touchAction: "none",
        }}
        className={resizeHandleClasses + " resize-handle"}
      />
      <div
        {...resizeHandlers.topright()}
        style={{
          top: resizeHandleOffset,
          right: resizeHandleOffset,
          width: resizeHandleSize,
          height: resizeHandleSize,
          cursor: "nesw-resize",
          touchAction: "none",
        }}
        className={resizeHandleClasses + " resize-handle"}
      />
      <div
        {...resizeHandlers.right()}
        style={{
          top: resizeHandleSize,
          right: resizeHandleOffset,
          bottom: resizeHandleSize,
          width: resizeHandleSize,
          cursor: "ew-resize",
          touchAction: "none",
        }}
        className={resizeHandleClasses + " resize-handle"}
      />
      <div
        {...resizeHandlers.bottomright()}
        style={{
          bottom: resizeHandleOffset,
          right: resizeHandleOffset,
          width: resizeHandleSize,
          height: resizeHandleSize,
          cursor: "nwse-resize",
          touchAction: "none",
        }}
        className={resizeHandleClasses + " resize-handle"}
      />
      <div
        {...resizeHandlers.bottom()}
        style={{
          bottom: resizeHandleOffset,
          left: resizeHandleSize,
          right: resizeHandleSize,
          height: resizeHandleSize,
          cursor: "ns-resize",
          touchAction: "none",
        }}
        className={resizeHandleClasses + " resize-handle"}
      />
      <div
        {...resizeHandlers.bottomleft()}
        style={{
          bottom: resizeHandleOffset,
          left: resizeHandleOffset,
          width: resizeHandleSize,
          height: resizeHandleSize,
          cursor: "nesw-resize",
          touchAction: "none",
        }}
        className={resizeHandleClasses + " resize-handle"}
      />
      <div
        {...resizeHandlers.left()}
        style={{
          top: resizeHandleSize,
          left: resizeHandleOffset,
          bottom: resizeHandleSize,
          width: resizeHandleSize,
          cursor: "ew-resize",
          touchAction: "none",
        }}
        className={resizeHandleClasses + " resize-handle"}
      />
    </div>
  );
};
