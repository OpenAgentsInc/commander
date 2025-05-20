Okay, Agent, this is the next phase for the `SELLING_COMPUTE` feature: **User-Configurable DVM Settings**.

We will allow users to customize their DVM's identity, relays, supported job kinds, model parameters, and pricing. These settings will be persisted in `localStorage` and used by the `Kind5050DVMService`.

Here are the specific instructions:

**I. Create the DVM Settings Store**

1.  **Create file `src/stores/dvmSettingsStore.ts`:**
    *   Define the `DVMUserSettings` interface:
        *   `dvmPrivateKeyHex?: string`
        *   `relaysCsv?: string` (relays as a comma-or-newline-separated string)
        *   `supportedJobKindsCsv?: string` (job kinds as a comma-separated string)
        *   `textGenerationConfig?: Partial<DefaultTextGenerationJobConfig>` (allow partial overrides)
    *   Create the `useDVMSettingsStore` Zustand store with `persist` middleware.
        *   Initial state: `settings: {}`.
        *   Actions: `updateSettings(newSettings: Partial<DVMUserSettings>)`, `resetSettings()`.
        *   Implement helper methods within the store to get *effective* settings by merging user settings with the application defaults from `DefaultKind5050DVMServiceConfigLayer`. These should include:
            *   `getEffectivePrivateKeyHex(): string`
            *   `getDerivedPublicKeyHex(): string | null` (derives from effective private key)
            *   `getEffectiveRelays(): string[]` (parses CSV from `relaysCsv` or uses defaults)
            *   `getEffectiveSupportedJobKinds(): number[]` (parses CSV from `supportedJobKindsCsv` or uses defaults)
            *   `getEffectiveTextGenerationConfig(): DefaultTextGenerationJobConfig` (merges user partials with defaults)
            *   **New**: `getEffectiveConfig(): Kind5050DVMServiceConfig` - This method should combine all the above effective settings into a single `Kind5050DVMServiceConfig` object. This will be the primary way the DVM service consumes settings.

**II. Create the UI for DVM Settings**

1.  **Create new folder `src/components/dvm/`**.
2.  **Create file `src/components/dvm/DVMSettingsDialog.tsx`:**
    *   Use Shadcn UI components: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `Label`, `Input`, `Textarea`, `Button`.
    *   **Form Fields:**
        *   **DVM Private Key (`dvmPrivateKeyHex`):** `Textarea`. Display a security warning.
        *   **DVM Public Key:** Read-only `Input`, derived in the UI from the private key input using `nostr-tools/pure`'s `getPublicKey` and `hexToBytes`.
        *   **Relays (`relaysCsv`):** `Textarea`, instructing users to enter one relay URL per line.
        *   **Supported Job Kinds (`supportedJobKindsCsv`):** `Input`, instructing users to enter comma-separated kind numbers.
        *   **Text Generation Config Section (all under `textGenerationConfig`):**
            *   Model (`model`): `Input`.
            *   Max Tokens (`max_tokens`): `Input type="number"`.
            *   Temperature (`temperature`): `Input type="number" step="0.1"`.
            *   Top K (`top_k`): `Input type="number"`.
            *   Top P (`top_p`): `Input type="number" step="0.1"`.
            *   Frequency Penalty (`frequency_penalty`): `Input type="number" step="0.1"`.
        *   **Pricing Configuration Section (also under `textGenerationConfig`):**
            *   Min Price (Sats) (`minPriceSats`): `Input type="number"`.
            *   Price per 1k Tokens (Sats) (`pricePer1kTokens`): `Input type="number"`.
    *   **Functionality:**
        *   Use local React state for form fields, initialized from `useDVMSettingsStore` on dialog open. For fields not set by the user, display placeholder text derived from `DefaultKind5050DVMServiceConfigLayer`.
        *   **"Save Settings" button:**
            *   Prepare a `Partial<DVMUserSettings>` object. Only include fields if their value is different from the application default (to keep `localStorage` clean).
            *   For CSV fields (`relaysCsv`, `supportedJobKindsCsv`), store the raw string from the input. Parsing will be handled by the store's getter methods.
            *   For number fields, parse them. If parsing fails or the value is the default, store `undefined` for that field in the `Partial<DVMUserSettings>`.
            *   Call `updateSettings` on `useDVMSettingsStore`.
        *   **"Reset to Defaults" button:** Calls `resetSettings` on the store. The `useEffect` should repopulate the form.
