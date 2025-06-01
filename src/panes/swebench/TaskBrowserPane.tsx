import React, { useState, useEffect, useMemo } from "react";
import { Pane } from "@/types/pane";
import { usePaneStore } from "@/stores/pane";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";

interface TaskBrowserPaneProps {
  pane: Pane;
}

interface SWEBenchTask {
  instance_id: string;
  repo: string;
  base_commit: string;
  problem_statement: string;
  version?: string;
  created_at?: string;
  resolved?: boolean;
}

export const TaskBrowserPane: React.FC<TaskBrowserPaneProps> = ({ pane }) => {
  const openEvaluationLauncherPane = usePaneStore((state) => state.openEvaluationLauncherPane);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasksDir, setTasksDir] = useState<string>("");
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<SWEBenchTask | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [availableDirs, setAvailableDirs] = useState<string[]>([]);

  // Debug openEvaluationLauncherPane once on mount
  useEffect(() => {
    console.log("[TaskBrowserPane] Component mounted");
    console.log("[TaskBrowserPane] openEvaluationLauncherPane available:", !!openEvaluationLauncherPane);
  }, []); // Empty dependency array - only run once

  // Load available task directories
  useEffect(() => {
    const loadAvailableDirs = async () => {
      try {
        if (!window.electronAPI?.fs) {
          console.error("File system API not available");
          return;
        }
        const dirs = await window.electronAPI.fs.listDirs("assets/swebench-tasks");
        // Add root directory option at the beginning
        const allDirs = [".", ...dirs];
        setAvailableDirs(allDirs);
        
        // Set initial directory if not already set
        if (!tasksDir && allDirs.length > 0) {
          setTasksDir(allDirs[0]);
        }
      } catch (err) {
        console.error("Error loading available directories:", err);
      }
    };
    loadAvailableDirs();
  }, []); // Remove tasksDir dependency to avoid infinite loop

  // Load task IDs when directory changes
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      setError(null);
      setSelectedTaskId(null);
      setSelectedTask(null);
      setSelectedTaskIds(new Set());
      
      try {
        if (!window.electronAPI?.sweBench) {
          throw new Error("SWE-Bench API not available");
        }
        
        const ids = await window.electronAPI.sweBench.listTasks(tasksDir);
        setTaskIds(ids);
      } catch (err) {
        console.error("Error loading tasks:", err);
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, [tasksDir]);

  // Load selected task details
  useEffect(() => {
    const loadTaskDetails = async () => {
      if (!selectedTaskId || !window.electronAPI?.sweBench) return;
      
      try {
        const task = await window.electronAPI.sweBench.getTask(tasksDir, selectedTaskId);
        if (task) {
          setSelectedTask(task);
        }
      } catch (err) {
        console.error("Error loading task details:", err);
      }
    };
    
    loadTaskDetails();
  }, [selectedTaskId, tasksDir]);

  // Filter tasks based on search query
  const filteredTaskIds = useMemo(() => {
    if (!searchQuery) return taskIds;
    
    const query = searchQuery.toLowerCase();
    return taskIds.filter(id => id.toLowerCase().includes(query));
  }, [taskIds, searchQuery]);

  const handleToggleSelection = (taskId: string) => {
    const newSelection = new Set(selectedTaskIds);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTaskIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.size === filteredTaskIds.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTaskIds));
    }
  };

  const handleLaunchEvaluation = () => {
    if (selectedTaskIds.size === 0) {
      console.warn("[TaskBrowserPane] No tasks selected!");
      setError("Please select at least one task");
      return;
    }
    
    if (!openEvaluationLauncherPane) {
      console.error("[TaskBrowserPane] openEvaluationLauncherPane is not defined!");
      setError("Unable to open evaluation launcher - function not available");
      return;
    }
    
    try {
      console.log(`[TaskBrowserPane] Launching evaluation for ${selectedTaskIds.size} tasks from ${tasksDir || 'root'}`);
      
      openEvaluationLauncherPane({
        taskInstanceIds: Array.from(selectedTaskIds),
        tasksDir: tasksDir || "."
      });
    } catch (err) {
      console.error("[TaskBrowserPane] Error calling openEvaluationLauncherPane:", err);
      setError("Failed to open evaluation launcher");
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">SWE-Bench Task Browser</h2>
          <div className="flex items-center gap-2">
            <Select value={tasksDir} onValueChange={setTasksDir}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select task directory" />
              </SelectTrigger>
              <SelectContent>
                {availableDirs.map(dir => (
                  <SelectItem key={dir} value={dir}>
                    {dir === "." ? "Root (all tasks)" : dir}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleSelectAll}
            variant="outline"
            disabled={loading || filteredTaskIds.length === 0}
          >
            {selectedTaskIds.size === filteredTaskIds.length ? "Deselect All" : "Select All"}
          </Button>
          <Button 
            onClick={handleLaunchEvaluation}
            disabled={selectedTaskIds.size === 0}
          >
            Launch Evaluation ({selectedTaskIds.size})
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Task List */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tasks</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : `${filteredTaskIds.length} tasks found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Instance ID</TableHead>
                      <TableHead>Repository</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTaskIds.map((taskId) => (
                      <TableRow
                        key={taskId}
                        className={`cursor-pointer ${selectedTaskId === taskId ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedTaskId(taskId)}
                      >
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelection(taskId);
                            }}
                          >
                            {selectedTaskIds.has(taskId) ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{taskId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {taskId.split('__')[0]}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Task Preview */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Task Details</CardTitle>
            <CardDescription>
              {selectedTaskId || "Select a task to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTask ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Repository</h4>
                    <p className="text-sm text-muted-foreground">{selectedTask.repo}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Base Commit</h4>
                    <p className="text-sm text-muted-foreground font-mono">{selectedTask.base_commit}</p>
                  </div>
                  {selectedTask.version && (
                    <div>
                      <h4 className="font-medium mb-1">Version</h4>
                      <p className="text-sm text-muted-foreground">{selectedTask.version}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium mb-1">Problem Statement</h4>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedTask.problem_statement}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a task to view its details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};