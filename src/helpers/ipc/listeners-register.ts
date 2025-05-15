console.log("[listeners-register.ts] Module loading...");

import { BrowserWindow } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { addOllamaEventListeners } from "./ollama/ollama-listeners";

export default function registerListeners(mainWindow: BrowserWindow) {
  console.log("[listeners-register.ts] registerListeners() function CALLED");
  addWindowEventListeners(mainWindow);
  console.log("[listeners-register.ts] After addWindowEventListeners()");
  addThemeEventListeners();
  console.log("[listeners-register.ts] After addThemeEventListeners()");
  addOllamaEventListeners(); // This is the critical one
  console.log("[listeners-register.ts] After addOllamaEventListeners()");
  console.log("[listeners-register.ts] registerListeners() function COMPLETED");
}

console.log("[listeners-register.ts] Module loaded.");
