Okay, I will provide specific coding instructions to implement the requested changes.

**Objective:**
1.  Remove the default "Chats" and "Changelog" panes.
2.  Replace them with a single, hardcoded NIP-28 channel pane (`ee7352c54c85004d3d994a48d87c488905795f956f88842394eb3c6edc615978`) as the default starting view.
3.  Move the "New Channel" functionality from the (now removed) "Chats" pane to a new button in the bottom-left corner of the HUD, next to the `ResetHUDButton` and `HandTrackingToggleButton`. This button will use a new chat icon.

Here are the specific coding instructions:

**Step 1: Modify Pane Store and Constants**

1.  **Update `src/stores/panes/constants.ts`**:
    *   Define a new constant for the default NIP-28 channel ID and its pane ID.
    *   Remove or comment out `CHATS_PANE_ID` and `CHANGELOG_PANE_ID` if they are no longer used elsewhere.

    ```typescript
    // src/stores/panes/constants.ts
    export const DEFAULT_PANE_WIDTH = 400;
    export const DEFAULT_PANE_HEIGHT = 300;
    export const PANE_MARGIN = 20; // General margin or offset for tiling
    export const PANE_OFFSET = 45; // Specific offset for new panes when tiling

    // Remove or comment out old default pane IDs
    // export const CHATS_PANE_ID = 'chats';
    // export const CHANGELOG_PANE_ID = 'changelog';

    // Add new default NIP-28 channel constants
    export const DEFAULT_NIP28_CHANNEL_ID = 'ee7352c54c85004d3d994a48d87c488905795f956f88842394eb3c6edc615978';
    export const DEFAULT_NIP28_PANE_ID = `nip28-${DEFAULT_NIP28_CHANNEL_ID}`;
    export const DEFAULT_NIP28_CHANNEL_TITLE = 'Welcome Chat';
    ```

2.  **Update `src/stores/pane.ts`**:
    *   Modify `getInitialPanes` to return only the new default NIP-28 channel pane.
    *   Update `initialState` to set `activePaneId` to the new default pane's ID.
    *   Adjust the `merge` function in the `persist` middleware.

    ```typescript
    // src/stores/pane.ts
    import { create } from "zustand";
    import { persist, createJSONStorage } from "zustand/middleware";
    import { Pane, PaneInput } from "@/types/pane";
    import { PaneStoreType, PaneState } from "./panes/types";
    import {
      addPaneAction,
      removePaneAction,
      updatePanePositionAction,
      updatePaneSizeAction,
      openChatPaneAction, // This might become less relevant if 'chats' pane is gone
      bringPaneToFrontAction,
      setActivePaneAction,
      createNip28ChannelPaneAction,
    } from "./panes/actions";
    import {
      DEFAULT_NIP28_PANE_ID,
      DEFAULT_NIP28_CHANNEL_ID,
      DEFAULT_NIP28_CHANNEL_TITLE,
      PANE_MARGIN,
      DEFAULT_PANE_WIDTH, // Keep for general new panes
      DEFAULT_PANE_HEIGHT // Keep for general new panes
    } from "./panes/constants";


    // Function to get initial panes
    const getInitialPanes = (): Pane[] => {
      const initialPanes: Pane[] = [];

      // Default NIP-28 Channel Pane
      initialPanes.push({
        id: DEFAULT_NIP28_PANE_ID,
        type: 'nip28_channel',
        title: DEFAULT_NIP28_CHANNEL_TITLE,
        x: PANE_MARGIN + 50, // Example central positioning
        y: PANE_MARGIN + 50,
        width: 800, // Larger default size
        height: 600,
        isActive: true,
        dismissable: false, // This main pane should not be dismissable
        content: {
          channelId: DEFAULT_NIP28_CHANNEL_ID,
          channelName: DEFAULT_NIP28_CHANNEL_TITLE,
        },
      });
      return initialPanes;
    };

    const initialState: PaneState = {
      panes: getInitialPanes(),
      activePaneId: DEFAULT_NIP28_PANE_ID, // Default active pane is the NIP-28 channel
      lastPanePosition: null, // Can be set based on the default pane's initial position if needed
    };

    // Set lastPanePosition based on the default pane
    if (initialState.panes.length > 0) {
        const defaultPane = initialState.panes[0];
        initialState.lastPanePosition = {
            x: defaultPane.x,
            y: defaultPane.y,
            width: defaultPane.width,
            height: defaultPane.height
        };
    }

    export const usePaneStore = create<PaneStoreType>()(
      persist(
        (set, get) => ({
          ...initialState,
          addPane: (newPaneInput: PaneInput, shouldTile?: boolean) => addPaneAction(set, newPaneInput, shouldTile),
          removePane: (id: string) => removePaneAction(set, id),
          updatePanePosition: (id: string, x: number, y: number) => updatePanePositionAction(set, id, x, y),
          updatePaneSize: (id: string, width: number, height: number) => updatePaneSizeAction(set, id, width, height),
          // openChatPane might be deprecated or significantly changed if the 'chats' list pane is removed.
          // For now, keep it if other parts of the code might still use it to open generic chat panes.
          openChatPane: (newPaneInput: PaneInput, isCommandKeyHeld?: boolean) => openChatPaneAction(set, newPaneInput, isCommandKeyHeld),
          bringPaneToFront: (id: string) => bringPaneToFrontAction(set, id),
          setActivePane: (id: string | null) => setActivePaneAction(set, id),
          createNip28ChannelPane: (channelName?: string) => createNip28ChannelPaneAction(set, get, channelName),
          resetHUDState: () => {
            const newInitialState = {
                panes: getInitialPanes(),
                activePaneId: DEFAULT_NIP28_PANE_ID,
                lastPanePosition: null,
            };
            if (newInitialState.panes.length > 0) {
                const defaultPane = newInitialState.panes[0];
                newInitialState.lastPanePosition = {
                    x: defaultPane.x,
                    y: defaultPane.y,
                    width: defaultPane.width,
                    height: defaultPane.height
                };
            }
            set(newInitialState);
          },
        }),
        {
          name: 'commander-pane-storage-v2', // Changed name to ensure fresh state
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({
            panes: state.panes,
            lastPanePosition: state.lastPanePosition,
            activePaneId: state.activePaneId,
          }),
          merge: (persistedState, currentState) => {
            const merged = { ...currentState, ...(persistedState as Partial<PaneStoreType>) };
            // Ensure the default NIP-28 pane is always present if persisted state is empty or malformed
            if (!merged.panes || merged.panes.length === 0 || !merged.panes.some(p => p.id === DEFAULT_NIP28_PANE_ID)) {
              merged.panes = getInitialPanes();
              merged.activePaneId = DEFAULT_NIP28_PANE_ID;
               if (merged.panes.length > 0) {
                  const defaultPane = merged.panes[0];
                  merged.lastPanePosition = {
                      x: defaultPane.x,
                      y: defaultPane.y,
                      width: defaultPane.width,
                      height: defaultPane.height
                  };
              } else {
                merged.lastPanePosition = null;
              }
            }
            return merged;
          },
        }
      )
    );
    ```

