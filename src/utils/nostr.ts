import { generateSecretKey as generateSecretKeyNostrTools, getPublicKey as getNostrPublicKey } from "nostr-tools/pure";
import { hexToBytes as nobleHexToBytes, bytesToHex as nobleBytesToHex } from "@noble/hashes/utils";

export function generateSecretKey(): Uint8Array {
  return generateSecretKeyNostrTools();
}

export function getPublicKey(privateKey: Uint8Array): string {
  return getNostrPublicKey(privateKey);
}

// Helper functions for hex/byte conversion if needed elsewhere in the codebase
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(byte)) {
      throw new Error(`Invalid hex character at position ${i} in string "${hex}"`);
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Export the conversion utilities in case they're needed elsewhere
export { hexToBytes, bytesToHex };
