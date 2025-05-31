Okay, I will focus exclusively on the WebGL context/canvas issue.

The primary suspect for the "THREE.WebGLRenderer: Context Lost" error, especially when it happens upon toggling a feature that introduces another canvas or heavy GPU operation, is the unmounting and remounting of the R3F `<Canvas>` component, or resource contention between two WebGL contexts.

Here's an analysis and instructions for the coding agent:

**Analysis of the Context/Canvas Issue:**

1.  **R3F Canvas Lifecycle:** The current setup in `HandTracking.tsx` conditionally renders `ThreeScene` using `{showHandTracking && <ThreeScene ... />}`. Since `ThreeScene.tsx` contains the R3F `<Canvas>`, this means the entire R3F scene, including its WebGL context, is destroyed and recreated every time `showHandTracking` toggles. This is highly problematic and a common cause for context loss, especially if other GPU-intensive operations (like MediaPipe initialization) are happening concurrently.
2.  **MediaPipe's Potential WebGL Usage:** MediaPipe Hands can use WebGL for its operations. If it initializes its own WebGL context while the R3F context is being recreated or is already active, it can lead to conflicts, exceeding browser/system limits for WebGL contexts, or causing one context to invalidate the other.
3.  **Initial Black Screen:** The user seeing a black screen initially (before any toggling) suggests the R3F `<Canvas>` in `ThreeScene.tsx` might not be rendering its content as expected from the start, or its content is not visible. This needs to be addressed to ensure the "cube thing" is visible initially.
4.  **"Split Second" View:** Seeing the cube scene for a split second when toggling ON hand tracking means the R3F canvas _does_ initialize and render briefly before the context is lost. This reinforces the idea that the conflict happens during the simultaneous setup or resource negotiation.

**Core Strategy:**

The most robust solution is to have a single, persistent R3F `<Canvas>` for your main 3D scene that is _not_ unmounted when hand tracking is toggled. MediaPipe's 2D landmark canvas can then be overlaid or managed separately without interfering with the primary WebGL context.

**Instructions for the Coding Agent:**

**Step 1: Ensure R3F Canvas is Persistent and Renders Initially**

- **Objective:** Move the main R3F `<Canvas>` to `HomePage.tsx` so it's always mounted and renders the "cube scene" from the start. `HandTracking.tsx` will then only manage MediaPipe and its 2D overlay.

