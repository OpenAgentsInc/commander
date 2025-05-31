Okay, I understand. You're seeing NIP-90 protocol-specific messages (like status updates, payment requests, or verbose DVM responses) in your chat interface, and you want to remove them or make them less intrusive.

The primary place where these NIP-90 events are translated into chat messages is within the `src/hooks/useNip90ConsumerChat.ts` hook, which powers the `Nip90ConsumerChatPane.tsx`.

Here are specific instructions to modify `src/hooks/useNip90ConsumerChat.ts` to reduce or remove these NIP-90 specific messages:

**Target File:** `src/hooks/useNip90ConsumerChat.ts`

**Objective:** Modify how NIP-90 events (Kind 7000 for feedback, Kind 6xxx for results) are displayed as chat messages.

**Instructions:**

1.  **Locate the `handleEvent` function:**
    This function is usually defined inside the `useEffect` hook that handles Nostr subscriptions. It processes incoming events from the DVM.

2.  **Modify Handling of Kind 7000 (Job Feedback) Events:**

    - **Current Behavior:** This part of the code likely calls `addMessage("system", ...)` for various DVM feedback statuses like "processing", "error", "partial", etc.
    - **To Remove Most Feedback Messages:**
      You can comment out or delete the `addMessage` calls for statuses you no longer wish to see directly in the chat. Payment-required prompts are interactive and should probably remain. Error messages might also be useful.

    _Find this section (around line 244 in your provided `useNip90ConsumerChat.ts`):_

    ```typescript
    // ... inside handleEvent ...
    if (event.kind === 7000) {
      const statusTag = event.tags.find((t) => t[0] === "status");
      const status = statusTag ? statusTag[1] : "update";
      const extraInfo = statusTag && statusTag.length > 2 ? statusTag[2] : "";

      // ... telemetry logging ...

      if (status === "payment-required") {
        // ... existing payment logic ...
        // This part should likely remain to handle payments.
      } else {
        // THIS IS WHERE NON-PAYMENT FEEDBACK MESSAGES ARE ADDED
        addMessage(
          "system",
          `Status from ${dvmAuthor}: ${status} ${extraInfo ? `- ${extraInfo}` : ""} ${content ? `- ${content}` : ""}`.trim(),
          "System",
        );
      }
      // ...
    }
    ```

    - **Change it to (Option A: Remove all non-payment, non-error feedback):**

      ```typescript
      // ... inside handleEvent ...
      if (event.kind === 7000) {
        const statusTag = event.tags.find((t) => t[0] === "status");
        const status = statusTag
          ? (statusTag[1] as NIP90JobFeedbackStatus)
          : "update"; // Type assertion for status
        const extraInfo = statusTag && statusTag.length > 2 ? statusTag[2] : "";

        // Log all feedback for telemetry/debugging (ensure telemetryForEvent is defined in this scope)
        const telemetryForEvent = Context.get(
          currentRuntimeForEvent.context,
          TelemetryService,
        );
        telemetryForEvent.trackEvent({
          category: "nip90_consumer_feedback", // More specific category
          action: "feedback_received_raw",
          label: `Job: ${event.tags.find((t) => t[0] === "e")?.[1] || "unknown"}, Status: ${status}`,
          value: `Content: ${content}, ExtraInfo: ${extraInfo}`,
        });

        if (status === "payment-required") {
          // ... keep existing payment logic ...
          const amountTag = event.tags.find((t) => t[0] === "amount");
          if (amountTag && amountTag[2]) {
            const amountMillisats = amountTag[1];
            const invoice = amountTag[2];
            const amountSats = Math.ceil(parseInt(amountMillisats) / 1000);

            setPaymentState({
              // Assuming setPaymentState is accessible
              required: true,
              invoice,
              amountSats,
              status: "pending",
              jobId:
                event.tags.find((t) => t[0] === "e")?.[1] || "unknown_job_id", // Get job ID from 'e' tag
            });

            // Optional: Auto-pay logic can remain or be adjusted
            // if (amountSats <= 10) {
            //   handlePayment(invoice, event.tags.find(t => t[0] === "e")?.[1] || 'unknown_job_id');
            // }
          } else {
            addMessage(
              "system",
              "Payment required but no invoice provided by DVM.",
              "System",
            );
          }
        } else if (status === "error") {
          // Optionally, still show error messages from DVM
          addMessage(
            "system",
            `Error from ${dvmAuthor}: ${extraInfo || content || "Unknown DVM error"}`,
            "System Error",
          );
        } else {
          // For other statuses like "processing", "partial", "success" (if sent as kind 7000):
          // Do not add a message to the UI. They are logged via telemetry above.
          // console.log(`[Nip90ConsumerChat] Suppressed Kind 7000 feedback: ${status}`);
        }

        // Unsubscribe logic for terminal statuses (error, success) remains important
        if (status === "error" || status === "success") {
          setIsLoading(false);
          setPaymentState({ required: false, status: "none" }); // Reset payment state
          // ... existing unsubscribe logic ...
        }
      }
      ```

