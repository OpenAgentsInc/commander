import { PaneInput } from '@/types/pane';
import { PaneStoreType, SetPaneStore } from '../types';
import { addPaneAction } from './addPane';
import { Effect, Layer, Runtime } from 'effect';
import { NostrService, NostrServiceLive, DefaultNostrServiceConfigLayer } from '@/services/nostr';
import { NIP28Service, NIP28ServiceLive } from '@/services/nip28';
import { hexToBytes } from '@noble/hashes/utils';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';

// Demo key for testing (in a real app this would come from the user's identity management)
const DEMO_CHANNEL_CREATOR_SK_HEX = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
const DEMO_CHANNEL_CREATOR_SK = hexToBytes(DEMO_CHANNEL_CREATOR_SK_HEX);
const DEMO_CHANNEL_CREATOR_PK = getPublicKey(DEMO_CHANNEL_CREATOR_SK);

/**
 * Creates a new NIP28 channel and adds it as a pane
 */
export function createNip28ChannelPaneAction(set: SetPaneStore, channelNameInput?: string) {
  // Create a runtime with NostrService and NIP28Service
  const rt = Runtime.make(
    Layer.provide(
      Layer.merge(NostrServiceLive, NIP28ServiceLive),
      DefaultNostrServiceConfigLayer
    )
  );

  // Generate a channel name if not provided
  const channelName = channelNameInput?.trim() || `New Channel ${Date.now() % 1000}`;

  // Create the channel
  const createChannelProgram = Effect.gen(function*(_) {
    // Get the NIP28 service
    const nip28Service = yield* _(NIP28Service);
    
    // Create the channel
    const channelEvent = yield* _(nip28Service.createChannel({
      name: channelName,
      about: `A new NIP28 channel: ${channelName}`,
      picture: '', // Could add a default picture URL
      secretKey: DEMO_CHANNEL_CREATOR_SK
    }));
    
    return channelEvent;
  });

  // Run the program to create the channel
  rt.runPromise(createChannelProgram)
    .then(channelEvent => {
      // Create a pane input for the new channel
      const newPaneInput: PaneInput = {
        id: `nip28-${channelEvent.id}`,
        type: 'nip28_channel',
        title: channelName,
        content: {
          channelId: channelEvent.id,
          channelName: channelName,
        },
      };

      // Use the existing addPaneAction to add the pane
      addPaneAction(set, newPaneInput, true); // true for cascade/tiling behavior
    })
    .catch(error => {
      console.error("Error creating NIP28 channel:", error);
      
      // Create an error pane
      const errorPaneInput: PaneInput = {
        type: 'default',
        title: 'Error Creating Channel',
        content: { 
          message: `Failed to create NIP-28 channel: ${error instanceof Error ? error.message : String(error)}` 
        }
      };
      
      addPaneAction(set, errorPaneInput);
    });
}