**Step 2: Modify Pane Manager (`src/panes/PaneManager.tsx`)**

*   Remove the "New Chan" button that was conditionally rendered for the 'chats' pane.

    ```typescript
    // src/panes/PaneManager.tsx
    import React from 'react';
    import { usePaneStore } from '@/stores/pane';
    import { Pane as PaneComponent } from '@/panes/Pane';
    import { Pane as PaneType } from '@/types/pane';
    // Remove Button and PlusCircle imports if no longer used here
    // import { Button } from '@/components/ui/button';
    // import { PlusCircle } from 'lucide-react';
    import { Nip28ChannelChat } from '@/components/nip28';

    // ... (Placeholder components remain the same) ...
    const PlaceholderChatComponent = ({ threadId }: { threadId?: string }) => <div className="p-2">Chat Pane Content {threadId && `for ${threadId}`}</div>;
    const PlaceholderChatsPaneComponent = () => <div className="p-2">Chats List Pane Content</div>;
    const PlaceholderChangelogComponent = () => <div className="p-2">Changelog Pane Content</div>;
    const PlaceholderDiffComponent = ({ oldContent, newContent }: { oldContent?: string, newContent?: string }) => (
      <div className="p-2">
        <h3>Old Content:</h3><pre className="bg-muted p-1 rounded text-xs">{oldContent || "N/A"}</pre>
        <h3>New Content:</h3><pre className="bg-muted p-1 rounded text-xs">{newContent || "N/A"}</pre>
      </div>
    );
    const PlaceholderUserStatusComponent = () => <div className="p-2">User Status Pane Content</div>;
    const PlaceholderDefaultComponent = ({ type }: { type: string }) => <div className="p-2">Default Content for Pane Type: {type}</div>;


    export const PaneManager = () => {
      const { panes, activePaneId } = usePaneStore();
      // const createNip28Channel = usePaneStore((state) => state.createNip28ChannelPane); // No longer needed here

      const baseZIndex = 10;

      return (
        <>
          {panes.map((pane: PaneType, index: number) => (
            <PaneComponent
              key={pane.id}
              title={pane.title}
              id={pane.id}
              x={pane.x}
              y={pane.y}
              height={pane.height}
              width={pane.width}
              type={pane.type}
              isActive={pane.id === activePaneId}
              style={{
                zIndex: baseZIndex + index
              }}
              dismissable={pane.dismissable !== false} // Use dismissable prop directly
              content={pane.content}
              // titleBarButtons removed from here as it was specific to the 'chats' pane button
            >
              {/* Render content based on pane type */}
              {pane.type === 'chat' && <PlaceholderChatComponent threadId={pane.id.replace(/^chat-|^nip28-/, '')} />}
              {/* 'chats' pane type might be removed or repurposed if the list is gone */}
              {pane.type === 'chats' && <PlaceholderChatsPaneComponent />}
              {pane.type === 'changelog' && <PlaceholderChangelogComponent />}
              {pane.type === 'user' && <PlaceholderUserStatusComponent />}
              {pane.type === 'diff' && pane.content && (
                <PlaceholderDiffComponent oldContent={pane.content.oldContent} newContent={pane.content.newContent} />
              )}
              {pane.type === 'nip28_channel' && pane.content?.channelId && (
                <Nip28ChannelChat
                  channelId={pane.content.channelId}
                  channelName={pane.content.channelName || pane.title}
                />
              )}
              {pane.type === 'default' && <PlaceholderDefaultComponent type={pane.type} />}
              {!(
                pane.type === 'chat' ||
                pane.type === 'chats' ||
                pane.type === 'changelog' ||
                pane.type === 'user' ||
                pane.type === 'diff' ||
                pane.type === 'nip28_channel' ||
                pane.type === 'default'
              ) && <PlaceholderDefaultComponent type={pane.type} />}
            </PaneComponent>
          ))}
        </>
      );
    };
    ```

