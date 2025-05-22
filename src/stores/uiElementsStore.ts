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
              ...(state.elements[id] || { id, position, isPinned: false }),
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
