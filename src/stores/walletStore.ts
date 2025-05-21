// src/stores/walletStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Effect } from 'effect';
import { BIP39Service } from '@/services/bip39';
// Import SparkService for initialization
import { SparkService } from '@/services/spark';
import { getMainRuntime } from '@/services/runtime';

interface WalletState {
  seedPhrase: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  hasSeenSelfCustodyNotice: boolean;
}

interface WalletActions {
  generateNewWallet: () => Promise<string | null>; // Returns seed phrase or null on error
  restoreWallet: (mnemonic: string) => Promise<boolean>; // Returns true on success, false on error
  getSeedPhrase: () => string | null;
  logout: () => void;
  setHasSeenSelfCustodyNotice: () => void;
  clearError: () => void;
  // Internal method to initialize wallet with seed
  _initializeWalletWithSeed: (mnemonic: string, isNewWallet: boolean) => Promise<boolean>;
  // Internal method to initialize dependent services
  _initializeServices: (mnemonic: string) => Promise<void>;
}

export const useWalletStore = create<WalletState & WalletActions>()(
  persist(
    (set, get) => ({
      seedPhrase: null,
      isInitialized: false,
      isLoading: false,
      error: null,
      hasSeenSelfCustodyNotice: false,

      generateNewWallet: async () => {
        set({ isLoading: true, error: null });
        const runtime = getMainRuntime();
        const program = Effect.flatMap(BIP39Service, bip39 => bip39.generateMnemonic({ strength: 128 }));
        const result = await Effect.runPromiseExit(Effect.provide(program, runtime));

        if (result._tag === 'Success') {
          const newSeedPhrase = result.value;
          // DO NOT set isInitialized or seedPhrase here yet.
          // This will be done after user confirms backup.
          set({ isLoading: false });
          return newSeedPhrase;
        } else {
          const error = result.cause;
          console.error("Failed to generate mnemonic:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "Failed to generate seed phrase" 
          });
          return null;
        }
      },

      // This action is called AFTER user confirms backup of a NEWLY generated seed
      // or after successful RESTORE.
      _initializeWalletWithSeed: async (mnemonic: string, isNewWallet: boolean) => {
        set({ isLoading: true, error: null });
        
        try {
          // Initialize the SparkService and other dependent services
          await get()._initializeServices(mnemonic);
          
          set({
            seedPhrase: mnemonic, // Now store the seed
            isInitialized: true,
            isLoading: false,
            error: null,
            hasSeenSelfCustodyNotice: isNewWallet ? false : get().hasSeenSelfCustodyNotice, // Reset notice for new wallet
          });
          return true;
        } catch (error) {
          console.error("Failed to initialize wallet with seed:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "Failed to initialize wallet" 
          });
          return false;
        }
      },

      restoreWallet: async (mnemonic: string) => {
        set({ isLoading: true, error: null });
        const runtime = getMainRuntime();
        const validateProgram = Effect.flatMap(BIP39Service, bip39 => bip39.validateMnemonic(mnemonic.trim()));
        const validationResult = await Effect.runPromiseExit(Effect.provide(validateProgram, runtime));

        if (validationResult._tag === 'Success' && validationResult.value) {
          // Mnemonic is valid, now finalize by calling _initializeWalletWithSeed
          return get()._initializeWalletWithSeed(mnemonic.trim(), false);
        } else {
          const errorMsg = (validationResult._tag === 'Failure')
            ? validationResult.cause instanceof Error ? validationResult.cause.message : "Validation error"
            : "Invalid seed phrase.";
          set({ isLoading: false, error: errorMsg });
          return false;
        }
      },

      getSeedPhrase: () => get().seedPhrase,

      logout: () => {
        // Clear wallet state in the store
        console.log("Logging out, clearing seed phrase and initialization state.");
        set({ seedPhrase: null, isInitialized: false, isLoading: false, error: null });
        // Note: In a production app, you would also need to reinitialize services
        // or trigger a full app reload to ensure clean state
      },

      setHasSeenSelfCustodyNotice: () => {
        set({ hasSeenSelfCustodyNotice: true });
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      _initializeServices: async (mnemonic: string) => {
        // This is a conceptual placeholder. The actual implementation would need to
        // reinitialize the runtime or modify the SparkService config layer.
        console.log(`WalletStore: Initializing services with mnemonic starting with: ${mnemonic.substring(0,5)}...`);
        
        // In a full implementation, we would need to:
        // 1. Create a new SparkServiceConfig with the provided mnemonic
        // 2. Create a new runtime with updated layers (or modify existing layers)
        // 3. Replace the current runtime or update service implementations
        
        // For this implementation, we're simulating the service initialization
        await new Promise(r => setTimeout(r, 500)); // Simulate async initialization
        console.log("WalletStore: Services initialized.");
      },
    }),
    {
      name: 'commander-wallet-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ // Only persist these fields
        seedPhrase: state.seedPhrase, // Consider encrypting this in a full implementation
        isInitialized: state.isInitialized,
        hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
      }),
      onRehydrateStorage: () => (state) => {
        // When rehydrating, if a seed phrase exists, ensure services are initialized.
        if (state?.seedPhrase && state?.isInitialized) {
          console.log("Rehydrating wallet store, found existing seed phrase. Initializing services...");
          // Initialize services with the stored seed phrase
          state._initializeServices(state.seedPhrase);
        }
      }
    }
  )
);