1.  **Modify `src/pages/HomePage.tsx`:**

    - Import necessary R3F components (`Canvas`, `useThree`, `useFrame`) and any specific content from your current `ThreeScene.tsx` (like the cube, lights, environment).
    - Call `useHandTracking` hook at the `HomePage` level to get `handPosition` and other necessary data/refs for both the main scene and the UI-only hand tracking component.
    - Render the R3F `<Canvas>` directly within `HomePage.tsx`. This canvas will be for your main "cube scene".
    - Pass the `handPosition` to the content inside this main `<Canvas>` if you need to visualize the hand in 3D.
    - Refactor `HandTracking.tsx` into a new component (e.g., `HandTrackingUIControls`) that _only_ renders the UI toggles, status text, the hidden `<video>` element, and the 2D `landmarkCanvasRef`. It will receive necessary refs and data as props from `HomePage.tsx`.

    ```typescript
    // src/pages/HomePage.tsx
    import React, { useState, useEffect, useRef, useCallback } from "react";
    import { Canvas, useFrame, useThree } from '@react-three/fiber'; // R3F imports
    import * as THREE from 'three'; // THREE import

    // Import your actual 3D scene content. For this example, a simplified one:
    // If your ThreeScene.tsx was complex, you might import its content component.
    // For now, let's define a simple scene content here.
    import type { HandPosition } from "@/components/hands/useHandTracking"; // Import type

    import {
      useHandTracking, // Hook is used here now
      HandPose,
      type PinchCoordinates
    } from "@/components/hands";
    import HandTrackingUIControls from "@/components/hands/HandTrackingUIControls"; // New UI component
    import { ChatContainer } from "@/components/chat";
    import { useUIElementsStore, UIPosition } from "@/stores/uiElementsStore";

    // Simplified 3D Scene Content (can be your original ThreeScene.tsx content, without the <Canvas> tag)
    const MainSceneContent = ({ handPosition }: { handPosition: HandPosition | null }) => {
      const boxRef = useRef<THREE.Mesh>(null!);
      const { invalidate, viewport, camera } = useThree();

      useFrame(() => {
        if (boxRef.current) {
          boxRef.current.rotation.x += 0.005;
          boxRef.current.rotation.y += 0.005;
          invalidate(); // Request re-render if frameloop is 'demand'
        }
      });

      useEffect(() => {
        invalidate(); // Invalidate on handPosition change if frameloop is 'demand'
      }, [handPosition, invalidate]);

      // Log to check initial camera setup
      useEffect(() => {
        console.log("Main R3F Canvas Camera Initial Position:", camera.position);
        camera.lookAt(0,0,0); // Ensure it looks at the origin
      }, [camera]);

      return (
        <>
          <color attach="background" args={['#111827']} /> {/* Dark gray background */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <mesh ref={boxRef} position={[0, 0, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="dodgerblue" />
          </mesh>
          {/* Optional: visualize handPosition in 3D */}
          {handPosition && viewport && (
            <mesh position={[
              (0.5 - handPosition.x) * viewport.width,  // Adjust mapping as needed
              (0.5 - handPosition.y) * viewport.height, // Adjust mapping as needed
              0
            ]}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color="hotpink" emissive="hotpink" emissiveIntensity={2} />
            </mesh>
          )}
        </>
      );
    };

    // PinnableChatWindow component (remains largely the same, ensure it has pointerEvents: 'auto')
    interface PinnableChatWindowProps {
      isHandTrackingActive: boolean;
      activeHandPose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
    }
    const PinnableChatWindow: React.FC<PinnableChatWindowProps> = ({ /* ... props ... */ }) => {
      // ... existing PinnableChatWindow implementation ...
      // Ensure the main div has style={{ pointerEvents: 'auto' }}
      const chatWindowId = 'chatWindow';
      const defaultPosition = { x: 16, y: window.innerHeight - 366 };
      useUIElementsStore.getState().ensureElement(chatWindowId, defaultPosition);
      const elementState = useUIElementsStore(useCallback(state => state.getElement(chatWindowId), [chatWindowId]));
      const currentPosition = elementState?.position || defaultPosition;
      // ... (rest of PinnableChatWindow logic: state, effects, handlers)
       return (
        <div
          id={chatWindowId}
          className={`absolute w-[32rem] p-1 cursor-grab`} // Removed isInteracting based class for simplicity of this fix
          style={{
            left: `${currentPosition.x}px`,
            top: `${currentPosition.y}px`,
            pointerEvents: 'auto', // CRITICAL: This element must allow pointer events
            userSelect: 'none',    // Simplified userSelect
            zIndex: 100,          // Ensure it's above the canvas
            // ... other styles
          }}
          // onMouseDown={handleMouseDown} // Ensure mouse drag logic is sound
        >
          <div
            className={`h-80 border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden transition-all duration-200 relative opacity-85 hover:opacity-100 border-border`}
          >
            <ChatContainer
              className="bg-transparent !h-full"
              systemMessage="You are an AI agent..."
              model="gemma3:1b"
            />
          </div>
        </div>
      );
    };


    export default function HomePage() {
      const [showHandTracking, setShowHandTracking] = useState(false);

      const {
        videoRef,
        landmarkCanvasRef,
        handPosition, // Used by MainSceneContent
        handTrackingStatus,
        activeHandPose, // Passed to PinnableChatWindow and HandTrackingUIControls
        pinchMidpoint,  // Passed to PinnableChatWindow and HandTrackingUIControls
      } = useHandTracking({ enabled: showHandTracking });

      const mainCanvasContainerRef = useRef<HTMLDivElement>(null);

      // Add context lost/restored listeners to the main R3F canvas
      useEffect(() => {
        const canvas = mainCanvasContainerRef.current?.querySelector('canvas');
        if (!canvas) return;

        const handleContextLost = (event: Event) => {
          console.error('[HomePage] Main R3F Canvas Context Lost:', event);
          event.preventDefault();
        };
        const handleContextRestored = (event: Event) => {
          console.log('[HomePage] Main R3F Canvas Context Restored:', event);
        };

        canvas.addEventListener('webglcontextlost', handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
        console.log("[HomePage] Added WebGL context listeners to main canvas.");

        return () => {
          canvas.removeEventListener('webglcontextlost', handleContextLost);
          canvas.removeEventListener('webglcontextrestored', handleContextRestored);
          console.log("[HomePage] Removed WebGL context listeners from main canvas.");
        };
      }, [showHandTracking]); // Re-attach if canvas instance changes, though it shouldn't now


      return (
        <div className="flex flex-col h-full w-full relative overflow-hidden">
          {/* Main R3F Canvas - renders the "cube scene" */}
          <div ref={mainCanvasContainerRef} className="fixed inset-0 z-0"> {/* z-index 0 to be background */}
            <Canvas
              frameloop="demand" // Use 'demand' to only render when needed
              camera={{ position: [0, 0, 7], fov: 50 }} // Adjusted camera
              onCreated={({ gl, scene: r3fScene }) => {
                console.log("Main R3F Canvas CREATED in HomePage");
                // Optional: Log context attributes
                const ctx = gl.getContextAttributes();
                console.log("R3F Context Attributes:", ctx);

                // Add context listeners directly to gl.domElement
                gl.domElement.addEventListener('webglcontextlost', (event) => {
                  console.error('[HomePage] Main R3F Canvas Context Lost (onCreated):', event);
                  event.preventDefault();
                }, false);
                gl.domElement.addEventListener('webglcontextrestored', () => {
                  console.log('[HomePage] Main R3F Canvas Context Restored (onCreated)');
                }, false);
              }}
              gl={{
                preserveDrawingBuffer: true, // May help with stability in some cases
              }}
            >
              <MainSceneContent handPosition={handPosition} />
            </Canvas>
          </div>

          {/* Hand Tracking UI Controls (video, 2D canvas, toggles) */}
          <HandTrackingUIControls
            showHandTracking={showHandTracking}
            setShowHandTracking={setShowHandTracking}
            videoRef={videoRef}
            landmarkCanvasRef={landmarkCanvasRef}
            handTrackingStatus={handTrackingStatus}
            activeHandPose={activeHandPose}
            pinchMidpoint={pinchMidpoint}
          />

          {/* Other UI Elements like Chat Window, ensure they are above the canvas (z-index) */}
          <div className="relative w-full h-full z-10" style={{ pointerEvents: 'none' }}>
             <PinnableChatWindow
                isHandTrackingActive={showHandTracking}
                activeHandPose={activeHandPose}
                pinchMidpoint={pinchMidpoint}
              />
          </div>
        </div>
      );
    }
    ```

2.  **Create `src/components/hands/HandTrackingUIControls.tsx`:**

    - This new component will take the UI elements (Switch, Labels, status, video, 2D canvas) from the original `HandTracking.tsx`.
    - It will _not_ call `useHandTracking` itself or render `ThreeScene`.

    ```typescript
    // src/components/hands/HandTrackingUIControls.tsx
    import React from 'react';
    import { HandPose, type PinchCoordinates } from './handPoseTypes';
    import { Switch } from "@/components/ui/switch";
    import { Label } from "@/components/ui/label";

    interface HandTrackingUIControlsProps {
      showHandTracking: boolean;
      setShowHandTracking: (show: boolean) => void;
      videoRef: React.RefObject<HTMLVideoElement>;
      landmarkCanvasRef: React.RefObject<HTMLCanvasElement>;
      handTrackingStatus: string;
      activeHandPose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
    }

    export default function HandTrackingUIControls({
      showHandTracking,
      setShowHandTracking,
      videoRef,
      landmarkCanvasRef,
      handTrackingStatus,
      activeHandPose,
      pinchMidpoint
    }: HandTrackingUIControlsProps) {

      useEffect(() => {
        console.log("HandTrackingUIControls: showHandTracking is", showHandTracking);
        // This component doesn't manage the hand tracking logic itself,
        // but it does manage the visibility of its elements based on showHandTracking.
      }, [showHandTracking]);

      return (
        <>
          {/* Hand tracking UI controls */}
          <div className="absolute top-5 right-5 flex flex-col gap-3 z-20" style={{ pointerEvents: 'auto' }}> {/* z-index higher than canvas */}
            <div className="flex items-center space-x-2 bg-black bg-opacity-50 p-2 rounded">
              <Switch
                id="hand-tracking-toggle" // Ensure unique ID
                checked={showHandTracking}
                onCheckedChange={setShowHandTracking}
              />
              <Label htmlFor="hand-tracking-toggle" className="text-white">Hand Tracking</Label>
            </div>

            {showHandTracking && (
              <>
                <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs">
                  Status: {handTrackingStatus}
                </p>
                <p className="bg-black bg-opacity-50 text-white p-2 rounded text-xs transition-colors">
                  Pose: <span className={activeHandPose === HandPose.PINCH_CLOSED ? 'text-primary font-bold' : ''}>{activeHandPose === HandPose.NONE ? 'N/A' : activeHandPose}</span>
                </p>
              </>
            )}
          </div>

          {showHandTracking && pinchMidpoint && (
            <div className="absolute top-5 left-5 z-20" style={{ pointerEvents: 'auto' }}>
              <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                Pinch: {Math.round(pinchMidpoint.x)}, {Math.round(pinchMidpoint.y)} px
              </p>
            </div>
          )}

          {/* Hidden video element for camera input */}
          {/* Conditionally render these based on showHandTracking if they cause issues when hidden,
              otherwise use opacity/visibility controlled by useHandTracking hook internally via refs. */}
          {showHandTracking && ( // Or manage display:none/block inside useHandTracking based on 'enabled'
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute w-full h-full object-cover transform scale-x-[-1]"
              // Use opacity 0 and pointerEvents none. The hook manages actual play/stop.
              style={{ top: 0, left: 0, zIndex: 1, opacity: 0, pointerEvents: 'none' }}
            />
          )}

          {/* Canvas for hand landmarks, also managed by the hook */}
          <canvas
            ref={landmarkCanvasRef}
            className="absolute w-full h-full transform scale-x-[-1]"
            style={{
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 5, // Above video, below UI controls
              // visibility: showHandTracking ? 'visible' : 'hidden' // Controlled by drawing logic in hook
            }}
          />
        </>
      );
    }

    ```

3.  **Remove `ThreeScene.tsx` from `src/components/hands/HandTracking.tsx`:**
    - The old `HandTracking.tsx` should be deleted or renamed (e.g., to `HandTrackingCoreLogic.ts` if it contained non-React logic, but `useHandTracking.ts` serves this purpose). The new UI component is `HandTrackingUIControls.tsx`.
    - Ensure `src/components/hands/index.ts` exports `HandTrackingUIControls` if it's meant to be the public component, or adjust imports in `HomePage.tsx` accordingly. For now, `HomePage.tsx` imports it directly.
    - The original `ThreeScene.tsx` can be repurposed to be the `MainSceneContent` component used in `HomePage.tsx`, or its content directly inlined. It must NOT render its own `<Canvas>`.

**Step 2: Refine `useHandTracking.ts` for Robust Cleanup**

- **Objective:** Ensure MediaPipe resources are thoroughly released when hand tracking is disabled.

