import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, HelpCircle, Zap, ZapOff, Wifi, WifiOff, RefreshCcw } from 'lucide-react';
import { SparkService } from '@/services/spark';
import { OllamaService } from '@/services/ollama';
import { Kind5050DVMService } from '@/services/dvm';
import { getMainRuntime } from '@/services/runtime';
import { Effect } from 'effect';
import { runPromiseExit } from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Cause from 'effect/Cause';
import { cn } from '@/utils/tailwind';

const SellComputePane: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [statusLoading, setStatusLoading] = useState({ wallet: false, ollama: false });

  const runtime = getMainRuntime();

  const checkWalletStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, wallet: true }));
    const walletProgram = Effect.flatMap(SparkService, s => s.checkWalletStatus());
    runPromiseExit(Effect.provide(walletProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsWalletConnected(exit.value);
      else {
        console.error("Wallet status check failed:", Cause.squash(exit.cause));
        setIsWalletConnected(false);
      }
      setStatusLoading(s => ({ ...s, wallet: false }));
    });
  }, [runtime]);

  const checkOllamaStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, ollama: true }));
    const ollamaProgram = Effect.flatMap(OllamaService, s => s.checkOllamaStatus());
    runPromiseExit(Effect.provide(ollamaProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsOllamaConnected(exit.value);
      else {
        console.error("Ollama status check failed:", Cause.squash(exit.cause));
        setIsOllamaConnected(false);
      }
      setStatusLoading(s => ({ ...s, ollama: false }));
    });
  }, [runtime]);

  const checkDVMStatus = useCallback(async () => {
    const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, s => s.isListening());
    runPromiseExit(Effect.provide(dvmStatusProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) {
        setIsOnline(exit.value);
      } else {
        console.error("Failed to check DVM status:", Cause.squash(exit.cause));
      }
    });
  }, [runtime]);

  useEffect(() => {
    checkWalletStatus();
    checkOllamaStatus();
    checkDVMStatus();
  }, [checkWalletStatus, checkOllamaStatus, checkDVMStatus]);

  const handleGoOnline = () => {
    if (isWalletConnected && isOllamaConnected) {
      const dvmAction = !isOnline
        ? Effect.flatMap(Kind5050DVMService, s => s.startListening())
        : Effect.flatMap(Kind5050DVMService, s => s.stopListening());
      
      // Execute the appropriate DVM action based on current state
      runPromiseExit(Effect.provide(dvmAction, runtime)).then(exit => {
        if (Exit.isSuccess(exit)) {
          setIsOnline(!isOnline);
          console.log(`Compute selling ${!isOnline ? 'started' : 'stopped'}`);
        } else {
          console.error(
            `Failed to ${!isOnline ? 'start' : 'stop'} DVM:`, 
            Cause.squash(exit.cause)
          );
          alert(`Failed to ${!isOnline ? 'start' : 'stop'} the service. Check console for details.`);
        }
      });
    } else {
      alert("Please connect your wallet and Ollama to go online.");
    }
  };

  const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
  const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-center text-lg">Sell Compute Power</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
              {isWalletConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Wallet</p>
                <p className={cn("text-xs", walletStatusColor)}>{walletStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Wallet Status" onClick={checkWalletStatus} disabled={statusLoading.wallet}>
                 {statusLoading.wallet ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Wallet Info"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
             {isOllamaConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Ollama</p>
                <p className={cn("text-xs", ollamaStatusColor)}>{ollamaStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Ollama Status" onClick={checkOllamaStatus} disabled={statusLoading.ollama}>
                 {statusLoading.ollama ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Ollama Info"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <CardDescription className="text-center text-xs px-2 pt-2">
            To sell compute, connect your wallet and Ollama, then click '{isOnline ? "Go Offline" : "Go Online"}'.
          </CardDescription>

          <Button
            onClick={handleGoOnline}
            className="w-full py-3 text-base"
            variant={isOnline ? "outline" : "default"}
            disabled={(statusLoading.wallet || statusLoading.ollama || (!isWalletConnected || !isOllamaConnected)) && !isOnline}
          >
            {isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />}
            {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellComputePane;