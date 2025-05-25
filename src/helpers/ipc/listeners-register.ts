import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
// Ollama event listeners are now registered directly in main.ts for timing reasons

export default function registerListeners(mainWindow: BrowserWindow) {
  console.log("[IPC Register] Registering window event listeners");
  addWindowEventListeners(mainWindow);

  console.log("[IPC Register] Registering theme event listeners");
  addThemeEventListeners();

  // Register Claude Code event listeners (main process only)
  if (typeof window === 'undefined') {
    try {
      console.log("[IPC Register] Registering Claude Code event listeners");
      // Dynamic require to avoid TypeScript issues and only run in main process
      const { addClaudeCodeEventListeners } = eval('require')("./claude_code/claude-code-listeners.js");
      addClaudeCodeEventListeners();
      console.log("[IPC Register] Claude Code event listeners registered successfully");
    } catch (error) {
      console.error("[IPC Register] Error importing Claude Code listeners:", error);
    }
  }

  // Note: Ollama event listeners are registered earlier in main.ts
  // to ensure they're available before the renderer process needs them
  console.log(
    "[IPC Register] Not registering Ollama listeners here (already registered in main.ts)",
  );
}
