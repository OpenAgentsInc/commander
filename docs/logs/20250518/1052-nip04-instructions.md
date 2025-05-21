Okay, let's implement the `NIP04Service` and integrate it.

Here are the specific coding instructions:

**Phase 1: Define NIP04Service Interface and Types**

1.  **Create `src/services/nip04/NIP04Service.ts`:**

    ```typescript
    // src/services/nip04/NIP04Service.ts
    import { Effect, Context, Data } from "effect";

    // --- Custom Error Types ---
    export class NIP04EncryptError extends Data.TaggedError(
      "NIP04EncryptError",
    )<{
      readonly cause?: unknown;
      readonly message: string;
    }> {}

    export class NIP04DecryptError extends Data.TaggedError(
      "NIP04DecryptError",
    )<{
      readonly cause?: unknown;
      readonly message: string;
    }> {}

    // --- Service Interface ---
    export interface NIP04Service {
      /**
       * Encrypts plaintext using NIP-04.
       * @param ourSk - Our secret key (Uint8Array).
       * @param theirPkHex - Their public key (hex string).
       * @param plaintext - The text to encrypt.
       * @returns Effect with the NIP-04 encrypted string (ciphertext?iv=iv_base64).
       */
      encrypt(
        ourSk: Uint8Array,
        theirPkHex: string,
        plaintext: string,
      ): Effect.Effect<string, NIP04EncryptError>;

      /**
       * Decrypts NIP-04 ciphertext.
       * @param ourSk - Our secret key (Uint8Array).
       * @param theirPkHex - Their public key (hex string).
       * @param ciphertextWithIv - The NIP-04 encrypted string (ciphertext?iv=iv_base64).
       * @returns Effect with the decrypted plaintext string.
       */
      decrypt(
        ourSk: Uint8Array,
        theirPkHex: string,
        ciphertextWithIv: string,
      ): Effect.Effect<string, NIP04DecryptError>;
    }

    // --- Service Tag ---
    export const NIP04Service =
      Context.GenericTag<NIP04Service>("NIP04Service");
    ```

    - **Action:** Create this file.

**Phase 2: Implement NIP04Service**

1.  **Create `src/services/nip04/NIP04ServiceImpl.ts`:**

    ```typescript
    // src/services/nip04/NIP04ServiceImpl.ts
    import { Effect, Layer } from "effect";
    import { nip04 } from "nostr-tools";
    import {
      NIP04Service,
      NIP04EncryptError,
      NIP04DecryptError,
    } from "./NIP04Service";

    export function createNIP04Service(): NIP04Service {
      return {
        encrypt: (ourSk: Uint8Array, theirPkHex: string, plaintext: string) =>
          Effect.tryPromise({
            try: () => nip04.encrypt(ourSk, theirPkHex, plaintext),
            catch: (cause) =>
              new NIP04EncryptError({
                message: "NIP-04 encryption failed",
                cause,
              }),
          }),

        decrypt: (
          ourSk: Uint8Array,
          theirPkHex: string,
          ciphertextWithIv: string,
        ) =>
          Effect.tryPromise({
            try: () => nip04.decrypt(ourSk, theirPkHex, ciphertextWithIv),
            catch: (cause) =>
              new NIP04DecryptError({
                message: "NIP-04 decryption failed",
                cause,
              }),
          }),
      };
    }

    export const NIP04ServiceLive = Layer.succeed(
      NIP04Service,
      createNIP04Service(),
    );
    ```

    - **Action:** Create this file.

2.  **Create `src/services/nip04/index.ts`:**
    ```typescript
    // src/services/nip04/index.ts
    export * from "./NIP04Service";
    export * from "./NIP04ServiceImpl";
    ```
    - **Action:** Create this file.

**Phase 3: Unit Test NIP04Service**

1.  **Create `src/tests/unit/services/nip04/NIP04Service.test.ts`:**

    ```typescript
    // src/tests/unit/services/nip04/NIP04Service.test.ts
    import { describe, it, expect, vi, beforeEach } from "vitest";
    import { Effect, Exit, Cause, Option, Layer } from "effect";
    import { nip04 } from "nostr-tools"; // To mock
    import {
      NIP04Service,
      NIP04ServiceLive,
      NIP04EncryptError,
      NIP04DecryptError,
    } from "@/services/nip04";
    import { generateSecretKey, getPublicKey } from "nostr-tools/pure"; // For generating test keys

    // Mock nostr-tools's nip04 module
    vi.mock("nostr-tools", async (importOriginal) => {
      const original = await importOriginal<typeof import("nostr-tools")>();
      return {
        ...original,
        nip04: {
          encrypt: vi.fn(),
          decrypt: vi.fn(),
        },
      };
    });

    // Typed mock functions
    const mockNip04Encrypt = nip04.encrypt as vi.MockedFunction<
      typeof nip04.encrypt
    >;
    const mockNip04Decrypt = nip04.decrypt as vi.MockedFunction<
      typeof nip04.decrypt
    >;

    describe("NIP04Service", () => {
      const ourSk = generateSecretKey();
      const theirPkHex = getPublicKey(generateSecretKey());
      const plaintext = "Hello, Nostr!";
      const ciphertextWithIv = "encryptedText?iv=someIv";

      beforeEach(() => {
        vi.clearAllMocks();
      });

      const runWithLayer = <E, A>(effect: Effect.Effect<A, E, NIP04Service>) =>
        Effect.runPromiseExit(Effect.provide(effect, NIP04ServiceLive));

      describe("encrypt", () => {
        it("should encrypt plaintext successfully", async () => {
          mockNip04Encrypt.mockResolvedValue(ciphertextWithIv);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.encrypt(ourSk, theirPkHex, plaintext),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isSuccess(exit)).toBe(true);
          if (Exit.isSuccess(exit)) {
            expect(exit.value).toBe(ciphertextWithIv);
          }
          expect(mockNip04Encrypt).toHaveBeenCalledWith(
            ourSk,
            theirPkHex,
            plaintext,
          );
        });

        it("should return NIP04EncryptError on encryption failure", async () => {
          const errorCause = new Error("Encryption library error");
          mockNip04Encrypt.mockRejectedValue(errorCause);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.encrypt(ourSk, theirPkHex, plaintext),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause).pipe(
              Option.getOrThrow,
            );
            expect(error).toBeInstanceOf(NIP04EncryptError);
            expect(error.message).toBe("NIP-04 encryption failed");
            expect(error.cause).toBe(errorCause);
          }
        });
      });

      describe("decrypt", () => {
        it("should decrypt ciphertext successfully", async () => {
          mockNip04Decrypt.mockResolvedValue(plaintext);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.decrypt(ourSk, theirPkHex, ciphertextWithIv),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isSuccess(exit)).toBe(true);
          if (Exit.isSuccess(exit)) {
            expect(exit.value).toBe(plaintext);
          }
          expect(mockNip04Decrypt).toHaveBeenCalledWith(
            ourSk,
            theirPkHex,
            ciphertextWithIv,
          );
        });

        it("should return NIP04DecryptError on decryption failure", async () => {
          const errorCause = new Error("Decryption library error");
          mockNip04Decrypt.mockRejectedValue(errorCause);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.decrypt(ourSk, theirPkHex, ciphertextWithIv),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause).pipe(
              Option.getOrThrow,
            );
            expect(error).toBeInstanceOf(NIP04DecryptError);
            expect(error.message).toBe("NIP-04 decryption failed");
            expect(error.cause).toBe(errorCause);
          }
        });
      });
    });
    ```

    - **Action:** Create this file.

**Phase 4: Refactor NIP-90 Helpers to use NIP04Service**

1.  **Modify `src/helpers/nip90/event_creation.ts`:**

    ```typescript
    // src/helpers/nip90/event_creation.ts
    import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
    // Removed: import { nip04 } from 'nostr-tools';
    import type { NostrEvent } from "@/services/nostr";
    import { NIP04Service, NIP04EncryptError } from "@/services/nip04"; // Import NIP04Service and error
    import { Effect } from "effect"; // Import Effect

    export function createNip90JobRequest(
      requesterSk: Uint8Array,
      targetDvmPkHex: string,
      inputs: Array<[string, string, string?, string?, string?]>,
      outputMimeType: string = "text/plain",
      bidMillisats?: number,
      jobKind: number = 5100,
      additionalParams?: Array<[string, string, string]>,
    ): Effect.Effect<NostrEvent, NIP04EncryptError, NIP04Service> {
      // Return Effect, require NIP04Service
      return Effect.gen(function* (_) {
        const nip04Service = yield* _(NIP04Service); // Access the service from context

        const jobParametersToEncrypt: Array<[string, ...string[]]> = [
          ...inputs.map(
            (inputParams) =>
              ["i", ...inputParams.filter((p) => p !== undefined)] as [
                string,
                ...string[],
              ],
          ),
        ];

        if (additionalParams) {
          jobParametersToEncrypt.push(...additionalParams);
        }

        const stringifiedParams = JSON.stringify(jobParametersToEncrypt);

        // Encrypt using the service
        const encryptedContent = yield* _(
          nip04Service.encrypt(requesterSk, targetDvmPkHex, stringifiedParams),
        );

        const template: EventTemplate = {
          kind: jobKind,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["p", targetDvmPkHex],
            ["encrypted"],
            ["output", outputMimeType],
          ],
          content: encryptedContent,
        };

        if (bidMillisats !== undefined && bidMillisats > 0) {
          template.tags.push(["bid", bidMillisats.toString()]);
        }

        return finalizeEvent(template, requesterSk) as NostrEvent;
      });
    }
    ```

    - **Action:** Update this file.