3.  **Create `src/components/dvm/index.ts`** and export `DVMSettingsDialog`.
4.  **Update `src/components/sell-compute/SellComputePane.tsx`:**
    *   Add a "Settings" button (e.g., Cog icon from `lucide-react`) to the `CardHeader` of the `SellComputePane`.
    *   This button will be the `DialogTrigger` for the `DVMSettingsDialog` component.

**III. Integrate User Settings into `Kind5050DVMServiceImpl.ts`**

1.  **Modify `src/services/dvm/Kind5050DVMServiceImpl.ts`:**
    *   Import `useDVMSettingsStore`.
    *   **In `startListening()`:**
        *   Call `useDVMSettingsStore.getState().getEffectiveConfig()` to get the complete, current effective configuration.
        *   Use `effectiveConfig.dvmPrivateKeyHex`, `effectiveConfig.relays`, `effectiveConfig.supportedJobKinds`, and `effectiveConfig.dvmPublicKeyHex` for DVM operations.
        *   Update telemetry to log the actual relays being used.
    *   **In `processJobRequestInternal()`:**
        *   **Crucially**, at the *beginning of this function*, call `useDVMSettingsStore.getState().getEffectiveConfig()` to get the most up-to-date settings for *each job request*.
        *   Use `effectiveConfig.dvmPrivateKeyHex` for signing events and NIP-04 decryption/encryption.
        *   Use `effectiveConfig.defaultTextGenerationJobConfig` (which is the effective, merged config from the store) for Ollama request parameters and for price calculation.

This ensures that the DVM service operates with user-defined settings and that changes to settings (especially pricing) are applied to new jobs without needing a service restart. The `Kind5050DVMServiceConfigTag` injected during service creation now primarily serves to provide the application's *base default* values, which `useDVMSettingsStore` uses as fallbacks.

