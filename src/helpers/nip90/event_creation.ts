import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import type { NostrEvent } from '@/services/nostr';
import { NIP04Service, NIP04EncryptError } from '@/services/nip04';
import { Effect } from 'effect';

/**
 * Creates an encrypted NIP-90 job request event.
 * The job inputs and specified params will be NIP-04 encrypted.
 *
 * @param requesterSk - Customer's (ephemeral) secret key (Uint8Array)
 * @param targetDvmPkHex - Target DVM's public key (hex string)
 * @param inputs - Array of unencrypted inputs [data, type, relay_hint?, marker?]
 * @param outputMimeType - Expected output MIME type
 * @param bidMillisats - Optional bid amount in millisatoshis
 * @param jobKind - Kind code for the NIP-90 job (5000-5999)
 * @param additionalParams - Optional array of unencrypted ['param', 'key', 'value'] tags to be included in encryption
 * @returns An Effect resolving to the finalized, encrypted NostrEvent
 */
export function createNip90JobRequest(
  requesterSk: Uint8Array,
  targetDvmPkHex: string,
  inputs: Array<[string, string, string?, string?, string?]>,
  outputMimeType: string = 'text/plain',
  bidMillisats?: number,
  jobKind: number = 5100, // Default to Text Generation
  additionalParams?: Array<[string, string, string]> // e.g., ['param', 'model', 'gpt-4']
): Effect.Effect<NostrEvent, NIP04EncryptError, NIP04Service> {
  return Effect.gen(function* (_) {
    // Get the NIP04Service from context
    const nip04Service = yield* _(NIP04Service);
    
    // Prepare the job parameters that will be encrypted
    // These are the 'i' tags and any 'param' tags
    const jobParametersToEncrypt: Array<[string, ...string[]]> = [
      ...inputs.map(inputParams => ['i', ...inputParams.filter(p => p !== undefined)] as [string, ...string[]])
    ];

    if (additionalParams) {
      jobParametersToEncrypt.push(...additionalParams);
    }

    // Stringify the parameters for encryption
    const stringifiedParams = JSON.stringify(jobParametersToEncrypt);

    // Encrypt the stringified parameters using NIP04Service
    // The DVM will use its secret key and the requester's pubkey (from the event) to decrypt
    const encryptedContent = yield* _(nip04Service.encrypt(requesterSk, targetDvmPkHex, stringifiedParams));

    const template: EventTemplate = {
      kind: jobKind,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['p', targetDvmPkHex],      // Tag the DVM's public key so it knows the request is for it
        ['encrypted'],             // Standard tag to indicate content is NIP-04 encrypted
        ['output', outputMimeType],
        // Note: The 'i' and 'param' tags are now *inside* the encrypted content.
        // Do NOT add them unencrypted here if they contain sensitive information.
        // Only non-sensitive 'param' tags (if any) could be added unencrypted.
      ],
      content: encryptedContent,    // The NIP-04 encrypted string
    };

    if (bidMillisats !== undefined && bidMillisats > 0) {
      template.tags.push(['bid', bidMillisats.toString()]);
    }
    // Optional: ['relays', 'wss://your.preferred.relay.for.results.com']

    // finalizeEvent will add pubkey (derived from requesterSk), id, and sig
    return finalizeEvent(template, requesterSk) as NostrEvent;
  });
}