import * as THREE from 'three'
import React, { useRef, useReducer, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
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

  const { invalidate } = useThree()

  useFrame((state, delta) => {
    delta = Math.min(0.1, delta)
    if (api.current) {
      // Handle physics API safely
      const translation = api.current.translation()
      api.current.applyImpulse(vec.copy(translation).negate().multiplyScalar(0.2))

      // Request another frame if there's movement
      const velocity = api.current.linvel();
      if (Math.abs(velocity.x) > 0.01 || Math.abs(velocity.y) > 0.01 || Math.abs(velocity.z) > 0.01) {
        invalidate();
      }
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
          emissiveIntensity={0.05}
          roughness={0.2}
          metalness={0.8}
          envMapIntensity={1.5}
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
  const prevPos = useRef<THREE.Vector3>(new THREE.Vector3())
  const { invalidate } = useThree()

  useFrame(({ mouse, viewport }) => {
    if (ref.current) {
      // Calculate new position
      const newPos = vec.set(
        (mouse.x * viewport.width) / 2,
        (mouse.y * viewport.height) / 2,
        0
      )

      // Check if position has changed significantly
      if (newPos.distanceTo(prevPos.current) > 0.01) {
        ref.current.setNextKinematicTranslation(newPos)
        prevPos.current.copy(newPos)
        invalidate() // Request a new frame when the pointer moves
      }
    }
  })

  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <CuboidCollider args={[0.5, 0.5, 0.5]} />
    </RigidBody>
  )
}

// Frame requester component that ensures animations continue
function FrameRequester() {
  const { invalidate } = useThree()

  useEffect(() => {
    // Set up a timer to request frames at a lower rate when not interacting
    const interval = setInterval(() => {
      invalidate(); // Request a new frame
    }, 1000 / 30); // 30 fps when idle

    return () => clearInterval(interval);
  }, [invalidate]);

  return null;
}

export default function PhysicsBallsScene() {
  const [, click] = useReducer((state) => (state + 1) % colors.length, 0)
  const connectors = useMemo(() => shuffle(), [])
  const { invalidate } = useThree()

  // Request a frame whenever mouse moves
  useEffect(() => {
    const handleMouseMove = () => {
      invalidate();
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [invalidate]);

  return (
    <>
      <FrameRequester />

      {/* Pure black background */}
      <color attach="background" args={['#000000']} />

      {/* Physics with proper config */}
      <Physics
        colliders={undefined}
        gravity={[0, 0, 0]}
      >
        <Pointer />
        {connectors.map((props, i) => {
          return <Cube {...props} key={i} />
        })}
      </Physics>

      {/* Enhanced lighting setup */}
      <ambientLight intensity={0.2} />

      {/* Main directional light with shadows */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 0.1, 50]} />
      </directionalLight>

      {/* Fill light from opposite direction */}
      <directionalLight
        position={[-5, -5, -5]}
        intensity={0.3}
      />

      {/* Add some rim lighting */}
      <pointLight position={[0, 5, -5]} intensity={0.5} />

      {/* Add bloom effect with softer settings */}
      {/* <EffectComposer>
        <Bloom
          intensity={0.2}            // Reduced intensity
          luminanceThreshold={0.25}   // Increased threshold to reduce over-bloom
          luminanceSmoothing={0.9}   // Keep smooth edges
          mipmapBlur                 // Use mipmap blur for better performance
        />
      </EffectComposer> */}
    </>
  )
}
