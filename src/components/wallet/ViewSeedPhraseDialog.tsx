import React, { useState } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Copy, Check } from 'lucide-react';

interface ViewSeedPhraseDialogProps {
  children: React.ReactNode;
}

const ViewSeedPhraseDialog: React.FC<ViewSeedPhraseDialogProps> = ({ children }) => {
  const getSeedPhrase = useWalletStore((state) => state.getSeedPhrase);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = React.useState(false);

  const handleCopyToClipboard = () => {
    const seed = getSeedPhrase();
    if (seed) {
      navigator.clipboard.writeText(seed).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your Seed Phrase</DialogTitle>
          <DialogDescription>
            Keep this phrase safe. Anyone with access to it can control your wallet.
          </DialogDescription>
        </DialogHeader>
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Never share this phrase. Losing it means losing access to your funds.
          </AlertDescription>
        </Alert>
        <Textarea
          value={getSeedPhrase() || ''}
          readOnly
          className="my-2 text-sm font-mono"
          rows={4}
        />
        <div className="flex justify-between gap-2 mt-4">
          <Button
            onClick={handleCopyToClipboard}
            variant="outline"
            className="flex-1"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" /> Copy Seed Phrase
              </>
            )}
          </Button>
          <Button onClick={() => setOpen(false)} className="flex-1">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewSeedPhraseDialog;