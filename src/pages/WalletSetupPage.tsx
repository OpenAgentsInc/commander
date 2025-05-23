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
import { Loader2, Wallet } from "lucide-react";

interface WalletSetupPageProps {
  paneId: string; // To close this pane when navigating
}

const WalletSetupPage: React.FC<WalletSetupPageProps> = ({ paneId }) => {
  const { generateNewWallet, isLoading, error, clearError } = useWalletStore(
    useShallow((state) => ({
      generateNewWallet: state.generateNewWallet,
      isLoading: state.isLoading,
      error: state.error,
      clearError: state.clearError,
    })),
  );

  const { openSeedPhraseBackupPane, openRestoreWalletPane, removePane } =
    usePaneStore(
      useShallow((state) => ({
        openSeedPhraseBackupPane: state.openSeedPhraseBackupPane,
        openRestoreWalletPane: state.openRestoreWalletPane,
        removePane: state.removePane,
      })),
    );

  const [isGenerating, setIsGenerating] = useState(false);

  // Memoize handlers to prevent unnecessary re-renders
  const handleCreateNewWallet = useCallback(async () => {
    setIsGenerating(true);
    clearError();
    try {
      const newSeedPhrase = await generateNewWallet();
      if (newSeedPhrase) {
        // Open seed phrase backup pane and pass the seed phrase via content
        openSeedPhraseBackupPane({ seedPhrase: newSeedPhrase });
        removePane(paneId); // Close this pane
      }
    } finally {
      setIsGenerating(false);
    }
  }, [
    clearError,
    generateNewWallet,
    openSeedPhraseBackupPane,
    paneId,
    removePane,
  ]);

  const handleRestoreWallet = useCallback(() => {
    clearError();
    // Open restore wallet pane
    openRestoreWalletPane();
    removePane(paneId); // Close this pane
  }, [clearError, openRestoreWalletPane, paneId, removePane]);

  return (
    <div className="container flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <Wallet className="text-primary h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">Bitcoin Wallet Setup</CardTitle>
          <CardDescription>
            Securely manage your funds and agent interactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleCreateNewWallet}
            className="w-full"
            size="lg"
            disabled={isLoading || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating New Wallet...
              </>
            ) : (
              "Create New Wallet"
            )}
          </Button>
          <Button
            onClick={handleRestoreWallet}
            className="w-full"
            size="lg"
            variant="outline"
            disabled={isLoading || isGenerating}
          >
            Restore Existing Wallet
          </Button>

          {error && (
            <div className="text-destructive mt-4 text-center text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(WalletSetupPage);
