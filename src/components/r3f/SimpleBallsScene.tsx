import * as THREE from "three";
import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

const accents = ["#ff4060", "#ffcc00", "#20ffa0", "#4060ff"];

interface BallProps {
  position: [number, number, number];
  color?: string;
  speed?: number;
  size?: number;
}

function Ball({ position, color = "white", speed = 1, size = 1 }: BallProps) {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    // Simple animation without physics
    if (mesh.current) {
      mesh.current.rotation.x += delta * speed * 0.5;
      mesh.current.rotation.y += delta * speed * 0.2;

      // Add a small oscillation to position
      mesh.current.position.y +=
        Math.sin(state.clock.elapsedTime * speed) * 0.01;
    }
  });

  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.8}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

export default function SimpleBallsScene() {
  const [accentIndex, setAccentIndex] = useState(0);
  const accent = accents[accentIndex];

  // Create an array of ball configs
  const balls = useMemo(() => {
    // Create 20 random balls with different positions, sizes and colors
    return Array.from({ length: 15 }, (_, i) => {
      const isAccent = i % 3 === 0;
      return {
        position: [
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 10 - 5,
        ],
        color: isAccent ? accent : i % 2 === 0 ? "white" : "#444",
        speed: 0.5 + Math.random() * 2,
        size: 0.5 + Math.random() * 1.0,
        key: i,
      };
    });
  }, [accent]);

  // Handle click to change accent color
  const handleClick = () => {
    setAccentIndex((accentIndex + 1) % accents.length);
  };

  return (
    <group onClick={handleClick}>
      <color attach="background" args={["#141622"]} />

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <pointLight position={[0, 0, 5]} intensity={0.5} color="white" />

      {/* Balls */}
      {balls.map((ball) => (
        <Ball
          key={ball.key}
          position={ball.position as [number, number, number]}
          color={ball.color}
          speed={ball.speed}
          size={ball.size}
        />
      ))}

      {/* Environment lighting */}
      <Environment preset="city" />
    </group>
  );
}
