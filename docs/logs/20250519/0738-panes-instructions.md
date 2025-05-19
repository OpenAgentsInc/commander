Okay, I will provide specific instructions for a coding agent to implement the pane system from scratch in the current codebase, using `docs/panes.md` as the primary reference. This will include creating two example panes on the `src/pages/HomePage.tsx`.

**Prerequisites:**
Ensure your project is set up with React, TypeScript, Tailwind CSS, and Electron. The current codebase (OpenAgents Commander) already meets these.

**Step 0: Install Dependencies**

The pane system relies on `zustand` for state management and `@use-gesture/react` for drag and resize interactions. Add these to your project:

```bash
pnpm add zustand @use-gesture/react
```
`lucide-react` is already a dependency and will be used for icons.

**Step 1: Pane Data Structure**

Create the file `src/types/pane.ts` with the following content. This defines the structure for pane objects.

```typescript
// src/types/pane.ts
export type Pane = {
  id: string; // Unique identifier for the pane. For chat panes, this might be derived from a chat/thread ID.
  type: 'default' | 'chat' | 'chats' | 'user' | 'diff' | 'changelog' | string; // Type of content the pane displays. Add more as needed.
  title: string; // Title displayed in the pane's title bar.
  x: number; // X-coordinate of the top-left corner.
  y: number; // Y-coordinate of the top-left corner.
  width: number; // Width of the pane.
  height: number; // Height of the pane.
  isActive?: boolean; // Indicates if the pane is currently active (focused).
  dismissable?: boolean; // If true, the pane can be closed by the user.
  content?: { // Optional content, used by 'diff' type or other custom types.
    oldContent?: string;
    newContent?: string;
    [key: string]: any; // Allows for other content properties
  };
  // Add any other pane-specific properties here, e.g.:
  // chatId?: string; // If the pane is associated with a chat
}

// Type for input when creating a new pane, where x, y, width, height are optional or calculated.
export type PaneInput = Omit<Pane, 'x' | 'y' | 'width' | 'height' | 'id' | 'isActive'> & {
  id?: string; // ID might be generated or passed.
  // Optional initial position/size, can be calculated by the manager if not provided.
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}
```

**Step 2: Zustand Store for Panes**

Create the directory `src/stores/panes/`. This will hold the logic for pane state management.

1.  **Create `src/stores/panes/types.ts`:**
    ```typescript
    // src/stores/panes/types.ts
    import { Pane, PaneInput } from '@/types/pane';

    export interface PaneState {
      panes: Pane[];
      activePaneId: string | null; // Tracks the ID of the currently active pane
      lastPanePosition: { x: number; y: number; width: number; height: number } | null;
      // Add any other global state related to panes if needed
    }

    export interface PaneStoreType extends PaneState {
      addPane: (newPane: PaneInput, shouldTile?: boolean) => void;
      removePane: (id: string) => void;
      updatePanePosition: (id: string, x: number, y: number) => void;
      updatePaneSize: (id: string, width: number, height: number) => void;
      openChatPane: (newPane: PaneInput, isCommandKeyHeld?: boolean) => void; // Specific action for chat panes
      bringPaneToFront: (id: string) => void;
      setActivePane: (id: string | null) => void;
      resetHUDState: () => void;
    }

    export type SetPaneStore = (
      partial: PaneStoreType | Partial<PaneStoreType> | ((state: PaneStoreType) => PaneStoreType | Partial<PaneStoreType>),
      replace?: boolean | undefined
    ) => void;
    ```

2.  **Create `src/stores/panes/constants.ts`:**
    ```typescript
    // src/stores/panes/constants.ts
    export const DEFAULT_PANE_WIDTH = 400;
    export const DEFAULT_PANE_HEIGHT = 300;
    export const PANE_MARGIN = 20; // General margin or offset for tiling
    export const PANE_OFFSET = 45; // Specific offset for new panes when tiling, as used in openChatPane
    export const CHATS_PANE_ID = 'chats';
    export const CHANGELOG_PANE_ID = 'changelog';
    ```

3.  **Create `src/stores/panes/utils/calculatePanePosition.ts`:**
    ```typescript
    // src/stores/panes/utils/calculatePanePosition.ts
    import { Pane } from '@/types/pane';
    import { PANE_OFFSET, DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT, PANE_MARGIN } from '../constants';

    export function calculateNewPanePosition(
      existingPanes: Pane[],
      lastPanePosition: { x: number; y: number; width: number; height: number } | null
    ): { x: number; y: number; width: number; height: number } {
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

      if (lastPanePosition) {
        let newX = lastPanePosition.x + PANE_OFFSET;
        let newY = lastPanePosition.y + PANE_OFFSET;

        if (newX + DEFAULT_PANE_WIDTH > screenWidth - PANE_MARGIN) {
          newX = PANE_MARGIN * 2;
        }
        if (newY + DEFAULT_PANE_HEIGHT > screenHeight - PANE_MARGIN) {
          newY = PANE_MARGIN * 2;
        }
        return { x: newX, y: newY, width: DEFAULT_PANE_WIDTH, height: DEFAULT_PANE_HEIGHT };
      }

      return {
        x: PANE_MARGIN,
        y: PANE_MARGIN,
        width: DEFAULT_PANE_WIDTH,
        height: DEFAULT_PANE_HEIGHT,
      };
    }
    ```

