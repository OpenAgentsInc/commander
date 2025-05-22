// src/components/r3f/BackgroundScene.tsx
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Skip TypeScript checks and use dynamic imports to handle the components
// @ts-ignore - Ignore TypeScript errors for postprocessing
import { EffectComposer, Bloom } from "@react-three/postprocessing";

function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null!);

  // Use a ref to track if the user is currently interacting with the cube
  const isUserControlling = useRef(false);

  useFrame((_state, delta) => {
    // Only auto-rotate if user is not controlling
    if (meshRef.current && !isUserControlling.current) {
      // Increased rotation speed
      meshRef.current.rotation.x += delta * 0.3; // 3x faster
      meshRef.current.rotation.y += delta * 0.4; // ~2.7x faster
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0]} // Centered position
      onPointerDown={() => {
        isUserControlling.current = true;
      }}
      onPointerUp={() => {
        isUserControlling.current = false;
      }}
      onPointerLeave={() => {
        isUserControlling.current = false;
      }}
    >
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial
        color="hsl(var(--primary))"
        roughness={0.3}
        metalness={0.8}
        emissive="hsl(var(--primary))"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

export default function BackgroundScene() {
  return (
    <>
      {/* Post-processing effects */}
      <EffectComposer>
        {/* Bloom with adjusted parameters for stronger effect */}
        <Bloom
          intensity={1.0}
          luminanceThreshold={0.1} // Lowered threshold to catch more light
          luminanceSmoothing={0.9}
        />
      </EffectComposer>

      {/* Improved orbit controls */}
      <OrbitControls
        makeDefault
        enableZoom={true}
        enablePan={false}
        enableRotate={true}
        minDistance={2}
        maxDistance={10}
        autoRotate={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI - Math.PI / 6}
      />

      {/* Increased ambient light for better overall illumination */}
      <ambientLight intensity={0.05} />

      {/* Soft directional lights from distance */}
      <directionalLight position={[5, 5, 5]} intensity={0.4} color="#ffffff" />

      {/* Add soft spotlight for diffuse glow */}
      <spotLight
        position={[0, 5, 5]}
        angle={0.6}
        penumbra={0.4} // More diffuse edges
        intensity={1.5}
        color="#ffffff"
        castShadow
        distance={20}
      />

      <RotatingCube />
    </>
  );
}
