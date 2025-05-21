import React, { useState } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet } from 'lucide-react';

interface WalletSetupPageProps {
  paneId: string; // To close this pane when navigating
}

const WalletSetupPage: React.FC<WalletSetupPageProps> = ({ paneId }) => {
  const { generateNewWallet, isLoading, error, clearError } = useWalletStore(
    (state) => ({
      generateNewWallet: state.generateNewWallet,
      isLoading: state.isLoading,
      error: state.error,
      clearError: state.clearError,
    })
  );
  
  const { openSeedPhraseBackupPane, openRestoreWalletPane, removePane } = usePaneStore(
    (state) => ({
      openSeedPhraseBackupPane: state.openSeedPhraseBackupPane,
      openRestoreWalletPane: state.openRestoreWalletPane,
      removePane: state.removePane,
    })
  );
  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateNewWallet = async () => {
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
  };

  const handleRestoreWallet = () => {
    clearError();
    // Open restore wallet pane
    openRestoreWalletPane();
    removePane(paneId); // Close this pane
  };

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <Wallet className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Commander Wallet</CardTitle>
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
              'Create New Wallet'
            )}
          </Button>
          <Button
            onClick={handleRestoreWallet}
            className="w-full"
            size="lg"
            variant="outline"
            disabled={isLoading}
          >
            Restore Existing Wallet
          </Button>
          
          {error && (
            <div className="text-destructive text-sm text-center mt-4">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletSetupPage;