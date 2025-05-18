import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import type { NostrEvent } from '@/services/nostr';

/**
 * Creates a NIP-90 job request event
 * 
 * @param sk - Secret key to sign the event
 * @param inputs - Array of inputs in the format [content, type, format?, url?, alt?]
 * @param outputMimeType - Expected output MIME type
 * @param bidMillisats - Optional bid amount in millisatoshis
 * @param jobKind - Kind code for the specific NIP-90 job (5000-5999)
 * @returns A finalized NostrEvent
 */
export function createNip90JobRequest(
  sk: Uint8Array,
  inputs: Array<[string, string, string?, string?, string?]>,
  outputMimeType: string = 'text/plain',
  bidMillisats?: number,
  jobKind: number = 5100 // Default to Text Generation
): NostrEvent {
  const template: EventTemplate = {
    kind: jobKind,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ...inputs.map(inputParams => ['i', ...inputParams.filter(p => p !== undefined)] as [string, ...string[]]),
      ['output', outputMimeType],
    ],
    content: 'Job request content placeholder', // This could be made configurable if needed
  };

  if (bidMillisats !== undefined && bidMillisats > 0) {
    template.tags.push(['bid', bidMillisats.toString()]);
  }

  // finalizeEvent will add pubkey, id, and sig
  return finalizeEvent(template, sk) as NostrEvent;
}