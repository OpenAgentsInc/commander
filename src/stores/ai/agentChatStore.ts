import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Effect, Option } from "effect";
import { ConfigurationService } from "@/services/configuration";
import { FeatureFlagService } from "@/services/featureflags/FeatureFlagService";
import { Feature } from "@/services/featureflags/FeatureFlag";

export interface AIProvider {
  key: string;
  name: string;
  type: "ollama" | "nip90" | "openai" | "anthropic" | "claude_code";
  configKey?: string;
  modelName?: string;
}

interface AgentChatState {
  selectedProviderKey: string;
  availableProviders: AIProvider[];
  setSelectedProviderKey: (key: string) => void;
  loadAvailableProviders: (configService: ConfigurationService, featureFlagService: FeatureFlagService) => Effect.Effect<void, never, never>;
}

export const useAgentChatStore = create<AgentChatState>()(
  persist(
    (set) => ({
      selectedProviderKey: "ollama_gemma3_1b", // Default to Ollama
      availableProviders: [],
      setSelectedProviderKey: (key: string) => set({ selectedProviderKey: key }),
      loadAvailableProviders: (configService: ConfigurationService, featureFlagService: FeatureFlagService): Effect.Effect<void, never, never> =>
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

          // Ollama provider
          const isOllamaProviderEnabled = yield* _(featureFlagService.isEnabled(Feature.OLLAMA_PROVIDER));
          if (isOllamaProviderEnabled) {
            const ollamaEnabledStr = yield* _(safeGetConfig("OLLAMA_MODEL_ENABLED", "true"));
            if (ollamaEnabledStr === "true") {
              const ollamaModelName = yield* _(safeGetConfig("OLLAMA_MODEL_NAME", "gemma3:1b"));
              providers.push({ key: "ollama_gemma3_1b", name: "Ollama (Local)", type: "ollama", modelName: ollamaModelName });
            }
          }

          // NIP-90 DVM providers are disabled unless DVM_CONSUMER_TOOLS feature is enabled
          // We don't have a specific DVM_CONSUMER_TOOLS flag defined, but these are DVM consumer tools
          // For now, we'll just check the individual provider configs since they're DVM-related
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

          // Add logic for custom NIP-90 DVM
          const userNip90EnabledStr = yield* _(safeGetConfig("USER_NIP90_ENABLED", "false"));
          if (userNip90EnabledStr === "true") {
            const userNip90DvmPk = yield* _(safeGetConfig("USER_NIP90_DVM_PUBKEY", ""));

            if (userNip90DvmPk.trim() !== "") {
              const userNip90Name = yield* _(safeGetConfig("USER_NIP90_NAME", "Custom NIP-90 DVM"));
              const userNip90ModelIdentifier = yield* _(safeGetConfig("USER_NIP90_MODEL_IDENTIFIER", "custom_model"));

              providers.push({
                key: "nip90_custom", // A unique key for the custom DVM
                name: userNip90Name,
                type: "nip90",
                configKey: "USER_NIP90", // Prefix for its config keys
                modelName: userNip90ModelIdentifier, // Used by DVM to identify the job type/model
              });
            } else {
              console.warn("Custom NIP-90 DVM enabled but pubkey not configured.");
            }
          }

          // Claude Code CLI provider
          const isClaudeCodeProviderEnabled = yield* _(featureFlagService.isEnabled(Feature.CLAUDE_CODE_PROVIDER));
          if (isClaudeCodeProviderEnabled) {
            const claudeCodeEnabledStr = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_ENABLED", "true"));
            if (claudeCodeEnabledStr === "true") {
              const claudeCodeProviderName = yield* _(safeGetConfig("CLAUDE_CODE_PROVIDER_NAME", "Claude Code (CLI)"));
              const claudeCodeDefaultModel = yield* _(safeGetConfig("CLAUDE_CODE_DEFAULT_MODEL", "claude-sonnet"));
              providers.push({
                key: "claude_code",
                name: claudeCodeProviderName,
                type: "claude_code",
                modelName: claudeCodeDefaultModel,
              });
            }
          }

          set({ availableProviders: providers });
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