**Step 3: Create a New "New Channel" Button Component**

*   Create a new file: `src/components/hud/NewChannelButton.tsx` (or similar, e.g., `src/components/panes/NewChannelButton.tsx`)

    ```typescript
    // src/components/hud/NewChannelButton.tsx
    import React from 'react';
    import { MessageSquarePlus } from 'lucide-react'; // Using MessageSquarePlus icon
    import { Button } from '@/components/ui/button';
    import { usePaneStore } from '@/stores/pane';

    const NewChannelButton: React.FC = () => {
      const createNip28Channel = usePaneStore((state) => state.createNip28ChannelPane);

      const handleCreateChannel = () => {
        // Generate a default channel name or prompt user if needed (prompt is tricky in Electron main app)
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '');
        const defaultName = `New Channel ${timestamp}`;
        createNip28Channel(defaultName);
      };

      return (
        <Button
          onClick={handleCreateChannel}
          variant="outline"
          size="icon"
          className="fixed bottom-4 left-[7rem] z-[10000] p-2 !rounded-full shadow-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border"
          // left-28 = 7rem, assuming 1rem = 4 units from tailwind config (default)
          // left-4 (1rem), left-16 (4rem), next is left-28 (7rem) if buttons are 2.5rem wide with 0.5rem spacing
          aria-label="Create New Channel"
          title="Create New NIP-28 Channel"
        >
          <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
        </Button>
      );
    };

    export default NewChannelButton;
    ```

**Step 4: Integrate the New Button into `src/pages/HomePage.tsx`**

*   Import and render the `NewChannelButton`.

    ```typescript
    // src/pages/HomePage.tsx
    import React, { useState, useEffect, useRef } from "react";
    import { PaneManager } from "@/panes/PaneManager";
    import { SimpleGrid } from "@/components/home/SimpleGrid";
    import ResetHUDButton from "@/components/ResetHUDButton";
    import HandTrackingToggleButton from "@/components/hands/HandTrackingToggleButton";
    import NewChannelButton from "@/components/hud/NewChannelButton"; // Import the new button
    import { HandTracking, HandPose } from "@/components/hands";
    import { type PinchCoordinates, type HandLandmarks } from "@/components/hands/handPoseTypes";
    import { usePaneStore } from "@/stores/pane";

    // ... (HandDataContext interface and TITLE_BAR_HEIGHT constant remain the same) ...
    interface HandDataContext {
      activeHandPose: HandPose;
      pinchMidpoint: PinchCoordinates | null;
      primaryHandLandmarks: HandLandmarks | null;
      trackedHandsCount: number;
    }

    const TITLE_BAR_HEIGHT = 32;

    export default function HomePage() {
      const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
      const [handData, setHandData] = useState<HandDataContext | null>(null);

      const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
      const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
      const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

      const { panes, bringPaneToFront, updatePanePosition, activePaneId: currentActivePaneId } = usePaneStore();

      const toggleHandTracking = () => {
        const newState = !isHandTrackingActive;
        setIsHandTrackingActive(newState);
        if (!newState && draggingPaneId) { // If turning off while dragging
          setDraggingPaneId(null);
          initialPinchPositionRef.current = null;
          paneStartPosRef.current = null;
        }
      };

      const prevHandDataRef = useRef<HandDataContext | null>(null);

      const handleHandDataUpdate = (data: HandDataContext) => {
        if (!prevHandDataRef.current ||
            data.activeHandPose !== prevHandDataRef.current.activeHandPose ||
            data.trackedHandsCount !== prevHandDataRef.current.trackedHandsCount ||
            JSON.stringify(data.pinchMidpoint) !== JSON.stringify(prevHandDataRef.current.pinchMidpoint)) {
          prevHandDataRef.current = data;
          setHandData(data);
        }
      };

      useEffect(() => {
        if (!isHandTrackingActive || !handData || !handData.pinchMidpoint || handData.trackedHandsCount === 0) {
          if (draggingPaneId) {
            setDraggingPaneId(null);
            initialPinchPositionRef.current = null;
            paneStartPosRef.current = null;
          }
          return;
        }

        const { activeHandPose, pinchMidpoint } = handData;

        if (activeHandPose === HandPose.PINCH_CLOSED) {
          if (!draggingPaneId) {
            for (let i = panes.length - 1; i >= 0; i--) {
              const pane = panes[i];
              if (
                pinchMidpoint.x >= pane.x &&
                pinchMidpoint.x <= pane.x + pane.width &&
                pinchMidpoint.y >= pane.y &&
                pinchMidpoint.y <= pane.y + TITLE_BAR_HEIGHT
              ) {
                setDraggingPaneId(pane.id);
                paneStartPosRef.current = { x: pane.x, y: pane.y };
                initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
                if (pane.id !== currentActivePaneId) {
                  bringPaneToFront(pane.id);
                }
                break;
              }
            }
          } else if (initialPinchPositionRef.current && paneStartPosRef.current) {
            const deltaX = pinchMidpoint.x - initialPinchPositionRef.current.x;
            const deltaY = pinchMidpoint.y - initialPinchPositionRef.current.y;

            if (Math.abs(deltaX) >= 1 || Math.abs(deltaY) >= 1) {
              const newX = paneStartPosRef.current.x + deltaX;
              const newY = paneStartPosRef.current.y + deltaY;
              initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
              paneStartPosRef.current = { x: newX, y: newY };
              updatePanePosition(draggingPaneId, newX, newY);
            }
          }
        } else {
          if (draggingPaneId) {
            setDraggingPaneId(null);
            initialPinchPositionRef.current = null;
            paneStartPosRef.current = null;
          }
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [isHandTrackingActive, handData, draggingPaneId]);

      return (
        <div className="relative w-full h-full overflow-hidden">
          <SimpleGrid />
          <PaneManager />

          <HandTracking
            showHandTracking={isHandTrackingActive}
            setShowHandTracking={setIsHandTrackingActive}
            onHandDataUpdate={handleHandDataUpdate}
          />

          <ResetHUDButton />
          <HandTrackingToggleButton
            isHandTrackingActive={isHandTrackingActive}
            onToggle={toggleHandTracking}
          />
          <NewChannelButton /> {/* Add the new button here */}
        </div>
      );
    }
    ```

**Step 5: (Optional) Cleanup `src/stores/panes/actions/openChatPane.ts`**
The `openChatPaneAction` had logic specifically ensuring the 'chats' pane exists. If the 'chats' pane is entirely removed and `openChatPaneAction` is no longer used or is repurposed for opening individual generic chat panes (not NIP-28 specific), this function might need refactoring or removal. For now, the instructions focus on the default pane and the new channel button. If `openChatPane` is still used for other purposes, its logic related to the 'chats' pane (like `ensureChatsPane`) should be re-evaluated or removed.

These changes should fulfill all the user's requests. After applying these, test the application to ensure:
*   It starts with only the "Welcome Chat" NIP-28 pane.
*   This pane is active and displays content from `Nip28ChannelChat`.
*   The "New Channel" button appears in the bottom-left, next to the other HUD controls.
*   Clicking the "New Channel" button successfully calls `createNip28ChannelPaneAction` and creates/opens a new NIP-28 channel pane as per that action's logic.
*   The `ResetHUDButton` correctly resets to the single "Welcome Chat" pane.

Make sure all imports are correct and paths are adjusted as needed (e.g., for `NewChannelButton`).
