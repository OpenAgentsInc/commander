import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { HandPosition } from './useHandTracking';

interface DynamicPointerProps {
  handPosition: HandPosition;
  vec?: THREE.Vector3;
}

export function DynamicPointer({ handPosition, vec = new THREE.Vector3() }: DynamicPointerProps) {
  const ref = useRef<any>(null);
  const { invalidate, viewport } = useThree();

  useFrame(() => {
    if (ref.current && handPosition) {
      // Map hand position (0-1) to viewport coordinates
      // Invert X to match mirrored hand tracking, shift Y to match viewport
      const x = (1 - handPosition.x) * viewport.width - viewport.width / 2;
      const y = (1 - handPosition.y) * viewport.height - viewport.height / 2;

      vec.set(x, y, 0);
      ref.current.setNextKinematicTranslation(vec);
      invalidate();
    }
  });

  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <CuboidCollider args={[1.5, 1.5, 1.5]} />
      {/* Invisible mesh for the hand pointer */}
      <mesh visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#00ff00" wireframe />
      </mesh>
    </RigidBody>
  );
}