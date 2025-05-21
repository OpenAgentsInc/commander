Okay, I will guide you through implementing the hand position detection algorithm.

**Phase 1: Define Hand Poses and Algorithm Structure**

**Step 1.1: Create `src/components/hands/handPoseTypes.ts`**
Create a new file named `handPoseTypes.ts` inside the `src/components/hands/` directory.

```typescript
// src/components/hands/handPoseTypes.ts
export enum HandPose {
  FIST = "Fist",
  TWO_FINGER_V = "Two-Finger V",
  FLAT_HAND = "Flat Hand",
  OPEN_HAND = "Open Hand",
  NONE = "None",
}

// Landmark type from MediaPipe (simplified)
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type HandLandmarks = Landmark[];
```

**Step 1.2: Create `src/components/hands/handPoseRecognition.ts`**
Create a new file named `handPoseRecognition.ts` inside the `src/components/hands/` directory.

```typescript
// src/components/hands/handPoseRecognition.ts
import { HandPose, type HandLandmarks } from "./handPoseTypes";

// Placeholder for the actual landmark indices
// const FINGER_TIP_INDICIES = {
//   THUMB: 4,
//   INDEX: 8,
//   MIDDLE: 12,
//   RING: 16,
//   PINKY: 20,
// };

export function recognizeHandPose(landmarks: HandLandmarks | null): HandPose {
  if (!landmarks || landmarks.length === 0) {
    return HandPose.NONE;
  }

  // Placeholder: Actual recognition logic will be added in later phases
  // For now, let's just return NONE to ensure compilation and tests pass.
  // console.log("Recognizing pose for", landmarks.length, "landmarks");

  return HandPose.NONE;
}
```

**Step 1.3: Update `src/components/hands/useHandTracking.ts`**
Modify `src/components/hands/useHandTracking.ts` to incorporate the new types and recognition logic.

