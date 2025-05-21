import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useWalletStore } from '@/stores/walletStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet } from 'lucide-react';

const WalletSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const generateNewWallet = useWalletStore((state) => state.generateNewWallet);
  const isLoading = useWalletStore((state) => state.isLoading);
  const error = useWalletStore((state) => state.error);
  const clearError = useWalletStore((state) => state.clearError);
  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateNewWallet = async () => {
    setIsGenerating(true);
    clearError();
    try {
      const newSeedPhrase = await generateNewWallet();
      if (newSeedPhrase) {
        // Navigate to backup page, passing the seed phrase as state
        navigate({ 
          to: '/backup-seed-phrase',
          search: { seedPhrase: newSeedPhrase }
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestoreWallet = () => {
    clearError();
    // Navigate to restore page
    navigate({ to: '/restore-wallet' });
  };

  return (
    <div className="container flex items-center justify-center min-h-screen p-4">
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