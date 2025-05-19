Okay, the pane dragging issues (stopping after a small movement when dragging a non-active pane, and choppy movement for active panes) are common when integrating direct manipulation gestures with a state management system and CSS transitions.

Here's a breakdown of the likely causes and specific instructions to fix them:

**Likely Causes:**

1.  **Non-active pane drag stops (~20px issue):**
    *   When a non-active pane is clicked to drag, it becomes active. This state change (`isActive` prop) causes a re-render.
    *   The `useEffect` hooks in `useResizeHandlers` listen to `initialPosition` (derived from props `initialX`, `initialY` coming from the store).
        ```typescript
        // src/panes/Pane.tsx -> useResizeHandlers
        useEffect(() => {
          setPosition(initialPosition);
        }, [initialPosition.x, initialPosition.y]);
        ```
    *   If the pane's `x` or `y` in the store changes *for any reason* immediately after it becomes active (e.g., due to `ensurePaneIsVisible` logic being triggered by the store update, or some other side-effect of `bringPaneToFrontAction`), these `useEffect`s will reset the local `position` state of the `Pane` component to these new prop values.
    *   `useDrag` uses the `from: () => [position.x, position.y]` callback to get its reference point. If this `position` (local state) is reset mid-gesture, the `offset` calculation from `useDrag` becomes inconsistent with the visual position, leading to the drag effectively "jumping" or "stopping" relative to the mouse movement.

2.  **Choppy drag for active pane (lag issue):**
    *   The `Pane` component's root `div` has `transition-all duration-100 ease-out`. This CSS transition applies to `left` and `top` properties.
    *   `@use-gesture/react` updates `left` and `top` directly via inline styles during the drag.
    *   The CSS transition will try to animate these changes, causing a delay or "smoothing" effect that makes the drag feel laggy or choppy instead of being directly tied to the mouse.

**Specific Instructions to Fix:**

**1. Prevent Local State Reset During Interaction & Make Transitions Conditional**

Modify `src/panes/Pane.tsx`:

*   Introduce `isDragging` and `isResizing` local states in the `Pane` component.
*   These states will be controlled by the `active` property provided by `useDrag` for the main drag and each resize handle.
*   Conditionally apply the `transition-all` class only when `isDragging` and `isResizing` are both `false`.
*   Pass an `isInteracting` flag (derived from `isDragging || isResizing`) to `useResizeHandlers`.
*   Modify the `useEffect` hooks within `useResizeHandlers` to only sync `initialPosition` and `initialSize` (props) to local `position` and `size` states if `isInteracting` is `false`. This prevents props from resetting local state while the user is actively manipulating the pane.

**File: `src/panes/Pane.tsx`**

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { useDrag, type HandlerParams } from '@use-gesture/react'; // Updated import for HandlerParams
import { X as IconX } from 'lucide-react';
import { Pane as PaneType } from '@/types/pane';
import { usePaneStore } from "@/stores/pane";

type PaneProps = PaneType & {
  children?: React.ReactNode;
  titleBarButtons?: React.ReactNode;
};

type ResizeCorner = 'topleft' | 'top' | 'topright' | 'right' | 'bottomright' | 'bottom' | 'bottomleft' | 'left';

