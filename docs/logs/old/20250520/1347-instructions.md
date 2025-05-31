Okay, Agent, the next phase is to implement the core logic for the `Kind5050DVMService`. This service will listen for NIP-90 job requests (kind 5000-5999), process them using Ollama and Spark, and respond with results and feedback. We will also integrate this service with the `SellComputePane` UI.

**I. Refine `Kind5050DVMService` Configuration and Identity**

1.  **File: `src/services/dvm/Kind5050DVMService.ts`**

    - Update `Kind5050DVMServiceConfig` to include `dvmPrivateKeyHex` and `dvmPublicKeyHex`.
    - Refine `defaultJobConfig` to be specific for text generation, referencing `docs/dvm-kind-5050.md`.
    - Update `DefaultKind5050DVMServiceConfigLayer` to provide a default development private key and derive the public key.

    ```typescript
    // src/services/dvm/Kind5050DVMService.ts
    import { Context, Effect, Data, Schema, Layer } from "effect";
    import { TelemetryService } from "@/services/telemetry";
    import { TrackEventError } from "@/services/telemetry/TelemetryService";
    import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
    import { bytesToHex } from "@noble/hashes/utils";

    // DVM service errors
    export class DVMServiceError extends Data.TaggedError("DVMServiceError")<{
      readonly cause?: unknown;
      readonly message: string;
      readonly context?: Record<string, unknown>;
    }> {}
    export class DVMConfigError extends DVMServiceError {}
    export class DVMConnectionError extends DVMServiceError {}
    export class DVMJobRequestError extends DVMServiceError {}
    export class DVMJobProcessingError extends DVMServiceError {}
    export class DVMPaymentError extends DVMServiceError {}
    export class DVMInvocationError extends DVMServiceError {}
    export type DVMError =
      | DVMConfigError
      | DVMConnectionError
      | DVMJobRequestError
      | DVMJobProcessingError
      | DVMPaymentError
      | DVMInvocationError;

    // Default Text Generation Job Parameters based on docs/dvm-kind-5050.md
    export interface DefaultTextGenerationJobConfig {
      model: string;
      max_tokens: number;
      temperature: number;
      top_k: number;
      top_p: number;
      frequency_penalty: number;
      // Pricing related
      minPriceSats: number;
      pricePer1kTokens: number; // Price per 1000 tokens (input + output) in satoshis
    }

    export interface Kind5050DVMServiceConfig {
      active: boolean;
      dvmPrivateKeyHex: string;
      dvmPublicKeyHex: string;
      relays: string[];
      supportedJobKinds: number[]; // e.g., [5100] for text generation (Kind 5000-5999 for requests)
      defaultTextGenerationJobConfig: DefaultTextGenerationJobConfig;
    }

    export const Kind5050DVMServiceConfigTag =
      Context.GenericTag<Kind5050DVMServiceConfig>("Kind5050DVMServiceConfig");

    // Generate a default dev keypair
    const devDvmSkBytes = generateSecretKey();
    const devDvmSkHex = bytesToHex(devDvmSkBytes);
    const devDvmPkHex = getPublicKey(devDvmSkBytes);

    export const DefaultKind5050DVMServiceConfigLayer = Layer.succeed(
      Kind5050DVMServiceConfigTag,
      {
        active: false,
        dvmPrivateKeyHex: devDvmSkHex,
        dvmPublicKeyHex: devDvmPkHex,
        relays: [
          "wss://relay.damus.io",
          "wss://relay.nostr.band",
          "wss://nos.lol",
        ],
        supportedJobKinds: [5100], // Example: Text Generation as per docs/dvm-kind-5050.md (NIP-90 range 5000-5999)
        defaultTextGenerationJobConfig: {
          model: "gemma2:latest", // Ensure this model is available in your Ollama instance
          max_tokens: 512,
          temperature: 0.7,
          top_k: 40,
          top_p: 0.9,
          frequency_penalty: 0.5,
          minPriceSats: 10,
          pricePer1kTokens: 2,
        },
      },
    );

    export interface Kind5050DVMService {
      startListening(): Effect.Effect<void, DVMError | TrackEventError, never>;
      stopListening(): Effect.Effect<void, DVMError | TrackEventError, never>;
      isListening(): Effect.Effect<boolean, DVMError | TrackEventError, never>;
    }
    export const Kind5050DVMService =
      Context.GenericTag<Kind5050DVMService>("Kind5050DVMService");
    ```

**II. Implement Core DVM Logic in `Kind5050DVMServiceImpl.ts`**

