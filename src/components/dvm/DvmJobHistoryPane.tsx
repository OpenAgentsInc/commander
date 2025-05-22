// src/components/dvm/DvmJobHistoryPane.tsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Effect, Exit, Cause } from "effect";
import { Kind5050DVMService } from "@/services/dvm/Kind5050DVMService";
import { getMainRuntime } from "@/services/runtime";
import { JobHistoryEntry, JobStatistics, JobStatus } from "@/types/dvm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, RefreshCcw, AlertCircle } from "lucide-react";
import { TelemetryService } from "@/services/telemetry";

const ITEMS_PER_PAGE = 10;

const DvmJobHistoryPane: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const runtime = getMainRuntime();

  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<JobStatistics, Error>({
    queryKey: ["dvmJobStatistics"],
    queryFn: async () => {
      const program = Effect.flatMap(Kind5050DVMService, (s) =>
        s.getJobStatistics(),
      );
      const exitResult = await Effect.runPromiseExit(
        Effect.provide(program, runtime),
      );
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
  });

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refetchHistory,
    isFetching: isFetchingHistory,
  } = useQuery<{ entries: JobHistoryEntry[]; totalCount: number }, Error>({
    queryKey: ["dvmJobHistory", currentPage, ITEMS_PER_PAGE],
    queryFn: async () => {
      const program = Effect.flatMap(Kind5050DVMService, (s) =>
        s.getJobHistory({ page: currentPage, pageSize: ITEMS_PER_PAGE }),
      );
      const exitResult = await Effect.runPromiseExit(
        Effect.provide(program, runtime),
      );
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
    placeholderData: (previousData) => previousData,
  });

  // Telemetry for opening the pane
  Effect.runFork(
    Effect.flatMap(TelemetryService, (ts) =>
      ts.trackEvent({
        category: "ui:pane",
        action: "open_dvm_job_history_pane",
      }),
    ).pipe(Effect.provide(runtime)),
  );

  const totalPages = historyData
    ? Math.ceil(historyData.totalCount / ITEMS_PER_PAGE)
    : 0;

  const handleRefresh = () => {
    refetchStats();
    refetchHistory();
  };

  const getStatusBadgeVariant = (
    status: JobStatus,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
      case "paid":
        return "default"; // Greenish in dark theme (assuming primary is "success like")
      case "processing":
        return "secondary"; // Bluish or Greyish
      case "pending_payment":
        return "outline"; // Yellowish or default outline
      case "error":
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex flex-shrink-0 items-center justify-between">
        <h2 className="text-lg font-semibold">DVM Activity Overview</h2>
        <Button
          onClick={handleRefresh}
          size="sm"
          variant="outline"
          disabled={isLoadingStats || isFetchingHistory}
        >
          <RefreshCcw
            className={`mr-1.5 h-3 w-3 ${isLoadingStats || isFetchingHistory ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Statistics Section */}
      <div className="grid flex-shrink-0 grid-cols-2 gap-3 md:grid-cols-4">
        {isLoadingStats &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <CardTitle className="bg-muted h-4 w-3/4 rounded"></CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted h-8 w-1/2 rounded"></div>
              </CardContent>
            </Card>
          ))}
        {statsError && (
          <Card className="bg-destructive/10 border-destructive col-span-full">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center">
                <AlertCircle className="mr-1.5 h-4 w-4" />
                Statistics Error
              </CardTitle>
            </CardHeader>
            <CardContent className="text-destructive/80 text-xs">
              {statsError.message}
            </CardContent>
          </Card>
        )}
        {statsData && !isLoadingStats && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">
                  {statsData.totalJobsProcessed}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Successful</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-green-500">
                  {statsData.totalSuccessfulJobs}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Revenue (₿)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-yellow-500">
                  {statsData.totalRevenueSats}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-destructive text-xl font-bold">
                  {statsData.totalFailedJobs}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Job History Table */}
      <div className="border-border/50 min-h-0 flex-grow rounded-md border">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="bg-background/95 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[150px]">Timestamp</TableHead>
                <TableHead>Job ID</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount (₿)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingHistory &&
                !historyData &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`loading-${i}`} className="animate-pulse">
                    <TableCell>
                      <div className="bg-muted h-4 w-full rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="bg-muted h-4 w-full rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="bg-muted h-4 w-full rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="bg-muted h-4 w-1/4 rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="bg-muted h-4 w-1/2 rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="bg-muted h-4 w-1/4 rounded"></div>
                    </TableCell>
                  </TableRow>
                ))}
              {historyError && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-destructive text-center"
                  >
                    Error loading history: {historyError.message}
                  </TableCell>
                </TableRow>
              )}
              {historyData?.entries.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="text-xs">
                    {new Date(job.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell
                    className="font-mono text-xs"
                    title={job.jobRequestEventId}
                  >
                    {job.jobRequestEventId.substring(0, 8)}...
                  </TableCell>
                  <TableCell
                    className="font-mono text-xs"
                    title={job.requesterPubkey}
                  >
                    {job.requesterPubkey.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="text-xs">{job.kind}</TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusBadgeVariant(job.status)}
                      className="text-[10px]"
                    >
                      {job.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {job.invoiceAmountSats ?? "N/A"}
                  </TableCell>
                </TableRow>
              ))}
              {historyData?.entries.length === 0 && !isLoadingHistory && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground text-center"
                  >
                    No job history available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Pagination Controls */}
      {historyData && totalPages > 0 && (
        <div className="flex flex-shrink-0 items-center justify-end space-x-2 py-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isFetchingHistory}
          >
            <ArrowLeft className="mr-1.5 h-3 w-3" /> Previous
          </Button>
          <span className="text-muted-foreground text-xs">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isFetchingHistory}
          >
            Next <ArrowRight className="ml-1.5 h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default DvmJobHistoryPane;