3.  **Modify Handling of Kind 6xxx (Job Result) Events:**

    - **Current Behavior:** The DVM's result message might include payment details like `💰 Payment: X msats...`.
    - **To Clean Up Result Messages:** Remove the `paymentInfo` string concatenation. Payment status is handled by the dedicated `paymentState` UI.

    _Find this section (around line 270 in your `useNip90ConsumerChat.ts`):_

    ```typescript
    // ... inside handleEvent ...
    else if (event.kind >= 6000 && event.kind <= 6999) {
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
        `${content}${paymentInfo}`, // Content includes paymentInfo
        dvmAuthor,
        event.id,
      );
      // ...
    }
    ```

    - **Change it to:**
      ```typescript
      // ... inside handleEvent ...
      else if (event.kind >= 6000 && event.kind <= 6999) {
        // Job result
        // The `content` variable here already holds the (potentially decrypted) DVM response.
        addMessage(
          "assistant",
          content, // Only display the DVM's actual content
          dvmAuthor,
          event.id,
        );
        setIsLoading(false);
        setPaymentState({ required: false, status: 'none' }); // Reset payment state on successful result
        // ... existing unsubscribe logic ...
      }
      ```

4.  **Modify System Messages in `sendMessage`:**

    - **Current Behavior:** After sending a job request, a system message "Job request sent (ID: ...). Waiting for DVM..." is added.
    - **To Remove This Message:** Comment out or delete the `addMessage` call. The UI's loading indicator should be sufficient.

    _Find this section (around line 179 in your `useNip90ConsumerChat.ts`):_

    ```typescript
    // ... inside sendMessage, after publishing the event ...
    addMessage(
      "system",
      `Job request sent (ID: ${signedEvent.id.substring(0, 8)}...). Waiting for DVM...`,
      "System",
    );
    ```

    - **Change it to:**

      ```typescript
      // ... inside sendMessage ...
      // Optional: Log to console or telemetry instead of adding to UI
      // console.log(`[Nip90ConsumerChat] Job request sent (ID: ${signedEvent.id}). Waiting for DVM...`);
      // const telemetry = Context.get(currentRuntime.context, TelemetryService); // Ensure currentRuntime is defined
      // telemetry.trackEvent({
      //   category: "nip90_consumer",
      //   action: "job_request_sent_waiting",
      //   label: signedEvent.id,
      // });

      // REMOVE OR COMMENT OUT:
      // addMessage(
      //   "system",
      //   `Job request sent (ID: ${signedEvent.id.substring(0, 8)}...). Waiting for DVM...`,
      //   "System",
      // );
      ```

**After making these changes:**

- The chat interface for NIP-90 interactions should be cleaner.
- Most intermediate DVM feedback (like "processing") will not appear as chat messages.
- DVM error messages (if you chose Option A for Kind 7000) might still appear.
- The DVM's final result (Kind 6xxx) will appear as a simple assistant message without appended payment details.
- The initial "Job request sent..." system message will be removed.

Test the `Nip90ConsumerChatPane` thoroughly after these modifications to ensure the chat flow remains understandable and that critical information (like payment prompts or DVM errors if you chose to keep them) is still conveyed.Okay, I will modify the `src/hooks/useNip90ConsumerChat.ts` file to make the NIP-90 interaction less verbose in the chat UI.

Here's how the `src/hooks/useNip90ConsumerChat.ts` file will be updated:

