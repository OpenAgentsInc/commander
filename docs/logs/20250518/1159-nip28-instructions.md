Okay, agent, here are the detailed coding instructions to implement a `NIP28Service` Effect layer with **FULL SUPPORT** for NIP-28 (Public Chat). This service will use the existing `NostrService` for relay interactions.

**Prerequisites:**
-   You have access to `NostrService` (as defined in `docs/logs/20250518/0049-nip90-instructions.md` or similar) for publishing and listing events.
-   You have access to `nostr-tools/pure` for event finalization (`finalizeEvent`) and key generation.
-   You will need `Effect.Schema` for input validation.

---

**Phase 1: Define `NIP28Service.ts` (Interface, Types, Errors, Schemas)**

1.  **Create Directory Structure:**
    *   `src/services/nip28/`

2.  **Create `src/services/nip28/NIP28Service.ts`:**

    ```typescript
    // src/services/nip28/NIP28Service.ts
    import { Effect, Context, Data, Schema } from "effect";
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
    ```

---

**Phase 2: Implement `NIP28ServiceImpl.ts`**

1.  **Create `src/services/nip28/NIP28ServiceImpl.ts`:**

    ```typescript
    // src/services/nip28/NIP28ServiceImpl.ts
    import { Effect, Layer, Option, Schema } from "effect";
    import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
    import {
        NIP28Service,
        type CreateChannelParams,
        type SetChannelMetadataParams,
        type SendChannelMessageParams,
        type HideMessageParams,
        type MuteUserParams,
        ChannelMetadataContentSchema,
        ModerationReasonContentSchema,
        NIP28InvalidInputError,
        NIP28PublishError,
        NIP28FetchError
    } from "./NIP28Service";
    import { NostrService, type NostrEvent, type NostrFilter } from "@/services/nostr";

    // Helper to sign and publish an event
    function signAndPublishEvent(
        template: EventTemplate,
        secretKey: Uint8Array
    ): Effect.Effect<NostrEvent, NIP28PublishError, NostrService> {
        return Effect.gen(function*(_) {
            let signedEvent: NostrEvent;
            try {
                signedEvent = finalizeEvent(template, secretKey) as NostrEvent;
            } catch (e) {
                return yield* _(Effect.fail(new NIP28PublishError({ message: "Failed to sign event", cause: e })));
            }

            const nostrService = yield* _(NostrService);
            yield* _(
                nostrService.publishEvent(signedEvent),
                Effect.mapError(cause => new NIP28PublishError({ message: "Failed to publish NIP-28 event", cause }))
            );
            return signedEvent;
        });
    }


    export function createNIP28Service(): NIP28Service {
        return {
            createChannel: (params: CreateChannelParams) =>
                Effect.gen(function*(_) {
                    if (!params.name || params.name.trim() === "") {
                        return yield* _(Effect.fail(new NIP28InvalidInputError({ message: "Channel name is required." })));
                    }

                    const content: Schema.Schema.Type<typeof ChannelMetadataContentSchema> = {
                        name: params.name,
                        about: params.about,
                        picture: params.picture,
                        relays: params.relays
                    };

                    // Validate content against schema
                    yield* _(Schema.decodeUnknown(ChannelMetadataContentSchema)(content), Effect.mapError(
                        e => new NIP28InvalidInputError({ message: "Invalid channel creation content", cause: e })
                    ));

                    const template: EventTemplate = {
                        kind: 40,
                        created_at: Math.floor(Date.now() / 1000),
                        tags: [],
                        content: JSON.stringify(content),
                    };
                    return yield* _(signAndPublishEvent(template, params.secretKey));
                }),

            setChannelMetadata: (params: SetChannelMetadataParams) =>
                Effect.gen(function*(_) {
                    const content: Partial<Schema.Schema.Type<typeof ChannelMetadataContentSchema>> = {};
                    if (params.name !== undefined) content.name = params.name;
                    if (params.about !== undefined) content.about = params.about;
                    if (params.picture !== undefined) content.picture = params.picture;
                    if (params.relays !== undefined) content.relays = params.relays;

                    if (Object.keys(content).length === 0) {
                         return yield* _(Effect.fail(new NIP28InvalidInputError({ message: "At least one metadata field (name, about, picture, relays) must be provided." })));
                    }

                    // Validate content against schema (allow partial for updates)
                    yield* _(Schema.decodeUnknown(Schema.Partial(ChannelMetadataContentSchema))(content), Effect.mapError(
                        e => new NIP28InvalidInputError({ message: "Invalid channel metadata content", cause: e })
                    ));

                    const tags: string[][] = [
                        ["e", params.channelCreateEventId, params.rootRelayUrl || "", "root"]
                    ];

                    if (params.categoryTags) {
                        params.categoryTags.forEach(t => tags.push(["t", t]));
                    }

                    const template: EventTemplate = {
                        kind: 41,
                        created_at: Math.floor(Date.now() / 1000),
                        tags,
                        content: JSON.stringify(content),
                    };
                    return yield* _(signAndPublishEvent(template, params.secretKey));
                }),

            sendChannelMessage: (params: SendChannelMessageParams) =>
                Effect.gen(function*(_) {
                    if (!params.content || params.content.trim() === "") {
                        return yield* _(Effect.fail(new NIP28InvalidInputError({ message: "Message content cannot be empty." })));
                    }

                    const tags: string[][] = [
                        ["e", params.channelCreateEventId, params.rootRelayUrl || "", "root"]
                    ];

                    if (params.replyToEventId) {
                        tags.push(["e", params.replyToEventId, params.replyRelayUrl || "", "reply"]);
                        if (params.replyToPubkey) {
                            tags.push(["p", params.replyToPubkey, params.replyRelayUrl || ""]);
                        }
                    }

                    const template: EventTemplate = {
                        kind: 42,
                        created_at: Math.floor(Date.now() / 1000),
                        tags,
                        content: params.content,
                    };
                    return yield* _(signAndPublishEvent(template, params.secretKey));
                }),

            hideMessage: (params: HideMessageParams) =>
                Effect.gen(function*(_) {
                    let contentStr = "";
                    if (params.reason) {
                        const content: Schema.Schema.Type<typeof ModerationReasonContentSchema> = { reason: params.reason };
                         yield* _(Schema.decodeUnknown(ModerationReasonContentSchema)(content), Effect.mapError(
                            e => new NIP28InvalidInputError({ message: "Invalid reason content for hiding message", cause: e })
                        ));
                        contentStr = JSON.stringify(content);
                    }

                    const template: EventTemplate = {
                        kind: 43,
                        created_at: Math.floor(Date.now() / 1000),
                        tags: [["e", params.messageToHideEventId]],
                        content: contentStr,
                    };
                    return yield* _(signAndPublishEvent(template, params.secretKey));
                }),

            muteUser: (params: MuteUserParams) =>
                Effect.gen(function*(_) {
                    let contentStr = "";
                    if (params.reason) {
                         const content: Schema.Schema.Type<typeof ModerationReasonContentSchema> = { reason: params.reason };
                         yield* _(Schema.decodeUnknown(ModerationReasonContentSchema)(content), Effect.mapError(
                            e => new NIP28InvalidInputError({ message: "Invalid reason content for muting user", cause: e })
                        ));
                        contentStr = JSON.stringify(content);
                    }

                    const template: EventTemplate = {
                        kind: 44,
                        created_at: Math.floor(Date.now() / 1000),
                        tags: [["p", params.userToMutePubkey]],
                        content: contentStr,
                    };
                    return yield* _(signAndPublishEvent(template, params.secretKey));
                }),

            getChannel: (channelCreateEventId: string) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filters: NostrFilter[] = [{ ids: [channelCreateEventId], kinds: [40], limit: 1 }];
                    const events = yield* _(
                        nostrService.listEvents(filters),
                        Effect.mapError(cause => new NIP28FetchError({ message: "Failed to fetch channel event", cause }))
                    );
                    return Option.fromNullable(events[0]);
                }),

            getChannelMetadataHistory: (channelCreateEventId: string, limit: number = 10) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filters: NostrFilter[] = [{ kinds: [41], "#e": [channelCreateEventId], limit }];
                    return yield* _(
                        nostrService.listEvents(filters), // listEvents already sorts by created_at desc
                        Effect.mapError(cause => new NIP28FetchError({ message: "Failed to fetch channel metadata history", cause }))
                    );
                }),

            getLatestChannelMetadata: (channelCreateEventId: string, channelCreatorPubkey?: string) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filter: NostrFilter = { kinds: [41], "#e": [channelCreateEventId], limit: 1 };
                    if (channelCreatorPubkey) {
                        filter.authors = [channelCreatorPubkey];
                    }
                    // Fetch potentially multiple due to relay inconsistencies, then pick latest.
                    // More robust would be to fetch a few (e.g. limit 5) and pick the one with highest created_at.
                    const events = yield* _(
                        nostrService.listEvents([filter]),
                         Effect.mapError(cause => new NIP28FetchError({ message: "Failed to fetch latest channel metadata", cause }))
                    );
                    // listEvents should already sort by created_at descending, so events[0] is the latest.
                    return Option.fromNullable(events[0]);
                }),

            getChannelMessages: (channelCreateEventId: string, options?: { limit?: number; since?: number; until?: number; }) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filters: NostrFilter[] = [{
                        kinds: [42],
                        "#e": [channelCreateEventId],
                        limit: options?.limit ?? 50,
                        since: options?.since,
                        until: options?.until
                    }];
                    return yield* _(
                        nostrService.listEvents(filters),
                        Effect.mapError(cause => new NIP28FetchError({ message: "Failed to fetch channel messages", cause }))
                    );
                }),

            getUserHiddenMessages: (userPubkey: string, options?: { limit?: number; since?: number; until?: number; }) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filters: NostrFilter[] = [{
                        kinds: [43],
                        authors: [userPubkey],
                        limit: options?.limit ?? 100,
                        since: options?.since,
                        until: options?.until
                    }];
                    return yield* _(
                        nostrService.listEvents(filters),
                        Effect.mapError(cause => new NIP28FetchError({ message: "Failed to fetch user hidden messages", cause }))
                    );
                }),

            getUserMutedUsers: (userPubkey: string, options?: { limit?: number; since?: number; until?: number; }) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filters: NostrFilter[] = [{
                        kinds: [44],
                        authors: [userPubkey],
                        limit: options?.limit ?? 100,
                        since: options?.since,
                        until: options?.until
                    }];
                    return yield* _(
                        nostrService.listEvents(filters),
                        Effect.mapError(cause => new NIP28FetchError({ message: "Failed to fetch user muted users", cause }))
                    );
                }),
        };
    }

    // Live Layer for NIP28Service
    export const NIP28ServiceLive = Layer.effect(
        NIP28Service,
        Effect.succeed(createNIP28Service()) // Depends on NostrService, which will be provided when this layer is used
    );
    ```

