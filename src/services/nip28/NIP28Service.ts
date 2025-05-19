// src/services/nip28/NIP28Service.ts
import { Effect, Context, Data, Schema, Option } from "effect";
import type { NostrEvent, NostrFilter, NostrPublishError, NostrRequestError } from "@/services/nostr";
import type { NIP04DecryptError, NIP04EncryptError } from "@/services/nip04";

// --- Custom Error Types ---
export class NIP28InvalidInputError extends Data.TaggedError("NIP28InvalidInputError")<{
  message: string;
  cause?: unknown;
}> {}

// --- Schemas for NIP-28 Content ---
export const ChannelMetadataContentSchema = Schema.Struct({
    name: Schema.String, // NIP-28 implies name is required for kind 40 content
    about: Schema.optional(Schema.String),
    picture: Schema.optional(Schema.String),
    relays: Schema.optional(Schema.Array(Schema.String)) // NIP-28 mentions this for kind 40 content too
});
export type ChannelMetadataContent = Schema.Schema.Type<typeof ChannelMetadataContentSchema>;

export const ChannelMessageContentSchema = Schema.String; // Content is just a string for kind 42

export const ModerationReasonContentSchema = Schema.Struct({
    reason: Schema.String
});
export type ModerationReasonContent = Schema.Schema.Type<typeof ModerationReasonContentSchema>;

// --- Parameter Types for Service Methods ---
export interface CreateChannelParams {
    name: string;
    about?: string;
    picture?: string;
    relays?: string[]; // Relays to include in the kind 40 content
    secretKey: Uint8Array;
}

export interface ChannelMetadata {
    name: string;
    about: string;
    picture: string;
    creatorPk: string;
    event_id: string; // Kind 40 event ID
}

export interface SendChannelMessageParams {
    channelCreateEventId: string; // ID of the Kind 40 event
    content: string; // Plaintext message content
    secretKey: Uint8Array; // Sender's secret key
    replyToEventId?: string; // Optional: for threaded replies (root 'e' tag still points to Kind 40)
    replyToPubkey?: string; // Pubkey of the user being replied to
    replyRelayUrl?: string; // Relay hint for the reply 'e' tag
    relayHint?: string; // Optional: relay hint for the channel creation event
}

export interface DecryptedChannelMessage extends NostrEvent {
    decryptedContent: string;
}

export interface HideMessageParams {
    messageToHideEventId: string; // ID of the kind 42 event to hide
    reason?: string;
    secretKey: Uint8Array;
}

export interface MuteUserParams {
    userToMutePubkey: string;
    reason?: string;
    secretKey: Uint8Array;
}

// --- Service Interface ---
export interface NIP28Service {
    /**
     * Creates a new public chat channel (Kind 40).
     */
    createChannel(
        params: CreateChannelParams
    ): Effect.Effect<NostrEvent, NIP28InvalidInputError | NostrRequestError | NostrPublishError>;

    /**
     * Gets metadata for a channel from its creation event (Kind 40).
     */
    getChannelMetadata(
        channelCreateEventId: string
    ): Effect.Effect<ChannelMetadata, NostrRequestError>;

    /**
     * Updates metadata for a channel (Kind 41).
     */
    setChannelMetadata(
        params: {
            channelCreateEventId: string;
            name?: string;
            about?: string;
            picture?: string;
            secretKey: Uint8Array;
        }
    ): Effect.Effect<NostrEvent, NIP28InvalidInputError | NostrRequestError | NostrPublishError>;

    /**
     * Sends a message to a channel (Kind 42).
     * The message is encrypted to the channel creator's public key using NIP-04.
     */
    sendChannelMessage(
        params: SendChannelMessageParams
    ): Effect.Effect<NostrEvent, NIP28InvalidInputError | NostrRequestError | NostrPublishError | NIP04EncryptError>;

    /**
     * Fetches and decrypts messages for a channel (Kind 42).
     * Messages are sorted by created_at ascending (oldest first).
     * 
     * @param channelCreateEventId - The ID of the channel creation event (Kind 40)
     * @param userSk - The user's secret key for decrypting messages
     * @param filterOptions - Optional filter options to customize the query
     */
    getChannelMessages(
        channelCreateEventId: string,
        userSk: Uint8Array,
        filterOptions?: Partial<NostrFilter>
    ): Effect.Effect<DecryptedChannelMessage[], NostrRequestError | NIP04DecryptError>;

    /**
     * Subscribes to new messages for a channel and provides them decrypted.
     * 
     * @param channelCreateEventId - The ID of the channel creation event (Kind 40)
     * @param userSk - The user's secret key for decrypting messages
     * @param onMessage - Callback function that receives new decrypted messages
     */
    subscribeToChannelMessages(
        channelCreateEventId: string,
        userSk: Uint8Array,
        onMessage: (message: DecryptedChannelMessage) => void
    ): Effect.Effect<{ unsub: () => void }, NostrRequestError>;
}

// --- Service Tag ---
export const NIP28Service = Context.GenericTag<NIP28Service>("NIP28Service");