- Implement `startListening`, `stopListening`, `isListening`.
- Create a private `processJobRequestInternal(event: NostrEvent)` method for the main job processing workflow.

  ```typescript
  // File: src/services/dvm/Kind5050DVMServiceImpl.ts
  import {
    Effect,
    Layer,
    Schema,
    Option,
    Cause,
    Fiber,
    Schedule,
    Duration,
  } from "effect";
  import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
  import {
    finalizeEvent,
    type EventTemplate,
    type NostrEventUnsigned,
  } from "nostr-tools/pure";
  import { TelemetryService } from "@/services/telemetry";
  import {
    NostrService,
    type NostrEvent,
    type NostrFilter,
    type Subscription,
    NostrPublishError,
  } from "@/services/nostr";
  import {
    OllamaService,
    type OllamaChatCompletionRequest,
    OllamaError,
  } from "@/services/ollama";
  import {
    SparkService,
    type CreateLightningInvoiceParams,
    SparkError,
    LightningInvoice,
  } from "@/services/spark";
  import {
    NIP04Service,
    NIP04DecryptError,
    NIP04EncryptError,
  } from "@/services/nip04";
  import {
    NIP90Input,
    NIP90JobParam,
    NIP90InputType,
    NIP90InputSchema,
    NIP90JobParamSchema,
  } from "@/services/nip90";
  import {
    Kind5050DVMService,
    Kind5050DVMServiceConfig,
    Kind5050DVMServiceConfigTag,
    DefaultKind5050DVMServiceConfigLayer,
    DVMConfigError,
    DVMConnectionError,
    DVMJobRequestError,
    DVMJobProcessingError,
    DVMPaymentError,
    DVMError,
  } from "./Kind5050DVMService";
  import * as ParseResult from "@effect/schema/ParseResult";

  // Helper to create NIP-90 feedback events (Kind 7000)
  function createNip90FeedbackEvent(
    dvmPrivateKeyHex: string,
    requestEvent: NostrEvent,
    status: "payment-required" | "processing" | "error" | "success" | "partial",
    contentOrExtraInfo?: string,
    amountDetails?: { amountMillisats: number; invoice?: string },
  ): NostrEvent {
    const tags: string[][] = [
      ["e", requestEvent.id],
      ["p", requestEvent.pubkey],
    ];

    const statusTagPayload = [status];
    if (
      contentOrExtraInfo &&
      (status === "error" ||
        status === "processing" ||
        status === "payment-required")
    ) {
      statusTagPayload.push(contentOrExtraInfo.substring(0, 256));
    }
    tags.push(statusTagPayload);

    if (amountDetails) {
      const amountTag = ["amount", amountDetails.amountMillisats.toString()];
      if (amountDetails.invoice) amountTag.push(amountDetails.invoice);
      tags.push(amountTag);
    }

    const template: EventTemplate = {
      kind: 7000,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content:
        status === "partial" ||
        (status === "error" &&
          contentOrExtraInfo &&
          contentOrExtraInfo.length > 256)
          ? contentOrExtraInfo || ""
          : "",
    };
    return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
  }

  // Helper to create NIP-90 job result events (Kind 6xxx)
  function createNip90JobResultEvent(
    dvmPrivateKeyHex: string,
    requestEvent: NostrEvent,
    jobOutputContent: string,
    invoiceAmountMillisats: number,
    bolt11Invoice: string,
    outputIsEncrypted: boolean,
  ): NostrEvent {
    const tags: string[][] = [
      ["request", JSON.stringify(requestEvent)], // As per NIP-90
      ["e", requestEvent.id],
      ["p", requestEvent.pubkey],
      ["amount", invoiceAmountMillisats.toString(), bolt11Invoice],
    ];

    if (outputIsEncrypted) tags.push(["encrypted"]);
    requestEvent.tags.filter((t) => t[0] === "i").forEach((t) => tags.push(t)); // Include original 'i' tags

    const resultKind = requestEvent.kind + 1000;
    if (resultKind < 6000 || resultKind > 6999) {
      console.error(
        `Calculated result kind ${resultKind} is out of NIP-90 range for request kind ${requestEvent.kind}. Defaulting to 6000.`,
      );
    }

    const template: EventTemplate = {
      kind: Math.max(6000, Math.min(6999, resultKind)), // Clamp to valid NIP-90 result range
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: jobOutputContent,
    };
    return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
  }

  export const Kind5050DVMServiceLive = Layer.scoped(
    Kind5050DVMService,
    Effect.gen(function* (_) {
      const config = yield* _(Kind5050DVMServiceConfigTag);
      const telemetry = yield* _(TelemetryService);
      const nostr = yield* _(NostrService);
      const ollama = yield* _(OllamaService);
      const spark = yield* _(SparkService);
      const nip04 = yield* _(NIP04Service);

      let isActiveInternal = config.active || false;
      let currentSubscription: Subscription | null = null;

      const publishFeedback = (feedbackEvent: NostrEvent) =>
        nostr.publishEvent(feedbackEvent).pipe(
          Effect.tapErrorTag("NostrPublishError", (err) =>
            telemetry.trackEvent({
              category: "dvm:error",
              action: "publish_feedback_failure",
              label: `Failed to publish feedback for ${feedbackEvent.tags.find((t) => t[0] === "e")?.[1]}`,
              value: err.message, // Changed from Cause.pretty(err) to err.message
            }),
          ),
          Effect.ignoreLogged,
        );

      const processJobRequestInternal = (
        jobRequestEvent: NostrEvent,
      ): Effect.Effect<void, DVMError, never> =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:job",
                action: "job_request_received",
                label: jobRequestEvent.id,
                value: JSON.stringify(jobRequestEvent.kind),
              })
              .pipe(Effect.ignoreLogged),
          );

          let inputsSource = jobRequestEvent.tags;
          let isRequestEncrypted = false;

          if (jobRequestEvent.tags.some((t) => t[0] === "encrypted")) {
            isRequestEncrypted = true;
            const dvmSkBytes = hexToBytes(config.dvmPrivateKeyHex);
            const decryptedContentStr = yield* _(
              nip04
                .decrypt(
                  dvmSkBytes,
                  jobRequestEvent.pubkey,
                  jobRequestEvent.content,
                )
                .pipe(
                  Effect.mapError(
                    (e) =>
                      new DVMJobRequestError({
                        message: "Failed to decrypt NIP-90 request content",
                        cause: e,
                      }),
                  ),
                ),
            );
            try {
              inputsSource = JSON.parse(decryptedContentStr) as Array<
                [string, ...string[]]
              >;
            } catch (e) {
              return yield* _(
                Effect.fail(
                  new DVMJobRequestError({
                    message: "Failed to parse decrypted JSON tags",
                    cause: e,
                  }),
                ),
              );
            }
          }

          const inputs: NIP90Input[] = [];
          const paramsMap = new Map<string, string>();
          let outputMimeType = "text/plain";
          let bidMillisats: number | undefined;

          inputsSource.forEach((tag) => {
            if (tag[0] === "i" && tag.length >= 3) {
              inputs.push([
                tag[1],
                tag[2] as NIP90InputType,
                tag[3],
                tag[4],
              ] as NIP90Input);
            }
            if (tag[0] === "param" && tag.length >= 3)
              paramsMap.set(tag[1], tag[2]);
            if (tag[0] === "output" && tag.length >= 2)
              outputMimeType = tag[1] || outputMimeType;
            if (tag[0] === "bid" && tag.length >= 2)
              bidMillisats = parseInt(tag[1], 10) || undefined;
          });

          if (inputs.length === 0) {
            const feedback = createNip90FeedbackEvent(
              config.dvmPrivateKeyHex,
              jobRequestEvent,
              "error",
              "No inputs provided.",
            );
            yield* _(publishFeedback(feedback));
            return yield* _(
              Effect.fail(
                new DVMJobRequestError({ message: "No inputs provided" }),
              ),
            );
          }

          const textInput = inputs.find((inp) => inp[1] === "text");
          if (!textInput || !textInput[0]) {
            const feedback = createNip90FeedbackEvent(
              config.dvmPrivateKeyHex,
              jobRequestEvent,
              "error",
              "No 'text' input found for text generation job.",
            );
            yield* _(publishFeedback(feedback));
            return yield* _(
              Effect.fail(
                new DVMJobRequestError({ message: "No text input found" }),
              ),
            );
          }
          const prompt = textInput[0];

          const processingFeedback = createNip90FeedbackEvent(
            config.dvmPrivateKeyHex,
            jobRequestEvent,
            "processing",
          );
          yield* _(publishFeedback(processingFeedback));

          const jobConfig = config.defaultTextGenerationJobConfig;
          const ollamaModel = paramsMap.get("model") || jobConfig.model;
          const ollamaRequest: OllamaChatCompletionRequest = {
            model: ollamaModel,
            messages: [{ role: "user", content: prompt }],
            stream: false,
            // TODO: Map NIP-90 params like max_tokens, temperature, etc., to Ollama options
            // if OllamaService is updated to accept them.
          };

          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:job",
                action: "ollama_params_for_job",
                label: `Job ID: ${jobRequestEvent.id}`,
                value: JSON.stringify({
                  nip90Params: Object.fromEntries(paramsMap),
                  ollamaRequestModel: ollamaRequest.model,
                }),
              })
              .pipe(Effect.ignoreLogged),
          );

          const ollamaResult = yield* _(
            ollama
              .generateChatCompletion(ollamaRequest)
              .pipe(
                Effect.mapError(
                  (e) =>
                    new DVMJobProcessingError({
                      message: "Ollama inference failed",
                      cause: e,
                    }),
                ),
              ),
          );
          const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
          const usage = ollamaResult.usage || {
            prompt_tokens: prompt.length / 4,
            completion_tokens: ollamaOutput.length / 4,
            total_tokens: (prompt.length + ollamaOutput.length) / 4,
          };
          const totalTokens = usage.total_tokens;

          const priceSats = Math.max(
            jobConfig.minPriceSats,
            Math.ceil((totalTokens / 1000) * jobConfig.pricePer1kTokens),
          );
          const invoiceAmountMillisats = priceSats * 1000;

          const invoiceSDKResult = yield* _(
            spark
              .createLightningInvoice({
                amountSats: priceSats,
                memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0, 8)}`,
              })
              .pipe(
                Effect.mapError(
                  (e) =>
                    new DVMPaymentError({
                      message: "Spark invoice creation failed",
                      cause: e,
                    }),
                ),
              ),
          );
          const bolt11Invoice = invoiceSDKResult.invoice.encodedInvoice;

          let finalOutputContent = ollamaOutput;
          if (isRequestEncrypted) {
            const dvmSkBytes = hexToBytes(config.dvmPrivateKeyHex);
            finalOutputContent = yield* _(
              nip04
                .encrypt(dvmSkBytes, jobRequestEvent.pubkey, ollamaOutput)
                .pipe(
                  Effect.mapError(
                    (e) =>
                      new DVMJobProcessingError({
                        message: "Failed to encrypt NIP-90 job result",
                        cause: e,
                      }),
                  ),
                ),
            );
          }

          const jobResultEvent = createNip90JobResultEvent(
            config.dvmPrivateKeyHex,
            jobRequestEvent,
            finalOutputContent,
            invoiceAmountMillisats,
            bolt11Invoice,
            isRequestEncrypted,
          );
          yield* _(
            nostr
              .publishEvent(jobResultEvent)
              .pipe(
                Effect.mapError(
                  (e) =>
                    new DVMJobProcessingError({
                      message: "Failed to publish job result event",
                      cause: e,
                    }),
                ),
              ),
          );

          const successFeedback = createNip90FeedbackEvent(
            config.dvmPrivateKeyHex,
            jobRequestEvent,
            "success",
          );
          yield* _(publishFeedback(successFeedback));

          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:job",
                action: "job_request_processed_success",
                label: jobRequestEvent.id,
              })
              .pipe(Effect.ignoreLogged),
          );
        }).pipe(
          Effect.catchAllCause((cause) => {
            const dvmError = Option.getOrElse(
              Cause.failureOption(cause),
              () =>
                new DVMJobProcessingError({
                  message: "Unknown error during DVM job processing",
                  cause,
                }),
            );
            const feedback = createNip90FeedbackEvent(
              config.dvmPrivateKeyHex,
              jobRequestEvent,
              "error",
              dvmError.message,
            );
            Effect.runFork(publishFeedback(feedback)); // Fire-and-forget
            return telemetry
              .trackEvent({
                category: "dvm:error",
                action: "job_request_processing_failure",
                label: jobRequestEvent.id,
                value: dvmError.message, // Changed from Cause.pretty
              })
              .pipe(
                Effect.ignoreLogged,
                Effect.andThen(Effect.fail(dvmError as DVMError)),
              );
          }),
        );

      return {
        startListening: () =>
          Effect.gen(function* (_) {
            if (isActiveInternal) {
              yield* _(
                telemetry
                  .trackEvent({
                    category: "dvm:status",
                    action: "start_listening_already_active",
                  })
                  .pipe(Effect.ignoreLogged),
              );
              return;
            }
            if (!config.dvmPrivateKeyHex) {
              return yield* _(
                Effect.fail(
                  new DVMConfigError({
                    message: "DVM private key not configured.",
                  }),
                ),
              );
            }

            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "start_listening_attempt",
                  label: `Relays: ${config.relays.join(", ")}`,
                })
                .pipe(Effect.ignoreLogged),
            );

            const jobRequestFilter: NostrFilter = {
              kinds: config.supportedJobKinds,
              since: Math.floor(Date.now() / 1000) - 300,
            };

            const sub = yield* _(
              nostr
                .subscribeToEvents([jobRequestFilter], (event: NostrEvent) => {
                  if (
                    event.pubkey === config.dvmPublicKeyHex &&
                    (event.kind === 7000 ||
                      (event.kind >= 6000 && event.kind <= 6999))
                  )
                    return;
                  Effect.runFork(processJobRequestInternal(event));
                })
                .pipe(
                  Effect.mapError(
                    (e) =>
                      new DVMConnectionError({
                        message:
                          "Failed to subscribe to Nostr for DVM requests",
                        cause: e,
                      }),
                  ),
                ),
            );

            currentSubscription = sub;
            isActiveInternal = true;
            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "start_listening_success",
                })
                .pipe(Effect.ignoreLogged),
            );
          }),

        stopListening: () =>
          Effect.gen(function* (_) {
            if (!isActiveInternal) {
              yield* _(
                telemetry
                  .trackEvent({
                    category: "dvm:status",
                    action: "stop_listening_already_inactive",
                  })
                  .pipe(Effect.ignoreLogged),
              );
              return;
            }
            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "stop_listening_attempt",
                })
                .pipe(Effect.ignoreLogged),
            );

            if (currentSubscription) {
              try {
                currentSubscription.unsub();
                currentSubscription = null;
              } catch (e) {
                yield* _(
                  telemetry
                    .trackEvent({
                      category: "dvm:error",
                      action: "stop_listening_unsub_failure",
                      label: e instanceof Error ? e.message : String(e),
                    })
                    .pipe(Effect.ignoreLogged),
                );
              }
            }
            isActiveInternal = false;
            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "stop_listening_success",
                })
                .pipe(Effect.ignoreLogged),
            );
          }),

        isListening: () => Effect.succeed(isActiveInternal),
      };
    }),
  );
  ```

**III. Update `src/services/runtime.ts`**

- Ensure `Kind5050DVMServiceLive` is added to `FullAppLayer` and its dependencies are correctly provided.

  ```typescript
  // File: src/services/runtime.ts
  // ... (existing imports)
  import {
    Kind5050DVMService,
    Kind5050DVMServiceLive,
    DefaultKind5050DVMServiceConfigLayer,
  } from "@/services/dvm"; // Ensure this path is correct

  export type FullAppContext =
    // ... (existing services)
    Kind5050DVMService; // Add Kind5050DVMService

  // ... (individual service layers as before)

  // Add Kind5050DVMService Layer
  const kind5050DVMLayer = Kind5050DVMServiceLive.pipe(
    layerProvide(
      layerMergeAll(
        DefaultKind5050DVMServiceConfigLayer,
        nostrLayer,
        ollamaLayer,
        sparkLayer,
        nip04Layer,
        telemetryLayer,
      ),
    ),
  );

  const FullAppLayer = layerMergeAll(
    // ... (existing layers)
    nip90Layer,
    kind5050DVMLayer,
  );

  // ... (rest of runtime.ts as before)
  ```

**IV. Update `src/components/sell-compute/SellComputePane.tsx`**

- Connect the "GO ONLINE" button to `Kind5050DVMService.startListening()` and `stopListening()`.
- Update the `isOnline` state based on `Kind5050DVMService.isListening()`.

  ```typescript
  // File: src/components/sell-compute/SellComputePane.tsx
  // ... (imports as before)
  import { Kind5050DVMService } from "@/services/dvm"; // Import the DVM service

  // ... (SellComputePane component definition)

  // Inside SellComputePane component:
  const runtime = getMainRuntime(); // Already there

  // Add a state for DVM operation loading
  const [isDvmLoading, setIsDvmLoading] = useState(false);

  // Callback to check DVM status
  const checkDVMStatus = useCallback(async () => {
    const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, (s) =>
      s.isListening(),
    );
    runPromiseExit(Effect.provide(dvmStatusProgram, runtime)).then((exit) => {
      if (Exit.isSuccess(exit)) {
        setIsOnline(exit.value);
      } else {
        console.error("Failed to check DVM status:", Cause.squash(exit.cause));
      }
    });
  }, [runtime]);

  // Update useEffect to include checkDVMStatus
  useEffect(() => {
    checkWalletStatus();
    checkOllamaStatus();
    checkDVMStatus(); // Check DVM status on mount
  }, [checkWalletStatus, checkOllamaStatus, checkDVMStatus]);

  const handleGoOnline = async () => {
    if (!isWalletConnected || !isOllamaConnected) {
      alert("Please connect your wallet and Ollama to go online.");
      return;
    }

    setIsDvmLoading(true); // Indicate DVM operation is in progress

    const dvmAction = isOnline
      ? Effect.flatMap(Kind5050DVMService, (s) => s.stopListening())
      : Effect.flatMap(Kind5050DVMService, (s) => s.startListening());

    const exit = await runPromiseExit(Effect.provide(dvmAction, runtime));

    if (Exit.isSuccess(exit)) {
      // After action, re-check actual DVM status to update UI
      await checkDVMStatus();
      console.log(
        `DVM Service ${isOnline ? "stop" : "start"} command successful.`,
      );
    } else {
      console.error(
        `Failed to ${isOnline ? "stop" : "start"} DVM:`,
        Cause.squash(exit.cause),
      );
      alert(
        `Failed to ${isOnline ? "stop" : "start"} the service. Check console for details.`,
      );
      // Optionally, revert UI state if action failed
      // setIsOnline(isOnline); // Revert if needed, or re-check status
      await checkDVMStatus(); // Re-check status to ensure UI reflects reality
    }
    setIsDvmLoading(false);
  };

  // ... (rest of the component, update the main button's disabled state)
  /*
    Update the main Button component's disabled prop:
    disabled={isDvmLoading || ((!isWalletConnected || !isOllamaConnected) && !isOnline)}
  */
  // Example for the button:
  // <Button
  //   onClick={handleGoOnline}
  //   className="w-full py-3 text-base"
  //   variant={isOnline ? "outline" : "default"}
  //   disabled={isDvmLoading || ((statusLoading.wallet || statusLoading.ollama || (!isWalletConnected || !isOllamaConnected)) && !isOnline)}
  // >
  //   {isDvmLoading ? (isOnline ? 'Stopping...' : 'Starting...') : (isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />)}
  //   {isDvmLoading ? (isOnline ? 'Stopping...' : 'Starting...') : (isOnline ? 'GO OFFLINE' : 'GO ONLINE')}
  // </Button>
  ```

  You'll need to replace the `Button` in `SellComputePane.tsx` with one that shows a loading state for `isDvmLoading`.

**Important Notes:**

- **Ollama Parameters:** The `Kind5050DVMServiceImpl.ts` attempts to pass NIP-90 parameters (like `max_tokens`, `temperature`) to `OllamaService.generateChatCompletion` via an `options` field. The current `OllamaService` interface and implementation might not directly support this. The agent should be aware that this might require adjustments either to `OllamaService` or to how parameters are passed in the DVM service (e.g., logging them via telemetry as a placeholder for now, as the code does).
- **Testing:** Thorough unit tests for `Kind5050DVMService` are crucial but are not part of these instructions. They should cover various job request scenarios, encryption/decryption, and error handling.
- **Security:** The default DVM private key is for development. Production use would require a secure key management strategy.

This set of instructions implements the core DVM service logic and integrates it with the UI. The DVM should now be able to listen for, process (using Ollama and Spark), and respond to NIP-90 text generation job requests.Okay, Agent, this is the next major phase for the "Sell Compute" feature. We will implement the core logic for the `Kind5050DVMService`. This service will be responsible for:

1.  Listening to NIP-90 job requests (kind 5000-5999, specifically 5100 for text generation in this phase).
2.  Parsing and validating these requests, including NIP-04 decryption.
3.  Sending "processing" feedback (Kind 7000) to the requester.
4.  Performing AI inference using `OllamaService`.
5.  Generating Lightning invoices using `SparkService`.
6.  Sending job results (Kind 6xxx, encrypted if the original request was) along with the payment request.
7.  Sending final "success" or "error" feedback (Kind 7000).

We'll also integrate this service with the "Go Online" / "Go Offline" button in the `SellComputePane.tsx` UI component.

**I. Refine `Kind5050DVMService` Configuration and Identity**

1.  **Update `src/services/dvm/Kind5050DVMService.ts`:**

    - Modify the `Kind5050DVMServiceConfig` interface to include `dvmPrivateKeyHex` (for the DVM's Nostr identity) and `dvmPublicKeyHex` (derived from the private key).
    - Update `defaultJobConfig` within `Kind5050DVMServiceConfig` to `defaultTextGenerationJobConfig`, making it specific for text generation tasks, referencing parameters from `docs/dvm-kind-5050.md`.
    - Adjust `DefaultKind5050DVMServiceConfigLayer` to provide a default development private key (generate one using `nostr-tools/pure`) and derive the public key.

    ```typescript
    // src/services/dvm/Kind5050DVMService.ts
    import { Context, Effect, Data, Schema, Layer } from "effect";
    import { TelemetryService } from "@/services/telemetry";
    import { TrackEventError } from "@/services/telemetry/TelemetryService";
    import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
    import { bytesToHex } from "@noble/hashes/utils";

    // DVM service errors
    export class DVMServiceError extends Data.TaggedError("DVMServiceError")<{
      readonly cause?: unknown;
      readonly message: string;
      readonly context?: Record<string, unknown>;
    }> {}
    export class DVMConfigError extends DVMServiceError {}
    export class DVMConnectionError extends DVMServiceError {}
    export class DVMJobRequestError extends DVMServiceError {}
    export class DVMJobProcessingError extends DVMServiceError {}
    export class DVMPaymentError extends DVMServiceError {}
    export class DVMInvocationError extends DVMServiceError {}
    export type DVMError =
      | DVMConfigError
      | DVMConnectionError
      | DVMJobRequestError
      | DVMJobProcessingError
      | DVMPaymentError
      | DVMInvocationError;

    // Default Text Generation Job Parameters based on docs/dvm-kind-5050.md
    export interface DefaultTextGenerationJobConfig {
      model: string;
      max_tokens: number;
      temperature: number;
      top_k: number;
      top_p: number;
      frequency_penalty: number;
      // Pricing related
      minPriceSats: number;
      pricePer1kTokens: number; // Price per 1000 tokens (input + output) in satoshis
    }

    export interface Kind5050DVMServiceConfig {
      active: boolean;
      dvmPrivateKeyHex: string;
      dvmPublicKeyHex: string;
      relays: string[];
      supportedJobKinds: number[]; // e.g., [5100] for text generation (Kind 5000-5999 for requests)
      defaultTextGenerationJobConfig: DefaultTextGenerationJobConfig;
    }

    export const Kind5050DVMServiceConfigTag =
      Context.GenericTag<Kind5050DVMServiceConfig>("Kind5050DVMServiceConfig");

    // Generate a default dev keypair
    const devDvmSkBytes = generateSecretKey();
    const devDvmSkHex = bytesToHex(devDvmSkBytes);
    const devDvmPkHex = getPublicKey(devDvmSkBytes);

    export const DefaultKind5050DVMServiceConfigLayer = Layer.succeed(
      Kind5050DVMServiceConfigTag,
      {
        active: false,
        dvmPrivateKeyHex: devDvmSkHex,
        dvmPublicKeyHex: devDvmPkHex,
        relays: [
          "wss://relay.damus.io",
          "wss://relay.nostr.band",
          "wss://nos.lol",
        ],
        supportedJobKinds: [5100], // Example: Text Generation as per docs/dvm-kind-5050.md (NIP-90 range 5000-5999)
        defaultTextGenerationJobConfig: {
          model: "gemma2:latest", // Ensure this model is available in your Ollama instance
          max_tokens: 512,
          temperature: 0.7,
          top_k: 40,
          top_p: 0.9,
          frequency_penalty: 0.5,
          minPriceSats: 10,
          pricePer1kTokens: 2,
        },
      },
    );

    export interface Kind5050DVMService {
      startListening(): Effect.Effect<void, DVMError | TrackEventError, never>;
      stopListening(): Effect.Effect<void, DVMError | TrackEventError, never>;
      isListening(): Effect.Effect<boolean, DVMError | TrackEventError, never>;
    }
    export const Kind5050DVMService =
      Context.GenericTag<Kind5050DVMService>("Kind5050DVMService");
    ```

**II. Implement Core DVM Logic in `src/services/dvm/Kind5050DVMServiceImpl.ts`**

- Inject dependencies: `NostrService`, `OllamaService`, `SparkService`, `NIP04Service`, `TelemetryService`, `Kind5050DVMServiceConfig`.
- Implement `startListening()`: Subscribe to Nostr events matching `config.supportedJobKinds`. The `onEvent` callback should fork `processJobRequestInternal`.
- Implement `stopListening()`: Unsubscribe from Nostr events.
- Implement `isListening()`: Return the internal active state.
- Implement `processJobRequestInternal(jobRequestEvent: NostrEvent)`:
  - Parse and validate the request. Handle NIP-04 decryption if the "encrypted" tag is present.
  - Send "processing" feedback (Kind 7000).
  - Perform inference using `OllamaService`. Map NIP-90 parameters (e.g., `max_tokens`) to `OllamaChatCompletionRequest` if possible (note potential `OllamaService` interface mismatch for an `options` field).
  - Generate a Lightning invoice using `SparkService`.
  - Encrypt the result using NIP-04 if the original request was encrypted.
  - Publish the job result (Kind 6xxx) with the invoice.
  - Publish final "success" or "error" feedback (Kind 7000).
  - Ensure robust error handling and telemetry throughout the process.
- Create helper functions for NIP-90 event creation (`createNip90FeedbackEvent`, `createNip90JobResultEvent`).

  ```typescript
  // File: src/services/dvm/Kind5050DVMServiceImpl.ts
  import { Effect, Layer, Schema, Option, Cause } from "effect";
  import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
  import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
  import { TelemetryService } from "@/services/telemetry";
  import {
    NostrService,
    type NostrEvent,
    type NostrFilter,
    type Subscription,
    NostrPublishError,
  } from "@/services/nostr";
  import {
    OllamaService,
    type OllamaChatCompletionRequest,
    OllamaError,
  } from "@/services/ollama";
  import {
    SparkService,
    type CreateLightningInvoiceParams,
    SparkError,
    LightningInvoice,
  } from "@/services/spark";
  import {
    NIP04Service,
    NIP04DecryptError,
    NIP04EncryptError,
  } from "@/services/nip04";
  import {
    NIP90Input,
    NIP90JobParam,
    NIP90InputType,
    NIP90InputSchema,
    NIP90JobParamSchema,
  } from "@/services/nip90";
  import {
    Kind5050DVMService,
    Kind5050DVMServiceConfig,
    Kind5050DVMServiceConfigTag,
    DVMConfigError,
    DVMConnectionError,
    DVMJobRequestError,
    DVMJobProcessingError,
    DVMPaymentError,
    DVMError,
  } from "./Kind5050DVMService";
  // import * as ParseResult from "@effect/schema/ParseResult"; // Not used in this version

  // Helper to create NIP-90 feedback events (Kind 7000)
  function createNip90FeedbackEvent(
    dvmPrivateKeyHex: string,
    requestEvent: NostrEvent,
    status: "payment-required" | "processing" | "error" | "success" | "partial",
    contentOrExtraInfo?: string,
    amountDetails?: { amountMillisats: number; invoice?: string },
  ): NostrEvent {
    const tags: string[][] = [
      ["e", requestEvent.id],
      ["p", requestEvent.pubkey],
    ];

    const statusTagPayload = [status];
    if (
      contentOrExtraInfo &&
      (status === "error" ||
        status === "processing" ||
        status === "payment-required")
    ) {
      statusTagPayload.push(contentOrExtraInfo.substring(0, 256));
    }
    tags.push(statusTagPayload);

    if (amountDetails) {
      const amountTag = ["amount", amountDetails.amountMillisats.toString()];
      if (amountDetails.invoice) amountTag.push(amountDetails.invoice);
      tags.push(amountTag);
    }

    const template: EventTemplate = {
      kind: 7000,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content:
        status === "partial" ||
        (status === "error" &&
          contentOrExtraInfo &&
          contentOrExtraInfo.length > 256)
          ? contentOrExtraInfo || ""
          : "",
    };
    return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
  }

  // Helper to create NIP-90 job result events (Kind 6xxx)
  function createNip90JobResultEvent(
    dvmPrivateKeyHex: string,
    requestEvent: NostrEvent,
    jobOutputContent: string,
    invoiceAmountMillisats: number,
    bolt11Invoice: string,
    outputIsEncrypted: boolean,
  ): NostrEvent {
    const tags: string[][] = [
      ["request", JSON.stringify(requestEvent)], // As per NIP-90
      ["e", requestEvent.id],
      ["p", requestEvent.pubkey],
      ["amount", invoiceAmountMillisats.toString(), bolt11Invoice],
    ];

    if (outputIsEncrypted) tags.push(["encrypted"]);
    requestEvent.tags.filter((t) => t[0] === "i").forEach((t) => tags.push(t)); // Include original 'i' tags

    const resultKind = requestEvent.kind + 1000;
    if (resultKind < 6000 || resultKind > 6999) {
      console.error(
        `Calculated result kind ${resultKind} is out of NIP-90 range for request kind ${requestEvent.kind}. Defaulting to 6000.`,
      );
    }

    const template: EventTemplate = {
      kind: Math.max(6000, Math.min(6999, resultKind)), // Clamp to valid NIP-90 result range
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: jobOutputContent,
    };
    return finalizeEvent(template, hexToBytes(dvmPrivateKeyHex)) as NostrEvent;
  }

  export const Kind5050DVMServiceLive = Layer.scoped(
    Kind5050DVMService,
    Effect.gen(function* (_) {
      const config = yield* _(Kind5050DVMServiceConfigTag);
      const telemetry = yield* _(TelemetryService);
      const nostr = yield* _(NostrService);
      const ollama = yield* _(OllamaService);
      const spark = yield* _(SparkService);
      const nip04 = yield* _(NIP04Service);

      let isActiveInternal = config.active || false;
      let currentSubscription: Subscription | null = null;

      yield* _(
        telemetry
          .trackEvent({
            category: "dvm:init",
            action: "kind5050_dvm_service_init",
            label: `Initial state: ${isActiveInternal ? "active" : "inactive"}`,
          })
          .pipe(Effect.ignoreLogged),
      );

      const publishFeedback = (feedbackEvent: NostrEvent) =>
        nostr.publishEvent(feedbackEvent).pipe(
          Effect.tapErrorTag("NostrPublishError", (err) =>
            telemetry.trackEvent({
              category: "dvm:error",
              action: "publish_feedback_failure",
              label: `Failed to publish feedback for ${feedbackEvent.tags.find((t) => t[0] === "e")?.[1]}`,
              value: err.message,
            }),
          ),
          Effect.ignoreLogged,
        );

      const processJobRequestInternal = (
        jobRequestEvent: NostrEvent,
      ): Effect.Effect<void, DVMError, never> =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:job",
                action: "job_request_received",
                label: jobRequestEvent.id,
                value: JSON.stringify(jobRequestEvent.kind),
              })
              .pipe(Effect.ignoreLogged),
          );

          let inputsSource = jobRequestEvent.tags;
          let isRequestEncrypted = false;

          if (jobRequestEvent.tags.some((t) => t[0] === "encrypted")) {
            isRequestEncrypted = true;
            const dvmSkBytes = hexToBytes(config.dvmPrivateKeyHex);
            const decryptedContentStr = yield* _(
              nip04
                .decrypt(
                  dvmSkBytes,
                  jobRequestEvent.pubkey,
                  jobRequestEvent.content,
                )
                .pipe(
                  Effect.mapError(
                    (e) =>
                      new DVMJobRequestError({
                        message: "Failed to decrypt NIP-90 request content",
                        cause: e,
                      }),
                  ),
                ),
            );
            try {
              inputsSource = JSON.parse(decryptedContentStr) as Array<
                [string, ...string[]]
              >;
            } catch (e) {
              return yield* _(
                Effect.fail(
                  new DVMJobRequestError({
                    message: "Failed to parse decrypted JSON tags",
                    cause: e,
                  }),
                ),
              );
            }
          }

          const inputs: NIP90Input[] = [];
          const paramsMap = new Map<string, string>();
          // let outputMimeType = "text/plain"; // Default from NIP-90, but output tag in request can override
          // let bidMillisats: number | undefined; // From 'bid' tag

          inputsSource.forEach((tag) => {
            if (tag[0] === "i" && tag.length >= 3) {
              inputs.push([
                tag[1],
                tag[2] as NIP90InputType,
                tag[3],
                tag[4],
              ] as NIP90Input);
            }
            if (tag[0] === "param" && tag.length >= 3)
              paramsMap.set(tag[1], tag[2]);
            // if (tag[0] === 'output' && tag.length >= 2) outputMimeType = tag[1] || outputMimeType; // Not used for now, DVM decides output type or uses job kind default
            // if (tag[0] === 'bid' && tag.length >= 2) bidMillisats = parseInt(tag[1], 10) || undefined; // Bid is for client, DVM sets price
          });

          if (inputs.length === 0) {
            const feedback = createNip90FeedbackEvent(
              config.dvmPrivateKeyHex,
              jobRequestEvent,
              "error",
              "No inputs provided.",
            );
            yield* _(publishFeedback(feedback));
            return yield* _(
              Effect.fail(
                new DVMJobRequestError({ message: "No inputs provided" }),
              ),
            );
          }

          const textInput = inputs.find((inp) => inp[1] === "text");
          if (!textInput || !textInput[0]) {
            const feedback = createNip90FeedbackEvent(
              config.dvmPrivateKeyHex,
              jobRequestEvent,
              "error",
              "No 'text' input found for text generation job.",
            );
            yield* _(publishFeedback(feedback));
            return yield* _(
              Effect.fail(
                new DVMJobRequestError({ message: "No text input found" }),
              ),
            );
          }
          const prompt = textInput[0];

          const processingFeedback = createNip90FeedbackEvent(
            config.dvmPrivateKeyHex,
            jobRequestEvent,
            "processing",
          );
          yield* _(publishFeedback(processingFeedback));

          const jobConfig = config.defaultTextGenerationJobConfig;
          const ollamaModel = paramsMap.get("model") || jobConfig.model;
          const ollamaRequest: OllamaChatCompletionRequest = {
            model: ollamaModel,
            messages: [{ role: "user", content: prompt }],
            stream: false,
            // OllamaService currently does not take an 'options' field.
            // Parameters like max_tokens, temperature would need to be passed
            // via request fields if OllamaService supports them, or be part of its config.
            // For now, we log the intent to use these params.
          };

          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:job",
                action: "ollama_params_for_job",
                label: `Job ID: ${jobRequestEvent.id}`,
                value: JSON.stringify({
                  requestParams: Object.fromEntries(paramsMap),
                  ollamaModelUsed: ollamaRequest.model,
                  defaultJobConfigParams: {
                    max_tokens: jobConfig.max_tokens,
                    temperature: jobConfig.temperature,
                    top_k: jobConfig.top_k,
                    top_p: jobConfig.top_p,
                    frequency_penalty: jobConfig.frequency_penalty,
                  },
                }),
              })
              .pipe(Effect.ignoreLogged),
          );

          const ollamaResult = yield* _(
            ollama
              .generateChatCompletion(ollamaRequest)
              .pipe(
                Effect.mapError(
                  (e) =>
                    new DVMJobProcessingError({
                      message: "Ollama inference failed",
                      cause: e,
                    }),
                ),
              ),
          );
          const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
          const usage = ollamaResult.usage || {
            prompt_tokens: Math.ceil(prompt.length / 4),
            completion_tokens: Math.ceil(ollamaOutput.length / 4),
            total_tokens: Math.ceil((prompt.length + ollamaOutput.length) / 4),
          };
          const totalTokens = usage.total_tokens;

          const priceSats = Math.max(
            jobConfig.minPriceSats,
            Math.ceil((totalTokens / 1000) * jobConfig.pricePer1kTokens),
          );
          const invoiceAmountMillisats = priceSats * 1000;

          const invoiceSDKResult = yield* _(
            spark
              .createLightningInvoice({
                amountSats: priceSats,
                memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0, 8)}`,
              })
              .pipe(
                Effect.mapError(
                  (e) =>
                    new DVMPaymentError({
                      message: "Spark invoice creation failed",
                      cause: e,
                    }),
                ),
              ),
          );
          const bolt11Invoice = invoiceSDKResult.invoice.encodedInvoice;

          let finalOutputContent = ollamaOutput;
          if (isRequestEncrypted) {
            const dvmSkBytes = hexToBytes(config.dvmPrivateKeyHex);
            finalOutputContent = yield* _(
              nip04
                .encrypt(dvmSkBytes, jobRequestEvent.pubkey, ollamaOutput)
                .pipe(
                  Effect.mapError(
                    (e) =>
                      new DVMJobProcessingError({
                        message: "Failed to encrypt NIP-90 job result",
                        cause: e,
                      }),
                  ),
                ),
            );
          }

          const jobResultEvent = createNip90JobResultEvent(
            config.dvmPrivateKeyHex,
            jobRequestEvent,
            finalOutputContent,
            invoiceAmountMillisats,
            bolt11Invoice,
            isRequestEncrypted,
          );
          yield* _(
            nostr
              .publishEvent(jobResultEvent)
              .pipe(
                Effect.mapError(
                  (e) =>
                    new DVMJobProcessingError({
                      message: "Failed to publish job result event",
                      cause: e,
                    }),
                ),
              ),
          );

          const successFeedback = createNip90FeedbackEvent(
            config.dvmPrivateKeyHex,
            jobRequestEvent,
            "success",
          );
          yield* _(publishFeedback(successFeedback));

          yield* _(
            telemetry
              .trackEvent({
                category: "dvm:job",
                action: "job_request_processed_success",
                label: jobRequestEvent.id,
              })
              .pipe(Effect.ignoreLogged),
          );
        }).pipe(
          Effect.catchAllCause((cause) => {
            const dvmError = Option.getOrElse(
              Cause.failureOption(cause),
              () =>
                new DVMJobProcessingError({
                  message: "Unknown error during DVM job processing",
                  cause,
                }),
            );
            const feedback = createNip90FeedbackEvent(
              config.dvmPrivateKeyHex,
              jobRequestEvent,
              "error",
              dvmError.message,
            );
            Effect.runFork(publishFeedback(feedback));
            return telemetry
              .trackEvent({
                category: "dvm:error",
                action: "job_request_processing_failure",
                label: jobRequestEvent.id,
                value: dvmError.message,
              })
              .pipe(
                Effect.ignoreLogged,
                Effect.andThen(Effect.fail(dvmError as DVMError)),
              );
          }),
        );

      return {
        startListening: () =>
          Effect.gen(function* (_) {
            if (isActiveInternal) {
              yield* _(
                telemetry
                  .trackEvent({
                    category: "dvm:status",
                    action: "start_listening_already_active",
                  })
                  .pipe(Effect.ignoreLogged),
              );
              return;
            }
            if (!config.dvmPrivateKeyHex) {
              return yield* _(
                Effect.fail(
                  new DVMConfigError({
                    message: "DVM private key not configured.",
                  }),
                ),
              );
            }

            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "start_listening_attempt",
                  label: `Relays: ${config.relays.join(", ")}`,
                })
                .pipe(Effect.ignoreLogged),
            );

            const jobRequestFilter: NostrFilter = {
              kinds: config.supportedJobKinds,
              since: Math.floor(Date.now() / 1000) - 300, // Start with recent jobs
            };

            const sub = yield* _(
              nostr
                .subscribeToEvents([jobRequestFilter], (event: NostrEvent) => {
                  if (
                    event.pubkey === config.dvmPublicKeyHex &&
                    (event.kind === 7000 ||
                      (event.kind >= 6000 && event.kind <= 6999))
                  )
                    return;
                  Effect.runFork(processJobRequestInternal(event));
                })
                .pipe(
                  Effect.mapError(
                    (e) =>
                      new DVMConnectionError({
                        message:
                          "Failed to subscribe to Nostr for DVM requests",
                        cause: e,
                      }),
                  ),
                ),
            );

            currentSubscription = sub;
            isActiveInternal = true;
            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "start_listening_success",
                })
                .pipe(Effect.ignoreLogged),
            );
          }),

        stopListening: () =>
          Effect.gen(function* (_) {
            if (!isActiveInternal) {
              yield* _(
                telemetry
                  .trackEvent({
                    category: "dvm:status",
                    action: "stop_listening_already_inactive",
                  })
                  .pipe(Effect.ignoreLogged),
              );
              return;
            }
            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "stop_listening_attempt",
                })
                .pipe(Effect.ignoreLogged),
            );

            if (currentSubscription) {
              try {
                currentSubscription.unsub();
                currentSubscription = null;
              } catch (e) {
                yield* _(
                  telemetry
                    .trackEvent({
                      category: "dvm:error",
                      action: "stop_listening_unsub_failure",
                      label: e instanceof Error ? e.message : String(e),
                    })
                    .pipe(Effect.ignoreLogged),
                );
              }
            }
            isActiveInternal = false;
            yield* _(
              telemetry
                .trackEvent({
                  category: "dvm:status",
                  action: "stop_listening_success",
                })
                .pipe(Effect.ignoreLogged),
            );
          }),

        isListening: () => Effect.succeed(isActiveInternal),
      };
    }),
  );
  ```

**III. Create `src/services/dvm/index.ts`** (if it doesn't exist)

    ```typescript
    // File: src/services/dvm/index.ts
    export * from './Kind5050DVMService';
    export * from './Kind5050DVMServiceImpl';
    ```

**IV. Update `src/services/runtime.ts`**

- Ensure `Kind5050DVMServiceLive` is added to `FullAppLayer` and its dependencies (including `NIP04Service` for the DVM layer) are correctly provided.

  ```typescript
  // File: src/services/runtime.ts
  // ... (existing imports)
  import {
    Kind5050DVMService,
    Kind5050DVMServiceLive,
    DefaultKind5050DVMServiceConfigLayer,
  } from "@/services/dvm";

  export type FullAppContext =
    // ... (existing services)
    Kind5050DVMService; // Add Kind5050DVMService

  // ... (individual service layers as before)

  // Add Kind5050DVMService Layer
  const kind5050DVMLayer = Kind5050DVMServiceLive.pipe(
    layerProvide(
      layerMergeAll(
        DefaultKind5050DVMServiceConfigLayer,
        nostrLayer,
        ollamaLayer,
        sparkLayer,
        nip04Layer, // NIP04Service is crucial for encrypted DVM requests/responses
        telemetryLayer,
      ),
    ),
  );

  const FullAppLayer = layerMergeAll(
    // ... (existing layers)
    nip90Layer, // NIP90Service for clients sending requests
    kind5050DVMLayer, // Kind5050DVMService for this DVM processing requests
  );

  // ... (rest of runtime.ts as before)
  ```

**V. Update `src/components/sell-compute/SellComputePane.tsx`**

- Connect the "GO ONLINE" button to `Kind5050DVMService.startListening()` and `stopListening()`.
- Update the `isOnline` state based on `Kind5050DVMService.isListening()`.
- Add loading state for DVM operations.

  ```typescript
  // File: src/components/sell-compute/SellComputePane.tsx
  import React, { useState, useEffect, useCallback } from 'react';
  import { Button } from '@/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
  import { HelpCircle, Zap, ZapOff, Wifi, WifiOff, RefreshCcw, Loader2 } from 'lucide-react'; // Added Loader2
  import { SparkService } from '@/services/spark';
  import { OllamaService } from '@/services/ollama';
  import { Kind5050DVMService } from '@/services/dvm'; // Import the DVM service
  import { getMainRuntime } from '@/services/runtime';
  import { Effect } from 'effect';
  import { runPromiseExit, Exit, Cause } from 'effect/Effect'; // Ensure Exit and Cause are imported
  import { cn } from '@/utils/tailwind';

  const SellComputePane: React.FC = () => {
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [isOllamaConnected, setIsOllamaConnected] = useState(false);
    const [isOnline, setIsOnline] = useState(false); // This will now reflect DVM service status
    const [statusLoading, setStatusLoading] = useState({ wallet: false, ollama: false });
    const [isDvmLoading, setIsDvmLoading] = useState(false); // For DVM start/stop operations

    const runtime = getMainRuntime();

    const checkWalletStatus = useCallback(async () => {
      setStatusLoading(s => ({ ...s, wallet: true }));
      const walletProgram = Effect.flatMap(SparkService, s => s.checkWalletStatus());
      runPromiseExit(Effect.provide(walletProgram, runtime)).then(exit => {
        if (Exit.isSuccess(exit)) setIsWalletConnected(exit.value);
        else {
          console.error("Wallet status check failed:", Cause.squash(exit.cause)); // Use Cause.squash
          setIsWalletConnected(false);
        }
        setStatusLoading(s => ({ ...s, wallet: false }));
      });
    }, [runtime]);

    const checkOllamaStatus = useCallback(async () => {
      setStatusLoading(s => ({ ...s, ollama: true }));
      const ollamaProgram = Effect.flatMap(OllamaService, s => s.checkOllamaStatus());
      runPromiseExit(Effect.provide(ollamaProgram, runtime)).then(exit => {
        if (Exit.isSuccess(exit)) setIsOllamaConnected(exit.value);
        else {
          console.error("Ollama status check failed:", Cause.squash(exit.cause)); // Use Cause.squash
          setIsOllamaConnected(false);
        }
        setStatusLoading(s => ({ ...s, ollama: false }));
      });
    }, [runtime]);

    const checkDVMStatus = useCallback(async () => {
      setIsDvmLoading(true); // Indicate loading while checking DVM status
      const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, s => s.isListening());
      runPromiseExit(Effect.provide(dvmStatusProgram, runtime)).then(exit => {
        if (Exit.isSuccess(exit)) {
          setIsOnline(exit.value);
        } else {
          console.error("Failed to check DVM status:", Cause.squash(exit.cause));
          setIsOnline(false); // Assume offline on error
        }
        setIsDvmLoading(false);
      });
    }, [runtime]);

    useEffect(() => {
      checkWalletStatus();
      checkOllamaStatus();
      checkDVMStatus();
    }, [checkWalletStatus, checkOllamaStatus, checkDVMStatus]);

    const handleGoOnlineToggle = async () => {
      if ((!isWalletConnected || !isOllamaConnected) && !isOnline) { // If trying to go online but not connected
        alert("Please ensure your wallet and Ollama are connected to go online.");
        return;
      }

      setIsDvmLoading(true);

      const dvmAction = isOnline
        ? Effect.flatMap(Kind5050DVMService, s => s.stopListening())
        : Effect.flatMap(Kind5050DVMService, s => s.startListening());

      const exit = await runPromiseExit(Effect.provide(dvmAction, runtime));

      if (Exit.isSuccess(exit)) {
        // Update UI based on the new DVM status
        await checkDVMStatus(); // Re-fetch status from service
        console.log(`DVM Service ${!isOnline ? 'start' : 'stop'} command successful. New status: ${isOnline ? 'Online' : 'Offline'}`);
      } else {
        console.error(`Failed to ${isOnline ? 'stop' : 'start'} DVM:`, Cause.squash(exit.cause));
        alert(`Failed to ${isOnline ? 'stop' : 'start'} the service. Check console for details.`);
        await checkDVMStatus(); // Re-check status to ensure UI reflects actual state
      }
      // DVM loading is set to false within checkDVMStatus
    };

    const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
    const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
    const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
    const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

    return (
      <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
        <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center text-lg">Sell Compute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
              <div className="flex items-center">
                {isWalletConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
                <div>
                  <p className="font-semibold">Wallet</p>
                  <p className={cn("text-xs", walletStatusColor)}>{walletStatusText}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" title="Check Wallet Status" onClick={checkWalletStatus} disabled={statusLoading.wallet}>
                  {statusLoading.wallet ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" title="Wallet Info"> <HelpCircle className="w-4 h-4" /> </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
              <div className="flex items-center">
               {isOllamaConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
                <div>
                  <p className="font-semibold">Ollama</p>
                  <p className={cn("text-xs", ollamaStatusColor)}>{ollamaStatusText}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" title="Check Ollama Status" onClick={checkOllamaStatus} disabled={statusLoading.ollama}>
                  {statusLoading.ollama ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" title="Ollama Info"> <HelpCircle className="w-4 h-4" /> </Button>
              </div>
            </div>

            <CardDescription className="text-center text-xs px-2 pt-2">
              Ensure your wallet and Ollama are connected before going online.
            </CardDescription>

            <Button
              onClick={handleGoOnlineToggle}
              className="w-full py-3 text-base"
              variant={isOnline ? "outline" : "default"}
              disabled={isDvmLoading || ((!isWalletConnected || !isOllamaConnected) && !isOnline)}
            >
              {isDvmLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />)}
              {isDvmLoading ? (isOnline ? 'Stopping...' : 'Starting...') : (isOnline ? 'GO OFFLINE' : 'GO ONLINE')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  export default SellComputePane;
  ```

**After applying these changes, the `Kind5050DVMService` will be implemented with its core logic, and the "Sell Compute" pane will use this service to go online/offline, reflecting the DVM's listening status.**

The potential type mismatch regarding `OllamaChatCompletionRequest` `options` field remains. If it causes issues, the agent will need to address it, likely by removing the `options` field from `ollamaRequest` in `Kind5050DVMServiceImpl.ts` for now, or by updating `OllamaService` if that's within scope.