```typescript
// File: src/stores/dvmSettingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DefaultTextGenerationJobConfig, Kind5050DVMServiceConfig } from '@/services/dvm/Kind5050DVMService';
import { DefaultKind5050DVMServiceConfigLayer, Kind5050DVMServiceConfigTag } from '@/services/dvm/Kind5050DVMService';
import { getPublicKey as nostrGetPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export interface DVMUserSettings {
  dvmPrivateKeyHex?: string;
  relaysCsv?: string;
  supportedJobKindsCsv?: string;
  textGenerationConfig?: Partial<DefaultTextGenerationJobConfig>;
}

interface DVMSettingsStoreState {
  settings: DVMUserSettings;
  updateSettings: (newSettings: Partial<DVMUserSettings>) => void;
  resetSettings: () => void;
  getEffectivePrivateKeyHex: () => string;
  getDerivedPublicKeyHex: () => string | null;
  getEffectiveRelays: () => string[];
  getEffectiveSupportedJobKinds: () => number[];
  getEffectiveTextGenerationConfig: () => DefaultTextGenerationJobConfig;
  getEffectiveConfig: () => Kind5050DVMServiceConfig;
}

// @ts-ignore - Accessing internal Layer properties
const defaultConfigValues = DefaultKind5050DVMServiceConfigLayer.context._unsafeGet(
  // @ts-ignore - Accessing internal Layer properties
  Kind5050DVMServiceConfigTag
);


export const useDVMSettingsStore = create<DVMSettingsStoreState>()(
  persist(
    (set, get) => ({
      settings: {},
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () => set({ settings: {} }),

      getEffectivePrivateKeyHex: () => {
        return get().settings.dvmPrivateKeyHex || defaultConfigValues.dvmPrivateKeyHex;
      },
      getDerivedPublicKeyHex: () => {
        const skHex = get().getEffectivePrivateKeyHex(); // Use effective SK for derivation
        if (!skHex) return defaultConfigValues.dvmPublicKeyHex; // Should not happen if default SK is always present
        try {
          return nostrGetPublicKey(hexToBytes(skHex));
        } catch (e) {
          console.warn("Could not derive public key from stored private key:", e);
          return defaultConfigValues.dvmPublicKeyHex; // Fallback to default's PK on error
        }
      },
      getEffectiveRelays: () => {
        const userRelaysCsv = get().settings.relaysCsv;
        if (userRelaysCsv === undefined || userRelaysCsv.trim() === "") return defaultConfigValues.relays;

        const userRelays = userRelaysCsv
          .split(/[\n,]+/) // Split by newline or comma
          .map(r => r.trim())
          .filter(r => r.length > 0 && r.startsWith("wss://")); // Basic validation

        return userRelays.length > 0 ? userRelays : defaultConfigValues.relays;
      },
      getEffectiveSupportedJobKinds: () => {
        const userKindsCsv = get().settings.supportedJobKindsCsv;
        if (userKindsCsv === undefined || userKindsCsv.trim() === "") return defaultConfigValues.supportedJobKinds;

        const userKinds = userKindsCsv
          .split(',')
          .map(k => parseInt(k.trim(), 10))
          .filter(k => !isNaN(k) && k >= 5000 && k <= 5999); // NIP-90 job request range

        return userKinds.length > 0 ? userKinds : defaultConfigValues.supportedJobKinds;
      },
      getEffectiveTextGenerationConfig: () => {
        const userConfig = get().settings.textGenerationConfig || {};
        const defaults = defaultConfigValues.defaultTextGenerationJobConfig;

        // Merge, ensuring numbers are numbers
        const mergedConfig = {
          model: userConfig.model || defaults.model,
          max_tokens: typeof userConfig.max_tokens === 'number' ? userConfig.max_tokens : defaults.max_tokens,
          temperature: typeof userConfig.temperature === 'number' ? userConfig.temperature : defaults.temperature,
          top_k: typeof userConfig.top_k === 'number' ? userConfig.top_k : defaults.top_k,
          top_p: typeof userConfig.top_p === 'number' ? userConfig.top_p : defaults.top_p,
          frequency_penalty: typeof userConfig.frequency_penalty === 'number' ? userConfig.frequency_penalty : defaults.frequency_penalty,
          minPriceSats: typeof userConfig.minPriceSats === 'number' ? userConfig.minPriceSats : defaults.minPriceSats,
          pricePer1kTokens: typeof userConfig.pricePer1kTokens === 'number' ? userConfig.pricePer1kTokens : defaults.pricePer1kTokens,
        };
        return mergedConfig;
      },
      getEffectiveConfig: () => {
        const privateKeyHex = get().getEffectivePrivateKeyHex();
        const derivedPublicKeyHex = get().getDerivedPublicKeyHex() || defaultConfigValues.dvmPublicKeyHex;
        const relays = get().getEffectiveRelays();
        const supportedJobKinds = get().getEffectiveSupportedJobKinds();
        const textGenerationConfig = get().getEffectiveTextGenerationConfig();

        return {
          active: defaultConfigValues.active, // 'active' state is managed by the service instance, not settings
          dvmPrivateKeyHex: privateKeyHex,
          dvmPublicKeyHex: derivedPublicKeyHex,
          relays,
          supportedJobKinds,
          defaultTextGenerationJobConfig: textGenerationConfig,
        };
      },
    }),
    {
      name: 'dvm-user-settings-storage-v2', // Ensure a new key if schema changes significantly
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// File: src/components/dvm/DVMSettingsDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Cog, AlertTriangle } from 'lucide-react';
import { useDVMSettingsStore, type DVMUserSettings } from '@/stores/dvmSettingsStore';
import { DefaultKind5050DVMServiceConfigLayer, Kind5050DVMServiceConfigTag } from '@/services/dvm/Kind5050DVMService';
import { getPublicKey as nostrGetPublicKey } from 'nostr-tools/pure';
import { hexToBytes } from '@noble/hashes/utils';

// @ts-ignore - Accessing internal Layer properties
const defaultDVMConfigFromLayer = DefaultKind5050DVMServiceConfigLayer.context._unsafeGet(
  // @ts-ignore - Accessing internal Layer properties
  Kind5050DVMServiceConfigTag
);

export function DVMSettingsDialog() {
  const { settings: userSettings, updateSettings, resetSettings } = useDVMSettingsStore();
  const [isOpen, setIsOpen] = useState(false);

  // Form state, initialized with defaults or user settings
  const [dvmPrivateKeyHex, setDvmPrivateKeyHex] = useState('');
  const [derivedPublicKeyHex, setDerivedPublicKeyHex] = useState('');
  const [relaysCsv, setRelaysCsv] = useState('');
  const [supportedJobKindsCsv, setSupportedJobKindsCsv] = useState('');

  const [model, setModel] = useState('');
  const [maxTokens, setMaxTokens] = useState('');
  const [temperature, setTemperature] = useState('');
  const [topK, setTopK] = useState('');
  const [topP, setTopP] = useState('');
  const [frequencyPenalty, setFrequencyPenalty] = useState('');
  const [minPriceSats, setMinPriceSats] = useState('');
  const [pricePer1kTokens, setPricePer1kTokens] = useState('');

  const populateFormFields = () => {
    const defaults = defaultDVMConfigFromLayer;
    const textDefaults = defaults.defaultTextGenerationJobConfig;

    setDvmPrivateKeyHex(userSettings.dvmPrivateKeyHex || ''); // Empty if not set by user
    setRelaysCsv(userSettings.relaysCsv !== undefined ? userSettings.relaysCsv : defaults.relays.join('\n'));
    setSupportedJobKindsCsv(userSettings.supportedJobKindsCsv !== undefined ? userSettings.supportedJobKindsCsv : defaults.supportedJobKinds.join(', '));

    const userTextConfig = userSettings.textGenerationConfig || {};
    setModel(userTextConfig.model || textDefaults.model);
    setMaxTokens(String(userTextConfig.max_tokens ?? textDefaults.max_tokens));
    setTemperature(String(userTextConfig.temperature ?? textDefaults.temperature));
    setTopK(String(userTextConfig.top_k ?? textDefaults.top_k));
    setTopP(String(userTextConfig.top_p ?? textDefaults.top_p));
    setFrequencyPenalty(String(userTextConfig.frequency_penalty ?? textDefaults.frequency_penalty));
    setMinPriceSats(String(userTextConfig.minPriceSats ?? textDefaults.minPriceSats));
    setPricePer1kTokens(String(userTextConfig.pricePer1kTokens ?? textDefaults.pricePer1kTokens));
  };

  useEffect(() => {
    if (isOpen) {
      populateFormFields();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSettings, isOpen]); // Repopulate when store settings change or dialog opens

  useEffect(() => {
    if (dvmPrivateKeyHex.trim()) {
      try {
        const pk = nostrGetPublicKey(hexToBytes(dvmPrivateKeyHex.trim()));
        setDerivedPublicKeyHex(pk);
      } catch (e) {
        setDerivedPublicKeyHex("Invalid Private Key");
      }
    } else {
      setDerivedPublicKeyHex(defaultDVMConfigFromLayer.dvmPublicKeyHex);
    }
  }, [dvmPrivateKeyHex]);

  const handleSave = () => {
    const defaults = defaultDVMConfigFromLayer;
    const textDefaults = defaults.defaultTextGenerationJobConfig;

    const newSettings: DVMUserSettings = {};
    if (dvmPrivateKeyHex.trim() && dvmPrivateKeyHex.trim() !== defaults.dvmPrivateKeyHex) {
      newSettings.dvmPrivateKeyHex = dvmPrivateKeyHex.trim();
    }
    if (relaysCsv.trim() !== defaults.relays.join('\n')) {
      newSettings.relaysCsv = relaysCsv.trim();
    }
    if (supportedJobKindsCsv.trim() !== defaults.supportedJobKinds.join(', ')) {
      newSettings.supportedJobKindsCsv = supportedJobKindsCsv.trim();
    }

    const textConfig: Partial<DVMUserSettings['textGenerationConfig']> = {};
    if (model.trim() !== textDefaults.model) textConfig.model = model.trim();
    if (parseInt(maxTokens, 10) !== textDefaults.max_tokens && !isNaN(parseInt(maxTokens,10))) textConfig.max_tokens = parseInt(maxTokens, 10);
    if (parseFloat(temperature) !== textDefaults.temperature && !isNaN(parseFloat(temperature))) textConfig.temperature = parseFloat(temperature);
    if (parseInt(topK, 10) !== textDefaults.top_k && !isNaN(parseInt(topK,10))) textConfig.top_k = parseInt(topK, 10);
    if (parseFloat(topP) !== textDefaults.top_p && !isNaN(parseFloat(topP))) textConfig.top_p = parseFloat(topP);
    if (parseFloat(frequencyPenalty) !== textDefaults.frequency_penalty && !isNaN(parseFloat(frequencyPenalty))) textConfig.frequency_penalty = parseFloat(frequencyPenalty);
    if (parseInt(minPriceSats, 10) !== textDefaults.minPriceSats && !isNaN(parseInt(minPriceSats,10))) textConfig.minPriceSats = parseInt(minPriceSats, 10);
    if (parseInt(pricePer1kTokens, 10) !== textDefaults.pricePer1kTokens && !isNaN(parseInt(pricePer1kTokens,10))) textConfig.pricePer1kTokens = parseInt(pricePer1kTokens, 10);

    if (Object.keys(textConfig).length > 0) newSettings.textGenerationConfig = textConfig;

    updateSettings(newSettings);
    setIsOpen(false);
  };

  const handleReset = () => {
    resetSettings(); // This will trigger the useEffect to re-populate the form
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="DVM Settings" className="h-6 w-6 p-1"> {/* Smaller icon button */}
          <Cog className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] bg-background/90 backdrop-blur-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>DVM Settings</DialogTitle>
          <DialogDescription>
            Configure your Data Vending Machine. Leave fields blank or matching defaults to use application defaults.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm">
          {/* DVM Identity */}
          <h4 className="font-semibold mt-2">Identity</h4>
          <div className="space-y-1.5">
            <Label htmlFor="dvmPrivateKeyHex">DVM Private Key (Nostr SK Hex)</Label>
            <Textarea id="dvmPrivateKeyHex" value={dvmPrivateKeyHex} onChange={(e) => setDvmPrivateKeyHex(e.target.value)} placeholder={`Default: ${defaultDVMConfigFromLayer.dvmPrivateKeyHex.substring(0,10)}... (dev key)`} rows={2} />
            <div className="flex items-center text-xs text-amber-500 p-1 bg-amber-500/10 rounded-sm">
              <AlertTriangle className="w-3 h-3 mr-1 shrink-0" /> Keep this secret and secure!
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dvmPublicKeyHex">DVM Public Key (Nostr PK Hex)</Label>
            <Input id="dvmPublicKeyHex" value={derivedPublicKeyHex || 'Enter Private Key'} readOnly className="text-muted-foreground" />
          </div>

          {/* Network Configuration */}
          <h4 className="font-semibold mt-2 pt-2 border-t border-border/50">Network</h4>
          <div className="space-y-1.5">
            <Label htmlFor="relaysCsv">Relays (one per line or comma-separated)</Label>
            <Textarea id="relaysCsv" value={relaysCsv} onChange={(e) => setRelaysCsv(e.target.value)} placeholder={defaultDVMConfigFromLayer.relays.join('\n')} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supportedJobKindsCsv">Supported Job Kinds (comma-separated)</Label>
            <Input id="supportedJobKindsCsv" value={supportedJobKindsCsv} onChange={(e) => setSupportedJobKindsCsv(e.target.value)} placeholder={defaultDVMConfigFromLayer.supportedJobKinds.join(', ')} />
          </div>

          {/* Text Generation Job Configuration */}
          <h4 className="font-semibold mt-2 pt-2 border-t border-border/50">Text Generation Defaults</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="model">Model Name</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder={defaultDVMConfigFromLayer.defaultTextGenerationJobConfig.model} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input id="maxTokens" type="number" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} placeholder={String(defaultDVMConfigFromLayer.defaultTextGenerationJobConfig.max_tokens)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temperature">Temperature</Label>
              <Input id="temperature" type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder={String(defaultDVMConfigFromLayer.defaultTextGenerationJobConfig.temperature)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topK">Top K</Label>
              <Input id="topK" type="number" value={topK} onChange={(e) => setTopK(e.target.value)} placeholder={String(defaultDVMConfigFromLayer.defaultTextGenerationJobConfig.top_k)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topP">Top P</Label>
              <Input id="topP" type="number" step="0.1" value={topP} onChange={(e) => setTopP(e.target.value)} placeholder={String(defaultDVMConfigFromLayer.defaultTextGenerationJobConfig.top_p)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frequencyPenalty">Frequency Penalty</Label>
              <Input id="frequencyPenalty" type="number" step="0.1" value={frequencyPenalty} onChange={(e) => setFrequencyPenalty(e.target.value)} placeholder={String(defaultDVMConfigFromLayer.defaultTextGenerationJobConfig.frequency_penalty)} />
            </div>
          </div>

          {/* Pricing Configuration */}
          <h4 className="font-semibold mt-2 pt-2 border-t border-border/50">Pricing Defaults</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="minPriceSats">Min Price (Sats)</Label>
              <Input id="minPriceSats" type="number" value={minPriceSats} onChange={(e) => setMinPriceSats(e.target.value)} placeholder={String(defaultDVMConfigFromLayer.defaultTextGenerationJobConfig.minPriceSats)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pricePer1kTokens">Price per 1k Tokens (Sats)</Label>
              <Input id="pricePer1kTokens" type="number" value={pricePer1kTokens} onChange={(e) => setPricePer1kTokens(e.target.value)} placeholder={String(defaultDVMConfigFromLayer.defaultTextGenerationJobConfig.pricePer1kTokens)} />
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
// (Add DVMSettingsDialog import and trigger button in CardHeader)
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HelpCircle, Zap, ZapOff, Wifi, WifiOff, RefreshCcw, Loader2, Cog } from 'lucide-react'; // Added Cog
import { SparkService } from '@/services/spark';
import { OllamaService } from '@/services/ollama';
import { Kind5050DVMService } from '@/services/dvm';
import { getMainRuntime } from '@/services/runtime';
import { Effect } from 'effect';
import { runPromiseExit, Exit, Cause } from 'effect/Effect';
import { cn } from '@/utils/tailwind';
import { DVMSettingsDialog } from '@/components/dvm'; // Import the new dialog

const SellComputePane: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [statusLoading, setStatusLoading] = useState({ wallet: false, ollama: false });
  const [isDvmLoading, setIsDvmLoading] = useState(false);

  const runtime = getMainRuntime();

  const checkWalletStatus = useCallback(async () => { /* ... as before ... */ }, [runtime]);
  const checkOllamaStatus = useCallback(async () => { /* ... as before ... */ }, [runtime]);
  const checkDVMStatus = useCallback(async () => { /* ... as before ... */ }, [runtime]);

  useEffect(() => {
    checkWalletStatus();
    checkOllamaStatus();
    checkDVMStatus();
  }, [checkWalletStatus, checkOllamaStatus, checkDVMStatus]);

  const handleGoOnlineToggle = async () => { /* ... as before ... */ };

  const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
  const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="text-center flex-grow">
            <CardTitle className="text-lg">Sell Compute Power</CardTitle>
          </div>
          <DVMSettingsDialog /> {/* Settings Dialog Trigger */}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Status */}
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
              {isWalletConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Wallet</p>
                <p className={cn("text-xs", walletStatusColor)}>{walletStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Wallet Status" onClick={checkWalletStatus} disabled={statusLoading.wallet}>
                 {statusLoading.wallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Wallet Info (Not Implemented)"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>
          {/* Ollama Status */}
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
             {isOllamaConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Ollama</p>
                <p className={cn("text-xs", ollamaStatusColor)}>{ollamaStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Ollama Status" onClick={checkOllamaStatus} disabled={statusLoading.ollama}>
                 {statusLoading.ollama ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Ollama Info (Not Implemented)"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>
          <CardDescription className="text-center text-xs px-2 pt-2">
            Configure DVM settings (identity, relays, pricing) via the cog icon.
          </CardDescription>
          <Button
            onClick={handleGoOnlineToggle}
            className="w-full py-3 text-base"
            variant={isOnline ? "outline" : "default"}
            disabled={isDvmLoading || ((!isWalletConnected || !isOllamaConnected) && !isOnline)}
          >
            {isDvmLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />)}
            {isDvmLoading ? (isOnline ? 'Stopping...' : 'Starting...') : (isOnline ? 'GO OFFLINE' : 'GO ONLINE')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
export default SellComputePane;

// File: src/services/dvm/Kind5050DVMServiceImpl.ts
// (Modify to use useDVMSettingsStore.getState().getEffectiveConfig() in startListening and processJobRequestInternal)
import { Effect, Layer, Schema, Option, Cause } from 'effect';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import { TelemetryService } from '@/services/telemetry';
import { NostrService, type NostrEvent, type NostrFilter, type Subscription, NostrPublishError } from '@/services/nostr';
import { OllamaService, type OllamaChatCompletionRequest, OllamaError } from '@/services/ollama';
import { SparkService, type CreateLightningInvoiceParams, SparkError, LightningInvoice } from '@/services/spark';
import { NIP04Service, NIP04DecryptError, NIP04EncryptError } from '@/services/nip04';
import { useDVMSettingsStore } from '@/stores/dvmSettingsStore'; // Import the store
import {
  NIP90Input,
  NIP90JobParam,
  NIP90InputType
} from '@/services/nip90';
import {
  Kind5050DVMService,
  Kind5050DVMServiceConfig, // Type for the config object, not the Tag
  Kind5050DVMServiceConfigTag, // Tag for injecting the default config
  DVMConfigError, DVMConnectionError, DVMJobRequestError, DVMJobProcessingError, DVMPaymentError, DVMError
} from './Kind5050DVMService';

// createNip90FeedbackEvent and createNip90JobResultEvent helpers remain the same...

export const Kind5050DVMServiceLive = Layer.scoped(
  Kind5050DVMService,
  Effect.gen(function* (_) {
    const defaultConfig = yield* _(Kind5050DVMServiceConfigTag); // Default config for fallbacks
    const telemetry = yield* _(TelemetryService);
    const nostr = yield* _(NostrService);
    const ollama = yield* _(OllamaService);
    const spark = yield* _(SparkService);
    const nip04 = yield* _(NIP04Service);

    let isActiveInternal = useDVMSettingsStore.getState().getEffectiveConfig().active; // Get initial active state from effective config
    let currentSubscription: Subscription | null = null;
    // Removed currentDvmPublicKeyHex internal state as it's part of effectiveConfig now

    yield* _(telemetry.trackEvent({
      category: 'dvm:init',
      action: 'kind5050_dvm_service_init',
      label: `Initial state: ${isActiveInternal ? 'active' : 'inactive'}`,
    }).pipe(Effect.ignoreLogged));

    const publishFeedback = (feedbackEvent: NostrEvent) =>
      nostr.publishEvent(feedbackEvent).pipe(
        Effect.tapErrorTag("NostrPublishError", err =>
          telemetry.trackEvent({
            category: "dvm:error", action: "publish_feedback_failure",
            label: `Failed to publish feedback for ${feedbackEvent.tags.find(t=>t[0]==='e')?.[1]}`,
            value: err.message
          })
        ),
        Effect.ignoreLogged
      );

    const processJobRequestInternal = (jobRequestEvent: NostrEvent): Effect.Effect<void, DVMError, never> =>
      Effect.gen(function* (_) {
        // CRITICAL: Fetch the LATEST effective config for EACH job request.
        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        const dvmPrivateKeyHex = effectiveConfig.dvmPrivateKeyHex;
        const textGenConfig = effectiveConfig.defaultTextGenerationJobConfig; // This is the merged config

        // ... (rest of the processJobRequestInternal logic as implemented in previous steps, ensuring
        // `dvmPrivateKeyHex` from `effectiveConfig` is used for signing/NIP04,
        // and `textGenConfig` from `effectiveConfig` is used for Ollama params and pricing.) ...
        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_received", label: jobRequestEvent.id, value: `Kind: ${jobRequestEvent.kind}` }).pipe(Effect.ignoreLogged));

        let inputsSource = jobRequestEvent.tags;
        let isRequestEncrypted = false;

        if (jobRequestEvent.tags.some(t => t[0] === "encrypted")) {
          isRequestEncrypted = true;
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
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
            if (tag[0] === 'i' && tag.length >= 2) {
              const value = tag[1];
              const type = tag[2] as NIP90InputType;
              const opt1 = tag.length > 3 ? tag[3] : undefined;
              const opt2 = tag.length > 4 ? tag[4] : undefined;
              inputs.push([value, type, opt1, opt2] as NIP90Input);
            }
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

        const ollamaModel = paramsMap.get("model") || textGenConfig.model;
        const ollamaRequest: OllamaChatCompletionRequest = {
          model: ollamaModel,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        };
        yield* _(telemetry.trackEvent({
            category: "dvm:job", action: "ollama_params_intended",
            label: `Job ID: ${jobRequestEvent.id}`, value: JSON.stringify({
                requestParams: Object.fromEntries(paramsMap),
                ollamaModelUsed: ollamaRequest.model,
                jobConfigParamsApplied: textGenConfig // Log the effective config used
            })
        }).pipe(Effect.ignoreLogged));

        const ollamaResult = yield* _(ollama.generateChatCompletion(ollamaRequest).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Ollama inference failed", cause: e }))
        ));
        const ollamaOutput = ollamaResult.choices[0]?.message.content || "";
        const usage = ollamaResult.usage || { prompt_tokens: Math.ceil(prompt.length / 4), completion_tokens: Math.ceil(ollamaOutput.length / 4), total_tokens: Math.ceil((prompt.length + ollamaOutput.length) / 4) };
        const totalTokens = usage.total_tokens;

        const priceSats = Math.max(
          textGenConfig.minPriceSats,
          Math.ceil((totalTokens / 1000) * textGenConfig.pricePer1kTokens)
        );
        const invoiceAmountMillisats = priceSats * 1000;

        const invoiceSDKResult = yield* _(spark.createLightningInvoice({ amountSats: priceSats, memo: `NIP-90 Job: ${jobRequestEvent.id.substring(0,8)}`}).pipe(
          Effect.mapError(e => new DVMPaymentError({ message: "Spark invoice creation failed", cause: e }))
        ));
        const bolt11Invoice = invoiceSDKResult.invoice.encodedInvoice;

        let finalOutputContent = ollamaOutput;
        if (isRequestEncrypted) {
          const dvmSkBytes = hexToBytes(dvmPrivateKeyHex);
          finalOutputContent = yield* _(nip04.encrypt(dvmSkBytes, jobRequestEvent.pubkey, ollamaOutput).pipe(
            Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to encrypt NIP-90 job result", cause: e }))
          ));
        }

        const jobResultEvent = createNip90JobResultEvent(
          dvmPrivateKeyHex, jobRequestEvent, finalOutputContent,
          invoiceAmountMillisats, bolt11Invoice, isRequestEncrypted
        );
        yield* _(nostr.publishEvent(jobResultEvent).pipe(
          Effect.mapError(e => new DVMJobProcessingError({ message: "Failed to publish job result event", cause: e }))
        ));

        const successFeedback = createNip90FeedbackEvent(dvmPrivateKeyHex, jobRequestEvent, "success");
        yield* _(publishFeedback(successFeedback));

        yield* _(telemetry.trackEvent({ category: "dvm:job", action: "job_request_processed_success", label: jobRequestEvent.id }).pipe(Effect.ignoreLogged));

      }).pipe(
        Effect.catchAllCause(cause => {
          const effectiveConfigForError = useDVMSettingsStore.getState().getEffectiveConfig();
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

        const effectiveConfig = useDVMSettingsStore.getState().getEffectiveConfig();
        // currentDvmPublicKeyHex is now part of effectiveConfig, no need for separate state

        if (!effectiveConfig.dvmPrivateKeyHex) {
          return yield* _(Effect.fail(new DVMConfigError({ message: "DVM private key not configured." })));
        }
        if (effectiveConfig.relays.length === 0) {
          return yield* _(Effect.fail(new DVMConfigError({ message: "No DVM relays configured." })));
        }

        yield* _(telemetry.trackEvent({
          category: 'dvm:status',
          action: 'start_listening_attempt',
          label: `Relays: ${effectiveConfig.relays.join(', ')}, Kinds: ${effectiveConfig.supportedJobKinds.join(', ')}`
        }).pipe(Effect.ignoreLogged));

        const jobRequestFilter: NostrFilter = {
          kinds: effectiveConfig.supportedJobKinds,
          since: Math.floor(Date.now() / 1000) - 300,
        };

        const sub = yield* _(nostr.subscribeToEvents(
          [jobRequestFilter],
          (event: NostrEvent) => {
            const latestConfig = useDVMSettingsStore.getState().getEffectiveConfig(); // Use latest config for this check too
            if (event.pubkey === latestConfig.dvmPublicKeyHex && (event.kind === 7000 || (event.kind >= 6000 && event.kind <= 6999))) return;
            Effect.runFork(processJobRequestInternal(event));
          },
          effectiveConfig.relays, // Pass relays from effectiveConfig
          () => { /* onEOSE */ }
        ).pipe(Effect.mapError(e => new DVMConnectionError({ message: "Failed to subscribe to Nostr for DVM requests", cause: e }))));

        currentSubscription = sub;
        isActiveInternal = true;
        yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'start_listening_success' }).pipe(Effect.ignoreLogged));
      }),

      stopListening: () => Effect.gen(function* (_) { /* ... as before ... */
        if (!isActiveInternal) {
          yield* _(telemetry.trackEvent({ category: 'dvm:status', action: 'stop_listening_already_inactive'}).pipe(Effect.ignoreLogged));
          return;
        }
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
      isListening: () => Effect.succeed(isActiveInternal),
    };
  })
);

```
