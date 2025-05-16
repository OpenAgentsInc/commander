Okay, here are the instructions for a coding agent to add a MediaPipe hand tracking demo to the codebase, based on the provided `index.html` example.

**Goal:** Implement an initial demo of MediaPipe hand tracking integrated with a Three.js scene (using `@react-three/fiber`) within the Electron/React application. The demo should replicate the core functionality of the provided `index.html` example, including webcam display, hand landmark visualization, and a 3D sphere that reacts to hand gestures.

**Log your work in a new file: `docs/logs/YYYYMMDD/mediapipe-handtracking-demo.md` (replace YYYYMMDD with the current date).**

---

**Phase 1: Setup and File Creation**

1.  **Install Dependencies:**

    **THIS STEP IS DONE - IGNORE IT**

    Open your terminal in the project root and run:
    ```bash
    pnpm add @mediapipe/hands @mediapipe/drawing_utils @mediapipe/camera_utils three @react-three/fiber @react-three/drei
    pnpm add -D @types/three
    ```

2.  **Prepare MediaPipe Assets:**
    *   Create a directory `public/mediapipe/hands`.
    *   Locate the MediaPipe Hands solution files in your `node_modules/@mediapipe/hands/`. These files typically include:
        *   `hands_solution_packed.js`
        *   `hands_solution_simd_wasm_intermediate.js`
        *   `hands_solution_simd_wasm_worker.js`
        *   `hands.binarypb`
        *   (Possibly others, check the `@mediapipe/hands` package contents for files like `hands_LANDMARKS_LITE.binarypb`, `hands_LANDMARKS_FULL.binarypb` etc. if model complexity options are used. For modelComplexity: 1, `hands.binarypb` might be the primary model file).
    *   Copy these files into the `public/mediapipe/hands/` directory. Vite will serve files from the `public` directory at the root of your application (e.g., `/mediapipe/hands/hands.binarypb`).

3.  **Create New Page Component:**
    *   Create a new file: `src/pages/HandTrackingDemoPage.tsx`.

4.  **Create R3F Scene Component:**
    *   Create a new directory: `src/components/r3f/`.
    *   Create a new file: `src/components/r3f/InteractiveHandScene.tsx`.

5.  **Add Route for the New Page:**
    *   Open `src/routes/routes.tsx`.
    *   Import the new page: `import HandTrackingDemoPage from "@/pages/HandTrackingDemoPage";` (adjust path if necessary).
    *   Define a new route:
        ```typescript
        export const HandTrackingDemoRoute = createRoute({
          getParentRoute: () => RootRoute,
          path: "/hand-tracking-demo",
          component: HandTrackingDemoPage,
        });
        ```
    *   Add `HandTrackingDemoRoute` to the `rootTree`:
        ```typescript
        // In src/routes/routes.tsx
        // export const rootTree = RootRoute.addChildren([HomeRoute, SecondPageRoute]); // Old
        export const rootTree = RootRoute.addChildren([HomeRoute, SecondPageRoute, HandTrackingDemoRoute]); // New
        ```

6.  **Add Navigation Link (Temporary):**
    *   For easy access during development, open `src/pages/HomePage.tsx`.
    *   Import `Link` from `@tanstack/react-router`: `import { Link } from "@tanstack/react-router";`
    *   Add a temporary button/link to navigate to the demo page within the JSX of `HomePage`:
        ```tsx
        // In HomePage.tsx, within the main div
        <div className="mt-4">
          <Link to="/hand-tracking-demo">
            <Button>Hand Tracking Demo</Button>
          </Link>
        </div>
        ```
    *(This can be moved to a more permanent navigation component later, like `NavigationMenu.tsx` if desired)*

---

**Phase 2: Implement `InteractiveHandScene.tsx` (R3F Scene)**

This component will manage the Three.js part of the demo.

