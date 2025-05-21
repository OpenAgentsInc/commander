import { finalizeEvent, type EventTemplate } from "nostr-tools/pure";
import type { NostrEvent } from "@/services/nostr";
import { NIP04Service, NIP04EncryptError } from "@/services/nip04";
import { Effect } from "effect";

/**
 * Creates a NIP-90 job request event, with optional NIP-04 encryption.
 *
 * @param requesterSk - Customer's (ephemeral) secret key (Uint8Array)
 * @param targetDvmPkHexForEncryption - Target DVM's public key (hex string) for encryption; if undefined, send unencrypted
 * @param inputs - Array of unencrypted inputs [data, type, relay_hint?, marker?]
 * @param outputMimeType - Expected output MIME type
 * @param bidMillisats - Optional bid amount in millisatoshis
 * @param jobKind - Kind code for the NIP-90 job (5000-5999)
 * @param targetDvmPkHexForPTag - PK for the p-tag; can be different or undefined
 * @param additionalParams - Optional array of unencrypted ['param', 'key', 'value'] tags to be included in encryption
 * @returns An Effect resolving to the finalized NostrEvent
 */
export function createNip90JobRequest(
  requesterSk: Uint8Array,
  targetDvmPkHexForEncryption: string | undefined, // PK for encryption; if undefined, send unencrypted
  inputs: Array<[string, string, string?, string?, string?]>,
  outputMimeType: string = "text/plain",
  bidMillisats?: number,
  jobKind: number = 5100, // Default to Text Generation
  targetDvmPkHexForPTag?: string, // PK for the p-tag; can be different or undefined
  additionalParams?: Array<[string, string, string]>, // e.g., ['param', 'model', 'gpt-4']
): Effect.Effect<NostrEvent, NIP04EncryptError, NIP04Service> {
  // NIP04Service is required for encryption
  return Effect.gen(function* (_) {
    const nip04Service = yield* _(NIP04Service);

    // Prepare the job parameters to encrypt or stringify
    const jobParametersToEncryptOrStringify: Array<[string, ...string[]]> = [
      ...inputs.map(
        (inputParams) =>
          ["i", ...inputParams.filter((p) => p !== undefined)] as [
            string,
            ...string[],
          ],
      ),
    ];

    if (additionalParams) {
      jobParametersToEncryptOrStringify.push(
        ...additionalParams.map(
          (p) => [p[0], p[1], p[2]] as [string, string, string],
        ),
      );
    }

    // Stringify the parameters for encryption or direct content
    const stringifiedParams = JSON.stringify(jobParametersToEncryptOrStringify);
    let eventContent = "";
    const tags: Array<[string, ...string[]]> = [["output", outputMimeType]];

    // Conditional Encryption
    if (
      targetDvmPkHexForEncryption &&
      targetDvmPkHexForEncryption.length === 64
    ) {
      // Valid DVM PK provided for encryption
      eventContent = yield* _(
        nip04Service.encrypt(
          requesterSk,
          targetDvmPkHexForEncryption,
          stringifiedParams,
        ),
      );
      // If encrypted, the p-tag for the encryption target is usually added.
      // If targetDvmPkHexForPTag is also provided and different, that might be an advanced routing scenario.
      // For simplicity, if encrypted, assume the p-tag is for the encryption target.
      tags.push(["p", targetDvmPkHexForEncryption]);
      tags.push(["encrypted"]);
    } else {
      // No valid targetDvmPkHexForEncryption for encryption. Send unencrypted.
      eventContent = stringifiedParams;
      // If a PTag target is specified (even if not for encryption), add it.
      if (targetDvmPkHexForPTag && targetDvmPkHexForPTag.length === 64) {
        tags.push(["p", targetDvmPkHexForPTag]);
      }
      // Consider logging a warning if targetDvmPkHexForEncryption was provided but invalid, leading to unencrypted.
      if (
        targetDvmPkHexForEncryption &&
        targetDvmPkHexForEncryption.length !== 64
      ) {
        console.warn(
          `[NIP90 Helper] Invalid targetDvmPkHexForEncryption ('${targetDvmPkHexForEncryption}'). Sending unencrypted request.`,
        );
        // Optionally, communicate this back via Telemetry or error for stricter handling.
      }
    }

    if (bidMillisats !== undefined && bidMillisats > 0) {
      tags.push(["bid", bidMillisats.toString()]);
    }

    const template: EventTemplate = {
      kind: jobKind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: eventContent,
    };

    return finalizeEvent(template, requesterSk) as NostrEvent;
  });
}
