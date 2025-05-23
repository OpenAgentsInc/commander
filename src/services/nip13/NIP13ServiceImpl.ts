import { Effect, Layer } from "effect";
import { getEventHash, getSignature, type Event as NostrEvent } from "nostr-tools/pure";
import { NIP13Service, NIP13Error, type MinedEvent, type MiningOptions } from "./NIP13Service";

// Implementation based on NIP-13 JavaScript example
function countLeadingZeroes(hex: string): number {
  let count = 0;

  for (let i = 0; i < hex.length; i++) {
    const nibble = parseInt(hex[i], 16);
    if (nibble === 0) {
      count += 4;
    } else {
      count += Math.clz32(nibble) - 28;
      break;
    }
  }

  return count;
}

export const NIP13ServiceImpl = NIP13Service.of({
  calculateDifficulty: (eventId: string): number => {
    return countLeadingZeroes(eventId);
  },

  validatePoW: (event: NostrEvent, requiredDifficulty: number): boolean => {
    const difficulty = countLeadingZeroes(event.id);
    
    // Check if event has a nonce tag with target difficulty
    const nonceTag = event.tags.find(tag => tag[0] === "nonce");
    if (nonceTag && nonceTag[2]) {
      const targetDifficulty = parseInt(nonceTag[2], 10);
      // Reject if the committed target is less than required
      if (targetDifficulty < requiredDifficulty) {
        return false;
      }
    }
    
    return difficulty >= requiredDifficulty;
  },

  addNonceTag: (event: NostrEvent, nonce: string, targetDifficulty: number): NostrEvent => {
    // Remove existing nonce tag if present
    const filteredTags = event.tags.filter(tag => tag[0] !== "nonce");
    
    return {
      ...event,
      tags: [...filteredTags, ["nonce", nonce, targetDifficulty.toString()]]
    };
  },

  mineEvent: (event: NostrEvent, options: MiningOptions): Effect.Effect<MinedEvent, NIP13Error> => {
    return Effect.async<MinedEvent, NIP13Error>((callback) => {
      const startTime = Date.now();
      const maxIterations = options.maxIterations ?? 10_000_000; // 10M default
      const timeoutMs = options.timeoutMs ?? 300_000; // 5 minutes default
      
      let iterations = 0;
      let currentBestDifficulty = 0;
      let isCancelled = false;

      // Use setTimeout to avoid blocking
      const mine = () => {
        if (isCancelled) {
          return;
        }

        const batchSize = 10000; // Process in batches
        const batchEnd = Math.min(iterations + batchSize, maxIterations);

        for (let i = iterations; i < batchEnd; i++) {
          // Update created_at every 100k iterations to change the hash significantly
          const created_at = event.created_at + Math.floor(i / 100000);
          
          // Create event with nonce
          const minedEvent = {
            ...event,
            created_at,
            tags: event.tags.filter(tag => tag[0] !== "nonce").concat([
              ["nonce", i.toString(), options.targetDifficulty.toString()]
            ])
          };

          // Calculate hash
          const eventId = getEventHash(minedEvent);
          const difficulty = countLeadingZeroes(eventId);

          if (difficulty > currentBestDifficulty) {
            currentBestDifficulty = difficulty;
            if (options.onProgress) {
              options.onProgress(i, currentBestDifficulty);
            }
          }

          if (difficulty >= options.targetDifficulty) {
            // Success! Add signature if private key available
            const result: MinedEvent = {
              ...minedEvent,
              id: eventId,
              miningMetadata: {
                difficulty,
                iterations: i,
                timeMs: Date.now() - startTime
              }
            };
            
            callback(Effect.succeed(result));
            return;
          }

          // Check timeout
          if (Date.now() - startTime > timeoutMs) {
            callback(Effect.fail(new NIP13Error(
              `Mining timeout after ${i} iterations. Best difficulty: ${currentBestDifficulty}/${options.targetDifficulty}`
            )));
            return;
          }
        }

        iterations = batchEnd;

        if (iterations >= maxIterations) {
          callback(Effect.fail(new NIP13Error(
            `Mining failed after ${maxIterations} iterations. Best difficulty: ${currentBestDifficulty}/${options.targetDifficulty}`
          )));
          return;
        }

        // Continue mining in next tick
        setTimeout(mine, 0);
      };

      // Start mining
      setTimeout(mine, 0);

      // Return cleanup function
      return Effect.sync(() => {
        isCancelled = true;
      });
    });
  }
});

export const NIP13ServiceLive = Layer.succeed(NIP13Service, NIP13ServiceImpl);