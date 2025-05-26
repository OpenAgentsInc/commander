// src/helpers/ipc/file_dialog/file-dialog-listeners.ts
import { ipcMain, dialog, BrowserWindow } from "electron";
import { fileDialogChannels } from "./file-dialog-channels";

export function addFileDialogEventListeners() {
  // Handle file selection
  ipcMain.handle(fileDialogChannels.selectFiles, async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return null;

    const result = await dialog.showOpenDialog(window, {
      title: options?.title || "Select Files",
      defaultPath: options?.defaultPath,
      filters: options?.filters || [
        { name: "All Files", extensions: ["*"] },
        { name: "TypeScript", extensions: ["ts", "tsx"] },
        { name: "JavaScript", extensions: ["js", "jsx"] },
        { name: "Text Files", extensions: ["txt", "md"] },
      ],
      properties: ["openFile", ...(options?.multiSelections ? ["multiSelections"] : [])],
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths;
  });

  // Handle directory selection
  ipcMain.handle(fileDialogChannels.selectDirectory, async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return null;

    const result = await dialog.showOpenDialog(window, {
      title: options?.title || "Select Directory",
      defaultPath: options?.defaultPath,
      properties: ["openDirectory"],
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0]; // Return single directory path
  });
}