```typescript
// src/components/r3f/InteractiveHandScene.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Helper function to generate random neon colors (from example)
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
      // This mapping is from the example, adjust min/max pinch as needed
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

  useFrame((_state, delta) => {
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
        <meshBasicMaterial color={0xffffff} wireframe={true} transparent={false} />
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
    // Add ambient light to the main R3F scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    return () => {
      scene.remove(ambientLight);
    };
  }, [scene]);

  return (
    <>
      <InteractiveSphere
        rightHandPinchDistance={rightHandPinchDistance}
        isLeftHandTouching={isLeftHandTouching}
      />
    </>
  );
}
```

---

**Phase 3: Implement `HandTrackingDemoPage.tsx`**

This component will handle webcam, MediaPipe, and orchestrate data flow.

```typescript
// src/pages/HandTrackingDemoPage.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, Results as HandResults, LandmarkConnectionArray } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks, HAND_CONNECTIONS } from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils';
import { Canvas as R3FCanvas } from '@react-three/fiber';
import InteractiveHandScene, { HandSceneProps } from '@/components/r3f/InteractiveHandScene';

const HandTrackingDemoPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const handsRef = useRef<Hands | null>(null);

  const [status, setStatus] = useState('Loading MediaPipe...');
  const [handSceneProps, setHandSceneProps] = useState<HandSceneProps>({
    rightHandPinchDistance: null,
    isLeftHandTouching: false,
  });

  // Helper to calculate distance between two 3D landmarks
  const calculateDistance = (p1: any, p2: any) => {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  };

  // Helper to check if a point is near the sphere (simplified from example)
  // Example assumes sphere is at [0,0,0] in normalized 3D space of landmarks.
  // World coordinates are -0.5 to 0.5 for x and y after normalization.
  const isPointNearSphere = (point: any, sphereRadiusNormalized = 0.2) => {
      // Normalize point to be around 0,0 for center screen
      const worldX = point.x - 0.5;
      const worldY = 0.5 - point.y; // Invert Y
      // Assuming sphere center is (0,0) in this normalized space and point.z is depth relative to wrist
      const distance = Math.sqrt(worldX * worldX + worldY * worldY + (point.z * point.z));
      // The sphere's effective radius in this normalized space.
      // The actual 3D sphere has radius 2, but its projection changes.
      // This needs calibration. A simpler interaction is to check if the hand is roughly in the center.
      // Let's assume the sphere visually takes up about 0.2 of the normalized screen width/height.
      return distance < sphereRadiusNormalized * handSceneProps.rightHandPinchDistance!; // Scale with sphere size
  };


  const onResults = useCallback((results: HandResults) => {
    if (!landmarkCanvasRef.current) return;

    const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);

    let newRightHandPinch: number | null = null;
    let newIsLeftTouching = false;
    let handsDetected = 0;

    if (results.multiHandLandmarks && results.multiHandedness) {
      handsDetected = results.multiHandLandmarks.length;
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        const isRightHand = classification.label === 'Right';
        const landmarks = results.multiHandLandmarks[index];

        // Draw landmarks and connectors
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS as LandmarkConnectionArray, { color: isRightHand ? '#00FF00' : '#FF0000', lineWidth: 5 });
        drawLandmarks(canvasCtx, landmarks, { color: isRightHand ? '#FFFFFF' : '#CCCCCC', lineWidth: 2, radius: (landmarkData) => {
            // Make thumb and index fingertips slightly larger like in example
            return (landmarkData.index === 4 || landmarkData.index === 8) ? 8 : 5;
        }});

        if (isRightHand && landmarks.length > 8) {
          const thumbTip = landmarks[4]; // THUMB_TIP
          const indexTip = landmarks[8]; // INDEX_FINGER_TIP
          newRightHandPinch = calculateDistance(thumbTip, indexTip);
        } else if (!isRightHand && landmarks.length > 8) { // Left Hand
          const indexTip = landmarks[8];
          // The sphere interaction logic from the example is complex as it maps 2D normalized to 3D.
          // For an initial demo, let's simplify: if left index finger is roughly in center of its side of screen.
          // This is a placeholder. The example `isPointInSphere` is more sophisticated.
          // The original example's `isPointInSphere` used fixed worldX/Y scaling and spherePos from THREE.Sphere.getWorldPosition()
          // We don't have direct access to the R3F sphere's world position here easily.
          // Let's use a simplified placeholder: if the left index finger is within a certain region.
          // A better approach would be to pass the sphere's current scale from R3F back to here, or do this check within R3F.
          // For now, let's keep it simple:
          if (indexTip.x > 0.3 && indexTip.x < 0.7 && indexTip.y > 0.3 && indexTip.y < 0.7) { // Rough center
             newIsLeftTouching = true;
          }
        }
      }
    }

    setHandSceneProps({
        rightHandPinchDistance: newRightHandPinch,
        isLeftHandTouching: newIsLeftTouching
    });

    setStatus(handsDetected > 0 ? `${handsDetected} hand(s) detected` : 'No hands detected');
    canvasCtx.restore();
  }, [handSceneProps.rightHandPinchDistance]); // Added dependency to re-evaluate sphere touch with current size

  useEffect(() => {
    if (!videoRef.current || !landmarkCanvasRef.current) return;

    handsRef.current = new Hands({
      locateFile: (file) => `/mediapipe/hands/${file}`,
    });

    handsRef.current.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    handsRef.current.onResults(onResults);
    setStatus('MediaPipe Hands initialized.');

    cameraRef.current = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current && handsRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width: 640, // Match these to your CSS or desired processing size
      height: 480,
    });
    cameraRef.current.start();
    setStatus('Webcam and MediaPipe started.');

    return () => {
      cameraRef.current?.stop();
      handsRef.current?.close();
      setStatus('Stopped.');
    };
  }, [onResults]); // onResults is a dependency

  // Ensure canvas dimensions match video/window dimensions
  useEffect(() => {
    const updateCanvasDimensions = () => {
      if (videoRef.current && landmarkCanvasRef.current) {
        const videoWidth = videoRef.current.videoWidth || videoRef.current.clientWidth;
        const videoHeight = videoRef.current.videoHeight || videoRef.current.clientHeight;
        if (videoWidth > 0 && videoHeight > 0) {
            landmarkCanvasRef.current.width = videoWidth;
            landmarkCanvasRef.current.height = videoHeight;
        } else { // Fallback if video not playing yet but element has size
            landmarkCanvasRef.current.width = videoRef.current.offsetWidth;
            landmarkCanvasRef.current.height = videoRef.current.offsetHeight;
        }
      }
    };

    const videoEl = videoRef.current;
    if (videoEl) {
        videoEl.addEventListener('loadedmetadata', updateCanvasDimensions);
        videoEl.addEventListener('play', updateCanvasDimensions); // Update when play starts
    }
    window.addEventListener('resize', updateCanvasDimensions);
    updateCanvasDimensions(); // Initial call

    return () => {
        if (videoEl) {
            videoEl.removeEventListener('loadedmetadata', updateCanvasDimensions);
            videoEl.removeEventListener('play', updateCanvasDimensions);
        }
        window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, []);


  return (
    <div className="w-full h-full relative flex justify-center items-center bg-black">
      <p id="status" className="absolute top-5 left-5 text-white bg-black bg-opacity-50 p-2 rounded z-20">
        {status}
      </p>

      <video
        ref={videoRef}
        id="webcam"
        autoPlay
        playsInline
        className="absolute w-full h-full object-cover transform scale-x-[-1]"
        style={{ top: 0, left: 0 }}
      ></video>
      <canvas
        ref={landmarkCanvasRef}
        id="landmarkCanvas"
        className="absolute w-full h-full transform scale-x-[-1]"
        style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
      ></canvas>

      <div
        id="three-canvas-container"
        className="absolute w-full h-full transform scale-x-[-1]"
        style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
      >
        <R3FCanvas camera={{ position: [0, 0, 10], fov: 50 }}> {/* Adjusted camera for sphere radius 2 */}
          <InteractiveHandScene {...handSceneProps} />
        </R3FCanvas>
      </div>
    </div>
  );
};

export default HandTrackingDemoPage;
```