2.  **Modify `src/components/nip90/Nip90RequestForm.tsx`:**
    Update `handlePublishRequest` to handle the Effectful `createNip90JobRequest`.

    ```typescript
    // src/components/nip90/Nip90RequestForm.tsx
    import React, { useState, ChangeEvent } from 'react';
    // ... other imports ...
    import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
    import {
      NostrService,
      NostrServiceLive,
      DefaultNostrServiceConfigLayer,
      type NostrEvent
    } from '@/services/nostr';
    import { NIP04Service, NIP04ServiceLive } from '@/services/nip04'; // Import NIP04ServiceLive
    import { Effect, Layer, Exit, Cause } from 'effect';
    // ... OUR_DVM_PUBKEY_HEX definition ...

    export default function Nip90RequestForm() {
      // ... existing state ...

      const handlePublishRequest = async () => {
        setIsPublishing(true);
        setPublishError(null);
        setPublishedEventId(null);
        setEphemeralSkHex(null);

        if (!OUR_DVM_PUBKEY_HEX || OUR_DVM_PUBKEY_HEX === "your_dvm_public_key_hex_here") {
           setPublishError("DVM public key is not configured. Please replace the placeholder.");
           setIsPublishing(false);
           return;
        }

        try {
          // ... (form validation remains the same) ...
          const kind = parseInt(jobKind, 10);
          // ... existing validations ...
          const bid = bidAmount ? parseInt(bidAmount, 10) : undefined;
          // ... existing validations ...

          const requesterSkUint8Array = generateSecretKey();
          const { bytesToHex } = await import('@noble/hashes/utils');
          const currentEphemeralSkHex = bytesToHex(requesterSkUint8Array); // Store locally before setting state
          setEphemeralSkHex(currentEphemeralSkHex);

          const inputsForEncryption: Array<[string, string, string?, string?, string?]> = [[inputData.trim(), 'text']];

          // createNip90JobRequest now returns an Effect
          const createRequestEventEffect = createNip90JobRequest(
            requesterSkUint8Array,
            OUR_DVM_PUBKEY_HEX,
            inputsForEncryption,
            outputMimeType.trim() || "text/plain",
            bid,
            kind
          );

          const program = Effect.gen(function* (_) {
            const requestEvent = yield* _(createRequestEventEffect); // Resolve the creation effect
            console.log("Generated Encrypted NIP-90 Request Event:", JSON.stringify(requestEvent, null, 2));
            const nostrService = yield* _(NostrService);
            yield* _(nostrService.publishEvent(requestEvent));
            return requestEvent.id;
          });

          // Add NIP04ServiceLive to the layer
          const fullLayer = Layer.mergeAll(
            Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer),
            NIP04ServiceLive // Provide NIP04Service
          );
          const exit = await Effect.runPromiseExit(Effect.provide(program, fullLayer));

          if (Exit.isSuccess(exit)) {
            console.log('Successfully published NIP-90 request. Event ID:', exit.value);
            setPublishedEventId(exit.value);

            // Store the event ID and secret key in localStorage
            if (currentEphemeralSkHex) { // Use the locally stored hex key
              try {
                const storedRequests = JSON.parse(localStorage.getItem('nip90_requests') || '{}');
                storedRequests[exit.value] = {
                  secretKey: currentEphemeralSkHex, // Use currentEphemeralSkHex
                  createdAt: Date.now(),
                  kind: kind
                };
                localStorage.setItem('nip90_requests', JSON.stringify(storedRequests));
                console.log('Stored request details for later decryption');
              } catch (error) {
                console.error('Failed to store request details:', error);
              }
            }
          } else {
            console.error('Failed to publish NIP-90 request:', Cause.pretty(exit.cause));
            const underlyingError = Cause.failureOption(exit.cause);
            const errorMessage = underlyingError._tag === "Some" && underlyingError.value instanceof Error ?
                                 underlyingError.value.message : "Unknown error during publishing.";
            setPublishError(`Publishing failed: ${errorMessage}`);
          }

        } catch (error) {
          console.error("Error during request preparation:", error);
          setPublishError(error instanceof Error ? error.message : "An unexpected error occurred.");
        } finally {
          setIsPublishing(false);
        }
      };

      return (
        // ... (JSX remains the same) ...
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Create NIP-90 Job Request (Encrypted)</CardTitle>
            <CardDescription>Define and publish a new encrypted job request to the Nostr network for your DVM.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input fields remain the same as before */}
            <div className="space-y-1.5">
              <Label htmlFor="jobKind">Job Kind</Label>
              <Input id="jobKind" type="number" value={jobKind} onChange={(e: ChangeEvent<HTMLInputElement>) => setJobKind(e.target.value)} placeholder="e.g., 5100" disabled={isPublishing} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inputData">Input Data (will be encrypted)</Label>
              <Textarea id="inputData" value={inputData} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputData(e.target.value)} placeholder="Enter the data for the job (e.g., a prompt for text generation)" rows={3} disabled={isPublishing} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="outputMimeType">Output MIME Type (public)</Label>
              <Input id="outputMimeType" value={outputMimeType} onChange={(e: ChangeEvent<HTMLInputElement>) => setOutputMimeType(e.target.value)} placeholder="e.g., text/plain" disabled={isPublishing} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bidAmount">Bid Amount (msats, public)</Label>
              <Input id="bidAmount" type="number" value={bidAmount} onChange={(e: ChangeEvent<HTMLInputElement>) => setBidAmount(e.target.value)} placeholder="Optional: e.g., 1000" disabled={isPublishing} />
            </div>

            {isPublishing && <p className="text-sm text-blue-500">Publishing...</p>}
            {publishError && <p className="text-sm text-destructive">Error: {publishError}</p>}
            {publishedEventId && (
               <div className="text-sm text-green-500">
                   <p>Success! Event ID: <code className="text-xs break-all">{publishedEventId}</code></p>
                   {ephemeralSkHex && <p className="mt-1 text-xs text-muted-foreground">Ephemeral SK (for debugging/decryption): <code className="text-xs break-all">{ephemeralSkHex}</code></p>}
               </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handlePublishRequest} className="w-full" disabled={isPublishing}>
              {isPublishing ? 'Publishing...' : 'Publish Encrypted Job Request'}
            </Button>
          </CardFooter>
        </Card>
      );
    }
    ```

    - **Action:** Update this file. Note the change in how `ephemeralSkHex` is handled for `localStorage` to ensure the correct value is stored before async state updates.

3.  **Modify `src/helpers/nip90/event_decryption.ts`:**

    ```typescript
    // src/helpers/nip90/event_decryption.ts
    // Removed: import { nip04 } from 'nostr-tools';
    import { hexToBytes } from "@noble/hashes/utils";
    import { NIP04Service, NIP04DecryptError } from "@/services/nip04"; // Import NIP04Service and error
    import { Effect } from "effect"; // Import Effect

    export function decryptNip04Content(
      ourSkHex: string,
      theirPkHex: string,
      encryptedContent: string,
    ): Effect.Effect<string, NIP04DecryptError, NIP04Service> {
      // Return Effect, require NIP04Service
      return Effect.gen(function* (_) {
        const nip04Service = yield* _(NIP04Service); // Access the service from context
        try {
          const ourSkUint8Array = hexToBytes(ourSkHex);
          // Decrypt using the service
          return yield* _(
            nip04Service.decrypt(ourSkUint8Array, theirPkHex, encryptedContent),
          );
        } catch (error) {
          // Catch potential hexToBytes errors
          return yield* _(
            Effect.fail(
              new NIP04DecryptError({
                message: "Failed to convert secret key from hex",
                cause: error,
              }),
            ),
          );
        }
      });
    }
    ```

    - **Action:** Update this file.

**Phase 5: Update Tests for NIP-90 Helpers and Components**

1.  **Modify `src/tests/unit/helpers/nip90/event_creation.test.ts`:**

    ```typescript
    // src/tests/unit/helpers/nip90/event_creation.test.ts
    import { describe, it, expect, vi } from "vitest";
    import {
      generateSecretKey,
      getPublicKey,
      finalizeEvent as actualFinalizeEvent,
    } from "nostr-tools/pure";
    import { createNip90JobRequest } from "@/helpers/nip90/event_creation";
    import type { NostrEvent } from "@/services/nostr";
    import {
      NIP04Service,
      NIP04ServiceLive,
      NIP04EncryptError,
    } from "@/services/nip04"; // Import real NIP04Service for testing
    import { Effect, Exit, Layer, Cause, Option } from "effect";

    // Mock only finalizeEvent from nostr-tools/pure, NIP04Service will use real nip04.encrypt
    // We will provide a mocked NIP04Service below for control.
    vi.mock("nostr-tools/pure", async (importOriginal) => {
      const original =
        await importOriginal<typeof import("nostr-tools/pure")>();
      return {
        ...original,
        finalizeEvent: vi.fn((template, sk) => {
          const pk = original.getPublicKey(sk);
          return {
            ...template,
            id: "mockEventId" + Date.now(),
            pubkey: pk,
            sig: "mockSignature" + Date.now(),
            tags: template.tags || [],
            content: template.content || "", // content will be the mocked encrypted content
          } as NostrEvent;
        }),
      };
    });

    const mockFinalizeEvent = actualFinalizeEvent as vi.MockedFunction<
      typeof actualFinalizeEvent
    >;

    describe("createNip90JobRequest", () => {
      const sk = generateSecretKey();
      const dvmPkHex = getPublicKey(generateSecretKey());
      const inputs: Array<[string, string, string?, string?, string?]> = [
        ["Test input data", "text"],
      ];
      const outputMimeType = "text/plain";
      const bidMillisats = 1000;
      const jobKind = 5100;

      const mockEncryptedContent = "mock-encrypted-content-from-service";

      // Create a mock NIP04Service layer
      const mockNip04Encrypt = vi.fn(() =>
        Effect.succeed(mockEncryptedContent),
      );
      const MockNIP04ServiceLayer = Layer.succeed(NIP04Service, {
        encrypt: mockNip04Encrypt,
        decrypt: vi.fn(() => Effect.succeed("decrypted")), // Mock decrypt as well
      });

      it("should create an encrypted NIP-90 event using NIP04Service", async () => {
        const program = createNip90JobRequest(
          sk,
          dvmPkHex,
          inputs,
          outputMimeType,
          bidMillisats,
          jobKind,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          const event = exit.value;
          expect(event.kind).toBe(jobKind);
          expect(event.content).toBe(mockEncryptedContent);
          expect(event.tags).toEqual(
            expect.arrayContaining([
              ["p", dvmPkHex],
              ["encrypted"],
              ["output", outputMimeType],
              ["bid", bidMillisats.toString()],
            ]),
          );
          // Check that the input 'i' tag is NOT present unencrypted
          expect(event.tags.some((t) => t[0] === "i")).toBe(false);
        }

        expect(mockNip04Encrypt).toHaveBeenCalledWith(
          sk,
          dvmPkHex,
          JSON.stringify([["i", "Test input data", "text"]]),
        );
        expect(mockFinalizeEvent).toHaveBeenCalled();
      });

      it("should propagate NIP04EncryptError if encryption fails", async () => {
        const encryptError = new NIP04EncryptError({
          message: "Test encrypt error",
        });
        mockNip04Encrypt.mockReturnValueOnce(Effect.fail(encryptError));

        const program = createNip90JobRequest(
          sk,
          dvmPkHex,
          inputs,
          outputMimeType,
          bidMillisats,
          jobKind,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBe(encryptError);
        }
      });
    });
    ```

    - **Action:** Update this file.

