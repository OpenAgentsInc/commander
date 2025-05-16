import React, { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { HandPosition } from './useHandTracking';
import { DynamicPointer } from './DynamicPointer';
import { MousePointer } from './MousePointer';

// Memoized Canvas component without postprocessing effects to prevent conflicts
const R3FBackground = React.memo(({ handPosition }: { handPosition: HandPosition | null }) => {
  const { invalidate } = useThree();

  // Request frames on mouse move
  useEffect(() => {
    const handleMouseMove = () => invalidate();
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [invalidate]);

  return (
    <>
      <color attach="background" args={['#000000']} />

      {/* Environment for reflections with a preset that's more likely to be available */}
      <Environment preset="sunset" />

      <Physics colliders={undefined} gravity={[6.4, 6.4, 4.4]}>
        {/* Use hand position for the pointer if available, otherwise use mouse */}
        {handPosition ? (
          <DynamicPointer handPosition={handPosition} />
        ) : (
          <MousePointer />
        )}

        {/* Scene objects */}
        {Array.from({ length: 16 }).map((_, i) => (
          <RigidBody
            key={i}
            linearDamping={4}
            angularDamping={1}
            friction={0.1}
            position={[THREE.MathUtils.randFloatSpread(10), THREE.MathUtils.randFloatSpread(10), THREE.MathUtils.randFloatSpread(10)]}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial
                color="#ffffff"
                roughness={0.1}
                metalness={0.9}
                envMapIntensity={1}
              />
            </mesh>
          </RigidBody>
        ))}
      </Physics>

      {/* Enhanced lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} castShadow />
      <pointLight position={[10, 10, 10]} intensity={1} />
    </>
  );
});

interface ThreeSceneProps {
  handPosition: HandPosition | null;
}

export default function ThreeScene({ handPosition }: ThreeSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 30], fov: 17.5, near: 10, far: 40 }}
      shadows
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      frameloop="demand"
      performance={{ min: 0.5 }}
    >
      <R3FBackground handPosition={handPosition} />
    </Canvas>
  );
}