// src/helpers/ipc/claude_code/claude-code-context.ts
import { contextBridge, ipcRenderer } from "electron";
import { claudeCodeChannels } from "./claude-code-channels";
// Using global ClaudeExecParams type from types.d.ts

export function exposeClaudeCodeContext() {
  contextBridge.exposeInMainWorld("electronAPI", {
    ...(window.electronAPI || {}),
    claudeCode: {
      // Returns Promise<string> (raw CLI output, likely JSON) or IpcErrorObject
      chatCompletion: (params: ClaudeExecParams): Promise<string | { __error: boolean, message: string }> =>
        ipcRenderer.invoke(claudeCodeChannels.chatCompletion, params),

      // Stream chunks are raw strings from CLI stdout
      streamChat: (
        params: ClaudeExecParams,
        onChunk: (chunk: string) => void, // Raw string chunk
        onDone: () => void,
        onError: (error: any) => void
      ): (() => void) => { // Returns a cancel function
        const requestId = `claude-code-stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        const chunkListener = (_event: Electron.IpcRendererEvent, id: string, chunk: string) => {
          if (id === requestId) onChunk(chunk);
        };

        const doneListener = (_event: Electron.IpcRendererEvent, id: string) => {
          if (id === requestId) {
            cleanup();
            onDone();
          }
        };

        const errorListener = (_event: Electron.IpcRendererEvent, id: string, error: any) => {
          if (id === requestId) {
            cleanup();
            onError(error);
          }
        };

        const cleanup = () => {
          ipcRenderer.removeListener(`${claudeCodeChannels.chatStream}:chunk`, chunkListener);
          ipcRenderer.removeListener(`${claudeCodeChannels.chatStream}:done`, doneListener);
          ipcRenderer.removeListener(`${claudeCodeChannels.chatStream}:error`, errorListener);
        };

        ipcRenderer.on(`${claudeCodeChannels.chatStream}:chunk`, chunkListener);
        ipcRenderer.on(`${claudeCodeChannels.chatStream}:done`, doneListener);
        ipcRenderer.on(`${claudeCodeChannels.chatStream}:error`, errorListener);

        ipcRenderer.send(claudeCodeChannels.chatStream, requestId, { ...params, stream: true }); // Ensure stream=true

        return () => {
          ipcRenderer.send(`${claudeCodeChannels.chatStream}:cancel`, requestId);
          cleanup();
        };
      },
    },
  });
}