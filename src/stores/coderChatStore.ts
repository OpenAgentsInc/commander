import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface CoderChatState {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
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
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
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