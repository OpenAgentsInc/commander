import { generatePrivateKey, getPublicKey as getNostrPublicKey } from "nostr-tools/pure";

export function generateSecretKey(): Uint8Array {
  const privateKeyHex = generatePrivateKey();
  return hexToBytes(privateKeyHex);
}

export function getPublicKey(privateKey: Uint8Array): string {
  const privateKeyHex = bytesToHex(privateKey);
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
