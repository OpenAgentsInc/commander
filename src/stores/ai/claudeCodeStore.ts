import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ClaudeCodeState {
  activeFolderPath: string | null;
  setActiveFolderPath: (path: string | null) => void;
}

export const useClaudeCodeStore = create<ClaudeCodeState>()(
  persist(
    (set) => ({
      activeFolderPath: null,
      setActiveFolderPath: (path) => {
        console.log("[ClaudeCodeStore] Setting active folder path:", path);
        set({ activeFolderPath: path });
      },
    }),
    {
      name: "commander-claude-code-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);