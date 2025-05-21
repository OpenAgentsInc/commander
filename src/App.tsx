import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { syncThemeWithLocal } from "./helpers/theme_helpers";
import { useTranslation } from "react-i18next";
import "./localization/i18n";
import { updateAppLanguage } from "./helpers/language_helpers";
import { router } from "./routes/router";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./components/ui/tooltip";
import { useWalletStore } from "@/stores/walletStore";
import { usePaneStore } from "@/stores/pane";
import { shallow } from 'zustand/shallow';
import { 
  WALLET_SETUP_PANE_ID, 
  SEED_PHRASE_BACKUP_PANE_ID, 
  RESTORE_WALLET_PANE_ID 
} from "@/stores/panes/constants";

// Create a client
const queryClient = new QueryClient();

export default function App() {
  const { i18n } = useTranslation();
  // Create a ref to track if we've already tried to open the wallet setup pane
  const hasAttemptedWalletSetup = useRef(false);

  // Initial effects for theme and language
  useEffect(() => {
    syncThemeWithLocal();
    updateAppLanguage(i18n);
  }, [i18n]);

  // Get wallet and pane state properly using hooks
  const isWalletInitialized = useWalletStore((state) => state.isInitialized);
  // Use object destructuring with shallow for the panes and openWalletSetupPane to prevent unnecessary re-renders
  const { panes, openWalletSetupPane } = usePaneStore(
    (state) => ({
      panes: state.panes,
      openWalletSetupPane: state.openWalletSetupPane
    }),
    shallow
  );
  
  // New effect for wallet initialization check
  useEffect(() => {
    // Only proceed if we haven't already attempted to open the wallet setup pane
    if (hasAttemptedWalletSetup.current) {
      return;
    }
    
    // If wallet is not initialized, we need to show the setup pane
    if (!isWalletInitialized) {
      // Check if a wallet setup related pane is already open
      const setupPaneIsOpen = panes.some(p => 
        p.id === WALLET_SETUP_PANE_ID ||
        p.id === SEED_PHRASE_BACKUP_PANE_ID ||
        p.id === RESTORE_WALLET_PANE_ID
      );
      
      // Only open the setup pane if no setup-related pane is already open
      if (!setupPaneIsOpen) {
        openWalletSetupPane();
        // Mark that we've attempted to open the wallet setup pane
        hasAttemptedWalletSetup.current = true;
      }
    }
  }, [isWalletInitialized, panes, openWalletSetupPane]); // Proper dependencies

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
