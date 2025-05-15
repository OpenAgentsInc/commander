// src/components/r3f/BackgroundScene.tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -3]}> {/* Pushed back slightly */}
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="hsl(var(--primary))" roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

export default function BackgroundScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <RotatingCube />
      {/* You can add more elements to your scene here */}
    </>
  );
}