2.  **Create `src/services/nip28/index.ts`:**

    ```typescript
    // src/services/nip28/index.ts
    export * from './NIP28Service';
    export * from './NIP28ServiceImpl';
    ```

---

**Phase 3: Implement Unit Tests for `NIP28Service`**

1.  **Create Directory Structure:**
    *   `src/tests/unit/services/nip28/`

2.  **Create `src/tests/unit/services/nip28/NIP28Service.test.ts`:**

    ```typescript
    // src/tests/unit/services/nip28/NIP28Service.test.ts
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { Effect, Layer, Exit, Option } from 'effect';
    import * as NostrToolsPure from 'nostr-tools/pure';
    import {
        NIP28Service,
        NIP28ServiceLive,
        type CreateChannelParams,
        type SetChannelMetadataParams,
        type SendChannelMessageParams,
        type HideMessageParams,
        type MuteUserParams,
        NIP28InvalidInputError,
        NIP28PublishError,
        NIP28FetchError
    } from '@/services/nip28';
    import { NostrService, type NostrEvent, type NostrFilter, NostrPublishError, NostrRequestError } from '@/services/nostr'; // Import real error types

    // Mock NostrService
    const mockPublishEvent = vi.fn();
    const mockListEvents = vi.fn();
    const MockNostrServiceLayer = Layer.succeed(NostrService, {
        getPool: Effect.die("getPool mock not implemented/needed for NIP28 tests"),
        publishEvent: mockPublishEvent,
        listEvents: mockListEvents,
        cleanupPool: Effect.die("cleanupPool mock not implemented/needed for NIP28 tests"),
    });

    // Spy on nostr-tools finalizeEvent
    vi.mock('nostr-tools/pure', async (importOriginal) => {
        const original = await importOriginal<typeof NostrToolsPure>();
        return {
            ...original,
            finalizeEvent: vi.fn((template, sk) => {
                // Simple mock: sets pubkey, id, sig for testing structure
                const pk = NostrToolsPure.getPublicKey(sk);
                return {
                    ...template,
                    id: 'mockeventid' + Math.random().toString(16).slice(2),
                    pubkey: pk,
                    sig: 'mocksig' + Math.random().toString(16).slice(2),
                    tags: template.tags || [],
                    content: template.content || '',
                } as NostrEvent;
            }),
        };
    });
    const mockedFinalizeEvent = NostrToolsPure.finalizeEvent as vi.MockedFunction<typeof NostrToolsPure.finalizeEvent>;


    // Test Layer combining NIP28ServiceLive and mocked NostrService
    const TestServiceLayer = NIP28ServiceLive.pipe(
        Layer.provide(MockNostrServiceLayer)
    );

    const runTestEffect = <E, A>(effect: Effect.Effect<A, E, NIP28Service>) => {
        return Effect.runPromiseExit(Effect.provide(effect, TestServiceLayer));
    };

    const testSk = NostrToolsPure.generateSecretKey();
    const testPk = NostrToolsPure.getPublicKey(testSk);

    describe('NIP28Service', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        // --- Create Channel (Kind 40) ---
        describe('createChannel', () => {
            it('should create and publish a kind 40 event', async () => {
                mockPublishEvent.mockReturnValue(Effect.succeed(undefined));
                const params: CreateChannelParams = { name: "Test Channel", about: "Test About", picture: "http://pic.com/img.png", relays: ["wss://r1.com"], secretKey: testSk };

                const effect = Effect.service(NIP28Service).pipe(
                    Effect.flatMap(s => s.createChannel(params))
                );
                const exit = await runTestEffect(effect);

                expect(Exit.isSuccess(exit)).toBe(true);
                if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(40);
                    expect(event.pubkey).toBe(testPk);
                    const content = JSON.parse(event.content);
                    expect(content.name).toBe("Test Channel");
                    expect(content.about).toBe("Test About");
                    expect(content.picture).toBe("http://pic.com/img.png");
                    expect(content.relays).toEqual(["wss://r1.com"]);
                }
                expect(mockPublishEvent).toHaveBeenCalledOnce();
            });

            it('should fail if channel name is empty', async () => {
                const params: CreateChannelParams = { name: "", secretKey: testSk };
                const effect = Effect.service(NIP28Service).pipe(
                    Effect.flatMap(s => s.createChannel(params))
                );
                const exit = await runTestEffect(effect);
                expect(Exit.isFailure(exit) && Exit.causeOption(exit).pipe(Option.getOrThrow)._tag === "NIP28InvalidInputError").toBe(true);
            });
        });

        // --- Set Channel Metadata (Kind 41) ---
        describe('setChannelMetadata', () => {
            const channelCreateEventId = "kind40eventid";
            it('should create and publish a kind 41 event', async () => {
                mockPublishEvent.mockReturnValue(Effect.succeed(undefined));
                const params: SetChannelMetadataParams = {
                    channelCreateEventId,
                    name: "Updated Name",
                    categoryTags: ["nostr", "chat"],
                    rootRelayUrl: "wss://root.relay",
                    secretKey: testSk
                };
                const effect = Effect.service(NIP28Service).pipe(Effect.flatMap(s => s.setChannelMetadata(params)));
                const exit = await runTestEffect(effect);

                expect(Exit.isSuccess(exit)).toBe(true);
                if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(41);
                    expect(event.pubkey).toBe(testPk);
                    expect(JSON.parse(event.content).name).toBe("Updated Name");
                    expect(event.tags).toContainEqual(["e", channelCreateEventId, "wss://root.relay", "root"]);
                    expect(event.tags).toContainEqual(["t", "nostr"]);
                    expect(event.tags).toContainEqual(["t", "chat"]);
                }
                expect(mockPublishEvent).toHaveBeenCalledOnce();
            });

             it('should fail if no metadata fields are provided for kind 41', async () => {
                const params: SetChannelMetadataParams = { channelCreateEventId, secretKey: testSk };
                const effect = Effect.service(NIP28Service).pipe(Effect.flatMap(s => s.setChannelMetadata(params)));
                const exit = await runTestEffect(effect);
                expect(Exit.isFailure(exit) && Exit.causeOption(exit).pipe(Option.getOrThrow)._tag === "NIP28InvalidInputError").toBe(true);
            });
        });


        // --- Send Channel Message (Kind 42) ---
        describe('sendChannelMessage', () => {
            const channelCreateEventId = "kind40eventid";
            it('should create and publish a kind 42 root message', async () => {
                mockPublishEvent.mockReturnValue(Effect.succeed(undefined));
                const params: SendChannelMessageParams = { channelCreateEventId, content: "Hello channel!", rootRelayUrl: "wss://channel.relay", secretKey: testSk };
                const effect = Effect.service(NIP28Service).pipe(Effect.flatMap(s => s.sendChannelMessage(params)));
                const exit = await runTestEffect(effect);

                expect(Exit.isSuccess(exit)).toBe(true);
                if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(42);
                    expect(event.content).toBe("Hello channel!");
                    expect(event.tags).toContainEqual(["e", channelCreateEventId, "wss://channel.relay", "root"]);
                }
            });

            it('should create and publish a kind 42 reply message', async () => {
                mockPublishEvent.mockReturnValue(Effect.succeed(undefined));
                const params: SendChannelMessageParams = {
                    channelCreateEventId,
                    content: "Replying to user!",
                    replyToEventId: "parentmsgid",
                    replyToPubkey: "parentauthorpk",
                    replyRelayUrl: "wss://reply.relay",
                    secretKey: testSk
                };
                const effect = Effect.service(NIP28Service).pipe(Effect.flatMap(s => s.sendChannelMessage(params)));
                const exit = await runTestEffect(effect);
                 if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(42);
                    expect(event.tags).toContainEqual(["e", channelCreateEventId, "", "root"]); // rootRelayUrl empty if not given
                    expect(event.tags).toContainEqual(["e", "parentmsgid", "wss://reply.relay", "reply"]);
                    expect(event.tags).toContainEqual(["p", "parentauthorpk", "wss://reply.relay"]);
                }
            });
        });

        // --- Hide Message (Kind 43) ---
        describe('hideMessage', () => {
            it('should create and publish a kind 43 event', async () => {
                mockPublishEvent.mockReturnValue(Effect.succeed(undefined));
                const params: HideMessageParams = { messageToHideEventId: "msgtohide", reason: "spam", secretKey: testSk };
                const effect = Effect.service(NIP28Service).pipe(Effect.flatMap(s => s.hideMessage(params)));
                const exit = await runTestEffect(effect);
                if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(43);
                    expect(JSON.parse(event.content).reason).toBe("spam");
                    expect(event.tags).toContainEqual(["e", "msgtohide"]);
                }
            });
        });

        // --- Mute User (Kind 44) ---
        describe('muteUser', () => {
            it('should create and publish a kind 44 event', async () => {
                mockPublishEvent.mockReturnValue(Effect.succeed(undefined));
                const params: MuteUserParams = { userToMutePubkey: "usertomutepk", reason: "harassment", secretKey: testSk };
                const effect = Effect.service(NIP28Service).pipe(Effect.flatMap(s => s.muteUser(params)));
                const exit = await runTestEffect(effect);
                if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(44);
                    expect(JSON.parse(event.content).reason).toBe("harassment");
                    expect(event.tags).toContainEqual(["p", "usertomutepk"]);
                }
            });
        });

        // --- Fetching Methods ---
        describe('getChannel', () => {
            it('should fetch kind 40 event', async () => {
                const mockEvent: NostrEvent = { id: "kind40id", kind: 40, content: "{}", tags:[], created_at: 0, pubkey: "", sig: "" };
                mockListEvents.mockReturnValue(Effect.succeed([mockEvent]));
                const effect = Effect.service(NIP28Service).pipe(Effect.flatMap(s => s.getChannel("kind40id")));
                const exit = await runTestEffect(effect);
                expect(Option.isSome(Exit.getOrThrow(exit))).toBe(true);
                expect(Option.getOrThrow(Exit.getOrThrow(exit)).id).toBe("kind40id");
                expect(mockListEvents).toHaveBeenCalledWith([{ ids: ["kind40id"], kinds: [40], limit: 1 }]);
            });
        });

         describe('getLatestChannelMetadata', () => {
            it('should fetch the latest kind 41 event', async () => {
                const newerEvent: NostrEvent = { id: "meta2", kind: 41, content: `{"name":"Newer"}`, created_at: 100, pubkey: testPk, tags:[], sig:"" };
                const olderEvent: NostrEvent = { id: "meta1", kind: 41, content: `{"name":"Older"}`, created_at: 50, pubkey: testPk, tags:[], sig:"" };
                mockListEvents.mockReturnValue(Effect.succeed([newerEvent, olderEvent])); // NostrService listEvents sorts desc

                const effect = Effect.flatMap(NIP28Service, s => s.getLatestChannelMetadata("channelId123", testPk));
                const exit = await runTestEffect(effect);

                expect(Exit.isSuccess(exit)).toBe(true);
                const resultOption = Exit.getOrThrow(exit);
                expect(Option.isSome(resultOption)).toBe(true);
                if(Option.isSome(resultOption)){
                    expect(resultOption.value.id).toBe("meta2");
                }
                expect(mockListEvents).toHaveBeenCalledWith([{ kinds: [41], "#e": ["channelId123"], authors: [testPk], limit: 1 }]);
            });
        });

        // Add more tests for other fetch methods (getChannelMessages, getUserHiddenMessages, getUserMutedUsers)
        // following a similar pattern, verifying filters and results.
        // Also test error propagation from NostrService failures.
         describe('NIP28PublishError', () => {
            it('should return NIP28PublishError if NostrService.publishEvent fails', async () => {
                mockPublishEvent.mockReturnValue(Effect.fail(new NostrPublishError({ message: "Relay connection failed" })));
                const params: CreateChannelParams = { name: "Error Channel", secretKey: testSk };
                const effect = Effect.service(NIP28Service).pipe(Effect.flatMap(s => s.createChannel(params)));
                const exit = await runTestEffect(effect);

                expect(Exit.isFailure(exit)).toBe(true);
                if (Exit.isFailure(exit)) {
                    const cause = Exit.causeOption(exit).pipe(Option.getOrThrow);
                    expect(cause._tag).toBe("NIP28PublishError");
                    expect(cause.message).toContain("Failed to publish NIP-28 event");
                }
            });
        });

        describe('NIP28FetchError', () => {
            it('should return NIP28FetchError if NostrService.listEvents fails', async () => {
                mockListEvents.mockReturnValue(Effect.fail(new NostrRequestError({ message: "Timeout fetching" })));
                const effect = Effect.service(NIP28Service).pipe(Effect.flatMap(s => s.getChannel("anyId")));
                const exit = await runTestEffect(effect);

                expect(Exit.isFailure(exit)).toBe(true);
                if (Exit.isFailure(exit)) {
                    const cause = Exit.causeOption(exit).pipe(Option.getOrThrow);
                    expect(cause._tag).toBe("NIP28FetchError");
                }
            });
        });

    });
    ```

