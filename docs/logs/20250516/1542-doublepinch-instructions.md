The "double pinching not working" issue, where only one pinch is recorded at a time, stems from the `useHandTracking` hook being designed to primarily track and report pose and pinch information for a single hand (either the first detected or the "Right" hand).

To fix this and enable the recording of pinch gestures from multiple (up to two) hands simultaneously, you need to modify `src/components/hands/useHandTracking.ts`. The goal is to process each detected hand individually and store its pose and pinch information.

Here are the instructions for the coding agent:

**Target File: `src/components/hands/useHandTracking.ts`**

1.  **Define a new interface `TrackedHandInfo`:**
    Place this interface definition near the top of the file, after the import statements.

    ```typescript
    interface TrackedHandInfo {
      landmarks: HandLandmarks; // from @mediapipe/hands
      pose: HandPose; // from ./handPoseTypes
      pinchMidpoint: PinchCoordinates | null; // from ./handPoseTypes
      handedness: string; // e.g., "Left" or "Right"
    }
    ```

2.  **Update State Variables:**

    - Remove the existing `activeHandPose` and `pinchMidpoint` state declarations:
      ```diff
      - const [activeHandPose, setActiveHandPose] = useState<HandPose>(HandPose.NONE);
      - const [pinchMidpoint, setPinchMidpoint] = useState<PinchCoordinates | null>(null);
      ```
    - Add a new state variable to store an array of `TrackedHandInfo` objects, one for each detected hand:
      ```typescript
      const [trackedHands, setTrackedHands] = useState<TrackedHandInfo[]>([]);
      ```
    - The `handPosition` state (used for the 3D pointer) can remain as is, it will continue to track a single primary hand.

