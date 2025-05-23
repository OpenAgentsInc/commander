// src/components/hud/BitcoinBalanceDisplay.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Effect, Exit, Cause } from "effect";
import { SparkService, type BalanceInfo } from "@/services/spark";
import { getMainRuntime } from "@/services/runtime";
import { usePaneStore } from "@/stores/pane";
import { Button } from "@/components/ui/button";
import { Bitcoin, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";

const BitcoinBalanceDisplay: React.FC = () => {
  const runtime = getMainRuntime();
  const openWalletPane = usePaneStore((state) => state.openWalletPane);

  const {
    data: balanceData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<BalanceInfo, Error>({
    queryKey: ["walletBalance"],
    queryFn: async () => {
      const program = Effect.flatMap(SparkService, (s) => s.getBalance());
      const exitResult = await Effect.runPromiseExit(
        Effect.provide(program, runtime),
      );
      if (Exit.isSuccess(exitResult)) {
        return exitResult.value;
      }
      throw Cause.squash(exitResult.cause);
    },
    // TODO: Aggressive 1s balance refresh. Monitor performance and API rate limits. Consider websockets or longer intervals for production.
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
  });

  const handleDisplayClick = () => {
    openWalletPane();
  };

  let displayContent;
  if (isLoading && !balanceData) {
    displayContent = (
      <>
        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Loading...
      </>
    );
  } else if (error) {
    displayContent = (
      <>
        <AlertTriangle className="text-destructive mr-1 h-3 w-3" /> Error
      </>
    );
  } else if (balanceData) {
    displayContent = `${balanceData.balance.toString()}`;
  } else {
    displayContent = (
      <>
        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Initializing...
      </>
    );
  }

  return (
    <div
      onClick={handleDisplayClick}
      title="Open Wallet"
      className="bg-background/70 border-border/30 text-foreground hover:bg-accent hover:text-accent-foreground fixed top-4 right-4 z-[10000] flex h-8 cursor-pointer items-center rounded-md border p-2 font-mono text-xs shadow-lg backdrop-blur-sm transition-colors"
    >
      <span className="mr-1 font-bold text-yellow-500">₿</span>
      {displayContent}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          refetch();
        }}
        disabled={isFetching || isLoading}
        className="ml-1.5 h-5 w-5 p-0"
        title="Refresh Balance"
      >
        {isFetching ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
};

export default BitcoinBalanceDisplay;
