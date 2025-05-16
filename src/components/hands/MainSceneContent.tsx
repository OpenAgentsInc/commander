import React, { useEffect, useRef, useMemo } from 'react';
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

  // Create a stable, fixed set of box positions that won't re-randomize
  const boxPositions = useMemo(() => {
    // Generate positions in a consistent grid pattern instead of random
    const positions: [number, number, number][] = [];
    
    // Create a 4x4 grid of boxes
    for (let x = -3; x <= 3; x += 2) {
      for (let y = -3; y <= 3; y += 2) {
        for (let z = -3; z <= 3; z += 6) { // Only two layers of depth
          positions.push([x, y, z]);
        }
      }
    }
    
    return positions;
  }, []);
  
  // Animation loop for rotating the boxes - very gentle rotation
  useFrame((state, delta) => {
    if (boxesRef.current) {
      boxesRef.current.rotation.y += delta * 0.05; // Only rotate around Y axis
      invalidate();
    }
  });

  return (
    <>
      {/* Group of boxes in a predictable grid pattern */}
      <group ref={boxesRef}>
        {boxPositions.map((position, i) => (
          <mesh 
            key={i} 
            position={position}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffffff" /> 
          </mesh>
        ))}
      </group>

      {/* Simple lighting */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[0, 10, 10]} intensity={1.0} />
    </>
  );
});

export default MainSceneContent;