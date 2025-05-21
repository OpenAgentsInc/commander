# Hand Tracking Fixes - Phase 2 - 2025-05-16 14:50

## Overview

This log tracks continued work on fixing hand tracking and pinch-to-move issues:

1. Fixing the mirrored coordinate text on the canvas
2. Improving pinch detection with better debug logging
3. Restoring the original ThreeScene component
4. Testing and fixing the pinch-to-move functionality

## Implemented Fixes

### 1. Fixed Mirrored Coordinate Text on Hand Tracking Canvas

- Problem: The text displaying pinch coordinates was mirrored due to the CSS transform applied to the canvas
- Solution:
  - Implemented a proper approach to drawing unmirrored text on a mirrored canvas:
    - Save the canvas context state
    - Apply a horizontal flip to the context using `ctx.scale(-1, 1)`
    - Calculate correct text position accounting for the flipped context
    - Draw text with appropriate alignment
    - Restore the context state afterward
  - Ensured screen pixel coordinates are consistently used for pinchMidpoint state
  - Fixed redundant setPinchMidpoint calls and added proper nullification when not in pinch pose

### 2. Enhanced Debug Logging for Pinch Detection

- Problem: The pinch detection wasn't triggering reliably
- Solution:
  - Added comprehensive logging in isPinchClosed to show:
    - Exact coordinates of thumb tip and index finger tip
    - Pinch distance and threshold
    - Status of other conditions (otherFingersCurled, thumbExtended, indexExtended)
    - Final result computation
  - Increased pinchThreshold from 0.08 to 0.15 to make pinch detection more forgiving
  - Temporarily simplified the pinch detection to only check distance between fingers

### 3. Restored Original ThreeScene Component

- Reverted the ThreeScene component to its original implementation with:
  - Physics system
  - RigidBody objects
  - Environment for reflections
  - Dynamic lighting
  - Hand and mouse pointer interaction

### 4. Debugging Pinch-to-Move Functionality

- Added verification logging in PinnableChatWindow to confirm it receives correct screen pixel coordinates
- Added detailed coordinate intersection testing between pinch position and window bounds
- Temporarily disabled the isPinchOverWindow check to allow pinch dragging from anywhere
- This will help isolate whether the issue is with pinch detection or with the window intersection test

## Fixed Green Label Position and Orientation

- **Problem**: The green "Pinch: x, y" label in the scene had two issues:

  1. The text was appearing on the wrong side of the pinch point (to the right instead of left)
  2. The text was sometimes appearing mirrored/backwards

- **Solution**: Completely redid the canvas text drawing with careful attention to both orientation and position:

  ```typescript
  // 2. Draw the coordinate text with CORRECT orientation
  const coordText = `Pinch: ${Math.round(screenPinchX)}, ${Math.round(screenPinchY)} px`;

  // We need to:
  // 1. Draw text in correct orientation (not mirrored)
  // 2. Position it to the left of the pinch point (not right)

  ctx.save(); // Save context state
  ctx.scale(-1, 1); // Flip context to counter the CSS transform scale-x[-1]

  // In flipped canvas context, right = left and vice versa
  // So to put text on LEFT of pinch, calculate position to RIGHT of midpoint
  // But in the flipped context, X coordinates are negative
  const canvasDrawXFlipped = -(canvasWidth - canvasDrawX); // Convert to flipped coordinates
  const textOffset = 20; // Distance from pinch point
  const textX = canvasDrawXFlipped + textOffset; // RIGHT of pinch in flipped context = LEFT in visual space
  const textY = canvasDrawY;
  ```

- **Key Changes**:

  1. **Fixed text orientation**: Used `ctx.scale(-1, 1)` to properly flip the canvas drawing context, ensuring text renders in correct reading orientation
  2. **Fixed position relative to pinch**: Carefully calculated the position in the flipped coordinate system
     - Converted canvas X to flipped coordinates: `-(canvasWidth - canvasDrawX)`
     - Added positive offset (`+ textOffset`) which in flipped context positions text to visual left
  3. **Protected transformation with save/restore**: Used proper context state management to isolate the transformation

- **Result**: The green text label now appears:
  - To the left of the pinch point (not right)
  - In correct reading orientation (not mirrored)
  - With consistent positioning relative to the pinch point

## Summary

The primary issues were:

1. **Coordinates and Text Display**:

   - Fixed the coordinate text display by properly handling the mirrored canvas context
   - Corrected X coordinate mirroring by flipping normalized X values when converting to screen coordinates
   - Ensured pinchMidpoint always stores screen pixel coordinates, not normalized values
   - Added clear nullification of pinchMidpoint when not in pinch pose

2. **Pinch Detection**:

   - Added comprehensive logging to debug why pinch detection wasn't triggering
   - Increased pinchThreshold from 0.08 to 0.15 to accommodate typical pinch distances
   - Temporarily simplified detection to isolate the distance-based check

3. **Component Restoration**:

   - Restored the original ThreeScene component to ensure proper functionality
   - Kept the complex physics and interaction elements which are important for the user experience

4. **UI Feedback and Debugging**:
   - Enhanced debug logging throughout the pinch interaction lifecycle
   - Temporarily disabled the window boundary check to isolate movement mechanics
   - Added detailed coordinate intersection testing to identify boundary check issues

## Next Steps for Further Testing

1. Run the application and check if pinch detection works with the new threshold (0.15)
2. Monitor logs to see if screen pixel coordinates are received correctly by PinnableChatWindow
3. Test if window dragging works when bypassing the pinch-over-window check
4. If movement works but intersection test fails, verify coordinate systems of pinchMidpoint and window bounds
5. If WebGL context issues persist despite the above fixes, consider the following:
   - Incrementally disable elements of ThreeScene in this order:
     - The 16 RigidBody objects
     - The DynamicPointer and MousePointer
     - The Physics system
     - The Environment component
     - The enhanced lighting

The most critical fixes are the pinch detection threshold and ensuring coordinates are consistently handled as screen pixels throughout the application.