2.  **Modify `src/tests/unit/helpers/nip90/event_decryption.test.ts`:**

    ```typescript
    // src/tests/unit/helpers/nip90/event_decryption.test.ts
    import { describe, it, expect, vi } from "vitest";
    import { decryptNip04Content } from "@/helpers/nip90/event_decryption";
    import { NIP04Service, NIP04DecryptError } from "@/services/nip04";
    import { Effect, Exit, Layer, Cause, Option } from "effect";
    import { hexToBytes as actualHexToBytes } from "@noble/hashes/utils";

    vi.mock("@noble/hashes/utils", () => ({
      hexToBytes: vi.fn().mockImplementation(actualHexToBytes), // Mock to allow spying or overriding
    }));
    const mockHexToBytes = actualHexToBytes as vi.MockedFunction<
      typeof actualHexToBytes
    >;

    describe("decryptNip04Content", () => {
      const ourSkHex = "ourSecretKeyHex";
      const theirPkHex = "theirPublicKeyHex";
      const encryptedContent = "encrypted?iv=iv";
      const decryptedPlaintext = "decrypted content";

      const mockNip04Decrypt = vi.fn(() => Effect.succeed(decryptedPlaintext));
      const MockNIP04ServiceLayer = Layer.succeed(NIP04Service, {
        encrypt: vi.fn(() => Effect.succeed("encrypted")),
        decrypt: mockNip04Decrypt,
      });

      it("should decrypt content using NIP04Service", async () => {
        const program = decryptNip04Content(
          ourSkHex,
          theirPkHex,
          encryptedContent,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          expect(exit.value).toBe(decryptedPlaintext);
        }
        expect(mockHexToBytes).toHaveBeenCalledWith(ourSkHex);
        const ourSkUint8Array = actualHexToBytes(ourSkHex); // Use actual conversion for mock call verification
        expect(mockNip04Decrypt).toHaveBeenCalledWith(
          ourSkUint8Array,
          theirPkHex,
          encryptedContent,
        );
      });

      it("should propagate NIP04DecryptError if decryption fails", async () => {
        const decryptError = new NIP04DecryptError({
          message: "Test decrypt error",
        });
        mockNip04Decrypt.mockReturnValueOnce(Effect.fail(decryptError));
        mockHexToBytes.mockReturnValueOnce(new Uint8Array(32)); // Ensure hexToBytes doesn't throw for this path

        const program = decryptNip04Content(
          ourSkHex,
          theirPkHex,
          encryptedContent,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBe(decryptError);
        }
      });

      it("should return NIP04DecryptError if hexToBytes fails", async () => {
        const hexError = new Error("Invalid hex string");
        mockHexToBytes.mockImplementationOnce(() => {
          throw hexError;
        });

        const program = decryptNip04Content(
          "invalid-hex",
          theirPkHex,
          encryptedContent,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBeInstanceOf(NIP04DecryptError);
          expect(error.message).toBe("Failed to convert secret key from hex");
          expect(error.cause).toBe(hexError);
        }
      });
    });
    ```

    - **Action:** Update this file.

3.  **Modify `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`:**
    The `Nip90RequestForm`'s `handlePublishRequest` now uses Effect composition that includes `NIP04Service`.
    We need to provide a mock `NIP04ServiceLive` in the tests for this component.
    The existing mocks for `nostr-tools/pure` (for `generateSecretKey`, `finalizeEvent`) are still relevant.
    The mock for `NostrService` (`MockNostrServiceLiveActual` / `testSpecificNostrServiceLayer`) is also still relevant. We need to merge the mock `NIP04Service` layer.

    ```typescript
    // src/tests/unit/components/nip90/Nip90RequestForm.test.tsx
    import React from 'react';
    import { render, screen, fireEvent, waitFor } from '@testing-library/react';
    import { describe, it, expect, vi } from 'vitest';
    import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { Effect, Layer } from 'effect'; // Import Layer

    // Mock services and helpers
    import { NostrService as NostrServiceTag, DefaultNostrServiceConfigLayer, type NostrEvent } from '@/services/nostr';
    import { NIP04Service as NIP04ServiceTag } from '@/services/nip04';
    import * as nostrToolsPure from 'nostr-tools/pure';
    // import { createNip90JobRequest as actualCreateNip90JobRequest } from '@/helpers/nip90/event_creation'; // No longer needed to mock this directly

    const queryClient = new QueryClient({ /* ... */ });

    // Mock nostr-tools/pure for key generation and event finalization
    vi.mock('nostr-tools/pure', async (importOriginal) => {
      const original = await importOriginal<typeof nostrToolsPure>();
      return {
        ...original,
        generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)),
        getPublicKey: vi.fn((sk) => original.getPublicKey(sk)), // Use original getPublicKey for consistency
        finalizeEvent: vi.fn((template, sk) => {
            const pk = original.getPublicKey(sk); // sk here is our mock Uint8Array(32).fill(1)
            return {
                ...template,
                id: 'mockEventId' + Date.now(),
                pubkey: pk, // This will be derived from the mocked sk
                sig: 'mockSignature' + Date.now(),
                tags: template.tags || [],
                content: template.content || '', // Content will be set by mocked NIP04Service
            } as NostrEvent;
        }),
      };
    });
    const mockedFinalizeEvent = nostrToolsPure.finalizeEvent as vi.Mock;


    // Mocks for services
    const mockPublishEventActual = vi.fn(() => Effect.succeed(undefined));
    const MockNostrServiceLayer = Layer.succeed(NostrServiceTag, {
      getPool: vi.fn(), listEvents: vi.fn(), publishEvent: mockPublishEventActual, cleanupPool: vi.fn(),
    });

    const mockNip04EncryptFn = vi.fn(() => Effect.succeed("mock-encrypted-content-from-nip04-service"));
    const MockNIP04ServiceLayer = Layer.succeed(NIP04ServiceTag, {
      encrypt: mockNip04EncryptFn,
      decrypt: vi.fn(() => Effect.succeed("mock-decrypted-content")),
    });

    // Combined layer for tests
    const TestAppFormLayer = Layer.mergeAll(
        Layer.provide(MockNostrServiceLayer, DefaultNostrServiceConfigLayer), // NostrService needs its config
        MockNIP04ServiceLayer
    );

    const renderComponentWithTestLayer = () => render(
      <QueryClientProvider client={queryClient}>
        <Effect.Provider effect={TestAppFormLayer}>
          <Nip90RequestForm />
        </Effect.Provider>
      </QueryClientProvider>
    );


    describe('Nip90RequestForm', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        // ... (existing 'renders without crashing' and 'should update state' tests - they should still pass)
        it('renders without crashing', () => {
            expect(() => renderComponentWithTestLayer()).not.toThrow();
        });

        it('should update state when input fields are changed', () => {
            renderComponentWithTestLayer();
            // ... (assertions for state updates)
            const jobKindInput = screen.getByLabelText(/Job Kind/i) as HTMLInputElement;
            fireEvent.change(jobKindInput, { target: { value: '5001' } });
            expect(jobKindInput.value).toBe('5001');
        });


        it('should call NostrService and NIP04Service on submit with encrypted content', async () => {
            renderComponentWithTestLayer();

            fireEvent.change(screen.getByLabelText(/Job Kind/i), { target: { value: '5100' } });
            fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Encrypt this!' } });
            fireEvent.change(screen.getByLabelText(/Output MIME Type/i), { target: { value: 'text/special' } });
            fireEvent.change(screen.getByLabelText(/Bid Amount \(msats\)/i), { target: { value: '3000' } });

            fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));

            await waitFor(async () => {
                 expect(await screen.findByText(/Success! Event ID: mockEventId/i)).toBeInTheDocument();
            });

            expect(nostrToolsPure.generateSecretKey).toHaveBeenCalledTimes(1);

            // Check if NIP04Service.encrypt was called
            expect(mockNip04EncryptFn).toHaveBeenCalledTimes(1);
            const expectedPlaintextForEncryption = JSON.stringify([['i', 'Encrypt this!', 'text']]);
            const ephemeralSkUsed = (nostrToolsPure.generateSecretKey as vi.Mock).mock.results[0].value;
            expect(mockNip04EncryptFn).toHaveBeenCalledWith(
                ephemeralSkUsed, // The ephemeral SK generated in the form
                expect.any(String), // DVM PubKey
                expectedPlaintextForEncryption
            );

            // Check if NostrService.publishEvent was called
            expect(mockPublishEventActual).toHaveBeenCalledTimes(1);
            const publishedEvent = mockPublishEventActual.mock.calls[0][0] as NostrEvent;

            expect(publishedEvent.kind).toBe(5100);
            expect(publishedEvent.content).toBe("mock-encrypted-content-from-nip04-service"); // Content is now encrypted
            expect(publishedEvent.tags).toEqual(expect.arrayContaining([
              ['p', expect.any(String)], // DVM pubkey
              ['encrypted'],
              ['output', 'text/special'],
              ['bid', '3000'],
            ]));
            expect(publishedEvent.tags.some(t => t[0] === 'i')).toBe(false); // 'i' tag should be inside encrypted content
        });

        it('should display loading, success, and error messages correctly', async () => {
            mockPublishEventActual.mockImplementationOnce(() =>
              Effect.suspend(() => new Promise(resolve => setTimeout(() => resolve(Effect.succeed(undefined)), 50)))
            );
            renderComponentWithTestLayer();
            fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Test Feedback' } });
            fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));
            expect(await screen.findByText(/Publishing.../i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Publishing.../i})).toBeDisabled();

            expect(await screen.findByText(/Success! Event ID: mockEventId/i, {}, {timeout: 200})).toBeInTheDocument();

            // Test for Error
            mockPublishEventActual.mockImplementationOnce(() => Effect.fail(new Error("Custom Relay Error Publish")));
            // For a clean UI state for error testing, re-render.
            renderComponentWithTestLayer(); // This will use a fresh instance of the component
            fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Another prompt for error' } });
            fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));
            expect(await screen.findByText(/Error: Publishing failed: Custom Relay Error Publish/i)).toBeInTheDocument();
          });

    });
    ```

    - **Action:** Update this file.

This refactoring ensures that NIP-04 cryptographic operations are encapsulated within their own service and are testable, aligning with the Effect-ts pattern used in the project.
The tests need to provide the `NIP04ServiceLive` layer (or a mock layer) where the NIP-04 operations are now used.Okay, I'll provide the coding instructions to create the `NIP04Service`, implement it, test it, and then refactor the existing NIP-90 helper functions and their tests to use this new service.

**Phase 1: Define NIP04Service Interface and Types**

1.  **Create `src/services/nip04/NIP04Service.ts`:**

    ```typescript
    // src/services/nip04/NIP04Service.ts
    import { Effect, Context, Data } from "effect";

    // --- Custom Error Types ---
    export class NIP04EncryptError extends Data.TaggedError(
      "NIP04EncryptError",
    )<{
      readonly cause?: unknown;
      readonly message: string;
    }> {}

    export class NIP04DecryptError extends Data.TaggedError(
      "NIP04DecryptError",
    )<{
      readonly cause?: unknown;
      readonly message: string;
    }> {}

    // --- Service Interface ---
    export interface NIP04Service {
      /**
       * Encrypts plaintext using NIP-04.
       * @param ourSk - Our secret key (Uint8Array).
       * @param theirPkHex - Their public key (hex string).
       * @param plaintext - The text to encrypt.
       * @returns Effect with the NIP-04 encrypted string (ciphertext?iv=iv_base64).
       */
      encrypt(
        ourSk: Uint8Array,
        theirPkHex: string,
        plaintext: string,
      ): Effect.Effect<string, NIP04EncryptError>;

      /**
       * Decrypts NIP-04 ciphertext.
       * @param ourSk - Our secret key (Uint8Array).
       * @param theirPkHex - Their public key (hex string).
       * @param ciphertextWithIv - The NIP-04 encrypted string (ciphertext?iv=iv_base64).
       * @returns Effect with the decrypted plaintext string.
       */
      decrypt(
        ourSk: Uint8Array,
        theirPkHex: string,
        ciphertextWithIv: string,
      ): Effect.Effect<string, NIP04DecryptError>;
    }

    // --- Service Tag ---
    export const NIP04Service =
      Context.GenericTag<NIP04Service>("NIP04Service");
    ```

**Phase 2: Implement NIP04Service**

