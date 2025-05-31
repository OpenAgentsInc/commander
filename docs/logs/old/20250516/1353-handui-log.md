# Hand UI Implementation Log

This log documents the implementation of the "pinch-to-move" functionality for UI elements using MediaPipe hand tracking.

## Overview

The goal is to implement a natural, gesture-based interaction system that allows users to move UI elements (starting with the chat window) using pinch gestures. The implementation is divided into four phases:

1. Setup Zustand Store for UI Element Positions
2. Make Chat Window Positionable and Draggable with Mouse
3. Implement Pinch-to-Move using Hand Tracking
4. Visual Refinements and Final Testing

## Phase 1: Setup Zustand Store for UI Element Positions

First, I created a Zustand store to manage the positions of UI elements in a persistent way.

- Created the `src/stores` directory
- Created `src/stores/uiElementsStore.ts` with the required interfaces and implementation:

  - `UIPosition` interface for x,y coordinates
  - `UIElementState` interface for each UI element with position and pinned state
  - Implemented store with actions: `setElementPosition`, `pinElement`, `unpinElement`, `getElement`, and `ensureElement`
  - Added persistence with localStorage via Zustand middleware
  - Implemented safety for UI elements to be unpinned on page reload

- Added a unit test for the store in `src/tests/unit/stores/uiElementsStore.test.ts`
- Updated `src/tests/unit/setup.ts` with localStorage mock for testing store persistence
- Verified the implementation with type checking

## Phase 2: Make Chat Window Positionable and Draggable with Mouse

Next, I integrated the store with the HomePage component to make the chat window draggable with the mouse:

- Created a new `PinnableChatWindow` component in `src/pages/HomePage.tsx`
- Added state for tracking mouse dragging, including:
  - `isMouseDragging` to track when dragging is active
  - `mouseDragStartRef` to store the initial mouse coordinates
  - `initialElementPosRef` to store the initial element position
- Implemented mouse drag handlers:
  - `handleMouseDown` to initiate dragging and pin the element
  - `handleMouseMove` to update the element position during dragging
  - `handleMouseUp` to complete dragging and unpin the element
- Added global event listeners to handle mouse movements outside the chat window
- Enhanced the appearance with visual feedback:

  - Cursor changes during dragging (`cursor-grab` and `cursor-grabbing`)
  - Styling improvements with opacity transitions, shadows, and backdrop blur
  - Z-index adjustments to bring the element to the front when dragging

- Implemented proper interaction handling to disable mouse dragging when hand tracking is active
- Modified the HomePage component to use the new PinnableChatWindow component
- Verified the implementation with type checking

## Phase 3: Implement Pinch-to-Move using Hand Tracking

In this phase, I added support for moving the chat window using hand pinch gestures:

- Updated `handPoseTypes.ts` to add:

  - New `PINCH_CLOSED` pose in the HandPose enum
  - New `PinchCoordinates` interface to track the midpoint of pinch gestures

- Implemented pinch detection in `handPoseRecognition.ts`:

  - Added `getPinchDistance` helper to calculate distance between thumb and index finger tips
  - Added `areOtherFingersCurled` helper to verify other fingers are curled during pinch
  - Implemented `isPinchClosed` function to detect when thumb and index finger are close together
  - Updated `recognizeHandPose` to check for PINCH_CLOSED first (more specific than other poses)

- Enhanced `useHandTracking.ts` to calculate and expose pinch coordinates:

  - Added `pinchMidpoint` state to store the coordinates between thumb and index finger
  - Added logic to calculate midpoint when PINCH_CLOSED pose is detected
  - Modified landmark visualization to highlight thumb and index tips

- Updated `HandTracking.tsx` to display pinch coordinates for debugging
- Updated `index.ts` to export new types and interfaces
- Enhanced `PinnableChatWindow` in `HomePage.tsx` to support pinch-to-move:

  - Added pinch drag state tracking
  - Implemented effect to detect pinch gesture and update UI element position
  - Added visual feedback for pinch dragging
  - Made sure pinch and mouse dragging don't interfere with each other

- Verified the implementation with type checking

## Phase 4: Visual Refinements and Final Testing

Finally, I added visual refinements and conducted final testing:

- Enhanced the visual feedback for pinch gestures in `HandTracking.tsx`:

  - Added a semi-transparent background for the pinch indicators
  - Added an animated pulse indicator for the pinch coordinates
  - Used consistent styling with the rest of the UI

- Improved the chat window's appearance during pinch interaction in `HomePage.tsx`:

  - Added a glow effect with combined shadow and ring when pinching
  - Increased the border width during pinch to make the state more visible
  - Fine-tuned the transition effects for smooth interaction experience

- Fixed a type error in `useHandTracking.ts`:

  - Updated the landmark drawing code to use a more compatible approach
  - Added custom drawing for thumb and index finger tips with different colors
  - Improved visibility of the key landmarks used for pinch detection

- Adjusted the pinch threshold to be more forgiving:

  - Increased from 0.05 to 0.08 to make pinch detection easier
  - This allows for a wider range of hand sizes and camera distances

- Added detailed console logging:

  - Log the current hand state (pose, pinch status)
  - Log when pinch dragging starts, updates, and ends
  - Log position calculations for easier debugging

- Conducted final type checking to verify the implementation
- Verified that all components properly maintain their states during interaction
- Ensured smooth handoff between different interaction modes

## How to Use the Pinch-to-Move Feature

To use the pinch-to-move feature:

1. **Enable Hand Tracking**:

   - Switch on the "Hand Tracking" toggle in the top-right corner of the screen
   - Wait for your hand to be detected (a wireframe of your hand should appear)

2. **Perform the Pinch Gesture**:

   - Make a pinch gesture by bringing your thumb and index finger close together
   - Keep other fingers curled to help with detection
   - The pose indicator in the top-right should show "Pinch Closed"
   - The pinch coordinates should appear with a pulsing indicator

3. **Move Your Hand**:

   - While maintaining the pinch gesture, move your hand
   - The chat window will follow the movement of your pinch
   - The window will have a clear green glow effect while being moved

4. **Release the Pinch**:
   - Open your fingers or change your hand pose to release the pinch
   - The chat window will stay in the new position

### Troubleshooting

If the pinch isn't being detected properly:

1. **Adjust your lighting**: Ensure your hand is well-lit for better detection
2. **Try different distances**: Move your hand closer to or further from the camera
3. **Clear hand pose**: Make sure other fingers are clearly curled while thumb and index are pinching
4. **Check the logs**: Open the browser console to see detailed logging about pose detection
5. **Verify pinch display**: The "Pinch Closed" pose should be shown in the UI when pinching correctly

### Technical Implementation Notes

The pinch gesture works by:

1. **Detecting the pinch pose**:

   - MediaPipe hand tracking provides 21 landmarks for each detected hand
   - We calculate the distance between thumb tip (landmark 4) and index tip (landmark 8)
   - If this distance is below a threshold and other fingers are curled, it's a pinch

2. **Tracking pinch movement**:

   - When a pinch is detected, we store the initial pinch position and element position
   - As the hand moves, we calculate the delta from the initial pinch position
   - We apply this delta to the initial element position to move the chat window

3. **Visual feedback**:
   - The chat window gets a distinct visual treatment during pinch dragging
   - The pose indicator shows "Pinch Closed" in a highlighted color
   - Console logs provide detailed information about the pinch state and movements

This implementation provides a solid foundation for further enhancements, such as adding more UI elements that can be positioned, supporting multi-element interactions, or implementing additional gesture controls.