```typescript
// src/hooks/useNip90ConsumerChat.ts
import { useState, useCallback, useEffect, useRef } from "react";
import {
  type ChatMessageProps,
  type MessageRole,
} from "@/components/chat/ChatMessage";
import { Effect, Exit, Cause, Layer, Runtime, Option, Context } from "effect";
import { NIP04Service, NIP04ServiceLive } from "@/services/nip04";
import { NostrEvent, NostrFilter, NostrService } from "@/services/nostr";
import { createNip90JobRequest } from "@/helpers/nip90/event_creation";
import { decryptNip04Content } from "@/helpers/nip90/event_decryption";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { NIP90_CONSUMER_RELAYS_ARRAY } from "@/services/relays";
import {
  TelemetryService,
  TelemetryServiceLive,
  DefaultTelemetryConfigLayer,
  TelemetryEvent,
  type NIP90JobFeedbackStatus, // Added this import
} from "@/services/telemetry"; // Assuming NIP90JobFeedbackStatus is exported from here or its original location
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
  status: "none" | "pending" | "paying" | "paid" | "failed";
  error?: string;
  jobId?: string;
}

interface UseNip90ConsumerChatParams {
  nostrPrivateKeyHex: string | null;
  nostrPublicKeyHex: string | null;
  targetDvmPubkeyHex?: string;
}

const DEFAULT_RELAYS = NIP90_CONSUMER_RELAYS_ARRAY;

export function useNip90ConsumerChat({
  nostrPrivateKeyHex,
  nostrPublicKeyHex,
  targetDvmPubkeyHex: initialTargetDvmInput,
}: UseNip90ConsumerChatParams) {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>({
    required: false,
    status: "none",
  });
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
      activeSubsRef.current.forEach((sub) => {
        if (sub && typeof sub.unsub === "function") {
          sub.unsub();
        }
      });
      activeSubsRef.current.clear();
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
  }, [initialTargetDvmInput]);

  const handlePayment = useCallback(
    async (invoice: string, jobId: string) => {
      const currentRuntime = getMainRuntime();
      const telemetryService = Context.get(
        currentRuntime.context,
        TelemetryService,
      );
      telemetryService.trackEvent({
        category: "nip90_consumer",
        action: "payment_attempt",
        label: jobId,
        value: `Invoice: ${invoice.substring(0, 30)}... Amount: ${paymentState.amountSats || "unknown"} sats`,
      });

      try {
        setPaymentState((prev) => ({ ...prev, status: "paying" }));

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
            maxFeeSats: 10,
            timeoutSeconds: 60,
          });

          yield* telemetry.trackEvent({
            category: "nip90_consumer",
            action: "payment_success",
            label: jobId,
            value: result.payment.paymentHash,
          });

          return result.payment;
        });

        const paymentExit = await Effect.runPromiseExit(
          payEffect.pipe(Effect.provide(currentRuntime)),
        );

        if (Exit.isSuccess(paymentExit)) {
          const paymentResult = paymentExit.value;
          setPaymentState((prev) => ({ ...prev, status: "paid" }));

          telemetryService.trackEvent({
            category: "nip90_consumer",
            action: "payment_complete",
            label: jobId,
            value: paymentResult.paymentHash,
          });
        } else {
          const error = Cause.squash(paymentExit.cause);
          console.error("Payment error in handlePayment:", error);

          setPaymentState((prev) => ({
            ...prev,
            status: "failed",
            error:
              error instanceof Error
                ? error.message
                : String(error) || "Payment failed",
          }));
          addMessage(
            "system",
            `Payment failed: ${error instanceof Error ? error.message : String(error) || "Unknown error"}`,
          );

          telemetryService.trackEvent({
            category: "nip90_consumer",
            action: "payment_error",
            label: jobId,
            value: error instanceof Error ? error.message : String(error),
          });
        }
      } catch (error: any) {
        console.error("Payment error:", error);

        setPaymentState((prev) => ({
          ...prev,
          status: "failed",
          error: error.message || "Payment failed",
        }));
        addMessage(
          "system",
          `Payment failed: ${error.message || "Unknown error"}`,
        );

        telemetryService.trackEvent({
          category: "nip90_consumer",
          action: "payment_exception",
          label: jobId,
          value: error?.message || "Unknown error",
        });
      }
    },
    [paymentState.amountSats, addMessage],
  );

  const sendMessage = useCallback(async () => {
    const currentRuntime = getMainRuntime();
    const telemetry = Context.get(currentRuntime.context, TelemetryService);

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
          decodeEffect.pipe(Effect.provide(currentRuntime)),
        );
        if (Exit.isSuccess(decodeExit) && decodeExit.value.type === "npub") {
          finalTargetDvmPkHexForEncryption = decodeExit.value.data;
          finalTargetDvmPkHexForPTag = decodeExit.value.data;
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
        finalTargetDvmPkHexForPTag = initialTargetDvmInput;
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

    try {
      const skBytes = hexToBytes(nostrPrivateKeyHex);
      const inputs: Array<[string, string, string?, string?, string?]> = [
        [prompt, "text"],
      ];
      const jobRequestEffect = createNip90JobRequest(
        skBytes,
        finalTargetDvmPkHexForEncryption,
        inputs,
        "text/plain",
        undefined,
        5050,
        finalTargetDvmPkHexForPTag,
      );
      const resolvedNip04Service = Context.get(
        currentRuntime.context,
        NIP04Service,
      );
      const jobRequestWithNip04 = Effect.provideService(
        jobRequestEffect,
        NIP04Service,
        resolvedNip04Service,
      );
      const signedEvent = await Effect.runPromise(
        jobRequestWithNip04.pipe(Effect.provide(currentRuntime)),
      );
      const nostrService = Context.get(currentRuntime.context, NostrService);
      const publishEffect = nostrService.publishEvent(signedEvent);
      await Effect.runPromise(
        publishEffect.pipe(Effect.provide(currentRuntime)),
      );

      telemetry.trackEvent({
        category: "nip90_consumer",
        action: "job_request_published",
        label: signedEvent.id,
      });

      // **MODIFICATION**: Removed the "Job request sent..." system message
      // addMessage("system", `Job request sent (ID: ${signedEvent.id.substring(0, 8)}...). Waiting for DVM...`, "System");

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

      const handleEvent = async (event: NostrEvent) => {
        const currentRuntimeForEvent = getMainRuntime();
        const telemetryForEvent = Context.get(
          currentRuntimeForEvent.context,
          TelemetryService,
        );
        telemetryForEvent.trackEvent({
          category: "nip90_consumer",
          action: "job_update_received",
          label: event.id,
          value: `Kind: ${event.kind}`,
        });

        let content = event.content;
        const isEncrypted = event.tags.some((t) => t[0] === "encrypted");

        if (isEncrypted && nostrPrivateKeyHex) {
          const resolvedNip04ForEvent = Context.get(
            currentRuntimeForEvent.context,
            NIP04Service,
          );
          const decryptEffect = decryptNip04Content(
            nostrPrivateKeyHex,
            event.pubkey,
            event.content,
          );
          const decryptExit = await Effect.runPromiseExit(
            Effect.provideService(
              decryptEffect,
              NIP04Service,
              resolvedNip04ForEvent,
            ),
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
          const status = statusTag
            ? (statusTag[1] as NIP90JobFeedbackStatus)
            : "update";
          const extraInfo =
            statusTag && statusTag.length > 2 ? statusTag[2] : "";

          // **MODIFICATION**: Only show payment-required or error feedback messages
          telemetryForEvent.trackEvent({
            category: "nip90_consumer_feedback",
            action: "feedback_received_raw",
            label: `Job: ${signedEvent.id}, Status: ${status}`,
            value: `Content: ${content}, ExtraInfo: ${extraInfo}`,
          });

          if (status === "payment-required") {
            const amountTag = event.tags.find((t) => t[0] === "amount");
            if (amountTag && amountTag[2]) {
              const amountMillisats = amountTag[1];
              const invoice = amountTag[2];
              const amountSats = Math.ceil(parseInt(amountMillisats) / 1000);
              setPaymentState({
                required: true,
                invoice,
                amountSats,
                status: "pending",
                jobId: signedEvent.id,
              });
              telemetryForEvent.trackEvent({
                category: "nip90_consumer",
                action: "payment_required",
                label: signedEvent.id,
                value: amountSats.toString(),
              });
              if (amountSats <= 10) {
                telemetryForEvent.trackEvent({
                  category: "nip90_consumer",
                  action: "auto_payment_triggered",
                  label: signedEvent.id,
                  value: `${amountSats} sats`,
                });
                handlePayment(invoice, signedEvent.id);
              }
            } else {
              addMessage(
                "system",
                "Payment required but no invoice provided by DVM.",
                "System",
              );
            }
          } else if (status === "error") {
            addMessage(
              "system",
              `Error from ${dvmAuthor}: ${extraInfo || content || "Unknown DVM error"}`,
              "System Error",
            );
          }
          // Other statuses like "processing", "partial", "success" (if sent as kind 7000) are logged by telemetry but not added to UI.

          if (status === "error" || status === "success") {
            setIsLoading(false);
            setPaymentState({ required: false, status: "none" });
            if (activeSubsRef.current.has(signedEvent.id + "_result")) {
              activeSubsRef.current.get(signedEvent.id + "_result")?.unsub();
              activeSubsRef.current.delete(signedEvent.id + "_result");
            }
            if (activeSubsRef.current.has(signedEvent.id + "_feedback")) {
              activeSubsRef.current.get(signedEvent.id + "_feedback")?.unsub();
              activeSubsRef.current.delete(signedEvent.id + "_feedback");
            }
          }
        } else if (event.kind >= 6000 && event.kind <= 6999) {
          // **MODIFICATION**: Removed paymentInfo from the assistant message
          addMessage("assistant", content, dvmAuthor, event.id);
          setIsLoading(false);
          setPaymentState({ required: false, status: "none" });
          if (activeSubsRef.current.has(signedEvent.id + "_result")) {
            activeSubsRef.current.get(signedEvent.id + "_result")?.unsub();
            activeSubsRef.current.delete(signedEvent.id + "_result");
          }
          if (activeSubsRef.current.has(signedEvent.id + "_feedback")) {
            activeSubsRef.current.get(signedEvent.id + "_feedback")?.unsub();
            activeSubsRef.current.delete(signedEvent.id + "_feedback");
          }
        }
      };

      const handleEose = (subscriptionType: string) => {
        const currentRuntimeForEose = getMainRuntime();
        const telemetryForEose = Context.get(
          currentRuntimeForEose.context,
          TelemetryService,
        );
        telemetryForEose.trackEvent({
          category: "nip90_consumer",
          action: "subscription_eose",
          label: `EOSE for job ${signedEvent.id} (${subscriptionType})`,
        });
      };

      telemetry.trackEvent({
        category: "nip90_consumer",
        action: "subscription_filters_debug",
        label: `Job ${signedEvent.id}`,
        value: `Result filter kinds: [${filters[0].kinds}] | Feedback filter kinds: [${filters[1].kinds}]`,
      });
      telemetry.trackEvent({
        category: "nip90_consumer",
        action: "kind_7000_subscription_confirmed",
        label: signedEvent.id,
        value: `Subscribing to Kind 7000 feedback events for job`,
      });

      const subscribeEffect = Effect.gen(function* () {
        const telemetryInEffect = yield* TelemetryService;
        yield* telemetryInEffect.trackEvent({
          category: "nip90_consumer",
          action: "creating_result_subscription",
          label: signedEvent.id,
          value: `Filter: ${JSON.stringify(filters[0])}`,
        });
        const resultSub = yield* nostrService.subscribeToEvents(
          [filters[0]],
          handleEvent,
          DEFAULT_RELAYS,
          () => handleEose("result"),
        );
        yield* telemetryInEffect.trackEvent({
          category: "nip90_consumer",
          action: "creating_feedback_subscription",
          label: signedEvent.id,
          value: `Filter: ${JSON.stringify(filters[1])}`,
        });
        const feedbackSub = yield* nostrService.subscribeToEvents(
          [filters[1]],
          handleEvent,
          DEFAULT_RELAYS,
          () => handleEose("feedback"),
        );
        yield* telemetryInEffect.trackEvent({
          category: "nip90_consumer",
          action: "both_subscriptions_created",
          label: signedEvent.id,
          value: `Result sub created + Kind 7000 feedback sub created`,
        });
        return { resultSub, feedbackSub };
      });

      const subscriptions = await Effect.runPromise(
        subscribeEffect.pipe(Effect.provide(currentRuntime)),
      );
      activeSubsRef.current.set(
        signedEvent.id + "_result",
        subscriptions.resultSub,
      );
      activeSubsRef.current.set(
        signedEvent.id + "_feedback",
        subscriptions.feedbackSub,
      );
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
  }, [
    userInput,
    nostrPrivateKeyHex,
    nostrPublicKeyHex,
    initialTargetDvmInput,
    addMessage,
    handlePayment,
  ]); // Added handlePayment

  return {
    messages,
    isLoading,
    userInput,
    setUserInput,
    sendMessage,
    paymentState,
    handlePayment,
  };
}
```