1.  **Create `src/services/nip04/NIP04ServiceImpl.ts`:**

    ```typescript
    // src/services/nip04/NIP04ServiceImpl.ts
    import { Effect, Layer } from "effect";
    import { nip04 } from "nostr-tools";
    import {
      NIP04Service,
      NIP04EncryptError,
      NIP04DecryptError,
    } from "./NIP04Service";

    export function createNIP04Service(): NIP04Service {
      return {
        encrypt: (ourSk: Uint8Array, theirPkHex: string, plaintext: string) =>
          Effect.tryPromise({
            try: () => nip04.encrypt(ourSk, theirPkHex, plaintext),
            catch: (cause) =>
              new NIP04EncryptError({
                message: "NIP-04 encryption failed",
                cause,
              }),
          }),

        decrypt: (
          ourSk: Uint8Array,
          theirPkHex: string,
          ciphertextWithIv: string,
        ) =>
          Effect.tryPromise({
            try: () => nip04.decrypt(ourSk, theirPkHex, ciphertextWithIv),
            catch: (cause) =>
              new NIP04DecryptError({
                message: "NIP-04 decryption failed",
                cause,
              }),
          }),
      };
    }

    export const NIP04ServiceLive = Layer.succeed(
      NIP04Service,
      createNIP04Service(),
    );
    ```

2.  **Create `src/services/nip04/index.ts`:**
    ```typescript
    // src/services/nip04/index.ts
    export * from "./NIP04Service";
    export * from "./NIP04ServiceImpl";
    ```

**Phase 3: Unit Test NIP04Service**

1.  **Create `src/tests/unit/services/nip04/NIP04Service.test.ts`:**

    ```typescript
    // src/tests/unit/services/nip04/NIP04Service.test.ts
    import { describe, it, expect, vi, beforeEach } from "vitest";
    import { Effect, Exit, Cause, Option, Layer } from "effect";
    import { nip04 } from "nostr-tools"; // To mock
    import {
      NIP04Service,
      NIP04ServiceLive,
      NIP04EncryptError,
      NIP04DecryptError,
    } from "@/services/nip04";
    import { generateSecretKey, getPublicKey } from "nostr-tools/pure"; // For generating test keys

    // Mock nostr-tools's nip04 module
    vi.mock("nostr-tools", async (importOriginal) => {
      const original = await importOriginal<typeof import("nostr-tools")>();
      return {
        ...original,
        nip04: {
          encrypt: vi.fn(),
          decrypt: vi.fn(),
        },
      };
    });

    // Typed mock functions
    const mockNip04Encrypt = nip04.encrypt as vi.MockedFunction<
      typeof nip04.encrypt
    >;
    const mockNip04Decrypt = nip04.decrypt as vi.MockedFunction<
      typeof nip04.decrypt
    >;

    describe("NIP04Service", () => {
      const ourSk = generateSecretKey();
      const theirPkHex = getPublicKey(generateSecretKey());
      const plaintext = "Hello, Nostr!";
      const ciphertextWithIv = "encryptedText?iv=someIv";

      beforeEach(() => {
        vi.clearAllMocks();
      });

      const runWithLayer = <E, A>(effect: Effect.Effect<A, E, NIP04Service>) =>
        Effect.runPromiseExit(Effect.provide(effect, NIP04ServiceLive));

      describe("encrypt", () => {
        it("should encrypt plaintext successfully", async () => {
          mockNip04Encrypt.mockResolvedValue(ciphertextWithIv);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.encrypt(ourSk, theirPkHex, plaintext),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isSuccess(exit)).toBe(true);
          if (Exit.isSuccess(exit)) {
            expect(exit.value).toBe(ciphertextWithIv);
          }
          expect(mockNip04Encrypt).toHaveBeenCalledWith(
            ourSk,
            theirPkHex,
            plaintext,
          );
        });

        it("should return NIP04EncryptError on encryption failure", async () => {
          const errorCause = new Error("Encryption library error");
          mockNip04Encrypt.mockRejectedValue(errorCause);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.encrypt(ourSk, theirPkHex, plaintext),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause).pipe(
              Option.getOrThrow,
            );
            expect(error).toBeInstanceOf(NIP04EncryptError);
            expect(error.message).toBe("NIP-04 encryption failed");
            expect(error.cause).toBe(errorCause);
          }
        });
      });

      describe("decrypt", () => {
        it("should decrypt ciphertext successfully", async () => {
          mockNip04Decrypt.mockResolvedValue(plaintext);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.decrypt(ourSk, theirPkHex, ciphertextWithIv),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isSuccess(exit)).toBe(true);
          if (Exit.isSuccess(exit)) {
            expect(exit.value).toBe(plaintext);
          }
          expect(mockNip04Decrypt).toHaveBeenCalledWith(
            ourSk,
            theirPkHex,
            ciphertextWithIv,
          );
        });

        it("should return NIP04DecryptError on decryption failure", async () => {
          const errorCause = new Error("Decryption library error");
          mockNip04Decrypt.mockRejectedValue(errorCause);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.decrypt(ourSk, theirPkHex, ciphertextWithIv),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause).pipe(
              Option.getOrThrow,
            );
            expect(error).toBeInstanceOf(NIP04DecryptError);
            expect(error.message).toBe("NIP-04 decryption failed");
            expect(error.cause).toBe(errorCause);
          }
        });
      });
    });
    ```

**Phase 4: Refactor NIP-90 Helpers to use NIP04Service**

1.  **Modify `src/helpers/nip90/event_creation.ts`:**

    ```typescript
    // src/helpers/nip90/event_creation.ts
    import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
    import type { NostrEvent } from "@/services/nostr";
    import { NIP04Service, NIP04EncryptError } from "@/services/nip04";
    import { Effect } from "effect";

    export function createNip90JobRequest(
      requesterSk: Uint8Array,
      targetDvmPkHex: string,
      inputs: Array<[string, string, string?, string?, string?]>,
      outputMimeType: string = "text/plain",
      bidMillisats?: number,
      jobKind: number = 5100,
      additionalParams?: Array<[string, string, string]>,
    ): Effect.Effect<NostrEvent, NIP04EncryptError, NIP04Service> {
      return Effect.gen(function* (_) {
        const nip04Service = yield* _(NIP04Service);

        const jobParametersToEncrypt: Array<[string, ...string[]]> = [
          ...inputs.map(
            (inputParams) =>
              ["i", ...inputParams.filter((p) => p !== undefined)] as [
                string,
                ...string[],
              ],
          ),
        ];

        if (additionalParams) {
          jobParametersToEncrypt.push(...additionalParams);
        }

        const stringifiedParams = JSON.stringify(jobParametersToEncrypt);
        const encryptedContent = yield* _(
          nip04Service.encrypt(requesterSk, targetDvmPkHex, stringifiedParams),
        );

        const template: EventTemplate = {
          kind: jobKind,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["p", targetDvmPkHex],
            ["encrypted"],
            ["output", outputMimeType],
          ],
          content: encryptedContent,
        };

        if (bidMillisats !== undefined && bidMillisats > 0) {
          template.tags.push(["bid", bidMillisats.toString()]);
        }

        return finalizeEvent(template, requesterSk) as NostrEvent;
      });
    }
    ```

2.  **Modify `src/components/nip90/Nip90RequestForm.tsx`:**

    ```typescript
    // src/components/nip90/Nip90RequestForm.tsx
    import React, { useState, ChangeEvent } from 'react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { generateSecretKey } from 'nostr-tools/pure';
    import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
    import {
      NostrService,
      NostrServiceLive,
      DefaultNostrServiceConfigLayer,
      type NostrEvent
    } from '@/services/nostr';
    import { NIP04ServiceLive } from '@/services/nip04'; // Import NIP04ServiceLive
    import { Effect, Layer, Exit, Cause } from 'effect';

    const OUR_DVM_PUBKEY_HEX = "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245";

    export default function Nip90RequestForm() {
      const [jobKind, setJobKind] = useState<string>("5100");
      const [inputData, setInputData] = useState<string>("");
      const [outputMimeType, setOutputMimeType] = useState<string>("text/plain");
      const [bidAmount, setBidAmount] = useState<string>("");

      const [isPublishing, setIsPublishing] = useState(false);
      const [publishError, setPublishError] = useState<string | null>(null);
      const [publishedEventId, setPublishedEventId] = useState<string | null>(null);
      const [ephemeralSkHex, setEphemeralSkHex] = useState<string | null>(null);

      const handlePublishRequest = async () => {
        setIsPublishing(true);
        setPublishError(null);
        setPublishedEventId(null);
        setEphemeralSkHex(null);

        if (!OUR_DVM_PUBKEY_HEX || OUR_DVM_PUBKEY_HEX === "your_dvm_public_key_hex_here") {
           setPublishError("DVM public key is not configured. Please replace the placeholder.");
           setIsPublishing(false);
           return;
        }

        try {
          const kind = parseInt(jobKind, 10);
          if (isNaN(kind) || kind < 5000 || kind > 5999) {
            setPublishError("Invalid Job Kind. Must be between 5000 and 5999.");
            setIsPublishing(false); return;
          }
          if (!inputData.trim()) {
            setPublishError("Input Data cannot be empty.");
            setIsPublishing(false); return;
          }
          if (!outputMimeType.trim()) setOutputMimeType("text/plain");

          let bidNum: number | undefined = undefined;
          if (bidAmount) {
            const parsedBid = parseInt(bidAmount, 10);
            if (isNaN(parsedBid) || parsedBid < 0) {
              setPublishError("Invalid Bid Amount. Must be a non-negative number.");
              setIsPublishing(false); return;
            }
            bidNum = parsedBid;
          }

          const requesterSkUint8Array = generateSecretKey();
          const { bytesToHex } = await import('@noble/hashes/utils');
          const currentEphemeralSkHex = bytesToHex(requesterSkUint8Array);
          setEphemeralSkHex(currentEphemeralSkHex);

          const inputsForEncryption: Array<[string, string, string?, string?, string?]> = [[inputData.trim(), 'text']];

          const createRequestEventEffect = createNip90JobRequest(
            requesterSkUint8Array,
            OUR_DVM_PUBKEY_HEX,
            inputsForEncryption,
            outputMimeType.trim() || "text/plain",
            bidNum,
            kind
          );

          const program = Effect.gen(function* (_) {
            const requestEvent = yield* _(createRequestEventEffect);
            console.log("Generated Encrypted NIP-90 Request Event:", JSON.stringify(requestEvent, null, 2));
            const nostrService = yield* _(NostrService);
            yield* _(nostrService.publishEvent(requestEvent));
            return requestEvent.id;
          });

          const fullLayer = Layer.mergeAll(
            Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer),
            NIP04ServiceLive
          );
          const exit = await Effect.runPromiseExit(Effect.provide(program, fullLayer));

          if (Exit.isSuccess(exit)) {
            console.log('Successfully published NIP-90 request. Event ID:', exit.value);
            setPublishedEventId(exit.value);

            if (currentEphemeralSkHex) {
              try {
                const storedRequests = JSON.parse(localStorage.getItem('nip90_requests') || '{}');
                storedRequests[exit.value] = {
                  secretKey: currentEphemeralSkHex,
                  createdAt: Date.now(),
                  kind: kind
                };
                localStorage.setItem('nip90_requests', JSON.stringify(storedRequests));
                console.log('Stored request details for later decryption');
              } catch (error) {
                console.error('Failed to store request details:', error);
              }
            }
          } else {
            console.error('Failed to publish NIP-90 request:', Cause.pretty(exit.cause));
            const underlyingError = Cause.failureOption(exit.cause);
            const errorMessage = underlyingError._tag === "Some" && underlyingError.value instanceof Error ?
                                 underlyingError.value.message : "Unknown error during publishing.";
            setPublishError(`Publishing failed: ${errorMessage}`);
          }
        } catch (error) {
          console.error("Error during request preparation:", error);
          setPublishError(error instanceof Error ? error.message : "An unexpected error occurred.");
        } finally {
          setIsPublishing(false);
        }
      };

      return (
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Create NIP-90 Job Request (Encrypted)</CardTitle>
            <CardDescription>Define and publish a new encrypted job request to the Nostr network for your DVM.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="jobKind">Job Kind</Label>
              <Input id="jobKind" type="number" value={jobKind} onChange={(e: ChangeEvent<HTMLInputElement>) => setJobKind(e.target.value)} placeholder="e.g., 5100" disabled={isPublishing} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inputData">Input Data (will be encrypted)</Label>
              <Textarea id="inputData" value={inputData} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputData(e.target.value)} placeholder="Enter the data for the job (e.g., a prompt for text generation)" rows={3} disabled={isPublishing} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="outputMimeType">Output MIME Type (public)</Label>
              <Input id="outputMimeType" value={outputMimeType} onChange={(e: ChangeEvent<HTMLInputElement>) => setOutputMimeType(e.target.value)} placeholder="e.g., text/plain" disabled={isPublishing} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bidAmount">Bid Amount (msats, public)</Label>
              <Input id="bidAmount" type="number" value={bidAmount} onChange={(e: ChangeEvent<HTMLInputElement>) => setBidAmount(e.target.value)} placeholder="Optional: e.g., 1000" disabled={isPublishing} />
            </div>
            {isPublishing && <p className="text-sm text-blue-500">Publishing...</p>}
            {publishError && <p className="text-sm text-destructive">Error: {publishError}</p>}
            {publishedEventId && (
               <div className="text-sm text-green-500">
                   <p>Success! Event ID: <code className="text-xs break-all">{publishedEventId}</code></p>
                   {ephemeralSkHex && <p className="mt-1 text-xs text-muted-foreground">Ephemeral SK (for debugging/decryption): <code className="text-xs break-all">{ephemeralSkHex}</code></p>}
               </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handlePublishRequest} className="w-full" disabled={isPublishing}>
              {isPublishing ? 'Publishing...' : 'Publish Encrypted Job Request'}
            </Button>
          </CardFooter>
        </Card>
      );
    }
    ```

