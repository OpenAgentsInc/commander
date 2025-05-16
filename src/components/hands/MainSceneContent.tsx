import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HandPosition } from './useHandTracking';

interface MainSceneContentProps {
  handPosition: HandPosition | null;
}

// Super simplified scene content - absolute minimum to work reliably
const MainSceneContent = React.memo(({ handPosition }: MainSceneContentProps) => {
  const { invalidate, camera, scene } = useThree();
  const boxesRef = useRef<THREE.Group>(null);
  const handSphereRef = useRef<THREE.Mesh>(null);

  // Set up scene when first mounted
  useEffect(() => {
    // Set black background to scene
    scene.background = new THREE.Color('#000000');
    // Set up camera
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);
    invalidate();
    
    console.log("[MainSceneContent] Scene initialized with black background");
  }, [camera, scene, invalidate]);

  useEffect(() => {
    // Log hand position for debugging
    console.log("[MainSceneContent] Hand position updated:", handPosition);
  }, [handPosition]);

  // Animation loop for rotating the boxes
  useFrame((state, delta) => {
    if (boxesRef.current) {
      boxesRef.current.rotation.x += delta * 0.1;
      boxesRef.current.rotation.y += delta * 0.2;
      invalidate();
    }
    
    // Update hand position visualization if available
    if (handPosition && handSphereRef.current) {
      // Map normalized hand position to scene coordinates
      // X is mirrored (1-x) to match camera view, scaled to scene size
      const x = (1 - handPosition.x) * 10 - 5; // Range from -5 to 5
      const y = (1 - handPosition.y) * 10 - 5; // Range from -5 to 5
      
      handSphereRef.current.position.x = x;
      handSphereRef.current.position.y = y;
      invalidate();
    }
  });

  return (
    <>
      {/* Group of boxes - static cubes instead of physics */}
      <group ref={boxesRef}>
        {Array.from({ length: 16 }).map((_, i) => {
          const position = [
            THREE.MathUtils.randFloatSpread(10),
            THREE.MathUtils.randFloatSpread(10),
            THREE.MathUtils.randFloatSpread(10)
          ];
          
          return (
            <mesh 
              key={i} 
              position={position as [number, number, number]} 
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#ffffff" /> 
            </mesh>
          );
        })}
      </group>

      {/* Hand position visualization */}
      {handPosition && (
        <mesh 
          ref={handSphereRef}
          position={[0, 0, 3]} // Default position updated in useFrame
        >
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="hotpink" />
        </mesh>
      )}

      {/* Simple lighting */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[0, 10, 10]} intensity={1.0} />
    </>
  );
});

export default MainSceneContent;