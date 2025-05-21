# Double Pinch Tracking Fix - 1542 Log

## Problem Analysis

- Currently, the hand tracking system only records and reports pose/pinch information for a single hand
- This prevents detecting multiple pinch gestures simultaneously (such as pinching with both hands)
- The issue is in `useHandTracking.ts` which prioritizes a single hand (either first detected or the "Right" hand)

## Implementation Plan

1. Define a new interface to track complete hand information
2. Update state variables to store information for multiple hands
3. Refactor the detection logic to process each detected hand independently
4. Modify the hook's return value to expose the multi-hand data

## Implementation Details

### 1. Created TrackedHandInfo Interface

Added a new interface to store complete information for each detected hand:

```typescript
interface TrackedHandInfo {
  landmarks: HandLandmarks; // from @mediapipe/hands
  pose: HandPose; // from ./handPoseTypes
  pinchMidpoint: PinchCoordinates | null; // from ./handPoseTypes
  handedness: string; // e.g., "Left" or "Right"
}
```

### 2. Updated State Variables

Replaced the single-hand state variables with a tracked hands array:

```typescript
// Before
const [activeHandPose, setActiveHandPose] = useState<HandPose>(HandPose.NONE);
const [pinchMidpoint, setPinchMidpoint] = useState<PinchCoordinates | null>(
  null,
);

// After
const [trackedHands, setTrackedHands] = useState<TrackedHandInfo[]>([]);
```

### 3. Refactored Hand Detection Logic

- Removed `rightHandLandmarks` variable and special handling for "right" hand
- Created an array `currentFrameTrackedHands` to store all hands detected in the current frame
- For each detected hand:
  - Calculate its pose using `recognizeHandPose`
  - If in pinch pose, calculate pinch midpoint
  - Store all data in the trackedHands array
  - Modified console logging to show which hand (index and handedness) is pinching

### 4. Drawing Modifications

- Moved the pinch visualization (circle + coordinates label) into the main hand processing loop
- Each detected hand that's in a pinch pose gets its own visualization

### 5. State Updates

- Updated all state clearing code to use `setTrackedHands([])` instead of individual state setters
- At the end of processing, update state with all tracked hands from the current frame:

```typescript
setTrackedHands(currentFrameTrackedHands);
```

### 6. Updated Return Value

Modified the hook's return value to expose the tracked hands array:

```typescript
return {
  videoRef,
  landmarkCanvasRef,
  handPosition,
  handTrackingStatus,
  trackedHands, // Replaced activeHandPose and pinchMidpoint
};
```

## Additional Changes Requested

### 1. Decreased Pinch Threshold

Decreased the pinch threshold from 0.15 to 0.08 to require fingers to be closer together for a pinch to be detected:

```typescript
// In handPoseRecognition.ts
const pinchThreshold = 0.08; // Decreased from 0.15 to require fingers to be closer together
```

### 2. Reduced Font Size in Canvas Overlay

Decreased the font size of the "Pinch: x, y" text in the scene from 12px to 9px:

```typescript
// In useHandTracking.ts
ctx.font = "bold 9px Berkeley Mono"; // Reduced from 12px
```

### 3. Fixed Z-Index Layering Issue

Rearranged the drawing order so pinch visualization (circles and text) appears on top of joint indicators:

1. Extended the PinchCoordinates interface to store normalized coordinates:

```typescript
export interface PinchCoordinates {
  x: number;
  y: number;
  z?: number; // Optional depth
  normalizedMidX?: number; // Added for canvas drawing
  normalizedMidY?: number; // Added for canvas drawing
}
```

2. Modified the pinch detection logic to store normalized coordinates but delay drawing:

```typescript
// Store normalized coordinates for later drawing
currentPinchMidpoint.normalizedMidX = normalizedMidX;
currentPinchMidpoint.normalizedMidY = normalizedMidY;
```

3. Added a separate drawing phase after all hand landmarks are drawn:

```typescript
// Now draw all pinch visualizations AFTER all hand landmarks have been drawn
// This ensures pinch circles and text appear on top of joint indicators
currentFrameTrackedHands.forEach((hand) => {
  if (hand.pinchMidpoint && hand.pinchMidpoint.normalizedMidX !== undefined) {
    // Draw pinch circle and text here
    // ...
  }
});
```

## Expected Results

- The hook now tracks and reports information for all detected hands (up to 2 hands)
- Each hand's pose and pinch information is independently tracked and available
- Pinch detection now requires thumb and index finger to be closer together (more precise)
- The overlay text showing pinch coordinates is smaller and less obtrusive
- Pinch circles and coordinate text now appear on top of all other hand landmarks
- Components using this hook will need to be updated to work with the trackedHands array

## Next Steps (Not Implemented)

Components that use this hook need to be updated to work with multiple hands:

- `HandTracking.tsx` needs to display information for all tracked hands
- `PinnableChatWindow.tsx` needs to decide how to handle multiple pinches (e.g., which pinch takes precedence)
