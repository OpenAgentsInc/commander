import React from 'react';

export interface HandSceneProps {
  rightHandPinchDistance: number | null;
  isLeftHandTouching: boolean;
}

// This component is now empty - we're just keeping the interface for compatibility
export default function InteractiveHandScene(): React.ReactElement | null {
  return null;
}