4.  **Create `src/stores/panes/utils/ensurePaneIsVisible.ts`:**
    ```typescript
    // src/stores/panes/utils/ensurePaneIsVisible.ts
    import { Pane } from '@/types/pane';
    import { PANE_MARGIN } from '../constants';

    export function ensurePaneIsVisible(pane: Pane): Pane {
      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

      let { x, y, width, height } = pane;

      width = Math.max(width, 200);
      height = Math.max(height, 100);

      if (x + width > screenWidth - PANE_MARGIN) {
        x = screenWidth - width - PANE_MARGIN;
      }
      if (y + height > screenHeight - PANE_MARGIN) {
        y = screenHeight - height - PANE_MARGIN;
      }

      x = Math.max(x, PANE_MARGIN);
      y = Math.max(y, PANE_MARGIN);

      width = Math.min(width, screenWidth - x - PANE_MARGIN);
      height = Math.min(height, screenHeight - y - PANE_MARGIN);

      return { ...pane, x, y, width, height };
    }
    ```

5.  **Create the directory `src/stores/panes/actions/`**. Inside it, create the following files:
    *   **`src/stores/panes/actions/addPane.ts`:**
        ```typescript
        // src/stores/panes/actions/addPane.ts
        import { Pane, PaneInput } from '@/types/pane';
        import { PaneStoreType, SetPaneStore } from '../types';
        import { calculateNewPanePosition } from '../utils/calculatePanePosition';
        import { ensurePaneIsVisible } from '../utils/ensurePaneIsVisible';
        import { DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from '../constants';

        let paneIdCounter = 2;

        export function addPaneAction(
          set: SetPaneStore,
          newPaneInput: PaneInput,
          shouldTile: boolean = false
        ) {
          set((state: PaneStoreType) => {
            if (newPaneInput.id && state.panes.find(p => p.id === newPaneInput.id)) {
              const paneToActivate = state.panes.find(p => p.id === newPaneInput.id)!;
              return {
                panes: state.panes.map(p => ({
                  ...p,
                  isActive: p.id === newPaneInput.id,
                })).sort((a, b) => (a.id === newPaneInput.id ? 1 : 0) - (b.id === newPaneInput.id ? 1 : 0)),
                activePaneId: newPaneInput.id,
                lastPanePosition: { x: paneToActivate.x, y: paneToActivate.y, width: paneToActivate.width, height: paneToActivate.height }
              };
            }

            const basePosition = calculateNewPanePosition(state.panes, state.lastPanePosition);

            const newPane: Pane = ensurePaneIsVisible({
              id: newPaneInput.id || `pane-${paneIdCounter++}`,
              type: newPaneInput.type,
              title: newPaneInput.title || `Pane ${paneIdCounter-1}`,
              x: newPaneInput.x ?? basePosition.x,
              y: newPaneInput.y ?? basePosition.y,
              width: newPaneInput.width ?? DEFAULT_PANE_WIDTH,
              height: newPaneInput.height ?? DEFAULT_PANE_HEIGHT,
              isActive: true,
              dismissable: newPaneInput.dismissable !== undefined ? newPaneInput.dismissable : true,
              content: newPaneInput.content,
            });

            const updatedPanes = state.panes.map(p => ({ ...p, isActive: false }));

            return {
              panes: [...updatedPanes, newPane],
              activePaneId: newPane.id,
              lastPanePosition: { x: newPane.x, y: newPane.y, width: newPane.width, height: newPane.height },
            };
          });
        }
        ```
    *   **`src/stores/panes/actions/removePane.ts`:**
        ```typescript
        // src/stores/panes/actions/removePane.ts
        import { PaneStoreType, SetPaneStore } from '../types';

        export function removePaneAction(set: SetPaneStore, id: string) {
          set((state: PaneStoreType) => {
            const remainingPanes = state.panes.filter(pane => pane.id !== id);
            let newActivePaneId: string | null = null;

            if (state.activePaneId === id) {
              if (remainingPanes.length > 0) {
                newActivePaneId = remainingPanes[remainingPanes.length - 1].id;
              }
            } else {
              newActivePaneId = state.activePaneId;
            }

            const finalPanes = remainingPanes.map(p => ({
                ...p,
                isActive: p.id === newActivePaneId
            }));

            return {
              panes: finalPanes,
              activePaneId: newActivePaneId,
            };
          });
        }
        ```
    *   **`src/stores/panes/actions/updatePanePosition.ts`:**
        ```typescript
        // src/stores/panes/actions/updatePanePosition.ts
        import { PaneStoreType, SetPaneStore } from '../types';
        import { ensurePaneIsVisible } from '../utils/ensurePaneIsVisible';

        export function updatePanePositionAction(set: SetPaneStore, id: string, x: number, y: number) {
          set((state: PaneStoreType) => {
            let updatedPaneRef: { x: number; y: number; width: number; height: number } | null = null;
            const newPanes = state.panes.map(pane => {
              if (pane.id === id) {
                const updated = ensurePaneIsVisible({ ...pane, x, y });
                updatedPaneRef = { x: updated.x, y: updated.y, width: updated.width, height: updated.height };
                return updated;
              }
              return pane;
            });
            return {
              panes: newPanes,
              lastPanePosition: updatedPaneRef || state.lastPanePosition
            };
          });
        }
        ```
    *   **`src/stores/panes/actions/updatePaneSize.ts`:**
        ```typescript
        // src/stores/panes/actions/updatePaneSize.ts
        import { PaneStoreType, SetPaneStore } from '../types';
        import { ensurePaneIsVisible } from '../utils/ensurePaneIsVisible';

        export function updatePaneSizeAction(set: SetPaneStore, id: string, width: number, height: number) {
          set((state: PaneStoreType) => {
            let updatedPaneRef: { x: number; y: number; width: number; height: number } | null = null;
            const newPanes = state.panes.map(pane => {
              if (pane.id === id) {
                const updated = ensurePaneIsVisible({ ...pane, width, height });
                updatedPaneRef = { x: updated.x, y: updated.y, width: updated.width, height: updated.height };
                return updated;
              }
              return pane;
            });
            return {
              panes: newPanes,
              lastPanePosition: updatedPaneRef || state.lastPanePosition
            };
          });
        }
        ```
    *   **`src/stores/panes/actions/bringPaneToFront.ts`:**
        ```typescript
        // src/stores/panes/actions/bringPaneToFront.ts
        import { PaneStoreType, SetPaneStore } from '../types';

        export function bringPaneToFrontAction(set: SetPaneStore, id: string) {
          set((state: PaneStoreType) => {
            const paneToMove = state.panes.find(pane => pane.id === id);
            if (!paneToMove) return state;

            const otherPanes = state.panes.filter(pane => pane.id !== id);
            return {
              panes: [
                ...otherPanes.map(p => ({ ...p, isActive: false })),
                { ...paneToMove, isActive: true }
              ].sort((a, b) => (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0)),
              activePaneId: id,
              lastPanePosition: { x: paneToMove.x, y: paneToMove.y, width: paneToMove.width, height: paneToMove.height }
            };
          });
        }
        ```
    *   **`src/stores/panes/actions/setActivePane.ts`:**
        ```typescript
        // src/stores/panes/actions/setActivePane.ts
        import { PaneStoreType, SetPaneStore } from '../types';

        export function setActivePaneAction(set: SetPaneStore, id: string | null) {
          set((state: PaneStoreType) => ({
            panes: state.panes.map(pane => ({
              ...pane,
              isActive: pane.id === id,
            })),
            activePaneId: id,
          }));
        }
        ```
    *   **`src/stores/panes/actions/openChatPane.ts`:**
        ```typescript
        // src/stores/panes/actions/openChatPane.ts
        import { Pane, PaneInput } from '@/types/pane';
        import { PaneStoreType, SetPaneStore } from '../types';
        import { CHATS_PANE_ID, CHANGELOG_PANE_ID, PANE_OFFSET, DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from '../constants';
        import { ensurePaneIsVisible } from '../utils/ensurePaneIsVisible';

        function ensureChatsPane(panes: Pane[]): Pane[] {
          let currentPanes = [...panes];
          let chatsPane = currentPanes.find(p => p.id === CHATS_PANE_ID);

          if (!chatsPane) {
            chatsPane = {
              id: CHATS_PANE_ID,
              type: 'chats',
              title: 'Chats',
              x: 20,
              y: 20,
              width: 300,
              height: 400,
              isActive: true, // OpenChatPane makes chats active by default
              dismissable: false,
            };
            currentPanes.unshift(chatsPane);
          } else {
            currentPanes = currentPanes.filter(p => p.id !== CHATS_PANE_ID);
            currentPanes.unshift({...chatsPane, isActive: true});
          }
          return currentPanes;
        }


        export function openChatPaneAction(
          set: SetPaneStore,
          newChatPaneInput: PaneInput,
          isCommandKeyHeld: boolean = false
        ) {
          set((state: PaneStoreType) => {
            if (!newChatPaneInput.id) {
              console.error('Chat pane ID is required.');
              return state;
            }

            let panes = ensureChatsPane([...state.panes]);

            panes = panes.map(p => ({
              ...p,
              isActive: (p.id === CHATS_PANE_ID || p.type === 'changelog') ? p.isActive : false
            }));

            const existingChatPaneIndex = panes.findIndex(p => p.id === newChatPaneInput.id && p.type === 'chat');

            if (existingChatPaneIndex !== -1) {
              const existingPane = panes[existingChatPaneIndex];
              panes.splice(existingChatPaneIndex, 1);
              panes.push({ ...existingPane, isActive: true });
              return {
                panes,
                activePaneId: existingPane.id,
                lastPanePosition: { x: existingPane.x, y: existingPane.y, width: existingPane.width, height: existingPane.height }
              };
            }

            const chatPanes = panes.filter(p => p.type === 'chat');
            let positionProps;

            if (chatPanes.length === 0) {
              positionProps = {
                x: (typeof window !== 'undefined' ? window.innerWidth : 1920) / 2 - DEFAULT_PANE_WIDTH / 2 + 100,
                y: (typeof window !== 'undefined' ? window.innerHeight : 1080) * 0.05,
                width: DEFAULT_PANE_WIDTH * 1.5,
                height: (typeof window !== 'undefined' ? window.innerHeight : 1080) * 0.8,
              };
            } else if (chatPanes.length === 1 && !isCommandKeyHeld) {
              const existing = chatPanes[0];
              positionProps = { x: existing.x, y: existing.y, width: existing.width, height: existing.height };
              panes = panes.filter(p => p.id !== existing.id);
            } else {
              const lastPane = chatPanes[chatPanes.length - 1] || panes.find(p => p.id === CHATS_PANE_ID);
              positionProps = {
                x: (lastPane?.x || 0) + PANE_OFFSET,
                y: (lastPane?.y || 0) + PANE_OFFSET,
                width: DEFAULT_PANE_WIDTH,
                height: DEFAULT_PANE_HEIGHT,
              };
            }

            const finalPanePosition = ensurePaneIsVisible({
                ...positionProps,
                id: newChatPaneInput.id,
                type: 'chat', title: '', isActive:true
            });

            const newPane: Pane = {
              id: newChatPaneInput.id,
              type: 'chat',
              title: newChatPaneInput.title || `Chat ${newChatPaneInput.id}`,
              x: finalPanePosition.x,
              y: finalPanePosition.y,
              width: finalPanePosition.width,
              height: finalPanePosition.height,
              isActive: true,
              dismissable: true,
            };

            panes.push(newPane);

            const chatsPane = panes.find(p => p.id === CHATS_PANE_ID);
            if (chatsPane) {
                panes = panes.filter(p => p.id !== CHATS_PANE_ID);
                panes.unshift({...chatsPane, isActive: true});
            }

            return {
              panes,
              activePaneId: newPane.id,
              lastPanePosition: { x: newPane.x, y: newPane.y, width: newPane.width, height: newPane.height }
            };
          });
        }

        ```
    *   **Create `src/stores/panes/actions/index.ts` to export all actions:**
        ```typescript
        // src/stores/panes/actions/index.ts
        export * from './addPane';
        export * from './removePane';
        export * from './updatePanePosition';
        export * from './updatePaneSize';
        export * from './bringPaneToFront';
        export * from './setActivePane';
        export * from './openChatPane';
        ```

