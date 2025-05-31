Okay, let's remove the hardcoded DVM pubkey dependencies, primarily from the consumer side, to allow interaction with any DVM on the network.

Here are the instructions for the coding agent:

**I. Modify the NIP-90 Manual Request Form:**

**File:** `src/components/nip90/Nip90RequestForm.tsx`

1.  **Remove Hardcoded DVM Pubkey:**
    *   Delete the constant: `const OUR_DVM_PUBKEY_HEX = "..."`.

2.  **Add Input Field for Target DVM Pubkey:**
    *   Add a new `useState` hook for the target DVM public key:
        ```typescript
        const [targetDvmPk, setTargetDvmPk] = useState<string>("");
        ```
    *   In the JSX, add a new `div` for this input, similar to other inputs:
        ```html
        <div className="space-y-1.5">
          <Label htmlFor="targetDvmPk">Target DVM Public Key (npub or hex, optional)</Label>
          <Input
            id="targetDvmPk"
            value={targetDvmPk}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTargetDvmPk(e.target.value)}
            placeholder="npub1... or hex (if encrypted or specific DVM)"
            disabled={isPublishing}
          />
        </div>
        ```
        (Place this input field logically, e.g., after "Bid Amount").

3.  **Use Dynamic Target DVM Pubkey in `handlePublishRequest`:**
    *   Inside `handlePublishRequest`, before creating `jobParams`:
        ```typescript
        let finalTargetDvmPkHexForEncryption: string | undefined = undefined;
        let finalTargetDvmPkHexForPTag: string | undefined = undefined;

        if (targetDvmPk.trim()) {
          // Attempt to decode if it's an npub
          if (targetDvmPk.startsWith("npub1")) {
            try {
              const decoded = nip19.decode(targetDvmPk.trim()); // Assuming nip19 is available or import it
              if (decoded.type === 'npub') {
                finalTargetDvmPkHexForEncryption = decoded.data;
                finalTargetDvmPkHexForPTag = decoded.data;
              } else {
                setPublishError("Invalid npub format for Target DVM.");
                setIsPublishing(false);
                return;
              }
            } catch (e) {
              setPublishError("Failed to decode npub for Target DVM.");
              setIsPublishing(false);
              return;
            }
          } else if (targetDvmPk.trim().length === 64 && /^[0-9a-fA-F]{64}$/.test(targetDvmPk.trim())) {
            // Assume it's a hex pubkey
            finalTargetDvmPkHexForEncryption = targetDvmPk.trim();
            finalTargetDvmPkHexForPTag = targetDvmPk.trim();
          } else {
            setPublishError("Invalid format for Target DVM Public Key. Must be npub or 64-char hex.");
            setIsPublishing(false);
            return;
          }
        }
        // If targetDvmPk is empty, both finalTargetDvmPkHexForEncryption and finalTargetDvmPkHexForPTag will remain undefined.
        // This is correct for a broadcast request if not encrypting, or if createNip90JobRequest handles it for encryption.
        ```
    *   Modify the `jobParams` in `handlePublishRequest`:
        Replace `targetDvmPubkeyHex: OUR_DVM_PUBKEY_HEX` with:
        ```typescript
        targetDvmPubkeyHex: finalTargetDvmPkHexForEncryption, // This is for encryption
        ```
    *   Modify the call to `createNip90JobRequest` to pass both encryption target and p-tag target:
        ```typescript
        const jobRequestEffect = createNip90JobRequest(
          requesterSkUint8Array,
          finalTargetDvmPkHexForEncryption, // For encryption
          mutableInputs,
          validatedParams.outputMimeType || "text/plain",
          validatedParams.bidMillisats,
          validatedParams.kind,
          finalTargetDvmPkHexForPTag, // For p-tag in the event
          mutableAdditionalParams as Array<[string, string, string]> | undefined,
        );
        ```
    *   Ensure `nip19` is imported if you use `nip19.decode`: `import * as nip19 from "nostr-tools/nip19";` (or from your NIP19Service if preferred).

**II. Modify AI Backend for Dynamic NIP-90 DVM Configuration:**

**File:** `src/stores/ai/agentChatStore.ts`

1.  **Update `loadAvailableProviders` to include a custom NIP-90 option:**
    *   After loading "nip90_devstral", add logic to check for user-defined NIP-90 DVM configuration.
    *   Add a new provider entry if custom NIP-90 DVM keys are found in `ConfigurationService`.

    ```typescript
    // Inside loadAvailableProviders, after processing nip90_devstral:
    const userNip90DvmPk = yield* _(Effect.optional(configService.get("USER_NIP90_DVM_PUBKEY")));
    const userNip90EnabledStr = yield* _(configService.get("USER_NIP90_ENABLED").pipe(Effect.orElseSucceed(() => "false")));

    if (Option.isSome(userNip90DvmPk) && userNip90DvmPk.value.trim() !== "" && userNip90EnabledStr === "true") {
      const userNip90Name = yield* _(configService.get("USER_NIP90_NAME").pipe(Effect.orElseSucceed(() => "Custom NIP-90 DVM")));
      const userNip90ModelIdentifier = yield* _(configService.get("USER_NIP90_MODEL_IDENTIFIER").pipe(Effect.orElseSucceed(() => "custom_model")));

      providers.push({
        key: "nip90_custom",
        name: userNip90Name,
        type: "nip90",
        configKey: "USER_NIP90", // A prefix for ConfigurationService keys
        modelName: userNip90ModelIdentifier, // This will be the model DVM uses to identify job
      });
    }
    ```

