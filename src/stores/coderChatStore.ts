import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: Array<
    | { type: 'text'; text: string }
    | { type: 'tool_call'; id: string; name: string; input: Record<string, any> }
    | { type: 'tool_result'; tool_use_id: string; content: any; isError?: boolean; isLoading?: boolean }
  >;
  timestamp: number;
  isStreaming?: boolean;
}

interface CoderChatState {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage> | ((prevMessage: ChatMessage) => Partial<ChatMessage>)) => void;
  clearMessages: () => void;
  setMessages: (messages: ChatMessage[]) => void;
}

const SYSTEM_MESSAGE: ChatMessage = {
  id: 'system',
  role: 'system',
  content: 'You are Claude Code, a helpful AI coding assistant.',
  timestamp: Date.now(),
};

export const useCoderChatStore = create<CoderChatState>()(
  persist(
    (set) => ({
      messages: [SYSTEM_MESSAGE],
      
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      
      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((msg) => {
            if (msg.id === id) {
              const newUpdates = typeof updates === 'function' ? updates(msg) : updates;
              return { ...msg, ...newUpdates };
            }
            return msg;
          }),
        })),
      
      clearMessages: () =>
        set(() => ({
          messages: [SYSTEM_MESSAGE],
        })),
      
      setMessages: (messages) =>
        set(() => ({
          messages,
        })),
    }),
    {
      name: 'coder-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist non-system messages
        messages: state.messages.filter(msg => msg.role !== 'system'),
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        // Add system message back when loading from storage
        messages: [SYSTEM_MESSAGE, ...(persistedState?.messages || [])],
      }),
    }
  )
);