Okay, I will first update the log file `docs/logs/20250521/0659-log.md` to be more thorough, explaining the rationale behind the refactoring and TypeScript fixes. Then, I will provide specific instructions to fix the outstanding TypeScript errors.

**Log Update Instruction:**

- **Enhance `docs/logs/20250521/0659-log.md`:**
  - **Service Layer Refactoring Rationale:** Clearly state _why_ `listPublicNip90Events` was moved from `NostrService` to `NIP90Service` (separation of concerns, NIP-01 core vs. higher-level NIPs). Explain that `NostrService` now uses `createNostrServiceEffect` to correctly inject `TelemetryService` via Effect's context, resolving `this` issues and type errors related to the `R` channel in its methods.
  - **TypeScript Fixes - Detailed Explanations:** For each category of TypeScript fix applied (e.g., Tooltip usage, Fiber polling, missing properties, test mocking patterns), briefly explain the problem and the solution implemented. For example, for `Fiber.isDone`, explain that the API changed and the new correct way is `Option.isSome(Fiber.unsafePoll(fiberInstance))`. For test mocks, explain the problematic pattern and the corrected one.
  - Structure the log clearly with headings for "Service Layer Refactoring" and "TypeScript Error Fixes", then subheadings for specific changes or error categories.

---

**Instructions for Fixing Remaining TypeScript Errors:**

Here are the specific instructions to fix the 18 TypeScript errors:

1.  **`src/services/dvm/Kind5050DVMServiceImpl.ts:663:55` and `756:56` (Fiber.unsafePoll)**

    - **Error:** `Property 'unsafePoll' does not exist on type 'typeof import(".../Fiber")'.`
    - **Cause:** `unsafePoll` is a method on a fiber _instance_, not a static method on the `Fiber` module/namespace.
    - **File:** `src/services/dvm/Kind5050DVMServiceImpl.ts`
    - **Fix:**
      - Change line 663 from:
        `if (!invoiceCheckFiber || Option.isSome(Fiber.unsafePoll(invoiceCheckFiber))) {`
        To:
        `if (!invoiceCheckFiber || Option.isSome(invoiceCheckFiber.unsafePoll())) {`
      - Change line 756 from:
        `if (invoiceCheckFiber && Option.isNone(Fiber.unsafePoll(invoiceCheckFiber))) {`
        To:
        `if (invoiceCheckFiber && Option.isNone(invoiceCheckFiber.unsafePoll())) {`

2.  **`src/tests/unit/services/dvm/Kind5050DVMService.test.ts:5:3` (Kind5050DVMServiceLive not exported)**

    - **Error:** `'"@/services/dvm/Kind5050DVMService"' has no exported member named 'Kind5050DVMServiceLive'.`
    - **Cause:** `Kind5050DVMServiceLive` is exported from `src/services/dvm/index.ts` (which re-exports from `Kind5050DVMServiceImpl.ts`), not directly from `Kind5050DVMService.ts`.
    - **File:** `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`
    - **Fix:** Change the import statement:
      From: `import { Kind5050DVMService, Kind5050DVMServiceLive, ... } from '@/services/dvm/Kind5050DVMService';`
      To: `import { Kind5050DVMService, Kind5050DVMServiceLive, ... } from '@/services/dvm';`

3.  **`src/tests/unit/services/dvm/Kind5050DVMService.test.ts:142:7` (listModels in OllamaService mock)**

    - **Error:** `Object literal may only specify known properties, and 'listModels' does not exist in type 'OllamaService'.`
    - **Cause:** The mock `mockOllamaService` defines `listModels`, but the `OllamaService` interface does not have this method.
    - **File:** `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`
    - **Fix:** Remove the `listModels: vi.fn()...` line from the `mockOllamaService` object definition.

4.  **`src/tests/unit/services/dvm/Kind5050DVMService.test.ts:146:11` (created_at vs created)**

    - **Error:** `Object literal may only specify known properties, but 'created_at' does not exist... Did you mean to write 'created'?`
    - **Cause:** The `OllamaChatCompletionResponseSchema` uses `created: Schema.Number`. The mock uses `created_at`.
    - **File:** `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`
    - **Fix:** In the `mockOllamaService.generateChatCompletion` mock implementation, change `created_at: new Date().toISOString(),` to `created: Math.floor(Date.now() / 1000),`.