3.  **Refactor the `onHandTrackingResults` Callback Function:**

    - **Initialization:** At the beginning of the `onHandTrackingResults` function, declare a new array to hold the data for hands detected in the current frame:
      ```typescript
      const currentFrameTrackedHands: TrackedHandInfo[] = [];
      ```
    - **Loop Modification:** Locate the `if (results.multiHandLandmarks && results.multiHandedness)` block. The `for` loop inside it iterates through detected hands.

      - Remove the variable `rightHandLandmarks` and any logic that specifically tries to identify and store only the "right" or first hand's landmarks for pose/pinch detection.
      - Inside this `for` loop (iterating with `index` from `0` to `results.multiHandLandmarks.length - 1`):

        - Retrieve the `landmarks` for the current hand: `const landmarks = results.multiHandLandmarks[index] as HandLandmarks;`
        - Retrieve the `handedness`: `const handedness = results.multiHandedness[index].label;`
        - Recognize the pose for the current hand:
          ```typescript
          const pose = recognizeHandPose(landmarks);
          ```
        - Calculate the pinch midpoint for the _current hand_ if it's pinching. Adapt the existing pinch midpoint calculation logic (previously associated with `rightHandLandmarks`).

          ```typescript
          let currentPinchMidpoint: PinchCoordinates | null = null;
          if (pose === HandPose.PINCH_CLOSED) {
            const thumbTip = landmarks[4]; // THUMB_TIP index
            const indexTip = landmarks[8]; // INDEX_FINGER_TIP index

            if (thumbTip && indexTip && landmarkCanvasRef.current) {
              const normalizedMidX = (thumbTip.x + indexTip.x) / 2;
              const normalizedMidY = (thumbTip.y + indexTip.y) / 2;

              // Convert to screen pixel coordinates (relative to viewport)
              // Ensure X is flipped to match mirrored camera view for UI interaction
              const mirroredNormalizedMidX = 1 - normalizedMidX;
              const screenPinchX = mirroredNormalizedMidX * window.innerWidth;
              const screenPinchY = normalizedMidY * window.innerHeight;

              currentPinchMidpoint = {
                x: screenPinchX,
                y: screenPinchY,
                z: (thumbTip.z + indexTip.z) / 2, // Keep Z for potential 3D use
              };

              // Update console log for better debugging of multiple pinches
              console.log(
                `PINCH COORDS for hand ${index} (${handedness}): screen(${Math.round(screenPinchX)}, ${Math.round(screenPinchY)}px)`,
              );
            }
          }
          ```

        - Add the comprehensive data for the current hand to `currentFrameTrackedHands`:
          ```typescript
          currentFrameTrackedHands.push({
            landmarks,
            pose,
            pinchMidpoint: currentPinchMidpoint,
            handedness,
          });
          ```

    - **Update State After Loop:** After the `for` loop finishes, update the `trackedHands` state with the collected data:
      ```typescript
      setTrackedHands(currentFrameTrackedHands);
      ```
    - **Primary Hand for 3D Pointer:** Update the existing `setHandPosition` logic to use data from `currentFrameTrackedHands` (e.g., the first detected hand) for the single 3D pointer:
      ```typescript
      if (currentFrameTrackedHands.length > 0) {
        const primaryHand = currentFrameTrackedHands[0]; // Or select based on 'Right' handedness if preferred
        if (primaryHand.landmarks.length > 8) {
          const indexFingerTip = primaryHand.landmarks[8];
          setHandPosition({
            x: indexFingerTip.x,
            y: indexFingerTip.y,
          });
        } else {
          setHandPosition(null);
        }
      } else {
        setHandPosition(null);
      }
      ```
    - **Canvas Drawing for Pinch Midpoints (Optional Enhancement):**
      The existing logic for drawing the pinch midpoint (green circle and coordinate text, lines `181-258` approx.) was tied to the single `rightHandLandmarks`. If you want to visually debug multiple pinch points on the canvas:
      - Move this drawing logic _inside_ the `for` loop that processes each hand.
      - Adapt it to use the `landmarks` and `currentPinchMidpoint` of the hand currently being processed in the loop.
      - Ensure `canvasCtx` is correctly used.
        _(For this fix, focus on data recording; visual debugging can be a follow-up)._
    - **State Clearing:**
      - In the block `if (!landmarkCanvasRef.current || !enabled)`, replace:
        ```diff
        - setHandPosition(null);
        - setActiveHandPose(HandPose.NONE);
        - setPinchMidpoint(null);
        ```
        with:
        ```typescript
        setTrackedHands([]);
        setHandPosition(null); // For the single 3D pointer
        ```
      - Similarly, in the `else` block that handles the case where `results.multiHandLandmarks` is empty (around line `264`), replace:
        ```diff
        - setHandPosition(null);
        - setActiveHandPose(HandPose.NONE);
        - setPinchMidpoint(null);
        ```
        with:
        ```typescript
        setTrackedHands([]);
        setHandPosition(null); // For the single 3D pointer
        ```
    - The `setHandTrackingStatus` logic can remain as is.

4.  **Update the Hook's Return Value:**
    Modify the object returned by the `useHandTracking` hook:
    ```diff
    return {
      videoRef,
      landmarkCanvasRef,
      handPosition, // Remains for the single 3D pointer
      handTrackingStatus,
    ```

-     activeHandPose,
-     pinchMidpoint,

*     trackedHands, // New: an array of TrackedHandInfo for all detected hands
  };
  ```

  ```

**Post-Fix Steps (for the developer, not the agent's immediate task):**

- **Update Consumers:** Components that use this hook (e.g., `HomePage.tsx`, `HandTracking.tsx`, `PinnableChatWindow.tsx`) will need to be updated:
  - They will now receive `trackedHands` (an array of `TrackedHandInfo`) instead of `activeHandPose` and `pinchMidpoint`.
  - Logic that relied on a single pose or pinch midpoint will need to be adapted to handle an array (e.g., iterate through it, or select a primary hand's data based on some criteria like handedness or which hand is "acting").
  - For `PinnableChatWindow`, you'll need to decide how it should react to multiple pinches. For example, it could respond to the first pinching hand in the `trackedHands` array, or implement more complex multi-touch-like interactions if desired.
- **Verify Pinch Coordinate System:** Ensure the `screenPinchX` and `screenPinchY` calculations correctly map to the desired coordinate system for UI interaction for both left and right hands, especially considering the mirrored camera view. The current `mirroredNormalizedMidX = 1 - normalizedMidX` logic should handle this correctly for on-screen display.

By making these changes in `useHandTracking.ts`, the hook will now "record" and provide data for pinch gestures (and other poses) from all detected hands, fixing the issue of only one pinch being registered.
