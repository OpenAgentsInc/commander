# Pane System Fix - Part 4

## Issue Analysis

After implementing the previous three rounds of fixes, the pane dragging issue is still causing problems. The specific issues appear to be related to unnecessary re-rendering cycles during drag operations, particularly in the way the `useEffect` hooks are constructed in `useResizeHandlers`.

The core problem identified in this round is that the dependency arrays of these `useEffect` hooks include the local state variables (`position` and `size`), which causes them to re-run when these values change during a drag operation. This can lead to competing state updates and interfere with the smooth execution of the drag gesture.

Another issue is that the position for the drag operation was being captured *after* the `bringPaneToFront` call, which could lead to using post-activation state values instead of the pre-activation ones.

## Implementation Plan

1. Refine the `useEffect` hooks in `useResizeHandlers` to reduce unnecessary re-runs
2. Remove local state dependencies from the dependency arrays
3. Ensure the position capture in `handlePaneMouseDown` happens before `bringPaneToFront` is called
4. Adjust the drag initialization logic for more reliability

## Changes

### 1. Refined `useEffect` Hooks in `useResizeHandlers`

Modified the `useEffect` hooks by:
1. Removing local state variables (`position`, `size`) from dependency arrays
2. Restructuring the conditional logic to be more explicit
3. Always updating the ref values when not interacting to ensure sync with store

```typescript
// Position useEffect
useEffect(() => {
  if (!isCurrentlyInteracting) {
    // Only update if initialPosition has actually changed from what we already know
    // AND if local position is different from initialPosition
    if ((initialPosition.x !== prevPositionRef.current.x ||
         initialPosition.y !== prevPositionRef.current.y) &&
        (initialPosition.x !== position.x || initialPosition.y !== position.y)) {
      setPosition(initialPosition);
    }
    // Always update prevPositionRef if not interacting, to sync with store if it changed
    prevPositionRef.current = initialPosition;
  }
}, [initialPosition.x, initialPosition.y, isCurrentlyInteracting]); // Removed position.x, position.y

// Size useEffect
useEffect(() => {
  if (!isCurrentlyInteracting) {
    // Only update if initialSize has actually changed from what we already know
    // AND if local size is different from initialSize
    if ((initialSize.width !== prevSizeRef.current.width || 
         initialSize.height !== prevSizeRef.current.height) &&
        (initialSize.width !== size.width || initialSize.height !== size.height)) {
      setSize(initialSize);
    }
    // Always update prevSizeRef if not interacting, to sync with store if it changed
    prevSizeRef.current = initialSize;
  }
}, [initialSize.width, initialSize.height, isCurrentlyInteracting]); // Removed size.width, size.height
```

These changes ensure that the effects are not triggered by local state changes during drag operations, which helps maintain the stability of the drag gesture.

### 2. Improved Position Capture in `handlePaneMouseDown`

Modified `handlePaneMouseDown` to store the pane's position in the `dragStartRef` *before* calling `bringPaneToFront`:

```typescript
const handlePaneMouseDown = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('resize-handle') || target.closest('.title-bar-button-container')) {
      return;
  }
  // Capture pane position *before* store update
  dragStartRef.current = {
    x: 0, // Pointer X will be set by useDrag
    y: 0, // Pointer Y will be set by useDrag
    paneX: position.x,
    paneY: position.y
  };
  // bringPaneToFront will also handle setting it as active and ensures correct z-index.
  bringPaneToFront(id);
};
```

This change ensures that we capture the position from the pre-activation state, which is crucial for a smooth transition when activating panes during drag start.

### 3. Enhanced Drag Initialization Logic

Updated the `bindDrag` implementation to work with the pre-captured position:

```typescript
const bindDrag = useDrag(
  ({ active, xy: [pointerX, pointerY], first, last, event }) => {
    setIsDragging(active);
    event.stopPropagation();

    if (first) {
      // dragStartRef.current.paneX/Y should already be set by handlePaneMouseDown
      // Only update pointer coordinates here
      if (dragStartRef.current) { // Should always be true if mousedown happened on title bar
        dragStartRef.current.x = pointerX;
        dragStartRef.current.y = pointerY;
      } else {
        // Fallback if mousedown didn't set it (e.g., touch event directly triggering useDrag)
        dragStartRef.current = {
          x: pointerX,
          y: pointerY,
          paneX: position.x, // Current local position
          paneY: position.y
        };
      }
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
    } else if (!active && dragStartRef.current) { 
      // Cleanup if drag ends unexpectedly
      dragStartRef.current = null;
    }
  },
  {
    filterTaps: true,
  }
);
```

Key changes:
1. Split the responsibilities between `handlePaneMouseDown` and `bindDrag.first`
2. Added a fallback in case `dragStartRef` isn't set by `handlePaneMouseDown`
3. Added `filterTaps: true` option to better distinguish between taps and drags

## Result

These changes address the key issues identified in the drag operation:

1. The removal of local state variables from the `useEffect` dependencies prevents unnecessary re-renders that could interfere with the drag operation
2. Capturing position *before* `bringPaneToFront` ensures we have the correct reference point before any activation-related state changes occur
3. The improved coordination between `handlePaneMouseDown` and `bindDrag` provides a more reliable drag initialization process
4. The addition of `filterTaps: true` helps distinguish between tap and drag gestures

Together, these changes should result in smoother, more reliable drag operations, particularly when starting to drag a non-active pane.