**File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`

1.  **Update `getProviderLanguageModel` to handle the custom NIP-90 provider key:**
    *   Add a new `case` for `"nip90_custom"` (or your chosen key from `agentChatStore`).
    *   Inside this case, fetch configuration keys like `USER_NIP90_DVM_PUBKEY`, `USER_NIP90_RELAYS`, `USER_NIP90_REQUEST_KIND`, `USER_NIP90_REQUIRES_ENCRYPTION`, `USER_NIP90_MODEL_IDENTIFIER` from `configService`.
    *   Use these fetched values to construct `NIP90ProviderConfig`.
    *   Build and return the `NIP90AgentLanguageModelLive` layer using this custom config, similar to how "nip90_devstral" is handled.

    ```typescript
    // Inside getProviderLanguageModel, add a new case:
    case "nip90_custom": {
      runTelemetry({ category: "orchestrator", action: "get_provider_model_start_nip90_custom", label: key });

      const dvmPubkey = yield* _(configService.get("USER_NIP90_DVM_PUBKEY").pipe(Effect.mapError(e => new AiConfigurationError({ message: "Custom NIP-90 DVM Pubkey not configured", cause: e }))));
      const relaysStr = yield* _(configService.get("USER_NIP90_RELAYS").pipe(Effect.orElseSucceed(() => JSON.stringify(DEFAULT_RELAYS_ARRAY))));
      const relays = JSON.parse(relaysStr) as string[];
      const reqKindStr = yield* _(configService.get("USER_NIP90_REQUEST_KIND").pipe(Effect.orElseSucceed(() => "5050")));
      const reqKind = parseInt(reqKindStr, 10);
      const reqEncryptionStr = yield* _(configService.get("USER_NIP90_REQUIRES_ENCRYPTION").pipe(Effect.orElseSucceed(() => "true")));
      const useEphemeralStr = yield* _(configService.get("USER_NIP90_USE_EPHEMERAL_REQUESTS").pipe(Effect.orElseSucceed(() => "true")));
      const modelIdFromConfig = yield* _(configService.get("USER_NIP90_MODEL_IDENTIFIER").pipe(Effect.orElseSucceed(() => "custom_nip90_model"))); // This is the model string the DVM expects

      const nip90ConfigCustom: NIP90ProviderConfig = {
        modelName: modelNameOverride || modelIdFromConfig, // modelName for AgentLanguageModel, modelIdFromConfig for DVM's internal model id
        isEnabled: true,
        dvmPubkey,
        dvmRelays: relays.length > 0 ? relays : DEFAULT_RELAYS_ARRAY,
        requestKind: !isNaN(reqKind) && reqKind >= 5000 && reqKind <= 5999 ? reqKind : 5050,
        requiresEncryption: reqEncryptionStr === "true",
        useEphemeralRequests: useEphemeralStr === "true",
        modelIdentifier: modelIdFromConfig, // This goes into the "param" "model" tag if DVM needs it
      };

      const nip90ConfigLayerCustom = Layer.succeed(NIP90ProviderConfigTag, nip90ConfigCustom);

      // Reuse the same dependencies as nip90_devstral
      const nip90AgentLMLayerCustom = NIP90AgentLanguageModelLive.pipe(
        Layer.provide(nip90ConfigLayerCustom),
        Layer.provide(Layer.succeed(NIP90Service, nip90Service)),
        Layer.provide(Layer.succeed(NostrService, nostrService)),
        Layer.provide(Layer.succeed(NIP04Service, nip04Service)),
        Layer.provide(Layer.succeed(TelemetryService, telemetry)),
        Layer.provide(Layer.succeed(SparkService, sparkService))
      );

      const nip90AgentLMCustom: AgentLanguageModel = yield* _(
        Layer.build(nip90AgentLMLayerCustom).pipe(
          Effect.map((context) => Context.get(context, AgentLanguageModel.Tag)),
          Effect.scoped
        )
      );
      runTelemetry({ category: "orchestrator", action: "get_provider_model_success_nip90_custom", label: key });
      return nip90AgentLMCustom;
    }
    ```

**File:** `src/services/configuration/ConfigurationServiceImpl.ts` (`DefaultDevConfigLayer`)

1.  **Add Default Placeholders for Custom NIP-90 DVM (Optional, for easier testing):**
    *   You can add placeholder default values for the new `USER_NIP90_...` keys. This isn't strictly necessary for removing hardcoding but can help developers test the custom DVM flow if they don't have a UI to set these yet.
    *   **Example (add within `DefaultDevConfigLayer`):**
        ```typescript
        yield* _(configService.set("USER_NIP90_DVM_PUBKEY", "")); // Empty, user must fill
        yield* _(configService.set("USER_NIP90_RELAYS", JSON.stringify(["wss://relay.example.com"])));
        yield* _(configService.set("USER_NIP90_REQUEST_KIND", "5050"));
        yield* _(configService.set("USER_NIP90_REQUIRES_ENCRYPTION", "false"));
        yield* _(configService.set("USER_NIP90_USE_EPHEMERAL_REQUESTS", "true"));
        yield* _(configService.set("USER_NIP90_MODEL_IDENTIFIER", "default_custom_model"));
        yield* _(configService.set("USER_NIP90_NAME", "My Custom DVM"));
        yield* _(configService.set("USER_NIP90_ENABLED", "false")); // Default to disabled
        ```

**III. Update NIP-90 Helper for Clarity (Optional but Recommended):**

**File:** `src/helpers/nip90/event_creation.ts`

1.  **Clarity in `createNip90JobRequest` comments:**
    *   The current comments for `targetDvmPkHexForEncryption` and `targetDvmPkHexForPTag` are good. Ensure they clearly state that if `targetDvmPkHexForEncryption` is undefined, the request is unencrypted, and if `targetDvmPkHexForPTag` is undefined (and not encrypting to a specific DVM), it's a broadcast to any DVM.

**IV. Verify UI for NIP-90 Consumer Chat:**

**File:** `src/components/nip90_consumer_chat/Nip90ConsumerChatPane.tsx`

1.  **Target DVM Input:**
    *   The `targetDvmInput` state, which is passed as `targetDvmPubkeyHex` prop to `useNip90ConsumerChat`, is already user-editable. This is correct.
    *   Ensure the placeholder text for this input field clearly indicates it can be an npub or hex, and that leaving it blank results in an unencrypted broadcast (if the hook/service logic supports that for finding DVMs).
    *   Current placeholder: `"npub1... or hex pubkey (leave blank for unencrypted broadcast)"` - This is good.

**V. Provider-Side DVM Identity (Verification):**

**File:** `src/services/dvm/Kind5050DVMServiceImpl.ts` and `src/stores/dvmSettingsStore.ts`

1.  **No changes required.** The current setup where the DVM's own identity defaults to `defaultKind5050DVMServiceConfig` but is overridable by user settings (via `DVMSettingsDialog.tsx` and `dvmSettingsStore.ts`) is correct for the DVM provider side. This allows the user to define *their own DVM's identity*.

**Summary of Impact:**

*   The NIP-90 manual request form will allow users to target any DVM.
*   The AI chat system (`AgentChatPane` via `ChatOrchestratorService`) will be able to use a user-configured NIP-90 DVM in addition to any pre-defined ones like "devstral".
*   The system moves significantly closer to being able to "work with the entire network" of DVMs on the consumer side.
*   A future step would be to implement a UI for managing these custom NIP-90 DVM configurations in `ConfigurationService`.
*   Another future step could be DVM discovery mechanisms rather than manual pubkey entry.

After these changes, the most prominent hardcoded DVM pubkey (in `Nip90RequestForm.tsx`) will be removed, and the AI backend will be more flexible in targeting NIP-90 DVMs.

```

