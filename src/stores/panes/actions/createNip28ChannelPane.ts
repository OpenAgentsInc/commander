import { PaneInput } from "@/types/pane";
import { PaneStoreType, SetPaneStore } from "../types";
import { addPaneAction } from "./addPane";
import { hexToBytes } from "@noble/hashes/utils";
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  type EventTemplate,
} from "nostr-tools/pure";

// Demo key for testing (in a real app this would come from the user's identity management)
const DEMO_CHANNEL_CREATOR_SK_HEX =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
const DEMO_CHANNEL_CREATOR_SK = hexToBytes(DEMO_CHANNEL_CREATOR_SK_HEX);
const DEMO_CHANNEL_CREATOR_PK = getPublicKey(DEMO_CHANNEL_CREATOR_SK);

/**
 * Creates a new NIP28 channel and adds it as a pane
 * This implementation does not use Effect to avoid runtime issues in packaged app
 */
export function createNip28ChannelPaneAction(
  set: SetPaneStore,
  channelNameInput?: string,
) {
  // Generate a channel name if not provided
  const channelName =
    channelNameInput?.trim() || `My Channel ${Date.now() % 1000}`;

  try {
    console.log("[Action] Creating NIP28 channel with name:", channelName);

    // Manually create the channel event without using Effect
    const metadata = {
      name: channelName,
      about: `A new NIP-28 channel: ${channelName}`,
      picture: "", // Placeholder for picture URL
    };

    // Create the event template directly
    const eventTemplate: EventTemplate = {
      kind: 40, // Channel creation event kind
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(metadata),
    };

    // Sign the event
    const channelEvent = finalizeEvent(eventTemplate, DEMO_CHANNEL_CREATOR_SK);
    console.log("[Action] NIP28 channel event created, ID:", channelEvent.id);

    // Create a new pane for the channel
    const newPaneInput: PaneInput = {
      id: `nip28-${channelEvent.id}`, // Use event id for uniqueness
      type: "nip28_channel",
      title: channelName,
      content: {
        channelId: channelEvent.id,
        channelName: channelName,
      },
    };

    // Add the pane
    set((state: PaneStoreType) => {
      // For now, just create the pane even if we didn't publish the event
      // In a real app, you'd want to ensure the event was published
      const changes = addPaneAction(state, newPaneInput, true);
      return { ...state, ...changes };
    });
  } catch (error) {
    console.error("Error creating NIP28 channel:", error);

    // Create an error pane
    const errorPaneInput: PaneInput = {
      type: "default",
      title: "Error Creating Channel",
      content: {
        message: `Failed to create NIP-28 channel: ${error instanceof Error ? error.message : String(error)}`,
      },
    };

    set((state: PaneStoreType) => {
      const changes = addPaneAction(state, errorPaneInput);
      return { ...state, ...changes };
    });
  }
}
