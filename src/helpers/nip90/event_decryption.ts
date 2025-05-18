import { hexToBytes } from '@noble/hashes/utils';
import { NIP04Service, NIP04DecryptError } from '@/services/nip04';
import { Effect } from 'effect';

/**
 * Decrypts NIP-04 encrypted content.
 * @param ourSkHex - Our secret key (hex string) that was used for the original request (or our identity sk).
 * @param theirPkHex - Their public key (hex string) that authored the encrypted event.
 * @param encryptedContent - The encrypted string from event.content.
 * @returns An Effect resolving to the decrypted plaintext string.
 */
export function decryptNip04Content(
  ourSkHex: string,
  theirPkHex: string,
  encryptedContent: string
): Effect.Effect<string, NIP04DecryptError, NIP04Service> {
  return Effect.gen(function* (_) {
    const nip04Service = yield* _(NIP04Service);
    try {
      const ourSkUint8Array = hexToBytes(ourSkHex);
      return yield* _(nip04Service.decrypt(ourSkUint8Array, theirPkHex, encryptedContent));
    } catch (error) {
      return yield* _(Effect.fail(new NIP04DecryptError({ 
        message: "Failed to convert secret key from hex", 
        cause: error 
      })));
    }
  });
}