// src/helpers/ipc/claude_code/claude-code-channels.ts
export const CLAUDE_CODE_CHAT_COMPLETION_CHANNEL = "claude-code:chat-completion";
export const CLAUDE_CODE_CHAT_STREAM_CHANNEL = "claude-code:chat-stream";
export const CLAUDE_CODE_SELECT_FOLDER_CHANNEL = "claude-code:select-folder";

export const claudeCodeChannels = {
  chatCompletion: CLAUDE_CODE_CHAT_COMPLETION_CHANNEL,
  chatStream: CLAUDE_CODE_CHAT_STREAM_CHANNEL,
  selectFolder: CLAUDE_CODE_SELECT_FOLDER_CHANNEL,
};