---

**Final Steps:**

1.  **Run `pnpm t`** to perform type checks and ensure no TypeScript errors.
2.  **Run `pnpm test "NIP28Service"`** to execute the unit tests. Address any failures.
3.  **Review:** Ensure all aspects of NIP-28 are covered by the service methods and tests.

This set of instructions should provide a complete `NIP28Service` layer. The implementation uses `Effect.Schema` for content validation before JSON stringification and relies on `nostr-tools/pure`'s `finalizeEvent` for event creation and signing. The service correctly depends on `NostrService` for actual communication with relays.Okay, agent, here are the detailed coding instructions to implement a `NIP28Service` Effect layer with **FULL SUPPORT** for NIP-28 (Public Chat). This service will use the existing `NostrService` for relay interactions.

**Prerequisites:**
-   You have access to `NostrService` (as defined in `docs/logs/20250518/0049-nip90-instructions.md` or similar) for publishing and listing events.
-   You have access to `nostr-tools/pure` for event finalization (`finalizeEvent`) and key generation.
-   You will need `Effect.Schema` for input validation.

---

**Phase 1: Define `NIP28Service.ts` (Interface, Types, Errors, Schemas)**

1.  **Create Directory Structure:**
    *   `src/services/nip28/`

2.  **Create `src/services/nip28/NIP28Service.ts`:**

    ```typescript
    // src/services/nip28/NIP28Service.ts
    import { Effect, Context, Data, Schema, Option } from "effect";
    import type { NostrEvent, NostrService } from "@/services/nostr"; // Assuming NostrEvent and NostrService types from your NostrService

    // --- Schemas for NIP-28 Content ---
    export const ChannelMetadataContentSchema = Schema.Struct({
        name: Schema.String,
        about: Schema.optional(Schema.String),
        picture: Schema.optional(Schema.String),
        relays: Schema.optional(Schema.Array(Schema.String))
    });
    export type ChannelMetadataContent = Schema.Schema.Type<typeof ChannelMetadataContentSchema>;

    // Content for kind 42 is just a string, no specific schema needed beyond string validation if desired.

    export const ModerationReasonContentSchema = Schema.Struct({
        reason: Schema.String
    });
    export type ModerationReasonContent = Schema.Schema.Type<typeof ModerationReasonContentSchema>;


    // --- Parameter Types for Service Methods ---
    export interface CreateChannelParams {
        name: string;
        about?: string;
        picture?: string;
        relays?: string[];
        secretKey: Uint8Array;
    }

    export interface SetChannelMetadataParams {
        channelCreateEventId: string;
        name?: string;
        about?: string;
        picture?: string;
        relays?: string[];
        categoryTags?: string[];
        rootRelayUrl?: string;
        secretKey: Uint8Array;
    }

    export interface SendChannelMessageParams {
        channelCreateEventId: string;
        content: string;
        rootRelayUrl?: string;
        replyToEventId?: string;
        replyToPubkey?: string;
        replyRelayUrl?: string;
        secretKey: Uint8Array;
    }

    export interface HideMessageParams {
        messageToHideEventId: string;
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
        cause?: unknown;
    }> {}

    export class NIP28FetchError extends Data.TaggedError("NIP28FetchError")<{
        message: string;
        cause?: unknown;
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
            channelCreatorPubkey?: string
        ): Effect.Effect<Option.Option<NostrEvent>, NIP28FetchError, NostrService>;

        /**
         * Fetches messages for a channel (Kind 42).
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
    ```

