import React, { useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateSecretKey } from 'nostr-tools/pure';
import { Effect } from 'effect';
import { runPromise, runPromiseExit } from 'effect/Effect';
import { bytesToHex } from '@noble/hashes/utils';
import { mainRuntime } from '@/services/runtime';
import { NIP90Service, CreateNIP90JobParams, NIP90InputType } from '@/services/nip90';

// Define the DVM's public key (replace with actual key in a real application)
const OUR_DVM_PUBKEY_HEX = "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"; // Example key

export default function Nip90RequestForm() {
  const [jobKind, setJobKind] = useState<string>("5100"); // Default to Text Generation
  const [inputData, setInputData] = useState<string>("");
  const [outputMimeType, setOutputMimeType] = useState<string>("text/plain");
  const [bidAmount, setBidAmount] = useState<string>("");

  // UI Feedback state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedEventId, setPublishedEventId] = useState<string | null>(null);
  const [ephemeralSkHex, setEphemeralSkHex] = useState<string | null>(null); // For storing SK to decrypt response

  const handlePublishRequest = async () => {
    setIsPublishing(true);
    setPublishError(null);
    setPublishedEventId(null);
    setEphemeralSkHex(null);

    // This public key is hardcoded for demo purposes
    // In a real application, this would be configurable
    if (!OUR_DVM_PUBKEY_HEX) {
      setPublishError("DVM public key is not configured.");
      setIsPublishing(false);
      return;
    }

    try {
      // Form validation
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

      const currentOutputMimeType = outputMimeType.trim() || "text/plain";
      if (!outputMimeType.trim()) {
        setOutputMimeType(currentOutputMimeType);
      }

      let bidNum: number | undefined = undefined;
      if (bidAmount) {
        const parsedBid = parseInt(bidAmount, 10);
        if (isNaN(parsedBid) || parsedBid < 0) {
          setPublishError("Invalid Bid Amount. Must be a non-negative number.");
          setIsPublishing(false);
          return;
        }
        bidNum = parsedBid;
      }

      // 1. Generate ephemeral keys for this request
      const requesterSkUint8Array = generateSecretKey();
      
      // Store the ephemeral secret key (hex) for later decryption of responses
      const currentEphemeralSkHex = bytesToHex(requesterSkUint8Array);
      setEphemeralSkHex(currentEphemeralSkHex);

      // 2. Prepare inputs and any additional parameters for encryption
      // Explicitly match the NIP90InputType tuple structure with 4 elements
      const inputsForEncryption: Array<[string, NIP90InputType, string?, string?]> = [
        [inputData.trim(), 'text', undefined, undefined]
      ];

      // Optional: Add additional parameters to be encrypted
      // const additionalParams: ['param', string, string][] = [
      //   ['param', 'model', 'default-dvm-model']
      // ];

      // 3. Create the params object for NIP90Service
      const jobParams: CreateNIP90JobParams = {
        kind,
        inputs: inputsForEncryption,
        outputMimeType: currentOutputMimeType,
        requesterSk: requesterSkUint8Array as Uint8Array<ArrayBuffer>,
        targetDvmPubkeyHex: OUR_DVM_PUBKEY_HEX,
        bidMillisats: bidNum,
        // additionalParams // uncomment if using
      };

      // 4. Use the NIP90Service from mainRuntime
      const programToRun = Effect.flatMap(NIP90Service, service =>
        service.createJobRequest(jobParams) // This returns Effect<NostrEvent, ...>
      ).pipe(
        Effect.map(event => event.id) // `event` is NostrEvent here
      );

      // Provide the runtime to the program and run it
      const result = await runPromise(Effect.provide(programToRun, mainRuntime));

      // Store successful event info
      setPublishedEventId(result);
      
      // Store the event ID and secret key in localStorage for later decryption
      if (currentEphemeralSkHex) {
        try {
          // Get existing requests from localStorage or initialize empty object
          const storedRequests = JSON.parse(localStorage.getItem('nip90_requests') || '{}');
          
          // Add this request to the stored requests
          storedRequests[result] = {
            secretKey: currentEphemeralSkHex,
            createdAt: Date.now(),
            kind
          };
          
          // Save back to localStorage
          localStorage.setItem('nip90_requests', JSON.stringify(storedRequests));
        } catch (error) {
          console.error("Failed to store request details in localStorage:", error);
        }
      }
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Create NIP-90 Job Request (Encrypted)</CardTitle>
        <CardDescription>Define and publish a new encrypted job request to the Nostr network for your DVM.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="jobKind">Job Kind</Label>
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
          <Label htmlFor="inputData">Input Data (will be encrypted)</Label>
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
          <Label htmlFor="outputMimeType">Output MIME Type (public)</Label>
          <Input 
            id="outputMimeType" 
            value={outputMimeType} 
            onChange={(e: ChangeEvent<HTMLInputElement>) => setOutputMimeType(e.target.value)} 
            placeholder="e.g., text/plain" 
            disabled={isPublishing} 
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bidAmount">Bid Amount (msats, public)</Label>
          <Input 
            id="bidAmount" 
            type="number" 
            value={bidAmount} 
            onChange={(e: ChangeEvent<HTMLInputElement>) => setBidAmount(e.target.value)} 
            placeholder="Optional: e.g., 1000" 
            disabled={isPublishing} 
          />
        </div>

        {/* UI Feedback */}
        {isPublishing && <p className="text-sm text-blue-500">Publishing...</p>}
        {publishError && <p className="text-sm text-destructive">Error: {publishError}</p>}
        {publishedEventId && (
          <div className="text-sm text-green-500">
            <p>Success! Event ID: <code className="text-xs break-all">{publishedEventId}</code></p>
            {ephemeralSkHex && <p className="mt-1 text-xs text-muted-foreground">Ephemeral SK (for debugging/decryption): <code className="text-xs break-all">{ephemeralSkHex}</code></p>}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handlePublishRequest} className="w-full" disabled={isPublishing}>
          {isPublishing ? 'Publishing...' : 'Publish Encrypted Job Request'}
        </Button>
      </CardFooter>
    </Card>
  );
}