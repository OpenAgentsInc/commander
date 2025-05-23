import { useState, useCallback, useEffect, useRef } from "react";
import {
  type ChatMessageProps,
  type MessageRole,
} from "@/components/chat/ChatMessage";
import { Effect, Exit, Cause, Layer, Runtime, Option, Context } from "effect";
import { NIP04Service, NIP04ServiceLive } from "@/services/nip04";
import { NostrEvent, NostrFilter } from "@/services/nostr";
import { createNip90JobRequest } from "@/helpers/nip90/event_creation";
import { decryptNip04Content } from "@/helpers/nip90/event_decryption";
import { SimplePool } from "nostr-tools";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import {
  TelemetryService,
  TelemetryServiceLive,
  DefaultTelemetryConfigLayer,
  TelemetryEvent,
} from "@/services/telemetry";
import {
  NIP19Service,
  NIP19ServiceLive,
  NIP19DecodeError,
} from "@/services/nip19";
import { SparkService } from "@/services/spark";
import { getMainRuntime } from "@/services/runtime";

interface PaymentState {
  required: boolean;
  invoice?: string;
  amountSats?: number;
  status: 'none' | 'pending' | 'paying' | 'paid' | 'failed';
  error?: string;
  jobId?: string;
}

interface UseNip90ConsumerChatParams {
  nostrPrivateKeyHex: string | null;
  nostrPublicKeyHex: string | null;
  targetDvmPubkeyHex?: string; // This prop will now be treated as explicitly hex OR npub
}

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
];

