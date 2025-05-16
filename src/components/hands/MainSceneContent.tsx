import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore - Ignore TypeScript errors for postprocessing
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { HandPosition } from './useHandTracking';
import { HandPose } from './handPoseTypes';

interface MainSceneContentProps {
  handPosition: HandPosition | null;
  activeHandPose: HandPose;
}

// Enhanced scene content with hand gesture-based rotation and bloom effect
const MainSceneContent = React.memo(({ handPosition, activeHandPose }: MainSceneContentProps) => {
  const { invalidate, camera, scene } = useThree();
  const boxesRef = useRef<THREE.Group>(null);
  const [rotationDirection, setRotationDirection] = useState<number>(1); // 1 for clockwise, -1 for counter
  
  // Set up scene when first mounted
  useEffect(() => {
    // Set black background to scene
    scene.background = new THREE.Color('#000000');
    // Set up camera
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);
    invalidate();
    
    // Scene initialized
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
  
  // Check hand pose and adjust rotation direction
  useEffect(() => {
    if (activeHandPose === HandPose.FLAT_HAND) {
      setRotationDirection(1); // Clockwise for flat hand
      // FLAT_HAND detected - rotating clockwise
    } else if (activeHandPose === HandPose.OPEN_HAND) {
      setRotationDirection(-1); // Counter-clockwise for open hand
      // OPEN_HAND detected - rotating counter-clockwise
    }
    // Other poses keep the current direction but will rotate slower
  }, [activeHandPose]);
  
  // Animation loop for rotating the boxes based on hand pose
  useFrame((state, delta) => {
    if (boxesRef.current) {
      // Determine rotation speed based on pose
      let rotationSpeed = 0.05;
      
      if (activeHandPose === HandPose.FLAT_HAND || activeHandPose === HandPose.OPEN_HAND) {
        // MUCH faster speed for detected gesture
        rotationSpeed = 0.5; // 5x faster than before
      } else {
        // Much slower for any other pose
        rotationSpeed = 0.01;
      }
      
      // Apply rotation in the current direction
      boxesRef.current.rotation.y += delta * rotationSpeed * rotationDirection;
      invalidate();
    }
  });

  return (
    <>
      {/* Group of boxes in a predictable grid pattern - all shiny white with bloom */}
      <group ref={boxesRef}>
        {boxPositions.map((position, i) => (
          <mesh 
            key={i} 
            position={position}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial 
              color="#333333" // Dark gray base color for contrast with reflections
              emissive="#ffffff"
              emissiveIntensity={0.05} // Just enough to see in darkness
              roughness={0.01} // Super shiny surface
              metalness={1.0} // Fully metallic for maximum reflections
              envMapIntensity={5.0} // Very strong environment reflections
            /> 
          </mesh>
        ))}
      </group>

      {/* Darker lighting with more contrast */}
      <ambientLight intensity={0.1} /* Balanced for darkness but some visibility */ />
      
      {/* Main directional light with shadows */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1.2} /* Strong main light for highlights */
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />

      {/* Reduced point light intensity but kept the multiple lights for highlights */}
      <pointLight position={[10, 10, 10]} intensity={1.5} /* Bright highlight source */ />
      <pointLight position={[-10, -10, -10]} intensity={0.1} /* Secondary dim light */ />
      <pointLight position={[-10, 10, -10]} intensity={0.9} /* Another strong highlight source */ />
      <pointLight position={[10, -10, -10]} intensity={0.2} /* Dim background light */ />
      
      {/* Add bloom effect with better contrast settings */}
      <EffectComposer>
        <Bloom
          intensity={1.2}             // Strong bloom on bright spots
          luminanceThreshold={0.5}    // Only brightest reflections bloom
          luminanceSmoothing={0.7}    // Sharper bloom edges
          mipmapBlur                  // Use mipmap blur for better performance
        />
      </EffectComposer>
    </>
  );
});

export default MainSceneContent;