import React, { useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateSecretKey, getPublicKey as getPkFromSk } from 'nostr-tools/pure';
import { createNip90JobRequest } from '@/helpers/nip90/event_creation';
import { 
  NostrService, 
  NostrServiceLive, 
  DefaultNostrServiceConfigLayer, 
  type NostrEvent
} from '@/services/nostr';
import { NIP04ServiceLive } from '@/services/nip04';
import { Effect, Layer, Exit, Cause } from 'effect';
import { TelemetryService, TelemetryServiceLive, type TelemetryEvent } from '@/services/telemetry';

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
      const { bytesToHex } = await import('@noble/hashes/utils'); // Dynamic import
      const currentEphemeralSkHex = bytesToHex(requesterSkUint8Array);
      setEphemeralSkHex(currentEphemeralSkHex);

      // 2. Prepare inputs and any additional parameters for encryption
      const inputsForEncryption: Array<[string, string, string?, string?, string?]> = [[inputData.trim(), 'text']];
      // Example of adding other parameters to be encrypted:
      // const additionalParamsForEncryption: Array<[string, string, string]> = [
      //   ['param', 'model', 'default-dvm-model']
      // ];

      // 3. Create an Effect for the NIP-90 Job Request Event
      const createRequestEventEffect = createNip90JobRequest(
        requesterSkUint8Array,
        OUR_DVM_PUBKEY_HEX,
        inputsForEncryption,
        currentOutputMimeType,
        bidNum,
        kind
        // additionalParamsForEncryption // Pass if you have them
      );

      // 4. Create a program that uses both NostrService and NIP04Service
      const program = Effect.gen(function* (_) {
        // First, resolve the effect to create the request event
        const requestEvent = yield* _(createRequestEventEffect);
        
        // Log the encrypted request event via telemetry
        const telemetryEventData: TelemetryEvent = {
          category: "log:info",
          action: "generic_console_replacement",
          label: "Generated Encrypted NIP-90 Request Event",
          value: JSON.stringify(requestEvent, null, 2)
        };
        
        const telemetryService = yield* _(TelemetryService);
        yield* _(telemetryService.trackEvent(telemetryEventData));
        
        // Then publish it using NostrService
        const nostrService = yield* _(NostrService);
        yield* _(nostrService.publishEvent(requestEvent));
        
        return requestEvent.id;
      });

      // 5. Create a combined Layer with all required services
      const fullLayer = Layer.mergeAll(
        Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer),
        NIP04ServiceLive,
        TelemetryServiceLive
      );
      
      // 6. Run the program with the combined Layer
      const exit = await Effect.runPromiseExit(Effect.provide(program, fullLayer));

      if (Exit.isSuccess(exit)) {
        // Track successful publish via telemetry
        const successTelemetryEvent: TelemetryEvent = {
          category: "log:info",
          action: "nip90_publish_success",
          label: "Successfully published NIP-90 request",
          value: exit.value // Event ID
        };
        
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(successTelemetryEvent));
        }).pipe(
          Effect.provide(TelemetryServiceLive),
          (effect) => Effect.runPromise(effect).catch(err => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err), Cause.pretty(err));
          })
        );
        
        setPublishedEventId(exit.value);
        
        // Store the event ID and secret key in localStorage for later decryption
        if (currentEphemeralSkHex) {
          try {
            // Get existing requests from localStorage or initialize empty object
            const storedRequests = JSON.parse(localStorage.getItem('nip90_requests') || '{}');
            
            // Add this request to the stored requests
            storedRequests[exit.value] = {
              secretKey: currentEphemeralSkHex,
              createdAt: Date.now(),
              kind: kind
            };
            
            // Save back to localStorage
            localStorage.setItem('nip90_requests', JSON.stringify(storedRequests));
            
            // Track localStorage storage success
            const storeTelemetryEvent: TelemetryEvent = {
              category: "log:info",
              action: "generic_console_replacement",
              label: "Stored request details for later decryption"
            };
            
            Effect.gen(function* (_) {
              const telemetryService = yield* _(TelemetryService);
              yield* _(telemetryService.trackEvent(storeTelemetryEvent));
            }).pipe(
              Effect.provide(TelemetryServiceLive),
              (effect) => Effect.runPromise(effect).catch(err => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
              })
            );
          } catch (error) {
            // Track localStorage storage error
            const storeErrorTelemetryEvent: TelemetryEvent = {
              category: "log:error",
              action: "generic_console_replacement",
              label: "Failed to store request details",
              value: error instanceof Error ? 
                JSON.stringify({ message: error.message, stack: error.stack }) : 
                String(error)
            };
            
            Effect.gen(function* (_) {
              const telemetryService = yield* _(TelemetryService);
              yield* _(telemetryService.trackEvent(storeErrorTelemetryEvent));
            }).pipe(
              Effect.provide(TelemetryServiceLive),
              (effect) => Effect.runPromise(effect).catch(err => {
                // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
              })
            );
          }
        }
      } else {
        const underlyingError = Cause.failureOption(exit.cause);
        const errorMessage = underlyingError._tag === "Some" && underlyingError.value instanceof Error ?
                            underlyingError.value.message : "Unknown error during publishing.";
        
        // Special handling for NIP-90 publish failure as per the instructions
        const telemetryDataForPublishFailure: TelemetryEvent = {
          category: "log:error",
          action: "nip90_publish_failure",
          label: `Publishing NIP-90 request failed: ${errorMessage}`,
          value: Cause.pretty(exit.cause)
        };
        
        Effect.gen(function* (_) {
          const telemetry = yield* _(TelemetryService);
          yield* _(telemetry.trackEvent(telemetryDataForPublishFailure));
        }).pipe(
          Effect.provide(TelemetryServiceLive),
          (effect) => Effect.runPromise(effect).catch(telemetryErr => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed for NIP-90 publish error:", telemetryErr);
          })
        );
        
        setPublishError(`Publishing failed: ${errorMessage}`);
      }

    } catch (error) {
      // Log the general error via telemetry
      const generalErrorTelemetryEvent: TelemetryEvent = {
        category: "log:error",
        action: "generic_console_replacement",
        label: "Error during request preparation",
        value: error instanceof Error ? 
          JSON.stringify({ message: error.message, stack: error.stack }) : 
          String(error)
      };
      
      Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        yield* _(telemetryService.trackEvent(generalErrorTelemetryEvent));
      }).pipe(
        Effect.provide(TelemetryServiceLive),
        (effect) => Effect.runPromise(effect).catch(err => {
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
        })
      );
      
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