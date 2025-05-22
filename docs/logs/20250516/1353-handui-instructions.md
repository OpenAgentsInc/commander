Okay, I understand the goal. We'll implement a "pinch-to-move" functionality for UI elements, starting with the chat window, using the existing MediaPipe hand tracking system. The state of UI element positions will be managed by a new Zustand store with persistence.

Here are the specific instructions for the coding agent, broken down into phases.

**Phase 1: Setup Zustand Store for UI Element Positions**

1.  **Create a new directory `src/stores` if it doesn't exist.**
2.  **Create a new file `src/stores/uiElementsStore.ts` with the following content:**

    ```typescript
    import { create } from "zustand";
    import { persist, createJSONStorage } from "zustand/middleware";

    export interface UIPosition {
      x: number;
      y: number;
    }

    export interface UIElementState {
      id: string;
      position: UIPosition;
      isPinned: boolean; // Indicates if the element is currently being moved/dragged
      // Add other relevant properties like z-index, size if needed later
    }

    interface UIElementsStoreState {
      elements: Record<string, UIElementState>;
      setElementPosition: (id: string, position: UIPosition) => void;
      pinElement: (id: string, initialPosition?: UIPosition) => void;
      unpinElement: (id: string) => void;
      getElement: (id: string) => UIElementState | undefined;
    }

    const initialChatWindowState: UIElementState = {
      id: "chatWindow",
      position: { x: 10, y: window.innerHeight - 350 - 10 }, // Default bottom-left-ish
      isPinned: false,
    };

    export const useUIElementsStore = create<UIElementsStoreState>()(
      persist(
        (set, get) => ({
          elements: {
            chatWindow: { ...initialChatWindowState },
          },
          setElementPosition: (id, position) =>
            set((state) => ({
              elements: {
                ...state.elements,
                [id]: {
                  ...(state.elements[id] || { id, position, isPinned: false }),
                  position,
                },
              },
            })),
          pinElement: (id, initialPosition) =>
            set((state) => {
              const currentElement = state.elements[id];
              return {
                elements: {
                  ...state.elements,
                  [id]: {
                    id,
                    position: initialPosition ||
                      currentElement?.position || { x: 0, y: 0 },
                    isPinned: true,
                  },
                },
              };
            }),
          unpinElement: (id) =>
            set((state) => {
              if (!state.elements[id]) return state;
              return {
                elements: {
                  ...state.elements,
                  [id]: {
                    ...state.elements[id],
                    isPinned: false,
                  },
                },
              };
            }),
          getElement: (id) => get().elements[id],
        }),
        {
          name: "ui-elements-positions", // name of the item in the storage (must be unique)
          storage: createJSONStorage(() => localStorage), // by default, 'localStorage' is used
          // Partialize to only persist necessary data, positions in this case.
          // For simplicity, we persist the whole 'elements' object for now.
          // If `isPinned` should not be persisted as true, this can be refined.
          // For now, let's persist `isPinned` as well, it will default to false on next load if not actively pinned.
        },
      ),
    );
    ```

    _Explanation:_

    - We define `UIPosition` and `UIElementState` for typing.
    - The store holds a record of elements by their ID.
    - `setElementPosition` updates an element's position.
    - `pinElement` marks an element as being interacted with (e.g., starting a drag/pinch). It can optionally set an initial position.
    - `unpinElement` marks the interaction as ended.
    - `getElement` retrieves an element's state.
    - We initialize a `chatWindow` element with a default position. `window.innerHeight` is used for a sensible default; be aware this runs in the renderer, but store initialization might happen where `window` isn't fully defined yet if not careful. For Zustand, it's usually fine as it's client-side. Let's adjust the default y-position calculation to be safer or done at component level. For store default, a simpler value like `y: 500` might be better initially.
      _Correction_: For default position, it's better to calculate it dynamically in the component or use percentages if the store is initialized very early. For now, fixed values or values derived where `window` is available are okay. Let's use fixed defaults for simplicity in the store and adjust in the component.
      _Revised `initialChatWindowState`_:
      `position: { x: 16, y: 500 }, // Default bottom-left-ish, px values` (will adjust in component later)

3.  **Update `src/stores/uiElementsStore.ts` with the revised `initialChatWindowState`:**

    ```typescript
    // ... (imports and interfaces remain the same) ...

    const initialChatWindowState: UIElementState = {
      id: "chatWindow",
      position: { x: 16, y: 500 }, // Default to a fixed position
      isPinned: false,
    };

    // ... (rest of the store code remains the same) ...
    ```

4.  **Add a basic unit test for the store.** Create `src/tests/unit/stores/uiElementsStore.test.ts`:

    ```typescript
    import { describe, it, expect, beforeEach } from "vitest";
    import {
      useUIElementsStore,
      UIElementState,
    } from "@/stores/uiElementsStore";

    describe("useUIElementsStore", () => {
      beforeEach(() => {
        // Reset store state before each test
        useUIElementsStore.setState({
          elements: {
            chatWindow: {
              id: "chatWindow",
              position: { x: 16, y: 500 },
              isPinned: false,
            },
          },
        });
        // Clear localStorage
        localStorage.clear();
      });

      it("should initialize with a default chatWindow element", () => {
        const chatWindow = useUIElementsStore
          .getState()
          .getElement("chatWindow");
        expect(chatWindow).toBeDefined();
        expect(chatWindow?.position).toEqual({ x: 16, y: 500 });
        expect(chatWindow?.isPinned).toBe(false);
      });

      it("should set element position", () => {
        useUIElementsStore
          .getState()
          .setElementPosition("chatWindow", { x: 100, y: 200 });
        const chatWindow = useUIElementsStore
          .getState()
          .getElement("chatWindow");
        expect(chatWindow?.position).toEqual({ x: 100, y: 200 });
      });

      it("should create a new element if id does not exist on setElementPosition", () => {
        useUIElementsStore
          .getState()
          .setElementPosition("newElement", { x: 50, y: 50 });
        const newElement = useUIElementsStore
          .getState()
          .getElement("newElement");
        expect(newElement).toBeDefined();
        expect(newElement?.position).toEqual({ x: 50, y: 50 });
        expect(newElement?.isPinned).toBe(false);
      });

      it("should pin an element and set its position", () => {
        useUIElementsStore
          .getState()
          .pinElement("chatWindow", { x: 10, y: 20 });
        const chatWindow = useUIElementsStore
          .getState()
          .getElement("chatWindow");
        expect(chatWindow?.isPinned).toBe(true);
        expect(chatWindow?.position).toEqual({ x: 10, y: 20 });
      });

      it("should pin an element using its current position if no initial position is provided", () => {
        useUIElementsStore
          .getState()
          .setElementPosition("chatWindow", { x: 123, y: 456 });
        useUIElementsStore.getState().pinElement("chatWindow");
        const chatWindow = useUIElementsStore
          .getState()
          .getElement("chatWindow");
        expect(chatWindow?.isPinned).toBe(true);
        expect(chatWindow?.position).toEqual({ x: 123, y: 456 });
      });

      it("should unpin an element", () => {
        useUIElementsStore.getState().pinElement("chatWindow");
        useUIElementsStore.getState().unpinElement("chatWindow");
        const chatWindow = useUIElementsStore
          .getState()
          .getElement("chatWindow");
        expect(chatWindow?.isPinned).toBe(false);
      });

      it("should return undefined for a non-existent element", () => {
        const nonExistent = useUIElementsStore
          .getState()
          .getElement("nonExistent");
        expect(nonExistent).toBeUndefined();
      });
    });
    ```

5.  **Run `pnpm run t` and `pnpm test` to ensure everything passes.**

    - You might need to install `vitest-localstorage-mock` or similar if tests fail due to `localStorage` not being available in JSDOM environment for Zustand persistence, or configure JSDOM. A simpler way is to mock `localStorage` directly in the test setup.
    - Let's add a basic `localStorage` mock to `src/tests/unit/setup.ts`.

6.  **Modify `src/tests/unit/setup.ts` to include a `localStorage` mock:**

    ```typescript
    import "@testing-library/jest-dom";

    // Basic localStorage mock for Zustand persistence in tests
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value.toString();
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
        key: (index: number) => Object.keys(store)[index] || null,
        get length() {
          return Object.keys(store).length;
        },
      };
    })();

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    Object.defineProperty(window, "sessionStorage", {
      // zustand example uses sessionStorage, ensure this also works
      value: localStorageMock, // can reuse the same mock logic for sessionStorage for simplicity
    });
    ```

7.  **Re-run `pnpm run t` and `pnpm test`.**
    - If tests related to `window.innerHeight` in the store fail, it confirms the need to initialize positions more robustly or use fixed defaults. The change to fixed defaults (`x: 16, y: 500`) should prevent this.

This completes Phase 1. The store is set up and basic tests pass.

**Phase 2: Make Chat Window Positionable and Draggable with Mouse (Foundation for Pinch)**