---

**Phase 4: Final Checks and Instructions**

1.  **Styling:**
    *   The `HandTrackingDemoPage.tsx` includes basic absolute positioning and mirroring via Tailwind's `transform scale-x-[-1]` and inline styles, similar to the example. Ensure these styles correctly overlay the video, landmark canvas, and R3F canvas.
    *   The main container `div` in `HandTrackingDemoPage.tsx` uses flexbox to center its direct children if any were there, but with absolute positioning for webcam/canvases, this might not be strictly necessary. The `bg-black` is a fallback.
2.  **Test the Demo:**
    *   Run `pnpm start`.
    *   Navigate to the `/hand-tracking-demo` page using the temporary link on the HomePage.
    *   Allow webcam access when prompted.
    *   You should see:
        *   Your mirrored webcam feed.
        *   Mirrored hand landmarks drawn on top.
        *   A 3D sphere (also mirrored to align with the hand view) that:
            *   Changes size when you pinch/spread your right thumb and index finger.
            *   Changes color when your left index finger is near the center of the screen (placeholder for sphere touch).
    *   Check the browser console for any errors from MediaPipe, Three.js, or React.
    *   Check the status message for updates.
3.  **Troubleshooting `locateFile`:**
    *   If MediaPipe fails to load WASM files, double-check the path in `locateFile: (file) => \`/mediapipe/hands/\${file}\`,` and ensure the files were correctly copied to `public/mediapipe/hands/`. Check the network tab in browser dev tools to see where it's trying to load these files from.
