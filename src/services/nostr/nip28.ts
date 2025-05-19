import { finalizeEvent, type EventTemplate, type NostrEvent as NostrToolsEvent } from 'nostr-tools/pure';
import { type NostrEvent } from '@/services/nostr/NostrService';

export interface Nip28ChannelMetadata {
  name: string;
  about: string;
  picture: string;
}

/**
 * Creates a NIP28 channel creation event (kind 40)
 */
export function createNip28ChannelEvent(metadata: Nip28ChannelMetadata, privateKey: Uint8Array): NostrEvent {
  const eventTemplate: EventTemplate = {
    kind: 40,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(metadata),
  };
  return finalizeEvent(eventTemplate, privateKey) as NostrEvent;
}

/**
 * Creates a NIP28 channel message event (kind 42)
 */
export function createNip28MessageEvent(
  channelId: string, // This is the event_id of the kind 40 event
  message: string,
  privateKey: Uint8Array,
  // Optional: relayHint for where the channel event is
  relayHint: string = '' // e.g., 'wss://relay.example.com'
): NostrEvent {
  const eventTemplate: EventTemplate = {
    kind: 42,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      // Per NIP28, the 'e' tag for a kind 42 message should point to the kind 40 (channel creation) event.
      // The 'root' marker is typically used if this message itself is a root message in a thread within the channel.
      // For simple channel chat, just tagging the channel event is primary.
      ['e', channelId, relayHint, 'root']
    ],
    content: message,
  };
  return finalizeEvent(eventTemplate, privateKey) as NostrEvent;
}