3.  **Modify `src/helpers/nip90/event_decryption.ts`:**

    ```typescript
    // src/helpers/nip90/event_decryption.ts
    import { hexToBytes } from "@noble/hashes/utils";
    import { NIP04Service, NIP04DecryptError } from "@/services/nip04";
    import { Effect } from "effect";

    export function decryptNip04Content(
      ourSkHex: string,
      theirPkHex: string,
      encryptedContent: string,
    ): Effect.Effect<string, NIP04DecryptError, NIP04Service> {
      return Effect.gen(function* (_) {
        const nip04Service = yield* _(NIP04Service);
        try {
          const ourSkUint8Array = hexToBytes(ourSkHex);
          return yield* _(
            nip04Service.decrypt(ourSkUint8Array, theirPkHex, encryptedContent),
          );
        } catch (error) {
          return yield* _(
            Effect.fail(
              new NIP04DecryptError({
                message: "Failed to convert secret key from hex",
                cause: error,
              }),
            ),
          );
        }
      });
    }
    ```

**Phase 5: Update Tests for NIP-90 Helpers and Components**

1.  **Modify `src/tests/unit/helpers/nip90/event_creation.test.ts`:**

    ```typescript
    // src/tests/unit/helpers/nip90/event_creation.test.ts
    import { describe, it, expect, vi } from "vitest";
    import {
      generateSecretKey,
      getPublicKey,
      finalizeEvent,
    } from "nostr-tools/pure";
    import { createNip90JobRequest } from "@/helpers/nip90/event_creation";
    import type { NostrEvent } from "@/services/nostr";
    import { NIP04Service, NIP04EncryptError } from "@/services/nip04";
    import { Effect, Exit, Layer, Cause, Option } from "effect";

    vi.mock("nostr-tools/pure", async (importOriginal) => {
      const original =
        await importOriginal<typeof import("nostr-tools/pure")>();
      return {
        ...original,
        finalizeEvent: vi.fn((template, sk) => {
          const pk = original.getPublicKey(sk);
          return {
            ...template,
            id: "mockEventId" + Date.now(),
            pubkey: pk,
            sig: "mockSignature" + Date.now(),
            tags: template.tags || [],
            content: template.content,
          } as NostrEvent;
        }),
      };
    });
    const mockedFinalizeEvent = finalizeEvent as vi.Mock;

    describe("createNip90JobRequest", () => {
      const sk = generateSecretKey();
      const dvmPkHex = getPublicKey(generateSecretKey());
      const inputs: Array<[string, string, string?, string?, string?]> = [
        ["Test input data", "text"],
      ];
      const outputMimeType = "text/plain";
      const bidMillisats = 1000;
      const jobKind = 5100;

      const mockEncryptedContent = "mock-encrypted-content-from-service";
      const mockNip04Encrypt = vi.fn(() =>
        Effect.succeed(mockEncryptedContent),
      );
      const MockNIP04ServiceLayer = Layer.succeed(NIP04Service, {
        encrypt: mockNip04Encrypt,
        decrypt: vi.fn(() => Effect.succeed("decrypted")),
      });

      it("should create an encrypted NIP-90 event using NIP04Service", async () => {
        const program = createNip90JobRequest(
          sk,
          dvmPkHex,
          inputs,
          outputMimeType,
          bidMillisats,
          jobKind,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          const event = exit.value;
          expect(event.kind).toBe(jobKind);
          expect(event.content).toBe(mockEncryptedContent);
          expect(event.tags).toEqual(
            expect.arrayContaining([
              ["p", dvmPkHex],
              ["encrypted"],
              ["output", outputMimeType],
              ["bid", bidMillisats.toString()],
            ]),
          );
          expect(event.tags.some((t) => t[0] === "i")).toBe(false);
        }
        expect(mockNip04Encrypt).toHaveBeenCalledWith(
          sk,
          dvmPkHex,
          JSON.stringify([["i", "Test input data", "text"]]),
        );
        expect(mockedFinalizeEvent).toHaveBeenCalled();
      });

      it("should propagate NIP04EncryptError if encryption fails", async () => {
        const encryptError = new NIP04EncryptError({
          message: "Test encrypt error",
        });
        mockNip04Encrypt.mockReturnValueOnce(Effect.fail(encryptError));

        const program = createNip90JobRequest(
          sk,
          dvmPkHex,
          inputs,
          outputMimeType,
          bidMillisats,
          jobKind,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBe(encryptError);
        }
      });
    });
    ```

2.  **Modify `src/tests/unit/helpers/nip90/event_decryption.test.ts`:**

    ```typescript
    // src/tests/unit/helpers/nip90/event_decryption.test.ts
    import { describe, it, expect, vi } from "vitest";
    import { decryptNip04Content } from "@/helpers/nip90/event_decryption";
    import { NIP04Service, NIP04DecryptError } from "@/services/nip04";
    import { Effect, Exit, Layer, Cause, Option } from "effect";
    import { hexToBytes } from "@noble/hashes/utils";

    // Keep hexToBytes as actual import, we can spy on it if needed, or let it run.
    // If it fails, our error handling in decryptNip04Content should catch it.

    describe("decryptNip04Content", () => {
      const ourSkHex =
        "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"; // Valid 32-byte hex
      const theirPkHex =
        "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899"; // Valid 32-byte hex
      const encryptedContent = "encrypted?iv=iv";
      const decryptedPlaintext = "decrypted content";

      const mockNip04Decrypt = vi.fn(() => Effect.succeed(decryptedPlaintext));
      const MockNIP04ServiceLayer = Layer.succeed(NIP04Service, {
        encrypt: vi.fn(() => Effect.succeed("encrypted")),
        decrypt: mockNip04Decrypt,
      });

      it("should decrypt content using NIP04Service", async () => {
        const program = decryptNip04Content(
          ourSkHex,
          theirPkHex,
          encryptedContent,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          expect(exit.value).toBe(decryptedPlaintext);
        }
        const ourSkUint8Array = hexToBytes(ourSkHex);
        expect(mockNip04Decrypt).toHaveBeenCalledWith(
          ourSkUint8Array,
          theirPkHex,
          encryptedContent,
        );
      });

      it("should propagate NIP04DecryptError if decryption fails in service", async () => {
        const decryptError = new NIP04DecryptError({
          message: "Test decrypt error from service",
        });
        mockNip04Decrypt.mockReturnValueOnce(Effect.fail(decryptError));

        const program = decryptNip04Content(
          ourSkHex,
          theirPkHex,
          encryptedContent,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBe(decryptError);
        }
      });

      it("should return NIP04DecryptError if hexToBytes fails for secret key", async () => {
        const program = decryptNip04Content(
          "invalid-hex-sk",
          theirPkHex,
          encryptedContent,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBeInstanceOf(NIP04DecryptError);
          expect(error.message).toBe("Failed to convert secret key from hex");
          // error.cause would be the error from hexToBytes
          expect(error.cause).toBeInstanceOf(Error);
        }
      });
    });
    ```

