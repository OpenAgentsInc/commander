// src/components/hands/handPoseTypes.ts
export enum HandPose {
  FIST = "Fist",
  TWO_FINGER_V = "Two-Finger V",
  FLAT_HAND = "Flat Hand",
  OPEN_HAND = "Open Hand",
  PINCH_CLOSED = "Pinch Closed", // Thumb and index finger are close together
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

// For use with the pinch gesture
export interface PinchCoordinates {
  x: number;
  y: number;
  z?: number; // Optional depth
}