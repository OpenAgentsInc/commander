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
  - Added a colored background highlight for the pose display when PINCH_CLOSED is detected
  - Added an animated pulse indicator for the pinch coordinates
  - Used primary color theme for pinch-related UI elements

- Improved the chat window's appearance during pinch interaction in `HomePage.tsx`:
  - Added a colored shadow effect during pinch dragging
  - Fine-tuned the transition effects for smooth interaction experience
  - Made visual feedback more consistent between mouse and pinch interactions

- Fixed a type error in `useHandTracking.ts`:
  - Updated the landmark drawing code to use a more compatible approach
  - Added custom drawing for thumb and index finger tips with different colors
  - Improved visibility of the key landmarks used for pinch detection

- Conducted final type checking to verify the implementation
- Verified that all components properly maintain their states during interaction
- Ensured smooth handoff between different interaction modes

## Final Implementation

The implementation provides a complete and cohesive user interface for moving the chat window using both traditional mouse dragging and hand pinch gestures. The chat window position is persisted across page reloads, providing a seamless user experience.

The hand pose detection system is robust enough to work with various hand sizes and distances from the camera, while the visual feedback gives users clear indication of when the system is recognizing their gestures.

### Key Features

1. **Mouse Dragging:**
   - Familiar cursor-based interaction
   - Smooth transitions during dragging
   - Position persistence with Zustand store

2. **Pinch Gesture Detection:**
   - Accurate pinch recognition with MediaPipe hand tracking
   - Visual feedback for gesture recognition
   - Seamless mid-point calculation between thumb and index finger

3. **UI Element Movement:**
   - Intuitive drag-and-drop for both mouse and pinch gestures
   - Precise position control with smooth transitions
   - Visual differentiation between interaction states

4. **Persistence and State Management:**
   - Positions stored in localStorage via Zustand
   - Clean state management for interaction modes
   - Safety measures for handling page reloads

This implementation provides a solid foundation for further enhancements, such as adding more UI elements that can be positioned, supporting multi-element interactions, or implementing additional gesture controls.