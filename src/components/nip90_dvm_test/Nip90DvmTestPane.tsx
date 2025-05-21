import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, ZapOff, Wifi, WifiOff, RefreshCcw, Loader2, Play, FlaskConical } from 'lucide-react';
import { SparkService } from '@/services/spark';
import { OllamaService } from '@/services/ollama';
import { Kind5050DVMService } from '@/services/dvm';
import { getMainRuntime } from '@/services/runtime';
import { Effect, Exit, Cause } from 'effect';
import { cn } from '@/utils/tailwind';

const Nip90DvmTestPane: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [statusLoading, setStatusLoading] = useState({ wallet: false, ollama: false });
  const [isDvmLoading, setIsDvmLoading] = useState(false);
  const [testPrompt, setTestPrompt] = useState<string>("Translate 'hello world' to French.");
  const [testJobResult, setTestJobResult] = useState<string | null>(null);
  const [testJobError, setTestJobError] = useState<string | null>(null);
  const [isTestJobRunning, setIsTestJobRunning] = useState(false);

  const runtime = getMainRuntime();

  const checkWalletStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, wallet: true }));
    const walletProgram = Effect.flatMap(SparkService, s => s.checkWalletStatus());
    Effect.runPromiseExit(Effect.provide(walletProgram, runtime)).then(exit => {
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
      if (window.electronAPI?.ollama?.checkStatus) {
        const isConnected = await window.electronAPI.ollama.checkStatus();
        setIsOllamaConnected(isConnected);
      } else { // Fallback if IPC not available
        const ollamaProgram = Effect.flatMap(OllamaService, s => s.checkOllamaStatus());
        const exit = await Effect.runPromiseExit(Effect.provide(ollamaProgram, runtime));
        if (Exit.isSuccess(exit)) setIsOllamaConnected(exit.value); else setIsOllamaConnected(false);
      }
    } catch (error) { setIsOllamaConnected(false); }
    finally { setStatusLoading(s => ({ ...s, ollama: false })); }
  }, [runtime]);

  const checkDVMStatus = useCallback(async () => {
    setIsDvmLoading(true);
    const dvmStatusProgram = Effect.flatMap(Kind5050DVMService, s => s.isListening());
    Effect.runPromiseExit(Effect.provide(dvmStatusProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsOnline(exit.value);
      else { console.error("Failed to check DVM status:", Cause.squash(exit.cause)); setIsOnline(false); }
      setIsDvmLoading(false);
    });
  }, [runtime]);

  useEffect(() => {
    checkWalletStatus();
    const timer = setTimeout(checkOllamaStatus, 1000); // Delayed check
    checkDVMStatus();
    return () => clearTimeout(timer);
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
    const exit = await Effect.runPromiseExit(Effect.provide(dvmAction, runtime));
    if (Exit.isSuccess(exit)) { await checkDVMStatus(); }
    else { 
      console.error(`Failed to ${isOnline ? 'stop' : 'start'} DVM:`, Cause.squash(exit.cause)); 
      await checkDVMStatus(); 
    }
  };

  const handleSendTestJob = async () => {
    if (!isOnline) {
      alert("DVM is not online. Go online first to send a test job.");
      return;
    }
    setIsTestJobRunning(true);
    setTestJobResult(null);
    setTestJobError(null);

    const program = Effect.flatMap(Kind5050DVMService, service => service.processLocalTestJob(testPrompt));
    const exit = await Effect.runPromiseExit(Effect.provide(program, runtime));

    if (Exit.isSuccess(exit)) {
      setTestJobResult(exit.value);
    } else {
      const error = Cause.squash(exit.cause);
      if (error instanceof Error) {
        setTestJobError(error.message || "Unknown error processing test job.");
      } else if (typeof error === 'string') {
        setTestJobError(error || "Unknown error processing test job.");
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        setTestJobError(error.message || "Unknown error processing test job.");
      } else {
        setTestJobError("An unknown error occurred processing the test job.");
      }
      console.error("Test job error:", error);
    }
    setIsTestJobRunning(false);
  };

  const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
  const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm" data-testid="nip90-dvm-test-pane">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg text-center">NIP-90 DVM Test Interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status indicators */}
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
              {isWalletConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div><p className="font-semibold">Wallet</p><p className={cn("text-xs", walletStatusColor)}>{walletStatusText}</p></div>
            </div>
            <Button variant="ghost" size="icon" title="Check Wallet Status" onClick={checkWalletStatus} disabled={statusLoading.wallet}>
              {statusLoading.wallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
              {isOllamaConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div><p className="font-semibold">Ollama</p><p className={cn("text-xs", ollamaStatusColor)}>{ollamaStatusText}</p></div>
            </div>
            <Button variant="ghost" size="icon" title="Check Ollama Status" onClick={checkOllamaStatus} disabled={statusLoading.ollama}>
              {statusLoading.ollama ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            </Button>
          </div>

          <Button
            onClick={handleGoOnlineToggle}
            className="w-full py-3 text-base"
            variant={isOnline ? "outline" : "default"}
            disabled={isDvmLoading || ((!isWalletConnected || !isOllamaConnected) && !isOnline)}
          >
            {isDvmLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />)}
            {isDvmLoading ? (isOnline ? 'Stopping...' : 'Starting...') : (isOnline ? 'GO OFFLINE' : 'GO ONLINE')}
          </Button>

          <CardDescription className="text-center text-xs px-2 pt-2">
            Simulate an incoming NIP-90 job request to this DVM.
          </CardDescription>

          <div className="space-y-1.5">
            <Input
              id="testPrompt"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter test prompt"
              disabled={isTestJobRunning || !isOnline}
            />
          </div>
          <Button
            onClick={handleSendTestJob}
            className="w-full"
            disabled={isTestJobRunning || !isOnline}
          >
            {isTestJobRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Send Test Job to Self
          </Button>

          {(testJobResult || testJobError) && (
            <ScrollArea className="h-24 mt-2 p-2 border rounded bg-muted/50 text-xs">
              {testJobResult && <pre className="whitespace-pre-wrap text-green-400">{testJobResult}</pre>}
              {testJobError && <pre className="whitespace-pre-wrap text-destructive">{testJobError}</pre>}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Nip90DvmTestPane;