```typescript
// src/components/hands/useHandTracking.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "@mediapipe/camera_utils";
import {
  Hands,
  Results as HandResults,
  LandmarkConnectionArray,
  HAND_CONNECTIONS,
  NormalizedLandmarkList,
} from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HandPose, type HandLandmarks } from "./handPoseTypes"; // Added
import { recognizeHandPose } from "./handPoseRecognition"; // Added

// Fix for the WebAssembly issues in Electron
declare global {
  interface Window {
    moduleInitialized: boolean;
  }
}

export interface HandPosition {
  x: number;
  y: number;
}

interface UseHandTrackingOptions {
  enabled: boolean;
}

export function useHandTracking({ enabled }: UseHandTrackingOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const [handTrackingStatus, setHandTrackingStatus] = useState("Inactive");
  const [handPosition, setHandPosition] = useState<HandPosition | null>(null);
  const [activeHandPose, setActiveHandPose] = useState<HandPose>(HandPose.NONE); // Added

  // Process MediaPipe results
  const onHandTrackingResults = useCallback(
    (results: HandResults) => {
      if (!landmarkCanvasRef.current || !enabled) {
        if (landmarkCanvasRef.current) {
          const canvasCtx = landmarkCanvasRef.current.getContext("2d")!;
          canvasCtx.clearRect(
            0,
            0,
            landmarkCanvasRef.current.width,
            landmarkCanvasRef.current.height,
          );
        }
        setHandPosition(null);
        setActiveHandPose(HandPose.NONE); // Reset pose when not enabled
        return;
      }

      const canvasCtx = landmarkCanvasRef.current.getContext("2d")!;
      canvasCtx.save();
      canvasCtx.clearRect(
        0,
        0,
        landmarkCanvasRef.current.width,
        landmarkCanvasRef.current.height,
      );

      let handsDetected = 0;
      let rightHandLandmarks: HandLandmarks | null = null; // Changed type

      if (results.multiHandLandmarks && results.multiHandedness) {
        handsDetected = results.multiHandLandmarks.length;
        for (
          let index = 0;
          index < results.multiHandLandmarks.length;
          index++
        ) {
          const classification = results.multiHandedness[index];
          const isRightHand = classification.label !== "Right";
          const landmarks = results.multiHandLandmarks[index] as HandLandmarks; // Cast to HandLandmarks

          if (isRightHand) {
            rightHandLandmarks = landmarks;
            if (landmarks.length > 8) {
              const rightHandIndexFingerTip = landmarks[8];
              setHandPosition({
                x: rightHandIndexFingerTip.x,
                y: rightHandIndexFingerTip.y,
              });
            }
          }

          drawConnectors(
            canvasCtx,
            landmarks,
            HAND_CONNECTIONS as LandmarkConnectionArray,
            {
              color: "#3f3f46",
              lineWidth: 1,
            },
          );

          drawLandmarks(canvasCtx, landmarks, {
            color: "#fff",
            lineWidth: 1,
            fillColor: "#000",
            radius: 4,
          });
        }
      }

      if (rightHandLandmarks) {
        const pose = recognizeHandPose(rightHandLandmarks);
        setActiveHandPose(pose);
      } else {
        setHandPosition(null);
        setActiveHandPose(HandPose.NONE);
      }

      if (enabled) {
        setHandTrackingStatus(
          handsDetected > 0
            ? `${handsDetected} hand(s) detected`
            : "No hands detected",
        );
      }
      canvasCtx.restore();
    },
    [enabled],
  );

  // Initialize hand tracking (no changes here for this step)
  useEffect(() => {
    if (!enabled) {
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
          if (handsRef.current) {
            handsRef.current.close();
          }
        } catch (err) {
          console.error("Cleanup error:", err);
        }
      }
      setHandTrackingStatus("Inactive");
      setActiveHandPose(HandPose.NONE); // Reset pose on disable
      return;
    }

    if (!videoRef.current || !landmarkCanvasRef.current) return;

    window.moduleInitialized = false;

    try {
      setHandTrackingStatus("Initializing MediaPipe...");

      handsRef.current = new Hands({
        locateFile: (file) => {
          return `/mediapipe/hands/${file}`;
        },
      });

      handsRef.current.setOptions({
        selfieMode: false,
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      handsRef.current.onResults(onHandTrackingResults);
      setHandTrackingStatus("MediaPipe initialized");

      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch (err) {
              console.log("Frame error (normal during tracking)");
            }
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current.start();
      setHandTrackingStatus("Tracking active");
    } catch (error) {
      console.error("Init error:", error);
      setHandTrackingStatus(
        `Error initializing MediaPipe: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return () => {
      try {
        cameraRef.current?.stop();
        if (handsRef.current) {
          handsRef.current.close();
        }
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    };
  }, [enabled, onHandTrackingResults]);

  // Canvas dimensions effect (no changes here for this step)
  useEffect(() => {
    if (!enabled) return;

    const updateCanvasDimensions = () => {
      if (videoRef.current && landmarkCanvasRef.current) {
        const videoWidth =
          videoRef.current.videoWidth || videoRef.current.clientWidth;
        const videoHeight =
          videoRef.current.videoHeight || videoRef.current.clientHeight;

        if (videoWidth > 0 && videoHeight > 0) {
          landmarkCanvasRef.current.width = videoWidth;
          landmarkCanvasRef.current.height = videoHeight;
        } else {
          landmarkCanvasRef.current.width = videoRef.current.offsetWidth;
          landmarkCanvasRef.current.height = videoRef.current.offsetHeight;
        }
      }
    };

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.addEventListener("loadedmetadata", updateCanvasDimensions);
      videoEl.addEventListener("play", updateCanvasDimensions);
    }

    window.addEventListener("resize", updateCanvasDimensions);
    updateCanvasDimensions();

    return () => {
      if (videoEl) {
        videoEl.removeEventListener("loadedmetadata", updateCanvasDimensions);
        videoEl.removeEventListener("play", updateCanvasDimensions);
      }
      window.removeEventListener("resize", updateCanvasDimensions);
    };
  }, [enabled]);

  return {
    videoRef,
    landmarkCanvasRef,
    handPosition,
    handTrackingStatus,
    activeHandPose, // Added
  };
}
```

**Step 1.4: Update `src/components/hands/index.ts`**
Export the new types and enum from `src/components/hands/index.ts`.

```typescript
// src/components/hands/index.ts
export { default as HandTracking } from "./HandTracking";
export { useHandTracking } from "./useHandTracking";
export type { HandPosition } from "./useHandTracking";
export { default as ThreeScene } from "./ThreeScene";
export { DynamicPointer } from "./DynamicPointer";
export { MousePointer } from "./MousePointer";
export { HandPose, type HandLandmarks } from "./handPoseTypes"; // Added
export { recognizeHandPose } from "./handPoseRecognition"; // Added
```

**Step 1.5: Run `pnpm run t` and `pnpm test`**
Execute the following commands in your terminal:

```bash
pnpm run t
pnpm test
```

Ensure both commands pass without errors. This confirms that the basic structure and type imports are correct.

**Phase 2: Implement Basic Landmark-based Logic for Fist Pose**

**Step 2.1: Update `src/components/hands/handPoseRecognition.ts`**
Modify the file to include helper functions and logic for detecting a fist.

```typescript
// src/components/hands/handPoseRecognition.ts
import { HandPose, type HandLandmarks, type Landmark } from "./handPoseTypes";

