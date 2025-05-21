import { describe, it, expect, vi } from "vitest";
import { decryptNip04Content } from "@/helpers/nip90/event_decryption";
import { NIP04Service, NIP04DecryptError } from "@/services/nip04";
import { Effect, Exit, Layer, Cause, Option } from "effect";
import { hexToBytes } from "@noble/hashes/utils";

// Mock hexToBytes for testing
vi.mock("@noble/hashes/utils", () => ({
  hexToBytes: vi.fn().mockImplementation((hex) => {
    // For valid test hex strings, return a valid Uint8Array
    if (
      hex === "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
    ) {
      return new Uint8Array(32).fill(1);
    }
    // For invalid hex strings, throw an error like the real function would
    if (hex === "invalid-hex-sk") {
      throw new Error("Invalid hex string");
    }
    // Default fallback
    return new Uint8Array([1, 2, 3, 4]);
  }),
}));

describe("decryptNip04Content", () => {
  it("module can be imported", () => {
    expect(typeof decryptNip04Content).toBe("function");
  });

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
    const program = decryptNip04Content(ourSkHex, theirPkHex, encryptedContent);
    const exit = await Effect.runPromiseExit(
      Effect.provide(program, MockNIP04ServiceLayer),
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toBe(decryptedPlaintext);
    }

    // Verify correct parameters were passed to the service
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
    mockNip04Decrypt.mockReturnValueOnce(Effect.fail(decryptError) as any);

    const program = decryptNip04Content(ourSkHex, theirPkHex, encryptedContent);
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
