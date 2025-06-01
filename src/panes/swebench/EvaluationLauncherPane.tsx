import React, { useState } from "react";
import { Pane } from "@/types/pane";
import { usePaneStore } from "@/stores/pane";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, AlertCircle } from "lucide-react";

interface EvaluationLauncherPaneProps {
  pane: Pane;
}

interface EvaluationLauncherContent {
  taskInstanceIds?: string[];
  tasksDir?: string;
}

export const EvaluationLauncherPane: React.FC<EvaluationLauncherPaneProps> = ({ pane }) => {
  const { openEvaluationMonitorPane, removePane } = usePaneStore();
  const content = pane.content as EvaluationLauncherContent;
  const selectedTaskIds = content?.taskInstanceIds || [];
  const tasksDir = content?.tasksDir || "patches";
  
  const [patchSource, setPatchSource] = useState<string>("gold");
  const [outputDirSuffix, setOutputDirSuffix] = useState<string>("");
  const [maxTasks, setMaxTasks] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunEvaluation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!window.electronAPI?.sweBench) {
        throw new Error("SWE-Bench API not available");
      }
      
      const params = {
        instanceIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
        patchSource,
        outputDirName: outputDirSuffix || undefined,
        maxTasks: maxTasks ? parseInt(maxTasks, 10) : undefined,
        tasksDir
      };
      
      const result = await window.electronAPI.sweBench.spawnBatchRun(params);
      
      // Open the evaluation monitor pane
      openEvaluationMonitorPane({
        runId: result.runId,
        outputDir: result.runId,
        totalTasks: selectedTaskIds.length || parseInt(maxTasks, 10) || 0
      });
      
      // Close this pane
      removePane(pane.id);
    } catch (err) {
      console.error("Error launching evaluation:", err);
      setError(err instanceof Error ? err.message : "Failed to launch evaluation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Launch SWE-Bench Evaluation</h2>
        <p className="text-muted-foreground">Configure and start a new evaluation run</p>
      </div>

      <div className="flex-1 flex gap-4">
        {/* Configuration */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Set evaluation parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patch-source">Patch Source</Label>
              <Select value={patchSource} onValueChange={setPatchSource}>
                <SelectTrigger id="patch-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold (Reference Patches)</SelectItem>
                  <SelectItem value="empty">Empty (No Patches)</SelectItem>
                  <SelectItem value="agent:claude_code">Agent: Claude Code</SelectItem>
                  <SelectItem value="agent:ollama">Agent: Ollama</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Source of patches to apply during evaluation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="output-dir">Output Directory Suffix (Optional)</Label>
              <Input
                id="output-dir"
                placeholder="e.g., experiment-1"
                value={outputDirSuffix}
                onChange={(e) => setOutputDirSuffix(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Custom suffix for the output directory name
              </p>
            </div>

            {selectedTaskIds.length === 0 && (
              <div className="space-y-2">
                <Label htmlFor="max-tasks">Max Tasks (Optional)</Label>
                <Input
                  id="max-tasks"
                  type="number"
                  placeholder="Leave empty to run all tasks"
                  value={maxTasks}
                  onChange={(e) => setMaxTasks(e.target.value)}
                  min="1"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of tasks to evaluate
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Tasks Directory</Label>
              <div className="font-mono text-sm bg-muted px-3 py-2 rounded-md">
                {tasksDir}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleRunEvaluation}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Evaluation
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Selected Tasks */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Selected Tasks</CardTitle>
            <CardDescription>
              {selectedTaskIds.length > 0 
                ? `${selectedTaskIds.length} tasks selected`
                : "All tasks will be evaluated"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTaskIds.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {selectedTaskIds.map((taskId) => (
                    <Badge key={taskId} variant="secondary" className="mr-2 mb-2">
                      {taskId}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No specific tasks selected.</p>
                <p>All tasks in the directory will be evaluated.</p>
                {maxTasks && (
                  <p className="mt-2">Limited to {maxTasks} tasks.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};