import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';

interface MousePointerProps {
  vec?: THREE.Vector3;
}

export function MousePointer({ vec = new THREE.Vector3() }: MousePointerProps) {
  const ref = useRef<any>(null);
  const { invalidate, viewport, mouse } = useThree();

  useFrame(() => {
    if (ref.current) {
      // Map mouse position to viewport coordinates
      const x = (mouse.x * viewport.width) / 2;
      const y = (mouse.y * viewport.height) / 2;

      vec.set(x, y, 0);
      ref.current.setNextKinematicTranslation(vec);
      invalidate();
    }
  });

  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <CuboidCollider args={[1, 1, 1]} />
    </RigidBody>
  );
}