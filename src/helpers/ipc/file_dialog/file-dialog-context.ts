// src/helpers/ipc/file_dialog/file-dialog-context.ts
import { fileDialogChannels } from "./file-dialog-channels";

export const createFileDialogContext = () => ({
  selectFiles: (options?: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    multiSelections?: boolean;
  }) => {
    if (!window.electronAPI?.fileDialog?.selectFiles) {
      console.error("File dialog API not available");
      return Promise.resolve(null);
    }
    return window.electronAPI.fileDialog.selectFiles(options);
  },
  
  selectDirectory: (options?: {
    title?: string;
    defaultPath?: string;
  }) => {
    if (!window.electronAPI?.fileDialog?.selectDirectory) {
      console.error("File dialog API not available");
      return Promise.resolve(null);
    }
    return window.electronAPI.fileDialog.selectDirectory(options);
  },
});