import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Effect, Layer } from "effect";
import {
  NostrService,
  NostrServiceLive,
  DefaultNostrServiceConfigLayer,
  type NostrEvent,
  type NostrFilter,
} from "@/services/nostr";
import { NIP19Service, NIP19ServiceLive, NIP19EncodeError } from "@/services/nip19";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NIP90_REQUEST_KINDS_MIN = 5000;
const NIP90_REQUEST_KINDS_MAX = 5999;

// Function to fetch NIP-90 events using the NostrService
async function fetchNip90JobRequests(): Promise<NostrEvent[]> {
  try {
    const program = Effect.gen(function* (_) {
      const nostrService = yield* _(NostrService);
  
      const nip90RequestKinds = Array.from(
        { length: NIP90_REQUEST_KINDS_MAX - NIP90_REQUEST_KINDS_MIN + 1 },
        (_, i) => NIP90_REQUEST_KINDS_MIN + i
      );
  
      const filters: NostrFilter[] = [{ kinds: nip90RequestKinds, limit: 20 }]; // Get latest 20 NIP-90 job requests
  
      try {
        const events = yield* _(nostrService.listEvents(filters));
        return events;
      } catch (err) {
        console.error("Error fetching NIP-90 events:", err);
        return [];
      }
    });
    
    // Create and compose our layers
    const fullLayer = Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer);
    
    // Run the program with our layers
    return await Effect.runPromise(Effect.provide(program, fullLayer));
  } catch (err) {
    console.error("Fatal error fetching NIP-90 events:", err);
    return [];
  }
}

// Helper to format event tags for display
const formatTags = (tags: string[][]): string => {
  return tags.map(tag => `[${tag.map(t => `"${t}"`).join(', ')}]`).join('\n');
};

// NIP-19 Encoding hook
const useNip19Encoding = (hexValue: string, type: 'npub' | 'note') => {
  // Use react-query to handle caching of encoded values
  const { data: encodedValue, error } = useQuery<string>({
    queryKey: ['nip19Encode', type, hexValue],
    queryFn: async () => {
      try {
        const program = Effect.gen(function* (_) {
          const nip19 = yield* _(NIP19Service);
          switch (type) {
            case 'npub': return yield* _(nip19.encodeNpub(hexValue));
            case 'note': return yield* _(nip19.encodeNote(hexValue));
            default: throw new Error(`Unsupported encoding type: ${type}`);
          }
        });
        
        return await Effect.runPromise(Effect.provide(program, NIP19ServiceLive));
      } catch (err) {
        console.error(`Error encoding ${type}:`, err);
        return hexValue.substring(0, 12) + '...';
      }
    },
    enabled: !!hexValue,
  });
  
  if (error) console.error(`Error encoding ${type} for ${hexValue}:`, error);
  return encodedValue || hexValue.substring(0, 12) + '...'; // Fallback or loading
};

const Nip90EventCard: React.FC<{ event: NostrEvent }> = ({ event }) => {
  const npub = useNip19Encoding(event.pubkey, 'npub');
  const noteId = useNip19Encoding(event.id, 'note');
  const eventDate = new Date(event.created_at * 1000).toLocaleString();

  return (
    <Card className="mb-4 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-sm break-all">Note ID: {noteId}</CardTitle>
        <CardDescription className="text-xs">
          Pubkey: {npub} <br />
          Kind: {event.kind} | Created: {eventDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs font-mono whitespace-pre-wrap break-all bg-muted p-2 rounded">
          <strong>Content:</strong><br/>
          {event.content || "(No content)"}
        </p>
        {event.tags.length > 0 && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer">Tags ({event.tags.length})</summary>
            <pre className="font-mono whitespace-pre-wrap break-all bg-muted p-2 rounded mt-1 text-[10px]">
              {formatTags(event.tags)}
            </pre>
          </details>
        )}
      </CardContent>
      <CardFooter>
        {/* You can add actions or more details here */}
      </CardFooter>
    </Card>
  );
};

export default function Nip90EventList() {
  const { data: nip90Events, isLoading, error, refetch } = useQuery<NostrEvent[], Error>({
    queryKey: ['nip90JobRequests'],
    queryFn: fetchNip90JobRequests,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) return <div className="text-center p-4">Loading NIP-90 events...</div>;
  if (error) return <div className="text-center p-4 text-destructive">Error fetching events: {error.message}</div>;
  if (!nip90Events || nip90Events.length === 0) return <div className="text-center p-4">No NIP-90 job requests found.</div>;

  return (
    <div className="p-2 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">NIP-90 Job Requests</h2>
        <Button onClick={() => refetch()} size="sm">Refresh</Button>
      </div>
      <ScrollArea className="flex-grow">
        <div className="pr-4"> {/* Padding for scrollbar */}
          {nip90Events.map(event => (
            <Nip90EventCard key={event.id} event={event} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}