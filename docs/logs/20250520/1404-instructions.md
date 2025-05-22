Okay, Agent, the next phase for the `SELLING_COMPUTE` feature is to implement **User-Configurable DVM Settings**, including pricing.

This involves:

1.  Creating a persistent store for user-defined DVM settings.
2.  Building a UI (dialog) for users to modify these settings.
3.  Integrating these settings into the `Kind5050DVMService` so it uses them for its operations (identity, relays, job kinds, pricing, model parameters).

**Phase 1: DVM Settings Store and Configuration**

1.  **Define `DVMUserSettings` Interface and Store:**

    - **File:** `src/stores/dvmSettingsStore.ts` (Create this new file)
    - **Purpose:** Store user-configurable DVM settings using Zustand with `persist` middleware for `localStorage`.
    - **Interface `DVMUserSettings`:**
      - `dvmPrivateKeyHex?: string` (User's DVM Nostr private key. If not set, the service will use its hardcoded dev default)
      - `dvmPublicKeyHex?: string` (Read-only, derived automatically from `dvmPrivateKeyHex` by the UI)
      - `relaysCsv?: string` (Comma-separated string of relay URLs)
      - `supportedJobKindsCsv?: string` (Comma-separated string of kind numbers, e.g., "5100, 5050")
      - `textGenerationConfig?: Partial<DefaultTextGenerationJobConfig>` (Allow partial overrides of text generation params)
    - **Store State:** `settings: DVMUserSettings` (initial state: `{}`)
    - **Store Actions:**
      - `updateSettings(newSettings: Partial<DVMUserSettings>)`: Updates the settings.
      - `resetSettings()`: Resets settings to an empty object, effectively reverting to defaults used by the service.
      - `getEffectivePrivateKeyHex(): string`: Returns user's SK or the default dev SK from `DefaultKind5050DVMServiceConfigLayer`.
      - `getEffectiveRelays(): string[]`: Returns user's relays or defaults.
      - `getEffectiveSupportedJobKinds(): number[]`: Returns user's kinds or defaults.
      - `getEffectiveTextGenerationConfig(): DefaultTextGenerationJobConfig`: Returns merged user and default text gen config.

2.  **Update `src/services/dvm/Kind5050DVMService.ts`:**
    - No direct changes needed to `Kind5050DVMServiceConfig` or `DefaultKind5050DVMServiceConfigLayer`. These will continue to provide the application's _default_ DVM settings. The service implementation will now prioritize user settings from the new store.

**Phase 2: UI for DVM Settings**

1.  **Create `DVMSettingsDialog.tsx` Component:**

    - **File:** `src/components/dvm/DVMSettingsDialog.tsx` (Create new folder `src/components/dvm` and this file)
    - **UI:** Use Shadcn UI components (`Dialog`, `Input`, `Label`, `Textarea`, `Button`, etc.).
    - **Form Fields:**
      - **DVM Private Key:** `Textarea` for `dvmPrivateKeyHex`. Display a prominent security warning about handling private keys.
      - **DVM Public Key:** Read-only `Input`, derived from `dvmPrivateKeyHex` in the UI using `getPublicKey` from `nostr-tools/pure`. Updates automatically when the private key changes.
      - **Relays:** `Textarea` for `relaysCsv`. Users enter one relay URL per line. (The store will handle parsing/splitting).
      - **Supported Job Kinds:** `Textarea` for `supportedJobKindsCsv`. Users enter comma-separated kind numbers (e.g., "5100, 5000").
      - **Text Generation Config Section:**
        - Model: `Input` for `textGenerationConfig.model`.
        - Max Tokens: `Input type="number"` for `textGenerationConfig.max_tokens`.
        - Temperature: `Input type="number" step="0.1"` for `textGenerationConfig.temperature`.
        - Top K: `Input type="number"` for `textGenerationConfig.top_k`.
        - Top P: `Input type="number" step="0.1"` for `textGenerationConfig.top_p`.
        - Frequency Penalty: `Input type="number" step="0.1"` for `textGenerationConfig.frequency_penalty`.
        - Min Price (Sats): `Input type="number"` for `textGenerationConfig.minPriceSats`.
        - Price per 1k Tokens (Sats): `Input type="number"` for `textGenerationConfig.pricePer1kTokens`.
    - **Functionality:**
      - On dialog open, populate form fields from `useDVMSettingsStore.getState().settings`. For fields not set by the user, display placeholder text derived from `DefaultKind5050DVMServiceConfigLayer`.
      - "Save Settings" button:
        - Parses `relaysCsv` (split by newline, trim, filter empty) and `supportedJobKindsCsv` (split by comma, trim, convert to number, filter NaN).
        - Calls `updateSettings` on `useDVMSettingsStore` with the new `DVMUserSettings` object.
      - "Reset to Defaults" button:
        - Calls `resetSettings` on `useDVMSettingsStore`.
        - Re-populates the form with default values.
      - "Cancel" button / Close dialog.

2.  **Add "Settings" Button to `SellComputePane.tsx`:**
    - **File:** `src/components/sell-compute/SellComputePane.tsx`
    - Add a new button (e.g., Cog icon from `lucide-react`) to the `SellComputePane`.
    - This button will be the `DialogTrigger` for the `DVMSettingsDialog.tsx` component.

**Phase 3: Integrate User Settings into `Kind5050DVMServiceImpl.ts`**

1.  **Modify `Kind5050DVMServiceImpl.ts`:**
    - Import `useDVMSettingsStore` and the helper functions from it (e.g., `getEffectivePrivateKeyHex`, etc.).
    - Remove direct reliance on the injected `config` from `Kind5050DVMServiceConfigTag` for dynamic parameters. The injected `config` can still be used for truly static defaults if any remain.
    - **In `startListening()`:**
      - Use `useDVMSettingsStore.getState().getEffectivePrivateKeyHex()` to get the DVM's private key. If it's the default dev key, consider logging a warning.
      - Use `useDVMSettingsStore.getState().getEffectiveRelays()` for the list of relays to connect to.
      - Use `useDVMSettingsStore.getState().getEffectiveSupportedJobKinds()` for the Nostr subscription filter.
      - Store the `dvmPublicKeyHex` derived from the effective private key for internal use (e.g., filtering out its own events).
    - **In `processJobRequestInternal()`:**
      - Use `useDVMSettingsStore.getState().getEffectiveTextGenerationConfig()` to get the current text generation parameters (model, pricing, inference params).
      - Use this effective config for Ollama requests and price calculations.
      - The DVM's private key for signing events and NIP-04 operations should come from `getEffectivePrivateKeyHex()`.

**Summary of Changes for Agent:**

- **New Store:** `src/stores/dvmSettingsStore.ts` for user DVM settings.
- **New UI Component:** `src/components/dvm/DVMSettingsDialog.tsx` for editing settings.
- **Modify `SellComputePane.tsx`:** Add a button to open `DVMSettingsDialog`.
- **Modify `Kind5050DVMServiceImpl.ts`:**
  - Use `useDVMSettingsStore.getState().getEffective...()` helpers to retrieve operational parameters (DVM identity, relays, job kinds, text generation config including pricing) at runtime when `startListening` is called and when `processJobRequestInternal` is executed.
  - The `Kind5050DVMServiceConfigTag` passed during layer construction will now primarily provide fallback defaults if user settings are not configured.

This approach ensures that the DVM service uses the most up-to-date user settings for its operations, especially for pricing, without requiring a service restart to pick up changes.

```typescript
// File: src/services/dvm/Kind5050DVMService.ts
// No direct changes to Kind5050DVMServiceConfig interface or DefaultKind5050DVMServiceConfigLayer itself.
// These will serve as the base defaults if user settings are not provided.
// The service implementation will now be responsible for fetching user overrides.

// File: src/stores/dvmSettingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DefaultTextGenerationJobConfig, Kind5050DVMServiceConfig } from '@/services/dvm/Kind5050DVMService'; // Import existing types
import { DefaultKind5050DVMServiceConfigLayer } from '@/services/dvm/Kind5050DVMService'; // To access defaults
import { getPublicKey as nostrGetPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export interface DVMUserSettings {
  dvmPrivateKeyHex?: string; // Optional: if not set, service uses its hardcoded dev default
  // dvmPublicKeyHex is derived, not stored directly by user input.
  relaysCsv?: string; // Comma-separated string of relay URLs
  supportedJobKindsCsv?: string; // Comma-separated string of kind numbers
  textGenerationConfig?: Partial<DefaultTextGenerationJobConfig>;
}

interface DVMSettingsStoreState {
  settings: DVMUserSettings;
  updateSettings: (newSettings: Partial<DVMUserSettings>) => void;
  resetSettings: () => void;
  getEffectiveConfig: () => Kind5050DVMServiceConfig; // Helper to merge user settings with defaults
  getDerivedPublicKeyHex: () => string | null; // Helper to derive PK from SK in store
}

// Get default config once
const defaultConfigValues = DefaultKind5050DVMServiceConfigLayer.context._unsafeGet(DefaultKind5050DVMServiceConfigLayer.tag);

export const useDVMSettingsStore = create<DVMSettingsStoreState>()(
  persist(
    (set, get) => ({
      settings: {}, // Initial user settings are empty
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () => set({ settings: {} }),
      getEffectiveConfig: () => {
        const userSettings = get().settings;
        const defaults = defaultConfigValues; // From DefaultKind5050DVMServiceConfigLayer

        const effectivePrivateKeyHex = userSettings.dvmPrivateKeyHex || defaults.dvmPrivateKeyHex;
        let effectivePublicKeyHex = defaults.dvmPublicKeyHex;
        try {
            if (userSettings.dvmPrivateKeyHex) {
                effectivePublicKeyHex = nostrGetPublicKey(hexToBytes(userSettings.dvmPrivateKeyHex));
            }
        } catch (e) {
            console.error("Failed to derive public key from user-provided private key, using default.", e);
            // effectivePublicKeyHex remains the default
        }


        const relays = userSettings.relaysCsv
          ? userSettings.relaysCsv.split('\n').map(r => r.trim()).filter(r => r.length > 0)
          : defaults.relays;

        const supportedJobKinds = userSettings.supportedJobKindsCsv
          ? userSettings.supportedJobKindsCsv.split(',').map(k => parseInt(k.trim(), 10)).filter(k => !isNaN(k))
          : defaults.supportedJobKinds;

        const textGenerationConfig = {
          ...defaults.defaultTextGenerationJobConfig,
          ...(userSettings.textGenerationConfig || {}),
        };

        return {
          ...defaults, // Start with all defaults
          active: defaults.active, // 'active' state should likely be managed by the service instance, not persisted settings
          dvmPrivateKeyHex: effectivePrivateKeyHex,
          dvmPublicKeyHex: effectivePublicKeyHex,
          relays: relays.length > 0 ? relays : defaults.relays,
          supportedJobKinds: supportedJobKinds.length > 0 ? supportedJobKinds : defaults.supportedJobKinds,
          defaultTextGenerationJobConfig: textGenerationConfig, // This is now the effective config
        };
      },
      getDerivedPublicKeyHex: () => {
        const skHex = get().settings.dvmPrivateKeyHex;
        if (!skHex) return defaultConfigValues.dvmPublicKeyHex; // Fallback to default's PK if no user SK
        try {
          return nostrGetPublicKey(hexToBytes(skHex));
        } catch (e) {
          console.warn("Could not derive public key from stored private key:", e);
          return null; // Indicate error or invalid SK
        }
      },
    }),
    {
      name: 'dvm-user-settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// File: src/components/dvm/DVMSettingsDialog.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Cog, AlertTriangle } from 'lucide-react';
import { useDVMSettingsStore, type DVMUserSettings } from '@/stores/dvmSettingsStore';
import { DefaultKind5050DVMServiceConfigLayer } from '@/services/dvm/Kind5050DVMService';
import { getPublicKey as nostrGetPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

const defaultDVMConfig = DefaultKind5050DVMServiceConfigLayer.context._unsafeGet(DefaultKind5050DVMServiceConfigLayer.tag);

export function DVMSettingsDialog() {
  const { settings: userSettings, updateSettings, resetSettings } = useDVMSettingsStore();
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [dvmPrivateKeyHex, setDvmPrivateKeyHex] = useState(userSettings.dvmPrivateKeyHex || '');
  const [derivedPublicKeyHex, setDerivedPublicKeyHex] = useState('');
  const [relaysCsv, setRelaysCsv] = useState(userSettings.relaysCsv || defaultDVMConfig.relays.join('\n'));
  const [supportedJobKindsCsv, setSupportedJobKindsCsv] = useState(userSettings.supportedJobKindsCsv || defaultDVMConfig.supportedJobKinds.join(', '));

  const [model, setModel] = useState(userSettings.textGenerationConfig?.model || defaultDVMConfig.defaultTextGenerationJobConfig.model);
  const [maxTokens, setMaxTokens] = useState(String(userSettings.textGenerationConfig?.max_tokens || defaultDVMConfig.defaultTextGenerationJobConfig.max_tokens));
  const [temperature, setTemperature] = useState(String(userSettings.textGenerationConfig?.temperature || defaultDVMConfig.defaultTextGenerationJobConfig.temperature));
  const [topK, setTopK] = useState(String(userSettings.textGenerationConfig?.top_k || defaultDVMConfig.defaultTextGenerationJobConfig.top_k));
  const [topP, setTopP] = useState(String(userSettings.textGenerationConfig?.top_p || defaultDVMConfig.defaultTextGenerationJobConfig.top_p));
  const [frequencyPenalty, setFrequencyPenalty] = useState(String(userSettings.textGenerationConfig?.frequency_penalty || defaultDVMConfig.defaultTextGenerationJobConfig.frequency_penalty));
  const [minPriceSats, setMinPriceSats] = useState(String(userSettings.textGenerationConfig?.minPriceSats || defaultDVMConfig.defaultTextGenerationJobConfig.minPriceSats));
  const [pricePer1kTokens, setPricePer1kTokens] = useState(String(userSettings.textGenerationConfig?.pricePer1kTokens || defaultDVMConfig.defaultTextGenerationJobConfig.pricePer1kTokens));

  useEffect(() => {
    // Re-populate form when userSettings change (e.g., after reset) or dialog opens
    if (isOpen) {
      setDvmPrivateKeyHex(userSettings.dvmPrivateKeyHex || '');
      setRelaysCsv(userSettings.relaysCsv || defaultDVMConfig.relays.join('\n'));
      setSupportedJobKindsCsv(userSettings.supportedJobKindsCsv || defaultDVMConfig.supportedJobKinds.join(', '));

      const textConfig = userSettings.textGenerationConfig || {};
      const defaultTextConfig = defaultDVMConfig.defaultTextGenerationJobConfig;
      setModel(textConfig.model || defaultTextConfig.model);
      setMaxTokens(String(textConfig.max_tokens ?? defaultTextConfig.max_tokens));
      setTemperature(String(textConfig.temperature ?? defaultTextConfig.temperature));
      setTopK(String(textConfig.top_k ?? defaultTextConfig.top_k));
      setTopP(String(textConfig.top_p ?? defaultTextConfig.top_p));
      setFrequencyPenalty(String(textConfig.frequency_penalty ?? defaultTextConfig.frequency_penalty));
      setMinPriceSats(String(textConfig.minPriceSats ?? defaultTextConfig.minPriceSats));
      setPricePer1kTokens(String(textConfig.pricePer1kTokens ?? defaultTextConfig.pricePer1kTokens));
    }
  }, [userSettings, isOpen]);

  useEffect(() => {
    // Derive public key when private key changes
    if (dvmPrivateKeyHex) {
      try {
        const pk = nostrGetPublicKey(hexToBytes(dvmPrivateKeyHex));
        setDerivedPublicKeyHex(pk);
      } catch (e) {
        setDerivedPublicKeyHex("Invalid Private Key");
      }
    } else {
      setDerivedPublicKeyHex(defaultDVMConfig.dvmPublicKeyHex); // Show default if user SK is empty
    }
  }, [dvmPrivateKeyHex]);

  const handleSave = () => {
    const newSettings: DVMUserSettings = {
      dvmPrivateKeyHex: dvmPrivateKeyHex.trim() === '' ? undefined : dvmPrivateKeyHex.trim(),
      relaysCsv: relaysCsv.trim() === defaultDVMConfig.relays.join('\n') ? undefined : relaysCsv.trim(),
      supportedJobKindsCsv: supportedJobKindsCsv.trim() === defaultDVMConfig.supportedJobKinds.join(', ') ? undefined : supportedJobKindsCsv.trim(),
      textGenerationConfig: {
        model: model.trim() === defaultDVMConfig.defaultTextGenerationJobConfig.model ? undefined : model.trim(),
        max_tokens: parseInt(maxTokens, 10) === defaultDVMConfig.defaultTextGenerationJobConfig.max_tokens ? undefined : parseInt(maxTokens, 10),
        temperature: parseFloat(temperature) === defaultDVMConfig.defaultTextGenerationJobConfig.temperature ? undefined : parseFloat(temperature),
        top_k: parseInt(topK, 10) === defaultDVMConfig.defaultTextGenerationJobConfig.top_k ? undefined : parseInt(topK, 10),
        top_p: parseFloat(topP) === defaultDVMConfig.defaultTextGenerationJobConfig.top_p ? undefined : parseFloat(topP),
        frequency_penalty: parseFloat(frequencyPenalty) === defaultDVMConfig.defaultTextGenerationJobConfig.frequency_penalty ? undefined : parseFloat(frequencyPenalty),
        minPriceSats: parseInt(minPriceSats, 10) === defaultDVMConfig.defaultTextGenerationJobConfig.minPriceSats ? undefined : parseInt(minPriceSats, 10),
        pricePer1kTokens: parseInt(pricePer1kTokens, 10) === defaultDVMConfig.defaultTextGenerationJobConfig.pricePer1kTokens ? undefined : parseInt(pricePer1kTokens, 10),
      },
    };
    // Filter out undefined values from textGenerationConfig
    Object.keys(newSettings.textGenerationConfig!).forEach(key =>
        newSettings.textGenerationConfig![key as keyof DVMUserSettings['textGenerationConfig']] === undefined && delete newSettings.textGenerationConfig![key as keyof DVMUserSettings['textGenerationConfig']]
    );
    if(Object.keys(newSettings.textGenerationConfig!).length === 0) delete newSettings.textGenerationConfig;


    updateSettings(newSettings);
    setIsOpen(false);
  };

  const handleReset = () => {
    resetSettings();
    // Form fields will re-populate via useEffect on userSettings change
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="DVM Settings">
          <Cog className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] bg-background/90 backdrop-blur-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>DVM Settings</DialogTitle>
          <DialogDescription>
            Configure your Data Vending Machine. Leave fields blank to use application defaults.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="dvmPrivateKeyHex">DVM Private Key (Nostr SK Hex)</Label>
            <Textarea id="dvmPrivateKeyHex" value={dvmPrivateKeyHex} onChange={(e) => setDvmPrivateKeyHex(e.target.value)} placeholder={`Default: ${defaultDVMConfig.dvmPrivateKeyHex.substring(0,10)}...`} rows={2} />
            <div className="flex items-center text-xs text-amber-500 p-1 bg-amber-500/10 rounded-sm">
              <AlertTriangle className="w-3 h-3 mr-1 shrink-0" /> Keep this secret and secure! Anyone with this key can control your DVM.
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dvmPublicKeyHex">DVM Public Key (Nostr PK Hex)</Label>
            <Input id="dvmPublicKeyHex" value={derivedPublicKeyHex || 'Enter Private Key'} readOnly className="text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="relaysCsv">Relays (one per line)</Label>
            <Textarea id="relaysCsv" value={relaysCsv} onChange={(e) => setRelaysCsv(e.target.value)} placeholder={defaultDVMConfig.relays.join('\n')} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supportedJobKindsCsv">Supported Job Kinds (comma-separated)</Label>
            <Input id="supportedJobKindsCsv" value={supportedJobKindsCsv} onChange={(e) => setSupportedJobKindsCsv(e.target.value)} placeholder={defaultDVMConfig.supportedJobKinds.join(', ')} />
          </div>

          <h4 className="font-semibold mt-2 pt-2 border-t border-border/50">Text Generation Configuration</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder={defaultDVMConfig.defaultTextGenerationJobConfig.model} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input id="maxTokens" type="number" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} placeholder={String(defaultDVMConfig.defaultTextGenerationJobConfig.max_tokens)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temperature">Temperature</Label>
              <Input id="temperature" type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder={String(defaultDVMConfig.defaultTextGenerationJobConfig.temperature)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topK">Top K</Label>
              <Input id="topK" type="number" value={topK} onChange={(e) => setTopK(e.target.value)} placeholder={String(defaultDVMConfig.defaultTextGenerationJobConfig.top_k)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topP">Top P</Label>
              <Input id="topP" type="number" step="0.1" value={topP} onChange={(e) => setTopP(e.target.value)} placeholder={String(defaultDVMConfig.defaultTextGenerationJobConfig.top_p)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frequencyPenalty">Frequency Penalty</Label>
              <Input id="frequencyPenalty" type="number" step="0.1" value={frequencyPenalty} onChange={(e) => setFrequencyPenalty(e.target.value)} placeholder={String(defaultDVMConfig.defaultTextGenerationJobConfig.frequency_penalty)} />
            </div>
          </div>
          <h4 className="font-semibold mt-2 pt-2 border-t border-border/50">Pricing Configuration</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="minPriceSats">Min Price (Sats)</Label>
              <Input id="minPriceSats" type="number" value={minPriceSats} onChange={(e) => setMinPriceSats(e.target.value)} placeholder={String(defaultDVMConfig.defaultTextGenerationJobConfig.minPriceSats)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pricePer1kTokens">Price per 1k Tokens (Sats)</Label>
              <Input id="pricePer1kTokens" type="number" value={pricePer1kTokens} onChange={(e) => setPricePer1kTokens(e.target.value)} placeholder={String(defaultDVMConfig.defaultTextGenerationJobConfig.pricePer1kTokens)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// File: src/components/dvm/index.ts
export * from './DVMSettingsDialog';


// File: src/components/sell-compute/SellComputePane.tsx
// Add the DVMSettingsDialog trigger
import { DVMSettingsDialog } from '@/components/dvm/DVMSettingsDialog'; // Import the new dialog
// ... other imports

const SellComputePane: React.FC = () => {
  // ... existing state and logic ...

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between"> {/* Changed to flex for button alignment */}
          <div className="text-center flex-grow">
            <CardTitle className="text-lg">Sell Compute Power</CardTitle>
          </div>
          <DVMSettingsDialog /> {/* Add the settings dialog trigger here */}
        </CardHeader>
        {/* ... rest of CardContent as before ... */}
      </Card>
    </div>
  );
};

// File: src/services/dvm/Kind5050DVMServiceImpl.ts
// Modify to use useDVMSettingsStore
import { useDVMSettingsStore } from '@/stores/dvmSettingsStore'; // Import the store
// ... other imports ...

export const Kind5050DVMServiceLive = Layer.scoped(
  Kind5050DVMService,
  Effect.gen(function* (_) {
    // const config = yield* _(Kind5050DVMServiceConfigTag); // Injected default config
    // No longer directly use 'config' for dynamic values. Instead, use the store.
    const telemetry = yield* _(TelemetryService);
    const nostr = yield* _(NostrService);
    const ollama = yield* _(OllamaService);
    const spark = yield* _(SparkService);
    const nip04 = yield* _(NIP04Service);

    let isActiveInternal = useDVMSettingsStore.getState().getEffectiveConfig().active; // Get initial active state from effective config
    let currentSubscription: Subscription | null = null;
    let currentEffectiveConfig: Kind5050DVMServiceConfig = useDVMSettingsStore.getState().getEffectiveConfig(); // Store effective config

    // ... (publishFeedback helper remains the same) ...

    const processJobRequestInternal = (jobRequestEvent: NostrEvent): Effect.Effect<void, DVMError, never> =>
      Effect.gen(function* (_) {
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig(); // Get latest settings for this job
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig; // This is now the effective text gen config

        // ... (rest of parsing and validation logic using dvmPrivateKeyHex and textGenConfig) ...
        // Example:
        // if (jobRequestEvent.tags.some(t => t[0] === "encrypted")) {
        //   const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
        //   ... nip04.decrypt(dvmSkBytes, ...) ...
        // }
        // ...
        // const ollamaModel = paramsMap.get("model") || textGenConfig.model;
        // ...
        // const priceSats = Math.max(
        //   textGenConfig.minPriceSats,
        //   Math.ceil((totalTokens / 1000) * textGenConfig.pricePer1kTokens)
        // );
        // ...
        // if (isRequestEncrypted) {
        //   const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
        //   finalOutputContent = yield* _(nip04.encrypt(dvmSkBytes, requesterPubkey, ollamaOutput) ...);
        // }
        // ...
        // const jobResultEvent = createNip90JobResultEvent(
        //   dvmPrivateKeyHex, ...
        // );
        // ...
        // const feedback = createNip90FeedbackEvent(dvmPrivateKeyHex, ...);
        // Replace all instances of `config.dvmPrivateKeyHex` with `dvmPrivateKeyHex`
        // Replace all instances of `config.defaultTextGenerationJobConfig` with `textGenConfig`

        // --- Start of actual changes within processJobRequestInternal ---
        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_received", label: jobRequestEvent.id, value: JSON.stringify(jobRequestEvent.kind) }).pipe(Effect.ignoreLogged));

        let inputsSource = jobRequestEvent.tags;
        let isRequestEncrypted = false;

        if (jobRequestEvent.tags.some(t => t[0] === "encrypted")) {
          isRequestEncrypted = true;
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex); // Use effective SK
          const decryptedContentStr = yield* _(nip04.decrypt(dvmSkBytes, jobRequestEvent.pubkey, jobRequestEvent.content).pipe(
            Effect.mapError(e => new DVMJobRequestError({ message: "Failed to decrypt NIP-90 request content", cause: e}))
          ));
          try {
            inputsSource = JSON.parse(decryptedContentStr) as Array<[string, ...string[]]>;
          } catch (e) {
            return yield* _(Effect.fail(new DVMJobRequestError({ message: "Failed to parse decrypted JSON tags", cause: e})));
          }
        }

        const inputs: NIP90Input[] = [];
        const paramsMap = new Map<string, string>();
        inputsSource.forEach(tag => {
            if (tag[0] === 'i' && tag.length >= 3) inputs.push([tag[1], tag[2] as NIP90InputType, tag[3], tag[4]] as NIP90Input);
            if (tag[0] === 'param' && tag.length >= 3) paramsMap.set(tag[1], tag[2]);
        });

        if (inputs.length === 0) {
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "error", "No inputs provided.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No inputs provided" })));
        }
        const textInput = inputs.find(inp => inp[1] === "text");
        if (!textInput || !textInput[0]) {
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "error", "No 'text' input found for text generation job.");
          yield* _(publishFeedback(feedback));
          return yield* _(Effect.fail(new DVMJobRequestError({ message: "No text input found" })));
        }
        const prompt = textInput[0];

        const processingFeedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "processing");
        yield* _(publishFeedback(processingFeedback));

        const ollamaModel = paramsMap.get("model") || textGenConfig.model; // Use textGenConfig
        const ollamaRequest: OllamaChatCompletionRequest = {
          model: ollamaModel,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        };
        // Log desired Ollama options if they were provided in params
        const ollamaOptionsFromParams: Record<string, any> = {};
        if (paramsMap.has("max_tokens")) ollamaOptionsFromParams.num_predict = parseInt(paramsMap.get("max_tokens")!, 10);
        if (paramsMap.has("temperature")) ollamaOptionsFromParams.temperature = parseFloat(paramsMap.get("temperature")!);
        // ... and so on for other params ...
        if (Object.keys(ollamaOptionsFromParams).length > 0) {
             yield* _(telemetry.trackEvent({
              category: "dvm:job", action: "ollama_params_intended",
              label: `Job ID: ${jobRequestEvent.id}`, value: JSON.stringify(ollamaOptionsFromParams)
            }).pipe(Effect.ignoreLogged));
        }


        const ollamaResult = yield* _(ollama.generateChatCompletion(ollamaRequest).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Ollama inference failed", cause: e }))
        ));
        const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
        const usage = ollamaResult.usage || { prompt_tokens: Math.ceil(prompt.length / 4), completion_tokens: Math.ceil(ollamaOutput.length / 4), total_tokens: Math.ceil((prompt.length + ollamaOutput.length) / 4) };
        const totalTokens = usage.total_tokens;

        const priceSats = Math.max(
          textGenConfig.minPriceSats, // Use textGenConfig
          Math.ceil((totalTokens / 1000) * textGenConfig.pricePer1kTokens) // Use textGenConfig
        );
        const invoiceAmountMillisats = priceSats * 1000;

        const invoiceSDKResult = yield* _(spark.createLightningInvoice({ amountSats: priceSats, memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0,8)}`}).pipe(
          Effect.mapError(e => new DVMPaymentError({ message: "Spark invoice creation failed", cause: e }))
        ));
        const bolt11Invoice = invoiceSDKResult.invoice.encodedInvoice;

        let finalOutputContent = ollamaOutput;
        if (isRequestEncrypted) {
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex); // Use effective SK
          finalOutputContent = yield* _(nip04.encrypt(dvmSkBytes, jobRequestEvent.pubkey, ollamaOutput).pipe(
            Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to encrypt NIP-90 job result", cause: e }))
          ));
        }

        const jobResultEvent = createNip90JobResultEvent(
          dvmPrivateKeyHex, jobRequestEvent, finalOutputContent, // Use effective SK
          invoiceAmountMillisats, bolt11Invoice, isRequestEncrypted
        );
        yield* _(nostr.publishEvent(jobResultEvent).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to publish job result event", cause: e }))
        ));

        const successFeedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "success"); // Use effective SK
        yield* _(publishFeedback(successFeedback));

        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_processed_success", label: jobRequestEvent.id }).pipe(Effect.ignoreLogged));
        // --- End of actual changes within processJobRequestInternal ---
      }).pipe(
        Effect.catchAllCause(cause => {
          const effectiveConfigForError = useDVMSettingsStore.getState().getEffectiveConfig(); // Get latest for error reporting
          const dvmPrivateKeyHexForError = effectiveConfigForError.dvmPrivateKeyHex;

          const dvmError = Option.getOrElse(Cause.failureOption(cause), () =>
            new DVMJobProcessingError({ message: "Unknown error during DVM job processing", cause })
          );
          const feedback = createNip90FeedbackEvent(dvmPrivateKeyHexForError, jobRequestEvent, "error", dvmError.message);
          Effect.runFork(publishFeedback(feedback));
          return telemetry.trackEvent({
            category: "dvm:error", action: "job_request_processing_failure",
            label: jobRequestEvent.id, value: dvmError.message
          }).pipe(Effect.ignoreLogged, Effect.andThen(Effect.fail(dvmError as DVMError)));
        })
      );

    return {
      startListening: () => Effect.gen(function* (_) {
        if (isActiveInternal) { /* ... */ return; }

        currentEffectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig(); // Fetch latest config on start
        if (!currentEffectiveConfig.dvmPrivateKeyHex) {
          return yield* _(Effect.fail(new DVMConfigError({ message: "DVM private key not configured." })));
        }

        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_attempt', label: `Relays: ${currentEffectiveConfig.relays.join(', ')}` }).pipe(Effect.ignoreLogged));

        const jobRequestFilter: NostrFilter = {
          kinds: currentEffectiveConfig.supportedJobKinds, // Use effective config
          since: Math.floor(Date.now() / 1000) - 300,
        };

        const sub = yield* _(nostr.subscribeToEvents(
          [jobRequestFilter],
          (event: NostrEvent) => {
            const latestConfig = useDVMSettingsStore.getState().getEffectiveConfig(); // Get latest config for processing each event
            if (event.pubkey === latestConfig.dvmPublicKeyHex && (event.kind === 7000 || (event.kind >= 6000 && event.kind <= 6999))) return;
            Effect.runFork(processJobRequestInternal(event));
          },
          currentEffectiveConfig.relays // Use effective relays for subscription
        ).pipe(Effect.mapError(e => new DVMConnectionError({ message: "Failed to subscribe to Nostr for DVM requests", cause: e }))));

        currentSubscription = sub;
        isActiveInternal = true; // Manage internal active state
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_success' }).pipe(Effect.ignoreLogged));
      }),

      stopListening: () => Effect.gen(function* (_) {
        if (!isActiveInternal) { /* ... */ return; }
        // ... (stopListening logic as before, ensures currentSubscription is handled)
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_attempt'}).pipe(Effect.ignoreLogged));
        if (currentSubscription) {
          try {
            currentSubscription.unsub();
            currentSubscription = null;
          } catch(e) {
            yield* _(telemetry.trackEvent({ category: 'dvm:error', action: 'stop_listening_unsub_failure', label: e instanceof Error ? e.message : String(e) }).pipe(Effect.ignoreLogged));
          }
        }
        isActiveInternal = false;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_success'}).pipe(Effect.ignoreLogged));
      }),

      isListening: () => Effect.succeed(isActiveInternal), // Return internal active state
    };
  })
);

