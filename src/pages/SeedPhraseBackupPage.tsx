import React, { useState, useCallback } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { usePaneStore } from "@/stores/pane";
import { useShallow } from "zustand/react/shallow";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Copy, Check, Loader2 } from "lucide-react";
import SelfCustodyNoticeDialog from "@/components/wallet/SelfCustodyNoticeDialog";

interface SeedPhraseBackupPageProps {
  seedPhrase: string; // Passed directly as prop from pane content
  paneId: string; // To close this pane when done
}

const SeedPhraseBackupPage: React.FC<SeedPhraseBackupPageProps> = ({
  seedPhrase,
  paneId,
}) => {
  // Get wallet store methods
  const {
    _initializeWalletWithSeed,
    hasSeenSelfCustodyNotice,
    error,
    isLoading,
    clearError,
  } = useWalletStore(
    useShallow((state) => ({
      _initializeWalletWithSeed: state._initializeWalletWithSeed,
      hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
      error: state.error,
      isLoading: state.isLoading,
      clearError: state.clearError,
    })),
  );

  const removePane = usePaneStore((state) => state.removePane);

  // Local state
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSelfCustodyNotice, setShowSelfCustodyNotice] = useState(false);

  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(seedPhrase).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [seedPhrase]);

  const displaySeedPhraseWords = useCallback(() => {
    if (!seedPhrase) return null;

    const words = seedPhrase.split(" ");
    return (
      <div className="my-4 grid grid-cols-3 gap-2">
        {words.map((word, index) => (
          <div key={index} className="flex">
            <span className="bg-muted mr-1 flex h-6 w-6 items-center justify-center rounded-full text-xs">
              {index + 1}
            </span>
            <span className="font-mono">{word}</span>
          </div>
        ))}
      </div>
    );
  }, [seedPhrase]);

  const handleContinue = useCallback(async () => {
    if (!seedPhrase) return;

    setIsInitializing(true);
    clearError();

    try {
      const success = await _initializeWalletWithSeed(seedPhrase, true);
      if (success) {
        // Close this pane
        removePane(paneId);

        if (!hasSeenSelfCustodyNotice) {
          // Show the self custody notice dialog
          setShowSelfCustodyNotice(true);
        }
        // No need to navigate, closing the pane will reveal the main app
      }
    } finally {
      setIsInitializing(false);
    }
  }, [
    seedPhrase,
    clearError,
    _initializeWalletWithSeed,
    removePane,
    paneId,
    hasSeenSelfCustodyNotice,
  ]);

  return (
    <div className="container flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Your Secret Recovery Phrase
          </CardTitle>
          <CardDescription className="text-center">
            Write down these 12 words in order and keep them somewhere safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is your password to your money. If you lose it, you will lose
              your money! Never share this phrase with anyone.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/30 border-border rounded-md border p-4">
            {displaySeedPhraseWords()}
          </div>

          <Button
            onClick={handleCopyToClipboard}
            variant="outline"
            className="w-full"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" /> Copy Seed Phrase
              </>
            )}
          </Button>

          <div className="flex items-start space-x-2 pt-4">
            <Checkbox
              id="confirm-saved"
              checked={isSaved}
              onCheckedChange={(checked) => setIsSaved(Boolean(checked))}
            />
            <Label
              htmlFor="confirm-saved"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have saved my seed phrase securely.
            </Label>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full"
            disabled={!isSaved || isLoading || isInitializing}
          >
            {isLoading || isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              "Continue"
            )}
          </Button>

          {error && (
            <div className="text-destructive mt-2 text-center text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <SelfCustodyNoticeDialog
        open={showSelfCustodyNotice}
        onOpenChange={setShowSelfCustodyNotice}
      />
    </div>
  );
};

export default SeedPhraseBackupPage;
