import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
      loadAvailableProviders: (configService: ConfigurationService): Effect.Effect<void, never, never> =>
        Effect.gen(function* (_) {
          const providers: AIProvider[] = [];

          // Helper to safely get config or default, logging errors
          const safeGetConfig = (key: string, defaultValue: string) =>
            configService.get(key).pipe(
              Effect.catchTag("ConfigError", (e) => {
                console.warn(`Config key '${key}' not found or error: ${e.message}. Using default: '${defaultValue}'.`);
                return Effect.succeed(defaultValue);
              })
            );

          const ollamaEnabledStr = yield* _(safeGetConfig("OLLAMA_MODEL_ENABLED", "true"));
          if (ollamaEnabledStr === "true") {
            const ollamaModelName = yield* _(safeGetConfig("OLLAMA_MODEL_NAME", "gemma3:1b"));
            providers.push({ key: "ollama_gemma3_1b", name: "Ollama (Local)", type: "ollama", modelName: ollamaModelName });
          }

          const devstralEnabledStr = yield* _(safeGetConfig("AI_PROVIDER_DEVSTRAL_ENABLED", "true"));
          if (devstralEnabledStr === "true") {
            const devstralModelName = yield* _(safeGetConfig("AI_PROVIDER_DEVSTRAL_MODEL_NAME", "Devstral (NIP-90)"));
            const modelIdentifier = yield* _(safeGetConfig("AI_PROVIDER_DEVSTRAL_MODEL_IDENTIFIER", "devstral"));
            providers.push({
              key: "nip90_devstral",
              name: devstralModelName,
              type: "nip90",
              configKey: "AI_PROVIDER_DEVSTRAL",
              modelName: modelIdentifier,
            });
          }
          set({ availableProviders: providers });
          return Effect.void;
        }).pipe(
          Effect.catchAll((unexpectedError) => {
            console.error("Unexpected error in loadAvailableProviders:", unexpectedError);
            return Effect.void;
          })
        ),
    }),
    {
      name: "agent-chat-store",
      storage: typeof window !== "undefined" ? createJSONStorage(() => window.localStorage) : undefined,
    },
  ),
);
