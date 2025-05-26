import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Effect, Exit, Cause } from "effect";
import { DatabaseService, type DBSession } from "@/services/db";
import { getMainRuntime } from "@/services/runtime";
import { usePaneStore } from "@/stores/pane";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Loader2, MessageSquare, History } from "lucide-react";
import { TelemetryService } from "@/services/telemetry";
import { AGENT_CHAT_PANE_TITLE } from "@/stores/panes/constants";

const PreviousChatsPane: React.FC = () => {
  const runtime = getMainRuntime();
  const { addPane } = usePaneStore();

  const {
    data: sessions,
    isLoading,
    error,
    refetch,
  } = useQuery<DBSession[], Error>({
    queryKey: ["allChatSessions"],
    queryFn: async () => {
      const program = Effect.flatMap(DatabaseService, (db) =>
        db.getAllSessions({ sortBy: "last_updated_at", sortOrder: "DESC", limit: 100 }),
      );
      const exitResult = await Effect.runPromiseExit(Effect.provide(program, runtime));
      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
  });

  React.useEffect(() => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: "ui:pane",
          action: "open_previous_chats_pane",
        }),
      ).pipe(Effect.provide(runtime)),
    );
  }, [runtime]);

  const handleThreadClick = (session: DBSession) => {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: "ui:previous_chats",
          action: "open_thread",
          label: session.id,
          value: (session as any).title,
        }),
      ).pipe(Effect.provide(runtime)),
    );
    addPane({
      id: `agent_chat_session_${session.id}`, // Ensure unique pane ID for each session
      type: "agent_chat",
      title: (session as any).title || `${AGENT_CHAT_PANE_TITLE} (${session.id.substring(0,6)}...)`,
      content: { sessionId: session.id, sessionTitle: (session as any).title }, // Pass sessionId and title
      dismissable: true,
    }, true); // shouldTile = true
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-full flex-col p-1">
      {isLoading && (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading chat history...</span>
        </div>
      )}
      {error && (
        <div className="m-4 flex flex-col items-center justify-center text-center text-destructive">
          <AlertCircle className="mb-2 h-8 w-8" />
          <p className="font-semibold">Error loading chat history:</p>
          <p className="text-xs">{error.message}</p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-3">
            Retry
          </Button>
        </div>
      )}
      {!isLoading && !error && sessions && sessions.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
          <MessageSquare className="mb-2 h-10 w-10" />
          <p>No chat history found.</p>
          <p className="text-xs">Start a new chat in the Agent Chat pane.</p>
        </div>
      )}
      {!isLoading && !error && sessions && sessions.length > 0 && (
        <ScrollArea className="h-full">
          <div className="space-y-2 p-1">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => handleThreadClick(session)}
              >
                <CardHeader className="p-2">
                  <CardTitle className="truncate text-sm">
                    {(session as any).title || "Untitled Chat"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Provider: {session.provider_key || "N/A"} | Model: {session.model_name || "N/A"}
                    <br />
                    Last active: {formatDate(session.last_updated_at)}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default PreviousChatsPane;