// Landmark indices based on MediaPipe Hands
const LandmarkIndex = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

const FINGER_TIPS = [
  LandmarkIndex.THUMB_TIP,
  LandmarkIndex.INDEX_FINGER_TIP,
  LandmarkIndex.MIDDLE_FINGER_TIP,
  LandmarkIndex.RING_FINGER_TIP,
  LandmarkIndex.PINKY_TIP,
];

const FINGER_PIPS = [
  LandmarkIndex.INDEX_FINGER_PIP,
  LandmarkIndex.MIDDLE_FINGER_PIP,
  LandmarkIndex.RING_FINGER_PIP,
  LandmarkIndex.PINKY_PIP,
];

const FINGER_MCPS = [
  LandmarkIndex.INDEX_FINGER_MCP,
  LandmarkIndex.MIDDLE_FINGER_MCP,
  LandmarkIndex.RING_FINGER_MCP,
  LandmarkIndex.PINKY_MCP,
];

// Helper function to calculate Euclidean distance between two 3D landmarks
function distance(p1: Landmark, p2: Landmark): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2),
  );
}

// Helper to check if a finger is curled (tip is close to MCP or palm)
// For simplicity, we can check if tip is below PIP for curled fingers (in a typical upright hand pose)
// Or more robustly, if tip is closer to MCP than PIP is to MCP.
// For fist, a simple check: are fingertips lower (y-coord) than their PIP joints?
function isFingerCurled(tip: Landmark, pip: Landmark): boolean {
  // Assuming normalized coordinates where y decreases upwards on the image
  // and the hand is somewhat upright.
  // A more robust check would involve angles or distances to palm.
  return tip.y > pip.y;
}

