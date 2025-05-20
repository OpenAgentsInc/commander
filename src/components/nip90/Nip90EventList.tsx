import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Effect, pipe } from "effect";
import { runPromise } from "effect/Effect";
import {
  type NostrEvent,
  type NostrFilter,
} from "@/services/nostr";
import { NIP19Service } from "@/services/nip19";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NIP90Service, NIP90JobResult, NIP90JobFeedback } from "@/services/nip90";
import { mainRuntime } from "@/services/runtime";
import { hexToBytes } from "@noble/hashes/utils";

const NIP90_REQUEST_KINDS_MIN = 5000;
const NIP90_REQUEST_KINDS_MAX = 5999;

// Function to fetch NIP-90 events using the NostrService via NIP90Service
async function fetchNip90JobRequests(): Promise<NostrEvent[]> {
  console.log("[Nip90Component] Fetching NIP-90 job requests...");

  const nip90RequestKinds = Array.from(
    { length: NIP90_REQUEST_KINDS_MAX - NIP90_REQUEST_KINDS_MIN + 1 },
    (_, i) => NIP90_REQUEST_KINDS_MIN + i
  );
  const filters: NostrFilter[] = [{
    kinds: nip90RequestKinds,
    limit: 100
  }];

  // Use mainRuntime to get access to NIP90Service
  return await pipe(
    Effect.flatMap(NIP90Service, service => {
      // For job requests, we're using direct NostrService functionality
      // The service doesn't have a specific method just for listing job requests
      // So we can use the NostrService that NIP90Service depends on
      return Effect.gen(function* (_) {
        const nostrService = yield* _(service["nostr"]);
        const events = yield* _(nostrService.listEvents(filters));
        console.log(`[Nip90Component] Fetched ${events.length} NIP-90 events`);
        
        if (events.length > 0) {
          console.log("[Nip90Component] Event kinds distribution:", 
            events.reduce((acc, ev) => {
              acc[ev.kind] = (acc[ev.kind] || 0) + 1;
              return acc;
            }, {} as Record<number, number>)
          );
        }
        
        return events;
      });
    }),
    runPromise(mainRuntime)
  );
}

// Helper to format event tags for display
const formatTags = (tags: string[][]): string => {
  return tags.map(tag => `[${tag.map(t => `"${t}"`).join(', ')}]`).join('\n');
};

// Helper to extract tag value
const getTagValue = (tags: string[][], name: string): string | null => {
  const tag = tags.find(t => t[0] === name);
  return tag && tag.length > 1 ? tag[1] : null;
};

// NIP-19 Encoding hook
const useNip19Encoding = (hexValue: string, type: 'npub' | 'note') => {
  // Use react-query to handle caching of encoded values
  const { data: encodedValue, error } = useQuery<string>({
    queryKey: ['nip19Encode', type, hexValue],
    queryFn: async () => {
      try {
        return await pipe(
          Effect.flatMap(NIP19Service, service => {
            return type === 'npub' 
              ? service.encodeNpub(hexValue)
              : service.encodeNote(hexValue);
          }),
          runPromise(mainRuntime)
        );
      } catch (err) {
        console.error(`[Nip90Component] Error encoding ${type}:`, err);
        return `${type}1${hexValue.substring(0, 8)}...`;
      }
    },
    enabled: !!hexValue,
  });
  
  if (error) console.error(`[Nip90Component] Error encoding ${type} for ${hexValue}:`, error);
  return encodedValue || `${type}1${hexValue.substring(0, 8)}...`; // Fallback to simple format
};

interface Nip90EventCardProps {
  event: NostrEvent;
}

