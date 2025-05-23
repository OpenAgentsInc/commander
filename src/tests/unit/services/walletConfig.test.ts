import { describe, it, expect, beforeEach } from "vitest";
import { globalWalletConfig } from "@/services/walletConfig";

describe("Wallet Configuration", () => {
  beforeEach(() => {
    // Reset to default state before each test
    globalWalletConfig.mnemonic = null;
  });

  it("should start with null mnemonic", () => {
    expect(globalWalletConfig.mnemonic).toBeNull();
  });

  it("should allow setting a mnemonic", () => {
    const testMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    globalWalletConfig.mnemonic = testMnemonic;
    expect(globalWalletConfig.mnemonic).toBe(testMnemonic);
  });

  it("should allow clearing the mnemonic", () => {
    globalWalletConfig.mnemonic = "test mnemonic";
    expect(globalWalletConfig.mnemonic).not.toBeNull();
    
    globalWalletConfig.mnemonic = null;
    expect(globalWalletConfig.mnemonic).toBeNull();
  });
});