5.  **`src/tests/unit/services/dvm/Kind5050DVMService.test.ts:171:7` (getNodeInfo in SparkService mock)**

    - **Error:** `Object literal may only specify known properties, and 'getNodeInfo' does not exist in type 'SparkService'.`
    - **Cause:** The mock `mockSparkService` defines `getNodeInfo`, but the `SparkService` interface does not.
    - **File:** `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`
    - **Fix:** Remove the `getNodeInfo: vi.fn()...` line from the `mockSparkService` object definition.

6.  **`src/tests/unit/services/dvm/Kind5050DVMService.test.ts:177:20` (LightningInvoice structure)**

    - **Error:** Property `invoice` is missing in the mocked structure.
    - **Cause:** The `LightningInvoice` interface expects an object with an `invoice` property, which itself contains fields like `encodedInvoice`. The mock is providing these fields at the top level.
    - **File:** `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`
    - **Fix:** In `mockSparkService.createLightningInvoice`'s mock implementation, wrap the invoice fields within an `invoice: { ... }` object:
      ```typescript
      // Inside mockSparkService.createLightningInvoice mock:
      return Effect.succeed({
        invoice: {
          // Wrap the fields in this 'invoice' object
          encodedInvoice:
            "lnbc10m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w",
          paymentHash:
            "0001020304050607080900010203040506070809000102030405060708090102",
          amountSats: 10, // This field might be part of the CreateLightningInvoiceParams or a derived value
          createdAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          // memo: "Optional memo here" // if needed
        },
      } as LightningInvoice);
      ```

7.  **`src/tests/unit/services/dvm/Kind5050DVMService.test.ts:270:41` and `270:72` (dvmSettingsStore mock)**

    - **Error:** `Cannot find module '@/stores/dvmSettingsStore'` and `Property 'mockImplementation' does not exist...`
    - **Cause:** The test file `Kind5050DVMService.test.ts` already has a `vi.mock("@/stores/dvmSettingsStore", ...)` at the top. The error in the log (`vi.mocked(vi.hoisted(...))`) likely comes from a previous incorrect attempt. The "Cannot find module" might indicate an issue with Vitest's alias resolution for this specific path or a typo.
    - **File:** `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`
    - **Fix:**
      - Ensure the path in `vi.mock("@/stores/dvmSettingsStore", ...)` is exactly correct. It should be `@/stores/dvmSettingsStore`.
      - Verify that `vitest.config.mts` (or `vite.config.ts` if Vitest uses it) has the `@/*` alias correctly configured and that it resolves `src/stores/dvmSettingsStore.ts`.
      - The provided test file already uses:
        ```typescript
        vi.mock("@/stores/dvmSettingsStore", () => ({
          useDVMSettingsStore: {
            getState: () => ({
              getEffectiveConfig: () => defaultKind5050DVMServiceConfig,
              getDerivedPublicKeyHex: () =>
                defaultKind5050DVMServiceConfig.dvmPublicKeyHex,
            }),
          },
        }));
        ```
        This is the correct way to mock the store if the DVM service uses `useDVMSettingsStore.getState()`. Assuming the path alias is the main issue. If the error persists, try `vi.mock("../../../stores/dvmSettingsStore", ...)` with a relative path to rule out alias issues.

8.  **`src/tests/unit/services/dvm/Kind5050DVMService.test.ts:284:27` (Effect R channel)**

    - **Error:** `Type 'unknown' is not assignable to type 'never'.`
    - **Cause:** One or more mocked services in `testLayerWithBadConfig` (or `testLayer`) have methods returning `Effect<..., ..., unknown>` instead of `Effect<..., ..., never>`.
    - **File:** `src/tests/unit/services/dvm/Kind5050DVMService.test.ts`
    - **Fix:** Go through each method in `mockNostrService`, `mockOllamaService`, `mockSparkService`, `mockNip04Service`, `mockTelemetryService`. For every mocked method implementation, ensure it explicitly returns an Effect with `R = never`.
      Example: `publishEvent: vi.fn().mockImplementation(() => Effect.succeed(undefined as void) as Effect.Effect<void, NostrPublishError, never>),`
      Apply this to all mocked service methods within the test file.