const Nip90EventCard: React.FC<Nip90EventCardProps> = ({ event }) => {
  const npub = useNip19Encoding(event.pubkey, 'npub');
  const noteId = useNip19Encoding(event.id, 'note');
  const eventDate = new Date(event.created_at * 1000).toLocaleString();
  
  const [jobResult, setJobResult] = useState<NIP90JobResult | null>(null);
  const [jobFeedback, setJobFeedback] = useState<NIP90JobFeedback[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Extract tags that might be interesting for NIP-90
  const jobType = getTagValue(event.tags, 'j') || 'unknown';
  const budget = getTagValue(event.tags, 'bid');
  const outputMime = getTagValue(event.tags, 'output');
  
  // Function to fetch results and feedback for this job request
  const fetchResults = async () => {
    setIsLoadingResults(true);
    setLoadError(null);
    
    try {
      // Get ephemeral keys for decryption if they exist
      let decryptionKey: Uint8Array | undefined = undefined;
      try {
        const storedRequests = JSON.parse(localStorage.getItem('nip90_requests') || '{}');
        const requestData = storedRequests[event.id];
        if (requestData?.secretKey) {
          decryptionKey = hexToBytes(requestData.secretKey);
        }
      } catch (error) {
        console.error("Error retrieving request data from localStorage:", error);
      }
      
      // Fetch job result using NIP90Service
      const result = await pipe(
        Effect.flatMap(NIP90Service, service => service.getJobResult(event.id, undefined, decryptionKey)),
        runPromise(mainRuntime)
      );
      
      setJobResult(result);
      
      // Fetch job feedback using NIP90Service
      const feedback = await pipe(
        Effect.flatMap(NIP90Service, service => service.listJobFeedback(event.id, undefined, decryptionKey)),
        runPromise(mainRuntime)
      );
      
      setJobFeedback(feedback);
    } catch (error) {
      console.error("Error fetching job results:", error);
      setLoadError(error instanceof Error ? error.message : "Failed to load job results and feedback");
    } finally {
      setIsLoadingResults(false);
    }
  };

  return (
    <Card className="mb-4 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm break-all">
            {noteId}
            {jobType && <Badge className="ml-2">{jobType}</Badge>}
          </CardTitle>
          {budget && <Badge variant="outline" className="ml-2">{budget} msats</Badge>}
        </div>
        <CardDescription className="text-xs">
          <span className="font-semibold">From:</span> {npub}<br />
          <span className="font-semibold">Kind:</span> {event.kind} | <span className="font-semibold">Created:</span> {eventDate}
          {outputMime && <><br /><span className="font-semibold">Output MIME:</span> {outputMime}</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-0">
        {event.content && (
          <div className="text-xs font-mono whitespace-pre-wrap break-all bg-muted p-2 rounded">
            <strong>Content:</strong><br/>
            {event.content}
          </div>
        )}
        {event.tags.length > 0 && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer">Tags ({event.tags.length})</summary>
            <pre className="font-mono whitespace-pre-wrap break-all bg-muted p-2 rounded mt-1 text-[10px]">
              {formatTags(event.tags)}
            </pre>
          </details>
        )}
        
        {/* Job Results Section */}
        {jobResult && (
          <div className="mt-3 border-t pt-2">
            <h4 className="text-xs font-semibold mb-1">Job Result:</h4>
            <div className="text-xs font-mono whitespace-pre-wrap break-all bg-muted p-2 rounded">
              {jobResult.isEncrypted ? "(Encrypted)" : jobResult.content || "(Empty content)"}
            </div>
            {jobResult.paymentAmount && (
              <div className="text-xs mt-1">
                <Badge variant="outline">Payment Required: {jobResult.paymentAmount} msats</Badge>
                {jobResult.paymentInvoice && (
                  <details className="mt-1">
                    <summary className="cursor-pointer">Invoice</summary>
                    <div className="text-[10px] mt-1 font-mono break-all">
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
            <h4 className="text-xs font-semibold mb-1">Feedback ({jobFeedback.length}):</h4>
            {jobFeedback.map((feedback, index) => (
              <div key={index} className="text-xs mb-2">
                <Badge className={
                  feedback.status === 'success' ? 'bg-green-100 text-green-800' :
                  feedback.status === 'error' ? 'bg-red-100 text-red-800' :
                  feedback.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  feedback.status === 'payment-required' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {feedback.status || "Status not specified"}
                </Badge>
                {feedback.statusExtraInfo && (
                  <span className="ml-1 text-gray-500">{feedback.statusExtraInfo}</span>
                )}
                {feedback.content && (
                  <div className="mt-1 font-mono whitespace-pre-wrap break-all bg-muted p-1 rounded text-[10px]">
                    {feedback.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Error Message */}
        {loadError && (
          <div className="mt-2 text-xs text-destructive">
            Error: {loadError}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-1 pb-2 flex justify-between">
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
    isRefetching
  } = useQuery<NostrEvent[], Error>({
    queryKey: ['nip90JobRequests'],
    queryFn: fetchNip90JobRequests,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  // Group events by kind for better organization
  const eventsByKind = useMemo(() => {
    const grouped: Record<number, NostrEvent[]> = {};
    nip90Events.forEach(event => {
      const kind = event.kind;
      if (!grouped[kind]) {
        grouped[kind] = [];
      }
      grouped[kind].push(event);
    });
    return grouped;
  }, [nip90Events]);

  if (isLoading) return (
    <div className="text-center p-4">
      <div className="animate-pulse">Loading NIP-90 events...</div>
    </div>
  );
  
  if (error) return (
    <div className="text-center p-4 text-destructive">
      Error fetching events: {error.message}
      <div className="mt-2">
        <Button onClick={() => refetch()} size="sm">Retry</Button>
      </div>
    </div>
  );

  if (!nip90Events || nip90Events.length === 0) return (
    <div className="text-center p-4">
      No NIP-90 job requests found.
      <div className="mt-2">
        <Button onClick={() => refetch()} size="sm">Check Again</Button>
      </div>
    </div>
  );

  return (
    <div className="p-2 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">NIP-90 Job Requests ({nip90Events.length})</h2>
        <Button 
          onClick={() => refetch()} 
          size="sm" 
          disabled={isRefetching}
        >
          {isRefetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      <ScrollArea className="flex-grow h-[calc(100%-3rem)]">
        <div className="pr-4">
          {Object.entries(eventsByKind).map(([kind, events]) => (
            <div key={kind} className="mb-4">
              <h3 className="text-xs font-semibold mb-2 text-muted-foreground">
                Kind {kind} ({events.length})
              </h3>
              {events.map(event => (
                <Nip90EventCard key={event.id} event={event} />
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}