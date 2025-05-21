import { contextBridge, ipcRenderer } from "electron";
import { 
  OLLAMA_CHAT_COMPLETION_CHANNEL,
  OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL,
  OLLAMA_STATUS_CHECK
} from "./ollama-channels";

export function exposeOllamaContext() {
  contextBridge.exposeInMainWorld("electronAPI", {
    ...(window.electronAPI || {}),
    ollama: {
      // Add a status check endpoint that uses Electron's IPC to avoid CORS
      checkStatus: () => ipcRenderer.invoke(OLLAMA_STATUS_CHECK),
    
      generateChatCompletion: (request: unknown) => 
        ipcRenderer.invoke(OLLAMA_CHAT_COMPLETION_CHANNEL, request),
      
      // For streaming, we need to set up event listeners
      generateChatCompletionStream: (request: unknown, 
        onChunk: (chunk: any) => void, 
        onDone: () => void, 
        onError: (error: any) => void) => {
          
          // Create a unique ID for this streaming request
          const requestId = `stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
          
          // Set up event listeners for this stream
          const chunkListener = (_: any, id: string, chunk: any) => {
            if (id === requestId) {
              onChunk(chunk);
            }
          };
          
          const doneListener = (_: any, id: string) => {
            if (id === requestId) {
              onDone();
              // Clean up listeners when done
              ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, chunkListener);
              ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, doneListener);
              ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, errorListener);
            }
          };
          
          const errorListener = (_: any, id: string, error: any) => {
            if (id === requestId) {
              onError(error);
              // Clean up listeners on error
              ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, chunkListener);
              ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, doneListener);
              ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, errorListener);
            }
          };
          
          // Register event listeners
          ipcRenderer.on(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, chunkListener);
          ipcRenderer.on(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, doneListener);
          ipcRenderer.on(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, errorListener);
          
          // Send the initial request with the requestId
          ipcRenderer.send(OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL, requestId, request);
          
          // Return a function to cancel the stream if needed
          return () => {
            ipcRenderer.send(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:cancel`, requestId);
            ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:chunk`, chunkListener);
            ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:done`, doneListener);
            ipcRenderer.removeListener(`${OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL}:error`, errorListener);
          };
      }
    },
  });
}

// Add TypeScript type declaration to the window object
declare global {
  interface Window {
    electronAPI: {
      ollama: {
        checkStatus: () => Promise<boolean>;
        generateChatCompletion: (request: unknown) => Promise<any>;
        generateChatCompletionStream: (
          request: unknown, 
          onChunk: (chunk: any) => void,
          onDone: () => void,
          onError: (error: any) => void
        ) => () => void; // Returns a cancel function
      };
    };
  }
}