1.  **Modify `src/components/hands/useHandTracking.ts`:**

    - In the `useEffect` hook that initializes MediaPipe `Hands`:
      - Make the cleanup function more robust. When `enabled` becomes `false`, explicitly nullify refs to MediaPipe objects after closing/stopping them.
      - Ensure the 2D landmark canvas is cleared.

    ```typescript
    // src/components/hands/useHandTracking.ts
    // ... (imports and existing code) ...

    export function useHandTracking({ enabled }: UseHandTrackingOptions) {
      // ... (refs and state declarations) ...

      // useEffect for MediaPipe initialization and cleanup
      useEffect(() => {
        if (!enabled) {
          // Cleanup logic
          console.log(
            "[useHandTracking] Disabling hand tracking. Cleaning up...",
          );
          if (cameraRef.current) {
            try {
              cameraRef.current.stop();
            } catch (err) {
              console.error("Error stopping camera:", err);
            }
            cameraRef.current = null;
          }
          if (handsRef.current) {
            try {
              handsRef.current.close();
            } catch (err) {
              console.error("Error closing MediaPipe Hands:", err);
            }
            handsRef.current = null;
          }
          if (landmarkCanvasRef.current) {
            const canvasCtx = landmarkCanvasRef.current.getContext("2d");
            if (canvasCtx) {
              canvasCtx.clearRect(
                0,
                0,
                landmarkCanvasRef.current.width,
                landmarkCanvasRef.current.height,
              );
              console.log("[useHandTracking] Landmark canvas cleared.");
            }
          }

          // Reset states
          setHandTrackingStatus("Inactive");
          setActiveHandPose(HandPose.NONE);
          setPinchMidpoint(null);
          setHandPosition(null); // For the 3D pointer in main scene

          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
            console.log("[useHandTracking] Video stream stopped and cleared.");
          }
          console.log("[useHandTracking] Cleanup complete.");
          return;
        }

        // Initialization logic (when enabled is true)
        if (!videoRef.current || !landmarkCanvasRef.current) {
          console.warn(
            "[useHandTracking] Video or Landmark canvas ref not available for init.",
          );
          return;
        }

        // Ensure DOM elements are visible and have dimensions for MediaPipe Camera
        // This might be an issue if opacity is 0 or display is none initially
        videoRef.current.style.display = "block"; // Temporarily ensure it's interactable by Camera util
        landmarkCanvasRef.current.style.display = "block";

        // ... (rest of the initialization logic for Hands and Camera) ...
        // After cameraRef.current.start():
        // videoRef.current.style.display = 'none'; // Or set opacity to 0 as it is
        // landmarkCanvasRef.current.style.display = 'block'; // Keep this visible for landmark drawing

        return () => {
          // This is the direct cleanup for when the component unmounts or `enabled` changes again.
          // The logic above already handles the `enabled` false case.
          console.log("[useHandTracking] useEffect cleanup function running.");
          if (cameraRef.current) {
            try {
              cameraRef.current.stop();
            } catch (err) {
              console.error("Camera stop error on unmount:", err);
            }
            cameraRef.current = null;
          }
          if (handsRef.current) {
            try {
              handsRef.current.close();
            } catch (err) {
              console.error("Hands close error on unmount:", err);
            }
            handsRef.current = null;
          }
          if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
          }
        };
      }, [enabled, onHandTrackingResults]); // onHandTrackingResults should be stable if memoized correctly

      // ... (rest of the useHandTracking hook) ...
    }
    ```

**Step 3: Diagnostic Logging for WebGL Contexts**

- **Objective:** Add logs to understand when WebGL contexts are created and potentially lost.

1.  **Modify `src/main.ts` (Electron Main Process):**

    - Listen for GPU process crashes, which can indicate severe WebGL problems.

    ```typescript
    // src/main.ts
    // ...
    app.on("gpu-process-crashed", (event, killed) => {
      console.error(`Electron GPU process crashed. Killed: ${killed}`);
      // Optionally, you could try to relaunch the app or show an error to the user.
    });

    app.whenReady().then(createWindow).then(installExtensions);
    // ...
    ```

    - In `createWindow` function, after `mainWindow` is created, log webGL related info:

    ```typescript
    // src/main.ts -> createWindow
    const mainWindow = new BrowserWindow({
      /* ... */
    });
    // ...
    mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription) => {
        console.error(
          "Window content failed to load:",
          errorCode,
          errorDescription,
        );
      },
    );
    mainWindow.webContents.on("render-process-gone", (event, details) => {
      console.error("Render process gone:", details);
    });
    mainWindow.webContents.on(
      "console-message",
      (event, level, message, line, sourceId) => {
        // level 0:verbose, 1:info, 2:warning, 3:error
        if (message.includes("WebGL") || message.includes("Context Lost")) {
          console.log(
            `[Renderer Console - Main Intercept]: ${message} (Source: ${sourceId}:${line})`,
          );
        }
      },
    );
    ```

**Step 4: Test and Observe**

1.  Run `pnpm start`.
2.  **Initial View:** The "cube scene" (or the simplified blue box from `MainSceneContent`) should be visible immediately in `HomePage.tsx` because the R3F `<Canvas>` is now rendered unconditionally there. The background should be dark gray (`#111827`).
3.  **Toggle Hand Tracking ON:**
    - Observe the console for "THREE.WebGLRenderer: Context Lost" errors.
    - Check if the main R3F scene remains visible and interactive (if it has interaction).
    - Check if the hand tracking 2D landmark canvas appears and functions correctly.
    - Look for the logs added in `useEffect` in `HomePage` for context lost/restored on the main canvas.
    - Look for logs from `useHandTracking` regarding initialization and cleanup.
4.  **Toggle Hand Tracking OFF:**
    - Verify that MediaPipe resources are cleaned up (check `useHandTracking` console logs).
    - The main R3F scene should remain unaffected.

**Expected Outcome:**

By ensuring the main R3F `<Canvas>` is persistent and not unmounted/remounted, the "Context Lost" error directly tied to toggling hand tracking should be resolved. The MediaPipe 2D canvas will operate as an overlay. The initial black screen issue should also be resolved as the main R3F canvas now renders its content from the start. If context loss still occurs, the diagnostic logs and further simplification of the R3F scene or MediaPipe settings will be necessary.Okay, let's focus exclusively on the WebGL context/canvas issue. The primary goal is to prevent the "THREE.WebGLRenderer: Context Lost" error when toggling hand tracking and ensure the R3F scene (the "cube thing") is visible initially and remains stable.

The most likely cause of the context loss is the R3F `<Canvas>` being unmounted and remounted when hand tracking is toggled. MediaPipe's initialization, especially if it uses WebGL internally, can conflict with R3F's context creation if they happen concurrently or if resource limits are hit.

**Strategy:**

1.  Make the main R3F `<Canvas>` persistent in `HomePage.tsx` so it's always mounted.
2.  Refactor `HandTracking.tsx` to be a UI-only component that displays controls and the 2D landmark canvas, without managing or rendering an R3F scene itself.
3.  The `useHandTracking` hook will be called in `HomePage.tsx`, and its data (like `handPosition`) can be passed to the main R3F scene if needed for 3D visualization of hands.

Here are the instructions:

**Phase 1: Stabilize the R3F Canvas and Refactor Hand Tracking UI**

1.  **Modify `src/pages/HomePage.tsx` to Host the Main R3F `<Canvas>`:**

    - The R3F `<Canvas>` for the "cube scene" will now live here and render unconditionally.
    - The `useHandTracking` hook will be called here to get hand tracking data.
    - A new component, `HandTrackingUIControls`, will handle the UI for hand tracking.

    ```typescript
    // src/pages/HomePage.tsx
    import React, { useState, useEffect, useRef, useCallback } from "react";
    import { Canvas, useFrame, useThree } from '@react-three/fiber';
    import * as THREE from 'three';
    import type { HandPosition } from "@/components/hands/useHandTracking";
    import {
      useHandTracking,
      HandPose,
      type PinchCoordinates
    } from "@/components/hands";
    // Import the new UI controls component (to be created in next step)
    import HandTrackingUIControls from "@/components/hands/HandTrackingUIControls";
    import { ChatContainer } from "@/components/chat"; // Assuming this is still needed
    import { useUIElementsStore } from "@/stores/uiElementsStore"; // Assuming this is still needed

    // Define the content for your main R3F scene
    const MainSceneContent = ({ handPosition }: { handPosition: HandPosition | null }) => {
      const boxRef = useRef<THREE.Mesh>(null!);
      const { invalidate, viewport, camera } = useThree();

      useEffect(() => {
        // Ensure camera is looking at the scene
        camera.position.set(0, 0, 5); // Adjust as needed for your scene
        camera.lookAt(0, 0, 0);
        invalidate(); // Initial render
      }, [camera, invalidate]);

      useFrame((_state, delta) => {
        if (boxRef.current) {
          boxRef.current.rotation.x += delta * 0.1;
          boxRef.current.rotation.y += delta * 0.1;
          invalidate();
        }
      });

      useEffect(() => {
        if (handPosition) invalidate(); // Re-render if hand position changes
      }, [handPosition, invalidate]);

      return (
        <>
          <color attach="background" args={['#000000']} /> {/* Black background for now */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} />
          <mesh ref={boxRef} position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} /> {/* Simple cube */}
            <meshStandardMaterial color="royalblue" />
          </mesh>
          {/* Optional: Visualize handPosition if needed */}
          {handPosition && viewport && (
            <mesh position={[
              (0.5 - handPosition.x) * viewport.width * 0.5, // Example mapping
              (0.5 - handPosition.y) * viewport.height * 0.5,
              1 /* Slightly in front of the cube */
            ]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial color="hotpink" emissive="hotpink" />
            </mesh>
          )}
        </>
      );
    };

    // PinnableChatWindow (assuming it's still part of the UI overlay)
    interface PinnableChatWindowProps {
      isHandTrackingActive: boolean;
      activeHandPose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
    }
    const PinnableChatWindow: React.FC<PinnableChatWindowProps> = ({
      isHandTrackingActive,
      activeHandPose,
      pinchMidpoint,
    }) => {
      const chatWindowId = 'chatWindow';
      const defaultPosition = { x: 16, y: window.innerHeight - 366 };
      useUIElementsStore.getState().ensureElement(chatWindowId, defaultPosition);
      const elementState = useUIElementsStore(useCallback(state => state.getElement(chatWindowId), [chatWindowId]));
      const currentPosition = elementState?.position || defaultPosition;
      // ... (rest of your PinnableChatWindow logic for dragging, etc.)
      return (
        <div
          id={chatWindowId}
          className="absolute w-[32rem] p-1 cursor-grab"
          style={{
            left: `${currentPosition.x}px`,
            top: `${currentPosition.y}px`,
            pointerEvents: 'auto',
            userSelect: 'none',
            zIndex: 100,
          }}
        >
          <div className="h-80 border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden relative opacity-85 hover:opacity-100 border-border">
            <ChatContainer
              className="bg-transparent !h-full"
              systemMessage="You are an AI agent..."
              model="gemma3:1b"
            />
          </div>
        </div>
      );
    };

    export default function HomePage() {
      const [showHandTracking, setShowHandTracking] = useState(false);

      // useHandTracking hook is now at HomePage level
      const {
        videoRef,
        landmarkCanvasRef,
        handPosition,
        handTrackingStatus,
        activeHandPose,
        pinchMidpoint,
      } = useHandTracking({ enabled: showHandTracking });

      const mainCanvasContainerRef = useRef<HTMLDivElement>(null);

      // Log WebGL context events
      useEffect(() => {
        const canvas = mainCanvasContainerRef.current?.querySelector('canvas');
        if (!canvas) return;

        const handleContextLost = (event: Event) => {
          console.error('[HomePage R3F Canvas] WebGL Context Lost:', event);
          event.preventDefault(); // Try to prevent default handling
        };
        const handleContextRestored = (event: Event) => {
          console.log('[HomePage R3F Canvas] WebGL Context Restored:', event);
        };

        canvas.addEventListener('webglcontextlost', handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
        console.log("[HomePage] Added WebGL context listeners to main R3F canvas.");

        return () => {
          canvas.removeEventListener('webglcontextlost', handleContextLost);
          canvas.removeEventListener('webglcontextrestored', handleContextRestored);
          console.log("[HomePage] Removed WebGL context listeners from main R3F canvas.");
        };
      }, []); // Empty dependency array: run once after initial mount

      return (
        <div className="flex flex-col h-full w-full relative overflow-hidden bg-black"> {/* Added bg-black */}
          {/* Main R3F Canvas - should always be rendered */}
          <div ref={mainCanvasContainerRef} className="fixed inset-0 z-0">
            <Canvas
              frameloop="demand"
              camera={{ position: [0, 0, 5], fov: 50 }} // Adjust camera as needed
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: "high-performance", // Request high-performance context
                failIfMajorPerformanceCaveat: false // Try to get a context even if it's not ideal
              }}
              onCreated={({ gl }) => {
                console.log("Main R3F Canvas CREATED in HomePage.");
                // You can add more specific context listeners here if needed
                // gl.domElement.addEventListener(...)
              }}
              onPointerMissed={() => console.log("Canvas pointer missed (background click)")} // For R3F interaction debugging
            >
              <MainSceneContent handPosition={handPosition} />
            </Canvas>
          </div>

          {/* Hand Tracking UI Controls */}
          <HandTrackingUIControls
            showHandTracking={showHandTracking}
            setShowHandTracking={setShowHandTracking}
            videoRef={videoRef}
            landmarkCanvasRef={landmarkCanvasRef}
            handTrackingStatus={handTrackingStatus}
            activeHandPose={activeHandPose}
            pinchMidpoint={pinchMidpoint}
          />

          {/* UI Overlay Elements */}
          <div className="relative w-full h-full z-10" style={{ pointerEvents: 'none' }}>
            <PinnableChatWindow
              isHandTrackingActive={showHandTracking}
              activeHandPose={activeHandPose}
              pinchMidpoint={pinchMidpoint}
            />
            {/* Add other HUD elements here, ensuring they have pointerEvents: 'auto' if interactive */}
          </div>
        </div>
      );
    }
    ```

