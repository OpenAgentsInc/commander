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
import { TelemetryService, TelemetryServiceLive, type TelemetryEvent } from "@/services/telemetry";

// Helper to sign and publish an event
function signAndPublishEvent(
    template: EventTemplate,
    secretKey: Uint8Array
): Effect.Effect<NostrEvent, NIP28PublishError, NostrService> {
    // Create a helper function to safely run telemetry operations
    const runTelemetry = (eventData: TelemetryEvent) =>
        Effect.provide(
            Effect.flatMap(TelemetryService, ts => ts.trackEvent(eventData)),
            TelemetryServiceLive
        ).pipe(Effect.catchAllCause(() => Effect.void)); // Ignore any telemetry errors

    return Effect.gen(function*(_) {
        // Log attempt (with isolated telemetry)
        yield* _(runTelemetry({
            category: "feature",
            action: `nip28_create_kind_${template.kind}`,
            label: `Creating NIP-28 event kind ${template.kind}`
        }));

        // Sign the event
        let signedEvent: NostrEvent;
        try {
            signedEvent = finalizeEvent(template, secretKey) as NostrEvent;
        } catch (e) {
            // Log error (with isolated telemetry)
            yield* _(runTelemetry({
                category: "log:error",
                action: "nip28_sign_error",
                label: "Failed to sign NIP-28 event",
                value: e instanceof Error ? e.message : String(e)
            }));
            return yield* _(Effect.fail(new NIP28PublishError({ message: "Failed to sign event", cause: e })));
        }

        // Publish the event
        const nostrService = yield* _(NostrService);
        yield* _(
            nostrService.publishEvent(signedEvent).pipe(
                Effect.tapError(cause => 
                    // Log error (with isolated telemetry)
                    runTelemetry({
                        category: "log:error",
                        action: "nip28_publish_error",
                        label: `Failed to publish NIP-28 kind ${template.kind} event`,
                        value: cause instanceof Error ? cause.message : String(cause)
                    })
                ),
                Effect.mapError(cause => {
                    return new NIP28PublishError({ message: "Failed to publish NIP-28 event", cause });
                })
            )
        );

        // Log success (with isolated telemetry)
        yield* _(runTelemetry({
            category: "log:info",
            action: "nip28_publish_success",
            label: `Successfully published NIP-28 kind ${template.kind} event`,
            value: signedEvent.id
        }));

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
                // Create content object immutably using spreads
                const content: Partial<Schema.Schema.Type<typeof ChannelMetadataContentSchema>> = {
                    ...(params.name !== undefined ? { name: params.name } : {}),
                    ...(params.about !== undefined ? { about: params.about } : {}),
                    ...(params.picture !== undefined ? { picture: params.picture } : {}),
                    ...(params.relays !== undefined ? { relays: params.relays } : {})
                };

                if (Object.keys(content).length === 0) {
                     return yield* _(Effect.fail(new NIP28InvalidInputError({ message: "At least one metadata field (name, about, picture, relays) must be provided." })));
                }

                // Validate content against schema (allow partial for updates)
                yield* _(Schema.decodeUnknown(Schema.partial(ChannelMetadataContentSchema))(content), Effect.mapError(
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

        getChannel: (channelCreateEventId: string): Effect.Effect<Option.Option<NostrEvent>, NIP28FetchError, NostrService> =>
            Effect.gen(function*(_) {
                // Create a helper function to safely run telemetry operations
                const runTelemetry = (eventData: TelemetryEvent) =>
                    Effect.provide(
                        Effect.flatMap(TelemetryService, ts => ts.trackEvent(eventData)),
                        TelemetryServiceLive
                    ).pipe(Effect.catchAllCause(() => Effect.void));

                // Log attempt (with isolated telemetry)
                yield* _(runTelemetry({
                    category: "feature",
                    action: "nip28_get_channel",
                    label: "Fetching channel event",
                    value: channelCreateEventId
                }));

                const nostrService = yield* _(NostrService);
                const filters: NostrFilter[] = [{ ids: [channelCreateEventId], kinds: [40], limit: 1 }];
                const events = yield* _(
                    nostrService.listEvents(filters).pipe(
                        Effect.tap((results: NostrEvent[]) => 
                            // Log success (with isolated telemetry)
                            runTelemetry({
                                category: "log:info",
                                action: "nip28_get_channel_result",
                                label: "Channel fetch result",
                                value: `Found ${results.length} channels`
                            })
                        ),
                        Effect.tapError(cause => 
                            // Log error (with isolated telemetry)
                            runTelemetry({
                                category: "log:error",
                                action: "nip28_fetch_error",
                                label: "Failed to fetch channel event",
                                value: cause instanceof Error ? cause.message : String(cause)
                            })
                        ),
                        Effect.mapError(cause => 
                            new NIP28FetchError({ message: "Failed to fetch channel event", cause })
                        )
                    )
                );
                return Option.fromNullable(events[0]);
            }),

        getChannelMetadataHistory: (channelCreateEventId: string, limit: number = 10): Effect.Effect<NostrEvent[], NIP28FetchError, NostrService> =>
            Effect.gen(function*(_) {
                // Create a helper function to safely run telemetry operations
                const runTelemetry = (eventData: TelemetryEvent) =>
                    Effect.provide(
                        Effect.flatMap(TelemetryService, ts => ts.trackEvent(eventData)),
                        TelemetryServiceLive
                    ).pipe(Effect.catchAllCause(() => Effect.void));

                // Log attempt (with isolated telemetry)
                yield* _(runTelemetry({
                    category: "feature",
                    action: "nip28_get_metadata_history",
                    label: "Fetching channel metadata history",
                    value: channelCreateEventId
                }));

                const nostrService = yield* _(NostrService);
                const filters: NostrFilter[] = [{ kinds: [41], "#e": [channelCreateEventId], limit }];
                return yield* _(
                    nostrService.listEvents(filters).pipe( // listEvents already sorts by created_at desc
                        Effect.tap((results: NostrEvent[]) => 
                            // Log success (with isolated telemetry)
                            runTelemetry({
                                category: "log:info",
                                action: "nip28_metadata_history_result",
                                label: "Metadata history fetch result",
                                value: `Found ${results.length} metadata events`
                            })
                        ),
                        Effect.tapError(cause => 
                            // Log error (with isolated telemetry)
                            runTelemetry({
                                category: "log:error",
                                action: "nip28_fetch_error",
                                label: "Failed to fetch channel metadata history",
                                value: cause instanceof Error ? cause.message : String(cause)
                            })
                        ),
                        Effect.mapError(cause => 
                            new NIP28FetchError({ message: "Failed to fetch channel metadata history", cause })
                        )
                    )
                );
            }),

        getLatestChannelMetadata: (channelCreateEventId: string, channelCreatorPubkey?: string): Effect.Effect<Option.Option<NostrEvent>, NIP28FetchError, NostrService> =>
            Effect.gen(function*(_) {
                // Create a helper function to safely run telemetry operations
                const runTelemetry = (eventData: TelemetryEvent) =>
                    Effect.provide(
                        Effect.flatMap(TelemetryService, ts => ts.trackEvent(eventData)),
                        TelemetryServiceLive
                    ).pipe(Effect.catchAllCause(() => Effect.void));

                // Log attempt (with isolated telemetry)
                yield* _(runTelemetry({
                    category: "feature",
                    action: "nip28_get_latest_metadata",
                    label: "Fetching latest channel metadata",
                    value: channelCreateEventId
                }));

                const nostrService = yield* _(NostrService);
                const filter: NostrFilter = { kinds: [41], "#e": [channelCreateEventId], limit: 1 };
                if (channelCreatorPubkey) {
                    filter.authors = [channelCreatorPubkey];
                }
                // Fetch potentially multiple due to relay inconsistencies, then pick latest.
                // More robust would be to fetch a few (e.g. limit 5) and pick the one with highest created_at.
                const events = yield* _(
                    nostrService.listEvents([filter]).pipe(
                        Effect.tap((results: NostrEvent[]) => 
                            // Log success (with isolated telemetry)
                            runTelemetry({
                                category: "log:info",
                                action: "nip28_latest_metadata_result",
                                label: "Latest metadata fetch result",
                                value: `Found ${results.length} metadata events`
                            })
                        ),
                        Effect.tapError(cause => 
                            // Log error (with isolated telemetry)
                            runTelemetry({
                                category: "log:error",
                                action: "nip28_fetch_error",
                                label: "Failed to fetch latest channel metadata",
                                value: cause instanceof Error ? cause.message : String(cause)
                            })
                        ),
                        Effect.mapError(cause => 
                            new NIP28FetchError({ message: "Failed to fetch latest channel metadata", cause })
                        )
                    )
                );
                // listEvents should already sort by created_at descending, so events[0] is the latest.
                return Option.fromNullable(events[0]);
            }),

        getChannelMessages: (channelCreateEventId: string, options?: { limit?: number; since?: number; until?: number; }): Effect.Effect<NostrEvent[], NIP28FetchError, NostrService> =>
            Effect.gen(function*(_) {
                // Create a helper function to safely run telemetry operations
                const runTelemetry = (eventData: TelemetryEvent) =>
                    Effect.provide(
                        Effect.flatMap(TelemetryService, ts => ts.trackEvent(eventData)),
                        TelemetryServiceLive
                    ).pipe(Effect.catchAllCause(() => Effect.void));

                // Log attempt (with isolated telemetry)
                yield* _(runTelemetry({
                    category: "feature",
                    action: "nip28_get_channel_messages",
                    label: "Fetching channel messages",
                    value: channelCreateEventId
                }));

                const nostrService = yield* _(NostrService);
                const filters: NostrFilter[] = [{
                    kinds: [42],
                    "#e": [channelCreateEventId],
                    limit: options?.limit ?? 50,
                    since: options?.since,
                    until: options?.until
                }];
                return yield* _(
                    nostrService.listEvents(filters).pipe(
                        Effect.tap((results: NostrEvent[]) => 
                            // Log success (with isolated telemetry)
                            runTelemetry({
                                category: "log:info",
                                action: "nip28_channel_messages_result",
                                label: "Channel messages fetch result",
                                value: `Found ${results.length} messages`
                            })
                        ),
                        Effect.tapError(cause => 
                            // Log error (with isolated telemetry)
                            runTelemetry({
                                category: "log:error",
                                action: "nip28_fetch_error",
                                label: "Failed to fetch channel messages",
                                value: cause instanceof Error ? cause.message : String(cause)
                            })
                        ),
                        Effect.mapError(cause => 
                            new NIP28FetchError({ message: "Failed to fetch channel messages", cause })
                        )
                    )
                );
            }),

        getUserHiddenMessages: (userPubkey: string, options?: { limit?: number; since?: number; until?: number; }): Effect.Effect<NostrEvent[], NIP28FetchError, NostrService> =>
            Effect.gen(function*(_) {
                // Create a helper function to safely run telemetry operations
                const runTelemetry = (eventData: TelemetryEvent) =>
                    Effect.provide(
                        Effect.flatMap(TelemetryService, ts => ts.trackEvent(eventData)),
                        TelemetryServiceLive
                    ).pipe(Effect.catchAllCause(() => Effect.void));

                // Log attempt (with isolated telemetry)
                yield* _(runTelemetry({
                    category: "feature",
                    action: "nip28_get_hidden_messages",
                    label: "Fetching user hidden messages",
                    value: userPubkey
                }));

                const nostrService = yield* _(NostrService);
                const filters: NostrFilter[] = [{
                    kinds: [43],
                    authors: [userPubkey],
                    limit: options?.limit ?? 100,
                    since: options?.since,
                    until: options?.until
                }];
                return yield* _(
                    nostrService.listEvents(filters).pipe(
                        Effect.tap((results: NostrEvent[]) => 
                            // Log success (with isolated telemetry)
                            runTelemetry({
                                category: "log:info",
                                action: "nip28_hidden_messages_result",
                                label: "Hidden messages fetch result",
                                value: `Found ${results.length} hidden messages`
                            })
                        ),
                        Effect.tapError(cause => 
                            // Log error (with isolated telemetry)
                            runTelemetry({
                                category: "log:error",
                                action: "nip28_fetch_error",
                                label: "Failed to fetch user hidden messages",
                                value: cause instanceof Error ? cause.message : String(cause)
                            })
                        ),
                        Effect.mapError(cause => 
                            new NIP28FetchError({ message: "Failed to fetch user hidden messages", cause })
                        )
                    )
                );
            }),

        getUserMutedUsers: (userPubkey: string, options?: { limit?: number; since?: number; until?: number; }): Effect.Effect<NostrEvent[], NIP28FetchError, NostrService> =>
            Effect.gen(function*(_) {
                // Create a helper function to safely run telemetry operations
                const runTelemetry = (eventData: TelemetryEvent) =>
                    Effect.provide(
                        Effect.flatMap(TelemetryService, ts => ts.trackEvent(eventData)),
                        TelemetryServiceLive
                    ).pipe(Effect.catchAllCause(() => Effect.void));

                // Log attempt (with isolated telemetry)
                yield* _(runTelemetry({
                    category: "feature",
                    action: "nip28_get_muted_users",
                    label: "Fetching user muted users",
                    value: userPubkey
                }));

                const nostrService = yield* _(NostrService);
                const filters: NostrFilter[] = [{
                    kinds: [44],
                    authors: [userPubkey],
                    limit: options?.limit ?? 100,
                    since: options?.since,
                    until: options?.until
                }];
                return yield* _(
                    nostrService.listEvents(filters).pipe(
                        Effect.tap((results: NostrEvent[]) => 
                            // Log success (with isolated telemetry)
                            runTelemetry({
                                category: "log:info",
                                action: "nip28_muted_users_result",
                                label: "Muted users fetch result",
                                value: `Found ${results.length} muted users`
                            })
                        ),
                        Effect.tapError(cause => 
                            // Log error (with isolated telemetry)
                            runTelemetry({
                                category: "log:error",
                                action: "nip28_fetch_error",
                                label: "Failed to fetch user muted users",
                                value: cause instanceof Error ? cause.message : String(cause)
                            })
                        ),
                        Effect.mapError(cause => 
                            new NIP28FetchError({ message: "Failed to fetch user muted users", cause })
                        )
                    )
                );
            }),
    };
}

// Layer for NIP28Service with dependency on NostrService only
export const NIP28ServiceLive = Layer.effect(
    NIP28Service,
    Effect.succeed(createNIP28Service())
);