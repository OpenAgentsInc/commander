import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useWalletStore } from '@/stores/walletStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface SelfCustodyNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SelfCustodyNoticeDialog: React.FC<SelfCustodyNoticeDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const navigate = useNavigate();
  const setHasSeenSelfCustodyNotice = useWalletStore((state) => state.setHasSeenSelfCustodyNotice);

  const handleConfirm = () => {
    // Mark the notice as seen and close the dialog
    setHasSeenSelfCustodyNotice();
    onOpenChange(false);
    
    // Navigate to the main app
    navigate({ to: '/' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Important Notice</DialogTitle>
          <DialogDescription>Please read carefully before proceeding.</DialogDescription>
        </DialogHeader>
        <Alert className="my-4">
          <InfoIcon className="h-4 w-4 mr-2" />
          <AlertDescription className="space-y-2">
            <p className="font-medium">&gt;_ Self-Custody Wallet</p>
            <p>OpenAgents wallet is self-custodial.</p>
            <p>OpenAgents cannot access your funds or help recover them if lost.</p>
            <p>You are solely responsible for securing your seed phrase.</p>
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-4">
          <Button onClick={handleConfirm} className="w-full">
            I Understand, Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SelfCustodyNoticeDialog;