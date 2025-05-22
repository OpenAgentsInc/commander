import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Effect } from "effect";
import { ConfigurationService } from "@/services/configuration";

export interface AIProvider {
  key: string;
  name: string;
  type: "ollama" | "nip90" | "openai" | "anthropic";
  configKey?: string;
  modelName?: string;
}

interface AgentChatState {
  selectedProviderKey: string;
  availableProviders: AIProvider[];
  setSelectedProviderKey: (key: string) => void;
  loadAvailableProviders: (configService: ConfigurationService) => Effect.Effect<void, never, never>;
}

export const useAgentChatStore = create<AgentChatState>()(
  persist(
    (set) => ({
      selectedProviderKey: "nip90_devstral", // Default to NIP-90 provider
      availableProviders: [
        {
          key: "nip90_devstral",
          name: "Devstral DVM",
          type: "nip90",
          configKey: "AI_PROVIDER_DEVSTRAL",
        },
        {
          key: "ollama_gemma3_1b",
          name: "Ollama Gemma 3 1B",
          type: "ollama",
          modelName: "gemma3:1b",
        },
      ],
      setSelectedProviderKey: (key: string) => set({ selectedProviderKey: key }),
      loadAvailableProviders: (configService: ConfigurationService) =>
        Effect.gen(function* (_) {
          // Load provider configurations from ConfigurationService
          // For now, we'll just use the hardcoded providers
          // In the future, this could dynamically load from config
          return;
        }),
    }),
    {
      name: "agent-chat-store",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  ),
);
