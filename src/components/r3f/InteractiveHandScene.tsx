import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Helper function to generate random neon colors
function getRandomNeonColor() {
  const neonColors = [
    0xFF00FF, // Magenta
    0x00FFFF, // Cyan
    0xFF3300, // Neon Orange
    0x39FF14, // Neon Green
    0xFF0099, // Neon Pink
    0x00FF00, // Lime
    0xFF6600, // Neon Orange-Red
    0xFFFF00  // Yellow
  ];
  return neonColors[Math.floor(Math.random() * neonColors.length)];
}

interface InteractiveSphereProps {
  rightHandPinchDistance: number | null; // Normalized distance (e.g., 0 to 0.3)
  isLeftHandTouching: boolean;
  initialSphereColor?: number;
}

function InteractiveSphere({ rightHandPinchDistance, isLeftHandTouching, initialSphereColor = 0xff00ff }: InteractiveSphereProps) {
  const sphereGroupRef = useRef<THREE.Group>(null!);
  const solidMeshRef = useRef<THREE.Mesh>(null!);

  const [sphereColor, setSphereColor] = useState(initialSphereColor);
  const [lastColorChangeTime, setLastColorChangeTime] = useState(0);
  const colorChangeDelay = 500; // ms

  const [currentSphereSize, setCurrentSphereSize] = useState(1.0);
  const targetSphereSizeRef = useRef(1.0);
  const smoothingFactor = 0.15;

  // Handle sphere size based on right hand pinch
  useEffect(() => {
    if (rightHandPinchDistance !== null) {
      let targetSize = 1.0;
      // Map pinch distance (e.g., 0.0 to 0.3) to sphere size (e.g., 0.2 to 2.0)
      const minPinch = 0.03; // Smaller distance
      const maxPinch = 0.20; // Larger distance
      const minSize = 0.2;
      const maxSize = 2.0;

      if (rightHandPinchDistance < minPinch) {
        targetSize = minSize;
      } else if (rightHandPinchDistance > maxPinch) {
        targetSize = maxSize;
      } else {
        targetSize = minSize + ((rightHandPinchDistance - minPinch) * (maxSize - minSize)) / (maxPinch - minPinch);
      }
      targetSphereSizeRef.current = targetSize;
    }
  }, [rightHandPinchDistance]);

  // Handle sphere color change based on left hand touch
  useEffect(() => {
    if (isLeftHandTouching) {
      const currentTime = Date.now();
      if (currentTime - lastColorChangeTime > colorChangeDelay) {
        setSphereColor(getRandomNeonColor());
        setLastColorChangeTime(currentTime);
      }
    }
  }, [isLeftHandTouching, lastColorChangeTime]);

  useFrame(() => {
    if (sphereGroupRef.current) {
      sphereGroupRef.current.rotation.x += 0.003;
      sphereGroupRef.current.rotation.y += 0.008;

      // Smoothly interpolate sphere size
      const newSize = currentSphereSize + (targetSphereSizeRef.current - currentSphereSize) * smoothingFactor;
      setCurrentSphereSize(newSize);
      sphereGroupRef.current.scale.set(newSize, newSize, newSize);

      // Pulsing glow effect for solid mesh
      if (solidMeshRef.current && solidMeshRef.current.material) {
        const time = Date.now() * 0.001;
        const pulseIntensity = 0.1 * Math.sin(time * 2) + 0.9;
        (solidMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.1 * pulseIntensity;
      }
    }
  });

  return (
    <group ref={sphereGroupRef}>
      {/* Solid Mesh */}
      <mesh ref={solidMeshRef}>
        <sphereGeometry args={[2, 32, 32]} /> {/* Base radius 2 */}
        <meshBasicMaterial
          color={sphereColor}
          transparent={true}
          opacity={0.5}
        />
      </mesh>
      {/* Wireframe Mesh */}
      <mesh>
        <sphereGeometry args={[2, 32, 32]} /> {/* Base radius 2 */}
        <meshBasicMaterial color={0xffffff} wireframe={true} transparent={true} />
      </mesh>
    </group>
  );
}

export interface HandSceneProps {
  rightHandPinchDistance: number | null;
  isLeftHandTouching: boolean;
}

export default function InteractiveHandScene({ rightHandPinchDistance, isLeftHandTouching }: HandSceneProps) {
  const { scene } = useThree();

  useEffect(() => {
    // Make the sphere more visible with better lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5);
    
    scene.add(ambientLight);
    scene.add(directionalLight);
    
    // Set black background for better contrast
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 50);
    
    return () => {
      scene.remove(ambientLight);
      scene.remove(directionalLight);
      scene.background = null;
      scene.fog = null;
    };
  }, [scene]);

  return (
    <>
      {/* Add a point light for extra glow */}
      <pointLight position={[0, 0, 5]} intensity={0.8} color={0xffffff} />
      
      <InteractiveSphere
        rightHandPinchDistance={rightHandPinchDistance} 
        isLeftHandTouching={isLeftHandTouching}
        initialSphereColor={0x39FF14} // Start with bright neon green
      />
    </>
  );
}