1.  **Does the Spark effect service we wrote support generating a spark wallet?**
    - Yes, the `SparkService` (specifically `SparkServiceImpl.ts`) initializes an instance of `SparkWallet` from the `@buildonspark/spark-sdk`.
    - This initialization is done via `SparkWallet.initialize({ mnemonicOrSeed: sparkConfig.mnemonicOrSeed, ... })`.
    - The `SparkServiceConfig` allows providing a `mnemonicOrSeed`.
    - The `DefaultSparkServiceConfigLayer` provides a "predefined development mnemonic or seed".
    - So, the service supports **initializing** a Spark wallet using a provided mnemonic or seed. If "generating" implies creating a new mnemonic/seed from scratch _within the SparkService itself_, then no, it expects the mnemonic/seed to be provided via its configuration. The Spark SDK itself might generate a wallet if no `mnemonicOrSeed` is provided, but our `SparkService` is designed to pass one in.

2.  **If so, does it use our BIP39 service (it needs to)?**
    - **No, the `SparkService` (as defined in `SparkServiceImpl.ts` and previously implemented) does not directly use "our" `BIP39Service` (from `src/services/bip39/`).**
    - The `SparkServiceImpl.ts` gets the `mnemonicOrSeed` from the `SparkServiceConfigTag` (which is provided by `DefaultSparkServiceConfigLayer` or another layer). It does not make any calls to a `BIP39Service` to generate or process this mnemonic.
    - While the application _has_ a `BIP39Service` (defined in `src/services/bip39/BIP39Service.ts` and `BIP39ServiceImpl.ts`), and NIP-06 (`docs/nips/06.md`) specifies using BIP39 for key derivation in Nostr, the `SparkService` as written is designed to _receive_ the mnemonic/seed, not to _generate_ it using an internal `BIP39Service`.

---
You've hit on the core of how these services would interact if you need to _generate_ a new Spark wallet from scratch within your application, rather than just using a pre-defined development mnemonic.

Here's the logical flow, incorporating your `BIP39Service`:

1.  **Generate Mnemonic using `BIP39Service`:**
    - Yes, the first step would be to use your `BIP39Service` to generate a new mnemonic phrase.
    - This would involve calling something like `BIP39Service.generateMnemonic()`. This provides the necessary entropy.
    - **Crucially:** This generated mnemonic **must** be displayed to the user and they **must** be instructed to back it up securely. Losing this mnemonic means losing access to the wallet.

2.  **(Optional but Recommended) Derive Seed using `BIP39Service`:**
    - While the Spark SDK's `SparkWallet.initialize` function accepts `mnemonicOrSeed`, you could also use your `BIP39Service.mnemonicToSeed(generatedMnemonic, optionalPassphrase)` to get the actual seed `Uint8Array`.
    - This gives you more control if, for instance, you want to incorporate a passphrase.

3.  **Configure `SparkService` with the Mnemonic/Seed:**
    - The `SparkService` (via `SparkServiceImpl.ts`) is designed to receive the `mnemonicOrSeed` through its `SparkServiceConfig`.
    - So, when you are setting up the `Layer` for `SparkServiceLive`, you need to provide a `SparkServiceConfigTag` that contains the _newly generated_ mnemonic (or seed).
    - The existing `DefaultSparkServiceConfigLayer` uses a hardcoded development mnemonic. For a production scenario or user-generated wallet, you would dynamically create a `Layer` for `SparkServiceConfigTag` like this:

    ```typescript
    import { Layer } from "effect";
    import {
      SparkServiceConfigTag,
      type SparkServiceConfig,
    } from "@/services/spark"; // Assuming paths
    import { BIP39Service, BIP39ServiceLive } from "@/services/bip39";
    import { Effect } from "effect"; // For running the generation

    // ... somewhere in your application's wallet setup/creation flow ...

    async function setupNewSparkWallet() {
      // 1. Generate mnemonic using BIP39Service
      const generateMnemonicEffect = Effect.flatMap(BIP39Service, (bip39) =>
        bip39.generateMnemonic(),
      );
      const newMnemonic = await Effect.runPromise(
        Effect.provide(generateMnemonicEffect, BIP39ServiceLive),
      );

      // !!! CRITICAL: Display `newMnemonic` to the user for backup !!!
      console.log("Your new recovery phrase:", newMnemonic);
      // In a real UI, you'd show this clearly and get confirmation of backup.

      // (Optional: Derive seed if Spark SDK needs the seed directly or if you use a passphrase)
      // const deriveSeedEffect = Effect.flatMap(BIP39Service, bip39 => bip39.mnemonicToSeed(newMnemonic));
      // const newSeed = await Effect.runPromise(Effect.provide(deriveSeedEffect, BIP39ServiceLive));

      // 2. Create a SparkServiceConfig layer with the new mnemonic/seed
      const userSparkConfig: SparkServiceConfig = {
        network: "REGTEST", // Or whatever network is appropriate
        mnemonicOrSeed: newMnemonic, // or newSeed if you derived it
        // accountNumber and sparkSdkOptions as needed
        accountNumber: 2, // Default account number if not specified
      };

      const userSparkConfigLayer = Layer.succeed(
        SparkServiceConfigTag,
        userSparkConfig,
      );

      // 3. Now, when you provide the SparkServiceLive layer, you'd also provide this user-specific config
      // Example (conceptual, depends on how your main runtime is composed):
      // const sparkLayerWithUserConfig = SparkServiceLive.pipe(
      //   Layer.provide(userSparkConfigLayer), // Provide the generated config
      //   Layer.provide(telemetryLayer)        // Provide other dependencies like telemetry
      // );

      // This userSparkConfigLayer would then be used when building the
      // full application layer that includes SparkService.
      // The `SparkServiceLive` would pick up this `userSparkConfig` via `SparkServiceConfigTag`.
    }
    ```

