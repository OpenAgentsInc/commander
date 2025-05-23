import { Context, Effect } from "effect";
import type { Event as NostrEvent } from "nostr-tools/pure";

// Error types
export class NIP13Error extends Error {
  readonly _tag = "NIP13Error";
  constructor(
    readonly message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "NIP13Error";
  }
}

// Mined event type - includes the nonce that was found
export interface MinedEvent extends NostrEvent {
  tags: ReadonlyArray<readonly string[]>;
  miningMetadata?: {
    difficulty: number;
    iterations: number;
    timeMs: number;
  };
}

// Mining options
export interface MiningOptions {
  targetDifficulty: number;
  maxIterations?: number;
  timeoutMs?: number;
  onProgress?: (iterations: number, currentBestDifficulty: number) => void;
}

// Service interface
export interface NIP13Service {
  /**
   * Mine an event to achieve the target difficulty
   * Adds nonce tag and updates created_at
   */
  readonly mineEvent: (
    event: NostrEvent,
    options: MiningOptions
  ) => Effect.Effect<MinedEvent, NIP13Error>;

  /**
   * Calculate the difficulty (leading zero bits) of an event ID
   */
  readonly calculateDifficulty: (eventId: string) => number;

  /**
   * Validate that an event meets the required difficulty
   */
  readonly validatePoW: (
    event: NostrEvent,
    requiredDifficulty: number
  ) => boolean;

  /**
   * Add or update nonce tag on an event
   */
  readonly addNonceTag: (
    event: NostrEvent,
    nonce: string,
    targetDifficulty: number
  ) => NostrEvent;
}

export const NIP13Service = Context.GenericTag<NIP13Service>("NIP13Service");