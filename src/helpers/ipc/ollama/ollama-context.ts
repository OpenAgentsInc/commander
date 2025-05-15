import { contextBridge, ipcRenderer } from "electron";
import { OLLAMA_CHAT_COMPLETION_CHANNEL } from "./ollama-channels";

export function exposeOllamaContext() {
  contextBridge.exposeInMainWorld("electronAPI", {
    ...(window.electronAPI || {}),
    ollama: {
      generateChatCompletion: (request: unknown) => 
        ipcRenderer.invoke(OLLAMA_CHAT_COMPLETION_CHANNEL, request),
    },
  });
}

// Add TypeScript type declaration to the window object
declare global {
  interface Window {
    electronAPI: {
      ollama: {
        generateChatCompletion: (request: unknown) => Promise<any>;
      };
    };
  }
}