9.  **`src/tests/unit/services/nostr/NostrService.test.ts:5:3` (NostrServiceImpl not exported)**

    - **Error:** `'"@/services/nostr"' has no exported member named 'NostrServiceImpl'.`
    - **Cause:** `NostrServiceImpl.ts` exports `createNostrServiceEffect` and `NostrServiceLive`.
    - **File:** `src/tests/unit/services/nostr/NostrService.test.ts`
    - **Fix:**
      - Change the import:
        From: `import { NostrService, NostrServiceImpl, ... } from "@/services/nostr";`
        To: `import { NostrService, NostrServiceLive, DefaultNostrServiceConfigLayer, NostrServiceConfigTag, type NostrServiceConfig } from "@/services/nostr";`
      - Update the `testLayer` setup:
        ```typescript
        // Remove the old testLayer definition if it uses createNostrService directly
        // Define the new testLayer using NostrServiceLive and its dependencies:
        testLayer = Layer.provide(
          NostrServiceLive,
          Layer.merge(
            Layer.succeed(NostrServiceConfigTag, nostrServiceConfig), // nostrServiceConfig defined in beforeEach
            Layer.succeed(TelemetryService, mockTelemetryService), // mockTelemetryService defined in beforeEach
          ),
        );
        ```
      - Update how the `program` gets the service instance:
        ```typescript
        // Example for listEvents test:
        const program = Effect.flatMap(
          NostrService,
          (
            service, // Use NostrService (Tag)
          ) => service.listEvents(filters),
        );
        ```

10. **`src/tests/unit/services/nostr/NostrService.test.ts:109:17` & `122:17` (listPublicNip90Events does not exist)**

    - **Error:** `Property 'listPublicNip90Events' does not exist on type 'NostrService'.`
    - **Cause:** This method was refactored out of `NostrService`.
    - **File:** `src/tests/unit/services/nostr/NostrService.test.ts`
    - **Fix:** Delete the entire `describe('listPublicNip90Events', () => { ... });` block from this test file. These tests are no longer relevant for `NostrService`.

11. **`src/tests/unit/services/nostr/NostrService.test.ts:112:60`, `115:14`, `116:14`, `117:14`, `125:45` (Effect R channel / result unknown)**

    - **These errors are within the deleted `listPublicNip90Events` test block. Removing that block (previous step) will resolve these.** The underlying cause (if it appeared elsewhere) would be the `testLayer` not correctly providing all dependencies, leading to `R=unknown`.

12. **`src/services/nip90/NIP90ServiceImpl.ts:30` & `68` (NIP90ServiceError not found)**

    - **Error:** `Cannot find name 'NIP90ServiceError'.`
    - **Cause:** Missing import.
    - **File:** `src/services/nip90/NIP90ServiceImpl.ts`
    - **Fix:** Add `NIP90ServiceError` to the import from `./NIP90Service`:
      ```typescript
      import {
        NIP90Service,
        // ... other imports ...
        NIP90ServiceError, // Add this
      } from "./NIP90Service";
      ```

13. **`src/tests/unit/components/nip90_feed/Nip90GlobalFeedPane.test.tsx:95` (and similar for `Vi.Mock`)**
    - **Error:** `Cannot find namespace 'Vi'.`
    - **Cause:** The correct type for Vitest mocks is `Mock`, not `Vi.Mock`.
    - **File:** `src/tests/unit/components/nip90_feed/Nip90GlobalFeedPane.test.tsx`
    - **Fix:**
      - Add `import type { Mock } from 'vitest';` at the top of the file.
      - Replace all instances of `(useQuery as Vi.Mock)` with `(useQuery as Mock)`.

After these changes, run `pnpm run t` again to check for any remaining errors.
