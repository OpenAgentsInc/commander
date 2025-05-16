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