4.  **Pass to `SparkWallet.initialize`:**
    - Inside `SparkServiceImpl.ts`, the `SparkWallet.initialize` method will then receive this `mnemonicOrSeed` from the `sparkConfig` yielded from the context.

**In summary:**

- You **generate** the mnemonic (entropy) using `BIP39Service`.
- You then **pass** this generated mnemonic (or the seed derived from it) into the `SparkServiceConfig`.
- The `SparkService` consumes this config to initialize the `SparkWallet` from the SDK.

This approach correctly separates the concern of mnemonic generation (handled by `BIP39Service`) from the concern of using that mnemonic to initialize the Spark SDK wallet (handled by `SparkService` based on its configuration). This ensures that if a Spark wallet needs to be generated, it indeed uses your `BIP39Service` as the source of the mnemonic.Okay, I will instruct the coding agent to remove hardcoded DVM (Data Vending Machine) pubkeys, primarily from the consumer side, to enable interaction with any DVM on the Nostr network. The provider side's default identity mechanism, which is user-overridable, will be maintained.

**Instructions for the Coding Agent:**

**I. Modify the NIP-90 Manual Request Form:**

**File:** `src/components/nip90/Nip90RequestForm.tsx`

1.  **Remove Hardcoded DVM Pubkey:**
    *   Delete the constant definition: `const OUR_DVM_PUBKEY_HEX = "..."`.

2.  **Add Input Field for Target DVM Pubkey:**
    *   Import `ChangeEvent` from React: `import type { ChangeEvent } from "react";`
    *   Add a new `useState` hook for the target DVM public key:
        ```typescript
        const [targetDvmPk, setTargetDvmPk] = useState<string>("");
        ```
    *   In the JSX, add a new `div` for this input field within the `<CardContent>` section, ideally placed logically with other input fields (e.g., after "Bid Amount"):
        ```html
        <div className="space-y-1.5">
          <Label htmlFor="targetDvmPk">Target DVM Public Key (npub or hex, optional)</Label>
          <Input
            id="targetDvmPk"
            value={targetDvmPk}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTargetDvmPk(e.target.value)}
            placeholder="npub1... or hex (for encrypted/specific DVM)"
            disabled={isPublishing}
          />
        </div>
        ```

3.  **Use Dynamic Target DVM Pubkey in `handlePublishRequest`:**
    *   Import `nip19` from `nostr-tools/nip19` if not already present: `import * as nip19 from "nostr-tools/nip19";`
    *   Inside the `handlePublishRequest` function, before the `try...catch` block or at the beginning of the `try` block, add the following logic to determine `finalTargetDvmPkHexForEncryption` and `finalTargetDvmPkHexForPTag`:
        ```typescript
        let finalTargetDvmPkHexForEncryption: string | undefined = undefined;
        let finalTargetDvmPkHexForPTag: string | undefined = undefined;

        if (targetDvmPk.trim()) {
          if (targetDvmPk.startsWith("npub1")) {
            try {
              const decoded = nip19.decode(targetDvmPk.trim());
              if (decoded.type === 'npub') {
                finalTargetDvmPkHexForEncryption = decoded.data;
                finalTargetDvmPkHexForPTag = decoded.data;
              } else {
                setPublishError("Invalid npub format for Target DVM.");
                setIsPublishing(false);
                return;
              }
            } catch (e) {
              setPublishError("Failed to decode npub for Target DVM.");
              setIsPublishing(false);
              return;
            }
          } else if (targetDvmPk.trim().length === 64 && /^[0-9a-fA-F]{64}$/.test(targetDvmPk.trim())) {
            finalTargetDvmPkHexForEncryption = targetDvmPk.trim();
            finalTargetDvmPkHexForPTag = targetDvmPk.trim();
          } else {
            setPublishError("Invalid format for Target DVM Public Key. Must be npub or 64-char hex.");
            setIsPublishing(false);
            return;
          }
        }
        // If targetDvmPk is empty, both finalTarget... variables remain undefined.
        ```
    *   In the `jobParams` object creation, update the `targetDvmPubkeyHex` assignment:
        ```typescript
        const jobParams: CreateNIP90JobParams = {
          kind,
          inputs: inputsForEncryption, // Ensure this is correctly typed as ReadonlyArray<readonly [string, NIP90InputType, (string | undefined)?, (string | undefined)?]>
          outputMimeType: currentOutputMimeType,
          requesterSk: requesterSkUint8Array, // No need to cast to Uint8Array<ArrayBuffer> here if it's already Uint8Array
          targetDvmPubkeyHex: finalTargetDvmPkHexForEncryption, // This is for encryption
          bidMillisats: bidNum,
          additionalParams: (mutableAdditionalParams as Array<[string, string, string]> | undefined), // Type cast if needed
        };
        ```
    *   Ensure the call to `createNip90JobRequest` in `NIP90ServiceImpl.ts` (which this form calls indirectly via `NIP90Service.createJobRequest`) correctly handles the `targetDvmPkHexForPTag` for the `p` tag. The current helper `createNip90JobRequest` in `src/helpers/nip90/event_creation.ts` already accepts `targetDvmPkHexForPTag`. The `CreateNIP90JobParams` type and its schema in `NIP90Service.ts` might need to be updated to include `targetDvmPkHexForPTag` if it's not already there, and `NIP90ServiceImpl.ts` will need to pass it along.
        *   **Action for `src/services/nip90/NIP90Service.ts`**:
            *   Update `CreateNIP90JobParamsSchema` to include `targetDvmPkHexForPTag: Schema.optional(Schema.String),`.
            *   Update `CreateNIP90JobParams` type accordingly.
        *   **Action for `src/services/nip90/NIP90ServiceImpl.ts`**:
            *   In `createJobRequest`, when calling the helper `createNip90JobRequest`, pass `validatedParams.targetDvmPkHexForPTag` (this will require `validatedParams` to have this field from the schema update).
            *   The actual `createNip90JobRequest` helper in `src/helpers/nip90/event_creation.ts` already has the `targetDvmPkHexForPTag` parameter, so ensure it's used correctly there to set the `p` tag.

