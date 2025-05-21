import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Effect, pipe } from "effect";
import { runPromise } from "effect/Effect";
import {
  type NostrEvent,
  type NostrFilter,
  NostrService,
} from "@/services/nostr";
import { NIP19Service } from "@/services/nip19";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  NIP90Service,
  NIP90JobResult,
  NIP90JobFeedback,
} from "@/services/nip90";
import { getMainRuntime } from "@/services/runtime";
import { hexToBytes } from "@noble/hashes/utils";

const NIP90_REQUEST_KINDS_MIN = 5000;
const NIP90_REQUEST_KINDS_MAX = 5999;

// Function to fetch NIP-90 events using the NostrService via NIP90Service
async function fetchNip90JobRequests(): Promise<NostrEvent[]> {
  console.log("[Nip90Component] Fetching NIP-90 job requests...");

  const nip90RequestKinds = Array.from(
    { length: NIP90_REQUEST_KINDS_MAX - NIP90_REQUEST_KINDS_MIN + 1 },
    (_, i) => NIP90_REQUEST_KINDS_MIN + i,
  );
  const filters: NostrFilter[] = [
    {
      kinds: nip90RequestKinds,
      limit: 100,
    },
  ];

  // Use getMainRuntime to get access to NostrService directly
  const program = Effect.gen(function* (_) {
    // Directly get NostrService from context
    const nostrSvcDirect = yield* _(NostrService);
    // Explicitly type the result from listEvents
    const events: NostrEvent[] = yield* _(nostrSvcDirect.listEvents(filters));
    console.log(`[Nip90EventList] Fetched ${events.length} NIP-90 events`);
    if (events.length > 0) {
      console.log(
        "[Nip90Component] Event kinds distribution:",
        events.reduce(
          (acc, ev) => {
            // ev is properly typed as NostrEvent
            acc[ev.kind] = (acc[ev.kind] || 0) + 1;
            return acc;
          },
          {} as Record<number, number>,
        ),
      );
    }
    return events;
  });

  // Now provide the runtime to the program and run it
  const result: NostrEvent[] = await runPromise(
    Effect.provide(program, getMainRuntime()),
  );
  return result;
}

// Helper to format event tags for display
const formatTags = (tags: string[][]): string => {
  return tags
    .map((tag) => `[${tag.map((t) => `"${t}"`).join(", ")}]`)
    .join("\n");
};

// Helper to extract tag value
const getTagValue = (tags: string[][], name: string): string | null => {
  const tag = tags.find((t) => t[0] === name);
  return tag && tag.length > 1 ? tag[1] : null;
};

// NIP-19 Encoding hook
const useNip19Encoding = (hexValue: string, type: "npub" | "note") => {
  // Use react-query to handle caching of encoded values
  const { data: encodedValue, error } = useQuery<string>({
    queryKey: ["nip19Encode", type, hexValue],
    queryFn: async () => {
      try {
        const program = Effect.gen(function* (_) {
          const nip19Svc = yield* _(NIP19Service);
          let encoded: string;
          if (type === "npub") {
            encoded = yield* _(nip19Svc.encodeNpub(hexValue));
          } else {
            encoded = yield* _(nip19Svc.encodeNote(hexValue));
          }
          return encoded;
        });
        const result: string = await runPromise(
          Effect.provide(program, getMainRuntime()),
        );
        return result;
      } catch (err) {
        console.error(`[Nip90Component] Error encoding ${type}:`, err);
        return `${type}1${hexValue.substring(0, 8)}...`;
      }
    },
    enabled: !!hexValue,
  });

  if (error)
    console.error(
      `[Nip90Component] Error encoding ${type} for ${hexValue}:`,
      error,
    );
  return encodedValue || `${type}1${hexValue.substring(0, 8)}...`; // Fallback to simple format
};

interface Nip90EventCardProps {
  event: NostrEvent;
}

