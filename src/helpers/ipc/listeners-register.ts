import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { addFileDialogEventListeners } from "./file_dialog/file-dialog-listeners";
// Ollama event listeners are now registered directly in main.ts for timing reasons

export default function registerListeners(mainWindow: BrowserWindow) {
  console.log("[IPC Register] Registering window event listeners");
  addWindowEventListeners(mainWindow);

  console.log("[IPC Register] Registering theme event listeners");
  addThemeEventListeners();

  console.log("[IPC Register] Registering file dialog event listeners");
  addFileDialogEventListeners();

  // Note: Claude Code event listeners are registered directly in main.ts
  // to ensure they're available before the renderer process needs them

  // Note: Ollama event listeners are registered earlier in main.ts
  // to ensure they're available before the renderer process needs them
  console.log(
    "[IPC Register] Not registering Ollama listeners here (already registered in main.ts)",
  );
}