2.  **Create `src/components/hands/HandTrackingUIControls.tsx`:**

    - This component will contain the UI elements previously in `HandTracking.tsx` (switch, status text, video, 2D canvas) but _not_ the R3F `ThreeScene`.

    ```typescript
    // src/components/hands/HandTrackingUIControls.tsx
    import React, { useEffect } from 'react';
    import { HandPose, type PinchCoordinates } from './handPoseTypes';
    import { Switch } from "@/components/ui/switch";
    import { Label } from "@/components/ui/label";

    interface HandTrackingUIControlsProps {
      showHandTracking: boolean;
      setShowHandTracking: (show: boolean) => void;
      videoRef: React.RefObject<HTMLVideoElement>;
      landmarkCanvasRef: React.RefObject<HTMLCanvasElement>;
      handTrackingStatus: string;
      activeHandPose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
    }

    export default function HandTrackingUIControls({
      showHandTracking,
      setShowHandTracking,
      videoRef,
      landmarkCanvasRef,
      handTrackingStatus,
      activeHandPose,
      pinchMidpoint
    }: HandTrackingUIControlsProps) {

      useEffect(() => {
        // This effect just observes prop changes for debugging
        // console.log("[HandTrackingUIControls] showHandTracking:", showHandTracking);
      }, [showHandTracking]);

      return (
        <>
          {/* Hand tracking UI controls (Switch, Status, Pinch Coords) */}
          <div className="absolute top-5 right-5 flex flex-col gap-3 z-20" style={{ pointerEvents: 'auto' }}>
            <div className="flex items-center space-x-2 bg-black bg-opacity-50 p-2 rounded">
              <Switch
                id="hand-tracking-toggle-main" // Ensure unique ID
                checked={showHandTracking}
                onCheckedChange={setShowHandTracking}
              />
              <Label htmlFor="hand-tracking-toggle-main" className="text-white">Hand Tracking</Label>
            </div>

            {showHandTracking && (
              <>
                <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs">
                  Status: {handTrackingStatus}
                </p>
                <p className="bg-black bg-opacity-50 text-white p-2 rounded text-xs transition-colors">
                  Pose: <span className={activeHandPose === HandPose.PINCH_CLOSED ? 'text-primary font-bold' : ''}>{activeHandPose === HandPose.NONE ? 'N/A' : activeHandPose}</span>
                </p>
              </>
            )}
          </div>

          {showHandTracking && pinchMidpoint && (
            <div className="absolute top-5 left-5 z-20" style={{ pointerEvents: 'auto' }}>
              <p className="text-white bg-black bg-opacity-50 p-2 rounded text-xs flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                Pinch: {Math.round(pinchMidpoint.x)}, {Math.round(pinchMidpoint.y)} px
              </p>
            </div>
          )}

          {/* Hidden video element for camera input. Its display/activity is managed by useHandTracking. */}
          {showHandTracking && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute w-full h-full object-cover transform scale-x-[-1]"
              style={{ top: 0, left: 0, zIndex: 1, opacity: 0, pointerEvents: 'none' }} // Keep opacity 0
            />
          )}

          {/* Canvas for hand landmarks. Its drawing is managed by useHandTracking. */}
          <canvas
            ref={landmarkCanvasRef}
            className="absolute w-full h-full transform scale-x-[-1]"
            style={{
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 5, // Above video, below UI controls like chat window
              visibility: showHandTracking ? 'visible' : 'hidden' // Control visibility
            }}
          />
        </>
      );
    }
    ```

3.  **Refactor/Remove Old `src/components/hands/HandTracking.tsx` and `src/components/hands/ThreeScene.tsx`:**
    - The original `HandTracking.tsx` component is now replaced by `HandTrackingUIControls.tsx`.
    - The content of the original `ThreeScene.tsx` (everything _inside_ its `<Canvas>` tag) should be moved to `MainSceneContent` in `HomePage.tsx` or a similar component imported by `HomePage.tsx`. The `ThreeScene.tsx` file itself, if it only contained the R3F `<Canvas>` wrapper, can be removed or repurposed.
    - Update `src/components/hands/index.ts` to export `HandTrackingUIControls` instead of the old `HandTracking` if necessary, or adjust imports in `HomePage.tsx`.

**Phase 2: Refine `useHandTracking.ts` Cleanup**