const Nip90EventCard: React.FC<Nip90EventCardProps> = ({ event }) => {
  const npub = useNip19Encoding(event.pubkey, "npub");
  const noteId = useNip19Encoding(event.id, "note");
  const eventDate = new Date(event.created_at * 1000).toLocaleString();

  const [jobResult, setJobResult] = useState<NIP90JobResult | null>(null);
  const [jobFeedback, setJobFeedback] = useState<NIP90JobFeedback[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Extract tags that might be interesting for NIP-90
  const jobType = getTagValue(event.tags, "j") || "unknown";
  const budget = getTagValue(event.tags, "bid");
  const outputMime = getTagValue(event.tags, "output");

  // Function to fetch results and feedback for this job request
  const fetchResults = async () => {
    setIsLoadingResults(true);
    setLoadError(null);

    try {
      // Get ephemeral keys for decryption if they exist
      let decryptionKey: Uint8Array | undefined = undefined;
      try {
        const storedRequests = JSON.parse(
          localStorage.getItem("nip90_requests") || "{}",
        );
        const requestData = storedRequests[event.id];
        if (requestData?.secretKey) {
          decryptionKey = hexToBytes(requestData.secretKey);
        }
      } catch (error) {
        console.error(
          "Error retrieving request data from localStorage:",
          error,
        );
      }

      // Fetch job result using NIP90Service
      const resultProgram = Effect.gen(function* (_) {
        const nip90Svc = yield* _(NIP90Service);
        const result = yield* _(
          nip90Svc.getJobResult(event.id, undefined, decryptionKey),
        );
        return result;
      });
      const result = await runPromise(
        Effect.provide(resultProgram, getMainRuntime()),
      );

      setJobResult(result);

      // Fetch job feedback using NIP90Service
      const feedbackProgram = Effect.gen(function* (_) {
        const nip90Svc = yield* _(NIP90Service);
        const feedback = yield* _(
          nip90Svc.listJobFeedback(event.id, undefined, decryptionKey),
        );
        return feedback;
      });
      const feedback = await runPromise(
        Effect.provide(feedbackProgram, getMainRuntime()),
      );

      setJobFeedback(feedback);
    } catch (error) {
      console.error("Error fetching job results:", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load job results and feedback",
      );
    } finally {
      setIsLoadingResults(false);
    }
  };

  return (
    <Card className="bg-card/80 mb-4 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm break-all">
            {noteId}
            {jobType && <Badge className="ml-2">{jobType}</Badge>}
          </CardTitle>
          {budget && (
            <Badge variant="outline" className="ml-2">
              {budget} msats
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          <span className="font-semibold">From:</span> {npub}
          <br />
          <span className="font-semibold">Kind:</span> {event.kind} |{" "}
          <span className="font-semibold">Created:</span> {eventDate}
          {outputMime && (
            <>
              <br />
              <span className="font-semibold">Output MIME:</span> {outputMime}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-0">
        {event.content && (
          <div className="bg-muted rounded p-2 font-mono text-xs break-all whitespace-pre-wrap">
            <strong>Content:</strong>
            <br />
            {event.content}
          </div>
        )}
        {event.tags.length > 0 && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer">
              Tags ({event.tags.length})
            </summary>
            <pre className="bg-muted mt-1 rounded p-2 font-mono text-[10px] break-all whitespace-pre-wrap">
              {formatTags(event.tags)}
            </pre>
          </details>
        )}

        {/* Job Results Section */}
        {jobResult && (
          <div className="mt-3 border-t pt-2">
            <h4 className="mb-1 text-xs font-semibold">Job Result:</h4>
            <div className="bg-muted rounded p-2 font-mono text-xs break-all whitespace-pre-wrap">
              {jobResult.isEncrypted
                ? "(Encrypted)"
                : jobResult.content || "(Empty content)"}
            </div>
            {jobResult.paymentAmount && (
              <div className="mt-1 text-xs">
                <Badge variant="outline">
                  Payment Required: {jobResult.paymentAmount} msats
                </Badge>
                {jobResult.paymentInvoice && (
                  <details className="mt-1">
                    <summary className="cursor-pointer">Invoice</summary>
                    <div className="mt-1 font-mono text-[10px] break-all">
                      {jobResult.paymentInvoice}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* Job Feedback Section */}
        {jobFeedback.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <h4 className="mb-1 text-xs font-semibold">
              Feedback ({jobFeedback.length}):
            </h4>
            {jobFeedback.map((feedback, index) => (
              <div key={index} className="mb-2 text-xs">
                <Badge
                  className={
                    feedback.status === "success"
                      ? "bg-green-100 text-green-800"
                      : feedback.status === "error"
                        ? "bg-red-100 text-red-800"
                        : feedback.status === "processing"
                          ? "bg-blue-100 text-blue-800"
                          : feedback.status === "payment-required"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                  }
                >
                  {feedback.status || "Status not specified"}
                </Badge>
                {feedback.statusExtraInfo && (
                  <span className="ml-1 text-gray-500">
                    {feedback.statusExtraInfo}
                  </span>
                )}
                {feedback.content && (
                  <div className="bg-muted mt-1 rounded p-1 font-mono text-[10px] break-all whitespace-pre-wrap">
                    {feedback.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {loadError && (
          <div className="text-destructive mt-2 text-xs">
            Error: {loadError}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-1 pb-2">
        {!jobResult && !isLoadingResults ? (
          <Button
            size="sm"
            variant="outline"
            onClick={fetchResults}
            disabled={isLoadingResults}
          >
            {isLoadingResults ? "Loading..." : "Load Results"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={fetchResults}
            disabled={isLoadingResults}
          >
            {isLoadingResults ? "Refreshing..." : "Refresh Results"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default function Nip90EventList() {
  const {
    data: nip90Events = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<NostrEvent[], Error>({
    queryKey: ["nip90JobRequests"],
    queryFn: fetchNip90JobRequests,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  // Group events by kind for better organization
  const eventsByKind = useMemo(() => {
    const grouped: Record<number, NostrEvent[]> = {};
    nip90Events.forEach((event) => {
      const kind = event.kind;
      if (!grouped[kind]) {
        grouped[kind] = [];
      }
      grouped[kind].push(event);
    });
    return grouped;
  }, [nip90Events]);

  if (isLoading)
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">Loading NIP-90 events...</div>
      </div>
    );

  if (error)
    return (
      <div className="text-destructive p-4 text-center">
        Error fetching events: {error.message}
        <div className="mt-2">
          <Button onClick={() => refetch()} size="sm">
            Retry
          </Button>
        </div>
      </div>
    );

  if (!nip90Events || nip90Events.length === 0)
    return (
      <div className="p-4 text-center">
        No NIP-90 job requests found.
        <div className="mt-2">
          <Button onClick={() => refetch()} size="sm">
            Check Again
          </Button>
        </div>
      </div>
    );

  return (
    <div className="flex h-full flex-col overflow-hidden p-2">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          NIP-90 Job Requests ({nip90Events.length})
        </h2>
        <Button onClick={() => refetch()} size="sm" disabled={isRefetching}>
          {isRefetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      <ScrollArea className="h-[calc(100%-3rem)] flex-grow">
        <div className="pr-4">
          {Object.entries(eventsByKind).map(([kind, events]) => (
            <div key={kind} className="mb-4">
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold">
                Kind {kind} ({events.length})
              </h3>
              {events.map((event) => (
                <Nip90EventCard key={event.id} event={event} />
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
