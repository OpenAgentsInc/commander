import React, { useState } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, KeyRound } from 'lucide-react';
import { shallow } from 'zustand/shallow';
import SelfCustodyNoticeDialog from '@/components/wallet/SelfCustodyNoticeDialog';

interface RestoreWalletPageProps {
  paneId: string; // To close this pane when done
}

const RestoreWalletPage: React.FC<RestoreWalletPageProps> = ({ paneId }) => {
  const { restoreWallet, hasSeenSelfCustodyNotice, error, isLoading, clearError } = useWalletStore(
    (state) => ({
      restoreWallet: state.restoreWallet,
      hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
      error: state.error,
      isLoading: state.isLoading,
      clearError: state.clearError,
    }),
    shallow
  );
  
  const { removePane, openWalletSetupPane } = usePaneStore(
    (state) => ({
      removePane: state.removePane,
      openWalletSetupPane: state.openWalletSetupPane
    }),
    shallow
  );
  
  const [seedPhrase, setSeedPhrase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [showSelfCustodyNotice, setShowSelfCustodyNotice] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSeedPhrase(e.target.value);
    if (error) clearError(); // Clear any previous errors when input changes
  };

  const handleRestore = async () => {
    if (!seedPhrase.trim()) return;
    
    setIsRestoring(true);
    clearError();
    
    try {
      const success = await restoreWallet(seedPhrase.trim());
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
      setIsRestoring(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <KeyRound className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enter Your Seed Phrase</CardTitle>
          <CardDescription>
            Enter your 12 or 24 word recovery phrase to restore your wallet. Separate words with spaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter seed phrase..."
            value={seedPhrase}
            onChange={handleInputChange}
            rows={5}
            className="font-mono text-sm"
          />
          
          <Button
            onClick={handleRestore}
            className="w-full"
            disabled={!seedPhrase.trim() || isLoading || isRestoring}
          >
            {(isLoading || isRestoring) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restoring Wallet...
              </>
            ) : (
              'Restore Wallet'
            )}
          </Button>
          
          <Button
            onClick={() => {
              clearError();
              removePane(paneId); // Close this pane
              openWalletSetupPane(); // Open wallet setup pane
            }}
            variant="outline"
            className="w-full"
          >
            Back to Setup
          </Button>
          
          {error && (
            <div className="text-destructive text-sm text-center mt-2">
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

export default RestoreWalletPage;