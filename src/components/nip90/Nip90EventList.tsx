import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Effect, Layer } from "effect";
import {
  NostrService,
  NostrServiceLive,
  DefaultNostrServiceConfigLayer,
  type NostrEvent,
  type NostrFilter,
} from "@/services/nostr";
import { NIP19Service, NIP19ServiceLive } from "@/services/nip19";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NIP90_REQUEST_KINDS_MIN = 5000;
const NIP90_REQUEST_KINDS_MAX = 5999;

// Function to fetch NIP-90 events using the NostrService
async function fetchNip90JobRequests(): Promise<NostrEvent[]> {
  console.log("[Nip90Component] Fetching NIP-90 job requests...");
  
  try {
    // Create the array of event kinds from the min/max range
    const nip90RequestKinds = Array.from(
      { length: NIP90_REQUEST_KINDS_MAX - NIP90_REQUEST_KINDS_MIN + 1 },
      (_, i) => NIP90_REQUEST_KINDS_MIN + i
    );

    // Create filter for NIP-90 job requests
    const filters: NostrFilter[] = [{ 
      kinds: nip90RequestKinds, 
      limit: 20  // Get latest 20 NIP-90 job requests
    }];
    
    // Create the Effect program
    const program = Effect.gen(function* (_) {
      // Get the NostrService
      const nostrService = yield* _(NostrService);
      
      // Fetch events from relays
      const events = yield* _(nostrService.listEvents(filters));
      
      console.log(`[Nip90Component] Fetched ${events.length} NIP-90 events`);
      return events;
    });
    
    // Compose and provide layers
    const allLayers = Layer.provide(
      NostrServiceLive,
      DefaultNostrServiceConfigLayer
    );
    
    // Run the program with all required layers
    return await Effect.runPromise(Effect.provide(program, allLayers));
  } catch (err) {
    console.error("[Nip90Component] Error fetching NIP-90 events:", err);
    return [];
  }
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
        // Create the Effect program for encoding
        const program = Effect.gen(function* (_) {
          const nip19 = yield* _(NIP19Service);
          if (type === 'npub') {
            return yield* _(nip19.encodeNpub(hexValue));
          } else if (type === 'note') {
            return yield* _(nip19.encodeNote(hexValue));
          }
          throw new Error(`Unsupported encoding type: ${type}`);
        });
        
        // Run the program with the NIP19ServiceLive layer
        return await Effect.runPromise(Effect.provide(program, NIP19ServiceLive));
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

const Nip90EventCard: React.FC<{ event: NostrEvent }> = ({ event }) => {
  const npub = useNip19Encoding(event.pubkey, 'npub');
  const noteId = useNip19Encoding(event.id, 'note');
  const eventDate = new Date(event.created_at * 1000).toLocaleString();
  
  // Extract tags that might be interesting for NIP-90
  const jobType = getTagValue(event.tags, 'j') || 'unknown';
  const budget = getTagValue(event.tags, 'amount');
  const client = getTagValue(event.tags, 'client');
  
  return (
    <Card className="mb-4 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm break-all">
            {noteId}
            {jobType && <Badge className="ml-2">{jobType}</Badge>}
          </CardTitle>
          {budget && <Badge variant="outline" className="ml-2">{budget} sats</Badge>}
        </div>
        <CardDescription className="text-xs">
          <span className="font-semibold">From:</span> {npub}<br />
          <span className="font-semibold">Kind:</span> {event.kind} | <span className="font-semibold">Created:</span> {eventDate}
          {client && <><br /><span className="font-semibold">Client:</span> {client}</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-0">
        <div className="text-xs font-mono whitespace-pre-wrap break-all bg-muted p-2 rounded">
          <strong>Content:</strong><br/>
          {event.content || "(No content)"}
        </div>
        {event.tags.length > 0 && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer">Tags ({event.tags.length})</summary>
            <pre className="font-mono whitespace-pre-wrap break-all bg-muted p-2 rounded mt-1 text-[10px]">
              {formatTags(event.tags)}
            </pre>
          </details>
        )}
      </CardContent>
      <CardFooter className="pt-1 pb-2 flex justify-between">
        <Button size="sm" variant="outline">Bid</Button>
        <Button size="sm" variant="outline">View Details</Button>
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
    <div className="p-2 h-full flex flex-col">
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
      <ScrollArea className="flex-grow">
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