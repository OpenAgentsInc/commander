import { describe, it, expect, beforeEach } from "vitest";
import { globalWalletConfig } from "@/services/walletConfig";

describe("Wallet Config Simple Tests", () => {
  beforeEach(() => {
    // Reset global wallet config
    globalWalletConfig.mnemonic = null;
  });

  it("should start with null mnemonic", () => {
    expect(globalWalletConfig.mnemonic).toBeNull();
  });

  it("should allow setting user mnemonic", () => {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    globalWalletConfig.mnemonic = testMnemonic;
    expect(globalWalletConfig.mnemonic).toBe(testMnemonic);
  });

  it("should reset mnemonic to null", () => {
    globalWalletConfig.mnemonic = "some test mnemonic";
    globalWalletConfig.mnemonic = null;
    expect(globalWalletConfig.mnemonic).toBeNull();
  });
});