function isFist(landmarks: HandLandmarks): boolean {
  // Check if all non-thumb fingers are curled
  // We expect fingertips (8,12,16,20) to be "below" (larger y) their PIP joints (6,10,14,18)
  // and also close to their MCP joints or palm.

  const indexTip = landmarks[LandmarkIndex.INDEX_FINGER_TIP];
  const indexPip = landmarks[LandmarkIndex.INDEX_FINGER_PIP];
  const indexMcp = landmarks[LandmarkIndex.INDEX_FINGER_MCP];

  const middleTip = landmarks[LandmarkIndex.MIDDLE_FINGER_TIP];
  const middlePip = landmarks[LandmarkIndex.MIDDLE_FINGER_PIP];
  const middleMcp = landmarks[LandmarkIndex.MIDDLE_FINGER_MCP];

  const ringTip = landmarks[LandmarkIndex.RING_FINGER_TIP];
  const ringPip = landmarks[LandmarkIndex.RING_FINGER_PIP];
  const ringMcp = landmarks[LandmarkIndex.RING_FINGER_MCP];

  const pinkyTip = landmarks[LandmarkIndex.PINKY_TIP];
  const pinkyPip = landmarks[LandmarkIndex.PINKY_PIP];
  const pinkyMcp = landmarks[LandmarkIndex.PINKY_MCP];

  // Condition 1: Fingers are curled (tip y > pip y)
  const fingersCurled =
    indexTip.y > indexPip.y &&
    middleTip.y > middlePip.y &&
    ringTip.y > ringPip.y &&
    pinkyTip.y > pinkyPip.y;

  if (!fingersCurled) return false;

  // Condition 2: Fingertips are close to their respective MCP joints or a central palm point.
  // Let's use distance to MCP for now. The threshold might need tuning.
  // We can use the distance between wrist and index_mcp as a reference.
  const referenceDistance = distance(
    landmarks[LandmarkIndex.WRIST],
    landmarks[LandmarkIndex.INDEX_FINGER_MCP],
  );

  const fistThreshold = referenceDistance * 0.7; // Tune this value

  const indexTipToMcp = distance(indexTip, indexMcp);
  const middleTipToMcp = distance(middleTip, middleMcp);
  const ringTipToMcp = distance(ringTip, ringMcp);
  const pinkyTipToMcp = distance(pinkyTip, pinkyMcp);

  const tipsCloseToMcps =
    indexTipToMcp < fistThreshold &&
    middleTipToMcp < fistThreshold &&
    ringTipToMcp < fistThreshold &&
    pinkyTipToMcp < fistThreshold;

  if (!tipsCloseToMcps) return false;

  // Optionally, check thumb position (e.g. thumb tip close to index MCP)
  // const thumbTip = landmarks[LandmarkIndex.THUMB_TIP];
  // const thumbOverFingers = distance(thumbTip, indexMcp) < fistThreshold * 1.2;

  return true;
}

export function recognizeHandPose(landmarks: HandLandmarks | null): HandPose {
  if (!landmarks || landmarks.length < 21) {
    // Need all 21 landmarks
    return HandPose.NONE;
  }

  if (isFist(landmarks)) {
    return HandPose.FIST;
  }

  // More poses to be added here

  return HandPose.NONE;
}
```

**Step 2.2: Run `pnpm run t` and `pnpm test`**
Execute the following commands in your terminal:

```bash
pnpm run t
pnpm test
```

Ensure both commands pass. The tests might not verify the fist detection yet, but the code should compile and existing tests should pass.

**Phase 3: Implement Logic for Remaining Poses**

**Step 3.1: Update `src/components/hands/handPoseRecognition.ts`**
Add logic for "Flat Hand", "Open Hand", and "Two-Finger V".

```typescript
// src/components/hands/handPoseRecognition.ts
import { HandPose, type HandLandmarks, type Landmark } from "./handPoseTypes";

// Landmark indices based on MediaPipe Hands
const LandmarkIndex = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

// Helper function to calculate Euclidean distance between two 3D landmarks
function distance(p1: Landmark, p2: Landmark): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2),
  );
}

// Helper to check if a finger is extended
// Condition: Tip is further away from MCP than PIP is from MCP.
// And Tip.y < PIP.y (assuming upright hand, smaller y is higher)
function isFingerExtended(
  tip: Landmark,
  pip: Landmark,
  mcp: Landmark,
): boolean {
  // A simple check: tip y-coordinate is less (higher on screen) than pip y-coordinate
  // and pip y-coordinate is less than mcp y-coordinate.
  // This assumes a somewhat upright hand.
  // A more robust check would involve angles or ensuring the tip is far from the palm.
  const verticalCheck = tip.y < pip.y && pip.y < mcp.y;

  // Check if the finger is somewhat straight by comparing distances
  // distance(mcp, tip) should be greater than distance(mcp, pip)
  const straightCheck = distance(mcp, tip) > distance(mcp, pip) * 0.9; // 0.9 allows slight bend

  return verticalCheck && straightCheck;
}

