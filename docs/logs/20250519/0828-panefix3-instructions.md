Okay, the lingering dragging issues, especially when starting to drag a non-active pane, usually point to a subtle race condition or state desynchronization between React's rendering cycle and `@use-gesture`'s event handling when the pane's `isActive` status changes. The `touch-action` warning is a separate, simpler fix.

Here are specific instructions to address these:

**1. Refine Drag Logic in `Pane.tsx` for Smoother Interaction and Correct Reference Points**

The core idea is to manually calculate the pane's new position based on the pointer's movement relative to its starting point _at the moment the drag gesture is initiated_, rather than relying solely on `@use-gesture`'s `offset` when rapid state changes (like pane activation) are occurring.

**File: `src/panes/Pane.tsx`**

- **Introduce `dragStartRef`:** This ref will store both the initial pointer coordinates and the pane's coordinates at the true start of the drag.
- **Modify `bindDrag`:**
  - Use `xy: [pointerX, pointerY]` (current pointer screen coordinates) from `@use-gesture`.
  - In the `first` event:
    - Call `bringPaneToFront(id)`. This action should now be solely responsible for making the pane active and bringing it to the front (the store actions were already optimized for this).
    - Capture the current pointer coordinates (`pointerX`, `pointerY`) and the pane's _current local state_ position (`position.x`, `position.y`) into `dragStartRef.current`.
  - During drag (`active` is true):
    - Calculate `deltaX` and `deltaY` from the initial pointer position stored in `dragStartRef.current`.
    - Calculate `newX` and `newY` by adding these deltas to the pane's position _captured at the start of the drag_ (also from `dragStartRef.current`).
    - Apply bounds.
    - Call `setPosition` with the new bounded coordinates for immediate visual feedback.
  - In the `last` event:
    - Call `updatePanePosition` to persist the final position to the store.
    - Clear `dragStartRef.current`.
- **Simplify `handlePaneMouseDown`:** This should now _only_ call `bringPaneToFront(id)`. The `useDrag`'s `first` event will not need to handle activation again. Ensure `onMouseDownCapture` is used for `handlePaneMouseDown` on the main pane `div`.
- **Keep `useEffect` in `useResizeHandlers` as is from the previous fix:** The logic to only sync props to local state if `!isCurrentlyInteracting` is important. The `isCurrentlyInteracting` flag (combination of `isDragging` from main drag and `isResizing` from resize handles) should correctly gate this.

