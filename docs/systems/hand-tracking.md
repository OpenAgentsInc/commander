# Hand Tracking System

**Version:** 1.0
**Last Updated:** 2025-05-27
**System Lead:** ui-interaction-team@openagentsinc.com

## Table of Contents
1.  [Overview](#1-overview)
2.  [System Architecture](#2-system-architecture)
    2.1. [Core Components](#21-core-components)
    2.2. [Data Flow Diagram](#22-data-flow-diagram)
3.  [Core Technologies & Algorithms](#3-core-technologies--algorithms)
4.  [Input & Configuration](#4-input--configuration)
    4.1. [Primary Input](#41-primary-input)
    4.2. [System Configuration](#42-system-configuration)
5.  [Processing Pipeline Details](#5-processing-pipeline-details)
    5.1. [Initialization (`useHandTracking` hook)](#51-initialization-usehandtracking-hook)
    5.2. [Frame Processing (`onResults` callback)](#52-frame-processing-onresults-callback)
    5.3. [Pose Recognition (`handPoseRecognition.ts`)](#53-pose-recognition-handposerecognitionts)
    5.4. [Pinch Detection & Midpoint Calculation](#54-pinch-detection--midpoint-calculation)
    5.5. [Data Aggregation & Output](#55-data-aggregation--output)
6.  [Output Data Structure](#6-output-data-structure)
7.  [UI Integration & Interaction](#7-ui-integration--interaction)
    7.1. [System Activation (Hotbar & Keyboard)](#71-system-activation-hotbar--keyboard)
    7.2. [Pane Dragging (`HomePage.tsx`)](#72-pane-dragging-homepagetsx)
    7.3. [3D Scene Interaction (Conceptual)](#73-3d-scene-interaction-conceptual)
    7.4. [Visual Feedback (Canvas Overlay)](#74-visual-feedback-canvas-overlay)
8.  [Performance Considerations](#8-performance-considerations)
9.  [Limitations & Known Issues](#9-limitations--known-issues)
10. [Troubleshooting](#10-troubleshooting)
11. [Future Work & Roadmap](#11-future-work--roadmap)
12. [Key File References](#12-key-file-references)

## 1. Overview

The Hand Tracking System (HTS) in OpenAgents Commander provides a Natural User Interface (NUI) capability, allowing users to interact with the application using hand gestures and movements. It leverages real-time computer vision via Google's MediaPipe Hands solution to detect and track hands from a webcam feed. The system processes this raw data to identify hand landmarks, recognize a predefined set of static hand poses, and detect specific gestures like pinching.

Currently, the primary application of the HTS is to enable users to:
-   **Drag draggable UI panes:** Using a "pinch and drag" gesture.
-   **(Conceptual/Demo) Control 3D scene elements:** Such as camera position or object rotation based on hand position or pose.

The HTS is designed to be toggled on/off by the user and aims to provide an intuitive and immersive alternative or complement to traditional mouse/keyboard input. Its availability is controlled by the `Feature.HAND_TRACKING` feature flag.

## 2. System Architecture

The HTS is primarily implemented within the Electron renderer process, utilizing client-side JavaScript and WebAssembly (via MediaPipe).

### 2.1. Core Components

1.  **Camera Input:** A hidden `<video>` HTML element captures the webcam feed.
    -   Managed by `useHandTracking` hook (`src/components/hands/useHandTracking.ts`).
2.  **MediaPipe Hands Integration:**
    -   Uses `@mediapipe/hands` library for hand detection and landmark extraction.
    -   The `Hands` object from MediaPipe processes video frames and outputs hand landmarks and handedness.
3.  **Landmark & Pose Processing (`useHandTracking` hook & `handPoseRecognition.ts`):**
    -   **`useHandTracking.ts`:** The central React hook that initializes MediaPipe, manages the camera feed, and processes results.
    -   **`handPoseRecognition.ts`:** Contains logic to analyze the 21 3D landmarks per hand to classify static hand poses (e.g., `FIST`, `OPEN_HAND`, `PINCH_CLOSED`).
4.  **Gesture Data Aggregation (`TrackedHandInfo` in `useHandTracking.ts`):**
    -   Consolidates per-hand data: landmarks, recognized pose, handedness, and calculated pinch midpoint coordinates.
5.  **UI Feedback (`HandTracking.tsx` & Canvas Overlay):**
    -   An overlay `<canvas>` element, managed by `HandTracking.tsx`, draws detected hand landmarks and connections for visual feedback when the system is active.
6.  **Interaction Logic (`HomePage.tsx`):**
    -   Consumes the output from `useHandTracking` (via `HandTracking.tsx`'s callback).
    -   Implements specific UI interactions, primarily pinch-to-drag for panes.
7.  **3D Scene Interaction (Conceptual/Demo - `DynamicPointer.tsx`, `MainSceneContent.tsx`):**
    -   Demonstrates how hand position or pose data can be used to control elements within a React Three Fiber (R3F) scene.

### 2.2. Data Flow Diagram

```
+-------------------+     +-------------------------+     +----------------------------+
| Webcam Input      | --> | <video> Element         | --> | @mediapipe/camera_utils  |
| (User's Camera)   |     | (in HandTracking.tsx)   |     | (Frame Acquisition)        |
+-------------------+     +-------------------------+     +-------------+--------------+
                                                                        |
                                                                        | Video Frames
                                                                        v
+--------------------------------+     +----------------------------+     +-------------------------+
| UI Interaction Logic           | <-- | HandDataContext            | <-- | useHandTracking Hook    |
| (e.g., HomePage.tsx for pane |     | (Pose, Pinch, Landmarks)   |     | (Processes MediaPipe    |
|  dragging)                     |     +----------------------------+     |  Results, Pose Reco.)   |
+--------------------------------+                                        +------------+------------+
                                                                                       |
                                                                                       | MediaPipe HandResults
                                                                                       v
+-------------------------------------+     +--------------------------------+     +-------------------------+
| Optional: 3D Scene Interaction      | <-- | Canvas Overlay                 |     | @mediapipe/hands Model  |
| (e.g., DynamicPointer.tsx in R3F)   |     | (Draws Landmarks, Connections) | <-- | (Hand Detection &       |
+-------------------------------------+     +--------------------------------+     |  Landmark Extraction)   |
                                                                                     +-------------------------+
```

## 3. Core Technologies & Algorithms

-   **`@mediapipe/hands`:** Google's MediaPipe Hands solution provides the underlying machine learning models for:
    -   Palm Detection: A lightweight detector to find hands in the frame.
    -   Hand Landmark Model: A model that predicts 21 3D keypoints of the hand from the detected palm region.
-   **`@mediapipe/camera_utils`:** Facilitates easy integration of MediaPipe solutions with webcam input.
-   **`@mediapipe/drawing_utils`:** Used to visualize hand landmarks and connections on the canvas overlay.
-   **Geometric Pose Recognition (`handPoseRecognition.ts`):** Custom logic that analyzes the spatial relationships (distances, angles, relative positions) of the 21 landmarks to classify the hand into predefined static poses like `FIST`, `OPEN_HAND`, `PINCH_CLOSED`, etc.
-   **React Hooks (`useHandTracking.ts`):** Encapsulates MediaPipe setup, result processing, and state management related to hand tracking data.
-   **HTML5 Video and Canvas APIs:** Used for camera input and visual feedback.

## 4. Input & Configuration

### 4.1. Primary Input
-   **Video Stream:** From the user's default webcam, accessed via browser WebRTC APIs (`navigator.mediaDevices.getUserMedia`).
-   **Resolution:** Internally, MediaPipe typically processes at a lower resolution (e.g., 640x480 or 320x240) for performance.

### 4.2. System Configuration

-   **Global Toggle (`isHandTrackingActive` in `HomePage.tsx`):**
    -   A boolean state controlling whether the hand tracking system is active.
    -   Toggled by the user via the Hotbar (Slot 9) or keyboard shortcut (Ctrl/Cmd+9).
    -   Controlled by the `Feature.HAND_TRACKING` feature flag.
-   **MediaPipe Hands Model Settings (in `useHandTracking.ts`):**
    ```typescript
    handsRef.current.setOptions({
      selfieMode: false, // Input video is not mirrored
      maxNumHands: 2,    // Track up to two hands
      modelComplexity: 0, // 0 for lite model, 1 for full model (0 is faster)
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });
    ```
-   **Pinch Gesture Threshold (in `handPoseRecognition.ts` -> `isPinchClosed`):**
    -   A distance threshold (e.g., `0.1` in normalized coordinates) between the thumb tip and index finger tip determines if a pinch is detected.

## 5. Processing Pipeline Details

### 5.1. Initialization (`useHandTracking` hook)
1.  When the `enabled` prop of `useHandTracking` is `true`:
2.  An instance of `Hands` from `@mediapipe/hands` is created.
    -   Model files (`.tflite`, WASM binaries) are located via `locateFile: (file) => "/mediapipe/hands/${file}"`. These static assets must be served by the application (copied by Vite to the public folder).
3.  `setOptions` is called to configure the MediaPipe model.
4.  The `onResults` callback (defined as `onHandTrackingResults`) is registered.
5.  A `Camera` instance from `@mediapipe/camera_utils` is created, linking the HTML `<video>` element to the `Hands` model.
6.  `cameraRef.current.start()` initiates the video stream and frame processing.
7.  Status is updated (e.g., "Initializing MediaPipe...", "Tracking active").

### 5.2. Frame Processing (`onResults` callback)
This callback is invoked by MediaPipe for each processed video frame.
1.  Checks if the system is `enabled` and if canvas context is available. Clears canvas if not.
2.  If results contain `multiHandLandmarks` and `multiHandedness`:
    -   Iterates through each detected hand (up to `maxNumHands`).
    -   `landmarks`: Raw 21 3D landmark data (normalized `x, y, z` coordinates, `visibility`).
    -   `handedness`: "Left" or "Right" string.
    -   `pose`: Recognized using `recognizeHandPose(landmarks)` (see 5.3).
    -   `pinchMidpoint`: Calculated if `pose === HandPose.PINCH_CLOSED` (see 5.4).
    -   Stores this processed `TrackedHandInfo` in `currentFrameTrackedHands`.
    -   If it's the first hand (`index === 0`), its index finger tip (`landmarks[8]`) updates the `handPosition` state (used for the R3F dynamic pointer).
    -   Draws landmarks and connections on the overlay canvas using `@mediapipe/drawing_utils`.
3.  Updates the `trackedHands` state with `currentFrameTrackedHands`.
4.  If no hands are detected, `handPosition` is reset to `null`.
5.  Updates `handTrackingStatus` string.

### 5.3. Pose Recognition (`handPoseRecognition.ts`)
-   **File:** `src/components/hands/handPoseRecognition.ts`
-   The `recognizeHandPose(landmarks: HandLandmarks | null): HandPose` function takes the 21 landmarks.
-   It uses a series of geometric helper functions to determine the state of fingers (extended, curled) and relative positions of landmarks.
    -   `isFingerExtended(tip, pip, mcp)`: Checks if a finger is straight.
    -   `isFingerCurled(tip, pip, mcp, wrist)`: Checks if a finger is curled towards the palm.
    -   `getPinchDistance(landmarks)`: Calculates distance between thumb and index finger tips.
    -   `areOtherFingersCurled(landmarks)`: Checks if middle, ring, and pinky are curled.
-   Specific pose detection functions:
    -   `isPinchClosed()`: Thumb tip and index finger tip are very close, other fingers are typically curled. The threshold is `0.1`.
    -   `isFist()`: All fingers and thumb are curled.
    -   `isFlatHand()`: All fingers extended and relatively close together.
    -   `isOpenHand()`: All fingers extended and spread apart.
    -   `isTwoFingerV()`: Index and middle fingers extended and spread, others curled.
-   The `recognizeHandPose` function checks these poses in a specific order (e.g., `PINCH_CLOSED` first).

### 5.4. Pinch Detection & Midpoint Calculation
-   Within `onHandTrackingResults`, if `recognizeHandPose` returns `HandPose.PINCH_CLOSED`:
    -   Thumb tip (landmark 4) and index finger tip (landmark 8) coordinates are used.
    -   Normalized midpoint: `normalizedMidX = (thumbTip.x + indexTip.x) / 2`, `normalizedMidY = (thumbTip.y + indexTip.y) / 2`.
    -   Screen pixel coordinates: These normalized coordinates are then scaled by `window.innerWidth` and `window.innerHeight`. The X-coordinate is also mirrored (`1 - normalizedMidX`) to match the non-selfie camera view for UI interaction.
    -   Stored in `pinchMidpoint: PinchCoordinates`.
    -   The `pinchMidpoint` also includes `normalizedMidX` and `normalizedMidY` which are used for drawing the pinch indicator on the overlay canvas consistently with the landmarks (which are drawn using normalized coordinates).

### 5.5. Data Aggregation & Output
-   The `useHandTracking` hook exposes the following reactive state:
    -   `videoRef`, `landmarkCanvasRef`: Refs to DOM elements.
    -   `handPosition: HandPosition | null`: Normalized `x, y` of the first detected hand's index finger tip.
    -   `handTrackingStatus: string`: User-facing status message.
    -   `activeHandPose: HandPose`: Pose of the first detected hand.
    -   `pinchMidpoint: PinchCoordinates | null`: Screen and normalized coordinates of the pinch for the first detected hand, if pinching.
    -   `trackedHands: TrackedHandInfo[]`: Array containing detailed info for each tracked hand.
-   The `HandTracking.tsx` component uses an `onHandDataUpdate` prop to pass a subset of this data (`HandDataContext`) to its parent (`HomePage.tsx`). This callback is memoized and throttled in `HomePage.tsx` using `prevHandDataRef` to avoid excessive re-renders.

## 6. Output Data Structure

The primary data structure passed from `HandTracking.tsx` to consuming components (like `HomePage.tsx`) is `HandDataContext`:

```typescript
// As defined for the onHandDataUpdate callback in HandTracking.tsx
interface HandDataForCallback {
  activeHandPose: HandPose; // Pose of the primary hand
  pinchMidpoint: PinchCoordinates | null; // Screen & normalized coords if primary hand is pinching
  primaryHandLandmarks: HandLandmarks | null; // Full landmarks for primary hand
  trackedHandsCount: number; // Number of hands currently detected
}

// HandPose enum from src/components/hands/handPoseTypes.ts
export enum HandPose {
  FIST = "Fist",
  TWO_FINGER_V = "Two-Finger V",
  FLAT_HAND = "Flat Hand",
  OPEN_HAND = "Open Hand",
  PINCH_CLOSED = "Pinch Closed",
  NONE = "None",
}

// PinchCoordinates from src/components/hands/handPoseTypes.ts
export interface PinchCoordinates {
  x: number; // Screen X (mirrored)
  y: number; // Screen Y
  z?: number; // Normalized Z depth
  normalizedMidX?: number; // Original normalized X before mirroring (for canvas drawing)
  normalizedMidY?: number; // Original normalized Y (for canvas drawing)
}

// HandLandmarks and Landmark from src/components/hands/handPoseTypes.ts
// export type HandLandmarks = Landmark[];
// export interface Landmark { x: number; y: number; z: number; visibility?: number; }
```

## 7. UI Integration & Interaction

### 7.1. System Activation (Hotbar & Keyboard)
-   **Hotbar (`Hotbar.tsx`):** Slot 9 contains a button with a `<Hand />` icon to toggle hand tracking.
    -   Its `onClick` handler calls `onToggleHandTracking` passed from `HomePage.tsx`.
    -   The button's title and active state reflect `isHandTrackingActive`.
    -   Visibility is controlled by the `Feature.HAND_TRACKING` feature flag.
-   **Keyboard Shortcut (`HomePage.tsx`):** Ctrl/Cmd + 9 also calls `toggleHandTracking`.
    -   Also gated by `Feature.HAND_TRACKING` flag.
-   **`HomePage.tsx` State:** `isHandTrackingActive` boolean state controls the `enabled` prop of the `HandTracking` component.

### 7.2. Pane Dragging (`HomePage.tsx`)
-   An `useEffect` hook in `HomePage.tsx` listens to changes in `handData` (received from `HandTracking.tsx`).
-   **Initiation:**
    -   If `isHandTrackingActive` is true, `handData.activeHandPose === HandPose.PINCH_CLOSED`, and `handData.pinchMidpoint` is valid:
    -   It iterates through `panes` (from `usePaneStore`) from topmost to bottommost.
    -   Checks if `pinchMidpoint` (screen coordinates) falls within the title bar bounds (`pane.x`, `pane.y`, `pane.width`, `TITLE_BAR_HEIGHT`) of any pane.
    -   If a target pane is found:
        -   `setDraggingPaneId(pane.id)` is called.
        -   `paneStartPosRef.current` stores the pane's initial `x, y`.
        -   `initialPinchPositionRef.current` stores the pinch's initial screen `x, y`.
        -   `bringPaneToFront(pane.id)` is called from `usePaneStore`.
-   **Dragging:**
    -   While `draggingPaneId` is set and `HandPose.PINCH_CLOSED` is maintained:
    -   Calculates `deltaX` and `deltaY` from `pinchMidpoint` and `initialPinchPositionRef`.
    -   Calculates `newX = paneStartPosRef.current.x + deltaX` and `newY = paneStartPosRef.current.y + deltaY`.
    -   Calls `updatePanePosition(draggingPaneId, newX, newY)` from `usePaneStore`.
    -   Updates `initialPinchPositionRef` and `paneStartPosRef` to track relative movement for the next frame. This is done to avoid large jumps if there's a slight lag or change in hand data interpretation.
-   **Release:**
    -   If `activeHandPose` is no longer `PINCH_CLOSED` or `isHandTrackingActive` becomes false while `draggingPaneId` is set:
    -   `setDraggingPaneId(null)` and resets related refs.

### 7.3. 3D Scene Interaction (Conceptual)
-   **`DynamicPointer.tsx`:** A R3F component that creates an invisible `RigidBody` (physics object).
    -   In its `useFrame` loop, it takes `handPosition` (normalized index finger tip of the primary hand).
    -   It maps these normalized coordinates to the R3F viewport coordinates (mirrored X, adjusted Y).
    -   Sets the `kinematicTranslation` of the `RigidBody` to this position, effectively making the 3D object follow the hand.
-   **`MainSceneContent.tsx`:** A more complex R3F scene.
    -   Uses `activeHandPose` to change `rotationDirection` of a group of boxes.
    -   `HandPose.FLAT_HAND` -> clockwise rotation.
    -   `HandPose.OPEN_HAND` -> counter-clockwise rotation.
    -   Rotation speed is increased when these specific poses are detected.

### 7.4. Visual Feedback (Canvas Overlay)
-   **`HandTracking.tsx` / `useHandTracking.ts`:**
    -   A `<canvas>` element (`landmarkCanvasRef`) is overlaid on the (hidden) `<video>` element.
    -   In `onHandTrackingResults`, after processing landmarks and poses:
        -   `drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, ...)` draws lines between connected landmarks.
        -   `drawLandmarks(canvasCtx, landmarks, ...)` draws dots for each landmark.
        -   Specific landmarks (thumb tip, index tip) are highlighted with larger dots.
        -   If a pinch is detected, a circle and coordinate text are drawn at the `pinchMidpoint` (using its `normalizedMidX`, `normalizedMidY` for consistency with landmark drawing coordinates).
    -   The canvas is mirrored (`scale-x-[-1]`) to match the non-selfie camera view, so drawn elements align with the user's perception of their hand.

## 8. Performance Considerations

-   **MediaPipe Model Complexity:** Set to `0` (`modelComplexity: 0`) for the lite, faster model.
-   **Confidence Thresholds:** `minDetectionConfidence: 0.7` and `minTrackingConfidence: 0.5` are used to balance accuracy and performance. Higher values are more accurate but might miss less clear hands; lower values increase recall but might lead to more false positives or jitter.
-   **Frame Processing Rate:** Depends on camera FPS and MediaPipe's processing speed.
-   **Canvas Drawing:** Drawing landmarks and connections on every frame can be resource-intensive. This is only done when `showHandTracking` (controlled by `isHandTrackingActive`) is true.
-   **React Re-renders:**
    -   `onHandDataUpdate` callback in `HomePage.tsx` uses `prevHandDataRef` to compare new data with previous data, only calling `setHandData` if there's a meaningful change. This prevents unnecessary re-renders of `HomePage` and its children due to minor fluctuations in hand tracking output.
    -   `useCallback` is used for `handleHandDataUpdate` and `toggleHandTracking` in `HomePage.tsx` to stabilize their references.

## 9. Limitations & Known Issues

-   **Accuracy Dependence:** Relies entirely on the accuracy and robustness of the underlying MediaPipe Hands model, which can be affected by:
    -   Poor lighting conditions.
    -   Fast hand movements causing motion blur.
    -   Hand occlusions (by objects or self-occlusion).
    -   Unusual hand appearances (e.g., gloves).
    -   Distance of hand from camera (too small or too large).
-   **Limited Gesture Set:** Current pose recognition (`handPoseRecognition.ts`) is rule-based and supports a small set of static poses. It does not handle dynamic gestures.
-   **Pinch Sensitivity:** The pinch detection relies on a fixed distance threshold between thumb and index fingertips. This might not be optimal for all users or hand sizes.
-   **Primary Hand Focus:** Most UI interactions (pane drag, 3D pointer) are based on the first detected hand. True multi-hand independent interaction is more complex.
-   **Computational Cost:** Real-time hand tracking is computationally intensive. Performance may vary significantly across different hardware. The Electron environment adds some overhead compared to a native application.
-   **Mirrored Coordinates:** The system consistently uses a mirrored view (camera input `selfieMode: false`, canvas `scale-x-[-1]`). UI interaction logic must account for this by inverting X-coordinates (e.g., `1 - normalizedX`).

## 10. Troubleshooting

-   **No Hand Tracking / "Inactive" Status:**
    -   Verify webcam is connected and accessible by the browser/Electron.
    -   Check browser/OS permissions for camera access.
    -   Ensure MediaPipe model files are correctly served from `/mediapipe/hands/` in the public assets.
    -   Look for errors in the browser console related to MediaPipe initialization or camera access.
-   **Jittery Landmarks or Unstable Poses:**
    -   Improve lighting conditions.
    -   Reduce fast hand movements.
    -   Consider adjusting `minDetectionConfidence` or `minTrackingConfidence` (though default values are generally good).
-   **Pinch Gesture Not Registering or Sticking:**
    -   Check `pinchThreshold` in `handPoseRecognition.ts`.
    -   Ensure clear visibility of thumb and index fingertips.
-   **Pane Dragging Issues:**
    -   Verify `pinchMidpoint` screen coordinates are calculated correctly, including mirroring.
    -   Check `TITLE_BAR_HEIGHT` constant in `HomePage.tsx` matches actual title bar height.
    -   Debug the hit-testing logic in `HomePage.tsx`'s pinch-to-drag `useEffect`.
-   **Performance Issues (Low FPS):**
    -   Ensure `modelComplexity` is `0`.
    -   If not essential, ensure the 3D scene components (`ThreeScene.tsx`, `MainSceneContent.tsx`) are not rendering or are simplified if hand tracking is the primary focus.

## 11. Future Work & Roadmap

-   **Expanded Gesture Vocabulary:** Implement recognition for more static and dynamic gestures (e.g., swipes, pointing direction, number gestures).
-   **Machine Learning for Gestures:** Transition from rule-based pose recognition to ML-based gesture classifiers for more robustness and customizability.
-   **Two-Handed Gestures:** Implement interactions that utilize both hands simultaneously (e.g., two-hand pinch for zoom/resize).
-   **Fine-Grained Finger Control:** Allow direct manipulation of UI elements with individual fingers beyond just a single pinch point.
-   **User Calibration:** Allow users to calibrate pinch thresholds or customize gesture sensitivity.
-   **Performance Optimizations:** Explore WebGL-based landmark drawing or offloading more processing to Web Workers if performance bottlenecks arise.
-   **Integration with Other NUI:** Combine hand tracking with voice commands for a multi-modal interaction system.
-   **Configurable Hand Preference:** Allow users to select primary hand (left/right) for interactions if only one hand is used for control.

## 12. Key File References

-   **Core Logic & Hooks:**
    -   `src/components/hands/useHandTracking.ts` (Main hook for MediaPipe integration and data processing)
    -   `src/components/hands/handPoseRecognition.ts` (Pose classification logic)
    -   `src/components/hands/handPoseTypes.ts` (Enum and type definitions)
-   **React Components:**
    -   `src/components/hands/HandTracking.tsx` (Wrapper component for `useHandTracking`, renders canvas)
    -   `src/pages/HomePage.tsx` (Integrates `HandTracking` and implements pane drag logic)
    -   `src/components/hud/Hotbar.tsx` (Contains toggle button for the system)
-   **3D Demo Components (Conceptual):**
    -   `src/components/hands/DynamicPointer.tsx`
    -   `src/components/hands/MainSceneContent.tsx`
-   **Configuration & Control:**
    -   `src/controls.ts` (Keyboard control mapping for toggle)
    -   `src/services/featureflags/FeatureFlag.ts` (Contains `Feature.HAND_TRACKING`)
-   **Static Assets:**
    -   `public/mediapipe/hands/*` (MediaPipe model files and WASM binaries)

This Hand Tracking System, while currently focused on specific interactions like pane dragging, lays a foundational NUI capability within OpenAgents Commander, opening possibilities for more advanced and intuitive user experiences.
