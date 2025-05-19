// src/services/nip28/NIP28Service.ts
import { Effect, Context, Data, Schema, Option } from "effect";
import type { NostrEvent, NostrService } from "@/services/nostr"; // Assuming NostrEvent and NostrService types from your NostrService

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

export interface SetChannelMetadataParams {
    channelCreateEventId: string; // ID of the kind 40 event
    name?: string;
    about?: string;
    picture?: string;
    relays?: string[]; // Relays to include in the kind 41 content
    categoryTags?: string[];    // For 't' tags
    rootRelayUrl?: string;      // Recommended relay for the 'e' (root) tag
    secretKey: Uint8Array;
}

export interface SendChannelMessageParams {
    channelCreateEventId: string;
    content: string;
    rootRelayUrl?: string;      // Rec relay for channel 'e' (root) tag
    replyToEventId?: string;    // ID of kind 42 this message is replying to
    replyToPubkey?: string;     // Pubkey of the user being replied to
    replyRelayUrl?: string;     // Rec relay for reply 'e' tag
    secretKey: Uint8Array;
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

// --- Custom Error Types ---
export class NIP28InvalidInputError extends Data.TaggedError("NIP28InvalidInputError")<{
    message: string;
    cause?: unknown;
}> {}

export class NIP28PublishError extends Data.TaggedError("NIP28PublishError")<{
    message: string;
    cause?: unknown; // Could be NostrPublishError from NostrService
}> {}

export class NIP28FetchError extends Data.TaggedError("NIP28FetchError")<{
    message: string;
    cause?: unknown; // Could be NostrRequestError from NostrService
}> {}


// --- Service Interface ---
export interface NIP28Service {
    /**
     * Creates a new public chat channel (Kind 40).
     */
    createChannel(
        params: CreateChannelParams
    ): Effect.Effect<NostrEvent, NIP28InvalidInputError | NIP28PublishError, NostrService>;

    /**
     * Sets or updates the metadata for an existing channel (Kind 41).
     * This event should be signed by the same pubkey that created the channel (Kind 40).
     */
    setChannelMetadata(
        params: SetChannelMetadataParams
    ): Effect.Effect<NostrEvent, NIP28InvalidInputError | NIP28PublishError, NostrService>;

    /**
     * Sends a message to a channel (Kind 42).
     */
    sendChannelMessage(
        params: SendChannelMessageParams
    ): Effect.Effect<NostrEvent, NIP28InvalidInputError | NIP28PublishError, NostrService>;

    /**
     * Hides a message for the current user (Kind 43).
     */
    hideMessage(
        params: HideMessageParams
    ): Effect.Effect<NostrEvent, NIP28InvalidInputError | NIP28PublishError, NostrService>;

    /**
     * Mutes a user for the current user (Kind 44).
     */
    muteUser(
        params: MuteUserParams
    ): Effect.Effect<NostrEvent, NIP28InvalidInputError | NIP28PublishError, NostrService>;

    /**
     * Fetches a channel creation event (Kind 40).
     */
    getChannel(
        channelCreateEventId: string
    ): Effect.Effect<Option.Option<NostrEvent>, NIP28FetchError, NostrService>;

    /**
     * Fetches metadata events (Kind 41) for a given channel.
     * Returns events sorted by created_at descending (latest first).
     * Clients may want to filter these further, e.g., by author.
     */
    getChannelMetadataHistory(
        channelCreateEventId: string,
        limit?: number
    ): Effect.Effect<NostrEvent[], NIP28FetchError, NostrService>;


    /**
     * Fetches the latest metadata event (Kind 41) for a given channel.
     * Optionally filters by the channel creator's pubkey.
     */
    getLatestChannelMetadata(
        channelCreateEventId: string,
        channelCreatorPubkey?: string // Pubkey of the kind 40 event creator
    ): Effect.Effect<Option.Option<NostrEvent>, NIP28FetchError, NostrService>;

    /**
     * Fetches messages for a channel (Kind 42).
     * Options for pagination/filtering.
     */
    getChannelMessages(
        channelCreateEventId: string,
        options?: { limit?: number; since?: number; until?: number; }
    ): Effect.Effect<NostrEvent[], NIP28FetchError, NostrService>;

    /**
     * Fetches all "hide message" events (Kind 43) created by a specific user.
     */
    getUserHiddenMessages(
        userPubkey: string,
        options?: { limit?: number; since?: number; until?: number; }
    ): Effect.Effect<NostrEvent[], NIP28FetchError, NostrService>;

    /**
     * Fetches all "mute user" events (Kind 44) created by a specific user.
     */
    getUserMutedUsers(
        userPubkey: string,
        options?: { limit?: number; since?: number; until?: number; }
    ): Effect.Effect<NostrEvent[], NIP28FetchError, NostrService>;
}

// --- Service Tag ---
export const NIP28Service = Context.GenericTag<NIP28Service>("NIP28Service");