4.  **Coordinate Systems & Interaction:**
    *   The interaction logic in `onResults` (calculating pinch distance) and `isPointNearSphere` (for left hand) is adapted from the example. Mapping 2D normalized hand landmarks to interact with a 3D R3F scene can be complex. The provided solution uses a simplified placeholder for the left-hand sphere touch. For a more accurate demo, this interaction logic might need refinement based on how the R3F scene is set up (camera, sphere position/scale). The mirroring of all layers (video, 2D canvas, 3D canvas) is crucial for intuitive control.

---

This provides a solid starting point for integrating the MediaPipe hand tracking demo into the React/Electron codebase using `@react-three/fiber` for the 3D visualization. The agent should be able to follow these steps to create a functional initial demo. Subsequent work can involve refining the 3D interactions, improving styling, and making the component more robust.Okay, Agent, your task is to integrate MediaPipe hand tracking with a Three.js visualization into the `OpenAgents Commander` codebase. This will be an initial demo based on the provided `index.html` example.

**Goal:** Create a new page in the application that displays a live webcam feed, overlays MediaPipe hand landmarks, and features an interactive 3D scene (using `@react-three/fiber`) where a sphere's size and color change based on hand gestures.

**Log your work in a new file: `docs/logs/YYYYMMDD/mediapipe-handtracking-demo.md` (replace YYYYMMDD with the current date).**

---

**Phase 1: Setup and File Creation**

1.  **Install Dependencies:**
    Open your terminal in the project root and run:
    ```bash
    pnpm add @mediapipe/hands @mediapipe/drawing_utils @mediapipe/camera_utils three @react-three/fiber @react-three/drei
    pnpm add -D @types/three
    ```

2.  **Prepare MediaPipe Assets:**
    *   Create a new directory: `public/mediapipe/hands`.
    *   Navigate to `node_modules/@mediapipe/hands/`. You will find several files essential for the Hands solution. Copy the following (or similar, filenames might vary slightly with versions) into your newly created `public/mediapipe/hands/` directory:
        *   `hands_solution_packed.js`
        *   `hands_solution_simd_wasm_intermediate.js`
        *   `hands_solution_simd_wasm_worker.js`
        *   `hands.binarypb`
        *   (And any other `.binarypb` or `.tflite` files if present, e.g., `hands_LANDMARKS_LITE.binarypb`, `hands_LANDMARKS_FULL.binarypb`)
    *   Vite will serve these files from the `/mediapipe/hands/` path at runtime.

3.  **Create New Page Component:**
    *   Create `src/pages/HandTrackingDemoPage.tsx`.

