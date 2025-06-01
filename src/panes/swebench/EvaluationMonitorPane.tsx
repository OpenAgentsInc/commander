import React, { useState, useEffect, useRef } from "react";
import { Pane } from "@/types/pane";
import { usePaneStore } from "@/stores/pane";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Square, Terminal, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface EvaluationMonitorPaneProps {
  pane: Pane;
}

interface EvaluationMonitorContent {
  runId: string;
  tasksDir?: string;
  totalTasks?: number;
}

interface LogEntry {
  timestamp: string;
  type: 'stdout' | 'stderr' | 'system';
  message: string;
}

interface RunSummary {
  tasks_attempted: number;
  tasks_succeeded: number;
  tasks_failed: number;
  duration_seconds?: number;
  results?: Array<{
    instance_id: string;
    resolved: boolean;
    duration?: number;
  }>;
}

export const EvaluationMonitorPane: React.FC<EvaluationMonitorPaneProps> = ({ pane }) => {
  const { openResultsViewerPane } = usePaneStore();
  const content = (pane.content as unknown) as EvaluationMonitorContent;
  const runId = content?.runId || "";
  const totalTasks = content?.totalTasks || 0;
  
  const [isRunning, setIsRunning] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  
  const stdoutListenerRef = useRef<(() => void) | null>(null);
  const stderrListenerRef = useRef<(() => void) | null>(null);
  const exitListenerRef = useRef<(() => void) | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Subscribe to batch run output
  useEffect(() => {
    if (!window.electronAPI?.sweBench || !runId) return;

    const addLog = (type: LogEntry['type'], message: string) => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        type,
        message
      };
      setLogs(prev => [...prev, entry]);
    };

    // Subscribe to stdout
    stdoutListenerRef.current = window.electronAPI.sweBench.onBatchRunOutput(
      'swebench:batch-run-stdout',
      (data) => {
        if (data.runId === runId) {
          addLog('stdout', data.output as string);
        }
      }
    );

    // Subscribe to stderr
    stderrListenerRef.current = window.electronAPI.sweBench.onBatchRunOutput(
      'swebench:batch-run-stderr',
      (data) => {
        if (data.runId === runId) {
          addLog('stderr', data.output as string);
        }
      }
    );

    // Subscribe to exit
    exitListenerRef.current = window.electronAPI.sweBench.onBatchRunOutput(
      'swebench:batch-run-exit',
      (data) => {
        if (data.runId === runId) {
          setExitCode(data.output as number);
          setIsRunning(false);
          addLog('system', `Process exited with code ${data.output}`);
        }
      }
    );

    // Initial log
    addLog('system', `Started evaluation run: ${runId}`);

    return () => {
      if (stdoutListenerRef.current) stdoutListenerRef.current();
      if (stderrListenerRef.current) stderrListenerRef.current();
      if (exitListenerRef.current) exitListenerRef.current();
    };
  }, [runId]);

  // Poll for summary updates
  useEffect(() => {
    if (!window.electronAPI?.sweBench || !runId) return;

    const pollSummary = async () => {
      try {
        const result = await window.electronAPI.sweBench!.getResultSummary(runId);
        if (result) {
          setSummary(result);
        }
      } catch (err) {
        console.error("Error polling summary:", err);
      }
    };

    // Initial poll
    pollSummary();

    // Set up interval
    pollIntervalRef.current = setInterval(pollSummary, 5000); // Poll every 5 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [runId]);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [logs]);

  const handleStopRun = async () => {
    if (!window.electronAPI?.sweBench || !runId) return;
    
    try {
      await window.electronAPI.sweBench.stopBatchRun(runId);
      setIsRunning(false);
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'system',
        message: 'Evaluation run stopped by user'
      }]);
    } catch (err) {
      console.error("Error stopping run:", err);
    }
  };

  const handleViewResults = () => {
    openResultsViewerPane();
  };

  const progress = summary 
    ? (summary.tasks_attempted / (totalTasks || summary.tasks_attempted)) * 100
    : 0;

  const getStatusBadge = () => {
    if (isRunning) {
      return <Badge variant="default">Running</Badge>;
    } else if (exitCode === 0) {
      return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Completed</Badge>;
    } else if (exitCode !== null) {
      return <Badge variant="destructive">Failed (Exit {exitCode})</Badge>;
    } else {
      return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Evaluation Monitor</h2>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Run ID:</span>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{runId}</code>
            {getStatusBadge()}
          </div>
        </div>
        <div className="flex gap-2">
          {isRunning ? (
            <Button variant="destructive" onClick={handleStopRun}>
              <Square className="mr-2 h-4 w-4" />
              Stop Run
            </Button>
          ) : (
            <Button onClick={handleViewResults}>
              View Results
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Progress</CardTitle>
          <CardDescription>
            {summary ? (
              `${summary.tasks_attempted} of ${totalTasks || summary.tasks_attempted} tasks processed`
            ) : (
              "Waiting for data..."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="mb-4" />
          {summary && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Succeeded</span>
                </div>
                <p className="text-2xl font-bold text-green-500">{summary.tasks_succeeded}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">Failed</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{summary.tasks_failed}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Total</span>
                </div>
                <p className="text-2xl font-bold">{summary.tasks_attempted}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Output</CardTitle>
          <CardDescription>Live output from the evaluation process</CardDescription>
        </CardHeader>
        <CardContent className="h-full pb-6">
          <Tabs defaultValue="all" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="stdout">Stdout</TabsTrigger>
              <TabsTrigger value="stderr">Stderr</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="font-mono text-xs space-y-1 p-4 bg-black/5 dark:bg-white/5 rounded">
                  {logs.map((log, index) => (
                    <div key={index} className={`
                      ${log.type === 'stderr' ? 'text-destructive' : ''}
                      ${log.type === 'system' ? 'text-blue-500' : ''}
                    `}>
                      <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      {' '}
                      {log.message}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-muted-foreground">Waiting for output...</div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="stdout" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="font-mono text-xs space-y-1 p-4 bg-black/5 dark:bg-white/5 rounded">
                  {logs.filter(l => l.type === 'stdout').map((log, index) => (
                    <div key={index}>
                      <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      {' '}
                      {log.message}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="stderr" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="font-mono text-xs space-y-1 p-4 bg-black/5 dark:bg-white/5 rounded">
                  {logs.filter(l => l.type === 'stderr').map((log, index) => (
                    <div key={index} className="text-destructive">
                      <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      {' '}
                      {log.message}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};