1.  **Modify `src/pages/HomePage.tsx` to use the store for positioning the chat window.**

    - Wrap the chat window div with a new component, let's call it `PinnableContainer`.
    - This `PinnableContainer` will read its position from `useUIElementsStore`.

    ```typescript
    // src/pages/HomePage.tsx
    import React, { useState, useEffect } from "react";
    import { HandTracking } from "@/components/hands";
    import { ChatContainer } from "@/components/chat";
    import { useUIElementsStore } from "@/stores/uiElementsStore"; // Import the store

    // Create a new component for the pinnable chat window container
    const PinnableChatWindow: React.FC = () => {
      const chatWindowId = 'chatWindow';
      const elementState = useUIElementsStore((state) => state.getElement(chatWindowId));
      const setPosition = useUIElementsStore((state) => state.setElementPosition);
      const pinElement = useUIElementsStore((state) => state.pinElement);
      const unpinElement = useUIElementsStore((state) => state.unpinElement);

      const [isDragging, setIsDragging] = useState(false);
      const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
      const [initialPos, setInitialPos] = useState<{ x: number; y: number } | null>(null);

      // Ensure the element is registered in the store if it's not already
      useEffect(() => {
        if (!elementState) {
          // If not in store, initialize it (e.g. from its current CSS or a default)
          // For now, the store has a default. This ensures it's definitely there.
          // A more robust solution might involve reading initial CSS position if store is empty.
          console.log("Chat window state not found, relying on store default.");
        }
      }, [elementState]);

      const position = elementState?.position || { x: 16, y: window.innerHeight - 350 - 16 }; // Fallback if not in store

      // Basic Mouse Drag Handlers
      const handleMouseDown = (e: React.MouseEvent) => {
        if (!elementState) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setInitialPos(elementState.position);
        pinElement(chatWindowId, elementState.position); // Pin with current position
        // Prevent text selection during drag
        e.preventDefault();
      };

      const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !dragStart || !initialPos || !elementState?.isPinned) return;

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setPosition(chatWindowId, { x: initialPos.x + dx, y: initialPos.y + dy });
      };

      const handleMouseUp = () => {
        if (!elementState?.isPinned) return;
        setIsDragging(false);
        setDragStart(null);
        setInitialPos(null);
        unpinElement(chatWindowId);
      };

      // Add mouse leave on document to handle dragging outside window and releasing
      useEffect(() => {
        const handleMouseUpGlobal = () => {
          if (isDragging) {
            handleMouseUp();
          }
        };

        if (isDragging) {
          document.addEventListener('mousemove', handleMouseMove as any); // Cast because React.MouseEvent != MouseEvent
          document.addEventListener('mouseup', handleMouseUpGlobal);
        }

        return () => {
          document.removeEventListener('mousemove', handleMouseMove as any);
          document.removeEventListener('mouseup', handleMouseUpGlobal);
        };
      }, [isDragging, handleMouseMove, handleMouseUp]);


      return (
        <div
          id={chatWindowId}
          className="absolute w-[32rem] p-1 cursor-grab" // Added cursor-grab
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            pointerEvents: 'auto', // This specific element needs pointer events
            userSelect: isDragging ? 'none' : 'auto', // Prevent text selection while dragging
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="h-80"> {/* Fixed height for chat content */}
            <ChatContainer
              systemMessage="You are an AI agent named 'Agent' inside an app used by a human called Commander. Respond helpfully but concisely, in 2-3 sentences."
              model="gemma3:1b"
            />
          </div>
        </div>
      );
    };

    export default function HomePage() {
      const [showHandTracking, setShowHandTracking] = useState(false);

      return (
        <div className="flex flex-col h-full w-full relative">
          {/* Hand tracking component */}
          <HandTracking
            showHandTracking={showHandTracking}
            setShowHandTracking={setShowHandTracking}
          />

          {/* UI Overlay */}
          <div className="relative w-full h-full" style={{ pointerEvents: 'none' }}>
            {/* Pinnable Chat Window */}
            <PinnableChatWindow />
          </div>
        </div>
      );
    }
    ```

    _Explanation:_

    - A `PinnableChatWindow` component is created.
    - It fetches its position from `useUIElementsStore`.
    - It uses `style` (left, top) to position itself absolutely.
    - Basic mouse drag logic (`onMouseDown`, `handleMouseMove`, `handleMouseUp`) is added to this wrapper.
    - During drag, it calls `pinElement` and `unpinElement` and updates position via `setElementPosition`.
    - The main `HomePage` div disables pointer events by default, and `PinnableChatWindow` re-enables them for itself.

2.  **Update `src/components/chat/ChatContainer.tsx`'s wrapping div for styling if needed, but the positioning is handled by `PinnableChatWindow`.** The current `ChatContainer` has `className="h-full"`. This should be fine inside the `PinnableChatWindow`'s `div` which has a fixed height (`h-80`).

3.  **Run `pnpm run t` and `pnpm test`.**
    - Vitest tests for `HomePage` might need adjustment if they rely on specific structures or if new components are not easily testable without interaction. For now, existing tests should pass if they don't interact with the chat window's position.
    - The `DragWindowRegion` test in `example.test.ts` (E2E) might not be directly affected yet.

This phase makes the chat window positionable via the store and adds mouse dragging.

**Phase 3: Implement Pinch-to-Move using Hand Tracking**

1.  **Define `PINCH` and `PINCH_CLOSED` (or similar) pose in `src/components/hands/handPoseTypes.ts`:**

    ```typescript
    // src/components/hands/handPoseTypes.ts
    export enum HandPose {
      FIST = "Fist",
      TWO_FINGER_V = "Two-Finger V",
      FLAT_HAND = "Flat Hand",
      OPEN_HAND = "Open Hand",
      PINCH_OPEN = "Pinch Open", // Thumb and Index finger tips far apart but other fingers curled
      PINCH_CLOSED = "Pinch Closed", // Thumb and Index finger tips close together
      NONE = "None",
    }

    // ... (Landmark interface and HandLandmarks type remain the same)
    ```

2.  **Implement recognition logic for `PINCH_CLOSED` in `src/components/hands/handPoseRecognition.ts`:**

    - This requires calculating the distance between the thumb tip (landmark 4) and the index finger tip (landmark 8).
    - Other fingers should ideally be somewhat curled or not fully extended.

    Add to `src/components/hands/handPoseRecognition.ts`:

    ```typescript
    // ... (existing LandmarkIndex, distance, isFingerExtended, isFingerCurled, etc.)

    // Helper: Check distance between thumb tip and index finger tip
    function getPinchDistance(landmarks: HandLandmarks): number {
      const thumbTip = landmarks[LandmarkIndex.THUMB_TIP];
      const indexTip = landmarks[LandmarkIndex.INDEX_FINGER_TIP];
      return distance(thumbTip, indexTip);
    }

    // Helper: Check if other fingers (middle, ring, pinky) are curled
    function areOtherFingersCurled(landmarks: HandLandmarks): boolean {
      const wrist = landmarks[LandmarkIndex.WRIST];
      return (
        isFingerCurled(
          landmarks[LandmarkIndex.MIDDLE_FINGER_TIP],
          landmarks[LandmarkIndex.MIDDLE_FINGER_PIP],
          landmarks[LandmarkIndex.MIDDLE_FINGER_MCP],
          wrist,
        ) &&
        isFingerCurled(
          landmarks[LandmarkIndex.RING_FINGER_TIP],
          landmarks[LandmarkIndex.RING_FINGER_PIP],
          landmarks[LandmarkIndex.RING_FINGER_MCP],
          wrist,
        ) &&
        isFingerCurled(
          landmarks[LandmarkIndex.PINKY_TIP],
          landmarks[LandmarkIndex.PINKY_PIP],
          landmarks[LandmarkIndex.PINKY_MCP],
          wrist,
        )
      );
    }

    // Basic Pinch Closed detection: Thumb tip and Index finger tip are close, other fingers curled
    function isPinchClosed(landmarks: HandLandmarks): boolean {
      const pinchDist = getPinchDistance(landmarks);

      // Threshold for pinch distance (e.g., relative to wrist-thumb MCP distance, or an absolute normalized value)
      // For normalized landmarks (0-1), a small absolute value like 0.05 - 0.1 might work. This needs tuning.
      const pinchThreshold = 0.07; // Needs calibration based on observed landmark values

      const thumbExtended = isFingerExtended(
        landmarks[LandmarkIndex.THUMB_TIP],
        landmarks[LandmarkIndex.THUMB_IP],
        landmarks[LandmarkIndex.THUMB_MCP],
      );
      const indexExtended = isFingerExtended(
        landmarks[LandmarkIndex.INDEX_FINGER_TIP],
        landmarks[LandmarkIndex.INDEX_FINGER_PIP],
        landmarks[LandmarkIndex.INDEX_FINGER_MCP],
      );

      return (
        pinchDist < pinchThreshold &&
        areOtherFingersCurled(landmarks) &&
        thumbExtended &&
        indexExtended
      );
    }

    // Basic Pinch Open detection: Thumb tip and Index finger tip are apart, other fingers curled
    function isPinchOpen(landmarks: HandLandmarks): boolean {
      const pinchDist = getPinchDistance(landmarks);
      const pinchOpenThresholdMin = 0.1; // Greater than closed pinch threshold
      // Max threshold can also be added if needed, e.g. not a fully open hand
      // const pinchOpenThresholdMax = 0.3;

      const thumbExtended = isFingerExtended(
        landmarks[LandmarkIndex.THUMB_TIP],
        landmarks[LandmarkIndex.THUMB_IP],
        landmarks[LandmarkIndex.THUMB_MCP],
      );
      const indexExtended = isFingerExtended(
        landmarks[LandmarkIndex.INDEX_FINGER_TIP],
        landmarks[LandmarkIndex.INDEX_FINGER_PIP],
        landmarks[LandmarkIndex.INDEX_FINGER_MCP],
      );

      return (
        pinchDist > pinchOpenThresholdMin &&
        areOtherFingersCurled(landmarks) &&
        thumbExtended &&
        indexExtended
      );
    }

    export function recognizeHandPose(
      landmarks: HandLandmarks | null,
    ): HandPose {
      if (!landmarks || landmarks.length < 21) {
        return HandPose.NONE;
      }

      // Check for PINCH_CLOSED first as it's more specific
      if (isPinchClosed(landmarks)) {
        return HandPose.PINCH_CLOSED;
      }
      if (isPinchOpen(landmarks)) {
        return HandPose.PINCH_OPEN;
      }
      if (isFist(landmarks)) {
        return HandPose.FIST;
      }
      // ... (other checks remain)
      if (isTwoFingerV(landmarks)) {
        return HandPose.TWO_FINGER_V;
      }
      if (isOpenHand(landmarks)) {
        return HandPose.OPEN_HAND;
      }
      if (isFlatHand(landmarks)) {
        return HandPose.FLAT_HAND;
      }

      return HandPose.NONE;
    }
    ```

    _Self-correction_: The `isPinchClosed` definition requires thumb and index to be extended, which is counter-intuitive for a pinch with _other_ fingers curled. Let's refine this. A pinch primarily involves the thumb and index finger. The state of other fingers can vary but often they are curled.
    Revised `isPinchClosed` and `isPinchOpen`:

    ```typescript
    // src/components/hands/handPoseRecognition.ts

    // ... (LandmarkIndex, distance, isFingerExtended, isFingerCurled, getPinchDistance, areOtherFingersCurled are fine)

    // Pinch Closed: Thumb tip and Index finger tip are close.
    // For UI interaction, we might not strictly require other fingers to be curled,
    // but it helps distinguish from e.g. pointing with index finger while thumb is also extended.
    // For now, let's make `areOtherFingersCurled` a strong factor.
    function isPinchClosed(landmarks: HandLandmarks): boolean {
      const pinchDist = getPinchDistance(landmarks);
      const pinchThreshold = 0.06; // Adjusted, needs calibration

      // Thumb and index should be somewhat forward/extended, not curled back into the palm themselves
      const thumbPointed =
        landmarks[LandmarkIndex.THUMB_TIP].y <
          landmarks[LandmarkIndex.THUMB_MCP].y &&
        landmarks[LandmarkIndex.THUMB_TIP].z <
          landmarks[LandmarkIndex.THUMB_MCP].z; // Crude check, z might be tricky
      const indexPointed =
        landmarks[LandmarkIndex.INDEX_FINGER_TIP].y <
        landmarks[LandmarkIndex.INDEX_FINGER_PIP].y;

      return (
        pinchDist < pinchThreshold &&
        areOtherFingersCurled(landmarks) &&
        indexPointed &&
        thumbPointed
      );
    }

    // Pinch Open: Thumb tip and Index finger tip are apart but not extremely so, other fingers curled.
    function isPinchOpen(landmarks: HandLandmarks): boolean {
      const pinchDist = getPinchDistance(landmarks);
      const pinchOpenThresholdMin = 0.08; // Needs calibration
      const pinchOpenThresholdMax = 0.2; // Needs calibration, to distinguish from fully open hand

      const thumbPointed =
        landmarks[LandmarkIndex.THUMB_TIP].y <
          landmarks[LandmarkIndex.THUMB_MCP].y &&
        landmarks[LandmarkIndex.THUMB_TIP].z <
          landmarks[LandmarkIndex.THUMB_MCP].z;
      const indexPointed =
        landmarks[LandmarkIndex.INDEX_FINGER_TIP].y <
        landmarks[LandmarkIndex.INDEX_FINGER_PIP].y;

      return (
        pinchDist > pinchOpenThresholdMin &&
        pinchDist < pinchOpenThresholdMax &&
        areOtherFingersCurled(landmarks) &&
        indexPointed &&
        thumbPointed
      );
    }

    // ... (rest of recognizeHandPose, ensure PINCH_CLOSED and PINCH_OPEN are checked early)
    // Update recognizeHandPose to check pinch poses first or appropriately.
    export function recognizeHandPose(
      landmarks: HandLandmarks | null,
    ): HandPose {
      if (!landmarks || landmarks.length < 21) {
        return HandPose.NONE;
      }

      if (isPinchClosed(landmarks)) {
        return HandPose.PINCH_CLOSED;
      }
      // PINCH_OPEN might be less critical for movement, but good to have
      if (isPinchOpen(landmarks)) {
        return HandPose.PINCH_OPEN;
      }
      if (isFist(landmarks)) {
        return HandPose.FIST;
      }
      // ... (other checks: TwoFingerV, OpenHand, FlatHand)
      if (isTwoFingerV(landmarks)) {
        return HandPose.TWO_FINGER_V;
      }
      if (isOpenHand(landmarks)) {
        return HandPose.OPEN_HAND;
      }
      if (isFlatHand(landmarks)) {
        return HandPose.FLAT_HAND;
      }

      return HandPose.NONE;
    }
    ```