4.  **Create R3F Scene Component:**
    *   Ensure the directory `src/components/r3f/` exists.
    *   Create `src/components/r3f/InteractiveHandScene.tsx`.

5.  **Add Route for the New Page:**
    *   Open `src/routes/routes.tsx`.
    *   Import the new page: `import HandTrackingDemoPage from "@/pages/HandTrackingDemoPage";`
    *   Define the route:
        ```typescript
        export const HandTrackingDemoRoute = createRoute({
          getParentRoute: () => RootRoute,
          path: "/hand-tracking-demo",
          component: HandTrackingDemoPage,
        });
        ```
    *   Add `HandTrackingDemoRoute` to `rootTree`'s children array.

6.  **Add Navigation Link (Temporary):**
    *   Open `src/pages/HomePage.tsx`.
    *   Import `Link` from `@tanstack/react-router` and `Button` from ` "@/components/ui/button"`.
    *   Add a link to the demo page within the JSX of `HomePage`:
        ```tsx
        <div className="mt-4">
          <Link to="/hand-tracking-demo">
            <Button>Hand Tracking Demo</Button>
          </Link>
        </div>
        ```

---

**Phase 2: Implement `InteractiveHandScene.tsx` (R3F Scene)**

This component will render the 3D sphere and update it based on hand data.

```typescript
// src/components/r3f/InteractiveHandScene.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function getRandomNeonColor() {
    const neonColors = [0xFF00FF, 0x00FFFF, 0xFF3300, 0x39FF14, 0xFF0099, 0x00FF00, 0xFF6600, 0xFFFF00];
    return neonColors[Math.floor(Math.random() * neonColors.length)];
}

interface InteractiveSphereProps {
  rightHandPinchDistance: number | null;
  isLeftHandTouching: boolean;
  initialSphereColor?: number;
}

function InteractiveSphere({ rightHandPinchDistance, isLeftHandTouching, initialSphereColor = 0xff00ff }: InteractiveSphereProps) {
  const sphereGroupRef = useRef<THREE.Group>(null!);
  const solidMeshRef = useRef<THREE.Mesh>(null!);
  const [sphereColor, setSphereColor] = useState(initialSphereColor);
  const [lastColorChangeTime, setLastColorChangeTime] = useState(0);
  const colorChangeDelay = 500;
  const [currentSphereSize, setCurrentSphereSize] = useState(1.0);
  const targetSphereSizeRef = useRef(1.0);
  const smoothingFactor = 0.15;

  useEffect(() => {
    if (rightHandPinchDistance !== null) {
      let targetSize = 1.0;
      const minPinch = 0.03, maxPinch = 0.20, minSize = 0.2, maxSize = 2.0;
      if (rightHandPinchDistance < minPinch) targetSize = minSize;
      else if (rightHandPinchDistance > maxPinch) targetSize = maxSize;
      else targetSize = minSize + ((rightHandPinchDistance - minPinch) * (maxSize - minSize)) / (maxPinch - minPinch);
      targetSphereSizeRef.current = targetSize;
    }
  }, [rightHandPinchDistance]);

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
      const newSize = currentSphereSize + (targetSphereSizeRef.current - currentSphereSize) * smoothingFactor;
      setCurrentSphereSize(newSize);
      sphereGroupRef.current.scale.set(newSize, newSize, newSize);
      if (solidMeshRef.current?.material) {
        const time = Date.now() * 0.001;
        const pulseIntensity = 0.1 * Math.sin(time * 2) + 0.9;
        (solidMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.1 * pulseIntensity;
      }
    }
  });

  return (
    <group ref={sphereGroupRef}>
      <mesh ref={solidMeshRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color={sphereColor} transparent={true} opacity={0.5} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color={0xffffff} wireframe={true} />
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    return () => { scene.remove(ambientLight); };
  }, [scene]);

  return <InteractiveSphere rightHandPinchDistance={rightHandPinchDistance} isLeftHandTouching={isLeftHandTouching} />;
}
```

---

**Phase 3: Implement `HandTrackingDemoPage.tsx`**

This component will handle webcam access, MediaPipe initialization, landmark drawing, and communication with the R3F scene.