```typescript
// src/panes/Pane.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useDrag, type HandlerParams } from '@use-gesture/react';
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
  isCurrentlyInteracting: boolean,
  setIsResizing: (isResizing: boolean) => void
) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const prevPositionRef = useRef(initialPosition);
  const prevSizeRef = useRef(initialSize);

  useEffect(() => {
    if (!isCurrentlyInteracting) {
      if (initialPosition.x !== prevPositionRef.current.x || initialPosition.y !== prevPositionRef.current.y) {
        if (initialPosition.x !== position.x || initialPosition.y !== position.y) {
            setPosition(initialPosition);
        }
        prevPositionRef.current = initialPosition;
      }
    }
  }, [initialPosition.x, initialPosition.y, isCurrentlyInteracting, position.x, position.y]);

  useEffect(() => {
    if (!isCurrentlyInteracting) {
      if (initialSize.width !== prevSizeRef.current.width || initialSize.height !== prevSizeRef.current.height) {
         if (initialSize.width !== size.width || initialSize.height !== size.height) {
            setSize(initialSize);
         }
        prevSizeRef.current = initialSize;
      }
    }
  }, [initialSize.width, initialSize.height, isCurrentlyInteracting, size.width, size.height]);


  const minWidth = 200;
  const minHeight = 100;
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const makeResizeHandler = (corner: ResizeCorner) => {
    return ({ active, movement: [deltaX, deltaY], first, last, memo }: any) => { // `any` for memo for simplicity here
      setIsResizing(active);
      let currentMemo = memo;

      if (first) {
        currentMemo = { x: position.x, y: position.y, width: size.width, height: size.height };
        resizeStartRef.current = currentMemo;
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
          newX = currentMemo.x;
          newWidth = currentMemo.width;
          break;
        case 'topright':
          newWidth = Math.max(minWidth, currentMemo.width + deltaX);
          newHeight = Math.max(minHeight, currentMemo.height - deltaY);
          newY = currentMemo.y + (currentMemo.height - newHeight);
          newX = currentMemo.x;
          break;
        case 'right':
          newWidth = Math.max(minWidth, currentMemo.width + deltaX);
          newX = currentMemo.x;
          newY = currentMemo.y;
          newHeight = currentMemo.height;
          break;
        case 'bottomright':
          newWidth = Math.max(minWidth, currentMemo.width + deltaX);
          newHeight = Math.max(minHeight, currentMemo.height + deltaY);
          newX = currentMemo.x;
          newY = currentMemo.y;
          break;
        case 'bottom':
          newHeight = Math.max(minHeight, currentMemo.height + deltaY);
          newX = currentMemo.x;
          newY = currentMemo.y;
          newWidth = currentMemo.width;
          break;
        case 'bottomleft':
          newWidth = Math.max(minWidth, currentMemo.width - deltaX);
          newX = currentMemo.x + (currentMemo.width - newWidth);
          newHeight = Math.max(minHeight, currentMemo.height + deltaY);
          newY = currentMemo.y;
          break;
        case 'left':
          newWidth = Math.max(minWidth, currentMemo.width - deltaX);
          newX = currentMemo.x + (currentMemo.width - newWidth);
          newY = currentMemo.y;
          newHeight = currentMemo.height;
          break;
      }

      setPosition({ x: newX, y: newY });
      setSize({ width: newWidth, height: newHeight });

      if (last) {
        updatePanePosition(id, newX, newY);
        updatePaneSize(id, newWidth, newHeight);
        prevPositionRef.current = { x: newX, y: newY };
        prevSizeRef.current = { width: newWidth, height: newHeight };
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
  dismissable = true
}) => {
  const [bounds, setBounds] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const updatePanePosition = usePaneStore(state => state.updatePanePosition);
  const updatePaneSize = usePaneStore(state => state.updatePaneSize);
  const removePane = usePaneStore(state => state.removePane);
  const bringPaneToFront = usePaneStore(state => state.bringPaneToFront);
  // setActivePane is handled by bringPaneToFront now

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

  // Ref for drag start coordinates (pointer and pane)
  const dragStartRef = useRef<{ x: number, y: number, paneX: number, paneY: number } | null>(null);

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
    ({ active, xy: [pointerX, pointerY], first, last, event }) => {
      setIsDragging(active);
      event.stopPropagation();

      if (first) {
        // Activation is now handled by onMouseDownCapture -> handlePaneMouseDown
        // which calls bringPaneToFront.
        // Here, we just record the starting positions for the drag.
        dragStartRef.current = { x: pointerX, y: pointerY, paneX: position.x, paneY: position.y };
      }

      if (active && dragStartRef.current) {
        const deltaX = pointerX - dragStartRef.current.x;
        const deltaY = pointerY - dragStartRef.current.y;

        let newX = dragStartRef.current.paneX + deltaX;
        let newY = dragStartRef.current.paneY + deltaY;

        newX = Math.max(bounds.left, Math.min(newX, bounds.right));
        newY = Math.max(bounds.top, Math.min(newY, bounds.bottom));

        setPosition({ x: newX, y: newY });

        if (last) {
          updatePanePosition(id, newX, newY);
          dragStartRef.current = null;
        }
      } else if (!active && dragStartRef.current) { // Cleanup if drag ends unexpectedly
          dragStartRef.current = null;
      }
    },
    {
      // No `from` needed here as we manually calculate offset.
      // `bounds` in config could restrict pointer events, but we do manual bounds check.
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
    // bringPaneToFront will also handle setting it as active and ensures correct z-index.
    // It's now optimized to avoid unnecessary re-renders if already active and frontmost.
    bringPaneToFront(id);
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
      onMouseDownCapture={handlePaneMouseDown} // Use capture to ensure it fires first
    >
      <div
        {...bindDrag()}
        className="pane-title-bar select-none touch-none bg-black text-white/90 border-b border-border/20 font-bold py-1.5 px-3 cursor-grab active:cursor-grabbing flex justify-between items-center h-8"
        style={{ touchAction: 'none' }}
      >
        <span className="text-xs truncate">{title}</span>
        <div className="flex items-center space-x-1 title-bar-button-container">
          {titleBarButtons}
          {dismissable && (
            <button
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()} // Prevent pane click when closing
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
      {/* Resize Handles with touch-action: none */}
      <div {...resizeHandlers.topleft()} style={{ top: resizeHandleOffset, left: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nwse-resize', touchAction: 'none' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.top()} style={{ top: resizeHandleOffset, left: resizeHandleSize, right: resizeHandleSize, height: resizeHandleSize, cursor: 'ns-resize', touchAction: 'none' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.topright()} style={{ top: resizeHandleOffset, right: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nesw-resize', touchAction: 'none' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.right()} style={{ top: resizeHandleSize, right: resizeHandleOffset, bottom: resizeHandleSize, width: resizeHandleSize, cursor: 'ew-resize', touchAction: 'none' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottomright()} style={{ bottom: resizeHandleOffset, right: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nwse-resize', touchAction: 'none' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottom()} style={{ bottom: resizeHandleOffset, left: resizeHandleSize, right: resizeHandleSize, height: resizeHandleSize, cursor: 'ns-resize', touchAction: 'none' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottomleft()} style={{ bottom: resizeHandleOffset, left: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nesw-resize', touchAction: 'none' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.left()} style={{ top: resizeHandleSize, left: resizeHandleOffset, bottom: resizeHandleSize, width: resizeHandleSize, cursor: 'ew-resize', touchAction: 'none' }} className={resizeHandleClasses + " resize-handle"} />
    </div>
  );
};
```

