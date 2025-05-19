To force dark mode throughout the whole application, you need to make changes in a few key areas to ensure that both the web content (React UI) and Electron's native elements consistently use a dark theme, overriding any system or user preferences.

Here’s a breakdown of where to make the changes:

**1. Renderer Process Theme Helper (`src/helpers/theme_helpers.ts`)**

This file manages the theme for the web content. We need to modify it to always apply and persist "dark" mode.

```typescript
// src/helpers/theme_helpers.ts
import { ThemeMode } from "@/types/theme-mode";

const THEME_KEY = "theme";

export interface ThemePreferences {
  system: ThemeMode; // This will reflect nativeTheme.themeSource from main process
  local: ThemeMode | null;
}

// This function can still report the system's preference if needed for other logic,
// but the UI will be forced to dark.
export async function getCurrentTheme(): Promise<ThemePreferences> {
  const systemTheme = await window.themeMode.current(); // Reflects nativeTheme.themeSource
  return {
    system: systemTheme,
    local: "dark", // Application forces 'dark'
  };
}

// This function will now always set the theme to dark.
export async function setTheme(_newTheme: ThemeMode) { // newTheme parameter is ignored
  await window.themeMode.dark(); // Instruct main process to set nativeTheme to dark
  updateDocumentTheme(true);     // Apply 'dark' class to HTML element
  localStorage.setItem(THEME_KEY, "dark"); // Persist 'dark' as the chosen theme
}

// This function will also ensure dark mode.
export async function toggleTheme() {
  await setTheme("dark"); // Always (re)set to dark mode
}

// This function is called on app load to set the theme.
export async function syncThemeWithLocal() {
  await setTheme("dark"); // Force dark mode on startup
}

// This function adds/removes the 'dark' class on the <html> element.
function updateDocumentTheme(isDarkMode: boolean) {
  // Force isDarkMode to true.
  // This ensures the 'dark' class is always applied for Tailwind CSS.
  document.documentElement.classList.add("dark");
  // Explicitly remove 'light' class if it might exist from previous versions or other logic
  document.documentElement.classList.remove("light");
}
```

**2. Main Process IPC Theme Listeners (`src/helpers/ipc/theme/theme-listeners.ts`)**

This file handles theme changes requested by the renderer. We'll modify it to ensure Electron's `nativeTheme` is always set to "dark".

```typescript
// src/helpers/ipc/theme/theme-listeners.ts
import { nativeTheme, ipcMain } from "electron"; // Ensure ipcMain is imported
import {
  THEME_MODE_CURRENT_CHANNEL,
  THEME_MODE_DARK_CHANNEL,
  THEME_MODE_LIGHT_CHANNEL,
  THEME_MODE_SYSTEM_CHANNEL,
  THEME_MODE_TOGGLE_CHANNEL,
} from "./theme-channels";

export function addThemeEventListeners() {
  ipcMain.handle(THEME_MODE_CURRENT_CHANNEL, () => {
    nativeTheme.themeSource = "dark"; // Enforce on query
    return "dark"; // Report 'dark' to renderer
  });

  ipcMain.handle(THEME_MODE_TOGGLE_CHANNEL, () => {
    nativeTheme.themeSource = "dark";
    return true; // Tell renderer it's dark mode
  });

  ipcMain.handle(THEME_MODE_DARK_CHANNEL, () => {
    nativeTheme.themeSource = "dark";
  });

  // If renderer attempts to set light mode, force dark mode.
  ipcMain.handle(THEME_MODE_LIGHT_CHANNEL, () => {
    nativeTheme.themeSource = "dark";
  });

  // If renderer attempts to set system theme, force dark mode.
  ipcMain.handle(THEME_MODE_SYSTEM_CHANNEL, () => {
    nativeTheme.themeSource = "dark";
    return true; // Tell renderer it's dark mode (as per forced setting)
  });
}
```

**3. Main Process Initial Setup (`src/main.ts`)**

Set `nativeTheme.themeSource` to "dark" when the main window is created. This ensures native UI elements (like context menus, file dialogs if not customized) also adopt the dark theme from the start.

```typescript
// src/main.ts
import { app, BrowserWindow, nativeTheme } from "electron"; // Add nativeTheme
import registerListeners from "./helpers/ipc/listeners-register";
import path from "path";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";

const inDevelopment = process.env.NODE_ENV === "development";

function createWindow() {
  // Force dark theme for native Electron elements
  nativeTheme.themeSource = "dark";

  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true, // Be cautious with this setting in production
      nodeIntegrationInSubFrames: false, // Consider security implications
      preload: preload,
    },
    // titleBarStyle: "hidden", // Custom title bar implies renderer handles its theme
  });
  registerListeners(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

async function installExtensions() {
  // ... (no changes needed here)
}

app.whenReady().then(createWindow).then(installExtensions);

// ... (rest of the file, no changes needed)
```

**4. (Optional but Recommended) Update or Remove Theme Toggle UI (`src/components/ToggleTheme.tsx`)**

Since the theme is forced, the `ToggleTheme` component is no longer functional for switching themes. You can either:
*   Remove it from your UI.
*   Modify it to be a non-interactive indicator (e.g., always showing a moon icon).
*   Make its `onClick` handler simply re-affirm dark mode (though this is redundant with the above changes).

Example modification (to always show dark mode and do nothing functional on click):
```typescript
// src/components/ToggleTheme.tsx
import { Moon } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
// No need for theme_helpers here anymore if it's just an indicator

export default function ToggleTheme() {
  return (
    <Button
      size="icon"
      title="Dark Mode (Forced)"
      aria-disabled="true"
      className="cursor-default opacity-75" // Style to look non-interactive
      onClick={(e) => e.preventDefault()} // Prevent any action
    >
      <Moon size={16} />
    </Button>
  );
}
```

**Explanation of Changes:**

*   **`src/helpers/theme_helpers.ts`**: Ensures that the renderer process (your React UI) always adds the `dark` class to the `<html>` element. This is crucial for Tailwind CSS's `dark:` variants and your custom dark theme CSS variables in `src/styles/global.css` to take effect. `localStorage` is also set to "dark" to maintain this state, though it's always overridden on load.
*   **`src/helpers/ipc/theme/theme-listeners.ts`**: Modifies the IPC handlers in the main process. Any attempt by the renderer to change the theme via IPC (e.g., to "light" or "system") will now result in `nativeTheme.themeSource` being set to "dark". This controls how Electron renders native UI elements.
*   **`src/main.ts`**: Setting `nativeTheme.themeSource = "dark";` early in `createWindow()` ensures that from the moment the window appears, Electron tries to use dark mode for its own UI elements.
*   **`src/components/ToggleTheme.tsx`**: Updated to reflect the forced dark mode state, making it non-functional as a toggle.

These changes collectively ensure that both your web-based UI and Electron's native components will adhere to dark mode, irrespective of the user's system settings. The problem of seeing white backgrounds due to system settings should be resolved by forcing `nativeTheme.themeSource` to `'dark'`.
