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
      selectedProviderKey: "ollama_gemma3_1b", // Default to Ollama
      availableProviders: [],
      setSelectedProviderKey: (key: string) => set({ selectedProviderKey: key }),
      loadAvailableProviders: (configService: ConfigurationService) =>
        Effect.gen(function* (_) {
          const providers: AIProvider[] = [];

          // Check Ollama provider
          const ollamaEnabled = yield* _(configService.get("OLLAMA_MODEL_ENABLED"));
          if (ollamaEnabled === "true") {
            const ollamaModelName = yield* _(configService.get("OLLAMA_MODEL_NAME"));
            providers.push({
              key: "ollama_gemma3_1b",
              name: "Ollama (Local)",
              type: "ollama",
              modelName: ollamaModelName || "gemma3:1b",
            });
          }

          // Check NIP-90 Devstral provider
          const devstralEnabled = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_ENABLED"));
          if (devstralEnabled === "true") {
            const devstralModelName = yield* _(configService.get("AI_PROVIDER_DEVSTRAL_MODEL_NAME"));
            providers.push({
              key: "nip90_devstral",
              name: devstralModelName || "Devstral (NIP-90)",
              type: "nip90",
              configKey: "AI_PROVIDER_DEVSTRAL",
              modelName: yield* _(configService.get("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER")),
            });
          }

          set({ availableProviders: providers });
        }),
    }),
    {
      name: "agent-chat-store",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  ),
);
