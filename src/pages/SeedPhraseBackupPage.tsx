import React, { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useWalletStore } from '@/stores/walletStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Copy, Check, Loader2 } from 'lucide-react';
import SelfCustodyNoticeDialog from '@/components/wallet/SelfCustodyNoticeDialog';

const SeedPhraseBackupPage: React.FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: '/backup-seed-phrase' });
  const { seedPhrase: seedPhraseFromURL } = search;
  
  // Get wallet store methods
  const _initializeWalletWithSeed = useWalletStore(state => state._initializeWalletWithSeed);
  const hasSeenSelfCustodyNotice = useWalletStore(state => state.hasSeenSelfCustodyNotice);
  const error = useWalletStore(state => state.error);
  const isLoading = useWalletStore(state => state.isLoading);
  const clearError = useWalletStore(state => state.clearError);
  
  // Local state
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSelfCustodyNotice, setShowSelfCustodyNotice] = useState(false);

  useEffect(() => {
    // Set the seed phrase from URL params
    if (seedPhraseFromURL) {
      setSeedPhrase(seedPhraseFromURL);
    } else {
      // If no seed phrase is provided, redirect back to setup
      navigate({ to: '/setup-wallet' });
    }
  }, [seedPhraseFromURL, navigate]);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(seedPhrase).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displaySeedPhraseWords = () => {
    if (!seedPhrase) return null;
    
    const words = seedPhrase.split(' ');
    return (
      <div className="grid grid-cols-3 gap-2 my-4">
        {words.map((word, index) => (
          <div key={index} className="flex">
            <span className="bg-muted w-6 h-6 mr-1 flex items-center justify-center rounded-full text-xs">
              {index + 1}
            </span>
            <span className="font-mono">{word}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleContinue = async () => {
    if (!seedPhrase) return;
    
    setIsInitializing(true);
    clearError();
    
    try {
      const success = await _initializeWalletWithSeed(seedPhrase, true);
      if (success) {
        if (!hasSeenSelfCustodyNotice) {
          // Show the self custody notice dialog
          setShowSelfCustodyNotice(true);
        } else {
          // Navigate directly to the main app
          navigate({ to: '/' });
        }
      }
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Your Secret Recovery Phrase</CardTitle>
          <CardDescription className="text-center">
            Write down these 12 words in order and keep them somewhere safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is your password to your money. If you lose it, you will lose your money! Never share this phrase with anyone.
            </AlertDescription>
          </Alert>
          
          <div className="bg-muted/30 p-4 rounded-md border border-border">
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
            <Checkbox id="confirm-saved" checked={isSaved} onCheckedChange={() => setIsSaved(!isSaved)} />
            <Label htmlFor="confirm-saved" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I have saved my seed phrase securely.
            </Label>
          </div>
          
          <Button
            onClick={handleContinue}
            className="w-full"
            disabled={!isSaved || isLoading || isInitializing}
          >
            {(isLoading || isInitializing) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              'Continue'
            )}
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

export default SeedPhraseBackupPage;