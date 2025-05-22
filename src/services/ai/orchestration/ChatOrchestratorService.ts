case "nip90": {
  const modelName = yield * _(
    getModelName(
      configService,
      "NIP90",
      modelNameOverride,
      "devstral-dvm", // Default DVM identifier
    ),
  );

  // Get NIP-90 specific configuration
  const dvmPubkey = yield * _(
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

  const dvmRelays = yield * _(
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
    requestKind: 1, // Default kind for text generation
    requiresEncryption: true,
    useEphemeralRequests: true,
    modelIdentifier: modelName,
    modelName: modelName,
    temperature: 0.7,
    maxTokens: 2048,
  };

  // Create the NIP90ProviderConfigLayer
  const nip90ConfigLayer = Layer.succeed(NIP90ProviderConfigTag, nip90Config);

  // The NIP90AgentLanguageModelLive layer needs NIP90Service, NostrService, etc.
  clientContext = Layer.mergeAll(
    nip90ConfigLayer,
    NIP90ServiceLive,
    NostrServiceLive,
    NIP04ServiceLive,
  ).pipe(
    Layer.provide(Layer.succeed(TelemetryService, telemetry)),
    Layer.provide(Layer.succeed(ConfigurationService, configService)),
  );

  // Get the NIP90AgentLanguageModelLive layer
  const { NIP90AgentLanguageModelLive } = yield * _(
    Effect.promise(() =>
      import("@/services/ai/providers/nip90/NIP90AgentLanguageModelLive"),
    ),
  );

  specificAiModelEffect = NIP90AgentLanguageModelLive;
  break;
}
