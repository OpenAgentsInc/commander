import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { NIP13Service, NIP13ServiceImpl } from "@/services/nip13";

describe("NIP13Service", () => {
  const TestLayer = Layer.succeed(NIP13Service, NIP13ServiceImpl);

  describe("calculateDifficulty", () => {
    it("should calculate difficulty correctly for known values", async () => {
      const program = Effect.gen(function* (_) {
        const service = yield* _(NIP13Service);
        
        // Test case from NIP-13: 36 leading zero bits
        const difficulty1 = service.calculateDifficulty("000000000e9d97a1ab09fc381030b346cdd7a142ad57e6df0b46dc9bef6c7e2d");
        expect(difficulty1).toBe(36);
        
        // Test case: 10 leading zero bits (002f...)
        const difficulty2 = service.calculateDifficulty("002f1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab");
        expect(difficulty2).toBe(10);
        
        // Test case: No leading zeros
        const difficulty3 = service.calculateDifficulty("abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");
        expect(difficulty3).toBe(0);
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });
  });

  describe("validatePoW", () => {
    it("should validate PoW correctly", async () => {
      const program = Effect.gen(function* (_) {
        const service = yield* _(NIP13Service);
        
        const event = {
          id: "000000000e9d97a1ab09fc381030b346cdd7a142ad57e6df0b46dc9bef6c7e2d", // 36 bits
          kind: 1,
          tags: [["nonce", "776797", "20"]],
          content: "test",
          created_at: 1651794653,
          pubkey: "a48380f4cfcc1ad5378294fcac36439770f9c878dd880ffa94bb74ea54a6f243",
          sig: "284622fc0a3f4f1303455d5175f7ba962a3300d136085b9566801bc2e0699de0c7e31e44c81fb40ad9049173742e904713c3594a1da0fc5d2382a25c11aba977"
        };
        
        // Should pass with 20-bit requirement
        expect(service.validatePoW(event, 20)).toBe(true);
        
        // Should pass with 36-bit requirement
        expect(service.validatePoW(event, 36)).toBe(true);
        
        // Should fail with 40-bit requirement
        expect(service.validatePoW(event, 40)).toBe(false);
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });

    it("should reject events with insufficient committed target", async () => {
      const program = Effect.gen(function* (_) {
        const service = yield* _(NIP13Service);
        
        const event = {
          id: "000000000e9d97a1ab09fc381030b346cdd7a142ad57e6df0b46dc9bef6c7e2d", // 36 bits
          kind: 1,
          tags: [["nonce", "776797", "10"]], // Committed to only 10 bits
          content: "test",
          created_at: 1651794653,
          pubkey: "a48380f4cfcc1ad5378294fcac36439770f9c878dd880ffa94bb74ea54a6f243",
          sig: "284622fc0a3f4f1303455d5175f7ba962a3300d136085b9566801bc2e0699de0c7e31e44c81fb40ad9049173742e904713c3594a1da0fc5d2382a25c11aba977"
        };
        
        // Should fail because committed target (10) < required (20)
        expect(service.validatePoW(event, 20)).toBe(false);
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });
  });

  describe("addNonceTag", () => {
    it("should add nonce tag correctly", async () => {
      const program = Effect.gen(function* (_) {
        const service = yield* _(NIP13Service);
        
        const event = {
          id: "test",
          kind: 1,
          tags: [["other", "tag"]],
          content: "test",
          created_at: 1651794653,
          pubkey: "test",
          sig: "test"
        };
        
        const result = service.addNonceTag(event, "12345", 20);
        
        expect(result.tags).toEqual([
          ["other", "tag"],
          ["nonce", "12345", "20"]
        ]);
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });

    it("should replace existing nonce tag", async () => {
      const program = Effect.gen(function* (_) {
        const service = yield* _(NIP13Service);
        
        const event = {
          id: "test",
          kind: 1,
          tags: [["nonce", "old", "15"], ["other", "tag"]],
          content: "test",
          created_at: 1651794653,
          pubkey: "test",
          sig: "test"
        };
        
        const result = service.addNonceTag(event, "12345", 20);
        
        expect(result.tags).toEqual([
          ["other", "tag"],
          ["nonce", "12345", "20"]
        ]);
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });
  });

  describe("mineEvent", () => {
    it("should mine a simple event with low difficulty", async () => {
      const program = Effect.gen(function* (_) {
        const service = yield* _(NIP13Service);
        
        const event = {
          id: "test",
          kind: 1,
          tags: [],
          content: "test mining",
          created_at: Math.floor(Date.now() / 1000),
          pubkey: "a48380f4cfcc1ad5378294fcac36439770f9c878dd880ffa94bb74ea54a6f243",
          sig: "test"
        };
        
        // Mine for 4 bits (should be quick)
        const result = yield* _(service.mineEvent(event, {
          targetDifficulty: 4,
          maxIterations: 100000,
          timeoutMs: 5000
        }));
        
        // Verify the result has the required difficulty
        const actualDifficulty = service.calculateDifficulty(result.id);
        expect(actualDifficulty).toBeGreaterThanOrEqual(4);
        
        // Verify nonce tag was added
        const nonceTag = result.tags.find(tag => tag[0] === "nonce");
        expect(nonceTag).toBeDefined();
        expect(nonceTag![2]).toBe("4"); // Target difficulty
        
        // Verify mining metadata
        expect(result.miningMetadata).toBeDefined();
        expect(result.miningMetadata!.difficulty).toBe(actualDifficulty);
        expect(result.miningMetadata!.iterations).toBeGreaterThan(0);
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    }, 10000); // 10 second timeout

    it("should fail mining with impossible difficulty in time limit", async () => {
      const program = Effect.gen(function* (_) {
        const service = yield* _(NIP13Service);
        
        const event = {
          id: "test",
          kind: 1,
          tags: [],
          content: "test mining",
          created_at: Math.floor(Date.now() / 1000),
          pubkey: "a48380f4cfcc1ad5378294fcac36439770f9c878dd880ffa94bb74ea54a6f243",
          sig: "test"
        };
        
        // Try to mine for 20 bits with very limited iterations
        const result = service.mineEvent(event, {
          targetDifficulty: 20,
          maxIterations: 100, // Very low
          timeoutMs: 100 // Very short
        });
        
        const outcome = yield* _(Effect.either(result));
        expect(outcome._tag).toBe("Left"); // Should fail
      });

      await Effect.runPromise(Effect.provide(program, TestLayer));
    });
  });
});