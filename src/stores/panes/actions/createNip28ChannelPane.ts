// src/stores/panes/actions/createNip28ChannelPane.ts
import { PaneInput } from "@/types/pane";
import { PaneStoreType, SetPaneStore, GetPaneStore } from "../types";
import { Effect, Exit, Cause } from "effect";
import { NIP28Service, type CreateChannelParams, NIP28InvalidInputError } from '@/services/nip28';
import { type NostrEvent, NostrRequestError, NostrPublishError } from '@/services/nostr';
import { hexToBytes } from "@noble/hashes/utils";
import { getPublicKey } from "nostr-tools/pure";
import { getMainRuntime } from '@/services/runtime';
import { usePaneStore } from '@/stores/pane';

// Demo key for testing (in a real app this would come from the user's identity management)
const DEMO_CHANNEL_CREATOR_SK_HEX =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
const DEMO_CHANNEL_CREATOR_SK = hexToBytes(DEMO_CHANNEL_CREATOR_SK_HEX);
const DEMO_CHANNEL_CREATOR_PK = getPublicKey(DEMO_CHANNEL_CREATOR_SK);

/**
 * Creates a new NIP28 channel and adds it as a pane
 */
export function createNip28ChannelPaneAction(
  set: SetPaneStore,
  get: GetPaneStore,
  channelNameInput?: string,
) {
  const rt = getMainRuntime();

  if (!rt) {
    console.error("CRITICAL: Runtime is not available in createNip28ChannelPaneAction.");
    // Create an error pane
    const errorPaneInput: PaneInput = {
      type: 'default', 
      title: 'Runtime Error',
      content: { message: "Effect runtime not initialized. Channel creation failed." }
    };
    // Use addPane from the store directly, not the action
    usePaneStore.getState().addPane(errorPaneInput);
    return;
  }

  const channelName = channelNameInput?.trim() || `Channel ${Date.now() % 1000}`;
  
  // Create a temporary "creating channel" pane to show progress
  const tempPaneId = `creating-${Date.now()}`;
  const tempPaneInput: PaneInput = {
    id: tempPaneId,
    type: 'default',
    title: `Creating ${channelName}...`,
    content: { message: "Communicating with Nostr relays..." },
    dismissable: false,
  };
  usePaneStore.getState().addPane(tempPaneInput, true);
  
  // Prepare channel creation parameters
  const channelParams: CreateChannelParams = {
    name: channelName,
    about: `A new NIP-28 channel: ${channelName}`,
    picture: '',
    secretKey: DEMO_CHANNEL_CREATOR_SK,
  };

  console.log("[Action] Creating NIP28 channel using Effect runtime");
  console.log("[Action] Channel params:", channelParams);
  
  // Create an Effect that gets the NIP28Service and creates a channel
  const createChannelEffect = Effect.flatMap(
    NIP28Service,
    nip28Service => nip28Service.createChannel(channelParams)
  );
  
  // Run the Effect using Effect.runPromiseExit
  Effect.runPromiseExit(Effect.provide(createChannelEffect, rt))
    .then((exitResult: Exit.Exit<NostrEvent, NostrRequestError | NostrPublishError | NIP28InvalidInputError>) => {
      // Remove the temporary "creating" pane
      usePaneStore.getState().removePane(tempPaneId);
      
      if (Exit.isSuccess(exitResult)) {
        // If successful, get the channel event
        const channelEvent = exitResult.value;
        console.log("[Action] NIP28 channel event created successfully:", channelEvent);
        
        // Create a channel pane using the real channel ID from Nostr
        try {
          // Parse metadata from the content if needed
          let metadata = { name: channelName };
          try {
            metadata = JSON.parse(channelEvent.content);
          } catch (parseError) {
            console.warn("[Action] Error parsing channel metadata:", parseError);
          }
          
          // Create the pane with the real channel data
          const channelPaneInput: PaneInput = {
            id: `nip28-${channelEvent.id}`,
            type: 'nip28_channel',
            title: metadata.name || channelName,
            content: {
              channelId: channelEvent.id,
              channelName: metadata.name || channelName,
            },
          };
          usePaneStore.getState().addPane(channelPaneInput, true);
        } catch (error: unknown) {
          console.error("[Action] Error creating channel pane:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorPaneInput: PaneInput = {
            type: 'default',
            title: 'Channel Creation Error',
            content: { message: `Error creating channel pane: ${errorMessage}` }
          };
          usePaneStore.getState().addPane(errorPaneInput);
        }
      } else {
        // If failed, show an error pane
        const error = Cause.squash(exitResult.cause);
        console.error("[Action] Error creating NIP28 channel:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorPaneInput: PaneInput = {
          type: 'default',
          title: 'Channel Creation Failed',
          content: { message: `Failed to create channel on Nostr: ${errorMessage}` }
        };
        usePaneStore.getState().addPane(errorPaneInput);
      }
    })
    .catch((error: unknown) => {
      // Handle unexpected errors outside the Effect
      usePaneStore.getState().removePane(tempPaneId);
      console.error("[Action] Critical error in channel creation:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorPaneInput: PaneInput = {
        type: 'default',
        title: 'Channel Creation Critical Error',
        content: { message: `Runtime error: ${errorMessage}` }
      };
      usePaneStore.getState().addPane(errorPaneInput);
    });
}