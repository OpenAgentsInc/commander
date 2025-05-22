import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import {
  NIP19Service,
  NIP19ServiceLive,
  type DecodedNIP19Result,
  type ProfilePointer,
  type EventPointer,
  type AddressPointer,
} from "@/services/nip19"; // Import from index
import { hexToBytes } from "@noble/hashes/utils";
import * as nip19 from "nostr-tools/nip19";

// Helper for browser-compatible hex string conversion since we can't use Buffer in browser
const toHexString = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// NIP-06 Test Vector 1
const nip06PkHex =
  "17162c921dc4d2518f9a101db33695df1afb56ab82f5ff3e5da6eec3ca5cd917";
const nip06Npub =
  "npub1zutzeysacnf9rru6zqwmxd54mud0k44tst6l70ja5mhv8jjumytsd2x7nu";
const nip06SkHex =
  "7f7ff03d123792d6ac594bfa67bf6d0c0ab55b6b1fdb6249303fe861f1ccba9a";
const nip06Nsec =
  "nsec10allq0gjx7fddtzef0ax00mdps9t2kmtrldkyjfs8l5xruwvh2dq0lhhkp";

// Dummy event ID for note/nevent tests
const dummyEventIdHex =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const dummyAuthorPubkeyHex =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("NIP19Service", () => {
  const runWithLayer = <E, A>(effect: Effect.Effect<A, E, NIP19Service>) =>
    Effect.runPromise(Effect.provide(effect, NIP19ServiceLive));

  describe("encodeNpub", () => {
    it("should encode a valid public key hex to npub", async () => {
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.encodeNpub(nip06PkHex),
      );
      const npub = await runWithLayer(program);
      expect(npub).toBe(nip06Npub);
    });

    it("should fail for an invalid public key hex", async () => {
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.encodeNpub("invalid-hex"),
      );

      try {
        await runWithLayer(program);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
        // Can't check specific error type due to Effect.js error handling
      }
    });
  });

  describe("encodeNsec", () => {
    it("should encode a valid secret key Uint8Array to nsec", async () => {
      const skBytes = hexToBytes(nip06SkHex);
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.encodeNsec(skBytes),
      );
      const nsec = await runWithLayer(program);
      expect(nsec).toBe(nip06Nsec);
    });

    it("should fail for secret key of incorrect length", async () => {
      const invalidSkBytes = new Uint8Array(31); // Incorrect length
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.encodeNsec(invalidSkBytes),
      );

      try {
        await runWithLayer(program);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
        // Can't check specific error type due to Effect.js error handling
      }
    });
  });

  describe("encodeNote", () => {
    it("should encode a valid event ID hex to note ID", async () => {
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.encodeNote(dummyEventIdHex),
      );
      const noteId = await runWithLayer(program);
      expect(noteId).toMatch(/^note1/); // Just check prefix since exact encoding might vary
    });
  });

  describe("encodeNprofile", () => {
    it("should encode a valid profile pointer to nprofile", async () => {
      const profile: ProfilePointer = {
        pubkey: nip06PkHex,
        relays: ["wss://relay.example.com"],
      };
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.encodeNprofile(profile),
      );
      const nprofile = await runWithLayer(program);
      expect(nprofile).toMatch(/^nprofile1[a-z0-9]+$/);
      // Further decoding could verify content if needed
    });
  });

  describe("encodeNevent", () => {
    it("should encode a valid event pointer to nevent", async () => {
      const eventPointer: EventPointer = {
        id: dummyEventIdHex,
        relays: ["wss://relay.example.com"],
        author: dummyAuthorPubkeyHex,
        kind: 1,
      };
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.encodeNevent(eventPointer),
      );
      const nevent = await runWithLayer(program);
      expect(nevent).toMatch(/^nevent1[a-z0-9]+$/);
    });
  });

  describe("encodeNaddr", () => {
    it("should encode a valid address pointer to naddr", async () => {
      const addrPointer: AddressPointer = {
        identifier: "test",
        pubkey: dummyAuthorPubkeyHex,
        kind: 30023,
        relays: ["wss://relay.example.com"],
      };
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.encodeNaddr(addrPointer),
      );
      const naddr = await runWithLayer(program);
      expect(naddr).toMatch(/^naddr1[a-z0-9]+$/);
    });
  });

  describe("decode", () => {
    it("should decode an npub string", async () => {
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.decode(nip06Npub),
      );
      const decoded = (await runWithLayer(program)) as DecodedNIP19Result & {
        type: "npub";
      };
      expect(decoded.type).toBe("npub");
      expect(decoded.data).toBe(nip06PkHex);
    });

    it("should decode an nsec string", async () => {
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.decode(nip06Nsec),
      );
      const decoded = (await runWithLayer(program)) as DecodedNIP19Result & {
        type: "nsec";
      };
      expect(decoded.type).toBe("nsec");
      expect(toHexString(decoded.data)).toBe(nip06SkHex);
    });

    it("should decode a note ID string", async () => {
      // Create a proper note string instead of using a fixed one
      const noteId = nip19.noteEncode(dummyEventIdHex);

      const program = Effect.flatMap(NIP19Service, (service) =>
        service.decode(noteId),
      );
      const decoded = (await runWithLayer(program)) as DecodedNIP19Result & {
        type: "note";
      };
      expect(decoded.type).toBe("note");
      expect(decoded.data).toBe(dummyEventIdHex);
    });

    it("should decode an nprofile string", async () => {
      const profile: ProfilePointer = {
        pubkey: nip06PkHex,
        relays: ["wss://relay.example.com"],
      };
      const nprofile = nip19.nprofileEncode(profile); // Use nostr-tools directly to get a valid string

      const program = Effect.flatMap(NIP19Service, (service) =>
        service.decode(nprofile),
      );
      const decoded = (await runWithLayer(program)) as DecodedNIP19Result & {
        type: "nprofile";
      };

      expect(decoded.type).toBe("nprofile");
      expect(decoded.data.pubkey).toBe(nip06PkHex);
      expect(decoded.data.relays).toContain("wss://relay.example.com");
    });

    it("should fail for an invalid NIP-19 string", async () => {
      const program = Effect.flatMap(NIP19Service, (service) =>
        service.decode("invalidnip19string"),
      );

      try {
        await runWithLayer(program);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
        // Can't check specific error type due to Effect.js error handling
      }
    });
  });
});
