import React from 'react';
import { Canvas } from '@react-three/fiber';
import { HandPosition } from './useHandTracking';

// Simplified scene with minimal components to avoid WebGL context loss
const MinimalSceneContent = React.memo(() => {
  return (
    <>
      <color attach="background" args={['#222222']} /> {/* Noticeable background */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      <ambientLight intensity={Math.PI} />
    </>
  );
});

interface ThreeSceneProps {
  handPosition: HandPosition | null;
}

export default function ThreeScene({ handPosition }: ThreeSceneProps) {
  console.log("ThreeScene rendering, handPosition:", handPosition); // Check if it even tries to render
  
  return (
    <Canvas 
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      frameloop="always" // Changed from "demand" to "always" for stability testing
      dpr={1} // Set to fixed value for stability
    >
      <MinimalSceneContent />
    </Canvas>
  );
}