6.  **Create `src/stores/pane.ts` (Main Zustand Store):**
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
      openChatPaneAction,
      bringPaneToFrontAction,
      setActivePaneAction,
    } from "./panes/actions";
    import { CHATS_PANE_ID, CHANGELOG_PANE_ID, PANE_MARGIN, DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from "./panes/constants";

    const getInitialPanes = (): Pane[] => {
      let initialPanesSetup: Pane[] = [];
      initialPanesSetup.push({
        id: CHATS_PANE_ID,
        type: 'chats',
        title: 'Chats',
        x: PANE_MARGIN,
        y: PANE_MARGIN,
        width: 300,
        height: 500,
        isActive: true,
        dismissable: false,
      });
      initialPanesSetup.push({
        id: CHANGELOG_PANE_ID,
        type: 'changelog',
        title: 'Changelog',
        x: PANE_MARGIN + 300 + PANE_MARGIN,
        y: PANE_MARGIN,
        width: 350,
        height: 250,
        isActive: false,
        dismissable: true,
      });
      return initialPanesSetup;
    };

    const initialState: PaneState = {
      panes: getInitialPanes(),
      activePaneId: CHATS_PANE_ID,
      lastPanePosition: null,
    };

    export const usePaneStore = create<PaneStoreType>()(
      persist(
        (set) => ({
          ...initialState,
          addPane: (newPaneInput: PaneInput, shouldTile?: boolean) => addPaneAction(set, newPaneInput, shouldTile),
          removePane: (id: string) => removePaneAction(set, id),
          updatePanePosition: (id: string, x: number, y: number) => updatePanePositionAction(set, id, x, y),
          updatePaneSize: (id: string, width: number, height: number) => updatePaneSizeAction(set, id, width, height),
          openChatPane: (newPaneInput: PaneInput, isCommandKeyHeld?: boolean) => openChatPaneAction(set, newPaneInput, isCommandKeyHeld),
          bringPaneToFront: (id: string) => bringPaneToFrontAction(set, id),
          setActivePane: (id: string | null) => setActivePaneAction(set, id),
          resetHUDState: () => set(initialState),
        }),
        {
          name: 'commander-pane-storage', // Changed name to avoid conflicts
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({
            panes: state.panes,
            lastPanePosition: state.lastPanePosition,
            activePaneId: state.activePaneId,
          }),
          merge: (persistedState, currentState) => {
            const merged = { ...currentState, ...(persistedState as Partial<PaneStoreType>) };
            if (!merged.panes || merged.panes.length === 0) {
              merged.panes = getInitialPanes();
              merged.activePaneId = CHATS_PANE_ID;
            } else {
              const hasChats = merged.panes.some(p => p.id === CHATS_PANE_ID);
              const hasChangelog = merged.panes.some(p => p.id === CHANGELOG_PANE_ID);
              const defaultPanes = getInitialPanes();

              if (!hasChats) {
                const chatsPane = defaultPanes.find(p => p.id === CHATS_PANE_ID);
                if (chatsPane) merged.panes.unshift(chatsPane);
              }
              if (!hasChangelog) {
                const changelogPane = defaultPanes.find(p => p.id === CHANGELOG_PANE_ID);
                if (changelogPane) {
                    const chatsIndex = merged.panes.findIndex(p => p.id === CHATS_PANE_ID);
                    if (chatsIndex !== -1) {
                      merged.panes.splice(chatsIndex + 1, 0, changelogPane);
                    } else {
                      merged.panes.push(changelogPane);
                    }
                }
              }
            }
            return merged;
          },
        }
      )
    );
    ```

**Step 3: Core Pane Component**

Create `src/panes/Pane.tsx`. Remove the `"use client"` directive.

```typescript
// src/panes/Pane.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { X as IconX } from 'lucide-react';
import { Pane as PaneType } from '@/types/pane';
import { usePaneStore } from "@/stores/pane"; // Corrected path

type PaneProps = PaneType & {
  children?: React.ReactNode;
  titleBarButtons?: React.ReactNode;
};

const useResizeHandlers = (
  id: string,
  initialPosition: { x: number; y: number },
  initialSize: { width: number; height: number },
  updatePanePosition: (id: string, x: number, y: number) => void,
  updatePaneSize: (id: string, width: number, height: number) => void
) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  useEffect(() => {
    setSize(initialSize);
  }, [initialSize.width, initialSize.height]);

  const minWidth = 200;
  const minHeight = 100;

  const resizeHandlers = {
    topleft: useDrag(({ movement: [deltaX, deltaY], memo = { x: position.x, y: position.y, width: size.width, height: size.height }, first, last }) => {
      if (first) memo = { x: position.x, y: position.y, width: size.width, height: size.height };
      const newWidth = Math.max(minWidth, memo.width - deltaX);
      const newHeight = Math.max(minHeight, memo.height - deltaY);
      const newX = memo.x + (memo.width - newWidth);
      const newY = memo.y + (memo.height - newHeight);

      setPosition({ x: newX, y: newY });
      setSize({ width: newWidth, height: newHeight });
      if (last) {
          updatePanePosition(id, newX, newY);
          updatePaneSize(id, newWidth, newHeight);
      }
      return { x: newX, y: newY, width: newWidth, height: newHeight }; // Return memo for next event
    }),
    top: useDrag(({ movement: [, deltaY], memo = { y: position.y, height: size.height }, first, last }) => {
      if (first) memo = { y: position.y, height: size.height };
      const newHeight = Math.max(minHeight, memo.height - deltaY);
      const newY = memo.y + (memo.height - newHeight);

      setPosition({ ...position, y: newY });
      setSize({ ...size, height: newHeight });
       if (last) {
          updatePanePosition(id, position.x, newY);
          updatePaneSize(id, size.width, newHeight);
      }
      return { y: newY, height: newHeight };
    }),
    topright: useDrag(({ movement: [deltaX, deltaY], memo = { y: position.y, width: size.width, height: size.height }, first, last }) => {
      if (first) memo = { y: position.y, width: size.width, height: size.height };
      const newWidth = Math.max(minWidth, memo.width + deltaX);
      const newHeight = Math.max(minHeight, memo.height - deltaY);
      const newY = memo.y + (memo.height - newHeight);

      setPosition({ ...position, y: newY });
      setSize({ width: newWidth, height: newHeight });
      if (last) {
          updatePanePosition(id, position.x, newY);
          updatePaneSize(id, newWidth, newHeight);
      }
      return { y: newY, width: newWidth, height: newHeight };
    }),
    right: useDrag(({ movement: [deltaX], memo = { width: size.width }, first, last }) => {
      if (first) memo = { width: size.width };
      const newWidth = Math.max(minWidth, memo.width + deltaX);
      setSize({ ...size, width: newWidth });
      if (last) updatePaneSize(id, newWidth, size.height);
      return { width: newWidth };
    }),
    bottomright: useDrag(({ movement: [deltaX, deltaY], memo = { width: size.width, height: size.height }, first, last }) => {
      if (first) memo = { width: size.width, height: size.height };
      const newWidth = Math.max(minWidth, memo.width + deltaX);
      const newHeight = Math.max(minHeight, memo.height + deltaY);
      setSize({ width: newWidth, height: newHeight });
      if (last) updatePaneSize(id, newWidth, newHeight);
      return { width: newWidth, height: newHeight };
    }),
    bottom: useDrag(({ movement: [, deltaY], memo = { height: size.height }, first, last }) => {
      if (first) memo = { height: size.height };
      const newHeight = Math.max(minHeight, memo.height + deltaY);
      setSize({ ...size, height: newHeight });
      if (last) updatePaneSize(id, size.width, newHeight);
      return { height: newHeight };
    }),
    bottomleft: useDrag(({ movement: [deltaX, deltaY], memo = { x: position.x, width: size.width, height: size.height }, first, last }) => {
      if (first) memo = { x: position.x, width: size.width, height: size.height };
      const newWidth = Math.max(minWidth, memo.width - deltaX);
      const newX = memo.x + (memo.width - newWidth);
      const newHeight = Math.max(minHeight, memo.height + deltaY);

      setPosition({ ...position, x: newX });
      setSize({ width: newWidth, height: newHeight });
      if (last) {
          updatePanePosition(id, newX, position.y);
          updatePaneSize(id, newWidth, newHeight);
      }
      return { x: newX, width: newWidth, height: newHeight };
    }),
    left: useDrag(({ movement: [deltaX], memo = { x: position.x, width: size.width }, first, last }) => {
      if (first) memo = { x: position.x, width: size.width };
      const newWidth = Math.max(minWidth, memo.width - deltaX);
      const newX = memo.x + (memo.width - newWidth);

      setPosition({ ...position, x: newX });
      setSize({ ...size, width: newWidth });
      if (last) {
          updatePanePosition(id, newX, position.y);
          updatePaneSize(id, newWidth, size.height);
      }
      return { x: newX, width: newWidth };
    }),
  };

  return { position, size, setPosition, resizeHandlers };
};

