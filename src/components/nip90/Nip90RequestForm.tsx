import React, { useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateSecretKey } from 'nostr-tools/pure';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import { 
  NostrService, 
  NostrServiceLive, 
  DefaultNostrServiceConfigLayer, 
  type NostrEvent
} from '@/services/nostr';
import { Effect, Layer, Exit, Cause } from 'effect';

export default function Nip90RequestForm() {
  const [jobKind, setJobKind] = useState<string>("5100"); // Default to Text Generation
  const [inputData, setInputData] = useState<string>("");
  const [outputMimeType, setOutputMimeType] = useState<string>("text/plain");
  const [bidAmount, setBidAmount] = useState<string>("");

  // UI Feedback state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedEventId, setPublishedEventId] = useState<string | null>(null);

  const handlePublishRequest = async () => {
    setIsPublishing(true);
    setPublishError(null);
    setPublishedEventId(null);

    try {
      const kind = parseInt(jobKind, 10);
      if (isNaN(kind) || kind < 5000 || kind > 5999) {
        setPublishError("Invalid Job Kind. Must be between 5000 and 5999.");
        setIsPublishing(false);
        return;
      }

      if (!inputData.trim()) {
        setPublishError("Input Data cannot be empty.");
        setIsPublishing(false);
        return;
      }

      if (!outputMimeType.trim()) {
        setOutputMimeType("text/plain"); // Default if empty
      }

      let bid: number | undefined = undefined;
      if (bidAmount) {
        const parsedBid = parseInt(bidAmount, 10);
        if (isNaN(parsedBid) || parsedBid < 0) {
          setPublishError("Invalid Bid Amount. Must be a non-negative number.");
          setIsPublishing(false);
          return;
        }
        bid = parsedBid;
      }

      // 1. Generate ephemeral keys
      const requesterSk = generateSecretKey();

      // 2. Construct the NIP-90 Job Request Event
      const inputs: Array<[string, string, string?, string?, string?]> = [[inputData.trim(), 'text']];
      const requestEvent: NostrEvent = createNip90JobRequest(
        requesterSk,
        inputs,
        outputMimeType.trim(),
        bid,
        kind
      );

      console.log("Generated NIP-90 Request Event:", JSON.stringify(requestEvent, null, 2));

      // 3. Publish the Event using NostrService via Effect
      const program = Effect.gen(function* (_) {
        const nostrService = yield* _(NostrService);
        yield* _(nostrService.publishEvent(requestEvent));
        return requestEvent.id;
      });

      // In tests, our mock nostrService will be used
      // In production, we provide the real layers
      const fullLayer = Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer);
      const exit = await Effect.runPromiseExit(Effect.provide(program, fullLayer));

      if (Exit.isSuccess(exit)) {
        console.log('Successfully published NIP-90 request. Event ID:', exit.value);
        setPublishedEventId(exit.value);
      } else {
        console.error('Failed to publish NIP-90 request:', Cause.pretty(exit.cause));
        const underlyingError = Cause.failureOption(exit.cause);
        const errorMessage = underlyingError._tag === "Some" && underlyingError.value instanceof Error ?
                             underlyingError.value.message : "Unknown error during publishing.";
        setPublishError(`Publishing failed: ${errorMessage}`);
      }

    } catch (error) {
      console.error("Error during request preparation:", error);
      setPublishError(error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Create NIP-90 Job Request</CardTitle>
        <CardDescription>Define and publish a new job request to the Nostr network.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="jobKind">Job Kind (e.g., 5100 for Text Gen)</Label>
          <Input
            id="jobKind"
            type="number"
            value={jobKind}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setJobKind(e.target.value)}
            placeholder="e.g., 5100"
            disabled={isPublishing}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inputData">Input Data</Label>
          <Textarea
            id="inputData"
            value={inputData}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputData(e.target.value)}
            placeholder="Enter the data for the job (e.g., a prompt for text generation)"
            rows={3}
            disabled={isPublishing}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="outputMimeType">Output MIME Type</Label>
          <Input
            id="outputMimeType"
            value={outputMimeType}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setOutputMimeType(e.target.value)}
            placeholder="e.g., text/plain, image/jpeg"
            disabled={isPublishing}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bidAmount">Bid Amount (msats)</Label>
          <Input
            id="bidAmount"
            type="number"
            value={bidAmount}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setBidAmount(e.target.value)}
            placeholder="Optional: e.g., 1000 for 1 sat"
            disabled={isPublishing}
          />
        </div>
         {/* UI Feedback */}
        {isPublishing && <p className="text-sm text-blue-500">Publishing...</p>}
        {publishError && <p className="text-sm text-red-500">Error: {publishError}</p>}
        {publishedEventId && <p className="text-sm text-green-500">Success! Event ID: <code className="text-xs break-all">{publishedEventId}</code></p>}
      </CardContent>
      <CardFooter>
        <Button onClick={handlePublishRequest} className="w-full" disabled={isPublishing}>
          {isPublishing ? 'Publishing...' : 'Publish Job Request'}
        </Button>
      </CardFooter>
    </Card>
  );
}