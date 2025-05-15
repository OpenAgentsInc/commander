import * as THREE from 'three'
import React, { useRef, useReducer, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

// Define prop types for cleaner code
interface CubeProps {
  position?: [number, number, number]
  children?: React.ReactNode
  vec?: THREE.Vector3
  scale?: number
  r?: typeof THREE.MathUtils.randFloatSpread
  color?: string
  [key: string]: any
}

// Pure whites only - no off-white to avoid any yellowish tint
const colors = ['#ffffff']

const shuffle = () => [
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 },
  { color: colors[0], roughness: 0.1, metalness: 0.9 }
]

function Cube({ position, children, vec = new THREE.Vector3(), scale, r = THREE.MathUtils.randFloatSpread, color = '#ffffff', ...props }: CubeProps) {
  // Using any type to work around Rapier typing issues
  const api = useRef<any>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const pos = useMemo(() => position || [r(10), r(10), r(10)] as [number, number, number], [position, r])

  useFrame((state, delta) => {
    delta = Math.min(0.1, delta)
    if (api.current) {
      // Handle physics API safely
      const translation = api.current.translation()
      api.current.applyImpulse(vec.copy(translation).negate().multiplyScalar(0.2))
    }
  })

  // Use cubic shape instead of sphere
  return (
    <RigidBody linearDamping={4} angularDamping={1} friction={0.1} position={pos} ref={api} colliders={false}>
      <CuboidCollider args={[0.5, 0.5, 0.5]} />
      <mesh ref={mesh} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.01} // Reduced emissive intensity
          roughness={0.1} // Increased roughness for less sharp reflections
          metalness={0.2} // Reduced metalness for less intense reflections
          {...props}
        />
        {children}
      </mesh>
    </RigidBody>
  )
}

function Pointer({ vec = new THREE.Vector3() }) {
  // Using any type to work around Rapier typing issues
  const ref = useRef<any>(null)
  useFrame(({ mouse, viewport }) => {
    if (ref.current) {
      ref.current.setNextKinematicTranslation(vec.set((mouse.x * viewport.width) / 2, (mouse.y * viewport.height) / 2, 0))
    }
  })
  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <CuboidCollider args={[0.5, 0.5, 0.5]} />
    </RigidBody>
  )
}

export default function PhysicsBallsScene() {
  const [, click] = useReducer((state) => (state + 1) % colors.length, 0)
  const connectors = useMemo(() => shuffle(), [])

  return (
    <>
      {/* Pure black background */}
      <color attach="background" args={['#000000']} />

      {/* Physics with proper config */}
      <Physics
        colliders={undefined}
        config={{
          gravity: [0, 0, 0],
          timeStep: "vary"
        }}
      >
        <Pointer />
        {connectors.map((props, i) => {
          return <Cube {...props} key={i} />
        })}
      </Physics>

      {/* Simplified lighting - just one soft ambient light */}
      <ambientLight intensity={0.1} color="#ffffff" />

      {/* Single distant directional light */}
      <directionalLight
        position={[15, 105, 15]}
        intensity={0.1}
        color="#ffffff"
      />

      {/* Add bloom effect with softer settings */}
      <EffectComposer>
        <Bloom
          intensity={0.2}            // Reduced intensity
          luminanceThreshold={0.25}   // Increased threshold to reduce over-bloom
          luminanceSmoothing={0.9}   // Keep smooth edges
          mipmapBlur                 // Use mipmap blur for better performance
        />
      </EffectComposer>
    </>
  )
}
