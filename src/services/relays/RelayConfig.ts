/**
 * Centralized Relay Configuration
 * 
 * All relay URLs should be imported from here to ensure consistency across
 * the application. This single source of truth prevents relay mismatches.
 */

// Primary relays for general Nostr operations
export const DEFAULT_RELAYS = [
  "wss://nostr.mom",
  "wss://relay.primal.net", 
  "wss://offchain.pub"
] as const;

// DVM-specific relays (same as default for now)
export const DVM_RELAYS = [
  "wss://nostr.mom",
  "wss://relay.primal.net",
  "wss://offchain.pub"
] as const;

// NIP-90 consumer relays (for subscribing to DVM responses)
export const NIP90_CONSUMER_RELAYS = [
  "wss://nostr.mom",
  "wss://relay.primal.net",
  "wss://offchain.pub"
] as const;

// Legacy relays (commented out - were causing PoW issues)
export const LEGACY_RELAYS = [
  // "wss://nos.lol", // Now requires PoW
  // "wss://relay.damus.io", // Requires 28-bit PoW
  // "wss://relay.nostr.band", // Requires 28-bit PoW
] as const;

// Convert to regular arrays for runtime use
export const DEFAULT_RELAYS_ARRAY = [...DEFAULT_RELAYS];
export const DVM_RELAYS_ARRAY = [...DVM_RELAYS];
export const NIP90_CONSUMER_RELAYS_ARRAY = [...NIP90_CONSUMER_RELAYS];

// Utility function to get all unique relays
export function getAllRelays(): string[] {
  return Array.from(new Set([
    ...DEFAULT_RELAYS,
    ...DVM_RELAYS,
    ...NIP90_CONSUMER_RELAYS
  ]));
}

// Relay configuration with PoW requirements (for NostrServiceConfig)
export const RELAY_CONFIGS = [
  { url: "wss://nostr.mom" }, // No PoW required
  { url: "wss://relay.primal.net" }, // No PoW required  
  { url: "wss://offchain.pub" }, // No PoW required
] as const;