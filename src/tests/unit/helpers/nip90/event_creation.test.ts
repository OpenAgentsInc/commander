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

// Mock finalizeEvent
vi.mock("nostr-tools/pure", async (importOriginal) => {
  const original = await importOriginal<typeof import("nostr-tools/pure")>();
  return {
    ...original,
    finalizeEvent: vi.fn((template, sk) => {
      const pk = original.getPublicKey(sk);
      return {
        ...template,
        id: "mock-event-id",
        pubkey: pk,
        sig: "mock-signature",
        tags: template.tags || [],
        content: template.content,
      } as NostrEvent;
    }),
  };
});
const mockedFinalizeEvent = finalizeEvent as ReturnType<typeof vi.fn>;

describe("createNip90JobRequest", () => {
  it("module can be imported", () => {
    expect(typeof createNip90JobRequest).toBe("function");
  });

  it("should create an encrypted NIP-90 event using NIP04Service", async () => {
    const sk = generateSecretKey();
    const dvmPkHex = getPublicKey(generateSecretKey());
    const inputs: Array<[string, string, string?, string?, string?]> = [
      ["Test input data", "text"],
    ];
    const outputMimeType = "text/plain";
    const bidMillisats = 1000;
    const jobKind = 5100;

    const mockEncryptedContent = "mock-encrypted-content-from-service";
    const mockNip04Encrypt = vi.fn(() => Effect.succeed(mockEncryptedContent));

    // Create a mock NIP04Service layer
    const MockNIP04ServiceLayer = Layer.succeed(NIP04Service, {
      encrypt: mockNip04Encrypt,
      decrypt: vi.fn(() => Effect.succeed("decrypted")), // Mock decrypt as well
    });

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
      expect(event.id).toBe("mock-event-id");
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

    // Verify that the encrypt function was called with correct arguments
    expect(mockNip04Encrypt).toHaveBeenCalledWith(
      sk,
      dvmPkHex,
      JSON.stringify([["i", "Test input data", "text"]]),
    );
    expect(mockedFinalizeEvent).toHaveBeenCalled();
  });

  it("should propagate NIP04EncryptError if encryption fails", async () => {
    const sk = generateSecretKey();
    const dvmPkHex = getPublicKey(generateSecretKey());
    const inputs: Array<[string, string, string?, string?, string?]> = [
      ["Test input data", "text"],
    ];
    const outputMimeType = "text/plain";
    const bidMillisats = 1000;
    const jobKind = 5100;

    const encryptError = new NIP04EncryptError({
      message: "Test encrypt error",
    });
    const mockNip04Encrypt = vi.fn(() => Effect.fail(encryptError) as any);

    const MockNIP04ServiceLayer = Layer.succeed(NIP04Service, {
      encrypt: mockNip04Encrypt,
      decrypt: vi.fn(() => Effect.succeed("decrypted")),
    });

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
