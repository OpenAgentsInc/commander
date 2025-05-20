import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Cog, AlertTriangle } from 'lucide-react';
import { useDVMSettingsStore, type DVMUserSettings } from '@/stores/dvmSettingsStore';
import { DefaultKind5050DVMServiceConfigLayer } from '@/services/dvm/Kind5050DVMService';
import { getPublicKey } from 'nostr-tools/pure';
import { hexToBytes } from '@noble/hashes/utils';

// Get default config for placeholders and comparisons
// @ts-ignore - Accessing internal Layer properties
const defaultConfig = DefaultKind5050DVMServiceConfigLayer.context._unsafeGet(
  // @ts-ignore - Accessing internal Layer properties
  DefaultKind5050DVMServiceConfigLayer.tag
);

export function DVMSettingsDialog() {
  const { settings: userSettings, updateSettings, resetSettings } = useDVMSettingsStore();
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [dvmPrivateKeyHex, setDvmPrivateKeyHex] = useState(userSettings.dvmPrivateKeyHex || '');
  const [derivedPublicKeyHex, setDerivedPublicKeyHex] = useState('');
  const [relaysCsv, setRelaysCsv] = useState(userSettings.relaysCsv || defaultConfig.relays.join('\n'));
  const [supportedJobKindsCsv, setSupportedJobKindsCsv] = useState(
    userSettings.supportedJobKindsCsv || defaultConfig.supportedJobKinds.join(', ')
  );

  // Text generation config fields
  const [model, setModel] = useState(
    userSettings.textGenerationConfig?.model || defaultConfig.defaultTextGenerationJobConfig.model
  );
  const [maxTokens, setMaxTokens] = useState(
    String(userSettings.textGenerationConfig?.max_tokens || defaultConfig.defaultTextGenerationJobConfig.max_tokens)
  );
  const [temperature, setTemperature] = useState(
    String(userSettings.textGenerationConfig?.temperature || defaultConfig.defaultTextGenerationJobConfig.temperature)
  );
  const [topK, setTopK] = useState(
    String(userSettings.textGenerationConfig?.top_k || defaultConfig.defaultTextGenerationJobConfig.top_k)
  );
  const [topP, setTopP] = useState(
    String(userSettings.textGenerationConfig?.top_p || defaultConfig.defaultTextGenerationJobConfig.top_p)
  );
  const [frequencyPenalty, setFrequencyPenalty] = useState(
    String(userSettings.textGenerationConfig?.frequency_penalty || defaultConfig.defaultTextGenerationJobConfig.frequency_penalty)
  );
  
  // Pricing fields
  const [minPriceSats, setMinPriceSats] = useState(
    String(userSettings.textGenerationConfig?.minPriceSats || defaultConfig.defaultTextGenerationJobConfig.minPriceSats)
  );
  const [pricePer1kTokens, setPricePer1kTokens] = useState(
    String(userSettings.textGenerationConfig?.pricePer1kTokens || defaultConfig.defaultTextGenerationJobConfig.pricePer1kTokens)
  );

  // Re-populate form when userSettings change or dialog opens
  useEffect(() => {
    if (isOpen) {
      setDvmPrivateKeyHex(userSettings.dvmPrivateKeyHex || '');
      setRelaysCsv(userSettings.relaysCsv || defaultConfig.relays.join('\n'));
      setSupportedJobKindsCsv(userSettings.supportedJobKindsCsv || defaultConfig.supportedJobKinds.join(', '));

      const textConfig = userSettings.textGenerationConfig || {};
      const defaultTextConfig = defaultConfig.defaultTextGenerationJobConfig;
      
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

  // Derive public key when private key changes
  useEffect(() => {
    if (dvmPrivateKeyHex) {
      try {
        const pk = getPublicKey(hexToBytes(dvmPrivateKeyHex));
        setDerivedPublicKeyHex(pk);
      } catch (e) {
        setDerivedPublicKeyHex("Invalid Private Key");
      }
    } else {
      setDerivedPublicKeyHex(defaultConfig.dvmPublicKeyHex); // Show default if SK is empty
    }
  }, [dvmPrivateKeyHex]);

  const handleSave = () => {
    // Create a new settings object
    const newSettings: DVMUserSettings = {
      dvmPrivateKeyHex: dvmPrivateKeyHex.trim() || undefined,
      relaysCsv: relaysCsv.trim() || undefined,
      supportedJobKindsCsv: supportedJobKindsCsv.trim() || undefined,
      textGenerationConfig: {
        model: model.trim() || undefined,
        max_tokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        top_k: topK ? parseInt(topK, 10) : undefined,
        top_p: topP ? parseFloat(topP) : undefined,
        frequency_penalty: frequencyPenalty ? parseFloat(frequencyPenalty) : undefined,
        minPriceSats: minPriceSats ? parseInt(minPriceSats, 10) : undefined,
        pricePer1kTokens: pricePer1kTokens ? parseInt(pricePer1kTokens, 10) : undefined,
      },
    };

    // Filter out undefined values from textGenerationConfig
    if (newSettings.textGenerationConfig) {
      Object.keys(newSettings.textGenerationConfig).forEach(key => {
        const typedKey = key as keyof DVMUserSettings['textGenerationConfig'];
        if (newSettings.textGenerationConfig && newSettings.textGenerationConfig[typedKey] === undefined) {
          delete newSettings.textGenerationConfig[typedKey];
        }
      });

      // Remove empty textGenerationConfig
      if (newSettings.textGenerationConfig && Object.keys(newSettings.textGenerationConfig).length === 0) {
        delete newSettings.textGenerationConfig;
      }
    }

    // Update the store
    updateSettings(newSettings);
    setIsOpen(false);
  };

  const handleReset = () => {
    resetSettings();
    // Form fields will be updated via useEffect when settings change
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="DVM Settings"
          className="h-8 w-8"
        >
          <Cog className="h-4 w-4" />
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
            <Textarea
              id="dvmPrivateKeyHex"
              value={dvmPrivateKeyHex}
              onChange={(e) => setDvmPrivateKeyHex(e.target.value)}
              placeholder={`Default: ${defaultConfig.dvmPrivateKeyHex.substring(0, 10)}...`}
              rows={2}
            />
            <div className="flex items-center text-xs text-amber-500 p-1 bg-amber-500/10 rounded-sm">
              <AlertTriangle className="w-3 h-3 mr-1 shrink-0" /> Keep this secret and secure! Anyone with this key can control your DVM.
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dvmPublicKeyHex">DVM Public Key (Nostr PK Hex)</Label>
            <Input
              id="dvmPublicKeyHex"
              value={derivedPublicKeyHex || 'Enter Private Key'}
              readOnly
              className="text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="relaysCsv">Relays (one per line)</Label>
            <Textarea
              id="relaysCsv"
              value={relaysCsv}
              onChange={(e) => setRelaysCsv(e.target.value)}
              placeholder={defaultConfig.relays.join('\n')}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supportedJobKindsCsv">Supported Job Kinds (comma-separated)</Label>
            <Input
              id="supportedJobKindsCsv"
              value={supportedJobKindsCsv}
              onChange={(e) => setSupportedJobKindsCsv(e.target.value)}
              placeholder={defaultConfig.supportedJobKinds.join(', ')}
            />
          </div>

          <h4 className="font-semibold mt-2 pt-2 border-t border-border/50">Text Generation Configuration</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={defaultConfig.defaultTextGenerationJobConfig.model}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder={String(defaultConfig.defaultTextGenerationJobConfig.max_tokens)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder={String(defaultConfig.defaultTextGenerationJobConfig.temperature)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topK">Top K</Label>
              <Input
                id="topK"
                type="number"
                value={topK}
                onChange={(e) => setTopK(e.target.value)}
                placeholder={String(defaultConfig.defaultTextGenerationJobConfig.top_k)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topP">Top P</Label>
              <Input
                id="topP"
                type="number"
                step="0.1"
                value={topP}
                onChange={(e) => setTopP(e.target.value)}
                placeholder={String(defaultConfig.defaultTextGenerationJobConfig.top_p)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frequencyPenalty">Frequency Penalty</Label>
              <Input
                id="frequencyPenalty"
                type="number"
                step="0.1"
                value={frequencyPenalty}
                onChange={(e) => setFrequencyPenalty(e.target.value)}
                placeholder={String(defaultConfig.defaultTextGenerationJobConfig.frequency_penalty)}
              />
            </div>
          </div>
          <h4 className="font-semibold mt-2 pt-2 border-t border-border/50">Pricing Configuration</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="minPriceSats">Min Price (Sats)</Label>
              <Input
                id="minPriceSats"
                type="number"
                value={minPriceSats}
                onChange={(e) => setMinPriceSats(e.target.value)}
                placeholder={String(defaultConfig.defaultTextGenerationJobConfig.minPriceSats)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pricePer1kTokens">Price per 1k Tokens (Sats)</Label>
              <Input
                id="pricePer1kTokens"
                type="number"
                value={pricePer1kTokens}
                onChange={(e) => setPricePer1kTokens(e.target.value)}
                placeholder={String(defaultConfig.defaultTextGenerationJobConfig.pricePer1kTokens)}
              />
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