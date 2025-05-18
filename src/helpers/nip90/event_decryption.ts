import { nip04 } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';

/**
 * Decrypts NIP-04 encrypted content.
 * @param ourSkHex - Our secret key (hex string) that was used for the original request (or our identity sk).
 * @param theirPkHex - Their public key (hex string) that authored the encrypted event.
 * @param encryptedContent - The encrypted string from event.content.
 * @returns A Promise resolving to the decrypted plaintext string.
 */
export async function decryptNip04Content(
  ourSkHex: string,
  theirPkHex: string,
  encryptedContent: string
): Promise<string> {
  try {
    const ourSkUint8Array = hexToBytes(ourSkHex);
    return await nip04.decrypt(ourSkUint8Array, theirPkHex, encryptedContent);
  } catch (error) {
    console.error("NIP-04 Decryption failed:", error);
    throw new Error("Failed to decrypt content."); // Or return a specific error type/message
  }
}