---

**Phase 2: Implement `NIP28ServiceImpl.ts`**

1.  **Create `src/services/nip28/NIP28ServiceImpl.ts`:**

    ```typescript
    // src/services/nip28/NIP28ServiceImpl.ts
    import { Effect, Layer, Option, Schema } from "effect";
    import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
    import {
        NIP28Service,
        type CreateChannelParams,
        type SetChannelMetadataParams,
        type SendChannelMessageParams,
        type HideMessageParams,
        type MuteUserParams,
        ChannelMetadataContentSchema,
        ModerationReasonContentSchema,
        NIP28InvalidInputError,
        NIP28PublishError,
        NIP28FetchError
    } from "./NIP28Service";
    import { NostrService, type NostrEvent, type NostrFilter, NostrPublishError as UnderlyingNostrPublishError, NostrRequestError as UnderlyingNostrRequestError } from "@/services/nostr";

    // Helper to sign and publish an event
    function signAndPublishEvent(
        template: EventTemplate,
        secretKey: Uint8Array
    ): Effect.Effect<NostrEvent, NIP28PublishError, NostrService> {
        return Effect.gen(function*(_) {
            let signedEvent: NostrEvent;
            try {
                signedEvent = finalizeEvent(template, secretKey) as NostrEvent;
            } catch (e) {
                return yield* _(Effect.fail(new NIP28PublishError({ message: "Failed to sign event", cause: e })));
            }

            const nostrService = yield* _(NostrService);
            yield* _(
                nostrService.publishEvent(signedEvent),
                Effect.mapError(cause => {
                    // Ensure cause is correctly typed from NostrService errors
                    let message = "Failed to publish NIP-28 event";
                    if (cause instanceof UnderlyingNostrPublishError) {
                        message = cause.message; // Use the more specific message from NostrService
                    }
                    return new NIP28PublishError({ message, cause });
                })
            );
            return signedEvent;
        });
    }


    export function createNIP28Service(): NIP28Service {
        return {
            createChannel: (params: CreateChannelParams) =>
                Effect.gen(function*(_) {
                    if (!params.name || params.name.trim() === "") {
                        return yield* _(Effect.fail(new NIP28InvalidInputError({ message: "Channel name is required for creating a channel." })));
                    }

                    const contentInput = {
                        name: params.name,
                        about: params.about,
                        picture: params.picture,
                        relays: params.relays
                    };

                    const content = yield* _(Schema.decodeUnknown(ChannelMetadataContentSchema)(contentInput), Effect.mapError(
                        e => new NIP28InvalidInputError({ message: "Invalid channel creation content", cause: e })
                    ));

                    const template: EventTemplate = {
                        kind: 40,
                        created_at: Math.floor(Date.now() / 1000),
                        tags: [],
                        content: JSON.stringify(content),
                    };
                    return yield* _(signAndPublishEvent(template, params.secretKey));
                }),

            setChannelMetadata: (params: SetChannelMetadataParams) =>
                Effect.gen(function*(_) {
                    const contentPayload: Partial<Schema.Schema.Type<typeof ChannelMetadataContentSchema>> = {};
                    if (params.name !== undefined) contentPayload.name = params.name;
                    if (params.about !== undefined) contentPayload.about = params.about;
                    if (params.picture !== undefined) contentPayload.picture = params.picture;
                    if (params.relays !== undefined) contentPayload.relays = params.relays;

                    if (Object.keys(contentPayload).length === 0) {
                         return yield* _(Effect.fail(new NIP28InvalidInputError({ message: "At least one metadata field (name, about, picture, relays) must be provided for updating channel metadata." })));
                    }

                    const content = yield* _(Schema.decodeUnknown(Schema.Partial(ChannelMetadataContentSchema))(contentPayload), Effect.mapError(
                        e => new NIP28InvalidInputError({ message: "Invalid channel metadata content for update", cause: e })
                    ));

                    const tags: string[][] = [
                        ["e", params.channelCreateEventId, params.rootRelayUrl || "", "root"]
                    ];

                    if (params.categoryTags) {
                        params.categoryTags.forEach(t => tags.push(["t", t]));
                    }

                    const template: EventTemplate = {
                        kind: 41,
                        created_at: Math.floor(Date.now() / 1000),
                        tags,
                        content: JSON.stringify(content),
                    };
                    return yield* _(signAndPublishEvent(template, params.secretKey));
                }),

            sendChannelMessage: (params: SendChannelMessageParams) =>
                Effect.gen(function*(_) {
                    if (!params.content || params.content.trim() === "") {
                        return yield* _(Effect.fail(new NIP28InvalidInputError({ message: "Message content cannot be empty." })));
                    }

                    const tags: string[][] = [
                        ["e", params.channelCreateEventId, params.rootRelayUrl || "", "root"]
                    ];

                    if (params.replyToEventId) {
                        tags.push(["e", params.replyToEventId, params.replyRelayUrl || "", "reply"]);
                        if (params.replyToPubkey) {
                            tags.push(["p", params.replyToPubkey, params.replyRelayUrl || ""]);
                        }
                    }

                    const template: EventTemplate = {
                        kind: 42,
                        created_at: Math.floor(Date.now() / 1000),
                        tags,
                        content: params.content,
                    };
                    return yield* _(signAndPublishEvent(template, params.secretKey));
                }),

            hideMessage: (params: HideMessageParams) =>
                Effect.gen(function*(_) {
                    let contentStr = "";
                    if (params.reason) {
                        const reasonContent = { reason: params.reason };
                         yield* _(Schema.decodeUnknown(ModerationReasonContentSchema)(reasonContent), Effect.mapError(
                            e => new NIP28InvalidInputError({ message: "Invalid reason content for hiding message", cause: e })
                        ));
                        contentStr = JSON.stringify(reasonContent);
                    }

                    const template: EventTemplate = {
                        kind: 43,
                        created_at: Math.floor(Date.now() / 1000),
                        tags: [["e", params.messageToHideEventId]],
                        content: contentStr,
                    };
                    return yield* _(signAndPublishEvent(template, params.secretKey));
                }),

            muteUser: (params: MuteUserParams) =>
                Effect.gen(function*(_) {
                    let contentStr = "";
                    if (params.reason) {
                         const reasonContent = { reason: params.reason };
                         yield* _(Schema.decodeUnknown(ModerationReasonContentSchema)(reasonContent), Effect.mapError(
                            e => new NIP28InvalidInputError({ message: "Invalid reason content for muting user", cause: e })
                        ));
                        contentStr = JSON.stringify(reasonContent);
                    }

                    const template: EventTemplate = {
                        kind: 44,
                        created_at: Math.floor(Date.now() / 1000),
                        tags: [["p", params.userToMutePubkey]],
                        content: contentStr,
                    };
                    return yield* _(signAndPublishEvent(template, params.secretKey));
                }),

            getChannel: (channelCreateEventId: string) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filters: NostrFilter[] = [{ ids: [channelCreateEventId], kinds: [40], limit: 1 }];
                    const events = yield* _(
                        nostrService.listEvents(filters),
                        Effect.mapError(cause => {
                             let message = "Failed to fetch channel event";
                             if (cause instanceof UnderlyingNostrRequestError) message = cause.message;
                             return new NIP28FetchError({ message, cause });
                        })
                    );
                    return Option.fromNullable(events[0]);
                }),

            getChannelMetadataHistory: (channelCreateEventId: string, limit: number = 10) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filters: NostrFilter[] = [{ kinds: [41], "#e": [channelCreateEventId], limit }];
                    return yield* _(
                        nostrService.listEvents(filters),
                        Effect.mapError(cause => {
                            let message = "Failed to fetch channel metadata history";
                            if (cause instanceof UnderlyingNostrRequestError) message = cause.message;
                            return new NIP28FetchError({ message, cause });
                        })
                    );
                }),

            getLatestChannelMetadata: (channelCreateEventId: string, channelCreatorPubkey?: string) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filter: NostrFilter = { kinds: [41], "#e": [channelCreateEventId], limit: 1 }; // Fetch limit 1, NostrService sorts.
                    if (channelCreatorPubkey) {
                        filter.authors = [channelCreatorPubkey];
                    }
                    const events = yield* _(
                        nostrService.listEvents([filter]),
                         Effect.mapError(cause => {
                            let message = "Failed to fetch latest channel metadata";
                            if (cause instanceof UnderlyingNostrRequestError) message = cause.message;
                            return new NIP28FetchError({ message, cause });
                         })
                    );
                    return Option.fromNullable(events[0]); // listEvents sorts, so first is latest.
                }),

            getChannelMessages: (channelCreateEventId: string, options?: { limit?: number; since?: number; until?: number; }) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filters: NostrFilter[] = [{
                        kinds: [42],
                        "#e": [channelCreateEventId],
                        limit: options?.limit ?? 50,
                        since: options?.since,
                        until: options?.until
                    }];
                    return yield* _(
                        nostrService.listEvents(filters),
                        Effect.mapError(cause => {
                            let message = "Failed to fetch channel messages";
                            if (cause instanceof UnderlyingNostrRequestError) message = cause.message;
                            return new NIP28FetchError({ message, cause });
                        })
                    );
                }),

            getUserHiddenMessages: (userPubkey: string, options?: { limit?: number; since?: number; until?: number; }) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filters: NostrFilter[] = [{
                        kinds: [43],
                        authors: [userPubkey],
                        limit: options?.limit ?? 100,
                        since: options?.since,
                        until: options?.until
                    }];
                    return yield* _(
                        nostrService.listEvents(filters),
                        Effect.mapError(cause => {
                            let message = "Failed to fetch user hidden messages";
                            if (cause instanceof UnderlyingNostrRequestError) message = cause.message;
                            return new NIP28FetchError({ message, cause });
                        })
                    );
                }),

            getUserMutedUsers: (userPubkey: string, options?: { limit?: number; since?: number; until?: number; }) =>
                Effect.gen(function*(_) {
                    const nostrService = yield* _(NostrService);
                    const filters: NostrFilter[] = [{
                        kinds: [44],
                        authors: [userPubkey],
                        limit: options?.limit ?? 100,
                        since: options?.since,
                        until: options?.until
                    }];
                    return yield* _(
                        nostrService.listEvents(filters),
                        Effect.mapError(cause => {
                            let message = "Failed to fetch user muted users";
                            if (cause instanceof UnderlyingNostrRequestError) message = cause.message;
                            return new NIP28FetchError({ message, cause });
                        })
                    );
                }),
        };
    }

    export const NIP28ServiceLive = Layer.effect(
        NIP28Service,
        Effect.succeed(createNIP28Service())
    );
    ```