const useResizeHandlers = (
  id: string,
  initialPosition: { x: number; y: number },
  initialSize: { width: number; height: number },
  updatePanePosition: (id: string, x: number, y: number) => void,
  updatePaneSize: (id: string, width: number, height: number) => void,
  isCurrentlyInteracting: boolean, // Added
  setIsResizing: (isResizing: boolean) => void // Added
) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);

  useEffect(() => {
    if (!isCurrentlyInteracting && (initialPosition.x !== position.x || initialPosition.y !== position.y)) {
      setPosition(initialPosition);
    }
  }, [initialPosition.x, initialPosition.y, isCurrentlyInteracting, position.x, position.y]);

  useEffect(() => {
    if (!isCurrentlyInteracting && (initialSize.width !== size.width || initialSize.height !== size.height)) {
      setSize(initialSize);
    }
  }, [initialSize.width, initialSize.height, isCurrentlyInteracting, size.width, size.height]);

  const minWidth = 200;
  const minHeight = 100;

  // Memo ref for resize start state
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const makeResizeHandler = (corner: ResizeCorner) => {
    // Type for useDrag state: HandlerParams['drag'] (or specific type if known)
    // For simplicity, using 'any' for state, but ideally, type it based on useDrag's state
    return ({ active, movement: [deltaX, deltaY], first, last, memo }: any) => {
      setIsResizing(active);
      let currentMemo = memo;

      if (first) {
        currentMemo = { x: position.x, y: position.y, width: size.width, height: size.height };
      }

      let newX = currentMemo.x;
      let newY = currentMemo.y;
      let newWidth = currentMemo.width;
      let newHeight = currentMemo.height;

      switch (corner) {
        case 'topleft':
          newWidth = Math.max(minWidth, currentMemo.width - deltaX);
          newHeight = Math.max(minHeight, currentMemo.height - deltaY);
          newX = currentMemo.x + (currentMemo.width - newWidth);
          newY = currentMemo.y + (currentMemo.height - newHeight);
          break;
        case 'top':
          newHeight = Math.max(minHeight, currentMemo.height - deltaY);
          newY = currentMemo.y + (currentMemo.height - newHeight);
          newX = currentMemo.x; // Ensure x doesn't change
          newWidth = currentMemo.width; // Ensure width doesn't change
          break;
        case 'topright':
          newWidth = Math.max(minWidth, currentMemo.width + deltaX);
          newHeight = Math.max(minHeight, currentMemo.height - deltaY);
          newY = currentMemo.y + (currentMemo.height - newHeight);
          newX = currentMemo.x; // Ensure x doesn't change
          break;
        case 'right':
          newWidth = Math.max(minWidth, currentMemo.width + deltaX);
          newX = currentMemo.x; // Ensure x doesn't change
          newY = currentMemo.y; // Ensure y doesn't change
          newHeight = currentMemo.height; // Ensure height doesn't change
          break;
        case 'bottomright':
          newWidth = Math.max(minWidth, currentMemo.width + deltaX);
          newHeight = Math.max(minHeight, currentMemo.height + deltaY);
          newX = currentMemo.x; // Ensure x doesn't change
          newY = currentMemo.y; // Ensure y doesn't change
          break;
        case 'bottom':
          newHeight = Math.max(minHeight, currentMemo.height + deltaY);
          newX = currentMemo.x; // Ensure x doesn't change
          newY = currentMemo.y; // Ensure y doesn't change
          newWidth = currentMemo.width; // Ensure width doesn't change
          break;
        case 'bottomleft':
          newWidth = Math.max(minWidth, currentMemo.width - deltaX);
          newX = currentMemo.x + (currentMemo.width - newWidth);
          newHeight = Math.max(minHeight, currentMemo.height + deltaY);
          newY = currentMemo.y; // Ensure y doesn't change
          break;
        case 'left':
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
      }
      return currentMemo;
    };
  };

  const resizeHandlers = {
    topleft: useDrag(makeResizeHandler('topleft')),
    top: useDrag(makeResizeHandler('top')),
    topright: useDrag(makeResizeHandler('topright')),
    right: useDrag(makeResizeHandler('right')),
    bottomright: useDrag(makeResizeHandler('bottomright')),
    bottom: useDrag(makeResizeHandler('bottom')),
    bottomleft: useDrag(makeResizeHandler('bottomleft')),
    left: useDrag(makeResizeHandler('left')),
  };

  return { position, size, setPosition, resizeHandlers }; // Removed setSize from return if not used externally
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
  dismissable = true
}) => {
  const [bounds, setBounds] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const updatePanePosition = usePaneStore(state => state.updatePanePosition);
  const updatePaneSize = usePaneStore(state => state.updatePaneSize);
  const removePane = usePaneStore(state => state.removePane);
  const bringPaneToFront = usePaneStore(state => state.bringPaneToFront);
  const setActivePane = usePaneStore(state => state.setActivePane);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const isInteracting = isDragging || isResizing;


  const { position, size, setPosition, resizeHandlers } = useResizeHandlers(
    id,
    { x: initialX, y: initialY },
    { width: initialWidth, height: initialHeight },
    updatePanePosition,
    updatePaneSize,
    isInteracting,
    setIsResizing
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
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [size.width, size.height]);

  const bindDrag = useDrag(
    ({ active, offset: [ox, oy], first, last, event }) => {
      setIsDragging(active);
      event.stopPropagation();
      if (first) {
        bringPaneToFront(id);
        setActivePane(id);
      }
      const newX = Math.max(bounds.left, Math.min(ox, bounds.right));
      const newY = Math.max(bounds.top, Math.min(oy, bounds.bottom));

      setPosition({ x: newX, y: newY }); // Update local state for immediate feedback

      if (last) {
        updatePanePosition(id, newX, newY); // Update store on drag end
      }
    },
    {
      from: () => [position.x, position.y], // Use local state for 'from'
      bounds: bounds,
    }
  );

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    removePane(id);
  };

  const handlePaneMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle') || target.closest('.title-bar-button-container')) {
        return;
    }
    if (!isActive) { // Only bring to front if not already active, to avoid issues with `from`
        bringPaneToFront(id);
    }
    setActivePane(id); // Always set active on click
  };

  const resizeHandleClasses = "absolute bg-transparent pointer-events-auto";
  const resizeHandleSize = '8px';
  const resizeHandleOffset = '-4px';

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: isActive ? 50 : 49,
      }}
      className={`pane-container pointer-events-auto flex flex-col bg-black/90 border rounded-lg overflow-hidden shadow-lg ${isActive ? 'border-primary ring-1 ring-primary' : 'border-border/20'} ${!isInteracting ? 'transition-all duration-100 ease-out' : ''}`}
      onMouseDownCapture={handlePaneMouseDown}
    >
      <div
        {...bindDrag()}
        className="pane-title-bar select-none touch-none bg-black text-white/90 border-b border-border/20 font-bold py-1.5 px-3 cursor-grab active:cursor-grabbing flex justify-between items-center h-8"
      >
        <span className="text-xs truncate">{title}</span>
        <div className="flex items-center space-x-1 title-bar-button-container">
          {titleBarButtons}
          {dismissable && (
            <button
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="ml-1 p-0.5 text-white/70 hover:text-destructive focus:outline-none rounded hover:bg-white/10"
              aria-label="Close pane"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="pane-content flex-grow text-white h-[calc(100%-2rem)] overflow-auto p-1">
        {children}
      </div>
      {/* Resize Handles */}
      <div {...resizeHandlers.topleft()} style={{ top: resizeHandleOffset, left: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nwse-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.top()} style={{ top: resizeHandleOffset, left: resizeHandleSize, right: resizeHandleSize, height: resizeHandleSize, cursor: 'ns-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.topright()} style={{ top: resizeHandleOffset, right: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nesw-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.right()} style={{ top: resizeHandleSize, right: resizeHandleOffset, bottom: resizeHandleSize, width: resizeHandleSize, cursor: 'ew-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottomright()} style={{ bottom: resizeHandleOffset, right: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nwse-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottom()} style={{ bottom: resizeHandleOffset, left: resizeHandleSize, right: resizeHandleSize, height: resizeHandleSize, cursor: 'ns-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottomleft()} style={{ bottom: resizeHandleOffset, left: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nesw-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.left()} style={{ top: resizeHandleSize, left: resizeHandleOffset, bottom: resizeHandleSize, width: resizeHandleSize, cursor: 'ew-resize' }} className={resizeHandleClasses + " resize-handle"} />
    </div>
  );
};
```

**Key changes in `src/panes/Pane.tsx`:**

1.  **`isDragging`, `isResizing`, `isInteracting` states:** Added to the `Pane` component. `isDragging` is set by the main drag handler, `isResizing` is set via a callback passed to `useResizeHandlers`.
2.  **Conditional Transitions:** The `className` for the main `div` now includes `${!isInteracting ? 'transition-all duration-100 ease-out' : ''}`. This removes CSS transitions during drag/resize.
3.  **`useResizeHandlers` Modification:**
    *   Takes `isCurrentlyInteracting` and `setIsResizing` as new arguments.
    *   The `useEffect` hooks that sync `initialPosition` and `initialSize` props to local `position` and `size` states are now conditional: `if (!isCurrentlyInteracting && ...)`. This is crucial to prevent the local `position` (used by `useDrag`'s `from` function) from being reset by prop changes while a gesture is active.
    *   The `makeResizeHandler` function now uses `memo` properly. `memo` is initialized on `first` and returned by the handler to be passed to the next event. This ensures that `deltaX` and `deltaY` are always relative to the drag start of that specific resize action.
    *   Corrected the logic within `makeResizeHandler` for each corner to ensure only relevant properties (`newX`, `newY`, `newWidth`, `newHeight`) are updated for that specific resize type. For example, resizing from `top` should only change `newY` and `newHeight`.

With these changes, the dragging behavior should be much smoother and the issue with non-active panes stopping should be resolved. The core idea is to ensure the local `position` state used by `useDrag` as its `from` reference is stable during an interaction, and that CSS transitions don't interfere with direct style manipulation.