3.  **Modify `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`:**

    ```typescript
    // src/tests/unit/components/nip90/Nip90RequestForm.test.tsx
    import React from 'react';
    import { render, screen, fireEvent, waitFor } from '@testing-library/react';
    import { describe, it, expect, vi, beforeEach } from 'vitest'; // Added beforeEach
    import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { Effect, Layer } from 'effect';

    import { NostrService as NostrServiceTag, DefaultNostrServiceConfigLayer, type NostrEvent } from '@/services/nostr';
    import { NIP04Service as NIP04ServiceTag } from '@/services/nip04';
    import * as nostrToolsPure from 'nostr-tools/pure';

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mock('nostr-tools/pure', async (importOriginal) => {
      const original = await importOriginal<typeof nostrToolsPure>();
      return {
        ...original,
        generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)),
        getPublicKey: vi.fn((sk) => original.getPublicKey(sk)),
        finalizeEvent: vi.fn((template, _sk) => ({
            ...template,
            id: 'mockEventId' + Date.now(),
            pubkey: original.getPublicKey(new Uint8Array(32).fill(1)), // Consistent with mocked generateSecretKey
            sig: 'mockSignature' + Date.now(),
            tags: template.tags || [],
            content: template.content,
        } as NostrEvent)),
      };
    });
    const mockedFinalizeEvent = nostrToolsPure.finalizeEvent as vi.Mock;


    const mockPublishEventActual = vi.fn(() => Effect.succeed(undefined));
    const MockNostrServiceLayer = Layer.succeed(NostrServiceTag, {
      getPool: vi.fn(), listEvents: vi.fn(), publishEvent: mockPublishEventActual, cleanupPool: vi.fn(),
    });

    const mockNip04EncryptFn = vi.fn(() => Effect.succeed("mock-encrypted-content-from-nip04-service"));
    const MockNIP04ServiceLayer = Layer.succeed(NIP04ServiceTag, {
      encrypt: mockNip04EncryptFn,
      decrypt: vi.fn(() => Effect.succeed("mock-decrypted-content")),
    });

    const TestAppFormLayer = Layer.mergeAll(
        Layer.provide(MockNostrServiceLayer, DefaultNostrServiceConfigLayer),
        MockNIP04ServiceLayer
    );

    const renderComponentWithTestLayer = () => render(
      <QueryClientProvider client={queryClient}>
        <Effect.Provider effect={TestAppFormLayer}>
          <Nip90RequestForm />
        </Effect.Provider>
      </QueryClientProvider>
    );

    describe('Nip90RequestForm', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('renders without crashing', () => {
            expect(() => renderComponentWithTestLayer()).not.toThrow();
            expect(screen.getByLabelText(/Job Kind/i)).toBeInTheDocument();
        });

        it('should update state when input fields are changed', () => {
            renderComponentWithTestLayer();
            const jobKindInput = screen.getByLabelText(/Job Kind/i) as HTMLInputElement;
            fireEvent.change(jobKindInput, { target: { value: '5001' } });
            expect(jobKindInput.value).toBe('5001');
        });

        it('should call NostrService and NIP04Service on submit with encrypted content', async () => {
            renderComponentWithTestLayer();

            fireEvent.change(screen.getByLabelText(/Job Kind/i), { target: { value: '5100' } });
            fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Encrypt this!' } });
            fireEvent.change(screen.getByLabelText(/Output MIME Type/i), { target: { value: 'text/special' } });
            fireEvent.change(screen.getByLabelText(/Bid Amount \(msats\)/i), { target: { value: '3000' } });

            fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));

            await waitFor(async () => {
                 expect(await screen.findByText(/Success! Event ID: mockEventId/i)).toBeInTheDocument();
            });

            expect(nostrToolsPure.generateSecretKey).toHaveBeenCalledTimes(1);

            expect(mockNip04EncryptFn).toHaveBeenCalledTimes(1);
            const expectedPlaintextForEncryption = JSON.stringify([['i', 'Encrypt this!', 'text']]);
            const ephemeralSkUsed = (nostrToolsPure.generateSecretKey as vi.Mock).mock.results[0].value;
            expect(mockNip04EncryptFn).toHaveBeenCalledWith(
                ephemeralSkUsed,
                expect.any(String),
                expectedPlaintextForEncryption
            );

            expect(mockPublishEventActual).toHaveBeenCalledTimes(1);
            const publishedEvent = mockPublishEventActual.mock.calls[0][0] as NostrEvent;

            expect(publishedEvent.kind).toBe(5100);
            expect(publishedEvent.content).toBe("mock-encrypted-content-from-nip04-service");
            expect(publishedEvent.tags).toEqual(expect.arrayContaining([
              ['p', expect.any(String)],
              ['encrypted'],
              ['output', 'text/special'],
              ['bid', '3000'],
            ]));
            expect(publishedEvent.tags.some(t => t[0] === 'i')).toBe(false);
        });

        it('should display loading, success, and error messages correctly', async () => {
            mockPublishEventActual.mockImplementationOnce(() =>
              Effect.suspend(() => new Promise(resolve => setTimeout(() => resolve(Effect.succeed(undefined)), 50)))
            );
            renderComponentWithTestLayer(); // Use the helper that provides the combined layer
            fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Test Feedback' } });
            fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));
            expect(await screen.findByText(/Publishing.../i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Publishing.../i})).toBeDisabled();

            expect(await screen.findByText(/Success! Event ID: mockEventId/i, {}, {timeout: 200})).toBeInTheDocument();

            mockPublishEventActual.mockImplementationOnce(() => Effect.fail(new Error("Custom Relay Error Publish")));
            renderComponentWithTestLayer();
            fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Another prompt for error' } });
            fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));
            expect(await screen.findByText(/Error: Publishing failed: Custom Relay Error Publish/i)).toBeInTheDocument();
          });
    });
    ```

After applying these changes, run `pnpm t` and `pnpm test` to ensure all checks and tests pass.
The key is that `createNip90JobRequest` now returns an `Effect` that requires `NIP04Service`, so the `handlePublishRequest` in the form component needs to incorporate this into its own `Effect` program and provide the `NIP04ServiceLive` layer. The component tests also need to be updated to provide a mock `NIP04Service` layer.Okay, I've created the `NIP04Service`, implemented it, and refactored the NIP-90 helper functions and their tests to use this new service.

Here are the specific changes:

**Phase 1 & 2: NIP04Service Definition and Implementation**

1.  **Created `src/services/nip04/NIP04Service.ts`:**

    ```typescript
    // src/services/nip04/NIP04Service.ts
    import { Effect, Context, Data } from "effect";

    // --- Custom Error Types ---
    export class NIP04EncryptError extends Data.TaggedError(
      "NIP04EncryptError",
    )<{
      readonly cause?: unknown;
      readonly message: string;
    }> {}

    export class NIP04DecryptError extends Data.TaggedError(
      "NIP04DecryptError",
    )<{
      readonly cause?: unknown;
      readonly message: string;
    }> {}

    // --- Service Interface ---
    export interface NIP04Service {
      /**
       * Encrypts plaintext using NIP-04.
       * @param ourSk - Our secret key (Uint8Array).
       * @param theirPkHex - Their public key (hex string).
       * @param plaintext - The text to encrypt.
       * @returns Effect with the NIP-04 encrypted string (ciphertext?iv=iv_base64).
       */
      encrypt(
        ourSk: Uint8Array,
        theirPkHex: string,
        plaintext: string,
      ): Effect.Effect<string, NIP04EncryptError>;

      /**
       * Decrypts NIP-04 ciphertext.
       * @param ourSk - Our secret key (Uint8Array).
       * @param theirPkHex - Their public key (hex string).
       * @param ciphertextWithIv - The NIP-04 encrypted string (ciphertext?iv=iv_base64).
       * @returns Effect with the decrypted plaintext string.
       */
      decrypt(
        ourSk: Uint8Array,
        theirPkHex: string,
        ciphertextWithIv: string,
      ): Effect.Effect<string, NIP04DecryptError>;
    }

    // --- Service Tag ---
    export const NIP04Service =
      Context.GenericTag<NIP04Service>("NIP04Service");
    ```

2.  **Created `src/services/nip04/NIP04ServiceImpl.ts`:**

    ```typescript
    // src/services/nip04/NIP04ServiceImpl.ts
    import { Effect, Layer } from "effect";
    import { nip04 } from "nostr-tools";
    import {
      NIP04Service,
      NIP04EncryptError,
      NIP04DecryptError,
    } from "./NIP04Service";

    export function createNIP04Service(): NIP04Service {
      return {
        encrypt: (ourSk: Uint8Array, theirPkHex: string, plaintext: string) =>
          Effect.tryPromise({
            try: () => nip04.encrypt(ourSk, theirPkHex, plaintext),
            catch: (cause) =>
              new NIP04EncryptError({
                message: "NIP-04 encryption failed",
                cause,
              }),
          }),

        decrypt: (
          ourSk: Uint8Array,
          theirPkHex: string,
          ciphertextWithIv: string,
        ) =>
          Effect.tryPromise({
            try: () => nip04.decrypt(ourSk, theirPkHex, ciphertextWithIv),
            catch: (cause) =>
              new NIP04DecryptError({
                message: "NIP-04 decryption failed",
                cause,
              }),
          }),
      };
    }

    export const NIP04ServiceLive = Layer.succeed(
      NIP04Service,
      createNIP04Service(),
    );
    ```

3.  **Created `src/services/nip04/index.ts`:**
    ```typescript
    // src/services/nip04/index.ts
    export * from "./NIP04Service";
    export * from "./NIP04ServiceImpl";
    ```

**Phase 3: Unit Test NIP04Service**

1.  **Created `src/tests/unit/services/nip04/NIP04Service.test.ts`:**

    ```typescript
    // src/tests/unit/services/nip04/NIP04Service.test.ts
    import { describe, it, expect, vi, beforeEach } from "vitest";
    import { Effect, Exit, Cause, Option, Layer } from "effect";
    import { nip04 } from "nostr-tools"; // To mock
    import {
      NIP04Service,
      NIP04ServiceLive,
      NIP04EncryptError,
      NIP04DecryptError,
    } from "@/services/nip04";
    import { generateSecretKey, getPublicKey } from "nostr-tools/pure"; // For generating test keys

    // Mock nostr-tools's nip04 module
    vi.mock("nostr-tools", async (importOriginal) => {
      const original = await importOriginal<typeof import("nostr-tools")>();
      return {
        ...original,
        nip04: {
          encrypt: vi.fn(),
          decrypt: vi.fn(),
        },
      };
    });

    // Typed mock functions
    const mockNip04Encrypt = nip04.encrypt as vi.MockedFunction<
      typeof nip04.encrypt
    >;
    const mockNip04Decrypt = nip04.decrypt as vi.MockedFunction<
      typeof nip04.decrypt
    >;

    describe("NIP04Service", () => {
      const ourSk = generateSecretKey();
      const theirPkHex = getPublicKey(generateSecretKey());
      const plaintext = "Hello, Nostr!";
      const ciphertextWithIv = "encryptedText?iv=someIv";

      beforeEach(() => {
        vi.clearAllMocks();
      });

      const runWithLayer = <E, A>(effect: Effect.Effect<A, E, NIP04Service>) =>
        Effect.runPromiseExit(Effect.provide(effect, NIP04ServiceLive));

      describe("encrypt", () => {
        it("should encrypt plaintext successfully", async () => {
          mockNip04Encrypt.mockResolvedValue(ciphertextWithIv);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.encrypt(ourSk, theirPkHex, plaintext),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isSuccess(exit)).toBe(true);
          if (Exit.isSuccess(exit)) {
            expect(exit.value).toBe(ciphertextWithIv);
          }
          expect(mockNip04Encrypt).toHaveBeenCalledWith(
            ourSk,
            theirPkHex,
            plaintext,
          );
        });

        it("should return NIP04EncryptError on encryption failure", async () => {
          const errorCause = new Error("Encryption library error");
          mockNip04Encrypt.mockRejectedValue(errorCause);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.encrypt(ourSk, theirPkHex, plaintext),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause).pipe(
              Option.getOrThrow,
            );
            expect(error).toBeInstanceOf(NIP04EncryptError);
            expect(error.message).toBe("NIP-04 encryption failed");
            expect(error.cause).toBe(errorCause);
          }
        });
      });

      describe("decrypt", () => {
        it("should decrypt ciphertext successfully", async () => {
          mockNip04Decrypt.mockResolvedValue(plaintext);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.decrypt(ourSk, theirPkHex, ciphertextWithIv),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isSuccess(exit)).toBe(true);
          if (Exit.isSuccess(exit)) {
            expect(exit.value).toBe(plaintext);
          }
          expect(mockNip04Decrypt).toHaveBeenCalledWith(
            ourSk,
            theirPkHex,
            ciphertextWithIv,
          );
        });

        it("should return NIP04DecryptError on decryption failure", async () => {
          const errorCause = new Error("Decryption library error");
          mockNip04Decrypt.mockRejectedValue(errorCause);

          const program = Effect.service(NIP04Service).pipe(
            Effect.flatMap((service) =>
              service.decrypt(ourSk, theirPkHex, ciphertextWithIv),
            ),
          );
          const exit = await runWithLayer(program);

          expect(Exit.isFailure(exit)).toBe(true);
          if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause).pipe(
              Option.getOrThrow,
            );
            expect(error).toBeInstanceOf(NIP04DecryptError);
            expect(error.message).toBe("NIP-04 decryption failed");
            expect(error.cause).toBe(errorCause);
          }
        });
      });
    });
    ```

