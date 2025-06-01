import React, { useState, useEffect } from "react";
import { Pane } from "@/types/pane";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, FileCode, Loader2, AlertCircle } from "lucide-react";

interface ResultsViewerPaneProps {
  pane: Pane;
}

interface ResultsViewerContent {
  selectedRunDir?: string;
}

interface RunSummary {
  run_id: string;
  tasks_attempted: number;
  tasks_succeeded: number;
  tasks_failed: number;
  duration_seconds: number;
  start_time: string;
  end_time: string;
  patch_source: string;
  results: TaskResult[];
}

interface TaskResult {
  instance_id: string;
  resolved: boolean;
  patch_source: string;
  duration: number;
  error?: string;
  generated_patch_content?: string;
}

export const ResultsViewerPane: React.FC<ResultsViewerPaneProps> = ({ pane }) => {
  const content = pane.content as ResultsViewerContent;
  const initialRunDir = content?.selectedRunDir || "";
  
  const [loading, setLoading] = useState(false);
  const [availableRuns, setAvailableRuns] = useState<string[]>([]);
  const [selectedRunDir, setSelectedRunDir] = useState<string>(initialRunDir);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskResult | null>(null);
  const [showPatchDialog, setShowPatchDialog] = useState(false);

  // Load available runs
  useEffect(() => {
    const loadRuns = async () => {
      if (!window.electronAPI?.sweBench) return;
      
      try {
        const runs = await window.electronAPI.sweBench.listResultRuns();
        setAvailableRuns(runs);
        
        // If initial run dir is provided and exists, keep it selected
        if (initialRunDir && runs.includes(initialRunDir)) {
          setSelectedRunDir(initialRunDir);
        } else if (runs.length > 0 && !selectedRunDir) {
          setSelectedRunDir(runs[0]);
        }
      } catch (err) {
        console.error("Error loading runs:", err);
      }
    };
    
    loadRuns();
  }, [initialRunDir]);

  // Load summary when run is selected
  useEffect(() => {
    const loadSummary = async () => {
      if (!selectedRunDir || !window.electronAPI?.sweBench) return;
      
      setLoading(true);
      try {
        const result = await window.electronAPI.sweBench.getResultSummary(selectedRunDir);
        setSummary(result);
      } catch (err) {
        console.error("Error loading summary:", err);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadSummary();
  }, [selectedRunDir]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleViewPatch = (task: TaskResult) => {
    if (task.generated_patch_content) {
      setSelectedTask(task);
      setShowPatchDialog(true);
    }
  };

  const getSuccessRate = () => {
    if (!summary || summary.tasks_attempted === 0) return 0;
    return (summary.tasks_succeeded / summary.tasks_attempted) * 100;
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">SWE-Bench Results Viewer</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <Select value={selectedRunDir} onValueChange={setSelectedRunDir}>
              <SelectTrigger>
                <SelectValue placeholder="Select a run to view" />
              </SelectTrigger>
              <SelectContent>
                {availableRuns.map(run => (
                  <SelectItem key={run} value={run}>{run}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : summary ? (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.tasks_attempted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Succeeded</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-500">{summary.tasks_succeeded}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Failed</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{summary.tasks_failed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Success Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{getSuccessRate().toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Run Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Run Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Run ID</p>
                  <p className="font-mono text-sm">{summary.run_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Patch Source</p>
                  <Badge variant="outline">{summary.patch_source}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-sm">{formatDuration(summary.duration_seconds)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-sm">{new Date(summary.end_time).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Task Results</CardTitle>
            </CardHeader>
            <CardContent className="h-full pb-6">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Instance ID</TableHead>
                      <TableHead>Patch Source</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.results.map((result) => (
                      <TableRow key={result.instance_id}>
                        <TableCell>
                          {result.resolved ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{result.instance_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.patch_source}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDuration(result.duration)}
                        </TableCell>
                        <TableCell>
                          {result.generated_patch_content && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewPatch(result)}
                            >
                              <FileCode className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>No results available</p>
            <p className="text-sm mt-2">Select a run from the dropdown to view results</p>
          </div>
        </div>
      )}

      {/* Patch Viewer Dialog */}
      <Dialog open={showPatchDialog} onOpenChange={setShowPatchDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Generated Patch</DialogTitle>
            <DialogDescription>
              {selectedTask?.instance_id}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <pre className="text-sm font-mono bg-muted p-4 rounded-md">
              {selectedTask?.generated_patch_content}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};