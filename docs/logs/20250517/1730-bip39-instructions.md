Okay, I will provide specific instructions to implement a `BIP39Service` Layer via Effect, using test-driven development with Vitest. Tests and typechecks must pass at every phase.

**Standard Commands:**
*   Install dependencies: `pnpm i <dependency-name>`
*   Run tests: `pnpm test`
*   Run type checking: `pnpm t` (alias for `tsc --noEmit`)

**Phase 0: Setup Dependencies**

1.  Ensure you have `@scure/bip39` and `effect` listed as dependencies. Your `package.json` already includes them:
    *   `@scure/bip39: "^1.6.0"`
    *   `effect: "^3.15.1"`
    If not, run `pnpm i @scure/bip39 effect`.

**Phase 1: Define Service Interface, Tag, and Basic Test Structure**

1.  **Create the service file:**
    `src/services/bip39/BIP39Service.ts`

2.  **Add the following content to `src/services/bip39/BIP39Service.ts`:**
    ```typescript
    import { Effect, Context, Data } from "effect";
    import * as bip39 from "@scure/bip39";
    import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english";

    // --- Custom Errors ---
    export class GenerateMnemonicError extends Data.TaggedError("GenerateMnemonicError")<{
      readonly cause: unknown;
      readonly message: string;
    }> {}

    export class ValidateMnemonicError extends Data.TaggedError("ValidateMnemonicError")<{
      readonly cause: unknown;
      readonly message: string;
    }> {}

    export class MnemonicToSeedError extends Data.TaggedError("MnemonicToSeedError")<{
      readonly cause: unknown;
      readonly message: string;
    }> {}

    // --- Service Interface ---
    export interface BIP39Service {
      generateMnemonic(options?: {
        strength?: 128 | 160 | 192 | 224 | 256;
        wordlist?: readonly string[];
      }): Effect.Effect<string, GenerateMnemonicError>;

      validateMnemonic(
        mnemonic: string,
        wordlist?: readonly string[]
      ): Effect.Effect<boolean, ValidateMnemonicError>;

      mnemonicToSeed(
        mnemonic: string,
        passphrase?: string
      ): Effect.Effect<Uint8Array, MnemonicToSeedError>;
    }

    // --- Service Tag ---
    export const BIP39ServiceTag = Context.GenericTag<BIP39Service>("BIP39Service");

    // --- Live Implementation (to be completed in subsequent phases) ---
    export const BIP39ServiceLive = Effect.sync((): BIP39Service => {
      // Implementation will be filled in phase by phase
      // For now, provide dummy implementations to satisfy the interface for type checking
      return {
        generateMnemonic: (options) => Effect.die(new GenerateMnemonicError({ message: "generateMnemonic not implemented", cause: "NotImplemented" })),
        validateMnemonic: (mnemonic, wordlist) => Effect.die(new ValidateMnemonicError({ message: "validateMnemonic not implemented", cause: "NotImplemented" })),
        mnemonicToSeed: (mnemonic, passphrase) => Effect.die(new MnemonicToSeedError({ message: "mnemonicToSeed not implemented", cause: "NotImplemented" })),
      };
    });

    // --- Live Layer (to be updated) ---
    export const BIP39LiveLayer = Layer.effect(BIP39ServiceTag, BIP39ServiceLive);

    ```

3.  **Create the test file directory:**
    `src/tests/unit/services/bip39/`

4.  **Create the test file:**
    `src/tests/unit/services/bip39/BIP39Service.test.ts`

5.  **Add the following content to `src/tests/unit/services/bip39/BIP39Service.test.ts`:**
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { Effect, Layer, Exit } from 'effect';
    import {
      BIP39ServiceTag,
      BIP39LiveLayer,
      type BIP39Service,
      GenerateMnemonicError,
      ValidateMnemonicError,
      MnemonicToSeedError
    } from '@/services/bip39/BIP39Service'; // Using path alias
    import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english";
    import * as bip39 from "@scure/bip39"; // For test vector constants if needed

    describe('BIP39Service', () => {
      it('BIP39ServiceTag should be defined', () => {
        expect(BIP39ServiceTag).toBeDefined();
      });

      it('BIP39LiveLayer should provide the service', async () => {
        const program = Effect.service(BIP39ServiceTag);
        const runnable = Effect.provide(program, BIP39LiveLayer);
        const exit = await Effect.runPromiseExit(runnable);

        // At this point, the dummy implementations will cause a die.
        // We expect the service to be constructible.
        // We'll test methods individually. Here, we just check if the layer can be built.
        // If BIP39ServiceLive is a direct object, Exit.isSuccess(exit) would be true.
        // Since it's Effect.sync(...), it will execute and return the service.
        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          expect(exit.value).toBeDefined();
        }
      });
    });
    ```

6.  **Run tests and type checks:**
    *   `pnpm test` (The tests should pass, showing the tag and layer are constructible)
    *   `pnpm t` (Should pass)

**Phase 2: Implement and Test `generateMnemonic`**

1.  **Update `src/services/bip39/BIP39Service.ts`:**
    Modify the `BIP39ServiceLive` implementation for `generateMnemonic`. Replace the dummy with the actual implementation.
    ```typescript
    // ... (imports and error definitions remain the same) ...

    // --- Service Interface (remains the same) ---
    // ...

    // --- Service Tag (remains the same) ---
    // ...

    // --- Live Implementation ---
    export const BIP39ServiceLiveImpl: BIP39Service = {
      generateMnemonic: (options) =>
        Effect.try({
          try: () => bip39.generateMnemonic(options?.wordlist ?? englishWordlist, options?.strength ?? 128),
          catch: (unknownError) => new GenerateMnemonicError({ cause: unknownError, message: "Failed to generate mnemonic" })
        }),

      // Dummy implementations for other methods for now
      validateMnemonic: (mnemonic, wordlist) => Effect.die(new ValidateMnemonicError({ message: "validateMnemonic not implemented", cause: "NotImplemented" })),
      mnemonicToSeed: (mnemonic, passphrase) => Effect.die(new MnemonicToSeedError({ message: "mnemonicToSeed not implemented", cause: "NotImplemented" })),
    };

    // --- Live Layer ---
    export const BIP39LiveLayer = Layer.succeed(BIP39ServiceTag, BIP39ServiceLiveImpl);
    ```

2.  **Add tests for `generateMnemonic` to `src/tests/unit/services/bip39/BIP39Service.test.ts`:**
    Inside the `describe('BIP39Service', ...)` block, add:
    ```typescript
    // ... (existing tests for tag and layer) ...

    describe('generateMnemonic', () => {
      const getService = Effect.provide(Effect.service(BIP39ServiceTag), BIP39LiveLayer);

      it('should generate a 12-word mnemonic by default', async () => {
        const program = Effect.flatMap(getService, (service) => service.generateMnemonic());
        const mnemonic = await Effect.runPromise(program);
        expect(typeof mnemonic).toBe('string');
        expect(mnemonic.split(' ')).toHaveLength(12);
      });

      it('should generate a 24-word mnemonic when strength is 256', async () => {
        const program = Effect.flatMap(getService, (service) =>
          service.generateMnemonic({ strength: 256 })
        );
        const mnemonic = await Effect.runPromise(program);
        expect(mnemonic.split(' ')).toHaveLength(24);
      });

      it('should fail with GenerateMnemonicError for invalid strength', async () => {
        const program = Effect.flatMap(getService, (service) =>
          // @ts-expect-error Testing invalid strength
          service.generateMnemonic({ strength: 100 })
        );
        const exit = await Effect.runPromiseExit(program);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Exit.causeOption(exit).pipe(Option.map((c) => Cause.failureOption(c))).pipe(Option.flatten).pipe(Option.getOrThrow)).toBeInstanceOf(GenerateMnemonicError);
        }
      });
    });
    ```

3.  **Run tests and type checks:**
    *   `pnpm test` (All tests should pass)
    *   `pnpm t` (Should pass)

**Phase 3: Implement and Test `validateMnemonic`**

1.  **Update `src/services/bip39/BIP39Service.ts`:**
    Modify `BIP39ServiceLiveImpl` to implement `validateMnemonic`.
    ```typescript
    // ... (imports, errors, interface, tag remain the same) ...

    // --- Live Implementation ---
    export const BIP39ServiceLiveImpl: BIP39Service = {
      generateMnemonic: (options) => // (Implementation from Phase 2)
        Effect.try({
          try: () => bip39.generateMnemonic(options?.wordlist ?? englishWordlist, options?.strength ?? 128),
          catch: (unknownError) => new GenerateMnemonicError({ cause: unknownError, message: "Failed to generate mnemonic" })
        }),

      validateMnemonic: (mnemonic, wordlist) =>
        Effect.try({
          try: () => bip39.validateMnemonic(mnemonic, wordlist ?? englishWordlist),
          // bip39.validateMnemonic can throw if wordlist is invalid array or mnemonic is not string.
          // It returns false for invalid mnemonics otherwise.
          catch: (unknownError) => new ValidateMnemonicError({ cause: unknownError, message: "Failed to validate mnemonic (invalid input)"})
        }),

      // Dummy implementation for mnemonicToSeed
      mnemonicToSeed: (mnemonic, passphrase) => Effect.die(new MnemonicToSeedError({ message: "mnemonicToSeed not implemented", cause: "NotImplemented" })),
    };

    // --- Live Layer (remains the same) ---
    export const BIP39LiveLayer = Layer.succeed(BIP39ServiceTag, BIP39ServiceLiveImpl);
    ```

2.  **Add tests for `validateMnemonic` to `src/tests/unit/services/bip39/BIP39Service.test.ts`:**
    ```typescript
    // ... (describe('generateMnemonic') block) ...

    describe('validateMnemonic', () => {
      const getService = Effect.provide(Effect.service(BIP39ServiceTag), BIP39LiveLayer);

      it('should return true for a valid mnemonic', async () => {
        // Generate a valid mnemonic first to test against
        const genProgram = Effect.flatMap(getService, (service) => service.generateMnemonic());
        const validMnemonic = await Effect.runPromise(genProgram);

        const validateProgram = Effect.flatMap(getService, (service) =>
          service.validateMnemonic(validMnemonic)
        );
        const isValid = await Effect.runPromise(validateProgram);
        expect(isValid).toBe(true);
      });

      it('should return false for an invalid mnemonic (incorrect word)', async () => {
        const invalidMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon unknownword";
        const program = Effect.flatMap(getService, (service) =>
          service.validateMnemonic(invalidMnemonic)
        );
        const isValid = await Effect.runPromise(program);
        expect(isValid).toBe(false);
      });

      it('should return false for an invalid mnemonic (wrong checksum)', async () => {
        // A mnemonic with correct words but likely wrong checksum
        const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon"; // 12 words, all same
        const program = Effect.flatMap(getService, (service) =>
          service.validateMnemonic(mnemonic)
        );
        const isValid = await Effect.runPromise(program);
        expect(isValid).toBe(false);
      });

      it('should return false for mnemonic with incorrect word count', async () => {
        const mnemonic = "abandon abandon abandon"; // Too short
        const program = Effect.flatMap(getService, (service) =>
          service.validateMnemonic(mnemonic)
        );
        const isValid = await Effect.runPromise(program);
        expect(isValid).toBe(false);
      });

      it('should fail with ValidateMnemonicError if mnemonic is not a string', async () => {
        const program = Effect.flatMap(getService, (service) =>
          // @ts-expect-error Testing invalid input type
          service.validateMnemonic(12345)
        );
        const exit = await Effect.runPromiseExit(program);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Exit.causeOption(exit).pipe(Option.map((c) => Cause.failureOption(c))).pipe(Option.flatten).pipe(Option.getOrThrow)).toBeInstanceOf(ValidateMnemonicError);
        }
      });
    });
    ```

3.  **Run tests and type checks:**
    *   `pnpm test`
    *   `pnpm t`

**Phase 4: Implement and Test `mnemonicToSeed`**

1.  **Update `src/services/bip39/BIP39Service.ts`:**
    Modify `BIP39ServiceLiveImpl` to implement `mnemonicToSeed`.
    ```typescript
    // ... (imports, errors, interface, tag remain the same) ...

    // --- Live Implementation ---
    export const BIP39ServiceLiveImpl: BIP39Service = {
      generateMnemonic: (options) => // (Implementation from Phase 2)
        Effect.try({
          try: () => bip39.generateMnemonic(options?.wordlist ?? englishWordlist, options?.strength ?? 128),
          catch: (unknownError) => new GenerateMnemonicError({ cause: unknownError, message: "Failed to generate mnemonic" })
        }),

      validateMnemonic: (mnemonic, wordlist) => // (Implementation from Phase 3)
        Effect.try({
          try: () => bip39.validateMnemonic(mnemonic, wordlist ?? englishWordlist),
          catch: (unknownError) => new ValidateMnemonicError({ cause: unknownError, message: "Failed to validate mnemonic (invalid input)"})
        }),

      mnemonicToSeed: (mnemonic, passphrase) =>
        Effect.tryPromise({
          try: () => bip39.mnemonicToSeed(mnemonic, passphrase), // Using async version
          catch: (unknownError) => new MnemonicToSeedError({ cause: unknownError, message: "Failed to convert mnemonic to seed" })
        }),
    };

    // --- Live Layer (remains the same) ---
    export const BIP39LiveLayer = Layer.succeed(BIP39ServiceTag, BIP39ServiceLiveImpl);
    ```

2.  **Add tests for `mnemonicToSeed` to `src/tests/unit/services/bip39/BIP39Service.test.ts`:**
    You'll need `Buffer` for hex conversions.
    ```typescript
    // At the top of the test file, if not already present
    import { Buffer } from 'buffer'; // Node.js Buffer

    // ... (describe('validateMnemonic') block) ...

    describe('mnemonicToSeed', () => {
      const getService = Effect.provide(Effect.service(BIP39ServiceTag), BIP39LiveLayer);

      it('should derive a 64-byte seed from a valid mnemonic', async () => {
        const validMnemonic = await Effect.runPromise(
          Effect.flatMap(getService, (service) => service.generateMnemonic())
        );

        const program = Effect.flatMap(getService, (service) =>
          service.mnemonicToSeed(validMnemonic)
        );
        const seed = await Effect.runPromise(program);
        expect(seed).toBeInstanceOf(Uint8Array);
        expect(seed.length).toBe(64);
      });

      it('should produce the official BIP39 test vector seed', async () => {
        // Test Vector 1 from BIP39
        const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        const passphrase = "TREZOR";
        const expectedSeedHex = "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04";

        const program = Effect.flatMap(getService, (service) =>
          service.mnemonicToSeed(mnemonic, passphrase)
        );
        const seed = await Effect.runPromise(program);
        expect(Buffer.from(seed).toString('hex')).toBe(expectedSeedHex);
      });

      it('should fail with MnemonicToSeedError for an invalid mnemonic', async () => {
        const invalidMnemonic = "this is not a valid mnemonic obviously";
        const program = Effect.flatMap(getService, (service) =>
          service.mnemonicToSeed(invalidMnemonic)
        );
        const exit = await Effect.runPromiseExit(program);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Exit.causeOption(exit).pipe(Option.map((c) => Cause.failureOption(c))).pipe(Option.flatten).pipe(Option.getOrThrow)).toBeInstanceOf(MnemonicToSeedError);
        }
      });
    });
    ```

3.  **Run tests and type checks:**
    *   `pnpm test`
    *   `pnpm t`

**Phase 5: Final Review and Refinements**

1.  **Review `src/services/bip39/BIP39Service.ts` and `src/tests/unit/services/bip39/BIP39Service.test.ts`** for completeness, correctness, and adherence to Effect idioms.
2.  Ensure all exports are correct.
3.  Consider adding an `index.ts` in `src/services/bip39/` if you plan to add more related services or types for this module:
    **Create `src/services/bip39/index.ts`:**
    ```typescript
    export * from './BIP39Service';
    ```
4.  Run `pnpm test` and `pnpm t` one last time to ensure everything is clean.

This completes the implementation of the `BIP39Service` Layer via Effect with TDD.Okay, agent, let's implement the `BIP39Service` layer using Effect. Follow these instructions phase by phase. Ensure tests and type checks pass after each phase.

**Standard Commands:**
*   Install dependencies: `pnpm i <dependency-name>`
*   Run tests: `pnpm test`
*   Run type checking: `pnpm t` (this is an alias for `tsc --noEmit` in your `package.json`)

---

**Phase 0: Setup Dependencies**

1.  Verify that `@scure/bip39` and `effect` are in your `package.json` dependencies. They should already be there. If for some reason they are missing, run:
    ```bash
    pnpm i @scure/bip39 effect
    ```
    *Note: `@noble/hashes` is a dependency of `@scure/bip39` and should be handled automatically by pnpm.*

---

**Phase 1: Define Service Interface, Tag, and Basic Test Structure**

1.  **Create the service file:**
    Create the directory `src/services/bip39/` if it doesn't exist.
    Then, create the file `src/services/bip39/BIP39Service.ts`.

2.  **Add the following content to `src/services/bip39/BIP39Service.ts`:**
    ```typescript
    import { Effect, Context, Data, Layer } from "effect";
    import * as bip39 from "@scure/bip39";
    import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english";

    // --- Custom Errors ---
    export class GenerateMnemonicError extends Data.TaggedError("GenerateMnemonicError")<{
      readonly cause: unknown;
      readonly message: string;
    }> {}

    export class ValidateMnemonicError extends Data.TaggedError("ValidateMnemonicError")<{
      readonly cause: unknown;
      readonly message: string;
    }> {}

    export class MnemonicToSeedError extends Data.TaggedError("MnemonicToSeedError")<{
      readonly cause: unknown;
      readonly message: string;
    }> {}

    // --- Service Interface ---
    export interface BIP39Service {
      generateMnemonic(options?: {
        strength?: 128 | 160 | 192 | 224 | 256;
        wordlist?: readonly string[];
      }): Effect.Effect<string, GenerateMnemonicError>;

      validateMnemonic(
        mnemonic: string,
        wordlist?: readonly string[]
      ): Effect.Effect<boolean, ValidateMnemonicError>;

      mnemonicToSeed(
        mnemonic: string,
        passphrase?: string
      ): Effect.Effect<Uint8Array, MnemonicToSeedError>;
    }

    // --- Service Tag ---
    export const BIP39ServiceTag = Context.GenericTag<BIP39Service>("BIP39Service");

    // --- Live Implementation (dummy for now) ---
    const BIP39ServiceLiveImpl_DUMMY: BIP39Service = {
      generateMnemonic: (_options?: {
        strength?: 128 | 160 | 192 | 224 | 256;
        wordlist?: readonly string[];
      }) => Effect.die(new GenerateMnemonicError({ message: "generateMnemonic not implemented", cause: "NotImplemented" })),
      validateMnemonic: (_mnemonic: string, _wordlist?: readonly string[]) =>
        Effect.die(new ValidateMnemonicError({ message: "validateMnemonic not implemented", cause: "NotImplemented" })),
      mnemonicToSeed: (_mnemonic: string, _passphrase?: string) =>
        Effect.die(new MnemonicToSeedError({ message: "mnemonicToSeed not implemented", cause: "NotImplemented" })),
    };

    // --- Live Layer (using dummy for now) ---
    export const BIP39LiveLayer = Layer.succeed(BIP39ServiceTag, BIP39ServiceLiveImpl_DUMMY);
    ```

3.  **Create the test file directory:**
    Ensure the directory `src/tests/unit/services/bip39/` exists. Create it if it doesn't.

4.  **Create the test file:**
    `src/tests/unit/services/bip39/BIP39Service.test.ts`

5.  **Add the following content to `src/tests/unit/services/bip39/BIP39Service.test.ts`:**
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { Effect, Layer, Exit, Cause, Option } from 'effect';
    import {
      BIP39ServiceTag,
      BIP39LiveLayer,
      type BIP39Service,
      GenerateMnemonicError, // Import error type
      ValidateMnemonicError, // Import error type
      MnemonicToSeedError    // Import error type
    } from '@/services/bip39/BIP39Service'; // Using path alias
    // Import wordlist if needed for specific tests later
    // import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english";
    // import * as bip39 from "@scure/bip39"; // For test vector constants if needed

    describe('BIP39Service', () => {
      it('BIP39ServiceTag should be defined', () => {
        expect(BIP39ServiceTag).toBeDefined();
      });

      it('BIP39LiveLayer should provide the service', async () => {
        const program = Effect.service(BIP39ServiceTag);
        const runnable = Effect.provide(program, BIP39LiveLayer);
        const exit = await Effect.runPromiseExit(runnable);

        expect(Exit.isSuccess(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
          expect(exit.value).toBeDefined();
          // Check if dummy methods exist, they will die if called
          expect(exit.value.generateMnemonic).toBeTypeOf('function');
          expect(exit.value.validateMnemonic).toBeTypeOf('function');
          expect(exit.value.mnemonicToSeed).toBeTypeOf('function');
        }
      });
    });
    ```

6.  **Run tests and type checks:**
    *   Run `pnpm test`. The tests should pass.
    *   Run `pnpm t`. This should also pass.

---

**Phase 2: Implement and Test `generateMnemonic`**

1.  **Update `src/services/bip39/BIP39Service.ts`:**
    Replace `BIP39ServiceLiveImpl_DUMMY` and `BIP39LiveLayer` with the actual implementation for `generateMnemonic`.
    ```typescript
    // ... (imports, errors, interface, tag remain the same) ...

    // --- Live Implementation ---
    export const BIP39ServiceLiveImpl: BIP39Service = {
      generateMnemonic: (options) =>
        Effect.try({
          try: () => bip39.generateMnemonic(
            // Ensure readonly string[] is cast to string[] if library expects mutable
            (options?.wordlist as string[] | undefined) ?? englishWordlist,
            options?.strength ?? 128
          ),
          catch: (unknownError) => new GenerateMnemonicError({ cause: unknownError, message: "Failed to generate mnemonic" })
        }),

      // Dummy implementations for other methods
      validateMnemonic: (_mnemonic: string, _wordlist?: readonly string[]) =>
        Effect.die(new ValidateMnemonicError({ message: "validateMnemonic not implemented", cause: "NotImplemented" })),
      mnemonicToSeed: (_mnemonic: string, _passphrase?: string) =>
        Effect.die(new MnemonicToSeedError({ message: "mnemonicToSeed not implemented", cause: "NotImplemented" })),
    };

    // --- Live Layer ---
    export const BIP39LiveLayer = Layer.succeed(BIP39ServiceTag, BIP39ServiceLiveImpl);
    ```

2.  **Add tests for `generateMnemonic` to `src/tests/unit/services/bip39/BIP39Service.test.ts`:**
    Inside the `describe('BIP39Service', ...)` block, add a new nested `describe` block:
    ```typescript
    // ... (existing tests for tag and layer) ...

    describe('generateMnemonic', () => {
      const getServiceEffect = Effect.service(BIP39ServiceTag);

      it('should generate a 12-word mnemonic by default', async () => {
        const program = Effect.flatMap(getServiceEffect, (service) => service.generateMnemonic());
        const mnemonic = await Effect.runPromise(Effect.provide(program, BIP39LiveLayer));
        expect(typeof mnemonic).toBe('string');
        expect(mnemonic.split(' ')).toHaveLength(12);
      });

      it('should generate a 24-word mnemonic when strength is 256', async () => {
        const program = Effect.flatMap(getServiceEffect, (service) =>
          service.generateMnemonic({ strength: 256 })
        );
        const mnemonic = await Effect.runPromise(Effect.provide(program, BIP39LiveLayer));
        expect(mnemonic.split(' ')).toHaveLength(24);
      });

      it('should fail with GenerateMnemonicError for invalid strength (e.g., 100)', async () => {
        const program = Effect.flatMap(getServiceEffect, (service) =>
          // @ts-expect-error Testing invalid strength not in the defined union type
          service.generateMnemonic({ strength: 100 })
        );
        const exit = await Effect.runPromiseExit(Effect.provide(program, BIP39LiveLayer));
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBeInstanceOf(GenerateMnemonicError);
          expect(error.message).toBe("Failed to generate mnemonic");
        }
      });
    });
    ```

3.  **Run tests and type checks:**
    *   `pnpm test` (All tests should pass)
    *   `pnpm t` (Should pass)

---

**Phase 3: Implement and Test `validateMnemonic`**

1.  **Update `src/services/bip39/BIP39Service.ts`:**
    Modify `BIP39ServiceLiveImpl` to implement `validateMnemonic`.
    ```typescript
    // ... (imports, errors, interface, tag, generateMnemonic impl remain the same) ...

    export const BIP39ServiceLiveImpl: BIP39Service = {
      generateMnemonic: (options) => // (Implementation from Phase 2)
        Effect.try({
          try: () => bip39.generateMnemonic(
            (options?.wordlist as string[] | undefined) ?? englishWordlist,
            options?.strength ?? 128
          ),
          catch: (unknownError) => new GenerateMnemonicError({ cause: unknownError, message: "Failed to generate mnemonic" })
        }),

      validateMnemonic: (mnemonic, wordlist) =>
        Effect.try({
          try: () => bip39.validateMnemonic(
            mnemonic,
            (wordlist as string[] | undefined) ?? englishWordlist
          ),
          catch: (unknownError) => new ValidateMnemonicError({ cause: unknownError, message: "Failed to validate mnemonic (input error)"})
        }),

      // Dummy implementation for mnemonicToSeed
      mnemonicToSeed: (_mnemonic: string, _passphrase?: string) =>
        Effect.die(new MnemonicToSeedError({ message: "mnemonicToSeed not implemented", cause: "NotImplemented" })),
    };

    // --- Live Layer (remains the same) ---
    export const BIP39LiveLayer = Layer.succeed(BIP39ServiceTag, BIP39ServiceLiveImpl);
    ```

2.  **Add tests for `validateMnemonic` to `src/tests/unit/services/bip39/BIP39Service.test.ts`:**
    ```typescript
    // ... (describe('generateMnemonic') block) ...

    describe('validateMnemonic', () => {
      const getServiceEffect = Effect.service(BIP39ServiceTag);
      const runWithLayer = <E, A>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.provide(effect, BIP39LiveLayer));
      const runExitWithLayer = <E, A>(effect: Effect.Effect<A, E>) => Effect.runPromiseExit(Effect.provide(effect, BIP39LiveLayer));


      it('should return true for a valid mnemonic', async () => {
        const service = await runWithLayer(getServiceEffect);
        const validMnemonic = await Effect.runPromise(service.generateMnemonic());

        const isValid = await Effect.runPromise(service.validateMnemonic(validMnemonic));
        expect(isValid).toBe(true);
      });

      it('should return false for an invalid mnemonic (incorrect word)', async () => {
        const invalidMnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon unknownword";
        const program = Effect.flatMap(getServiceEffect, (service) =>
          service.validateMnemonic(invalidMnemonic)
        );
        const isValid = await runWithLayer(program);
        expect(isValid).toBe(false);
      });

      it('should return false for an invalid mnemonic (wrong checksum based on word choice)', async () => {
        const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon"; // 12 identical words, very unlikely to be valid
        const program = Effect.flatMap(getServiceEffect, (service) =>
          service.validateMnemonic(mnemonic)
        );
        const isValid = await runWithLayer(program);
        expect(isValid).toBe(false);
      });

      it('should return false for mnemonic with incorrect word count', async () => {
        const mnemonic = "abandon abandon abandon"; // Too short
        const program = Effect.flatMap(getServiceEffect, (service) =>
          service.validateMnemonic(mnemonic)
        );
        const isValid = await runWithLayer(program);
        expect(isValid).toBe(false);
      });

      it('should fail with ValidateMnemonicError if mnemonic is not a string', async () => {
        const program = Effect.flatMap(getServiceEffect, (service) =>
          // @ts-expect-error Testing invalid input type
          service.validateMnemonic(12345)
        );
        const exit = await runExitWithLayer(program);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBeInstanceOf(ValidateMnemonicError);
          expect(error.message).toBe("Failed to validate mnemonic (input error)");
        }
      });
    });
    ```

3.  **Run tests and type checks:**
    *   `pnpm test`
    *   `pnpm t`

---

**Phase 4: Implement and Test `mnemonicToSeed`**

1.  **Update `src/services/bip39/BIP39Service.ts`:**
    Modify `BIP39ServiceLiveImpl` to implement `mnemonicToSeed`.
    ```typescript
    // ... (imports, errors, interface, tag, generateMnemonic, validateMnemonic impls remain the same) ...

    export const BIP39ServiceLiveImpl: BIP39Service = {
      generateMnemonic: (options) => // (Implementation from Phase 2)
        Effect.try({
          try: () => bip39.generateMnemonic(
            (options?.wordlist as string[] | undefined) ?? englishWordlist,
            options?.strength ?? 128
          ),
          catch: (unknownError) => new GenerateMnemonicError({ cause: unknownError, message: "Failed to generate mnemonic" })
        }),

      validateMnemonic: (mnemonic, wordlist) => // (Implementation from Phase 3)
        Effect.try({
          try: () => bip39.validateMnemonic(
            mnemonic,
            (wordlist as string[] | undefined) ?? englishWordlist
          ),
          catch: (unknownError) => new ValidateMnemonicError({ cause: unknownError, message: "Failed to validate mnemonic (input error)"})
        }),

      mnemonicToSeed: (mnemonic, passphrase) =>
        Effect.tryPromise({
          try: () => bip39.mnemonicToSeed(mnemonic, passphrase), // Using async version
          catch: (unknownError) => new MnemonicToSeedError({ cause: unknownError, message: "Failed to convert mnemonic to seed" })
        }),
    };

    // --- Live Layer (remains the same) ---
    export const BIP39LiveLayer = Layer.succeed(BIP39ServiceTag, BIP39ServiceLiveImpl);
    ```