export const Pane: React.FC<PaneProps> = ({
  id,
  title,
  x: initialX,
  y: initialY,
  width: initialWidth,
  height: initialHeight,
  type,
  isActive,
  children,
  titleBarButtons,
  dismissable = true
}) => {
  const [bounds, setBounds] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const updatePanePosition = usePaneStore(state => state.updatePanePosition);
  const updatePaneSize = usePaneStore(state => state.updatePaneSize);
  const removePane = usePaneStore(state => state.removePane);
  const bringPaneToFront = usePaneStore(state => state.bringPaneToFront);
  const setActivePane = usePaneStore(state => state.setActivePane);

  const { position, size, setPosition, resizeHandlers } = useResizeHandlers(
    id,
    { x: initialX, y: initialY },
    { width: initialWidth, height: initialHeight },
    updatePanePosition,
    updatePaneSize
  );

  useEffect(() => {
    const updateBounds = () => {
      const handleSize = 50;
      setBounds({
        left: -size.width + handleSize,
        top: 0,
        right: window.innerWidth - handleSize,
        bottom: window.innerHeight - handleSize,
      });
    };
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [size.width, size.height]);

  const bindDrag = useDrag(({ offset: [ox, oy], first, last, event }) => {
    event.stopPropagation();
    if (first) {
      bringPaneToFront(id);
      setActivePane(id);
    }
    const newX = Math.max(bounds.left, Math.min(ox, bounds.right));
    const newY = Math.max(bounds.top, Math.min(oy, bounds.bottom));
    setPosition({ x: newX, y: newY });
    if (last) {
      updatePanePosition(id, newX, newY);
    }
  }, {
    from: () => [position.x, position.y],
    bounds: bounds,
  });

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    removePane(id);
  };

  const handlePaneMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle') || target.closest('.title-bar-button-container')) {
        return;
    }
    bringPaneToFront(id);
    setActivePane(id);
  };

  const resizeHandleClasses = "absolute bg-transparent pointer-events-auto";
  const resizeHandleSize = '8px';
  const resizeHandleOffset = '-4px';

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: isActive ? 50 : 49,
      }}
      className={`pane-container pointer-events-auto flex flex-col bg-black/90 border rounded-lg overflow-hidden shadow-lg transition-all duration-100 ease-out ${isActive ? 'border-primary ring-1 ring-primary' : 'border-border/20'}`}
      onMouseDownCapture={handlePaneMouseDown}
    >
      <div
        {...bindDrag()}
        className="pane-title-bar select-none touch-none bg-black text-white/90 border-b border-border/20 font-bold py-1.5 px-3 cursor-grab active:cursor-grabbing flex justify-between items-center h-8"
      >
        <span className="text-xs truncate">{title}</span>
        <div className="flex items-center space-x-1 title-bar-button-container">
          {titleBarButtons}
          {dismissable && (
            <button
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="ml-1 p-0.5 text-white/70 hover:text-destructive focus:outline-none rounded hover:bg-white/10"
              aria-label="Close pane"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="pane-content flex-grow text-white h-[calc(100%-2rem)] overflow-auto p-1">
        {children}
      </div>
      <div {...resizeHandlers.topleft()} style={{ top: resizeHandleOffset, left: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nwse-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.top()} style={{ top: resizeHandleOffset, left: resizeHandleSize, right: resizeHandleSize, height: resizeHandleSize, cursor: 'ns-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.topright()} style={{ top: resizeHandleOffset, right: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nesw-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.right()} style={{ top: resizeHandleSize, right: resizeHandleOffset, bottom: resizeHandleSize, width: resizeHandleSize, cursor: 'ew-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottomright()} style={{ bottom: resizeHandleOffset, right: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nwse-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottom()} style={{ bottom: resizeHandleOffset, left: resizeHandleSize, right: resizeHandleSize, height: resizeHandleSize, cursor: 'ns-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.bottomleft()} style={{ bottom: resizeHandleOffset, left: resizeHandleOffset, width: resizeHandleSize, height: resizeHandleSize, cursor: 'nesw-resize' }} className={resizeHandleClasses + " resize-handle"} />
      <div {...resizeHandlers.left()} style={{ top: resizeHandleSize, left: resizeHandleOffset, bottom: resizeHandleSize, width: resizeHandleSize, cursor: 'ew-resize' }} className={resizeHandleClasses + " resize-handle"} />
    </div>
  );
};
```

**Step 4: Pane Manager Component & Placeholder Content**

Create `src/panes/PaneManager.tsx`. Remove the `"use client"` directive.

```typescript
// src/panes/PaneManager.tsx
import React from 'react';
import { usePaneStore } from '@/stores/pane'; // Corrected path
import { Pane as PaneComponent } from '@/panes/Pane';
import { Pane as PaneType } from '@/types/pane';

// Placeholder Content Components
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
  const { panes } = usePaneStore();

  const stripIdPrefix = (id: string): string => {
    return id.replace(/^chat-/, ''); // Simplified
  };

  const sortedPanes = [...panes].sort((a, b) => (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));

  return (
    <>
      {sortedPanes.map((pane: PaneType) => (
        <PaneComponent
          key={pane.id}
          title={pane.title}
          id={pane.id}
          x={pane.x}
          y={pane.y}
          height={pane.height}
          width={pane.width}
          type={pane.type}
          isActive={pane.isActive}
          dismissable={pane.type !== 'chats' && pane.dismissable !== false}
          content={pane.content} // Pass content for 'diff' or other types
        >
          {pane.type === 'chat' && <PlaceholderChatComponent threadId={stripIdPrefix(pane.id)} />}
          {pane.type === 'chats' && <PlaceholderChatsPaneComponent />}
          {pane.type === 'changelog' && <PlaceholderChangelogComponent />}
          {pane.type === 'user' && <PlaceholderUserStatusComponent />}
          {pane.type === 'diff' && pane.content && (
            <PlaceholderDiffComponent oldContent={pane.content.oldContent} newContent={pane.content.newContent} />
          )}
          {pane.type === 'default' && <PlaceholderDefaultComponent type={pane.type} />}
          {/* Add other pane types here, or a more generic fallback */}
          {!(
            pane.type === 'chat' ||
            pane.type === 'chats' ||
            pane.type === 'changelog' ||
            pane.type === 'user' ||
            pane.type === 'diff' ||
            pane.type === 'default'
          ) && <PlaceholderDefaultComponent type={pane.type} />}
        </PaneComponent>
      ))}
    </>
  );
};
```

**Step 5: HUD Background Grid**

Create `src/components/home/SimpleGrid.tsx`.

```typescript
// src/components/home/SimpleGrid.tsx
import React from 'react';

export const SimpleGrid: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)" // Softer grid lines for dark theme
              strokeWidth="0.5" // Thinner grid lines
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
};
```

**Step 6: Reset HUD Button**

Create `src/components/ResetHUDButton.tsx`. Remove the `"use client"` directive.

```typescript
// src/components/ResetHUDButton.tsx
import React from 'react';
import { usePaneStore } from '@/stores/pane'; // Corrected path

// Placeholder for IconRefresh if not available
const IconRefresh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
  </svg>
);

// Basic Button component (can be replaced by your UI library's Button)
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string, size?: string}) => (
  <button {...props} className={`px-3 py-1.5 rounded text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 ${props.className || ''}`}>
    {children}
  </button>
);

