import React, { useEffect } from "react";
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
import {
  WALLET_SETUP_PANE_ID,
  SEED_PHRASE_BACKUP_PANE_ID,
  RESTORE_WALLET_PANE_ID,
} from "@/stores/panes/constants";

// Create a client
const queryClient = new QueryClient();

// Make queryClient available globally for wallet reinitialization
if (typeof window !== 'undefined') {
  (window as any).__queryClient = queryClient;
}

// Check if wallet setup is needed and handle it outside of the component render cycle
// This completely removes the store access from the component rendering
let hasCheckedWalletSetup = false;

function checkWalletSetupNeeded() {
  if (hasCheckedWalletSetup) return;

  const isWalletInitialized = useWalletStore.getState().isInitialized;
  const panes = usePaneStore.getState().panes;

  if (!isWalletInitialized) {
    const setupPaneIsOpen = panes.some(
      (p) =>
        p.id === WALLET_SETUP_PANE_ID ||
        p.id === SEED_PHRASE_BACKUP_PANE_ID ||
        p.id === RESTORE_WALLET_PANE_ID,
    );

    if (!setupPaneIsOpen) {
      // Schedule this to happen outside the current call stack
      setTimeout(() => {
        usePaneStore.getState().openWalletSetupPane();
      }, 0);
    }
  }

  hasCheckedWalletSetup = true;
}

export default function App() {
  const { i18n } = useTranslation();

  // Initial effects for theme and language
  useEffect(() => {
    syncThemeWithLocal();
    updateAppLanguage(i18n);
  }, [i18n]);

  // DISABLED: Automatic wallet setup - users should explicitly choose to set up wallet
  // useEffect(() => {
  //   checkWalletSetupNeeded();
  // }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