**II. Modify AI Backend for Dynamic NIP-90 DVM Configuration:**

**File:** `src/stores/ai/agentChatStore.ts`

1.  **Update `loadAvailableProviders` for Custom NIP-90 DVM:**
    *   In the `loadAvailableProviders` function, after the "nip90_devstral" block, add the following:
        ```typescript
        // Add logic for custom NIP-90 DVM
        const userNip90EnabledStr = yield* _(safeGetConfig("USER_NIP90_ENABLED", "false"));
        if (userNip90EnabledStr === "true") {
          const userNip90DvmPkResult = yield* _(Effect.optional(configService.get("USER_NIP90_DVM_PUBKEY")));
          const userNip90DvmPk = Option.getOrElse(userNip90DvmPkResult, () => "");

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
        ```

**File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`

1.  **Update `getProviderLanguageModel` to Handle Custom NIP-90 DVM:**
    *   In the `switch (key.toLowerCase())` statement within `getProviderLanguageModel`, add a new case for `"nip90_custom"`:
        ```typescript
        case "nip90_custom": {
          runTelemetry({ category: "orchestrator", action: "get_provider_model_start_nip90_custom", label: key });

          const dvmPubkey = yield* _(configService.get("USER_NIP90_DVM_PUBKEY").pipe(Effect.mapError(e => new AiConfigurationError({ message: "Custom NIP-90 DVM Pubkey not configured", cause: e }))));
          // Ensure relays are fetched correctly, defaulting to DEFAULT_RELAYS_ARRAY if not found or empty
          const relaysStr = yield* _(configService.get("USER_NIP90_RELAYS").pipe(Effect.orElseSucceed(() => JSON.stringify(DEFAULT_RELAYS_ARRAY))));
          let relays: string[];
          try {
            relays = JSON.parse(relaysStr);
            if (!Array.isArray(relays) || relays.length === 0) {
              relays = DEFAULT_RELAYS_ARRAY; // Use default if parsed is empty or not an array
            }
          } catch {
            relays = DEFAULT_RELAYS_ARRAY; // Use default on parse error
          }

          const reqKindStr = yield* _(configService.get("USER_NIP90_REQUEST_KIND").pipe(Effect.orElseSucceed(() => "5050")));
          const reqKind = parseInt(reqKindStr, 10);
          const reqEncryptionStr = yield* _(configService.get("USER_NIP90_REQUIRES_ENCRYPTION").pipe(Effect.orElseSucceed(() => "true")));
          const useEphemeralStr = yield* _(configService.get("USER_NIP90_USE_EPHEMERAL_REQUESTS").pipe(Effect.orElseSucceed(() => "true")));
          const modelIdFromConfig = yield* _(configService.get("USER_NIP90_MODEL_IDENTIFIER").pipe(Effect.orElseSucceed(() => "custom_nip90_model")));

          const nip90ConfigCustom: NIP90ProviderConfig = {
            modelName: modelNameOverride || modelIdFromConfig,
            isEnabled: true,
            dvmPubkey,
            dvmRelays: relays,
            requestKind: !isNaN(reqKind) && reqKind >= 5000 && reqKind <= 5999 ? reqKind : 5050,
            requiresEncryption: reqEncryptionStr === "true",
            useEphemeralRequests: useEphemeralStr === "true",
            modelIdentifier: modelIdFromConfig,
          };

          const nip90ConfigLayerCustom = Layer.succeed(NIP90ProviderConfigTag, nip90ConfigCustom);

          const nip90AgentLMLayerCustom = NIP90AgentLanguageModelLive.pipe(
            Layer.provide(nip90ConfigLayerCustom),
            Layer.provide(Layer.succeed(NIP90Service, nip90Service)),
            Layer.provide(Layer.succeed(NostrService, nostrService)),
            Layer.provide(Layer.succeed(NIP04Service, nip04Service)),
            Layer.provide(Layer.succeed(TelemetryService, telemetry)),
            Layer.provide(Layer.succeed(SparkService, sparkService))
          );

          const nip90AgentLMCustomInstance = yield* _(
            Layer.build(nip90AgentLMLayerCustom).pipe(
              Effect.map((context) => Context.get(context, AgentLanguageModel.Tag)),
              Effect.scoped
            )
          );
          runTelemetry({ category: "orchestrator", action: "get_provider_model_success_nip90_custom", label: key });
          return nip90AgentLMCustomInstance;
        }
        ```

**File:** `src/services/configuration/ConfigurationServiceImpl.ts` (in `DefaultDevConfigLayer`)

1.  **Add Default Placeholders for Custom NIP-90 DVM (Optional but recommended for testing):**
    *   Inside `DefaultDevConfigLayer`'s `Effect.gen` block, add:
        ```typescript
        // User-configurable NIP-90 DVM placeholders
        yield* _(configService.set("USER_NIP90_DVM_PUBKEY", "")); // User needs to fill this
        yield* _(configService.set("USER_NIP90_RELAYS", JSON.stringify(["wss://relay.damus.io", "wss://nostr.wine"])));
        yield* _(configService.set("USER_NIP90_REQUEST_KIND", "5050"));
        yield* _(configService.set("USER_NIP90_REQUIRES_ENCRYPTION", "false")); // Default to false for easier testing
        yield* _(configService.set("USER_NIP90_USE_EPHEMERAL_REQUESTS", "true"));
        yield* _(configService.set("USER_NIP90_MODEL_IDENTIFIER", "default_user_model"));
        yield* _(configService.set("USER_NIP90_NAME", "My Custom NIP-90 DVM"));
        yield* _(configService.set("USER_NIP90_ENABLED", "false")); // Start disabled by default
        ```

**III. Update Helper `createNip90JobRequest` to Properly Handle `targetDvmPkHexForPTag`:**

**File:** `src/helpers/nip90/event_creation.ts`

1.  **Modify `createNip90JobRequest` function:**
    *   Ensure the `p` tag logic correctly uses `targetDvmPkHexForPTag` when provided and distinct from `targetDvmPkHexForEncryption`, or when broadcasting.

    ```typescript
    // ... inside createNip90JobRequest ...
    const tags: Array<[string, ...string[]]> = [["output", outputMimeType]];

    // Conditional Encryption & P-Tagging Logic
    if (targetDvmPkHexForEncryption && targetDvmPkHexForEncryption.length === 64) {
        // Encrypting to a specific DVM
        eventContent = yield* _(
            nip04Service.encrypt(
                requesterSk,
                targetDvmPkHexForEncryption,
                stringifiedParams,
            ),
        );
        // The p-tag for encryption target is crucial
        tags.push(["p", targetDvmPkHexForEncryption]);
        tags.push(["encrypted"]);

        // If a *different* p-tag target is also specified for routing (advanced use case, rare for NIP-04)
        // and it's not the same as the encryption target, add it as well.
        // Typically, targetDvmPkHexForPTag would be the same as targetDvmPkHexForEncryption if encrypting.
        if (targetDvmPkHexForPTag &&
            targetDvmPkHexForPTag.length === 64 &&
            targetDvmPkHexForPTag !== targetDvmPkHexForEncryption) {
            tags.push(["p", targetDvmPkHexForPTag, "wss://relay.example.com/proxy", "proxy"]); // Example marker
        }
    } else {
        // Not encrypting (or targetDvmPkHexForEncryption was invalid)
        eventContent = stringifiedParams;
        // If a PTag target is specified for routing an unencrypted request, add it.
        if (targetDvmPkHexForPTag && targetDvmPkHexForPTag.length === 64) {
            tags.push(["p", targetDvmPkHexForPTag]);
        }
        // Log warning if encryption was intended but target PK was invalid
        if (targetDvmPkHexForEncryption && targetDvmPkHexForEncryption.length !== 64) {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.warn(
                `[NIP90 Helper] Invalid targetDvmPkHexForEncryption ('${targetDvmPkHexForEncryption}'). Sending unencrypted request. P-tag target (if any): ${targetDvmPkHexForPTag || 'none'}`
            );
        }
    }
    // ... rest of the function ...
    ```

**IV. Final Verification & Testing:**

*   Manually test the `Nip90RequestForm` by inputting a known DVM's npub/hex and sending a job.
*   Test the `AgentChatPane`:
    *   Select "Ollama (Local)" and verify it works.
    *   Select "Devstral (NIP-90)" and verify it targets the pre-configured Devstral DVM.
    *   If you add UI to set `USER_NIP90_DVM_PUBKEY` etc., test the "Custom NIP-90 DVM" option.
*   Verify the DVM provider side (`SellComputePane`) continues to function with its (default or user-set) identity.

This set of changes ensures that client-side components and services are no longer hardcoded to a specific DVM pubkey and can dynamically target different DVMs based on configuration or user input. A UI for managing these "USER_NIP90_..." settings would be the next logical step for user convenience.You want to remove all hardcoded pubkeys to make the DVM integration work with the entire network. This primarily means making the **client/consumer side** of the DVM interaction configurable, so it can target any DVM, rather than a pre-defined one. The **provider side** (when the app acts as a DVM) needs its own identity, which is fine as long as it's user-configurable (which it is via `DVMSettingsDialog.tsx`).

Here are the instructions:

**I. Modify the NIP-90 Manual Request Form (`src/components/nip90/Nip90RequestForm.tsx`)**

1.  **Remove Hardcoded DVM Pubkey:**
    *   Delete the line: `const OUR_DVM_PUBKEY_HEX = "..."`.

2.  **Add Input Field for Target DVM Pubkey:**
    *   Import `ChangeEvent` from `react`: `import type { ChangeEvent } from "react";`
    *   Add a new `useState` hook for the target DVM public key:
        ```typescript
        const [targetDvmPkInput, setTargetDvmPkInput] = useState<string>("");
        ```
    *   In the JSX form, add a new input field for the target DVM pubkey. A good place is after the "Bid Amount" input:
        ```html
        <div className="space-y-1.5">
          <Label htmlFor="targetDvmPkInput">Target DVM Pubkey (npub or hex, optional for broadcast)</Label>
          <Input
            id="targetDvmPkInput"
            value={targetDvmPkInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTargetDvmPkInput(e.target.value)}
            placeholder="npub1... or hex (leave blank for broadcast)"
            disabled={isPublishing}
          />
        </div>
        ```

3.  **Update `handlePublishRequest` to Use Dynamic DVM Pubkey:**
    *   At the beginning of the `handlePublishRequest` function (inside the `try` block), add logic to process `targetDvmPkInput`:
        ```typescript
        let finalTargetDvmPkHexForEncryption: string | undefined = undefined;
        let finalTargetDvmPkHexForPTag: string | undefined = undefined;
        const dvmInput = targetDvmPkInput.trim();

        if (dvmInput) {
          if (dvmInput.startsWith("npub1")) {
            try {
              const decoded = nip19.decode(dvmInput); // Ensure nip19 is imported: import * as nip19 from "nostr-tools/nip19";
              if (decoded.type === 'npub') {
                finalTargetDvmPkHexForEncryption = decoded.data;
                finalTargetDvmPkHexForPTag = decoded.data;
              } else {
                setPublishError("Invalid npub format for Target DVM.");
                setIsPublishing(false);
                return;
              }
            } catch (e) {
              setPublishError(`Failed to decode npub: ${e instanceof Error ? e.message : String(e)}`);
              setIsPublishing(false);
              return;
            }
          } else if (dvmInput.length === 64 && /^[0-9a-fA-F]{64}$/.test(dvmInput)) {
            finalTargetDvmPkHexForEncryption = dvmInput;
            finalTargetDvmPkHexForPTag = dvmInput;
          } else {
            setPublishError("Target DVM Pubkey must be a valid npub or 64-char hex string.");
            setIsPublishing(false);
            return;
          }
        }
        // If dvmInput is empty, both finalTarget... variables will remain undefined.
        ```
    *   Update the `jobParams` object:
        Change:
        ```typescript
        // targetDvmPubkeyHex: OUR_DVM_PUBKEY_HEX, // OLD
        ```
        To:
        ```typescript
        targetDvmPubkeyHex: finalTargetDvmPkHexForEncryption, // For encryption
        ```
    *   Update `CreateNIP90JobParamsSchema` and `CreateNIP90JobParams` in `src/services/nip90/NIP90Service.ts` to include an optional `targetDvmPkHexForPTag: Schema.optional(Schema.String),`.
    *   Update `NIP90ServiceImpl.ts` (`createJobRequest` method) to pass this `validatedParams.targetDvmPkHexForPTag` to the `createNip90JobRequest` helper function.
    *   The `createNip90JobRequest` helper in `src/helpers/nip90/event_creation.ts` already accepts `targetDvmPkHexForPTag`. Ensure its logic correctly uses this for the `p` tag if `targetDvmPkHexForEncryption` is undefined (for unencrypted broadcast to a specific DVM) or if they are different (advanced scenario).

**II. AI Backend - Make NIP-90 Provider Target Dynamic**

**File:** `src/stores/ai/agentChatStore.ts`

1.  **Modify `loadAvailableProviders`:**
    *   The "nip90_devstral" entry is a *default example*. The system should allow users to configure and select other NIP-90 DVMs.
    *   Add a placeholder for a user-configurable NIP-90 DVM. This involves fetching its configuration from `ConfigurationService`.
        ```typescript
        // In loadAvailableProviders, after "nip90_devstral":
        const userNip90EnabledStr = yield* _(safeGetConfig("USER_NIP90_ENABLED", "false"));
        if (userNip90EnabledStr === "true") {
          const userNip90DvmPkResult = yield* _(Effect.optional(configService.get("USER_NIP90_DVM_PUBKEY")));
          const userNip90DvmPk = Option.getOrElse(userNip90DvmPkResult, () => "");

          if (userNip90DvmPk.trim()) { // Only add if pubkey is configured
            const userNip90Name = yield* _(safeGetConfig("USER_NIP90_NAME", "My Custom NIP-90 DVM"));
            const userNip90ModelIdentifier = yield* _(safeGetConfig("USER_NIP90_MODEL_IDENTIFIER", "custom_model"));

            providers.push({
              key: "nip90_custom",
              name: userNip90Name,
              type: "nip90",
              configKey: "USER_NIP90",
              modelName: userNip90ModelIdentifier,
            });
          }
        }
        ```

**File:** `src/services/ai/orchestration/ChatOrchestratorService.ts`

1.  **Modify `getProviderLanguageModel` (within `ChatOrchestratorServiceLive`):**
    *   Add a new `case "nip90_custom":` (or whatever key you used in the store) to the `switch` statement.
    *   Inside this case, fetch the DVM's connection details (pubkey, relays, request kind, encryption requirements, model identifier) from `ConfigurationService` using keys like `USER_NIP90_DVM_PUBKEY`, `USER_NIP90_RELAYS`, etc.
    *   Construct `NIP90ProviderConfig` using these fetched values. If any crucial config (like pubkey) is missing for "nip90_custom", `Effect.fail` with an `AiConfigurationError`.
    *   Build and return the `NIP90AgentLanguageModelLive` layer using this custom configuration, similar to how "nip90_devstral" is handled.

    ```typescript
    // In getProviderLanguageModel:
    case "nip90_custom": {
      runTelemetry({ category: "orchestrator", action: "get_provider_model_start_nip90_custom", label: key });

      const dvmPubkeyOpt = yield* _(Effect.optional(configService.get("USER_NIP90_DVM_PUBKEY")));
      if (Option.isNone(dvmPubkeyOpt) || !dvmPubkeyOpt.value.trim()) {
        return yield* _(Effect.fail(new AiConfigurationError({ message: "Custom NIP-90 DVM Pubkey not configured or empty for provider 'nip90_custom'" })));
      }
      const dvmPubkey = dvmPubkeyOpt.value;

      const relaysStr = yield* _(configService.get("USER_NIP90_RELAYS").pipe(Effect.orElseSucceed(() => JSON.stringify(DEFAULT_RELAYS_ARRAY)))); // Use DEFAULT_RELAYS_ARRAY from src/services/relays
      let relaysCfg: string[];
      try {
        relaysCfg = JSON.parse(relaysStr);
        if (!Array.isArray(relaysCfg) || relaysCfg.length === 0) relaysCfg = DEFAULT_RELAYS_ARRAY;
      } catch { relaysCfg = DEFAULT_RELAYS_ARRAY; }

      const reqKindStr = yield* _(configService.get("USER_NIP90_REQUEST_KIND").pipe(Effect.orElseSucceed(() => "5050")));
      const reqKind = parseInt(reqKindStr, 10);
      const reqEncryptionStr = yield* _(configService.get("USER_NIP90_REQUIRES_ENCRYPTION").pipe(Effect.orElseSucceed(() => "true")));
      const useEphemeralStr = yield* _(configService.get("USER_NIP90_USE_EPHEMERAL_REQUESTS").pipe(Effect.orElseSucceed(() => "true")));
      const modelIdFromConfig = yield* _(configService.get("USER_NIP90_MODEL_IDENTIFIER").pipe(Effect.orElseSucceed(() => "custom_nip90_model")));

      const nip90ConfigCustom: NIP90ProviderConfig = {
        modelName: modelNameOverride || modelIdFromConfig,
        isEnabled: true,
        dvmPubkey,
        dvmRelays: relaysCfg,
        requestKind: (!isNaN(reqKind) && reqKind >= 5000 && reqKind <= 5999) ? reqKind : 5050,
        requiresEncryption: reqEncryptionStr === "true",
        useEphemeralRequests: useEphemeralStr === "true",
        modelIdentifier: modelIdFromConfig,
      };

      const nip90ConfigLayerCustom = Layer.succeed(NIP90ProviderConfigTag, nip90ConfigCustom);

      const nip90AgentLMLayerCustom = NIP90AgentLanguageModelLive.pipe(
        Layer.provide(nip90ConfigLayerCustom),
        Layer.provide(Layer.succeed(NIP90Service, nip90Service)),
        Layer.provide(Layer.succeed(NostrService, nostrService)),
        Layer.provide(Layer.succeed(NIP04Service, nip04Service)),
        Layer.provide(Layer.succeed(TelemetryService, telemetry)),
        Layer.provide(Layer.succeed(SparkService, sparkService)) // Ensure SparkService is available
      );

      const nip90AgentLMCustomInstance = yield* _(
        Layer.build(nip90AgentLMLayerCustom).pipe(
          Effect.map((context) => Context.get(context, AgentLanguageModel.Tag)),
          Effect.scoped
        )
      );
      runTelemetry({ category: "orchestrator", action: "get_provider_model_success_nip90_custom", label: key });
      return nip90AgentLMCustomInstance;
    }
    ```

**File:** `src/services/configuration/ConfigurationServiceImpl.ts` (in `DefaultDevConfigLayer`)

1.  **Add Default Placeholders for Custom NIP-90 DVM:**
    *   Inside the `Effect.gen` block of `DefaultDevConfigLayer`, add placeholder configurations for the custom NIP-90 DVM. This allows developers to test this feature by just enabling it and filling in their DVM's details.
        ```typescript
        yield* _(configService.set("USER_NIP90_DVM_PUBKEY", "")); // User must fill this
        yield* _(configService.set("USER_NIP90_RELAYS", JSON.stringify(["wss://relay.damus.io", "wss://nostr.wine"])));
        yield* _(configService.set("USER_NIP90_REQUEST_KIND", "5050"));
        yield* _(configService.set("USER_NIP90_REQUIRES_ENCRYPTION", "false"));
        yield* _(configService.set("USER_NIP90_USE_EPHEMERAL_REQUESTS", "true"));
        yield* _(configService.set("USER_NIP90_MODEL_IDENTIFIER", "custom_model")); // This would be specific to the DVM
        yield* _(configService.set("USER_NIP90_NAME", "My Custom DVM"));
        yield* _(configService.set("USER_NIP90_ENABLED", "false")); // Disabled by default
        ```

**III. Update NIP-90 Service Interface and Implementation for P-Tag Targeting**

**File:** `src/services/nip90/NIP90Service.ts`

1.  **Update `CreateNIP90JobParamsSchema` and `CreateNIP90JobParams` type:**
    *   Add an optional field `targetDvmPkHexForPTag: Schema.optional(Schema.String)` to the schema.
    *   Add `targetDvmPkHexForPTag?: string;` to the `CreateNIP90JobParams` interface.

**File:** `src/services/nip90/NIP90ServiceImpl.ts`

1.  **Update `createJobRequest` method:**
    *   When calling the `createNip90JobRequest` helper function, pass `validatedParams.targetDvmPkHexForPTag`. The line should look like:
        ```typescript
        const jobEventEffect = createNip90JobRequest(
          validatedParams.requesterSk,
          validatedParams.targetDvmPubkeyHex, // For encryption
          mutableInputs,
          validatedParams.outputMimeType || "text/plain",
          validatedParams.bidMillisats,
          validatedParams.kind,
          validatedParams.targetDvmPkHexForPTag, // For p-tag
          mutableAdditionalParams as Array<[string, string, string]> | undefined,
        );
        ```

**IV. Update NIP-90 Event Creation Helper (`src/helpers/nip90/event_creation.ts`)**

1.  **Refine `p`-tag logic in `createNip90JobRequest`:**
    *   The current logic for adding the `p`-tag is mostly correct if `targetDvmPkHexForEncryption` is the primary target for the `p`-tag.
    *   Ensure that if `targetDvmPkHexForPTag` is provided and is *different* from `targetDvmPkHexForEncryption` (an advanced scenario where encryption target might differ from routing p-tag), both are handled or the logic is clarified.
    *   If `targetDvmPkHexForEncryption` is *undefined* (unencrypted request) AND `targetDvmPkHexForPTag` *is defined*, the `p`-tag should use `targetDvmPkHexForPTag`.
    *   If *both* are undefined, no `p`-tag is added (broadcast).

    Modify the `p`-tag and encryption logic as follows:
    ```typescript
    // Inside createNip90JobRequest function in src/helpers/nip90/event_creation.ts
    // ...
    const tags: Array<[string, ...string[]]> = [["output", outputMimeType]];
    let eventContent = stringifiedParams; // Default to unencrypted

    if (targetDvmPkHexForEncryption && targetDvmPkHexForEncryption.length === 64) {
      // Encrypt content if encryption target is valid
      eventContent = yield* _(
        nip04Service.encrypt(
          requesterSk,
          targetDvmPkHexForEncryption,
          stringifiedParams,
        ),
      );
      tags.push(["encrypted"]);
      // If encrypted, the primary p-tag is usually the encryption target.
      // The PTag field might be redundant or for a proxy.
      if (!targetDvmPkHexForPTag || targetDvmPkHexForPTag === targetDvmPkHexForEncryption) {
        tags.push(["p", targetDvmPkHexForEncryption]);
      } else {
        // Both are defined and different: add encryption target as main p-tag for decryption,
        // and PTag as an additional one, possibly with a marker if NIP-90 defines one.
        tags.push(["p", targetDvmPkHexForEncryption]);
        tags.push(["p", targetDvmPkHexForPTag /*, "wss://some-proxy.com", "proxy-route" */]); // Example of adding a secondary routing p-tag
      }
    } else if (targetDvmPkHexForPTag && targetDvmPkHexForPTag.length === 64) {
      // Not encrypted, but a specific p-tag is provided for routing
      tags.push(["p", targetDvmPkHexForPTag]);
      if (targetDvmPkHexForEncryption) { // Encryption target was invalid
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (or use TelemetryService if available here)
            console.warn(
                `[NIP90 Helper] Invalid targetDvmPkHexForEncryption ('${targetDvmPkHexForEncryption}'). Sending unencrypted. P-tag used: ${targetDvmPkHexForPTag}`
            );
      }
    } else if (targetDvmPkHexForEncryption) { // Encryption target was invalid, no PTag either
        // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
        console.warn(
            `[NIP90 Helper] Invalid targetDvmPkHexForEncryption ('${targetDvmPkHexForEncryption}'). Sending unencrypted broadcast.`
        );
    }
    // If neither encryption target nor PTag target is validly provided, it's a broadcast (no p-tag).

    if (bidMillisats !== undefined && bidMillisats > 0) {
      tags.push(["bid", bidMillisats.toString()]);
    }
    // ... rest of the function to finalizeEvent
    ```

This ensures that the consumer components (`Nip90RequestForm`, `AgentChatPane`) can specify any DVM, and the AI backend can be configured to use user-defined NIP-90 DVMs. The DVM provider component itself will continue to use its own (default or user-configured) identity.
A UI for managing the `USER_NIP90_*` configuration keys in `ConfigurationService` would be a necessary follow-up for a complete user experience.
