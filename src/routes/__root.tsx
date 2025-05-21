import React, { useEffect } from "react";
import BaseLayout from "@/layouts/BaseLayout";
import { useRouter, Outlet, createRootRoute } from "@tanstack/react-router";
import { useWalletStore } from "@/stores/walletStore";

export const RootRoute = createRootRoute({
  component: Root,
});

function Root() {
  const router = useRouter();
  const isInitialized = useWalletStore((state) => state.isInitialized);
  
  useEffect(() => {
    const currentPath = router.state.location.pathname;
    
    // Skip redirection for wallet setup routes
    const isWalletSetupRoute = [
      '/setup-wallet',
      '/backup-seed-phrase',
      '/restore-wallet'
    ].includes(currentPath);
    
    // If wallet is not initialized and we're not on a setup route, redirect to setup
    if (!isInitialized && !isWalletSetupRoute) {
      router.navigate({ to: '/setup-wallet' });
    }
    
    // If wallet is initialized and we're on a setup route, redirect to home
    if (isInitialized && currentPath === '/setup-wallet') {
      router.navigate({ to: '/' });
    }
  }, [isInitialized, router]);
  
  return (
    <BaseLayout>
      <Outlet />
    </BaseLayout>
  );
}
