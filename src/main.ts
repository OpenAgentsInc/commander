import { app, BrowserWindow, nativeTheme } from "electron"; // Add nativeTheme
import registerListeners from "./helpers/ipc/listeners-register";
import { addOllamaEventListeners } from "./helpers/ipc/ollama/ollama-listeners";
// "electron-squirrel-startup" seems broken when packaging with vite
//import started from "electron-squirrel-startup";
import path from "path";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";

const inDevelopment = process.env.NODE_ENV === "development";

// Register Ollama event listeners as early as possible
// This ensures the handlers are registered before the renderer tries to use them
console.log("[Main Process] Registering Ollama event listeners early");
try {
  addOllamaEventListeners();
  console.log("[Main Process] Successfully registered Ollama event listeners early");
} catch (error) {
  console.error("[Main Process] Failed to register Ollama event listeners early:", error);
}

function createWindow() {
  // Force dark theme for native Electron elements
  nativeTheme.themeSource = "dark";

  // Get screen dimensions and calculate 90% of width and height
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const windowWidth = Math.floor(width * 0.9);
  const windowHeight = Math.floor(height * 0.9);

  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    // Center the window
    center: true,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: false,
      preload: preload,
    },
    // titleBarStyle: "hidden",
  });
  
  // Register other listeners after window creation
  console.log("[Main Process] Registering all IPC listeners");
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
  try {
    const result = await installExtension(REACT_DEVELOPER_TOOLS);
    console.log(`Extensions installed successfully: ${result.name}`);
  } catch {
    console.error("Failed to install extensions");
  }
}

app.whenReady().then(createWindow).then(installExtensions);

//osX only
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//osX only ends