1.  **Modify `src/components/hands/useHandTracking.ts` for Robust Cleanup:**

    - Ensure that when `enabled` becomes `false`, all MediaPipe resources (Camera, Hands instance) and the video stream are properly stopped and released.

    ```typescript
    // src/components/hands/useHandTracking.ts
    // ... (existing imports)

    export function useHandTracking({ enabled }: UseHandTrackingOptions) {
      const videoRef = useRef<HTMLVideoElement>(null);
      const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
      const cameraRef = useRef<Camera | null>(null);
      const handsRef = useRef<Hands | null>(null);
      // ... (other state: handTrackingStatus, handPosition, activeHandPose, pinchMidpoint)

      const onHandTrackingResults = useCallback(/* ... as before ... */);

      useEffect(() => {
        const cleanupMediaPipe = () => {
          console.log("[useHandTracking] Cleaning up MediaPipe resources...");
          if (cameraRef.current) {
            try {
              cameraRef.current.stop();
            } catch (err) {
              console.error("Error stopping camera:", err);
            }
            cameraRef.current = null;
          }
          if (handsRef.current) {
            try {
              handsRef.current.close();
            } catch (err) {
              console.error("Error closing MediaPipe Hands:", err);
            }
            handsRef.current = null;
          }
          if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
            videoRef.current.load(); // Attempt to reset video element fully
            console.log("[useHandTracking] Video stream stopped and cleared.");
          }
          if (landmarkCanvasRef.current) {
            const canvasCtx = landmarkCanvasRef.current.getContext("2d");
            if (canvasCtx) {
              canvasCtx.clearRect(
                0,
                0,
                landmarkCanvasRef.current.width,
                landmarkCanvasRef.current.height,
              );
            }
          }
          setHandTrackingStatus("Inactive");
          setActiveHandPose(HandPose.NONE);
          setPinchMidpoint(null);
          setHandPosition(null);
          console.log("[useHandTracking] Cleanup complete.");
        };

        if (!enabled) {
          cleanupMediaPipe();
          return;
        }

        // Initialization logic (when enabled is true)
        if (!videoRef.current || !landmarkCanvasRef.current) {
          console.warn(
            "[useHandTracking] Video or Landmark canvas ref not available for init.",
          );
          return;
        }

        // Ensure video element is ready for MediaPipe Camera
        // (MediaPipe Camera might need it to be in a state where it can get dimensions)
        // videoRef.current.style.display = 'block'; // If it was display:none
        // landmarkCanvasRef.current.style.display = 'block';

        console.log("[useHandTracking] Initializing MediaPipe...");
        setHandTrackingStatus("Initializing MediaPipe...");

        // Make sure Hands is only initialized once or properly closed before re-init
        if (handsRef.current) {
          // If re-enabling, ensure old instance is closed
          try {
            handsRef.current.close();
          } catch (e) {
            /* ignore */
          }
          handsRef.current = null;
        }
        if (cameraRef.current) {
          // If re-enabling, ensure old instance is stopped
          try {
            cameraRef.current.stop();
          } catch (e) {
            /* ignore */
          }
          cameraRef.current = null;
        }

        handsRef.current = new Hands({
          locateFile: (file) => `/mediapipe/hands/${file}`,
        });
        handsRef.current.setOptions({
          selfieMode: false, // Crucial for non-mirrored coordinates if DynamicPointer expects that
          maxNumHands: 1, // Changed from 2 to 1 for simplicity / performance
          modelComplexity: 0,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });
        handsRef.current.onResults(onHandTrackingResults);

        const startCamera = async () => {
          if (videoRef.current && handsRef.current) {
            cameraRef.current = new Camera(videoRef.current, {
              onFrame: async () => {
                if (
                  videoRef.current &&
                  handsRef.current &&
                  videoRef.current.readyState >=
                    HTMLMediaElement.HAVE_CURRENT_DATA
                ) {
                  try {
                    await handsRef.current.send({ image: videoRef.current });
                  } catch (err) {
                    /* console.log("Frame send error (normal during tracking stop/start)"); */
                  }
                }
              },
              width: 640,
              height: 480,
            });
            try {
              await cameraRef.current.start();
              setHandTrackingStatus("Tracking active");
              console.log("[useHandTracking] MediaPipe Camera started.");
            } catch (cameraError) {
              console.error("Error starting MediaPipe Camera:", cameraError);
              setHandTrackingStatus(
                `Error starting camera: ${cameraError instanceof Error ? cameraError.message : String(cameraError)}`,
              );
              cleanupMediaPipe(); // Cleanup if camera fails to start
            }
          }
        };

        startCamera().catch((err) => {
          console.error("Error in camera start sequence:", err);
          setHandTrackingStatus("Failed to start camera.");
        });

        return () => {
          console.log(
            "[useHandTracking] useEffect cleanup for enabled/onHandTrackingResults change.",
          );
          cleanupMediaPipe(); // This will be called if `enabled` changes to false OR component unmounts
        };
      }, [enabled, onHandTrackingResults]); // Dependency array

      // ... (rest of the hook: canvas dimension effect, return statement)
      return {
        videoRef,
        landmarkCanvasRef,
        handPosition,
        handTrackingStatus,
        activeHandPose,
        pinchMidpoint,
      };
    }
    ```

**Phase 3: Test and Verify**

1.  **Run `pnpm run t`** to check for TypeScript errors after these significant refactors.
2.  **Run `pnpm start`**.
    - **Initial State:** Verify the "cube scene" (e.g., the blue box) is visible immediately on `HomePage` load. The background should be black. There should be no WebGL errors in the console at this stage.
    - **Toggle Hand Tracking ON:**
      - The main R3F scene should remain visible and unaffected.
      - The hand tracking UI controls (switch, status text) should appear.
      - The 2D landmark canvas should become active (showing hand landmarks if a hand is present).
      - **Critically, check the console for "THREE.WebGLRenderer: Context Lost" or any other WebGL errors.** With the R3F canvas now persistent, this error should be gone or its cause different.
      - Check console logs from `HomePage` for `webglcontextlost` events.
      - Check console logs from `useHandTracking` for initialization messages.
    - **Toggle Hand Tracking OFF:**
      - The main R3F scene should remain visible.
      - Hand tracking UI and 2D landmark canvas should hide/clear.
      - MediaPipe resources should be cleaned up (check `useHandTracking` console logs).
      - No WebGL errors should appear.

**Further Diagnostics (if context loss persists after above):**

- If the context loss still occurs, even with a persistent R3F canvas:
  1.  **Simplify `MainSceneContent` in `HomePage.tsx`** further: remove everything except `<color attach="background" />` and a single simple `<mesh>`.
  2.  **Check `gl` prop in `HomePage.tsx` `<Canvas>`:** Experiment with `powerPreference: 'low-power'` in the `gl` prop of the main `<Canvas>`.
  3.  **In `src/main.ts`,** temporarily add `app.commandLine.appendSwitch('disable-gpu');` before `app.whenReady()` to run Electron in software rendering mode. If this prevents context loss, it strongly points to a GPU driver or hardware acceleration conflict with MediaPipe. This is purely diagnostic.
  4.  Check `index.html`'s Content Security Policy (CSP) for any overly restrictive WebGL or WASM policies, though the current one seems reasonable for local assets and MediaPipe's known CDNs (though you are loading `/mediapipe/hands/` locally).

By making the R3F Canvas persistent, we eliminate the most common cause of this type of context loss. The subsequent steps are about refining resource management and diagnosing deeper conflicts if they exist.