**Phase 4: Refactor NIP-90 Helpers to use NIP04Service**

1.  **Modified `src/helpers/nip90/event_creation.ts`:**

    ```typescript
    // src/helpers/nip90/event_creation.ts
    import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
    import type { NostrEvent } from "@/services/nostr";
    import { NIP04Service, NIP04EncryptError } from "@/services/nip04";
    import { Effect } from "effect";

    export function createNip90JobRequest(
      requesterSk: Uint8Array,
      targetDvmPkHex: string,
      inputs: Array<[string, string, string?, string?, string?]>,
      outputMimeType: string = "text/plain",
      bidMillisats?: number,
      jobKind: number = 5100,
      additionalParams?: Array<[string, string, string]>,
    ): Effect.Effect<NostrEvent, NIP04EncryptError, NIP04Service> {
      return Effect.gen(function* (_) {
        const nip04Service = yield* _(NIP04Service);

        const jobParametersToEncrypt: Array<[string, ...string[]]> = [
          ...inputs.map(
            (inputParams) =>
              ["i", ...inputParams.filter((p) => p !== undefined)] as [
                string,
                ...string[],
              ],
          ),
        ];

        if (additionalParams) {
          jobParametersToEncrypt.push(...additionalParams);
        }

        const stringifiedParams = JSON.stringify(jobParametersToEncrypt);
        const encryptedContent = yield* _(
          nip04Service.encrypt(requesterSk, targetDvmPkHex, stringifiedParams),
        );

        const template: EventTemplate = {
          kind: jobKind,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ["p", targetDvmPkHex],
            ["encrypted"],
            ["output", outputMimeType],
          ],
          content: encryptedContent,
        };

        if (bidMillisats !== undefined && bidMillisats > 0) {
          template.tags.push(["bid", bidMillisats.toString()]);
        }

        return finalizeEvent(template, requesterSk) as NostrEvent;
      });
    }
    ```

2.  **Modified `src/components/nip90/Nip90RequestForm.tsx`:**

    ```typescript
    // src/components/nip90/Nip90RequestForm.tsx
    import React, { useState, ChangeEvent } from 'react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Textarea } from '@/components/ui/textarea';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { generateSecretKey } from 'nostr-tools/pure';
    import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
    import {
      NostrService,
      NostrServiceLive,
      DefaultNostrServiceConfigLayer,
      type NostrEvent
    } from '@/services/nostr';
    import { NIP04ServiceLive } from '@/services/nip04';
    import { Effect, Layer, Exit, Cause } from 'effect';

    const OUR_DVM_PUBKEY_HEX = "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245";

    export default function Nip90RequestForm() {
      const [jobKind, setJobKind] = useState<string>("5100");
      const [inputData, setInputData] = useState<string>("");
      const [outputMimeType, setOutputMimeType] = useState<string>("text/plain");
      const [bidAmount, setBidAmount] = useState<string>("");

      const [isPublishing, setIsPublishing] = useState(false);
      const [publishError, setPublishError] = useState<string | null>(null);
      const [publishedEventId, setPublishedEventId] = useState<string | null>(null);
      const [ephemeralSkHex, setEphemeralSkHex] = useState<string | null>(null);

      const handlePublishRequest = async () => {
        setIsPublishing(true);
        setPublishError(null);
        setPublishedEventId(null);
        // setEphemeralSkHex(null); // Keep ephemeralSkHex for potential re-display if publish fails but sk was generated

        if (!OUR_DVM_PUBKEY_HEX || OUR_DVM_PUBKEY_HEX === "your_dvm_public_key_hex_here") {
           setPublishError("DVM public key is not configured. Please replace the placeholder.");
           setIsPublishing(false);
           return;
        }

        try {
          const kind = parseInt(jobKind, 10);
          if (isNaN(kind) || kind < 5000 || kind > 5999) {
            setPublishError("Invalid Job Kind. Must be between 5000 and 5999.");
            setIsPublishing(false); return;
          }
          if (!inputData.trim()) {
            setPublishError("Input Data cannot be empty.");
            setIsPublishing(false); return;
          }
          const currentOutputMimeType = outputMimeType.trim() || "text/plain";
          if (!outputMimeType.trim()) setOutputMimeType(currentOutputMimeType);


          let bidNum: number | undefined = undefined;
          if (bidAmount) {
            const parsedBid = parseInt(bidAmount, 10);
            if (isNaN(parsedBid) || parsedBid < 0) {
              setPublishError("Invalid Bid Amount. Must be a non-negative number.");
              setIsPublishing(false); return;
            }
            bidNum = parsedBid;
          }

          const requesterSkUint8Array = generateSecretKey();
          const { bytesToHex } = await import('@noble/hashes/utils');
          const currentEphemeralSkHexValue = bytesToHex(requesterSkUint8Array); // Use a local var
          setEphemeralSkHex(currentEphemeralSkHexValue); // Set state for UI display

          const inputsForEncryption: Array<[string, string, string?, string?, string?]> = [[inputData.trim(), 'text']];

          const createRequestEventEffect = createNip90JobRequest(
            requesterSkUint8Array,
            OUR_DVM_PUBKEY_HEX,
            inputsForEncryption,
            currentOutputMimeType,
            bidNum,
            kind
          );

          const program = Effect.gen(function* (_) {
            const requestEvent = yield* _(createRequestEventEffect);
            console.log("Generated Encrypted NIP-90 Request Event:", JSON.stringify(requestEvent, null, 2));
            const nostrService = yield* _(NostrService);
            yield* _(nostrService.publishEvent(requestEvent));
            return requestEvent.id;
          });

          const fullLayer = Layer.mergeAll(
            Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer),
            NIP04ServiceLive
          );
          const exit = await Effect.runPromiseExit(Effect.provide(program, fullLayer));

          if (Exit.isSuccess(exit)) {
            console.log('Successfully published NIP-90 request. Event ID:', exit.value);
            setPublishedEventId(exit.value);

            if (currentEphemeralSkHexValue) {
              try {
                const storedRequests = JSON.parse(localStorage.getItem('nip90_requests') || '{}');
                storedRequests[exit.value] = {
                  secretKey: currentEphemeralSkHexValue,
                  createdAt: Date.now(),
                  kind: kind
                };
                localStorage.setItem('nip90_requests', JSON.stringify(storedRequests));
                console.log('Stored request details for later decryption');
              } catch (error) {
                console.error('Failed to store request details:', error);
              }
            }
          } else {
            console.error('Failed to publish NIP-90 request:', Cause.pretty(exit.cause));
            const underlyingError = Cause.failureOption(exit.cause);
            const errorMessage = underlyingError._tag === "Some" && underlyingError.value instanceof Error ?
                                 underlyingError.value.message : "Unknown error during publishing.";
            setPublishError(`Publishing failed: ${errorMessage}`);
          }
        } catch (error) {
          console.error("Error during request preparation:", error);
          setPublishError(error instanceof Error ? error.message : "An unexpected error occurred.");
        } finally {
          setIsPublishing(false);
        }
      };

      return (
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Create NIP-90 Job Request (Encrypted)</CardTitle>
            <CardDescription>Define and publish a new encrypted job request to the Nostr network for your DVM.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="jobKind">Job Kind</Label>
              <Input id="jobKind" type="number" value={jobKind} onChange={(e: ChangeEvent<HTMLInputElement>) => setJobKind(e.target.value)} placeholder="e.g., 5100" disabled={isPublishing} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inputData">Input Data (will be encrypted)</Label>
              <Textarea id="inputData" value={inputData} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputData(e.target.value)} placeholder="Enter the data for the job (e.g., a prompt for text generation)" rows={3} disabled={isPublishing} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="outputMimeType">Output MIME Type (public)</Label>
              <Input id="outputMimeType" value={outputMimeType} onChange={(e: ChangeEvent<HTMLInputElement>) => setOutputMimeType(e.target.value)} placeholder="e.g., text/plain" disabled={isPublishing} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bidAmount">Bid Amount (msats, public)</Label>
              <Input id="bidAmount" type="number" value={bidAmount} onChange={(e: ChangeEvent<HTMLInputElement>) => setBidAmount(e.target.value)} placeholder="Optional: e.g., 1000" disabled={isPublishing} />
            </div>
            {isPublishing && <p className="text-sm text-blue-500">Publishing...</p>}
            {publishError && <p className="text-sm text-destructive">Error: {publishError}</p>}
            {publishedEventId && (
               <div className="text-sm text-green-500">
                   <p>Success! Event ID: <code className="text-xs break-all">{publishedEventId}</code></p>
                   {ephemeralSkHex && <p className="mt-1 text-xs text-muted-foreground">Ephemeral SK (for debugging/decryption): <code className="text-xs break-all">{ephemeralSkHex}</code></p>}
               </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handlePublishRequest} className="w-full" disabled={isPublishing}>
              {isPublishing ? 'Publishing...' : 'Publish Encrypted Job Request'}
            </Button>
          </CardFooter>
        </Card>
      );
    }
    ```

3.  **Modified `src/helpers/nip90/event_decryption.ts`:**

    ```typescript
    // src/helpers/nip90/event_decryption.ts
    import { hexToBytes } from "@noble/hashes/utils";
    import { NIP04Service, NIP04DecryptError } from "@/services/nip04";
    import { Effect } from "effect";

    export function decryptNip04Content(
      ourSkHex: string,
      theirPkHex: string,
      encryptedContent: string,
    ): Effect.Effect<string, NIP04DecryptError, NIP04Service> {
      return Effect.gen(function* (_) {
        const nip04Service = yield* _(NIP04Service);
        try {
          const ourSkUint8Array = hexToBytes(ourSkHex);
          return yield* _(
            nip04Service.decrypt(ourSkUint8Array, theirPkHex, encryptedContent),
          );
        } catch (error) {
          return yield* _(
            Effect.fail(
              new NIP04DecryptError({
                message: "Failed to convert secret key from hex",
                cause: error,
              }),
            ),
          );
        }
      });
    }
    ```

**Phase 5: Update Tests for NIP-90 Helpers and Components**

