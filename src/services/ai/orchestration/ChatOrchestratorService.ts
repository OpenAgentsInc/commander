import { Effect, Layer } from "effect";
import { AgentLanguageModel } from "@/services/ai/core";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { AIConfigurationError } from "@/services/ai/core/AIError";
import { NIP90ServiceLive } from "@/services/nip90";
import { NostrServiceLive } from "@/services/nostr";
import { NIP04ServiceLive } from "@/services/nip04";
import { NIP90ProviderConfigTag } from "@/services/ai/providers/nip90/NIP90ProviderConfig";
import type { NIP90ProviderConfig } from "@/services/ai/core/ProviderConfig";

// Helper function to get model name from config
const getModelName = (
  configService: ConfigurationService,
  providerPrefix: string,
  modelNameOverride?: string,
  defaultModel?: string,
) => {
  if (modelNameOverride) {
    return Effect.succeed(modelNameOverride);
  }

  return configService
    .get(`AI_PROVIDER_${providerPrefix}_MODEL_NAME`)
    .pipe(Effect.orElseSucceed(() => defaultModel || "default"));
};

export const createAiModelLayer = (
  configService: ConfigurationService,
  telemetry: TelemetryService,
  providerKey: string,
  modelNameOverride?: string,
) =>
  Effect.gen(function* (_) {
    let clientContext: Layer.Layer<AgentLanguageModel>;
    let specificAiModelEffect: Layer.Layer<AgentLanguageModel>;

    switch (providerKey) {
      case "nip90": {
        const modelName = yield* _(
          getModelName(
            configService,
            "NIP90",
            modelNameOverride,
            "devstral-dvm", // Default DVM identifier
          ),
        );

        // Get NIP-90 specific configuration
        const dvmPubkey = yield* _(
          configService.get("AI_PROVIDER_DEVSTRAL_DVM_PUBKEY").pipe(
            Effect.mapError(
              (e) =>
                new AIConfigurationError({
                  message: "NIP-90 DVM pubkey not configured",
                  cause: e,
                }),
            ),
          ),
        );

        const dvmRelays = yield* _(
          configService.get("AI_PROVIDER_DEVSTRAL_DVM_RELAYS").pipe(
            Effect.map((relays) => relays.split(",")),
            Effect.orElseSucceed(() => ["wss://relay.damus.io"]), // Default relay
            Effect.mapError(
              (e) =>
                new AIConfigurationError({
                  message: "NIP-90 DVM relays not configured",
                  cause: e,
                }),
            ),
          ),
        );

        // Create NIP-90 provider config
        const nip90Config: NIP90ProviderConfig = {
          dvmPubkey,
          dvmRelays,
          requestKind: 5050, // Default to Text Generation
          requiresEncryption: true,
          useEphemeralRequests: true,
          modelIdentifier: modelName,
          modelName: modelName,
          isEnabled: devstralEnabledStr === "true",
          temperature: 0.7,
          maxTokens: 2048,
        };

        // Create the NIP90ProviderConfig layer
        const nip90ConfigLayer = Layer.succeed(NIP90ProviderConfigTag, nip90Config);

        // Create the AgentLanguageModel layer
        const agentLMLayer = Layer.provide(
          NIP90AgentLanguageModelLive,
          Layer.mergeAll(
            nip90ConfigLayer,
            NostrServiceLive,
            NIP04ServiceLive,
            TelemetryServiceLive
          )
        );

        return agentLMLayer;
      }

      // Add other provider cases here
      default:
        return Effect.fail(
          new AIConfigurationError({
            message: `Unknown AI provider: ${providerKey}`,
          }),
        );
    }

    return clientContext.pipe(Layer.provide(specificAiModelEffect));
  });