// Helper to check if a finger is curled (tip y > pip y, and tip close to MCP)
function isFingerCurled(
  tip: Landmark,
  pip: Landmark,
  mcp: Landmark,
  wrist: Landmark,
): boolean {
  const tipLowerThanPip = tip.y > pip.y;

  // Check if the tip is close to the MCP or palm (approximated by wrist-to-mcp distance)
  const referenceDistance = distance(wrist, mcp);
  const tipToMcpDistance = distance(tip, mcp);

  // If tip is closer to MCP than, say, 60% of the wrist-to-MCP distance, it's likely curled.
  // Or if tip is significantly "below" (larger y) its PIP
  const curledThreshold = referenceDistance * 0.7;

  return (
    tipLowerThanPip &&
    (tipToMcpDistance < curledThreshold ||
      tip.y - pip.y > referenceDistance * 0.1)
  );
}

function isFist(landmarks: HandLandmarks): boolean {
  const wrist = landmarks[LandmarkIndex.WRIST];
  const fingersCurled =
    isFingerCurled(
      landmarks[LandmarkIndex.INDEX_FINGER_TIP],
      landmarks[LandmarkIndex.INDEX_FINGER_PIP],
      landmarks[LandmarkIndex.INDEX_FINGER_MCP],
      wrist,
    ) &&
    isFingerCurled(
      landmarks[LandmarkIndex.MIDDLE_FINGER_TIP],
      landmarks[LandmarkIndex.MIDDLE_FINGER_PIP],
      landmarks[LandmarkIndex.MIDDLE_FINGER_MCP],
      wrist,
    ) &&
    isFingerCurled(
      landmarks[LandmarkIndex.RING_FINGER_TIP],
      landmarks[LandmarkIndex.RING_FINGER_PIP],
      landmarks[LandmarkIndex.RING_FINGER_MCP],
      wrist,
    ) &&
    isFingerCurled(
      landmarks[LandmarkIndex.PINKY_TIP],
      landmarks[LandmarkIndex.PINKY_PIP],
      landmarks[LandmarkIndex.PINKY_MCP],
      wrist,
    );

  if (!fingersCurled) return false;

  // Thumb check: Thumb tip should be close to or across the curled fingers.
  // e.g. thumb tip y > thumb mcp y
  const thumbTip = landmarks[LandmarkIndex.THUMB_TIP];
  const thumbMcp = landmarks[LandmarkIndex.THUMB_MCP];
  const thumbPip = landmarks[LandmarkIndex.INDEX_FINGER_PIP]; // reference for y-level

  const thumbCurledOrAcross =
    thumbTip.y > thumbMcp.y ||
    distance(thumbTip, thumbPip) <
      distance(
        landmarks[LandmarkIndex.WRIST],
        landmarks[LandmarkIndex.THUMB_MCP],
      ) *
        0.8;

  return thumbCurledOrAcross;
}

function areAllFingersExtended(landmarks: HandLandmarks): boolean {
  return (
    isFingerExtended(
      landmarks[LandmarkIndex.INDEX_FINGER_TIP],
      landmarks[LandmarkIndex.INDEX_FINGER_PIP],
      landmarks[LandmarkIndex.INDEX_FINGER_MCP],
    ) &&
    isFingerExtended(
      landmarks[LandmarkIndex.MIDDLE_FINGER_TIP],
      landmarks[LandmarkIndex.MIDDLE_FINGER_PIP],
      landmarks[LandmarkIndex.MIDDLE_FINGER_MCP],
    ) &&
    isFingerExtended(
      landmarks[LandmarkIndex.RING_FINGER_TIP],
      landmarks[LandmarkIndex.RING_FINGER_PIP],
      landmarks[LandmarkIndex.RING_FINGER_MCP],
    ) &&
    isFingerExtended(
      landmarks[LandmarkIndex.PINKY_TIP],
      landmarks[LandmarkIndex.PINKY_PIP],
      landmarks[LandmarkIndex.PINKY_MCP],
    ) &&
    isFingerExtended(
      landmarks[LandmarkIndex.THUMB_TIP],
      landmarks[LandmarkIndex.THUMB_IP],
      landmarks[LandmarkIndex.THUMB_MCP],
    ) // Thumb uses IP instead of PIP
  );
}