// File: src/components/sell-compute/SellComputePane.tsx
// Modify handleGoOnlineToggle to re-fetch DVM status from the service after action.
// The `isOnline` state should directly reflect `dvmService.isListening()`.

/*
const handleGoOnlineToggle = async () => {
  // ... (existing checks) ...
  setIsDvmLoading(true);
  const dvmService = yield* _(Effect.context<Kind5050DVMService>().pipe(Effect.map(Context.get(Kind5050DVMService)))); // Get service
  const currentIsOnline = yield* _(dvmService.isListening()); // Check current status from service

  const dvmAction = currentIsOnline
    ? dvmService.stopListening()
    : dvmService.startListening();

  const exit = await runPromiseExit(Effect.provide(dvmAction, runtime));

  if (Exit.isSuccess(exit)) {
    // After action, re-check actual DVM status to update UI
    yield* _(checkDVMStatus()); // This will call isListening and update setIsOnline
    console.log(`DVM Service ${currentIsOnline ? 'stop' : 'start'} command successful.`);
  } else {
    // ... (error handling) ...
    yield* _(checkDVMStatus()); // Re-check status
  }
  setIsDvmLoading(false); // This should be set after checkDVMStatus potentially
};

// In `useEffect` that calls checkStatuses, also call `checkDVMStatus`.
// The `isOnline` state in SellComputePane will be driven by `checkDVMStatus`.
*/
```