1.  **Modified `src/tests/unit/helpers/nip90/event_creation.test.ts`:**

    ```typescript
    // src/tests/unit/helpers/nip90/event_creation.test.ts
    import { describe, it, expect, vi } from "vitest";
    import {
      generateSecretKey,
      getPublicKey,
      finalizeEvent,
    } from "nostr-tools/pure";
    import { createNip90JobRequest } from "@/helpers/nip90/event_creation";
    import type { NostrEvent } from "@/services/nostr";
    import { NIP04Service, NIP04EncryptError } from "@/services/nip04";
    import { Effect, Exit, Layer, Cause, Option } from "effect";

    vi.mock("nostr-tools/pure", async (importOriginal) => {
      const original =
        await importOriginal<typeof import("nostr-tools/pure")>();
      return {
        ...original,
        finalizeEvent: vi.fn((template, sk) => {
          const pk = original.getPublicKey(sk); // Use original.getPublicKey
          return {
            ...template,
            id: "mockEventId" + Date.now(),
            pubkey: pk,
            sig: "mockSignature" + Date.now(),
            tags: template.tags || [],
            content: template.content,
          } as NostrEvent;
        }),
      };
    });
    const mockedFinalizeEvent = finalizeEvent as vi.Mock;

    describe("createNip90JobRequest", () => {
      const sk = generateSecretKey();
      const dvmPkHex = getPublicKey(generateSecretKey());
      const inputs: Array<[string, string, string?, string?, string?]> = [
        ["Test input data", "text"],
      ];
      const outputMimeType = "text/plain";
      const bidMillisats = 1000;
      const jobKind = 5100;

      const mockEncryptedContent = "mock-encrypted-content-from-service";
      const mockNip04Encrypt = vi.fn(() =>
        Effect.succeed(mockEncryptedContent),
      );
      const MockNIP04ServiceLayer = Layer.succeed(NIP04Service, {
        encrypt: mockNip04Encrypt,
        decrypt: vi.fn(() => Effect.succeed("decrypted")),
      });

      it("should create an encrypted NIP-90 event using NIP04Service", async () => {
        const program = createNip90JobRequest(
          sk,
          dvmPkHex,
          inputs,
          outputMimeType,
          bidMillisats,
          jobKind,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          const event = exit.value;
          expect(event.kind).toBe(jobKind);
          expect(event.content).toBe(mockEncryptedContent);
          expect(event.tags).toEqual(
            expect.arrayContaining([
              ["p", dvmPkHex],
              ["encrypted"],
              ["output", outputMimeType],
              ["bid", bidMillisats.toString()],
            ]),
          );
          expect(event.tags.some((t) => t[0] === "i")).toBe(false);
        }
        expect(mockNip04Encrypt).toHaveBeenCalledWith(
          sk,
          dvmPkHex,
          JSON.stringify([["i", "Test input data", "text"]]),
        );
        expect(mockedFinalizeEvent).toHaveBeenCalled();
      });

      it("should propagate NIP04EncryptError if encryption fails", async () => {
        const encryptError = new NIP04EncryptError({
          message: "Test encrypt error",
        });
        mockNip04Encrypt.mockReturnValueOnce(Effect.fail(encryptError));

        const program = createNip90JobRequest(
          sk,
          dvmPkHex,
          inputs,
          outputMimeType,
          bidMillisats,
          jobKind,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBe(encryptError);
        }
      });
    });
    ```

2.  **Modified `src/tests/unit/helpers/nip90/event_decryption.test.ts`:**

    ```typescript
    // src/tests/unit/helpers/nip90/event_decryption.test.ts
    import { describe, it, expect, vi } from "vitest";
    import { decryptNip04Content } from "@/helpers/nip90/event_decryption";
    import { NIP04Service, NIP04DecryptError } from "@/services/nip04";
    import { Effect, Exit, Layer, Cause, Option } from "effect";
    import { hexToBytes } from "@noble/hashes/utils";

    describe("decryptNip04Content", () => {
      const ourSkHex =
        "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";
      const theirPkHex =
        "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
      const encryptedContent = "encrypted?iv=iv";
      const decryptedPlaintext = "decrypted content";

      const mockNip04Decrypt = vi.fn(() => Effect.succeed(decryptedPlaintext));
      const MockNIP04ServiceLayer = Layer.succeed(NIP04Service, {
        encrypt: vi.fn(() => Effect.succeed("encrypted")),
        decrypt: mockNip04Decrypt,
      });

      it("should decrypt content using NIP04Service", async () => {
        const program = decryptNip04Content(
          ourSkHex,
          theirPkHex,
          encryptedContent,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          expect(exit.value).toBe(decryptedPlaintext);
        }
        const ourSkUint8Array = hexToBytes(ourSkHex);
        expect(mockNip04Decrypt).toHaveBeenCalledWith(
          ourSkUint8Array,
          theirPkHex,
          encryptedContent,
        );
      });

      it("should propagate NIP04DecryptError if decryption fails in service", async () => {
        const decryptError = new NIP04DecryptError({
          message: "Test decrypt error from service",
        });
        mockNip04Decrypt.mockReturnValueOnce(Effect.fail(decryptError));

        const program = decryptNip04Content(
          ourSkHex,
          theirPkHex,
          encryptedContent,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBe(decryptError);
        }
      });

      it("should return NIP04DecryptError if hexToBytes fails for secret key", async () => {
        const program = decryptNip04Content(
          "invalid-hex-sk",
          theirPkHex,
          encryptedContent,
        );
        const exit = await Effect.runPromiseExit(
          Effect.provide(program, MockNIP04ServiceLayer),
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBeInstanceOf(NIP04DecryptError);
          expect(error.message).toBe("Failed to convert secret key from hex");
          expect(error.cause).toBeInstanceOf(Error);
        }
      });
    });
    ```

3.  **Modified `src/tests/unit/components/nip90/Nip90RequestForm.test.tsx`:**

    ```typescript
    // src/tests/unit/components/nip90/Nip90RequestForm.test.tsx
    import React from 'react';
    import { render, screen, fireEvent, waitFor } from '@testing-library/react';
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import Nip90RequestForm from '@/components/nip90/Nip90RequestForm';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { Effect, Layer } from 'effect';

    import { NostrService as NostrServiceTag, DefaultNostrServiceConfigLayer, type NostrEvent } from '@/services/nostr';
    import { NIP04Service as NIP04ServiceTag } from '@/services/nip04';
    import * as nostrToolsPure from 'nostr-tools/pure';

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mock('nostr-tools/pure', async (importOriginal) => {
      const original = await importOriginal<typeof nostrToolsPure>();
      return {
        ...original,
        generateSecretKey: vi.fn(() => new Uint8Array(32).fill(1)), // Returns Uint8Array
        getPublicKey: vi.fn((sk) => original.getPublicKey(sk)),
        finalizeEvent: vi.fn((template, _sk) => ({ // _sk is the Uint8Array from generateSecretKey
            ...template,
            id: 'mockEventId' + Date.now(),
            pubkey: original.getPublicKey(new Uint8Array(32).fill(1)),
            sig: 'mockSignature' + Date.now(),
            tags: template.tags || [],
            content: template.content, // This will be the mocked encrypted content
        } as NostrEvent)),
      };
    });
    // const mockedFinalizeEvent = nostrToolsPure.finalizeEvent as vi.Mock; // Not directly needed now


    const mockPublishEventActual = vi.fn(() => Effect.succeed(undefined));
    const MockNostrServiceLayer = Layer.succeed(NostrServiceTag, {
      getPool: vi.fn(() => Effect.die("Not implemented")),
      listEvents: vi.fn(() => Effect.die("Not implemented")),
      publishEvent: mockPublishEventActual,
      cleanupPool: vi.fn(() => Effect.die("Not implemented")),
    });

    const mockNip04EncryptFn = vi.fn(() => Effect.succeed("mock-encrypted-content-from-nip04-service"));
    const MockNIP04ServiceLayer = Layer.succeed(NIP04ServiceTag, {
      encrypt: mockNip04EncryptFn,
      decrypt: vi.fn(() => Effect.succeed("mock-decrypted-content")),
    });

    const TestAppFormLayer = Layer.mergeAll(
        Layer.provide(MockNostrServiceLayer, DefaultNostrServiceConfigLayer),
        MockNIP04ServiceLayer
    );

    const renderComponentWithTestLayer = () => render(
      <QueryClientProvider client={queryClient}>
        <Effect.Provider effect={TestAppFormLayer}>
          <Nip90RequestForm />
        </Effect.Provider>
      </QueryClientProvider>
    );

    describe('Nip90RequestForm', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('renders without crashing', () => {
            expect(() => renderComponentWithTestLayer()).not.toThrow();
            expect(screen.getByLabelText(/Job Kind/i)).toBeInTheDocument();
        });

        it('should update state when input fields are changed', () => {
            renderComponentWithTestLayer();
            const jobKindInput = screen.getByLabelText(/Job Kind/i) as HTMLInputElement;
            fireEvent.change(jobKindInput, { target: { value: '5001' } });
            expect(jobKindInput.value).toBe('5001');
            // Add more state update checks if necessary
        });

        it('should call NostrService and NIP04Service on submit with encrypted content', async () => {
            renderComponentWithTestLayer();

            fireEvent.change(screen.getByLabelText(/Job Kind/i), { target: { value: '5100' } });
            fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Encrypt this!' } });
            fireEvent.change(screen.getByLabelText(/Output MIME Type/i), { target: { value: 'text/special' } });
            fireEvent.change(screen.getByLabelText(/Bid Amount \(msats\)/i), { target: { value: '3000' } });

            fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));

            await waitFor(async () => {
                 expect(await screen.findByText(/Success! Event ID: mockEventId/i)).toBeInTheDocument();
            });

            expect(nostrToolsPure.generateSecretKey).toHaveBeenCalledTimes(1);

            expect(mockNip04EncryptFn).toHaveBeenCalledTimes(1);
            const expectedPlaintextForEncryption = JSON.stringify([['i', 'Encrypt this!', 'text']]);
            // Get the SK that was generated by the mocked generateSecretKey
            const ephemeralSkUsed = (nostrToolsPure.generateSecretKey as vi.Mock).mock.results[0].value as Uint8Array;
            expect(mockNip04EncryptFn).toHaveBeenCalledWith(
                ephemeralSkUsed,
                expect.any(String),
                expectedPlaintextForEncryption
            );

            expect(mockPublishEventActual).toHaveBeenCalledTimes(1);
            const publishedEvent = mockPublishEventActual.mock.calls[0][0] as NostrEvent;

            expect(publishedEvent.kind).toBe(5100);
            expect(publishedEvent.content).toBe("mock-encrypted-content-from-nip04-service");
            expect(publishedEvent.tags).toEqual(expect.arrayContaining([
              ['p', expect.any(String)],
              ['encrypted'],
              ['output', 'text/special'],
              ['bid', '3000'],
            ]));
            expect(publishedEvent.tags.some(t => t[0] === 'i')).toBe(false);
        });

        it('should display loading, success, and error messages correctly', async () => {
            mockPublishEventActual.mockImplementationOnce(() =>
              Effect.suspend(() => new Promise(resolve => setTimeout(() => resolve(Effect.succeed(undefined)), 50)))
            );
            renderComponentWithTestLayer();
            fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Test Feedback' } }); // Ensure form is valid
            fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));
            expect(await screen.findByText(/Publishing.../i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Publishing.../i})).toBeDisabled();

            expect(await screen.findByText(/Success! Event ID: mockEventId/i, {}, {timeout: 200})).toBeInTheDocument();

            mockPublishEventActual.mockImplementationOnce(() => Effect.fail(new Error("Custom Relay Error Publish")));
            renderComponentWithTestLayer();
            fireEvent.change(screen.getByLabelText(/Input Data/i), { target: { value: 'Another prompt for error' } }); // Ensure form is valid
            fireEvent.click(screen.getByRole('button', { name: /Publish Encrypted Job Request/i }));
            expect(await screen.findByText(/Error: Publishing failed: Custom Relay Error Publish/i)).toBeInTheDocument();
          });
    });
    ```

All tests and type checks should pass after these changes. The application will now use the `NIP04Service` for encryption within the NIP-90 request creation flow.
