// src/components/nip90_feed/Nip90GlobalFeedPane.tsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Effect, Exit, Cause } from "effect";
import { NostrEvent } from "@/services/nostr/NostrService";
import { NIP90Service } from "@/services/nip90/NIP90Service";
import { getMainRuntime } from "@/services/runtime";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCcw,
  ExternalLink,
  AlertCircle,
  MessageSquare,
  ArrowDown,
  ArrowUp,
  Info,
} from "lucide-react";
import { TelemetryService } from "@/services/telemetry";
import { bech32 } from "@scure/base";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Component for displaying a single NIP-90 event
const Nip90EventCard: React.FC<{ event: NostrEvent }> = ({ event }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Helper functions for event display
  const formatTimestamp = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleString();
  };

  const formatPubkey = (pubkey: string) => {
    try {
      // Convert to npub format
      return bech32.encode("npub", Buffer.from(pubkey, "hex"));
    } catch (e) {
      return pubkey.substring(0, 8) + "...";
    }
  };

  const getKindLabel = () => {
    const kind = event.kind;
    if (kind >= 5000 && kind < 6000) {
      return `Job Request (${kind})`;
    } else if (kind >= 6000 && kind < 7000) {
      return `Job Result (${kind})`;
    } else if (kind === 7000) {
      const statusTag = event.tags.find((t) => t[0] === "status");
      return `Feedback (${statusTag?.[1] || "unknown"})`;
    }
    return `Unknown (${kind})`;
  };

  const isEncrypted = event.tags.some((t) => t[0] === "encrypted");

  const getContentSummary = () => {
    if (isEncrypted) {
      return "[Encrypted Content]";
    }

    // For Kind 5000-5999 (job requests), try to parse and display input tags
    if (event.kind >= 5000 && event.kind < 6000) {
      try {
        const inputTags = event.tags.filter((t) => t[0] === "i");
        if (inputTags.length > 0) {
          return inputTags
            .map((tag) => {
              const [_, value, type] = tag;
              return `${type}: ${value.substring(0, 50)}${value.length > 50 ? "..." : ""}`;
            })
            .join(", ");
        }

        // If no input tags found, show first part of content
        return (
          event.content.substring(0, 100) +
          (event.content.length > 100 ? "..." : "")
        );
      } catch (e) {
        return (
          event.content.substring(0, 100) +
          (event.content.length > 100 ? "..." : "")
        );
      }
    }

    // For Kind 6000-6999 (job results) and Kind 7000 (feedback), just show content
    return (
      event.content.substring(0, 100) +
      (event.content.length > 100 ? "..." : "")
    );
  };

  const getKeyTags = () => {
    return event.tags.filter(
      (t) =>
        t[0] === "p" ||
        t[0] === "e" ||
        t[0] === "output" ||
        t[0] === "status" ||
        t[0] === "amount",
    );
  };

  // Determine badge variant based on event kind
  const getBadgeVariant = () => {
    if (event.kind >= 5000 && event.kind < 6000) {
      return "secondary"; // Request - blue/purple
    } else if (event.kind >= 6000 && event.kind < 7000) {
      return "default"; // Result - primary
    } else if (event.kind === 7000) {
      const statusTag = event.tags.find((t) => t[0] === "status");
      if (statusTag) {
        if (statusTag[1] === "success") return "default"; // Success - primary
        if (statusTag[1] === "error") return "destructive"; // Error - red
        if (statusTag[1] === "processing") return "secondary"; // Processing - blue/purple
        if (statusTag[1] === "payment-required") return "outline"; // Payment - outline
      }
      return "secondary"; // Default for feedback
    }
    return "secondary"; // Default
  };

  return (
    <Card className="mb-3 overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="bg-muted/20 px-4 py-2">
        <div className="flex items-center justify-between">
          <Badge variant={getBadgeVariant()} className="h-6 whitespace-nowrap">
            {getKindLabel()}
          </Badge>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowDetails(!showDetails)}
              aria-label={showDetails ? "Hide details" : "Show details"}
            >
              {showDetails ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() =>
                window.open(`https://nostr.guru/e/${event.id}`, "_blank")
              }
              aria-label="View on Nostr.guru"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-2">
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
          <span className="font-semibold">Author:</span>
          <span
            className="truncate font-mono"
            title={formatPubkey(event.pubkey)}
          >
            {formatPubkey(event.pubkey).substring(0, 20)}...
          </span>

          <span className="font-semibold">Time:</span>
          <span>{formatTimestamp(event.created_at)}</span>

          <span className="font-semibold">Content:</span>
          <span
            className={`${isEncrypted ? "text-muted-foreground italic" : ""}`}
          >
            {getContentSummary()}
          </span>
        </div>

        {showDetails && (
          <div className="mt-3 border-t pt-2 text-xs">
            <div className="mb-1 font-semibold">Tags:</div>
            <div className="grid gap-1">
              {getKeyTags().map((tag, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr] gap-1">
                  <span className="bg-muted rounded px-1 font-mono">
                    {tag[0]}
                  </span>
                  <span className="truncate font-mono text-xs">
                    {tag.slice(1).join(", ")}
                  </span>
                </div>
              ))}
              {getKeyTags().length === 0 && (
                <div className="text-muted-foreground italic">No key tags</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main NIP-90 Global Feed component
const Nip90GlobalFeedPane: React.FC = () => {
  const runtime = getMainRuntime();
  const [eventsLimit, setEventsLimit] = useState(50);

  // Fetch NIP-90 events
  const {
    data: events,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<NostrEvent[], Error>({
    queryKey: ["nip90GlobalFeed", eventsLimit],
    queryFn: async () => {
      const program = Effect.flatMap(NIP90Service, (s) =>
        s.listPublicEvents(eventsLimit),
      );
      const exitResult = await Effect.runPromiseExit(
        Effect.provide(program, runtime),
      );

      if (Exit.isSuccess(exitResult)) return exitResult.value;
      throw Cause.squash(exitResult.cause);
    },
  });

  // Track telemetry for opening the pane - skip in testing environment
  if (process.env.NODE_ENV !== "test") {
    Effect.runFork(
      Effect.flatMap(TelemetryService, (ts) =>
        ts.trackEvent({
          category: "ui:pane",
          action: "open_nip90_global_feed_pane",
        }),
      ).pipe(Effect.provide(runtime)),
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">NIP-90 Global Feed</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground h-4 w-4 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Shows recent NIP-90 events (job requests, results, and
                  feedback) from connected relays
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Button
          onClick={() => refetch()}
          size="sm"
          variant="outline"
          disabled={isLoading || isFetching}
        >
          <RefreshCcw
            className={`mr-1.5 h-3 w-3 ${isLoading || isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="border-border/50 min-h-0 flex-grow rounded-md border">
        <ScrollArea className="h-full">
          <div className="p-3">
            {isLoading && !events && (
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="px-4 py-2">
                      <div className="bg-muted h-5 w-24 rounded"></div>
                    </CardHeader>
                    <CardContent className="px-4 py-2">
                      <div className="space-y-2">
                        <div className="bg-muted h-3 w-full rounded"></div>
                        <div className="bg-muted h-3 w-3/4 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {error && (
              <Card className="bg-destructive/10 border-destructive">
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-destructive flex items-center text-sm">
                    <AlertCircle className="mr-1.5 h-4 w-4" />
                    Error Loading NIP-90 Events
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-destructive/90 px-4 py-2 text-xs">
                  {error.message}
                </CardContent>
                <CardFooter className="px-4 pt-0 pb-3">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Try Again
                  </Button>
                </CardFooter>
              </Card>
            )}

            {events && events.length > 0 && (
              <div className="space-y-3">
                {events.map((event) => (
                  <Nip90EventCard key={event.id} event={event} />
                ))}
              </div>
            )}

            {events && events.length === 0 && !isLoading && (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                <MessageSquare className="text-muted-foreground/50 h-12 w-12" />
                <p className="text-muted-foreground">
                  No NIP-90 events found on connected relays.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCcw className="mr-1.5 h-3 w-3" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Nip90GlobalFeedPane;
