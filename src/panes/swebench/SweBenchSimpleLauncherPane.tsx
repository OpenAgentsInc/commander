import React, { useState, useEffect, useCallback } from "react";
import { Pane } from "@/types/pane";
import { usePaneStore } from "@/stores/pane";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, DownloadCloud, Play, Shuffle } from "lucide-react";

interface SweBenchSimpleLauncherPaneProps { 
  pane: Pane; 
}

const FULL_DATASET_NAME = "princeton-nlp/SWE-bench";

export const SweBenchSimpleLauncherPane: React.FC<SweBenchSimpleLauncherPaneProps> = ({ pane }) => {
  const { openEvaluationLauncherPane } = usePaneStore();

  const [datasetStatus, setDatasetStatus] = useState<{
    exists: boolean; path: string; taskCount?: number; datasetName: string;
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [randomTaskCount, setRandomTaskCount] = useState<string>("10");
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setError(null);
    try {
      const status = await window.electronAPI.sweBench!.checkDatasetStatus(FULL_DATASET_NAME);
      setDatasetStatus(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check dataset status");
      setDatasetStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (!window.electronAPI?.sweBench?.onDatasetDownloadEvent) return;

    const removeListener = window.electronAPI.sweBench.onDatasetDownloadEvent(
      (data) => {
        if (data.type === 'progress' && data.message) {
          setDownloadMessage(data.message);
          if (data.progress !== undefined) setDownloadProgress(data.progress);
        } else if (data.type === 'error' && data.message) {
          const errorMsg = data.message;
          let helpfulError = errorMsg;
          
          // Add helpful context for common errors
          if (errorMsg.includes("Python 3 is not installed")) {
            helpfulError = "Python 3 is required. Please install Python 3.7 or later from python.org";
          } else if (errorMsg.includes("Missing required Python packages") || errorMsg.includes("pip install datasets")) {
            helpfulError = "Missing Python dependencies. Please run: pip install datasets";
          } else if (errorMsg.includes("Download process exited with code 1")) {
            helpfulError = "Download failed. Check if Python 3 is installed and run: pip install datasets";
          }
          
          setError(helpfulError);
          setDownloadMessage(`Error: ${helpfulError}`);
          setIsDownloading(false);
        } else if (data.type === 'complete') {
          setDownloadMessage(data.message || "Download complete!");
          setIsDownloading(false);
          setDownloadProgress(100);
          checkStatus(); // Refresh status after download
        }
      }
    );
    return removeListener;
  }, [checkStatus]);

  const handleDownloadDataset = async () => {
    if (!window.electronAPI?.sweBench?.downloadDataset) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadMessage("Starting download...");
    setError(null);
    try {
      await window.electronAPI.sweBench.downloadDataset({ datasetName: FULL_DATASET_NAME });
      // Progress will be handled by the event listener
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start download");
      setIsDownloading(false);
    }
  };

  const handleStartFullRun = () => {
    if (!datasetStatus || !datasetStatus.exists || !datasetStatus.path) {
      setError("Dataset not ready.");
      return;
    }
    openEvaluationLauncherPane({
      taskInstanceIds: [], // Empty array signifies all tasks in tasksDir
      tasksDir: datasetStatus.path // Use the path of the full dataset
    });
  };

  const handleStartRandomRun = async () => {
    if (!datasetStatus || !datasetStatus.exists || !datasetStatus.path) {
      setError("Dataset not ready.");
      return;
    }
    const count = parseInt(randomTaskCount, 10);
    if (isNaN(count) || count <= 0) {
      setError("Please enter a valid number of tasks.");
      return;
    }
    try {
      setIsLoading(true);
      const randomIds = await window.electronAPI.sweBench!.getRandomTaskIds(datasetStatus.path, count);
      if (randomIds.length === 0) {
        setError(`Could not select ${count} random tasks. Dataset might be too small or empty.`);
        setIsLoading(false);
        return;
      }
      openEvaluationLauncherPane({
        taskInstanceIds: randomIds,
        tasksDir: datasetStatus.path
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get random tasks.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>SWE-Bench Dataset Management</CardTitle>
          <CardDescription>
            Manage and download the official <code className="font-semibold">{FULL_DATASET_NAME}</code> dataset from Hugging Face.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingStatus && <Loader2 className="h-5 w-5 animate-spin" />}
          {!isLoadingStatus && datasetStatus && (
            <div>
              <p>Status: <span className={datasetStatus.exists ? "text-green-500" : "text-orange-500"}>
                {datasetStatus.exists ? `Found (${datasetStatus.taskCount || 0} tasks)` : "Not Downloaded"}
              </span></p>
              <p className="text-sm text-muted-foreground">Path: {datasetStatus.path || "N/A"}</p>
            </div>
          )}
          <Button onClick={handleDownloadDataset} disabled={isDownloading} className="w-full">
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
            {datasetStatus?.exists ? "Refresh Full Dataset" : "Download Full Dataset"}
          </Button>
          {isDownloading && (
            <div className="space-y-1">
              <Progress value={downloadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">{downloadMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Run Evaluations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-semibold">Full Dataset Run</h3>
            <Button
              onClick={handleStartFullRun}
              disabled={isDownloading || !datasetStatus?.exists || (datasetStatus?.taskCount || 0) === 0}
              className="w-full"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Full Run ({datasetStatus?.taskCount || 0} tasks)
            </Button>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Random Subset Run</h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="random-task-count" className="whitespace-nowrap">Number of tasks (X):</Label>
              <Input
                id="random-task-count"
                type="number"
                value={randomTaskCount}
                onChange={(e) => setRandomTaskCount(e.target.value)}
                className="w-24"
                min="1"
              />
            </div>
            <Button
              onClick={handleStartRandomRun}
              disabled={isDownloading || isLoading || !datasetStatus?.exists || (datasetStatus?.taskCount || 0) === 0}
              className="w-full"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Start Random Run
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};