```typescript
// src/pages/HandTrackingDemoPage.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Hands, Results as HandResults, LandmarkConnectionArray } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks, HAND_CONNECTIONS } from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils';
import { Canvas as R3FCanvas } from '@react-three/fiber';
import InteractiveHandScene, { HandSceneProps } from '@/components/r3f/InteractiveHandScene';

const HandTrackingDemoPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraHelperRef = useRef<Camera | null>(null);
  const handsInstanceRef = useRef<Hands | null>(null);

  const [status, setStatus] = useState('Loading MediaPipe...');
  const [handSceneProps, setHandSceneProps] = useState<HandSceneProps>({
    rightHandPinchDistance: 1.0, // Default size
    isLeftHandTouching: false,
  });

  const calculateDistance = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));

  // Placeholder: for a robust demo, sphere interaction needs more careful coordinate mapping.
  const isLeftIndexNearCenter = (point: any) => (point.x > 0.4 && point.x < 0.6 && point.y > 0.4 && point.y < 0.6);


  const onResults = useCallback((results: HandResults) => {
    if (!landmarkCanvasRef.current) return;
    const canvasCtx = landmarkCanvasRef.current.getContext('2d')!;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, landmarkCanvasRef.current.width, landmarkCanvasRef.current.height);

    let newRightHandPinch: number | null = handSceneProps.rightHandPinchDistance; // Preserve last if no right hand
    let newIsLeftTouching = false;
    let handsDetected = 0;

    if (results.multiHandLandmarks && results.multiHandedness) {
      handsDetected = results.multiHandLandmarks.length;
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        const isRightHand = classification.label === 'Right';
        const landmarks = results.multiHandLandmarks[index];

        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS as LandmarkConnectionArray, { color: isRightHand ? '#00FF00' : '#FF0000', lineWidth: 5 });
        drawLandmarks(canvasCtx, landmarks, { color: isRightHand ? '#FFFFFF' : '#CCCCCC', lineWidth: 2, radius: (lmData) => (lmData.index === 4 || lmData.index === 8) ? 8 : 5 });

        if (isRightHand && landmarks.length > 8) {
          newRightHandPinch = calculateDistance(landmarks[4], landmarks[8]);
        } else if (!isRightHand && landmarks.length > 8) {
          if (isLeftIndexNearCenter(landmarks[8])) { // Left index finger tip
            newIsLeftTouching = true;
          }
        }
      }
    }

    // Only update if values changed to prevent unnecessary re-renders of HandScene
    if (newRightHandPinch !== handSceneProps.rightHandPinchDistance || newIsLeftTouching !== handSceneProps.isLeftHandTouching) {
        setHandSceneProps({
            rightHandPinchDistance: newRightHandPinch,
            isLeftHandTouching: newIsLeftTouching,
        });
    }

    setStatus(handsDetected > 0 ? `${handsDetected} hand(s) detected` : 'No hands detected');
    canvasCtx.restore();
  }, [handSceneProps.rightHandPinchDistance, handSceneProps.isLeftHandTouching]);

  useEffect(() => {
    if (!videoRef.current || !landmarkCanvasRef.current) return;

    handsInstanceRef.current = new Hands({ locateFile: (file) => `/mediapipe/hands/${file}` });
    handsInstanceRef.current.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    handsInstanceRef.current.onResults(onResults);
    setStatus('MediaPipe Hands initialized.');

    const videoElement = videoRef.current;
    cameraHelperRef.current = new Camera(videoElement, {
      onFrame: async () => {
        if (videoElement && handsInstanceRef.current) {
          await handsInstanceRef.current.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });
    cameraHelperRef.current.start();
    setStatus('Webcam and MediaPipe started.');

    return () => {
      cameraHelperRef.current?.stop();
      handsInstanceRef.current?.close();
      setStatus('Stopped.');
    };
  }, [onResults]);

  useEffect(() => {
    const updateCanvasDimensions = () => {
      if (videoRef.current && landmarkCanvasRef.current) {
        const videoWidth = videoRef.current.videoWidth || videoRef.current.clientWidth;
        const videoHeight = videoRef.current.videoHeight || videoRef.current.clientHeight;
        if (videoWidth > 0 && videoHeight > 0) {
          landmarkCanvasRef.current.width = videoWidth;
          landmarkCanvasRef.current.height = videoHeight;
        } else {
          landmarkCanvasRef.current.width = videoRef.current.offsetWidth;
          landmarkCanvasRef.current.height = videoRef.current.offsetHeight;
        }
      }
    };
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.addEventListener('loadedmetadata', updateCanvasDimensions);
      videoEl.addEventListener('play', updateCanvasDimensions);
    }
    window.addEventListener('resize', updateCanvasDimensions);
    updateCanvasDimensions();
    return () => {
      if (videoEl) {
        videoEl.removeEventListener('loadedmetadata', updateCanvasDimensions);
        videoEl.removeEventListener('play', updateCanvasDimensions);
      }
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, []);

  return (
    <div className="w-full h-screen relative flex justify-center items-center bg-black">
      <p className="absolute top-5 left-5 text-white bg-black bg-opacity-50 p-2 rounded z-30">
        {status}
      </p>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute w-full h-full object-cover transform scale-x-[-1]"
        style={{ top: 0, left: 0, zIndex: 1 }}
      />
      <canvas
        ref={landmarkCanvasRef}
        className="absolute w-full h-full transform scale-x-[-1]"
        style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
      />
      <div
        className="absolute w-full h-full transform scale-x-[-1]"
        style={{ top: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
      >
        <R3FCanvas camera={{ position: [0, 0, 10], fov: 50 }}>
          <InteractiveHandScene {...handSceneProps} />
        </R3FCanvas>
      </div>
    </div>
  );
};

export default HandTrackingDemoPage;
```

---

**Phase 4: Final Checks and Instructions**

1.  **Styling and Layout:**
    *   The provided JSX in `HandTrackingDemoPage.tsx` uses absolute positioning and `scale-x-[-1]` for mirroring, similar to the example `index.html`. Verify that the video feed, landmark canvas, and 3D scene are correctly layered and fill the screen.
    *   The `z-index` values are set to layer them: video (1), 3D scene (5), landmark canvas (10), status text (30). Adjust if needed.
2.  **MediaPipe `locateFile`:**
    *   The path `/mediapipe/hands/${file}` in `new Hands({ locateFile: ... })` assumes your WASM and model files are served from the root `public/mediapipe/hands/` directory. Verify this is correct by checking the Network tab in your browser's developer tools when the page loads. It should attempt to fetch files like `/mediapipe/hands/hands.binarypb`.
3.  **Test the Demo:**
    *   Run `pnpm start`.
    *   Navigate to the `/hand-tracking-demo` page.
    *   Grant webcam permission if prompted.
    *   **Expected Behavior:**
        *   Mirrored webcam feed fills the background.
        *   Hand landmarks are drawn over your hands, also mirrored.
        *   A 3D sphere is visible, its view also mirrored to align with your hand movements.
        *   **Right Hand:** Pinching/spreading your right thumb and index finger should change the sphere's size.
        *   **Left Hand:** Moving your left index finger to the approximate center of your view should change the sphere's color. (This interaction is simplified; the example's original sphere touch logic was more complex and tied to Three.js world coordinates).
    *   Check the browser console for any errors.
    *   The status text should update based on MediaPipe's initialization and hand detection.
4.  **Interaction Refinement (Future):**
    *   The current left-hand interaction (`isLeftIndexNearCenter`) is a placeholder. For more accurate sphere "touch" detection, you would need to:
        *   Project the 3D sphere's boundaries into the 2D normalized landmark space, or
        *   Unproject the 2D landmark coordinates into the 3D R3F scene's world space and perform a 3D collision/distance check. This is more complex and can be a follow-up task.

---

This setup should provide a working initial demo of MediaPipe hand tracking with an interactive R3F scene. Ensure all files are saved and `pnpm run t` passes to catch any TypeScript errors before running.
