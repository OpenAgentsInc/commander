// src/components/hands/handPoseRecognition.ts
import { HandPose, type HandLandmarks, type Landmark } from './handPoseTypes';

// Landmark indices based on MediaPipe Hands
const LandmarkIndex = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5, INDEX_FINGER_PIP: 6, INDEX_FINGER_DIP: 7, INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9, MIDDLE_FINGER_PIP: 10, MIDDLE_FINGER_DIP: 11, MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13, RING_FINGER_PIP: 14, RING_FINGER_DIP: 15, RING_FINGER_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

// Helper function to calculate Euclidean distance between two 3D landmarks
function distance(p1: Landmark, p2: Landmark): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
}

// Helper to check if a finger is extended
// Condition: Tip is further away from MCP than PIP is from MCP.
// And Tip.y < PIP.y (assuming upright hand, smaller y is higher)
function isFingerExtended(tip: Landmark, pip: Landmark, mcp: Landmark): boolean {
  // A simple check: tip y-coordinate is less (higher on screen) than pip y-coordinate
  // and pip y-coordinate is less than mcp y-coordinate.
  // This assumes a somewhat upright hand.
  const verticalCheck = tip.y < pip.y && pip.y < mcp.y;

  // Check if the finger is somewhat straight by comparing distances
  // distance(mcp, tip) should be greater than distance(mcp, pip)
  const straightCheck = distance(mcp, tip) > distance(mcp, pip) * 0.9; // 0.9 allows slight bend

  return verticalCheck && straightCheck;
}

// Helper to check if a finger is curled (tip y > pip y, and tip close to MCP)
function isFingerCurled(tip: Landmark, pip: Landmark, mcp: Landmark, wrist: Landmark): boolean {
  const tipLowerThanPip = tip.y > pip.y;

  // Check if the tip is close to the MCP or palm (approximated by wrist-to-mcp distance)
  const referenceDistance = distance(wrist, mcp);
  const tipToMcpDistance = distance(tip, mcp);

  // If tip is closer to MCP than, say, 60% of the wrist-to-MCP distance, it's likely curled.
  // Or if tip is significantly "below" (larger y) its PIP
  const curledThreshold = referenceDistance * 0.7;

  return tipLowerThanPip && (tipToMcpDistance < curledThreshold || (tip.y - pip.y) > referenceDistance * 0.1);
}

function isFist(landmarks: HandLandmarks): boolean {
  const wrist = landmarks[LandmarkIndex.WRIST];
  const fingersCurled =
    isFingerCurled(landmarks[LandmarkIndex.INDEX_FINGER_TIP], landmarks[LandmarkIndex.INDEX_FINGER_PIP], landmarks[LandmarkIndex.INDEX_FINGER_MCP], wrist) &&
    isFingerCurled(landmarks[LandmarkIndex.MIDDLE_FINGER_TIP], landmarks[LandmarkIndex.MIDDLE_FINGER_PIP], landmarks[LandmarkIndex.MIDDLE_FINGER_MCP], wrist) &&
    isFingerCurled(landmarks[LandmarkIndex.RING_FINGER_TIP], landmarks[LandmarkIndex.RING_FINGER_PIP], landmarks[LandmarkIndex.RING_FINGER_MCP], wrist) &&
    isFingerCurled(landmarks[LandmarkIndex.PINKY_TIP], landmarks[LandmarkIndex.PINKY_PIP], landmarks[LandmarkIndex.PINKY_MCP], wrist);

  if (!fingersCurled) return false;

  // Thumb check: Thumb tip should be close to or across the curled fingers.
  // e.g. thumb tip y > thumb mcp y
  const thumbTip = landmarks[LandmarkIndex.THUMB_TIP];
  const thumbMcp = landmarks[LandmarkIndex.THUMB_MCP];
  const thumbPip = landmarks[LandmarkIndex.INDEX_FINGER_PIP]; // reference for y-level

  const thumbCurledOrAcross = thumbTip.y > thumbMcp.y || distance(thumbTip, thumbPip) < distance(landmarks[LandmarkIndex.WRIST], landmarks[LandmarkIndex.THUMB_MCP]) * 0.8;

  return thumbCurledOrAcross;
}

function areAllFingersExtended(landmarks: HandLandmarks): boolean {
  return (
    isFingerExtended(landmarks[LandmarkIndex.INDEX_FINGER_TIP], landmarks[LandmarkIndex.INDEX_FINGER_PIP], landmarks[LandmarkIndex.INDEX_FINGER_MCP]) &&
    isFingerExtended(landmarks[LandmarkIndex.MIDDLE_FINGER_TIP], landmarks[LandmarkIndex.MIDDLE_FINGER_PIP], landmarks[LandmarkIndex.MIDDLE_FINGER_MCP]) &&
    isFingerExtended(landmarks[LandmarkIndex.RING_FINGER_TIP], landmarks[LandmarkIndex.RING_FINGER_PIP], landmarks[LandmarkIndex.RING_FINGER_MCP]) &&
    isFingerExtended(landmarks[LandmarkIndex.PINKY_TIP], landmarks[LandmarkIndex.PINKY_PIP], landmarks[LandmarkIndex.PINKY_MCP]) &&
    isFingerExtended(landmarks[LandmarkIndex.THUMB_TIP], landmarks[LandmarkIndex.THUMB_IP], landmarks[LandmarkIndex.THUMB_MCP]) // Thumb uses IP instead of PIP
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
  const indexExtended = isFingerExtended(landmarks[LandmarkIndex.INDEX_FINGER_TIP], landmarks[LandmarkIndex.INDEX_FINGER_PIP], landmarks[LandmarkIndex.INDEX_FINGER_MCP]);
  const middleExtended = isFingerExtended(landmarks[LandmarkIndex.MIDDLE_FINGER_TIP], landmarks[LandmarkIndex.MIDDLE_FINGER_PIP], landmarks[LandmarkIndex.MIDDLE_FINGER_MCP]);

  const ringCurled = isFingerCurled(landmarks[LandmarkIndex.RING_FINGER_TIP], landmarks[LandmarkIndex.RING_FINGER_PIP], landmarks[LandmarkIndex.RING_FINGER_MCP], wrist);
  const pinkyCurled = isFingerCurled(landmarks[LandmarkIndex.PINKY_TIP], landmarks[LandmarkIndex.PINKY_PIP], landmarks[LandmarkIndex.PINKY_MCP], wrist);

  if (indexExtended && middleExtended && ringCurled && pinkyCurled) {
    // Ensure index and middle fingers are spread apart for a 'V'
    const indexTip = landmarks[LandmarkIndex.INDEX_FINGER_TIP];
    const middleTip = landmarks[LandmarkIndex.MIDDLE_FINGER_TIP];
    const wristToIndexMcp = distance(landmarks[LandmarkIndex.WRIST], landmarks[LandmarkIndex.INDEX_FINGER_MCP]);

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