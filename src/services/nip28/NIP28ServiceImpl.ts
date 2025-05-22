// src/services/nip28/NIP28ServiceImpl.ts
import { Effect, Layer } from "effect";
import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
import {
  NostrEvent,
  NostrFilter,
  NostrPublishError,
  NostrRequestError,
  NostrService,
  Subscription,
} from "@/services/nostr";
import {
  NIP04Service,
  NIP04EncryptError,
  NIP04DecryptError,
} from "@/services/nip04";
import {
  CreateChannelParams,
  type SendChannelMessageParams,
  type ChannelMetadata,
  NIP28Service,
  DecryptedChannelMessage,
  NIP28InvalidInputError,
  NIP28PublishError,
  NIP28FetchError,
} from "./NIP28Service";
import {
  TelemetryService,
  TelemetryServiceLive,
  DefaultTelemetryConfigLayer,
} from "@/services/telemetry";

// Layer for NIP28Service with dependencies on NostrService and NIP04Service
export const NIP28ServiceLive = Layer.effect(
  NIP28Service,
  Effect.gen(function* (_) {
    const nostr = yield* _(NostrService);
    const nip04 = yield* _(NIP04Service);

    // Helper to get channel metadata, reused internally
    const getChannelMetadataFn = (
      channelCreateEventId: string,
    ): Effect.Effect<ChannelMetadata, NostrRequestError> =>
      Effect.gen(function* (_) {
        const filter: NostrFilter = {
          ids: [channelCreateEventId],
          kinds: [40],
          limit: 1,
        };
        const events = yield* _(nostr.listEvents([filter]));

        // Track telemetry for this operation
        yield* _(
          Effect.provide(
            Effect.flatMap(TelemetryService, (ts) =>
              ts.trackEvent({
                category: "feature",
                action: "nip28_get_metadata",
                label: `Getting channel metadata for: ${channelCreateEventId}`,
                value: `Found ${events.length} events`,
              }),
            ),
            Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer),
          ).pipe(Effect.catchAllCause(() => Effect.void)),
        );

        if (events.length === 0) {
          return yield* _(
            Effect.fail(
              new NostrRequestError({
                message: `Channel metadata (Kind 40) not found for ID: ${channelCreateEventId}`,
              }),
            ),
          );
        }

        const event = events[0];
        try {
          const metadata = JSON.parse(event.content);
          return {
            name: metadata.name || "",
            about: metadata.about || "",
            picture: metadata.picture || "",
            creatorPk: event.pubkey,
            event_id: event.id,
          };
        } catch (e) {
          return yield* _(
            Effect.fail(
              new NostrRequestError({
                message: "Failed to parse channel metadata content",
                cause: e,
              }),
            ),
          );
        }
      });

    return NIP28Service.of({
      // Override the service methods with implementations that use the real nostr and nip04 services

      createChannel: (params: CreateChannelParams) =>
        Effect.gen(function* (_) {
          // Validate params
          if (!params.name || params.name.trim() === "") {
            return yield* _(
              Effect.fail(
                new NIP28InvalidInputError({
                  message: "Channel name is required.",
                }),
              ),
            );
          }

          // Track telemetry for this operation
          yield* _(
            Effect.provide(
              Effect.flatMap(TelemetryService, (ts) =>
                ts.trackEvent({
                  category: "feature",
                  action: "nip28_create_channel",
                  label: `Creating channel: ${params.name}`,
                }),
              ),
              Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer),
            ).pipe(Effect.catchAllCause(() => Effect.void)),
          );

          // Create the channel metadata
          const content = JSON.stringify({
            name: params.name,
            about: params.about || "",
            picture: params.picture || "",
          });

          // Create the channel event
          const template: EventTemplate = {
            kind: 40,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: content,
          };

          // Sign and finalize the event
          const event = finalizeEvent(template, params.secretKey) as NostrEvent;
          console.log(
            "[NIP28ServiceLive] Publishing Kind 40 channel creation event:",
            event,
          );

          // Publish the event
          try {
            yield* _(nostr.publishEvent(event));

            // Track telemetry for success
            yield* _(
              Effect.provide(
                Effect.flatMap(TelemetryService, (ts) =>
                  ts.trackEvent({
                    category: "feature",
                    action: "nip28_create_channel_success",
                    label: `Channel created successfully: ${event.id}`,
                  }),
                ),
                Layer.provide(
                  TelemetryServiceLive,
                  DefaultTelemetryConfigLayer,
                ),
              ).pipe(Effect.catchAllCause(() => Effect.void)),
            );

            return event;
          } catch (error) {
            // Track telemetry for failure
            yield* _(
              Effect.provide(
                Effect.flatMap(TelemetryService, (ts) =>
                  ts.trackEvent({
                    category: "error",
                    action: "nip28_create_channel_error",
                    label: `Failed to create channel: ${error instanceof Error ? error.message : String(error)}`,
                  }),
                ),
                Layer.provide(
                  TelemetryServiceLive,
                  DefaultTelemetryConfigLayer,
                ),
              ).pipe(Effect.catchAllCause(() => Effect.void)),
            );

            return yield* _(
              Effect.fail(
                new NostrPublishError({
                  message: "Failed to publish channel creation event",
                  cause: error,
                }),
              ),
            );
          }
        }),

      getChannelMetadata: getChannelMetadataFn,

      setChannelMetadata: (params) =>
        Effect.gen(function* (_) {
          // Validate that at least one metadata field is provided to update
          if (!params.name && !params.about && !params.picture) {
            return yield* _(
              Effect.fail(
                new NIP28InvalidInputError({
                  message:
                    "At least one metadata field (name, about, picture) must be provided to update",
                }),
              ),
            );
          }

          // Get the current channel metadata
          const channelMetadata = yield* _(
            getChannelMetadataFn(params.channelCreateEventId),
          );

          // Create updated metadata content
          const content = JSON.stringify({
            name: params.name || channelMetadata.name,
            about: params.about || channelMetadata.about,
            picture: params.picture || channelMetadata.picture,
          });

          // Create the channel metadata update event (Kind 41)
          const template = {
            kind: 41,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ["e", params.channelCreateEventId], // Reference the original Kind 40 event
              ["p", channelMetadata.creatorPk], // Reference the channel creator
            ],
            content: content,
          };

          // Sign and finalize the event
          const event = finalizeEvent(template, params.secretKey) as NostrEvent;
          console.log(
            "[NIP28ServiceLive] Publishing Kind 41 channel metadata update event:",
            event,
          );

          // Publish the event
          try {
            yield* _(nostr.publishEvent(event));
            return event;
          } catch (error) {
            return yield* _(
              Effect.fail(
                new NostrPublishError({
                  message: "Failed to publish channel metadata update event",
                  cause: error,
                }),
              ),
            );
          }
        }),

      sendChannelMessage: (params: SendChannelMessageParams) =>
        Effect.gen(function* (_) {
          // Validate message content
          if (!params.content || params.content.trim() === "") {
            return yield* _(
              Effect.fail(
                new NIP28InvalidInputError({
                  message: "Message content cannot be empty",
                }),
              ),
            );
          }
          // Get the channel metadata to find the creator's pubkey
          const channelMetadata = yield* _(
            getChannelMetadataFn(params.channelCreateEventId),
          );
          const channelCreatorPk = channelMetadata.creatorPk;

          // Encrypt the message content to the channel creator's pubkey
          console.log(
            "[NIP28ServiceLive] Encrypting message to channel creator:",
            channelCreatorPk,
          );
          const encryptedContent = yield* _(
            nip04.encrypt(params.secretKey, channelCreatorPk, params.content),
          );

          // Create the message tags - important for NIP-28 compliance
          const tags: string[][] = [
            ["e", params.channelCreateEventId, params.relayHint || "", "root"],
            ["p", channelCreatorPk],
          ];

          if (params.replyToEventId) {
            tags.push([
              "e",
              params.replyToEventId,
              params.replyRelayUrl || "",
              "reply",
            ]);
            if (params.replyToPubkey) {
              tags.push(["p", params.replyToPubkey]);
            }
          }

          // Create the message event
          const template: EventTemplate = {
            kind: 42,
            created_at: Math.floor(Date.now() / 1000),
            tags,
            content: encryptedContent,
          };

          // Sign and finalize the event
          const event = finalizeEvent(template, params.secretKey) as NostrEvent;
          console.log(
            "[NIP28ServiceLive] Publishing Kind 42 message event:",
            event,
          );

          // Publish the event
          try {
            yield* _(nostr.publishEvent(event));
            console.log(
              "[NIP28ServiceLive] Message published successfully:",
              event.id,
            );
            return event;
          } catch (error) {
            console.error(
              "[NIP28ServiceLive] Error publishing message:",
              error,
            );
            return yield* _(
              Effect.fail(
                new NostrPublishError({
                  message: "Failed to publish channel message",
                  cause: error,
                }),
              ),
            );
          }
        }),

      getChannelMessages: (
        channelId: string,
        userSk: Uint8Array,
        filterOptions?: Partial<NostrFilter>,
      ) =>
        Effect.gen(function* (_) {
          // Create filter to fetch channel messages
          const filter: NostrFilter = {
            kinds: [42],
            "#e": [channelId],
            limit: 50,
            ...filterOptions,
          };

          console.log(
            `[NIP28ServiceLive] Fetching messages for channel ${channelId} with filter:`,
            filter,
          );

          // Fetch the channel events
          const events = yield* _(nostr.listEvents([filter]));
          console.log(
            `[NIP28ServiceLive] Fetched ${events.length} raw messages for channel ${channelId}`,
          );

          // Get channel metadata to find the creator pubkey for decryption
          const metadata = yield* _(getChannelMetadataFn(channelId));
          const channelCreatorPk = metadata.creatorPk;

          // Decrypt all the messages
          const decryptedMessages: DecryptedChannelMessage[] = [];
          for (const event of events) {
            try {
              // Decrypt the message - NIP28 messages are encrypted to the channel creator's pubkey
              const decryptedContent = yield* _(
                nip04.decrypt(userSk, channelCreatorPk, event.content),
              );
              decryptedMessages.push({ ...event, decryptedContent });
            } catch (e) {
              console.warn(
                `[NIP28ServiceLive] Failed to decrypt message ${event.id}:`,
                e,
              );
              // Add the message with a placeholder for the decrypted content
              decryptedMessages.push({
                ...event,
                decryptedContent: "[Content could not be decrypted]",
              });
            }
          }

          // Sort by created_at ascending (oldest first) for chat display
          return decryptedMessages.sort((a, b) => a.created_at - b.created_at);
        }),

      subscribeToChannelMessages: (
        channelId: string,
        userSk: Uint8Array,
        onMessage: (message: DecryptedChannelMessage) => void,
      ) =>
        Effect.gen(function* (_) {
          // Get channel metadata to find the creator pubkey for decryption
          const metadata = yield* _(getChannelMetadataFn(channelId));
          const channelCreatorPk = metadata.creatorPk;

          // Filter for subscription
          const filter: NostrFilter = {
            kinds: [42],
            "#e": [channelId],
            since: Math.floor(Date.now() / 1000) - 3600, // Get the last hour of messages initially
          };

          console.log(
            `[NIP28ServiceLive] Subscribing to messages for channel ${channelId}`,
          );

          // Use nostr.subscribeToEvents directly (which returns an Effect)
          return yield* _(
            nostr.subscribeToEvents([filter], (event: NostrEvent) => {
              console.log(
                `[NIP28ServiceLive] Received new message via subscription: ${event.id}`,
              );

              // Decrypt the event
              Effect.runPromise(
                nip04.decrypt(userSk, channelCreatorPk, event.content),
              )
                .then((decryptedContent) => {
                  // Call the provided callback with the decrypted message
                  onMessage({ ...event, decryptedContent });
                })
                .catch((e) => {
                  console.warn(
                    `[NIP28ServiceLive] Failed to decrypt message ${event.id}:`,
                    e,
                  );
                  // Call the callback with a placeholder for the decrypted content
                  onMessage({
                    ...event,
                    decryptedContent: "[Content could not be decrypted]",
                  });
                });
            }),
          );
        }),
    });
  }),
);
