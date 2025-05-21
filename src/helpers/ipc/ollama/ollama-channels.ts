export const OLLAMA_CHAT_COMPLETION_CHANNEL = "ollama:chat-completion";
export const OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL = "ollama:chat-completion-stream";
export const OLLAMA_STATUS_CHECK = "ollama:status-check";

export const ollamaChannels = {
  chatCompletion: OLLAMA_CHAT_COMPLETION_CHANNEL,
  chatCompletionStream: OLLAMA_CHAT_COMPLETION_STREAM_CHANNEL,
  checkStatus: OLLAMA_STATUS_CHECK
};