const ResetHUDButton: React.FC = () => {
  const resetHUDState = usePaneStore((state) => state.resetHUDState);

  const handleReset = () => {
    resetHUDState();
  };

  return (
    <Button
      onClick={handleReset}
      className="fixed bottom-4 left-4 z-[10000] p-2 !rounded-full shadow-lg" // Added !rounded-full for higher specificity
      aria-label="Reset HUD"
    >
      <IconRefresh />
    </Button>
  );
};

export default ResetHUDButton;
```

**Step 7: Styling**

Update `src/styles/global.css`. Add the following styles. These are adapted from `docs/panes.md` and assume your existing Tailwind CSS setup and dark theme variables.

```css
/* Add these to your src/styles/global.css */

/* Make sure these CSS variables match your app's theming,
   or adapt the .pane-container styles below to use Tailwind classes directly.
   The existing global.css already defines these in oklch, so this section is mostly for reference
   if direct var() usage is preferred for panes over Tailwind utilities.
   The pane component uses Tailwind classes, so this might not be strictly needed if Tailwind covers it.
*/
/*
@layer base {
  :root {
    --background: 0 0% 0%; /* Black background - matches existing .dark in global.css via oklch(0.1 0 0) */
    --foreground: 0 0% 100%; /* White text - matches existing .dark in global.css via oklch(0.9 0 0) */
    --border: 0 0% 15%; /* Pane borders, separators - matches existing .dark border-border */
    /* ... other variables if needed ... */
  }
}
*/

