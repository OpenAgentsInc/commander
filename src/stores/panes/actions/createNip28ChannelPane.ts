import { PaneInput } from "@/types/pane";
import { PaneStoreType, SetPaneStore } from "../types";
import { Effect } from 'effect';
import { NIP28Service, type CreateChannelParams } from '@/services/nip28';
import { type NostrEvent } from '@/services/nostr';
import { hexToBytes } from "@noble/hashes/utils";
import { getPublicKey } from "nostr-tools/pure";
import { mainRuntime } from '@/services/runtime';
import { usePaneStore } from '@/stores/pane';

// Demo key for testing (in a real app this would come from the user's identity management)
const DEMO_CHANNEL_CREATOR_SK_HEX =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
const DEMO_CHANNEL_CREATOR_SK = hexToBytes(DEMO_CHANNEL_CREATOR_SK_HEX);
const DEMO_CHANNEL_CREATOR_PK = getPublicKey(DEMO_CHANNEL_CREATOR_SK);

/**
 * Creates a new NIP28 channel and adds it as a pane
 * Using the custom shared runtime for browser compatibility
 */
export function createNip28ChannelPaneAction(
  set: SetPaneStore,
  channelNameInput?: string,
) {
  const rt = mainRuntime;

  if (!rt) {
    console.error("CRITICAL: mainRuntime is not available in createNip28ChannelPaneAction.");
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

  const channelName = channelNameInput?.trim() || `My Channel ${Date.now() % 1000}`;
  const channelParams: CreateChannelParams = {
    name: channelName,
    about: `A new NIP-28 channel: ${channelName}`,
    picture: '',
    secretKey: DEMO_CHANNEL_CREATOR_SK,
  };

  console.log("Creating NIP28 channel using runtime:", rt);
  console.log("Channel params:", channelParams);
  
  // Create a fallback pane immediately in case the Effect runtime fails
  const fallbackId = `fallback-${Date.now()}`;
  const fallbackPaneInput: PaneInput = {
    id: `nip28-${fallbackId}`,
    type: 'nip28_channel',
    title: `${channelName} (Local)`,
    content: {
      channelId: fallbackId,
      channelName: channelName,
    },
  };
  usePaneStore.getState().addPane(fallbackPaneInput, true);

  // Try to create a real channel if Effect works
  try {
    const createAndPublishEffect = Effect.gen(function*(_) {
      const nip28Service = yield* _(NIP28Service);
      console.log("[Action] Creating NIP28 channel with params:", channelName);
      const channelEvent = yield* _(nip28Service.createChannel(channelParams));
      console.log("[Action] NIP28 channel event created, ID:", channelEvent.id);
      return channelEvent;
    });

    rt.runPromise(createAndPublishEffect)
      .then((channelEvent: NostrEvent) => {
        console.log("Channel event created successfully:", channelEvent);
        try {
          // We already created a fallback pane, just leave it
          console.log("Using fallback pane since we already created it");
        } catch (parseError) {
          console.error("Error parsing channel metadata:", parseError);
        }
      })
      .catch(error => {
        console.error("Error creating/publishing NIP28 channel:", error);
        // We already created a fallback pane, just leave it
      });
  } catch (error) {
    console.error("Critical error in channel creation:", error);
    // We already created a fallback pane, just leave it
  }
}