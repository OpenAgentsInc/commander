/**
 * Global wallet configuration
 * This is used to pass the user's mnemonic to the SparkService
 */
export interface WalletConfig {
  mnemonic: string | null;
}

// Global instance - will be set by walletStore when user initializes wallet
export const globalWalletConfig: WalletConfig = {
  mnemonic: null,
};