2.  **Create `src/services/nip28/index.ts`:**

    ```typescript
    // src/services/nip28/index.ts
    export * from './NIP28Service';
    export * from './NIP28ServiceImpl';
    ```

---

**Phase 3: Implement Unit Tests for `NIP28Service`**

1.  **Create Directory Structure:**
    *   `src/tests/unit/services/nip28/`

2.  **Create `src/tests/unit/services/nip28/NIP28Service.test.ts`:**

    ```typescript
    // src/tests/unit/services/nip28/NIP28Service.test.ts
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { Effect, Layer, Exit, Option, Cause } from 'effect';
    import * as NostrToolsPure from 'nostr-tools/pure';
    import {
        NIP28Service,
        NIP28ServiceLive,
        type CreateChannelParams,
        type SetChannelMetadataParams,
        type SendChannelMessageParams,
        type HideMessageParams,
        type MuteUserParams,
        NIP28InvalidInputError,
        NIP28PublishError,
        NIP28FetchError
    } from '@/services/nip28';
    import { NostrService, type NostrEvent, NostrPublishError as UnderlyingNostrPublishError, NostrRequestError as UnderlyingNostrRequestError } from '@/services/nostr';

    // Mock NostrService
    const mockPublishEvent = vi.fn();
    const mockListEvents = vi.fn();
    const MockNostrServiceLayer = Layer.succeed(NostrService, {
        getPool: Effect.die("getPool mock not implemented/needed for NIP28 tests"),
        publishEvent: mockPublishEvent,
        listEvents: mockListEvents,
        cleanupPool: Effect.die("cleanupPool mock not implemented/needed for NIP28 tests"),
    });

    vi.mock('nostr-tools/pure', async (importOriginal) => {
        const original = await importOriginal<typeof NostrToolsPure>();
        return {
            ...original,
            generateSecretKey: vi.fn(original.generateSecretKey),
            getPublicKey: vi.fn(original.getPublicKey),
            finalizeEvent: vi.fn((template, sk) => {
                const pk = original.getPublicKey(sk);
                return {
                    ...template,
                    id: 'mockeventid' + Math.random().toString(16).slice(2),
                    pubkey: pk,
                    sig: 'mocksig' + Math.random().toString(16).slice(2),
                    tags: template.tags || [],
                    content: template.content || '',
                } as NostrEvent; // Cast needed as our NostrEvent is a subset
            }),
        };
    });

    const TestServiceLayer = NIP28ServiceLive.pipe(
        Layer.provide(MockNostrServiceLayer)
    );

    const runTestEffect = <E, A>(effect: Effect.Effect<A, E, NIP28Service>) => {
        return Effect.runPromiseExit(Effect.provide(effect, TestServiceLayer));
    };

    const testSk = NostrToolsPure.generateSecretKey();
    const testPk = NostrToolsPure.getPublicKey(testSk);

    describe('NIP28Service', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            // Reset an explicit mock implementation if needed
            mockPublishEvent.mockImplementation(() => Effect.succeed(undefined));
            mockListEvents.mockImplementation(() => Effect.succeed([]));
        });

        describe('createChannel', () => {
            it('should create and publish a kind 40 event', async () => {
                const params: CreateChannelParams = { name: "Test Channel", secretKey: testSk };
                const effect = Effect.flatMap(NIP28Service, s => s.createChannel(params));
                const exit = await runTestEffect(effect);

                expect(Exit.isSuccess(exit)).toBe(true);
                if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(40);
                    expect(event.pubkey).toBe(testPk);
                    expect(JSON.parse(event.content).name).toBe("Test Channel");
                }
                expect(mockPublishEvent).toHaveBeenCalledOnce();
            });

            it('should fail with NIP28InvalidInputError if name is empty', async () => {
                const params: CreateChannelParams = { name: "", secretKey: testSk };
                const effect = Effect.flatMap(NIP28Service, s => s.createChannel(params));
                const exit = await runTestEffect(effect);
                expect(Exit.isFailure(exit)).toBe(true);
                if (Exit.isFailure(exit)) {
                    const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
                    expect(error).toBeInstanceOf(NIP28InvalidInputError);
                    expect(error.message).toContain("Channel name is required");
                }
            });

             it('should fail with NIP28PublishError if NostrService.publishEvent fails', async () => {
                mockPublishEvent.mockReturnValue(Effect.fail(new UnderlyingNostrPublishError({ message: "Relay publish error" })));
                const params: CreateChannelParams = { name: "Test Channel", secretKey: testSk };
                const effect = Effect.flatMap(NIP28Service, s => s.createChannel(params));
                const exit = await runTestEffect(effect);
                expect(Exit.isFailure(exit)).toBe(true);
                if(Exit.isFailure(exit)){
                    const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
                    expect(error).toBeInstanceOf(NIP28PublishError);
                    expect(error.message).toBe("Relay publish error"); // Message should be propagated
                }
            });
        });

        describe('setChannelMetadata', () => {
            const channelCreateEventId = "kind40eventid";
            it('should create and publish a kind 41 event', async () => {
                const params: SetChannelMetadataParams = { channelCreateEventId, name: "New Name", secretKey: testSk };
                const effect = Effect.flatMap(NIP28Service, s => s.setChannelMetadata(params));
                const exit = await runTestEffect(effect);
                expect(Exit.isSuccess(exit)).toBe(true);
                if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(41);
                    expect(JSON.parse(event.content).name).toBe("New Name");
                    expect(event.tags).toContainEqual(["e", channelCreateEventId, "", "root"]);
                }
            });

            it('should fail with NIP28InvalidInputError if no metadata fields are provided', async () => {
                const params: SetChannelMetadataParams = { channelCreateEventId, secretKey: testSk }; // No actual metadata
                const effect = Effect.flatMap(NIP28Service, s => s.setChannelMetadata(params));
                const exit = await runTestEffect(effect);
                expect(Exit.isFailure(exit) && Exit.causeOption(exit).pipe(Option.getOrThrow)._tag === "NIP28InvalidInputError").toBe(true);
            });
        });

        describe('sendChannelMessage', () => {
            const channelCreateEventId = "kind40eventid";
            it('should create a kind 42 root message', async () => {
                const params: SendChannelMessageParams = { channelCreateEventId, content: "Hello!", secretKey: testSk };
                const effect = Effect.flatMap(NIP28Service, s => s.sendChannelMessage(params));
                const exit = await runTestEffect(effect);
                expect(Exit.isSuccess(exit)).toBe(true);
                if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(42);
                    expect(event.content).toBe("Hello!");
                    expect(event.tags).toContainEqual(["e", channelCreateEventId, "", "root"]);
                }
            });

             it('should create a kind 42 reply message', async () => {
                const params: SendChannelMessageParams = {
                    channelCreateEventId,
                    content: "Replying!",
                    replyToEventId: "parentMsgId",
                    replyToPubkey: "parentAuthorPk",
                    secretKey: testSk
                };
                const effect = Effect.flatMap(NIP28Service, s => s.sendChannelMessage(params));
                const exit = await runTestEffect(effect);
                expect(Exit.isSuccess(exit)).toBe(true);
                 if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.tags).toContainEqual(["e", channelCreateEventId, "", "root"]);
                    expect(event.tags).toContainEqual(["e", "parentMsgId", "", "reply"]);
                    expect(event.tags).toContainEqual(["p", "parentAuthorPk", ""]);
                }
            });

            it('should fail if message content is empty', async () => {
                const params: SendChannelMessageParams = { channelCreateEventId, content: "  ", secretKey: testSk };
                const effect = Effect.flatMap(NIP28Service, s => s.sendChannelMessage(params));
                const exit = await runTestEffect(effect);
                expect(Exit.isFailure(exit) && Exit.causeOption(exit).pipe(Option.getOrThrow)._tag === "NIP28InvalidInputError").toBe(true);
            });
        });

        describe('hideMessage', () => {
            it('should publish a kind 43 event', async () => {
                const params: HideMessageParams = {messageToHideEventId: "msgId", reason: "spam", secretKey: testSk };
                const effect = Effect.flatMap(NIP28Service, s => s.hideMessage(params));
                const exit = await runTestEffect(effect);
                expect(Exit.isSuccess(exit)).toBe(true);
                if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(43);
                    expect(event.tags).toContainEqual(["e", "msgId"]);
                    expect(JSON.parse(event.content).reason).toBe("spam");
                }
            });
        });

        describe('muteUser', () => {
            it('should publish a kind 44 event', async () => {
                const params: MuteUserParams = {userToMutePubkey: "mutePk", reason: "troll", secretKey: testSk };
                const effect = Effect.flatMap(NIP28Service, s => s.muteUser(params));
                const exit = await runTestEffect(effect);
                expect(Exit.isSuccess(exit)).toBe(true);
                if (Exit.isSuccess(exit)) {
                    const event = exit.value;
                    expect(event.kind).toBe(44);
                    expect(event.tags).toContainEqual(["p", "mutePk"]);
                    expect(JSON.parse(event.content).reason).toBe("troll");
                }
            });
        });

        describe('getChannel', () => {
            it('should fetch kind 40 event by ID', async () => {
                const mockEvent: NostrEvent = { id: "channelId", kind: 40, content: `{"name":"Test"}`, created_at: Date.now(), pubkey: testPk, sig: "sig" };
                mockListEvents.mockReturnValue(Effect.succeed([mockEvent]));
                const effect = Effect.flatMap(NIP28Service, s => s.getChannel("channelId"));
                const result = await runTestEffect(effect);
                expect(Option.isSome(Exit.getOrThrow(result)) && Option.getOrThrow(Exit.getOrThrow(result)).id === "channelId").toBe(true);
                expect(mockListEvents).toHaveBeenCalledWith([{ ids: ["channelId"], kinds: [40], limit: 1 }]);
            });

            it('should return Option.none if channel not found', async () => {
                 mockListEvents.mockReturnValue(Effect.succeed([]));
                 const effect = Effect.flatMap(NIP28Service, s => s.getChannel("nonexistent"));
                 const result = await runTestEffect(effect);
                 expect(Option.isNone(Exit.getOrThrow(result))).toBe(true);
            });

             it('should return NIP28FetchError on NostrService failure', async () => {
                mockListEvents.mockReturnValue(Effect.fail(new UnderlyingNostrRequestError({ message: "Fetch failed" })));
                const effect = Effect.flatMap(NIP28Service, s => s.getChannel("anyId"));
                const exit = await runTestEffect(effect);
                expect(Exit.isFailure(exit)).toBe(true);
                if(Exit.isFailure(exit)){
                    const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
                    expect(error).toBeInstanceOf(NIP28FetchError);
                    expect(error.message).toBe("Fetch failed");
                }
            });
        });

        // Tests for getChannelMetadataHistory, getLatestChannelMetadata, getChannelMessages,
        // getUserHiddenMessages, getUserMutedUsers would follow similar patterns,
        // mocking mockListEvents response and verifying filters.

    });
    ```

---

**Final Steps:**

1.  **Run `pnpm t`** to perform type checks and ensure no TypeScript errors.
2.  **Run `pnpm test "NIP28Service"`** (or `pnpm test` for all unit tests) to execute the unit tests. Address any failures.
3.  **Review:** Ensure all aspects of NIP-28 specified in `docs/nips/28.md` are covered by the service methods and tests.
    *   Kind 40 content (name, about, picture, relays).
    *   Kind 41 content (name, about, picture, relays) and tags (`e` for root channel, `t` for category).
    *   Kind 42 content (string) and tags (`e` for root channel, `e` for reply, `p` for replied user).
    *   Kind 43 content (optional reason) and `e` tag.
    *   Kind 44 content (optional reason) and `p` tag.

This creates a `NIP28Service` that encapsulates NIP-28 logic, uses the `NostrService` for communication, and is built with Effect-TS principles.