2.  **Add tests for `mnemonicToSeed` to `src/tests/unit/services/bip39/BIP39Service.test.ts`:**
    Import `Buffer` at the top of the test file: `import { Buffer } from 'buffer';`
    ```typescript
    // Add Buffer import if not already present
    // import { Buffer } from 'buffer';

    // ... (describe('validateMnemonic') block) ...

    describe('mnemonicToSeed', () => {
      const getServiceEffect = Effect.service(BIP39ServiceTag);
      const runWithLayer = <E, A>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.provide(effect, BIP39LiveLayer));
      const runExitWithLayer = <E, A>(effect: Effect.Effect<A, E>) => Effect.runPromiseExit(Effect.provide(effect, BIP39LiveLayer));

      it('should derive a 64-byte seed from a valid mnemonic', async () => {
        const service = await runWithLayer(getServiceEffect);
        const validMnemonic = await Effect.runPromise(service.generateMnemonic());

        const seed = await Effect.runPromise(service.mnemonicToSeed(validMnemonic));
        expect(seed).toBeInstanceOf(Uint8Array);
        expect(seed.length).toBe(64);
      });

      it('should produce the official BIP39 test vector seed (mnemonicToSeed)', async () => {
        // Test Vector 1 from BIP39
        const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        const passphrase = "TREZOR";
        const expectedSeedHex = "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04";

        const program = Effect.flatMap(getServiceEffect, (service) =>
          service.mnemonicToSeed(mnemonic, passphrase)
        );
        const seed = await runWithLayer(program);
        expect(Buffer.from(seed).toString('hex')).toBe(expectedSeedHex);
      });

      it('should fail with MnemonicToSeedError for an invalid mnemonic string format', async () => {
        const invalidMnemonic = "this is not a valid mnemonic obviously"; // wrong words / checksum
        const program = Effect.flatMap(getServiceEffect, (service) =>
          service.mnemonicToSeed(invalidMnemonic)
        );
        const exit = await runExitWithLayer(program);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause).pipe(Option.getOrThrow);
          expect(error).toBeInstanceOf(MnemonicToSeedError);
          expect(error.message).toBe("Failed to convert mnemonic to seed");
        }
      });

      it('should produce a different seed with a passphrase', async () => {
        const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        const programNoPassphrase = Effect.flatMap(getServiceEffect, (service) => service.mnemonicToSeed(mnemonic));
        const programWithPassphrase = Effect.flatMap(getServiceEffect, (service) => service.mnemonicToSeed(mnemonic, "testpass"));

        const [seedNoPassphrase, seedWithPassphrase] = await Effect.runPromise(
          Effect.all([
            Effect.provide(programNoPassphrase, BIP39LiveLayer),
            Effect.provide(programWithPassphrase, BIP39LiveLayer)
          ])
        );

        expect(Buffer.from(seedNoPassphrase).toString('hex')).not.toBe(Buffer.from(seedWithPassphrase).toString('hex'));
        expect(seedWithPassphrase.length).toBe(64);
      });
    });
    ```

3.  **Run tests and type checks:**
    *   `pnpm test` (All tests, including new ones, should pass)
    *   `pnpm t` (Should pass)

---

**Phase 5: Final Review and Module Export**

1.  **Review `src/services/bip39/BIP39Service.ts` and `src/tests/unit/services/bip39/BIP39Service.test.ts`** for clarity, correctness, and adherence to Effect idioms.
    *   Ensure error messages in custom errors are informative.
    *   Ensure all `@ts-expect-error` comments in tests are justified and correctly indicate an intentional type violation for testing purposes.

2.  **Create an `index.ts` for the `bip39` service module for cleaner exports:**
    Create `src/services/bip39/index.ts` with the following content:
    ```typescript
    export * from './BIP39Service';
    ```

3.  **Final check:**
    *   Run `pnpm test` one last time.
    *   Run `pnpm t` one last time.

This completes the implementation of the `BIP39Service`. You now have a well-tested, Effect-based service for BIP39 mnemonic operations.
