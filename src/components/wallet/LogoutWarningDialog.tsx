import React from "react";
import { useWalletStore } from "@/stores/walletStore";
import { usePaneStore } from "@/stores/pane";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface LogoutWarningDialogProps {
  children: React.ReactNode;
}

const LogoutWarningDialog: React.FC<LogoutWarningDialogProps> = ({
  children,
}) => {
  const logout = useWalletStore((state) => state.logout);
  const openWalletSetupPane = usePaneStore(
    (state) => state.openWalletSetupPane,
  );
  const [open, setOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    // Open the wallet setup pane after logout
    openWalletSetupPane();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Are you sure you want to logout?</DialogTitle>
          <DialogDescription>
            If you haven't backed up your seed phrase, you won't be able to
            access your funds.
          </DialogDescription>
        </DialogHeader>
        <Alert className="my-4 border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-500">
            Make sure you've saved your seed phrase before logging out!
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="flex-1"
          >
            Logout Anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutWarningDialog;