/* Specific styles for pane elements if not covered by utility classes */
.pane-container {
  /* Base styles are mostly handled by Tailwind classes in Pane.tsx */
  /* e.g., bg-black/90 border rounded-lg shadow-lg */
}

.pane-title-bar {
  /* Styles are mostly handled by Tailwind classes in Pane.tsx */
  /* e.g., bg-black text-white/90 border-b border-border/20 ... */
}

.pane-content {
  /* Styles are mostly handled by Tailwind classes in Pane.tsx */
  /* e.g., flex-grow text-white overflow-auto p-1 */
  /* Custom scrollbar styling (optional) */
}
.pane-content::-webkit-scrollbar {
  width: 6px; /* Thinner scrollbar */
  height: 6px;
}
.pane-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}
.pane-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
.pane-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}

.resize-handle {
  /* For debugging handle positions, uncomment: */
  /* background-color: rgba(255, 0, 0, 0.1); */
  z-index: 51; /* Ensure handles are above pane content but below active pane title bar if overlapping */
}
```
Ensure your `src/styles/global.css` has the dark theme active or defined as the default, as the pane styles are designed for a dark HUD. The current `global.css` sets up a dark theme with `oklch` variables, which should be compatible. The `bg-black/90` and `bg-black` on panes will work with this.

**Step 8: Integrate into `HomePage.tsx`**

Modify `src/pages/HomePage.tsx` to set up the HUD environment.

```typescript
// src/pages/HomePage.tsx
import React from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
import ResetHUDButton from "@/components/ResetHUDButton"; // Import the reset button

export default function HomePage() {
  return (
    // This container ensures the pane system uses the available space within the main layout.
    // It's relative for absolute positioning of panes and grid.
    <div className="relative w-full h-full overflow-hidden">
      <SimpleGrid />
      <PaneManager />
      <ResetHUDButton /> {/* Add the reset button to the HUD */}
    </div>
  );
}
```

**Explanation of Example Panes:**

The two example panes (`Chats` and `Changelog`) are automatically created by the `getInitialPanes` function within `src/stores/pane.ts`. The `PaneManager` then renders these panes using the placeholder components defined within `PaneManager.tsx` (`PlaceholderChatsPaneComponent` and `PlaceholderChangelogComponent`).

This setup provides a functional pane system with draggable, resizable panes, and a basic HUD appearance. You can now replace the placeholder content components in `PaneManager.tsx` with your actual feature components.
