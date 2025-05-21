// src/components/hud/BitcoinBalanceDisplay.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Effect, Exit, Cause } from 'effect';
import { SparkService, type BalanceInfo } from '@/services/spark';
import { getMainRuntime } from '@/services/runtime';
import { usePaneStore } from '@/stores/pane';
import { Button } from '@/components/ui/button';
import { Bitcoin, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

const BitcoinBalanceDisplay: React.FC = () => {
  const runtime = getMainRuntime();
  const openSellComputePane = usePaneStore((state) => state.openSellComputePane);

  const { data: balanceData, isLoading, error, refetch, isFetching } = useQuery<BalanceInfo, Error>({
    queryKey: ['bitcoinBalance'],
    queryFn: async () => {
      const program = Effect.flatMap(SparkService, s => s.getBalance());
      const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
      if (Exit.isSuccess(exitResult)) {
        return exitResult.value;
      }
      throw Cause.squash(exitResult.cause);
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Placeholder for wallet pane - will be implemented by a separate agent
  const handleDisplayClick = () => {
    // Placeholder - for now, just log that this would open a wallet pane
    console.log('Opening wallet pane (placeholder - to be implemented)');
    
    // Temporarily still open sell compute pane until wallet pane is implemented
    openSellComputePane();
  };

  let displayContent;
  if (isLoading && !balanceData) {
    displayContent = <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading...</>;
  } else if (error) {
    displayContent = <><AlertTriangle className="h-3 w-3 mr-1 text-destructive" /> Error</>;
  } else if (balanceData) {
    displayContent = `${balanceData.balance.toString()}`;
  } else {
    displayContent = <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Initializing...</>;
  }

  return (
    <div
      onClick={handleDisplayClick}
      title="Open Wallet / Sell Compute Pane"
      className="fixed top-4 right-4 z-[10000] p-2 h-8 flex items-center bg-background/70 border border-border/30 rounded-md shadow-lg backdrop-blur-sm text-xs font-mono text-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <span className="text-yellow-500 mr-1.5 font-bold">₿</span>
      {displayContent}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => { e.stopPropagation(); refetch(); }}
        disabled={isFetching || isLoading}
        className="ml-1.5 h-5 w-5 p-0"
        title="Refresh Balance"
      >
        {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
      </Button>
    </div>
  );
};

export default BitcoinBalanceDisplay;