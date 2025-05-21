import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, HelpCircle, Zap, ZapOff, Wifi, WifiOff, RefreshCcw, Loader2 } from 'lucide-react';
import { SparkService } from '@/services/spark';
import { OllamaService } from '@/services/ollama';
import { Kind5050DVMService } from '@/services/dvm';
import { getMainRuntime } from '@/services/runtime';
import { Effect } from 'effect';
import { runPromiseExit } from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Cause from 'effect/Cause';
import { cn } from '@/utils/tailwind';
import { DVMSettingsDialog } from '@/components/dvm';

const SellComputePane: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [statusLoading, setStatusLoading] = useState({ wallet: false, ollama: false });
  const [isDvmLoading, setIsDvmLoading] = useState(false); // Loading state for DVM operations

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
    
    try {
      console.log("[SellComputePane] Attempting to check Ollama status via IPC");
      
      // First try the IPC channel
      if (window.electronAPI?.ollama?.checkStatus) {
        try {
          const isConnected = await window.electronAPI.ollama.checkStatus();
          console.log("[SellComputePane] IPC Ollama status check succeeded:", isConnected);
          setIsOllamaConnected(isConnected);
          return;
        } catch (ipcError) {
          console.error("[SellComputePane] IPC Ollama status check failed, falling back to direct check:", ipcError);
          // Continue to fallback
        }
      } else {
        console.warn("[SellComputePane] IPC checkStatus not available, using direct check");
      }
      
      // Fallback: Try direct HTTP check with Effect (might fail due to CORS)
      console.log("[SellComputePane] Attempting direct Ollama status check");
      const ollamaProgram = Effect.flatMap(OllamaService, s => s.checkOllamaStatus());
      const exit = await runPromiseExit(Effect.provide(ollamaProgram, runtime));
      
      if (Exit.isSuccess(exit)) {
        console.log("[SellComputePane] Direct Ollama status check succeeded:", exit.value);
        setIsOllamaConnected(exit.value);
      } else {
        console.error("[SellComputePane] Direct Ollama status check failed:", Cause.squash(exit.cause));
        setIsOllamaConnected(false);
      }
    } catch (error) {
      console.error("[SellComputePane] Ollama status check failed with uncaught error:", error);
      setIsOllamaConnected(false);
    } finally {
      setStatusLoading(s => ({ ...s, ollama: false }));
    }
  }, [runtime]);

  const checkDVMStatus = useCallback(async () => {
    setIsDvmLoading(true); // Show loading state while checking
    const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, s => s.isListening());
    runPromiseExit(Effect.provide(dvmStatusProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) {
        setIsOnline(exit.value);
      } else {
        console.error("Failed to check DVM status:", Cause.squash(exit.cause));
        setIsOnline(false); // Default to offline on error
      }
      setIsDvmLoading(false); // Hide loading state when done
    });
  }, [runtime]);

  useEffect(() => {
    // Add a delay before checking Ollama status to ensure IPC handlers are registered
    checkWalletStatus();
    
    // Delay the Ollama status check to give the main process time to register handlers
    const ollamaCheckTimer = setTimeout(() => {
      console.log("[SellComputePane] Running delayed Ollama status check");
      checkOllamaStatus();
    }, 1000); // 1 second delay
    
    checkDVMStatus();
    
    return () => clearTimeout(ollamaCheckTimer);
  }, [checkWalletStatus, checkOllamaStatus, checkDVMStatus]);

  const handleGoOnlineToggle = async () => {
    if ((!isWalletConnected || !isOllamaConnected) && !isOnline) {
      alert("Please ensure your wallet and Ollama are connected to go online.");
      return;
    }

    setIsDvmLoading(true);

    const dvmAction = isOnline
      ? Effect.flatMap(Kind5050DVMService, s => s.stopListening())
      : Effect.flatMap(Kind5050DVMService, s => s.startListening());

    const exit = await runPromiseExit(Effect.provide(dvmAction, runtime));

    if (Exit.isSuccess(exit)) {
      // Re-check actual DVM status from service
      await checkDVMStatus();
      console.log(`DVM Service ${isOnline ? 'stop' : 'start'} command successful.`);
    } else {
      console.error(`Failed to ${isOnline ? 'stop' : 'start'} DVM:`, Cause.squash(exit.cause));
      alert(`Failed to ${isOnline ? 'stop' : 'start'} the service. Check console for details.`);
      await checkDVMStatus(); // Re-check to ensure UI reflects actual state
    }
    // Loading state is handled by checkDVMStatus
  };

  const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
  const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="text-center flex-grow">
            <CardTitle className="text-lg">Sell Compute Power</CardTitle>
          </div>
          <DVMSettingsDialog />
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
                 {statusLoading.wallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
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
                 {statusLoading.ollama ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Ollama Info"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <CardDescription className="text-center text-xs px-2 pt-2">
            To sell compute, connect your wallet and Ollama, then click '{isOnline ? "Go Offline" : "Go Online"}'.
          </CardDescription>

          <Button
            onClick={handleGoOnlineToggle}
            className="w-full py-3 text-base"
            variant={isOnline ? "outline" : "default"}
            disabled={isDvmLoading || ((!isWalletConnected || !isOllamaConnected) && !isOnline)}
          >
            {isDvmLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />)}
            {isDvmLoading ? (isOnline ? 'Stopping...' : 'Starting...') : (isOnline ? 'GO OFFLINE' : 'GO ONLINE')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellComputePane;