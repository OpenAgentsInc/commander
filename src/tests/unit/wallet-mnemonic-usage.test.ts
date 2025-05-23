import { describe, it, expect, beforeEach, vi } from "vitest";
import { Effect, Exit } from "effect";
import { globalWalletConfig } from "@/services/walletConfig";
import { buildFullAppLayer } from "@/services/runtime";
import { SparkService, SparkServiceConfigTag } from "@/services/spark";

// Mock tiny-secp256k1 to avoid ECC library errors
vi.mock("tiny-secp256k1", () => ({
  default: {
    isPoint: () => true,
    pointFromScalar: () => new Uint8Array(33),
    pointCompress: () => new Uint8Array(33),
    pointMultiply: () => new Uint8Array(33),
    privateAdd: () => new Uint8Array(32),
    sign: () => new Uint8Array(64),
    verify: () => true,
  },
}));

describe("Wallet Mnemonic Usage", () => {
  beforeEach(() => {
    // Reset global wallet config
    globalWalletConfig.mnemonic = null;
  });

  it("should use test mnemonic when no user wallet is set", async () => {
    // Build app layer with no user mnemonic
    const layer = buildFullAppLayer();
    
    // Extract the SparkServiceConfig from the layer to verify mnemonic
    const configProgram = Effect.flatMap(
      Effect.serviceOption(SparkServiceConfigTag),
      (configOption) => 
        configOption._tag === "Some" 
          ? Effect.succeed(configOption.value)
          : Effect.fail(new Error("SparkServiceConfig not found"))
    );
    
    const result = await Effect.runPromiseExit(
      Effect.provide(configProgram, layer)
    );
    
    expect(Exit.isSuccess(result)).toBe(true);
    if (Exit.isSuccess(result)) {
      expect(result.value.mnemonicOrSeed).toBe("test test test test test test test test test test test junk");
    }
  });

  it("should use user's mnemonic when wallet is initialized", async () => {
    const userMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    // Set user's mnemonic
    globalWalletConfig.mnemonic = userMnemonic;
    
    // Build app layer with user mnemonic
    const layer = buildFullAppLayer();
    
    // Extract the SparkServiceConfig from the layer to verify mnemonic
    const configProgram = Effect.flatMap(
      Effect.serviceOption(SparkServiceConfigTag),
      (configOption) => 
        configOption._tag === "Some" 
          ? Effect.succeed(configOption.value)
          : Effect.fail(new Error("SparkServiceConfig not found"))
    );
    
    const result = await Effect.runPromiseExit(
      Effect.provide(configProgram, layer)
    );
    
    expect(Exit.isSuccess(result)).toBe(true);
    if (Exit.isSuccess(result)) {
      expect(result.value.mnemonicOrSeed).toBe(userMnemonic);
    }
  });

  it("should log the correct mnemonic when building SparkService layer", async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    // Test with default mnemonic
    buildFullAppLayer();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Runtime] Building SparkService layer with mnemonic: test test ")
    );
    
    // Test with user mnemonic
    const userMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    globalWalletConfig.mnemonic = userMnemonic;
    
    buildFullAppLayer();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Runtime] Building SparkService layer with mnemonic: abandon ab")
    );
    
    consoleSpy.mockRestore();
  });
});