3.  **Modify `useHandTracking.ts` to expose pinch coordinates:**

    - Add state for `pinchMidpointCoordinates` (e.g., `{ x: number, y: number } | null`).
    - In `onHandTrackingResults`, if `activeHandPose` is `PINCH_CLOSED` (or `PINCH_OPEN` if we decide to use it for initiating drag):
      - Calculate the midpoint between thumb tip (4) and index finger tip (8). These are normalized screen coordinates (0-1).
      - Update `pinchMidpointCoordinates` state.
      - If not pinching, set `pinchMidpointCoordinates` to `null`.

    Add to `src/components/hands/useHandTracking.ts`:

    ```typescript
    // ... (existing imports)
    // Add HandPose to import from ./handPoseTypes
    // import { HandPose, type HandLandmarks } from './handPoseTypes';

    export interface HandPosition {
      // This already exists for index finger
      x: number;
      y: number;
    }

    export interface PinchCoordinates {
      // New interface for pinch midpoint
      x: number;
      y: number;
    }

    interface UseHandTrackingOptions {
      enabled: boolean;
    }

    export function useHandTracking({ enabled }: UseHandTrackingOptions) {
      // ... (existing refs and state)
      const [activeHandPose, setActiveHandPose] = useState<HandPose>(
        HandPose.NONE,
      );
      const [pinchMidpoint, setPinchMidpoint] =
        useState<PinchCoordinates | null>(null); // New state

      const onHandTrackingResults = useCallback(
        (results: HandResults) => {
          // ... (existing canvas clearing and setup)

          let handsDetected = 0;
          let rightHandLandmarks: HandLandmarks | null = null;

          if (results.multiHandLandmarks && results.multiHandedness) {
            handsDetected = results.multiHandLandmarks.length;
            for (
              let index = 0;
              index < results.multiHandLandmarks.length;
              index++
            ) {
              const classification = results.multiHandedness[index];
              const isRightHand = classification.label !== "Right"; // Assuming 'Right' is the label for the physical right hand, which appears as left in selfieMode=false (mirrored)
              // If selfieMode is true, 'Right' would be the user's right hand on the right side of the screen.
              // The current code uses `selfieMode: false`. If `classification.label` is 'Left', it's the user's left hand.
              // Let's assume we want to track the hand labeled 'Right' by MediaPipe, which due to mirroring might be the user's left hand on screen or vice-versa.
              // The original `isRightHand` logic was `classification.label !== 'Right'`. This means it was looking for the 'Left' hand (or any non-'Right' hand).
              // Let's clarify: if `selfieMode: false`, the video is NOT mirrored. User's right hand is on right of screen.
              // If `selfieMode: true` (default for Hands), video IS mirrored. User's right hand is on left of screen.
              // The `Hands` option `selfieMode` is set to `false` in this hook. So video is NOT mirrored.
              // `classification.label` will be 'Right' for user's right hand, 'Left' for user's left hand.
              // So, `isRightHand = classification.label === 'Right'` if we want the user's actual right hand.
              // The `DynamicPointer` inverts X: `(1 - handPosition.x)`. This implies it expects mirrored coordinates or wants to mirror them.
              // Let's stick to tracking one primary hand for now, say the one classified as 'Right'.

              const currentHandIsRight = classification.label === "Right"; // Corrected logic for selfieMode: false
              const landmarks = results.multiHandLandmarks[
                index
              ] as HandLandmarks;

              if (currentHandIsRight) {
                // Let's focus on the right hand for pinch control
                rightHandLandmarks = landmarks;
                if (landmarks.length > 8) {
                  // Ensure index finger tip landmark exists
                  const indexFingerTip = landmarks[8];
                  setHandPosition({
                    // This is for the general pointer, keep it
                    x: indexFingerTip.x,
                    y: indexFingerTip.y,
                  });
                }
              }
              // ... (drawing landmarks logic remains)
              drawConnectors(
                canvasCtx,
                landmarks,
                HAND_CONNECTIONS as LandmarkConnectionArray,
                {
                  color: "#3f3f46",
                  lineWidth: 1,
                },
              );
              drawLandmarks(canvasCtx, landmarks, {
                color: "#fff",
                lineWidth: 1,
                fillColor: "#000",
                radius: 4,
              });
            }
          }

          if (rightHandLandmarks) {
            const pose = recognizeHandPose(rightHandLandmarks);
            setActiveHandPose(pose);

            if (
              pose === HandPose.PINCH_CLOSED ||
              pose === HandPose.PINCH_OPEN
            ) {
              // Or whichever pose initiates drag
              const thumbTip = rightHandLandmarks[4]; // THUMB_TIP
              const indexTip = rightHandLandmarks[8]; // INDEX_FINGER_TIP
              if (thumbTip && indexTip) {
                setPinchMidpoint({
                  x: (thumbTip.x + indexTip.x) / 2,
                  y: (thumbTip.y + indexTip.y) / 2,
                });
              } else {
                setPinchMidpoint(null);
              }
            } else {
              setPinchMidpoint(null);
            }
          } else {
            setHandPosition(null);
            setActiveHandPose(HandPose.NONE);
            setPinchMidpoint(null);
          }

          if (enabled) {
            setHandTrackingStatus(
              handsDetected > 0
                ? `${handsDetected} hand(s) detected`
                : "No hands detected",
            );
          }
          canvasCtx.restore();
        },
        [enabled, рукиRef.current],
      ); // Added handsRef to dependencies if used inside for options
      // ... (useEffect for initialization and cleanup) ...
      // Ensure handsRef.current.setOptions includes selfieMode: false as it is now.

      // ... (useEffect for canvas dimensions) ...

      return {
        videoRef,
        landmarkCanvasRef,
        handPosition, // For general pointer
        handTrackingStatus,
        activeHandPose, // Current recognized pose
        pinchMidpoint, // New: coordinates for pinch
      };
    }
    ```

4.  **Modify `src/pages/HomePage.tsx` and its `PinnableChatWindow` to use pinch-to-move:**

    - Pass `activeHandPose` and `pinchMidpoint` from `HandTracking` (via `useHandTracking` in `HomePage`) to `PinnableChatWindow`.
    - In `PinnableChatWindow`:
      - Add state for `isPinchDragging` and `pinchDragStartCoords` (midpoint screen coords), `initialPinchElementPos`.
      - `useEffect` to watch `activeHandPose` and `pinchMidpoint`.
        - If `activeHandPose` becomes `PINCH_CLOSED` and not already pinch-dragging:
          - Set `isPinchDragging = true`.
          - Store current `pinchMidpoint` as `pinchDragStartCoords`.
          - Store current element position as `initialPinchElementPos`.
          - Call `pinElement(chatWindowId, elementState.position)`.
        - If `isPinchDragging` is true and `activeHandPose` is `PINCH_CLOSED` and `pinchMidpoint` changes:
          - Convert normalized `pinchMidpoint` and `pinchDragStartCoords` to screen pixel delta (multiply by `window.innerWidth`, `window.innerHeight`).
          - Calculate new element position: `initialPinchElementPos + delta`.
          - Call `setElementPosition(chatWindowId, newPosition)`.
        - If `isPinchDragging` is true and `activeHandPose` is _not_ `PINCH_CLOSED`:
          - Set `isPinchDragging = false`.
          - Call `unpinElement(chatWindowId)`.

    Update `src/pages/HomePage.tsx`:

    ```typescript
    // src/pages/HomePage.tsx
    import React, { useState, useEffect, useRef } from "react";
    import { HandTracking, HandPose, PinchCoordinates } from "@/components/hands"; // Import HandPose and PinchCoordinates
    import { ChatContainer } from "@/components/chat";
    import { useUIElementsStore } from "@/stores/uiElementsStore";

    interface PinnableChatWindowProps {
      activeHandPose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
      // We might need to know if hand tracking is active overall to avoid conflicts with mouse
      isHandTrackingActive: boolean;
    }

    const PinnableChatWindow: React.FC<PinnableChatWindowProps> = ({
      activeHandPose,
      pinchMidpoint,
      isHandTrackingActive
    }) => {
      const chatWindowId = 'chatWindow';
      const elementState = useUIElementsStore((state) => state.getElement(chatWindowId));
      const setPosition = useUIElementsStore((state) => state.setElementPosition);
      const pinElement = useUIElementsStore((state) => state.pinElement);
      const unpinElement = useUIElementsStore((state) => state.unpinElement);

      const [isMouseDragging, setIsMouseDragging] = useState(false);
      const [mouseDragStart, setMouseDragStart] = useState<{ x: number; y: number } | null>(null);

      const [isPinchDragging, setIsPinchDragging] = useState(false);
      const [pinchDragStartCoords, setPinchDragStartCoords] = useState<PinchCoordinates | null>(null);

      const initialElementPosRef = useRef<{ x: number; y: number } | null>(null);

      // Initialize position from store or a default if not found
      const currentPosition = elementState?.position || { x: 16, y: window.innerHeight - 350 - 16 };

      // Effect for Hand Tracking Pinch-to-Move
      useEffect(() => {
        if (!isHandTrackingActive || !elementState) return;

        const isPinching = activeHandPose === HandPose.PINCH_CLOSED;

        if (isPinching && pinchMidpoint && !isPinchDragging) {
          // Start pinch drag
          setIsPinchDragging(true);
          setPinchDragStartCoords(pinchMidpoint); // Normalized (0-1)
          initialElementPosRef.current = elementState.position;
          pinElement(chatWindowId, elementState.position);
          console.log("Pinch drag started");
        } else if (isPinchDragging && isPinching && pinchMidpoint && pinchDragStartCoords && initialElementPosRef.current) {
          // Continue pinch drag
          // Convert normalized pinch coordinates to screen pixel delta
          const dxNormalized = pinchMidpoint.x - pinchDragStartCoords.x;
          const dyNormalized = pinchMidpoint.y - pinchDragStartCoords.y;

          // IMPORTANT: MediaPipe's y is often inverted (0 at top). UI y is 0 at top.
          // handPosition.y from useHandTracking is (1 - handPosition.y) in DynamicPointer.
          // Let's assume pinchMidpoint y is also 0 at top.
          // The DynamicPointer mapping is:
          // x_vp = (1 - hand.x) * vp.width - vp.width / 2
          // y_vp = (1 - hand.y) * vp.height - vp.height / 2
          // This means hand.x=0 is right, hand.x=1 is left. hand.y=0 is bottom, hand.y=1 is top.
          // For UI, we want hand.x=0 left, hand.x=1 right. And hand.y=0 top, hand.y=1 bottom.
          // So, if pinchMidpoint has raw mediapipe coordinates:
          // deltaX_screen = (pinchMidpoint.x - pinchDragStartCoords.x) * window.innerWidth;
          // deltaY_screen = (pinchMidpoint.y - pinchDragStartCoords.y) * window.innerHeight;
          // But `DynamicPointer` uses (1-x) and (1-y). If `pinchMidpoint` follows `handPosition` (index finger tip),
          // then x is normalized (0=left, 1=right on camera feed, which is mirrored if selfieMode=true).
          // y is normalized (0=top, 1=bottom on camera feed).
          // With selfieMode: false, camera is not mirrored. handPosition x=0 is left, y=0 is top.
          // `useHandTracking` sets `selfieMode: false`. `handPosition` is {x: landmark.x, y: landmark.y}.
          // So, `pinchMidpoint` x and y are direct normalized coordinates (0-1, origin top-left).

          // The `DynamicPointer` inverts X and Y because it maps to a 3D scene viewport where origin might be center.
          // `const x_vp = (1 - handPosition.x) * viewport.width - viewport.width / 2;`
          // `const y_vp = (1 - handPosition.y) * viewport.height - viewport.height / 2;`
          // This implies handPosition.x is 0=left, 1=right and handPosition.y is 0=top, 1=bottom.
          // So the `pinchMidpoint` derived from these landmarks should also be 0=left, 0=top.
          // Thus, `dxNormalized` and `dyNormalized` should be correct for screen delta.

          const deltaXScreen = dxNormalized * window.innerWidth;
          const deltaYScreen = dyNormalized * window.innerHeight;

          setPosition(chatWindowId, {
            x: initialElementPosRef.current.x + deltaXScreen,
            y: initialElementPosRef.current.y + deltaYScreen,
          });

        } else if (isPinchDragging && !isPinching) {
          // End pinch drag
          setIsPinchDragging(false);
          setPinchDragStartCoords(null);
          initialElementPosRef.current = null;
          if (elementState.isPinned) { // only unpin if it was pinned by this logic
            unpinElement(chatWindowId);
          }
          console.log("Pinch drag ended");
        }
      }, [
        activeHandPose,
        pinchMidpoint,
        isPinchDragging,
        pinchDragStartCoords,
        elementState,
        setPosition,
        pinElement,
        unpinElement,
        isHandTrackingActive
      ]);

      // Basic Mouse Drag Handlers (modified to not interfere if pinch is active)
      const handleMouseDown = (e: React.MouseEvent) => {
        if (isPinchDragging || !elementState || !isHandTrackingActive) return; // Don't allow mouse drag if pinch is active or hand tracking not active
        setIsMouseDragging(true);
        setMouseDragStart({ x: e.clientX, y: e.clientY });
        initialElementPosRef.current = elementState.position;
        pinElement(chatWindowId, elementState.position);
        e.preventDefault();
      };

      const handleMouseMove = (e: React.MouseEvent) => {
        if (!isMouseDragging || !mouseDragStart || !initialElementPosRef.current || !elementState?.isPinned || isPinchDragging) return;
        const dx = e.clientX - mouseDragStart.x;
        const dy = e.clientY - mouseDragStart.y;
        setPosition(chatWindowId, { x: initialElementPosRef.current.x + dx, y: initialElementPosRef.current.y + dy });
      };

      const handleMouseUp = () => {
        if (!isMouseDragging || !elementState?.isPinned || isPinchDragging) return;
        setIsMouseDragging(false);
        setMouseDragStart(null);
        initialElementPosRef.current = null;
        unpinElement(chatWindowId);
      };

      useEffect(() => {
        const handleMouseUpGlobal = () => {
            if (isMouseDragging) handleMouseUp();
        };
        const handleMouseMoveGlobal = (e: MouseEvent) => { // Need to use global MouseEvent
            if (isMouseDragging) handleMouseMove(e as any); // Cast for compatibility
        };

        if (isMouseDragging) {
          document.addEventListener('mousemove', handleMouseMoveGlobal);
          document.addEventListener('mouseup', handleMouseUpGlobal);
        }
        return () => {
          document.removeEventListener('mousemove', handleMouseMoveGlobal);
          document.removeEventListener('mouseup', handleMouseUpGlobal);
        };
      }, [isMouseDragging, handleMouseMove, handleMouseUp]);


      return (
        <div
          id={chatWindowId}
          className={`absolute w-[32rem] p-1 ${isPinchDragging || isMouseDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            left: `${currentPosition.x}px`,
            top: `${currentPosition.y}px`,
            pointerEvents: 'auto',
            userSelect: (isMouseDragging || isPinchDragging) ? 'none' : 'auto',
            zIndex: (elementState?.isPinned || isPinchDragging) ? 1000 : 50 // Bring to front when pinned/dragged
          }}
          onMouseDown={isHandTrackingActive ? undefined : handleMouseDown} // Only allow mouse drag if hand tracking is NOT active to avoid conflict
        >
          <div className="h-80 opacity-85 hover:opacity-100 transition-opacity duration-200 border border-border rounded-md shadow-lg bg-background/80 backdrop-blur-sm">
            <ChatContainer
              className="bg-transparent" // Make chat container transparent if wrapper has backdrop
              systemMessage="You are an AI agent..." // Shortened for brevity
              model="gemma3:1b"
            />
          </div>
        </div>
      );
    };

    export default function HomePage() {
      const [showHandTracking, setShowHandTracking] = useState(false); // Default to false

      // Get hand tracking data here to pass to PinnableChatWindow
      const { activeHandPose, pinchMidpoint } = useHandTracking({ enabled: showHandTracking });

      return (
        <div className="flex flex-col h-full w-full relative overflow-hidden"> {/* Added overflow-hidden */}
          {/* Hand tracking component itself is not visible but provides data */}
          <HandTracking
            showHandTracking={showHandTracking}
            setShowHandTracking={setShowHandTracking}
          />

          {/* UI Overlay */}
          <div className="relative w-full h-full" style={{ pointerEvents: 'none' }}>
            <PinnableChatWindow
              activeHandPose={activeHandPose}
              pinchMidpoint={pinchMidpoint}
              isHandTrackingActive={showHandTracking}
            />
          </div>
        </div>
      );
    }
    ```

    _Self-correction_: The `handleMouseDown` should probably be disabled if hand tracking is active and a hand is detected/pinching, to avoid conflicting drags. The current `PinnableChatWindow` disables mouse down if `isHandTrackingActive` is true. This is a simple way to prioritize hand tracking.
    _Self-correction_: Updated `PinnableChatWindow` `onMouseDown` to only be active if hand tracking is _not_ active. This prevents mouse drag from interfering with pinch-drag.
    _Self-correction_: Store `initialElementPos` in a `useRef` to avoid stale closures in the `useEffect` for pinch dragging.
    _Self-correction_: The style for `PinnableChatWindow`'s wrapper div can be enhanced for better visual feedback (e.g., `backdrop-blur-sm`, `opacity`).

5.  **Run `pnpm run t` and `pnpm test`.**
    - New props for `PinnableChatWindow` mean any tests for `HomePage` might need updates if they snapshot or check props.
    - The pinch gesture itself is hard to unit test without complex mocking of `useHandTracking`. We rely on `tsc` for type safety and will manually test the interaction.

This completes the core pinch-to-move logic using hand tracking.

**Phase 4: Refinements and Testing**

1.  **Visual Feedback:**

    - In `PinnableChatWindow`'s style, a `zIndex` is added to bring the element to the front when `isPinned` (which is set during both mouse and pinch drag).
    - A `cursor-grabbing` class is added during drag.
    - The chat window div itself can have a slight shadow or border change effect when `elementState?.isPinned` is true. (Added `shadow-lg` and backdrop blur to the inner div for better visuals).

2.  **Smoothness:**

    - The current implementation updates position directly. `react-spring` or `framer-motion` could be used for smoother animated transitions, but that's an advanced refinement beyond the immediate scope if current performance is acceptable. For now, direct style updates are fine.

3.  **Testing:**

    - Manually test:
      - Mouse dragging works as before.
      - Enable hand tracking.
      - Perform a "pinch closed" gesture with thumb and index finger (other fingers curled).
      - Move the hand while maintaining the pinch. The chat window should follow.
      - Release the pinch. The chat window should stay in the new position and be unpinned.
      - Test persistence: move the window, reload the app. It should retain its position.
      - Test default position on first load or cleared storage.

4.  **Final checks:**
    - Run `pnpm run t`
    - Run `pnpm test`

This covers the main requirements. The pinch gesture thresholds in `handPoseRecognition.ts` (`pinchThreshold`, `pinchOpenThresholdMin`, `pinchOpenThresholdMax`) will likely need careful calibration through manual testing to feel right. The interpretation of "finger and thumb pinch" using the MediaPipe hand tracking is a complex interaction, so fine-tuning will be key.Okay, I'm ready to provide the instructions for the coding agent.

Here are the phased instructions:

**Phase 1: Setup Zustand Store for UI Element Positions**

1.  **Create Directory:**

    - If it doesn't already exist, create a new directory: `src/stores`.

2.  **Create Store File:**

    - Create a new file: `src/stores/uiElementsStore.ts`.
    - Populate `src/stores/uiElementsStore.ts` with the following content:

      ```typescript
      import { create } from "zustand";
      import { persist, createJSONStorage } from "zustand/middleware";

      export interface UIPosition {
        x: number;
        y: number;
      }

      export interface UIElementState {
        id: string;
        position: UIPosition;
        isPinned: boolean; // True if the element is currently being interacted with (dragged/pinched)
      }

      interface UIElementsStoreState {
        elements: Record<string, UIElementState>;
        setElementPosition: (id: string, position: UIPosition) => void;
        pinElement: (id: string, initialPosition?: UIPosition) => void;
        unpinElement: (id: string) => void;
        getElement: (id: string) => UIElementState | undefined;
        ensureElement: (id: string, defaultPosition: UIPosition) => void;
      }

      const initialChatWindowState: UIElementState = {
        id: "chatWindow",
        position: { x: 16, y: 450 }, // Default position, adjust as needed
        isPinned: false,
      };

      export const useUIElementsStore = create<UIElementsStoreState>()(
        persist(
          (set, get) => ({
            elements: {
              chatWindow: { ...initialChatWindowState },
            },
            setElementPosition: (id, position) =>
              set((state) => ({
                elements: {
                  ...state.elements,
                  [id]: {
                    ...(state.elements[id] || {
                      id,
                      position,
                      isPinned: false,
                    }),
                    position,
                  },
                },
              })),
            pinElement: (id, initialPosition) =>
              set((state) => {
                const currentElement = state.elements[id];
                const posToSet = initialPosition ||
                  currentElement?.position || { x: 0, y: 0 };
                return {
                  elements: {
                    ...state.elements,
                    [id]: {
                      ...(currentElement || {
                        id,
                        position: posToSet,
                        isPinned: false,
                      }), // Ensure all fields exist
                      position: posToSet, // Explicitly set position on pin
                      isPinned: true,
                    },
                  },
                };
              }),
            unpinElement: (id) =>
              set((state) => {
                if (!state.elements[id]) return state;
                return {
                  elements: {
                    ...state.elements,
                    [id]: {
                      ...state.elements[id],
                      isPinned: false,
                    },
                  },
                };
              }),
            getElement: (id) => get().elements[id],
            ensureElement: (id, defaultPosition) =>
              set((state) => {
                if (state.elements[id]) return state;
                return {
                  elements: {
                    ...state.elements,
                    [id]: {
                      id,
                      position: defaultPosition,
                      isPinned: false,
                    },
                  },
                };
              }),
          }),
          {
            name: "ui-elements-positions",
            storage: createJSONStorage(() => localStorage),
            // On rehydration, we want isPinned to be false for all elements
            onRehydrateStorage: () => (state) => {
              if (state) {
                for (const elemId in state.elements) {
                  state.elements[elemId].isPinned = false;
                }
              }
            },
          },
        ),
      );
      ```

3.  **Create Store Unit Test:**

    - Create a new file: `src/tests/unit/stores/uiElementsStore.test.ts`.
    - Populate it with:

      ```typescript
      import { describe, it, expect, beforeEach, vi } from "vitest";
      import {
        useUIElementsStore,
        UIElementState,
      } from "@/stores/uiElementsStore";

      describe("useUIElementsStore", () => {
        beforeEach(() => {
          // Reset store state before each test using the initial state definition
          useUIElementsStore.setState(
            useUIElementsStore.getInitialState(),
            true,
          );

          // Clear localStorage mock
          localStorage.clear();
          // Mock onRehydrateStorage if it causes issues in tests, or ensure it's handled
          vi.spyOn(console, "log").mockImplementation(() => {}); // Suppress console logs from store if any
        });

        it("should initialize with a default chatWindow element", () => {
          const chatWindow = useUIElementsStore
            .getState()
            .getElement("chatWindow");
          expect(chatWindow).toBeDefined();
          expect(chatWindow?.position).toEqual({ x: 16, y: 450 });
          expect(chatWindow?.isPinned).toBe(false);
        });

        it("should set element position", () => {
          useUIElementsStore
            .getState()
            .setElementPosition("chatWindow", { x: 100, y: 200 });
          const chatWindow = useUIElementsStore
            .getState()
            .getElement("chatWindow");
          expect(chatWindow?.position).toEqual({ x: 100, y: 200 });
        });

        it("should create a new element if id does not exist on setElementPosition", () => {
          useUIElementsStore
            .getState()
            .setElementPosition("newElement", { x: 50, y: 50 });
          const newElement = useUIElementsStore
            .getState()
            .getElement("newElement");
          expect(newElement).toBeDefined();
          expect(newElement?.position).toEqual({ x: 50, y: 50 });
          expect(newElement?.isPinned).toBe(false);
        });

        it("should pin an element and set its position", () => {
          useUIElementsStore
            .getState()
            .pinElement("chatWindow", { x: 10, y: 20 });
          const chatWindow = useUIElementsStore
            .getState()
            .getElement("chatWindow");
          expect(chatWindow?.isPinned).toBe(true);
          expect(chatWindow?.position).toEqual({ x: 10, y: 20 });
        });

        it("should pin an element using its current position if no initial position is provided", () => {
          useUIElementsStore
            .getState()
            .setElementPosition("chatWindow", { x: 123, y: 456 });
          useUIElementsStore.getState().pinElement("chatWindow"); // No position passed
          const chatWindow = useUIElementsStore
            .getState()
            .getElement("chatWindow");
          expect(chatWindow?.isPinned).toBe(true);
          expect(chatWindow?.position).toEqual({ x: 123, y: 456 }); // Should retain its current pos
        });

        it("should unpin an element", () => {
          useUIElementsStore.getState().pinElement("chatWindow");
          useUIElementsStore.getState().unpinElement("chatWindow");
          const chatWindow = useUIElementsStore
            .getState()
            .getElement("chatWindow");
          expect(chatWindow?.isPinned).toBe(false);
        });

        it("should return undefined for a non-existent element", () => {
          const nonExistent = useUIElementsStore
            .getState()
            .getElement("nonExistent");
          expect(nonExistent).toBeUndefined();
        });

        it("should ensure an element exists or create it with default position", () => {
          useUIElementsStore
            .getState()
            .ensureElement("testElement", { x: 1, y: 1 });
          let testElement = useUIElementsStore
            .getState()
            .getElement("testElement");
          expect(testElement).toBeDefined();
          expect(testElement?.position).toEqual({ x: 1, y: 1 });

          // Call again, should not change existing
          useUIElementsStore
            .getState()
            .ensureElement("testElement", { x: 2, y: 2 });
          testElement = useUIElementsStore.getState().getElement("testElement");
          expect(testElement?.position).toEqual({ x: 1, y: 1 });
        });

        it("onRehydrateStorage should set isPinned to false for all elements", () => {
          // Simulate state before rehydration with a pinned element
          const stateWithPinnedElement = {
            elements: {
              chatWindow: {
                id: "chatWindow",
                position: { x: 10, y: 10 },
                isPinned: true,
              },
              anotherElement: {
                id: "anotherElement",
                position: { x: 20, y: 20 },
                isPinned: true,
              },
            },
            // Mock other store functions if onRehydrateStorage interacts with them
            setElementPosition: () => {},
            pinElement: () => {},
            unpinElement: () => {},
            getElement: () => undefined,
            ensureElement: () => {},
          };

          const onRehydrate = useUIElementsStore.persist.onRehydrateStorage();
          onRehydrate(stateWithPinnedElement as any); // Type assertion for simplicity

          expect(stateWithPinnedElement.elements.chatWindow.isPinned).toBe(
            false,
          );
          expect(stateWithPinnedElement.elements.anotherElement.isPinned).toBe(
            false,
          );
        });
      });
      ```

4.  **Update Test Setup for localStorage:**

    - Modify `src/tests/unit/setup.ts` to include a robust `localStorage` and `sessionStorage` mock:

      ```typescript
      import "@testing-library/jest-dom";

      const createStorageMock = () => {
        let store: Record<string, string> = {};
        return {
          getItem: (key: string): string | null => store[key] || null,
          setItem: (key: string, value: string): void => {
            store[key] = String(value);
          },
          removeItem: (key: string): void => {
            delete store[key];
          },
          clear: (): void => {
            store = {};
          },
          key: (index: number): string | null =>
            Object.keys(store)[index] || null,
          get length(): number {
            return Object.keys(store).length;
          },
        };
      };

      Object.defineProperty(window, "localStorage", {
        value: createStorageMock(),
        writable: true, // Allow re-assignment if needed by other test setups
      });

      Object.defineProperty(window, "sessionStorage", {
        value: createStorageMock(),
        writable: true,
      });
      ```

5.  **Verify:**
    - Run `pnpm run t`.
    - Run `pnpm test`. Ensure all tests pass.

**Phase 2: Make Chat Window Positionable and Draggable with Mouse**

1.  **Modify `src/pages/HomePage.tsx`:**

    - Create an inner component `PinnableChatWindow` that uses the `useUIElementsStore` for its position and implements mouse dragging.
    - Update `HomePage` to use this new component and pass necessary hand tracking props later.

    ```typescript
    // src/pages/HomePage.tsx
    import React, { useState, useEffect, useRef, useCallback } from "react";
    import { HandTracking, HandPose, PinchCoordinates } from "@/components/hands";
    import { ChatContainer } from "@/components/chat";
    import { useUIElementsStore, UIPosition } from "@/stores/uiElementsStore";

    interface PinnableChatWindowProps {
      activeHandPose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
      isHandTrackingActive: boolean;
    }

    const PinnableChatWindow: React.FC<PinnableChatWindowProps> = ({
      activeHandPose,
      pinchMidpoint,
      isHandTrackingActive,
    }) => {
      const chatWindowId = 'chatWindow';

      // Ensure element is in store with a default position
      const defaultPosition = { x: 16, y: window.innerHeight - 366 }; // 350 height + 16 padding
      useUIElementsStore.getState().ensureElement(chatWindowId, defaultPosition);

      const elementState = useUIElementsStore(useCallback(state => state.getElement(chatWindowId), [chatWindowId]));
      const setPosition = useUIElementsStore(state => state.setElementPosition);
      const pinElement = useUIElementsStore(state => state.pinElement);
      const unpinElement = useUIElementsStore(state => state.unpinElement);

      const [isMouseDragging, setIsMouseDragging] = useState(false);
      const mouseDragStartRef = useRef<{ x: number; y: number } | null>(null);
      const initialElementPosRef = useRef<UIPosition | null>(null);

      // Derived position, with fallback just in case
      const currentPosition = elementState?.position || defaultPosition;

      // Mouse Drag Handlers
      const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isHandTrackingActive || !elementState) return;

        e.preventDefault();
        e.stopPropagation();

        setIsMouseDragging(true);
        mouseDragStartRef.current = { x: e.clientX, y: e.clientY };
        initialElementPosRef.current = currentPosition; // Use currentPosition from state/default
        pinElement(chatWindowId, currentPosition);
      }, [isHandTrackingActive, elementState, pinElement, currentPosition, chatWindowId]);

      const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isMouseDragging || !mouseDragStartRef.current || !initialElementPosRef.current || !elementState?.isPinned) return;

        const dx = e.clientX - mouseDragStartRef.current.x;
        const dy = e.clientY - mouseDragStartRef.current.y;
        setPosition(chatWindowId, {
          x: initialElementPosRef.current.x + dx,
          y: initialElementPosRef.current.y + dy
        });
      }, [isMouseDragging, elementState?.isPinned, setPosition, chatWindowId]);

      const handleMouseUp = useCallback(() => {
        if (!isMouseDragging || !elementState?.isPinned) return;

        setIsMouseDragging(false);
        mouseDragStartRef.current = null;
        initialElementPosRef.current = null;
        unpinElement(chatWindowId);
      }, [isMouseDragging, elementState?.isPinned, unpinElement, chatWindowId]);

      useEffect(() => {
        if (isMouseDragging) {
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }, [isMouseDragging, handleMouseMove, handleMouseUp]);

      // Placeholder for Pinch Logic (Phase 3)
      // const [isPinchDragging, setIsPinchDragging] = useState(false);
      // const pinchDragStartCoordsRef = useRef<PinchCoordinates | null>(null);
      // useEffect(() => { /* ... pinch logic here ... */ }, [activeHandPose, pinchMidpoint, ...]);

      const isInteracting = isMouseDragging; // || isPinchDragging;

      return (
        <div
          id={chatWindowId}
          className={`absolute w-[32rem] p-1 ${isInteracting ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            left: `${currentPosition.x}px`,
            top: `${currentPosition.y}px`,
            pointerEvents: 'auto',
            userSelect: isInteracting ? 'none' : 'auto',
            zIndex: isInteracting || elementState?.isPinned ? 1000 : 50,
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="h-80 opacity-85 hover:opacity-100 transition-opacity duration-200 border border-border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden">
            <ChatContainer
              className="bg-transparent !h-full" // Ensure ChatContainer fills this div
              systemMessage="You are an AI agent named 'Agent' inside an app used by a human called Commander. Respond helpfully but concisely, in 2-3 sentences."
              model="gemma3:1b"
            />
          </div>
        </div>
      );
    };

    export default function HomePage() {
      const [showHandTracking, setShowHandTracking] = useState(false);
      const { activeHandPose, pinchMidpoint } = useHandTracking({ enabled: showHandTracking });

      return (
        <div className="flex flex-col h-full w-full relative overflow-hidden">
          <HandTracking
            showHandTracking={showHandTracking}
            setShowHandTracking={setShowHandTracking}
          />
          <div className="relative w-full h-full" style={{ pointerEvents: 'none' }}>
            <PinnableChatWindow
              activeHandPose={activeHandPose}
              pinchMidpoint={pinchMidpoint}
              isHandTrackingActive={showHandTracking}
            />
          </div>
        </div>
      );
    }
    ```

2.  **Verify:**
    - Run `pnpm run t`.
    - Run `pnpm test`.
    - Manually test: The chat window should appear. You should be able to click and drag it with the mouse. Its position should be saved in `localStorage` and restored on reload.

**Phase 3: Implement Pinch-to-Move using Hand Tracking**

1.  **Update Hand Pose Types:**

    - Modify `src/components/hands/handPoseTypes.ts`:

      ```typescript
      // src/components/hands/handPoseTypes.ts
      export enum HandPose {
        FIST = "Fist",
        TWO_FINGER_V = "Two-Finger V",
        FLAT_HAND = "Flat Hand",
        OPEN_HAND = "Open Hand",
        PINCH_CLOSED = "Pinch Closed", // Thumb and Index finger tips close
        NONE = "None",
      }

      // Landmark type from MediaPipe (simplified)
      export interface Landmark {
        x: number;
        y: number;
        z: number;
        visibility?: number;
      }

      export type HandLandmarks = Landmark[];
      ```

2.  **Update Hand Pose Recognition:**

    - Modify `src/components/hands/handPoseRecognition.ts` to include `isPinchClosed` logic and call it in `recognizeHandPose`.

      ```typescript
      // src/components/hands/handPoseRecognition.ts
      // ... (LandmarkIndex, distance, isFingerExtended, isFingerCurled remain the same) ...

      // Helper to calculate distance between thumb tip and index finger tip
      function getPinchDistance(landmarks: HandLandmarks): number {
        const thumbTip = landmarks[LandmarkIndex.THUMB_TIP];
        const indexTip = landmarks[LandmarkIndex.INDEX_FINGER_TIP];
        return distance(thumbTip, indexTip);
      }

      // Helper to check if other fingers (middle, ring, pinky) are curled
      function areOtherFingersCurled(landmarks: HandLandmarks): boolean {
        const wrist = landmarks[LandmarkIndex.WRIST];
        return (
          isFingerCurled(
            landmarks[LandmarkIndex.MIDDLE_FINGER_TIP],
            landmarks[LandmarkIndex.MIDDLE_FINGER_PIP],
            landmarks[LandmarkIndex.MIDDLE_FINGER_MCP],
            wrist,
          ) &&
          isFingerCurled(
            landmarks[LandmarkIndex.RING_FINGER_TIP],
            landmarks[LandmarkIndex.RING_FINGER_PIP],
            landmarks[LandmarkIndex.RING_FINGER_MCP],
            wrist,
          ) &&
          isFingerCurled(
            landmarks[LandmarkIndex.PINKY_TIP],
            landmarks[LandmarkIndex.PINKY_PIP],
            landmarks[LandmarkIndex.PINKY_MCP],
            wrist,
          )
        );
      }

      // Pinch Closed: Thumb tip and Index finger tip are close.
      // Other fingers should be curled to make the gesture distinct.
      // Thumb and Index finger should be somewhat extended, not curled.
      function isPinchClosed(landmarks: HandLandmarks): boolean {
        const pinchDist = getPinchDistance(landmarks);
        // This threshold is crucial and needs calibration.
        // Normalized coordinates (0-1), so this is a percentage of screen/image dimension.
        const pinchThreshold = 0.05;

        // Check if thumb and index finger are generally extended (not curled themselves)
        const thumbExtended = !isFingerCurled(
          landmarks[LandmarkIndex.THUMB_TIP],
          landmarks[LandmarkIndex.THUMB_IP],
          landmarks[LandmarkIndex.THUMB_MCP],
          landmarks[LandmarkIndex.WRIST],
        );
        const indexExtended = !isFingerCurled(
          landmarks[LandmarkIndex.INDEX_FINGER_TIP],
          landmarks[LandmarkIndex.INDEX_FINGER_PIP],
          landmarks[LandmarkIndex.INDEX_FINGER_MCP],
          landmarks[LandmarkIndex.WRIST],
        );

        // A simpler check for thumb/index extension: are their tips further from MCP than PIPs?
        // const thumbExtended = isFingerExtended(landmarks[LandmarkIndex.THUMB_TIP], landmarks[LandmarkIndex.THUMB_IP], landmarks[LandmarkIndex.THUMB_MCP]);
        // const indexExtended = isFingerExtended(landmarks[LandmarkIndex.INDEX_FINGER_TIP], landmarks[LandmarkIndex.INDEX_FINGER_PIP], landmarks[LandmarkIndex.INDEX_FINGER_MCP]);

        return (
          pinchDist < pinchThreshold &&
          areOtherFingersCurled(landmarks) &&
          thumbExtended &&
          indexExtended
        );
      }

      export function recognizeHandPose(
        landmarks: HandLandmarks | null,
      ): HandPose {
        if (!landmarks || landmarks.length < 21) {
          return HandPose.NONE;
        }

        // Prioritize specific gestures like PINCH_CLOSED
        if (isPinchClosed(landmarks)) {
          return HandPose.PINCH_CLOSED;
        }
        if (isFist(landmarks)) {
          return HandPose.FIST;
        }
        if (isTwoFingerV(landmarks)) {
          return HandPose.TWO_FINGER_V;
        }
        if (isOpenHand(landmarks)) {
          return HandPose.OPEN_HAND;
        }
        if (isFlatHand(landmarks)) {
          return HandPose.FLAT_HAND;
        }

        return HandPose.NONE;
      }
      ```

3.  **Update `useHandTracking.ts`:**

    - Add `PinchCoordinates` type and `pinchMidpoint` state.
    - Calculate and set `pinchMidpoint` in `onHandTrackingResults`.

      ```typescript
      // src/components/hands/useHandTracking.ts
      import { useCallback, useEffect, useRef, useState } from "react";
      // ... (other mediapipe imports)
      import { HandPose, type HandLandmarks } from "./handPoseTypes";
      import { recognizeHandPose } from "./handPoseRecognition";

      // Fix for the WebAssembly issues in Electron
      declare global {
        interface Window {
          moduleInitialized: boolean;
        }
      }

      export interface HandPosition {
        // For general pointer, e.g., index finger tip
        x: number;
        y: number;
      }

      export interface PinchCoordinates {
        // For pinch midpoint
        x: number;
        y: number;
        z?: number; // Optional depth, might be useful
      }

      interface UseHandTrackingOptions {
        enabled: boolean;
      }

      export function useHandTracking({ enabled }: UseHandTrackingOptions) {
        const videoRef = useRef<HTMLVideoElement>(null);
        const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
        const cameraRef = useRef<Camera | null>(null);
        const handsRef = useRef<Hands | null>(null);
        const [handTrackingStatus, setHandTrackingStatus] =
          useState("Inactive");
        const [handPosition, setHandPosition] = useState<HandPosition | null>(
          null,
        );
        const [activeHandPose, setActiveHandPose] = useState<HandPose>(
          HandPose.NONE,
        );
        const [pinchMidpoint, setPinchMidpoint] =
          useState<PinchCoordinates | null>(null); // New state

        const onHandTrackingResults = useCallback(
          (results: HandResults) => {
            if (!landmarkCanvasRef.current || !enabled) {
              if (landmarkCanvasRef.current) {
                const canvasCtx = landmarkCanvasRef.current.getContext("2d")!;
                canvasCtx.clearRect(
                  0,
                  0,
                  landmarkCanvasRef.current.width,
                  landmarkCanvasRef.current.height,
                );
              }
              setHandPosition(null);
              setActiveHandPose(HandPose.NONE);
              setPinchMidpoint(null); // Reset pinch midpoint
              return;
            }

            const canvasCtx = landmarkCanvasRef.current.getContext("2d")!;
            canvasCtx.save();
            canvasCtx.clearRect(
              0,
              0,
              landmarkCanvasRef.current.width,
              landmarkCanvasRef.current.height,
            );

            let handsDetected = 0;
            let primaryHandLandmarks: HandLandmarks | null = null; // Use this for pose and pinch

            if (results.multiHandLandmarks && results.multiHandedness) {
              handsDetected = results.multiHandLandmarks.length;
              for (
                let index = 0;
                index < results.multiHandLandmarks.length;
                index++
              ) {
                const classification = results.multiHandedness[index];
                // Assuming selfieMode: false (video not mirrored), 'Right' is user's physical right hand.
                // Let's prioritize the first detected hand or a specific hand (e.g. 'Right')
                // For simplicity, let's use the first hand detected as the primary hand.
                if (index === 0) {
                  // Or filter by classification.label === 'Right' if preferred
                  primaryHandLandmarks = results.multiHandLandmarks[
                    index
                  ] as HandLandmarks;
                }

                // Draw all detected hands
                const landmarks = results.multiHandLandmarks[
                  index
                ] as HandLandmarks;
                drawConnectors(
                  canvasCtx,
                  landmarks,
                  HAND_CONNECTIONS as LandmarkConnectionArray,
                  {
                    color: "#3f3f46",
                    lineWidth: 1,
                  },
                );
                drawLandmarks(canvasCtx, landmarks, {
                  color: "#fff",
                  lineWidth: 1,
                  fillColor: "#000",
                  radius: (landmark, i) => (i === 4 || i === 8 ? 6 : 4), // Highlight thumb and index tips
                });
              }
            }

            if (primaryHandLandmarks) {
              // Set general hand position (e.g., index finger tip of the primary hand)
              if (primaryHandLandmarks.length > 8) {
                const indexFingerTip = primaryHandLandmarks[8];
                setHandPosition({
                  x: indexFingerTip.x,
                  y: indexFingerTip.y,
                });
              }

              const pose = recognizeHandPose(primaryHandLandmarks);
              setActiveHandPose(pose);

              if (pose === HandPose.PINCH_CLOSED) {
                const thumbTip = primaryHandLandmarks[4]; // THUMB_TIP
                const indexTip = primaryHandLandmarks[8]; // INDEX_FINGER_TIP
                if (thumbTip && indexTip) {
                  setPinchMidpoint({
                    x: (thumbTip.x + indexTip.x) / 2,
                    y: (thumbTip.y + indexTip.y) / 2,
                    z: (thumbTip.z + indexTip.z) / 2, // Average Z as well
                  });
                } else {
                  setPinchMidpoint(null);
                }
              } else {
                setPinchMidpoint(null);
              }
            } else {
              setHandPosition(null);
              setActiveHandPose(HandPose.NONE);
              setPinchMidpoint(null);
            }

            if (enabled) {
              setHandTrackingStatus(
                handsDetected > 0
                  ? `${handsDetected} hand(s) detected`
                  : "No hands detected",
              );
            }
            canvasCtx.restore();
          },
          [enabled],
        ); // Removed handsRef.current from dependencies, as it's stable after init

        // ... (useEffect for initialization and cleanup - ensure selfieMode: false is set in hands.setOptions) ...

        // ... (useEffect for canvas dimensions) ...

        return {
          videoRef,
          landmarkCanvasRef,
          handPosition,
          handTrackingStatus,
          activeHandPose,
          pinchMidpoint, // Expose pinch midpoint
        };
      }
      ```

4.  **Update `PinnableChatWindow` in `src/pages/HomePage.tsx` for Pinch Logic:**

    ```typescript
    // src/pages/HomePage.tsx
    // ... (imports remain the same) ...

    // interface PinnableChatWindowProps ... (remains the same)

    const PinnableChatWindow: React.FC<PinnableChatWindowProps> = ({
      activeHandPose,
      pinchMidpoint,
      isHandTrackingActive,
    }) => {
      const chatWindowId = 'chatWindow';
      const defaultPosition = { x: 16, y: window.innerHeight - 366 };
      useUIElementsStore.getState().ensureElement(chatWindowId, defaultPosition);

      const elementState = useUIElementsStore(useCallback(state => state.getElement(chatWindowId), [chatWindowId]));
      const setPosition = useUIElementsStore(state => state.setElementPosition);
      const pinElement = useUIElementsStore(state => state.pinElement);
      const unpinElement = useUIElementsStore(state => state.unpinElement);

      // Mouse Drag states
      const [isMouseDragging, setIsMouseDragging] = useState(false);
      const mouseDragStartRef = useRef<{ x: number; y: number } | null>(null);

      // Pinch Drag states
      const [isPinchDragging, setIsPinchDragging] = useState(false);
      const pinchDragStartCoordsRef = useRef<PinchCoordinates | null>(null); // Stores normalized screen coords (0-1)

      // Common state for initial position during drag (mouse or pinch)
      const initialElementPosOnDragRef = useRef<UIPosition | null>(null);

      const currentPosition = elementState?.position || defaultPosition;

      // Effect for Hand Tracking Pinch-to-Move
      useEffect(() => {
        if (!isHandTrackingActive || !elementState || isMouseDragging) return; // Don't pinch if mouse is dragging

        const isPinchingClosed = activeHandPose === HandPose.PINCH_CLOSED;

        if (isPinchingClosed && pinchMidpoint && !isPinchDragging) {
          // Start pinch drag
          setIsPinchDragging(true);
          pinchDragStartCoordsRef.current = pinchMidpoint; // Normalized (0-1)
          initialElementPosOnDragRef.current = elementState.position;
          pinElement(chatWindowId, elementState.position);
          // console.log("Pinch drag started at:", pinchMidpoint, " Initial Ele Pos:", elementState.position);
        } else if (isPinchDragging && isPinchingClosed && pinchMidpoint && pinchDragStartCoordsRef.current && initialElementPosOnDragRef.current) {
          // Continue pinch drag
          const dxNormalized = pinchMidpoint.x - pinchDragStartCoordsRef.current.x;
          const dyNormalized = pinchMidpoint.y - pinchDragStartCoordsRef.current.y;

          // Convert normalized delta to screen pixel delta
          // For hand tracking, X is typically mirrored by default.
          // useHandTracking has selfieMode: false, so landmarks x:0 is left, y:0 is top.
          // DynamicPointer uses (1-x), (1-y) mapping for 3D world.
          // For 2D UI, if pinchMidpoint.x is 0 (left) to 1 (right) and pinchMidpoint.y is 0 (top) to 1 (bottom),
          // then simple delta * dimension is correct.
          const deltaXScreen = dxNormalized * window.innerWidth;
          const deltaYScreen = dyNormalized * window.innerHeight;

          const newX = initialElementPosOnDragRef.current.x + deltaXScreen;
          const newY = initialElementPosOnDragRef.current.y + deltaYScreen;

          setPosition(chatWindowId, { x: newX, y: newY });
        } else if (isPinchDragging && !isPinchingClosed) {
          // End pinch drag
          setIsPinchDragging(false);
          pinchDragStartCoordsRef.current = null;
          initialElementPosOnDragRef.current = null;
          if (elementState.isPinned) {
            unpinElement(chatWindowId);
          }
          // console.log("Pinch drag ended");
        }
      }, [
        activeHandPose, pinchMidpoint, isPinchDragging, elementState,
        setPosition, pinElement, unpinElement, isHandTrackingActive, isMouseDragging, chatWindowId
      ]);

      // Mouse Drag Handlers
      const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isHandTrackingActive || !elementState || isPinchDragging) return; // Don't mouse drag if hand tracking active or pinch dragging

        e.preventDefault();
        e.stopPropagation();

        setIsMouseDragging(true);
        mouseDragStartRef.current = { x: e.clientX, y: e.clientY };
        initialElementPosOnDragRef.current = currentPosition;
        pinElement(chatWindowId, currentPosition);
      }, [isHandTrackingActive, elementState, pinElement, currentPosition, chatWindowId, isPinchDragging]);

      const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isMouseDragging || !mouseDragStartRef.current || !initialElementPosOnDragRef.current || !elementState?.isPinned || isPinchDragging) return;

        const dx = e.clientX - mouseDragStartRef.current.x;
        const dy = e.clientY - mouseDragStartRef.current.y;
        setPosition(chatWindowId, {
          x: initialElementPosOnDragRef.current.x + dx,
          y: initialElementPosOnDragRef.current.y + dy
        });
      }, [isMouseDragging, elementState?.isPinned, setPosition, chatWindowId, isPinchDragging]);

      const handleMouseUp = useCallback(() => {
        if (!isMouseDragging || !elementState?.isPinned || isPinchDragging) return;

        setIsMouseDragging(false);
        mouseDragStartRef.current = null;
        initialElementPosOnDragRef.current = null;
        unpinElement(chatWindowId);
      }, [isMouseDragging, elementState?.isPinned, unpinElement, chatWindowId, isPinchDragging]);

      useEffect(() => {
        if (isMouseDragging) {
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }, [isMouseDragging, handleMouseMove, handleMouseUp]);

      const isInteracting = isMouseDragging || isPinchDragging;

      return (
        <div
          id={chatWindowId}
          className={`absolute w-[32rem] p-1 ${isInteracting ? 'cursor-grabbing ring-2 ring-primary' : 'cursor-grab'}`} // Added ring for visual feedback
          style={{
            left: `${currentPosition.x}px`,
            top: `${currentPosition.y}px`,
            pointerEvents: 'auto',
            userSelect: isInteracting ? 'none' : 'auto',
            zIndex: isInteracting || elementState?.isPinned ? 1000 : 50,
            transition: isPinchDragging ? 'none' : 'left 0.05s ease-out, top 0.05s ease-out', // Smooth mouse drag, instant pinch
          }}
          onMouseDown={handleMouseDown} // Mouse drag still available if hand tracking is off or not pinching
        >
          <div
             className={`h-80 transition-all duration-200 border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden
                         ${isPinchDragging ? 'opacity-100 border-primary scale-105' : 'opacity-85 hover:opacity-100 border-border'}`}
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

    // ... (HomePage component remains the same, passing props to PinnableChatWindow)
    export default function HomePage() {
      const [showHandTracking, setShowHandTracking] = useState(false);
      const { activeHandPose, pinchMidpoint } = useHandTracking({ enabled: showHandTracking });

      return (
        <div className="flex flex-col h-full w-full relative overflow-hidden">
          <HandTracking
            showHandTracking={showHandTracking}
            setShowHandTracking={setShowHandTracking}
          />
          <div className="relative w-full h-full" style={{ pointerEvents: 'none' }}>
            <PinnableChatWindow
              activeHandPose={activeHandPose}
              pinchMidpoint={pinchMidpoint}
              isHandTrackingActive={showHandTracking}
            />
          </div>
        </div>
      );
    }
    ```

5.  **Verify:**
    - Run `pnpm run t`.
    - Run `pnpm test`.
    - Manually test the pinch-to-move functionality. Enable hand tracking, perform the pinch gesture, and move your hand. The chat window should follow.

**Phase 4: Refinements and Final Testing**

1.  **Visual Feedback during Pinch:**

    - The `PinnableChatWindow` in Phase 3 already includes some visual feedback:
      - `cursor-grabbing` and `ring-2 ring-primary` on the outer div during interaction.
      - `opacity-100 border-primary scale-105` on the inner div during pinch dragging.
    - This should provide decent visual cues.

2.  **Smoothness:**

    - A conditional `transition` style was added: `transition: isPinchDragging ? 'none' : 'left 0.05s ease-out, top 0.05s ease-out'`. This makes mouse dragging slightly smoother while pinch dragging (which updates frequently) is instant to avoid lag.

3.  **Calibration Note:**

    - The `pinchThreshold` in `src/components/hands/handPoseRecognition.ts` (e.g., `0.05`) is critical. It needs to be adjusted by testing with the actual hand tracking setup to determine a comfortable distance for "closed pinch". This value depends on the scale of normalized landmark coordinates and typical finger distances.

4.  **Final Test Pass:**

    - Thoroughly test mouse dragging.
    - Thoroughly test pinch-to-move with hand tracking enabled.
      - Start pinch, move, release pinch.
      - Ensure no conflicts between mouse and pinch dragging (mouse drag should be disabled/ignored if hand tracking is active and a pinch gesture is intended or active). The current logic in `handleMouseDown` (`if (isHandTrackingActive || isPinchDragging) return;`) attempts to address this.
    - Test persistence: move window, reload, check position.
    - Test across different hand sizes/distances from camera if possible, to check pinch gesture robustness.

5.  **Code Review and Cleanup:**

    - Review all new and modified files for clarity, correctness, and adherence to project style.
    - Remove any `console.log` statements used for debugging.

6.  **Run Final Checks:**
    - `pnpm run t`
    - `pnpm test`

This set of instructions should guide the agent to implement the pinch-to-move functionality as requested. The pinch gesture recognition and coordinate mapping are the most complex parts and may require iterative refinement based on real-world testing.
