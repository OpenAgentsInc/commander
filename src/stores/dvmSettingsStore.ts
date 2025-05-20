// src/stores/dvmSettingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DefaultTextGenerationJobConfig, Kind5050DVMServiceConfig } from '@/services/dvm/Kind5050DVMService';
import { defaultKind5050DVMServiceConfig } from '@/services/dvm/Kind5050DVMService';
import { getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/**
 * User-configurable settings for the DVM (Data Vending Machine)
 */
export interface DVMUserSettings {
  dvmPrivateKeyHex?: string; // Optional: if not set, service uses hardcoded dev default
  relaysCsv?: string; // Comma-separated string of relay URLs
  supportedJobKindsCsv?: string; // Comma-separated string of kind numbers
  textGenerationConfig?: Partial<DefaultTextGenerationJobConfig>;
}

/**
 * Store state and actions for DVM settings
 */
interface DVMSettingsStoreState {
  settings: DVMUserSettings;
  updateSettings: (newSettings: Partial<DVMUserSettings>) => void;
  resetSettings: () => void;
  getEffectivePrivateKeyHex: () => string;
  getEffectiveRelays: () => string[];
  getEffectiveSupportedJobKinds: () => number[];
  getEffectiveTextGenerationConfig: () => DefaultTextGenerationJobConfig;
  getDerivedPublicKeyHex: () => string | null;
  // New method to get a complete effective configuration
  getEffectiveConfig: () => Kind5050DVMServiceConfig;
}

// Get default config directly from the exported configuration object
const defaultConfigValues = defaultKind5050DVMServiceConfig;

export const useDVMSettingsStore = create<DVMSettingsStoreState>()(
  persist(
    (set, get) => ({
      settings: {}, // Initial user settings are empty

      // Update settings
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // Reset to defaults
      resetSettings: () => set({ settings: {} }),

      // Get effective private key (user setting or default)
      getEffectivePrivateKeyHex: () => {
        return get().settings.dvmPrivateKeyHex || defaultConfigValues.dvmPrivateKeyHex;
      },

      // Derive public key from private key
      getDerivedPublicKeyHex: () => {
        const skHex = get().settings.dvmPrivateKeyHex;
        if (!skHex) return defaultConfigValues.dvmPublicKeyHex;
        
        try {
          return getPublicKey(hexToBytes(skHex));
        } catch (e) {
          console.warn("Could not derive public key from stored private key:", e);
          return defaultConfigValues.dvmPublicKeyHex;
        }
      },

      // Get effective relays (user setting or default)
      getEffectiveRelays: () => {
        const userRelaysCsv = get().settings.relaysCsv;
        if (!userRelaysCsv) return defaultConfigValues.relays;

        const userRelays = userRelaysCsv
          .split('\n')
          .map(r => r.trim())
          .filter(r => r.length > 0);

        return userRelays.length > 0 ? userRelays : defaultConfigValues.relays;
      },

      // Get effective job kinds (user setting or default)
      getEffectiveSupportedJobKinds: () => {
        const userKindsCsv = get().settings.supportedJobKindsCsv;
        if (!userKindsCsv) return defaultConfigValues.supportedJobKinds;

        const userKinds = userKindsCsv
          .split(',')
          .map(k => parseInt(k.trim(), 10))
          .filter(k => !isNaN(k));

        return userKinds.length > 0 ? userKinds : defaultConfigValues.supportedJobKinds;
      },

      // Get effective text generation config (merged user + default)
      getEffectiveTextGenerationConfig: () => {
        const userConfig = get().settings.textGenerationConfig || {};
        return {
          ...defaultConfigValues.defaultTextGenerationJobConfig,
          ...userConfig,
        };
      },
      
      // Get complete effective configuration
      getEffectiveConfig: () => {
        const privateKeyHex = get().getEffectivePrivateKeyHex();
        const derivedPublicKeyHex = get().getDerivedPublicKeyHex() || defaultConfigValues.dvmPublicKeyHex;
        const relays = get().getEffectiveRelays();
        const supportedJobKinds = get().getEffectiveSupportedJobKinds();
        const textGenerationConfig = get().getEffectiveTextGenerationConfig();
        
        return {
          active: defaultConfigValues.active,
          dvmPrivateKeyHex: privateKeyHex,
          dvmPublicKeyHex: derivedPublicKeyHex,
          relays,
          supportedJobKinds,
          defaultTextGenerationJobConfig: textGenerationConfig,
        };
      },
    }),
    {
      name: 'dvm-user-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);