**2. Review and Confirm Store Actions (`bringPaneToFrontAction`)**

The `bringPaneToFrontAction` from the previous response (`docs/logs/20250519/0758-panefix-log.md`, section "Updated `bringPaneToFrontAction`") is well-optimized to reduce unnecessary object recreations in the `panes` array. This is crucial. Ensure that this optimized version is indeed the one in `src/stores/panes/actions/bringPaneToFront.ts`.

```typescript
// src/stores/panes/actions/bringPaneToFront.ts
// (Ensure this is the optimized version from the previous instructions)
import { PaneStoreType, SetPaneStore } from "../types";

export function bringPaneToFrontAction(
  set: SetPaneStore,
  idToBringToFront: string,
) {
  set((state: PaneStoreType) => {
    const paneIndex = state.panes.findIndex(
      (pane) => pane.id === idToBringToFront,
    );
    if (paneIndex === -1) return state; // Pane not found

    const paneToMove = state.panes[paneIndex];

    const needsActivationChange =
      !paneToMove.isActive || state.activePaneId !== idToBringToFront;
    const needsReordering = paneIndex !== state.panes.length - 1;

    if (!needsActivationChange && !needsReordering) {
      // Check if lastPanePosition actually needs an update
      if (
        state.lastPanePosition?.x !== paneToMove.x ||
        state.lastPanePosition?.y !== paneToMove.y ||
        state.lastPanePosition?.width !== paneToMove.width ||
        state.lastPanePosition?.height !== paneToMove.height
      ) {
        return {
          ...state,
          lastPanePosition: {
            x: paneToMove.x,
            y: paneToMove.y,
            width: paneToMove.width,
            height: paneToMove.height,
          },
        };
      }
      return state; // Absolutely no change needed
    }

    let panesArrayIdentityChanged = false;
    const newPanesArrayWithActivation = state.panes.map((pane) => {
      const shouldBeActive = pane.id === idToBringToFront;
      if (pane.isActive !== shouldBeActive) {
        panesArrayIdentityChanged = true;
        return { ...pane, isActive: shouldBeActive };
      }
      return pane;
    });

    const targetPaneInstanceInNewArray = newPanesArrayWithActivation.find(
      (p) => p.id === idToBringToFront,
    )!;

    // If only activation changed but not order, and it's already the last element (frontmost).
    // This means newPanesArrayWithActivation is the final state for panes array.
    if (
      panesArrayIdentityChanged &&
      !needsReordering &&
      newPanesArrayWithActivation[newPanesArrayWithActivation.length - 1].id ===
        idToBringToFront
    ) {
      return {
        panes: newPanesArrayWithActivation,
        activePaneId: idToBringToFront,
        lastPanePosition: {
          x: targetPaneInstanceInNewArray.x,
          y: targetPaneInstanceInNewArray.y,
          width: targetPaneInstanceInNewArray.width,
          height: targetPaneInstanceInNewArray.height,
        },
      };
    }

    // If reordering is needed (or if activation changed and it wasn't already last):
    const otherPanesInstances = newPanesArrayWithActivation.filter(
      (p) => p.id !== idToBringToFront,
    );
    const finalOrderedPanes = [
      ...otherPanesInstances,
      targetPaneInstanceInNewArray,
    ];

    return {
      panes: finalOrderedPanes,
      activePaneId: idToBringToFront,
      lastPanePosition: {
        x: targetPaneInstanceInNewArray.x,
        y: targetPaneInstanceInNewArray.y,
        width: targetPaneInstanceInNewArray.width,
        height: targetPaneInstanceInNewArray.height,
      },
    };
  });
}
```

**Self-correction:** The logic for `bringPaneToFrontAction` looks mostly good. The check `newPanesArrayWithActivation[newPanesArrayWithActivation.length -1].id === idToBringToFront` for the `if (panesArrayIdentityChanged && !needsReordering ...)` block is redundant because `!needsReordering` already implies it's the last element. It can be simplified slightly but the current version is safe.

**Final check of `useEffect` in `useResizeHandlers`:**
The `isCurrentlyInteracting` flag is passed from the `Pane` component.

- When dragging the pane title bar, `isDragging` in `Pane` becomes true, so `isCurrentlyInteracting` passed to `useResizeHandlers` becomes true.
- When resizing a handle, `setIsResizing(active)` in `makeResizeHandler` sets `isResizing` in `Pane` to true, so `isCurrentlyInteracting` becomes true.

This gating seems correct. The most critical change is the `bindDrag` logic using manual offset calculation based on `xy` and `dragStartRef`.

These changes aim to make the drag initiation more robust by:

- Ensuring pane activation and z-index updates happen on `mousedown` before the drag gesture's internal calculations fully initialize.
- Using `xy` (current pointer position) and a ref (`dragStartRef`) to calculate movement delta, making the drag less susceptible to state changes that might alter the `position` state `useDrag` uses for its `from` or `offset` calculations.
- Minimizing object recreation in store actions to prevent unnecessary re-renders of unrelated panes or unexpected resets of the dragging pane's internal state.