function isFlatHand(landmarks: HandLandmarks): boolean {
  if (!areAllFingersExtended(landmarks)) {
    return false;
  }

  // For flat hand, fingers should be relatively close together.
  // Compare distance between index and pinky tip to width of palm (mcp to mcp)
  const indexTip = landmarks[LandmarkIndex.INDEX_FINGER_TIP];
  const pinkyTip = landmarks[LandmarkIndex.PINKY_TIP];
  const indexMcp = landmarks[LandmarkIndex.INDEX_FINGER_MCP];
  const pinkyMcp = landmarks[LandmarkIndex.PINKY_MCP];

  const tipSpread = distance(indexTip, pinkyTip);
  const mcpSpread = distance(indexMcp, pinkyMcp);

  // Tips should not be spread much wider than MCPs for a flat hand
  // Threshold might need tuning, e.g., 1.5 times MCP spread
  return tipSpread < mcpSpread * 1.7;
}

function isOpenHand(landmarks: HandLandmarks): boolean {
  if (!areAllFingersExtended(landmarks)) {
    return false;
  }
  // For open hand, fingers should be spread out.
  const indexTip = landmarks[LandmarkIndex.INDEX_FINGER_TIP];
  const pinkyTip = landmarks[LandmarkIndex.PINKY_TIP];
  const indexMcp = landmarks[LandmarkIndex.INDEX_FINGER_MCP];
  const pinkyMcp = landmarks[LandmarkIndex.PINKY_MCP];

  const tipSpread = distance(indexTip, pinkyTip);
  const mcpSpread = distance(indexMcp, pinkyMcp);

  // Tips should be spread wider than MCPs for an open hand
  // Threshold might need tuning, e.g., at least 1.5 times MCP spread
  return tipSpread > mcpSpread * 1.6;
}

function isTwoFingerV(landmarks: HandLandmarks): boolean {
  const wrist = landmarks[LandmarkIndex.WRIST];
  const indexExtended = isFingerExtended(
    landmarks[LandmarkIndex.INDEX_FINGER_TIP],
    landmarks[LandmarkIndex.INDEX_FINGER_PIP],
    landmarks[LandmarkIndex.INDEX_FINGER_MCP],
  );
  const middleExtended = isFingerExtended(
    landmarks[LandmarkIndex.MIDDLE_FINGER_TIP],
    landmarks[LandmarkIndex.MIDDLE_FINGER_PIP],
    landmarks[LandmarkIndex.MIDDLE_FINGER_MCP],
  );

  const ringCurled = isFingerCurled(
    landmarks[LandmarkIndex.RING_FINGER_TIP],
    landmarks[LandmarkIndex.RING_FINGER_PIP],
    landmarks[LandmarkIndex.RING_FINGER_MCP],
    wrist,
  );
  const pinkyCurled = isFingerCurled(
    landmarks[LandmarkIndex.PINKY_TIP],
    landmarks[LandmarkIndex.PINKY_PIP],
    landmarks[LandmarkIndex.PINKY_MCP],
    wrist,
  );

  // Optionally check thumb: often extended or to the side for a V sign
  // const thumbExtended = isFingerExtended(landmarks[LandmarkIndex.THUMB_TIP], landmarks[LandmarkIndex.THUMB_IP], landmarks[LandmarkIndex.THUMB_MCP]);

  if (indexExtended && middleExtended && ringCurled && pinkyCurled) {
    // Ensure index and middle fingers are spread apart for a 'V'
    const indexTip = landmarks[LandmarkIndex.INDEX_FINGER_TIP];
    const middleTip = landmarks[LandmarkIndex.MIDDLE_FINGER_TIP];
    const wristToIndexMcp = distance(
      landmarks[LandmarkIndex.WRIST],
      landmarks[LandmarkIndex.INDEX_FINGER_MCP],
    );

    // Spread threshold, e.g., 30% of the wrist-to-index-mcp distance
    const vSpreadThreshold = wristToIndexMcp * 0.3;
    return distance(indexTip, middleTip) > vSpreadThreshold;
  }
  return false;
}