export function useNip90ConsumerChat({
  nostrPrivateKeyHex,
  nostrPublicKeyHex,
  targetDvmPubkeyHex: initialTargetDvmInput, // Renamed to avoid confusion
}: UseNip90ConsumerChatParams) {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>({
    required: false,
    status: 'none'
  });
  const poolRef = useRef<SimplePool | null>(null);
  const activeSubsRef = useRef<Map<string, any>>(new Map());

  const addMessage = useCallback(
    (
      role: MessageRole,
      content: string,
      author?: string,
      id?: string,
      isStreaming = false,
    ) => {
      setMessages((prev) => {
        if (
          role === "system" &&
          prev.length > 0 &&
          prev[prev.length - 1].role === "system" &&
          prev[prev.length - 1].content.startsWith(content.substring(0, 20))
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            id: id || `msg-${Date.now()}-${Math.random()}`,
            role,
            content,
            author: author || (role === "user" ? "You" : "Agent"),
            timestamp: Date.now(),
            isStreaming,
          },
        ];
      });
    },
    [],
  );

  useEffect(() => {
    const currentRuntime = getMainRuntime();
    poolRef.current = new SimplePool();
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: "nip90_consumer",
          action: "hook_init",
          label: `Target DVM: ${initialTargetDvmInput || "any"}`,
        }),
      ).pipe(Effect.provide(currentRuntime)),
    );
    return () => {
      activeSubsRef.current.forEach((sub) => sub.unsub());
      activeSubsRef.current.clear();
      if (poolRef.current) {
        // poolRef.current.close(DEFAULT_RELAYS); // Consider if closing all relays is always desired
        poolRef.current = null;
      }
      const cleanupRuntime = getMainRuntime();
      Effect.runFork(
        Effect.flatMap(TelemetryService, (ts) =>
          ts.trackEvent({
            category: "nip90_consumer",
            action: "hook_cleanup",
          }),
        ).pipe(Effect.provide(cleanupRuntime)),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTargetDvmInput]);

  const handlePayment = useCallback(async (invoice: string, jobId: string) => {
    const currentRuntime = getMainRuntime(); // Get the LATEST runtime instance
    
    // CRITICAL: Track payment attempt immediately (defensive telemetry)
    const telemetryService = Context.get(currentRuntime.context, TelemetryService);
    telemetryService.trackEvent({
      category: "nip90_consumer",
      action: "payment_attempt",
      label: jobId,
      value: `Invoice: ${invoice.substring(0, 30)}... Amount: ${paymentState.amountSats || 'unknown'} sats`,
    });
    
    try {
      setPaymentState(prev => ({ ...prev, status: 'paying' }));
      
      const payEffect = Effect.gen(function* () {
        const spark = yield* SparkService;
        const telemetry = yield* TelemetryService;
        
        yield* telemetry.trackEvent({
          category: "nip90_consumer",
          action: "payment_start",
          label: jobId,
          value: paymentState.amountSats?.toString(),
        });
        
        const result = yield* spark.payLightningInvoice({
          invoice,
          maxFeeSats: 10, // Allow up to 10 sats in fees
          timeoutSeconds: 60 // 1 minute timeout
        });
        
        yield* telemetry.trackEvent({
          category: "nip90_consumer",
          action: "payment_success",
          label: jobId,
          value: result.payment.paymentHash,
        });
        
        return result.payment;
      });
      
      // Provide the currentRuntime for this specific Effect execution
      const paymentExit = await Effect.runPromiseExit(
        payEffect.pipe(Effect.provide(currentRuntime))
      );
      
      if (Exit.isSuccess(paymentExit)) {
        const paymentResult = paymentExit.value;
        setPaymentState(prev => ({ ...prev, status: 'paid' }));
        addMessage("system", `Payment successful! Hash: ${paymentResult.paymentHash.substring(0, 12)}...`);
        
        // Track success outside Effect too
        telemetryService.trackEvent({
          category: "nip90_consumer",
          action: "payment_complete",
          label: jobId,
          value: paymentResult.paymentHash,
        });
      } else {
        const error = Cause.squash(paymentExit.cause);
        console.error("Payment error in handlePayment:", error);
        
        setPaymentState(prev => ({ 
          ...prev, 
          status: 'failed',
          error: error instanceof Error ? error.message : String(error) || "Payment failed"
        }));
        addMessage("system", `Payment failed: ${error instanceof Error ? error.message : String(error) || "Unknown error"}`);
        
        // Track failure outside Effect
        telemetryService.trackEvent({
          category: "nip90_consumer",
          action: "payment_error",
          label: jobId,
          value: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      
      setPaymentState(prev => ({ 
        ...prev, 
        status: 'failed',
        error: error.message || "Payment failed"
      }));
      addMessage("system", `Payment failed: ${error.message || "Unknown error"}`);
      
      // Track outer error
      telemetryService.trackEvent({
        category: "nip90_consumer",
        action: "payment_exception",
        label: jobId,
        value: error?.message || "Unknown error",
      });
    }
  }, [paymentState.amountSats, addMessage]);

  const sendMessage = useCallback(async () => {
    const currentRuntime = getMainRuntime(); // Get the LATEST runtime instance
    const telemetry = Context.get(currentRuntime.context, TelemetryService); // Get telemetry from runtime context

    // CRITICAL: Track that sendMessage was called
    telemetry.trackEvent({
      category: "nip90_consumer",
      action: "send_message_called",
      label: userInput.trim().substring(0, 30),
      value: `Input length: ${userInput.trim().length}`,
    });

    if (!userInput.trim()) {
      addMessage("system", "Error: Input is empty.");
      telemetry.trackEvent({
        category: "nip90_consumer",
        action: "send_message_empty_input",
        label: "empty_input_error",
      });
      return;
    }

    if (!nostrPrivateKeyHex || nostrPrivateKeyHex.length !== 64) {
      addMessage(
        "system",
        "Error: Consumer private key is not ready or invalid. Cannot send NIP-90 request.",
      );
      telemetry.trackEvent({
        category: "nip90_consumer",
        action: "send_job_error",
        label: "invalid_consumer_sk",
      });
      return;
    }
    if (!nostrPublicKeyHex || nostrPublicKeyHex.length !== 64) {
      addMessage(
        "system",
        "Error: Consumer public key is not ready or invalid.",
      );
      telemetry.trackEvent({
        category: "nip90_consumer",
        action: "send_job_error",
        label: "invalid_consumer_pk",
      });
      return;
    }
    if (!poolRef.current) {
      addMessage("system", "Error: Nostr connection pool not initialized.");
      telemetry.trackEvent({
        category: "nip90_consumer",
        action: "send_job_error",
        label: "nostr_pool_not_ready",
      });
      return;
    }

    const prompt = userInput.trim();
    addMessage("user", prompt);
    setUserInput("");
    setIsLoading(true);

    telemetry.trackEvent({
      category: "nip90_consumer",
      action: "send_job_request_start",
      label: prompt.substring(0, 30),
    });

    let finalTargetDvmPkHexForEncryption: string | undefined = undefined;
    let finalTargetDvmPkHexForPTag: string | undefined = undefined;

    if (initialTargetDvmInput && initialTargetDvmInput.trim()) {
      if (initialTargetDvmInput.startsWith("npub1")) {
        const decodeEffect = Effect.flatMap(NIP19Service, (nip19) =>
          nip19.decode(initialTargetDvmInput),
        );
        const decodeExit = await Effect.runPromiseExit(
          decodeEffect.pipe(Effect.provide(currentRuntime))
        );

        if (Exit.isSuccess(decodeExit) && decodeExit.value.type === "npub") {
          finalTargetDvmPkHexForEncryption = decodeExit.value.data;
          finalTargetDvmPkHexForPTag = decodeExit.value.data; // Use decoded hex for p-tag
        } else {
          const errorReason = Exit.isFailure(decodeExit)
            ? Cause.squash(decodeExit.cause)
            : "Not an npub";
          addMessage(
            "system",
            `Error: Invalid target DVM npub: ${initialTargetDvmInput}. Reason: ${errorReason instanceof Error ? errorReason.message : errorReason}`,
          );
          telemetry.trackEvent({
            category: "nip90_consumer",
            action: "send_job_error",
            label: "invalid_target_dvm_npub",
            value: initialTargetDvmInput,
          });
          setIsLoading(false);
          return;
        }
      } else if (
        initialTargetDvmInput.length === 64 &&
        /^[0-9a-fA-F]{64}$/.test(initialTargetDvmInput)
      ) {
        finalTargetDvmPkHexForEncryption = initialTargetDvmInput;
        finalTargetDvmPkHexForPTag = initialTargetDvmInput; // Use hex for p-tag
      } else {
        addMessage(
          "system",
          `Error: Invalid target DVM public key format: ${initialTargetDvmInput}. Must be npub or 64-char hex.`,
        );
        telemetry.trackEvent({
          category: "nip90_consumer",
          action: "send_job_error",
          label: "invalid_target_dvm_hex",
          value: initialTargetDvmInput,
        });
        setIsLoading(false);
        return;
      }
    }
    // If initialTargetDvmInput is empty, finalTargetDvmPkHexForEncryption and finalTargetDvmPkHexForPTag remain undefined.
    // createNip90JobRequest will handle this by sending an unencrypted request.

    try {
      const skBytes = hexToBytes(nostrPrivateKeyHex);
      // Input structure for NIP-90: Array<[value, type, relay_hint?, marker?]>
      // Ensure the inner array matches this structure. 'text' is the type.
      const inputs: Array<[string, string, string?, string?, string?]> = [
        [prompt, "text"],
      ];

      const jobRequestEffect = createNip90JobRequest(
        skBytes,
        // Pass the DVM PK intended for encryption (can be undefined for unencrypted/broadcast)
        finalTargetDvmPkHexForEncryption,
        inputs,
        "text/plain",
        undefined, // No bid for now
        5050, // Kind 5050 for general text inference
        // Pass the DVM PK for the p-tag (can be undefined if truly broadcasting to ANY dvm, though often same as encryption target)
        finalTargetDvmPkHexForPTag,
      );

      // Resolve NIP04Service from the currentRuntime
      const resolvedNip04Service = Context.get(currentRuntime.context, NIP04Service);
      const jobRequestWithNip04 = Effect.provideService(
        jobRequestEffect,
        NIP04Service, // The Tag
        resolvedNip04Service // The live service from the current runtime
      );

      // Use currentRuntime for running the Effect
      const signedEvent = await Effect.runPromise(
        jobRequestWithNip04.pipe(Effect.provide(currentRuntime))
      );

      const publishPromises = poolRef.current.publish(
        DEFAULT_RELAYS,
        signedEvent,
      );
      await Promise.any(publishPromises);

      telemetry.trackEvent({
        category: "nip90_consumer",
        action: "job_request_published",
        label: signedEvent.id,
      });
      addMessage(
        "system",
        `Job request sent (ID: ${signedEvent.id.substring(0, 8)}...). Waiting for DVM...`,
        "System",
      );

      const resultKind = signedEvent.kind + 1000;
      const filters: NostrFilter[] = [
        {
          kinds: [resultKind],
          "#e": [signedEvent.id],
          authors: finalTargetDvmPkHexForPTag
            ? [finalTargetDvmPkHexForPTag]
            : undefined,
          since: signedEvent.created_at - 5,
          limit: 5,
        },
        {
          kinds: [7000],
          "#e": [signedEvent.id],
          authors: finalTargetDvmPkHexForPTag
            ? [finalTargetDvmPkHexForPTag]
            : undefined,
          since: signedEvent.created_at - 5,
          limit: 10,
        },
      ];

      // Use subscribeMany which is available in the current nostr-tools version
      const sub = (poolRef.current as any).subscribeMany(
        DEFAULT_RELAYS,
        filters,
      );
      activeSubsRef.current.set(signedEvent.id, sub);

      sub.on("event", async (event: NostrEvent) => {
        const currentRuntimeForEvent = getMainRuntime(); // Get fresh runtime for THIS event
        const telemetryForEvent = Context.get(currentRuntimeForEvent.context, TelemetryService);
        
        telemetryForEvent.trackEvent({
          category: "nip90_consumer",
          action: "job_update_received",
          label: event.id,
          value: `Kind: ${event.kind}`,
        });

        let content = event.content;
        const isEncrypted = event.tags.some((t) => t[0] === "encrypted");

        if (isEncrypted && nostrPrivateKeyHex) {
          const resolvedNip04ForEvent = Context.get(currentRuntimeForEvent.context, NIP04Service);
          const decryptEffect = decryptNip04Content(
            nostrPrivateKeyHex,
            event.pubkey,
            event.content,
          );
          const decryptExit = await Effect.runPromiseExit(
            Effect.provideService(decryptEffect, NIP04Service, resolvedNip04ForEvent)
          );
          if (Exit.isSuccess(decryptExit)) {
            content = decryptExit.value;
          } else {
            content = "[Error decrypting DVM response]";
            const error = Cause.squash(decryptExit.cause);
            console.error("NIP-04 Decryption error in subscription:", error);
            telemetryForEvent.trackEvent({
              category: "nip90_consumer",
              action: "nip04_decrypt_error",
              label: event.id,
              value: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        const dvmAuthor = `DVM (${event.pubkey.substring(0, 6)}...)`;
        if (event.kind === 7000) {
          const statusTag = event.tags.find((t) => t[0] === "status");
          const status = statusTag ? statusTag[1] : "update";
          const extraInfo =
            statusTag && statusTag.length > 2 ? statusTag[2] : "";
          
          // Handle payment-required status
          if (status === "payment-required") {
            const amountTag = event.tags.find((t) => t[0] === "amount");
            if (amountTag && amountTag[1]) {
              const invoice = amountTag[1];
              // Extract sats amount from bolt11 invoice if possible
              // For now, we know it's 3 sats from our implementation
              const amountSats = 3;
              
              setPaymentState({
                required: true,
                invoice,
                amountSats,
                status: 'pending',
                jobId: signedEvent.id
              });
              
              addMessage(
                "system",
                `Payment required: ${amountSats} sats. Auto-paying invoice...`,
                "System",
              );
              
              telemetryForEvent.trackEvent({
                category: "nip90_consumer",
                action: "payment_required",
                label: signedEvent.id,
                value: amountSats.toString(),
              });

              // AUTO-PAY: Automatically pay small amounts (under 10 sats)
              if (amountSats <= 10) {
                addMessage(
                  "system",
                  `Auto-paying ${amountSats} sats (auto-approval enabled for small amounts)...`,
                  "System",
                );
                
                telemetryForEvent.trackEvent({
                  category: "nip90_consumer",
                  action: "auto_payment_triggered",
                  label: signedEvent.id,
                  value: `${amountSats} sats`,
                });

                // Trigger payment immediately
                handlePayment(invoice, signedEvent.id);
              }
            } else {
              addMessage(
                "system",
                "Payment required but no invoice provided by DVM",
                "System",
              );
            }
          } else {
            addMessage(
              "system",
              `Status from ${dvmAuthor}: ${status} ${extraInfo ? `- ${extraInfo}` : ""} ${content ? `- ${content}` : ""}`.trim(),
              "System",
            );
          }
          
          if (status === "error" || status === "success") {
            setIsLoading(false);
            setPaymentState({ required: false, status: 'none' });
            if (activeSubsRef.current.has(signedEvent.id)) {
              activeSubsRef.current.get(signedEvent.id)?.unsub();
              activeSubsRef.current.delete(signedEvent.id);
            }
          }
        } else if (event.kind >= 6000 && event.kind <= 6999) {
          // Job result
          const amountTag = event.tags.find((t) => t[0] === "amount");
          let paymentInfo = "";
          if (amountTag) {
            const msats = amountTag[1];
            const invoice = amountTag[2];
            paymentInfo = `\n💰 Payment: ${msats} msats. ${invoice ? `Invoice: ${invoice.substring(0, 15)}...` : ""}`;
          }
          addMessage(
            "assistant",
            `${content}${paymentInfo}`,
            dvmAuthor,
            event.id,
          );
          setIsLoading(false);
          if (activeSubsRef.current.has(signedEvent.id)) {
            activeSubsRef.current.get(signedEvent.id)?.unsub();
            activeSubsRef.current.delete(signedEvent.id);
          }
        }
      });

      sub.on("eose", () => {
        const currentRuntimeForEose = getMainRuntime();
        const telemetryForEose = Context.get(currentRuntimeForEose.context, TelemetryService);
        telemetryForEose.trackEvent({
          category: "nip90_consumer",
          action: "subscription_eose",
          label: `EOSE for job ${signedEvent.id}`,
        });
      });
    } catch (error: any) {
      addMessage(
        "system",
        `Error: ${error.message || "Failed to send NIP-90 request"}`,
      );
      console.error("NIP-90 Request Error:", error);
      setIsLoading(false);
      telemetry.trackEvent({
        category: "nip90_consumer",
        action: "job_request_failed",
        value: error.message,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userInput,
    nostrPrivateKeyHex,
    nostrPublicKeyHex,
    initialTargetDvmInput,
    addMessage,
  ]); // Ensure initialTargetDvmInput is in deps

  return { messages, isLoading, userInput, setUserInput, sendMessage, paymentState, handlePayment };
}
