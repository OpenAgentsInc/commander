// src/helpers/ipc/file_dialog/file-dialog-context.ts
import { fileDialogChannels } from "./file-dialog-channels";

export const createFileDialogContext = () => ({
  selectFiles: (options?: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    multiSelections?: boolean;
  }) => window.electronAPI.fileDialog.selectFiles(options),
  
  selectDirectory: (options?: {
    title?: string;
    defaultPath?: string;
  }) => window.electronAPI.fileDialog.selectDirectory(options),
});