export function recognizeHandPose(landmarks: HandLandmarks | null): HandPose {
  if (!landmarks || landmarks.length < 21) {
    return HandPose.NONE;
  }

  // Order of checks can matter if poses are similar.
  // More specific poses (like Two-Finger V) should ideally be checked before more general ones (like Open Hand).
  // Fist is usually quite distinct.
  if (isFist(landmarks)) {
    return HandPose.FIST;
  }
  if (isTwoFingerV(landmarks)) {
    return HandPose.TWO_FINGER_V;
  }
  // Check for Open Hand before Flat Hand, as Open Hand is a more specific "all extended and spread"
  if (isOpenHand(landmarks)) {
    return HandPose.OPEN_HAND;
  }
  if (isFlatHand(landmarks)) {
    return HandPose.FLAT_HAND;
  }

  return HandPose.NONE;
}
```

**Note:** The logic for `isFingerExtended` and `isFingerCurled`, and the specific thresholds within each pose detection function, are initial estimates. They will likely require significant tuning based on real-world testing and how MediaPipe's normalized coordinates behave with different hand sizes and camera angles. The `y` coordinate logic assumes a generally upright hand; a more robust solution might involve vector math (dot products, angles) to determine finger flexion/extension relative to the palm or MCP joints, irrespective of overall hand orientation.

**Step 3.2: Run `pnpm run t` and `pnpm test`**
Execute the following commands:

```bash
pnpm run t
pnpm test
```

Ensure they pass.

**Phase 4: Display Active Hand Pose on UI**

**Step 4.1: Modify `src/components/hands/HandTracking.tsx`**
Update the component to display the recognized hand pose.

```typescript
import React from 'react';
import { useHandTracking } from './useHandTracking'; // Ensure HandPose is exported if used directly
import { HandPose } from './handPoseTypes'; // Explicit import
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ThreeScene from './ThreeScene';

interface HandTrackingProps {
  showHandTracking: boolean;
  setShowHandTracking: (show: boolean) => void;
}

export default function HandTracking({ showHandTracking, setShowHandTracking }: HandTrackingProps) {
  const {
    videoRef,
    landmarkCanvasRef,
    handPosition,
    handTrackingStatus,
    activeHandPose, // Added
  } = useHandTracking({ enabled: showHandTracking });

  return (
    <>
      {/* Three.js scene with hand position tracking */}
      <div className="fixed inset-0" style={{ pointerEvents: 'auto' }}>
        {showHandTracking && <ThreeScene handPosition={handPosition} />}
      </div>

      {/* Hand tracking controls */}
      <div className="absolute top-5 right-5 flex flex-col gap-3 z-30" style={{ pointerEvents: 'auto' }}>
        <div className="flex items-center space-x-2 bg-black bg-opacity-50 p-2 rounded">
          <Switch
            id="hand-tracking"
            checked={showHandTracking}
            onCheckedChange={setShowHandTracking}
          />
          <Label htmlFor="hand-tracking" className="text-white">Hand Tracking</Label>
        </div>

        {showHandTracking && (
          <>
            <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs">
              Status: {handTrackingStatus}
            </p>
            {/* Display active hand pose */}
            <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs">
              Pose: {activeHandPose === HandPose.NONE ? 'N/A' : activeHandPose}
            </p>
          </>
        )}
      </div>

      {/* Hidden video element for camera input */}
      {showHandTracking && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute w-full h-full object-cover transform scale-x-[-1]"
          style={{ top: 0, left: 0, zIndex: 1, opacity: 0, pointerEvents: 'none' }}
        />
      )}

      {/* Canvas for hand landmarks */}
      <canvas
        ref={landmarkCanvasRef}
        className="absolute w-full h-full transform scale-x-[-1]"
        style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
      />
    </>
  );
}
```

**Step 4.2: Run `pnpm run t` and `pnpm test`**
Execute:

```bash
pnpm run t
pnpm test
```

Confirm that both commands pass. Now, when you enable hand tracking in the UI, you should see the recognized pose name displayed.

This completes the implementation. You will likely need to iterate on the thresholds and specific conditions within `handPoseRecognition.ts` by testing with your webcam to achieve reliable detection for each pose. Good luck!
