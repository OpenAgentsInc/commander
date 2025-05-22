import { generateSecretKey, getPublicKey as getNostrPublicKey } from "nostr-tools/pure";
import { hexToBytes } from "@noble/hashes/utils";

export function generatePrivateKey(): Uint8Array {
  return generateSecretKey();
}

export function getPublicKey(privateKeyHex: string | Uint8Array): string {
  if (typeof privateKeyHex === "string") {
    return getNostrPublicKey(hexToBytes(privateKeyHex));
  }
  return getNostrPublicKey(privateKeyHex);
}

// Helper functions for hex/byte conversion
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
