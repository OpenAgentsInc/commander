Okay, I understand. The chat input disabling and the message duplication are creating a poor user experience. I'll prioritize fixing the input disabling issue immediately and then ensure the message duplication is also handled, along with test coverage.

Here are the specific instructions to address the chat input disabling issue:

**Goal:** Prevent the text input in the NIP-28 chat from being disabled (or disabled for a noticeable period) after the user sends a message. The input should clear and remain interactive while the message is being published in the background.

**1. Modify `src/hooks/useNostrChannelChat.ts`**

- **Locate the `sendMessage` function.**
- **Remove `isLoading` state toggling related to Nostr publishing:**
  - Delete the line: `setIsLoading(true);` (which is currently around line 200, before adding the temporary message).
  - In the `.then(...)` block of `Effect.runPromiseExit(Effect.provide(sendMessageEffect, mainRuntime))`, delete the line: `setIsLoading(false);` (currently around line 240).
  - In the `.catch(...)` block of `Effect.runPromiseExit(Effect.provide(sendMessageEffect, mainRuntime))`, delete the line: `setIsLoading(false);` (currently around line 283).

**Rationale:**
The `isLoading` state in this hook is directly tied to the `disabled` prop of the `Textarea` in `ChatWindow.tsx`. By not setting `isLoading` to `true` during the Nostr message sending process, the input field will remain enabled. The optimistic UI update (clearing input, showing a temporary message) will still occur, but the user can continue typing or interacting.

**2. Address Test Failures in `src/tests/unit/hooks/useNostrChannelChat.test.tsx`**

The current test failures (`TypeError: Cannot read properties of undefined (reading '_op_layer')` and `TypeError: vi.mocked(...).mockReturnValue is not a function`) indicate issues with the test setup, specifically how `mainRuntime` and `Effect.runPromiseExit` are mocked or how context is provided to effects under test.

- **Fix `mainRuntime` Mocking:**

  - `mainRuntime` is an exported variable from `src/services/runtime.ts`. It should be mocked by providing a mock implementation for the entire module.
  - Change the mock for `src/services/runtime.ts` to:

    ```typescript
    // In src/tests/unit/hooks/useNostrChannelChat.test.tsx
    vi.mock("@/services/runtime", () => ({
      mainRuntime: {
        // If any methods of mainRuntime are directly called by the hook (they aren't currently),
        // those would need to be mocked here. For now, an empty object might suffice if
        // Effect.provide just needs a truthy value for its second argument.
        // However, to be safer and to handle Effect.provide correctly, we need
        // a runtime that can actually execute effects.
        // A more robust mock would be to create a minimal test runtime.
        // For now, let's assume the existing Effect.runPromiseExit mock will handle execution.
        // If the '_op_layer' error persists, we'll need to mock a functional runtime here.
      },
    }));
    ```

    _Self-correction:_ The `_op_layer` error indicates that `Effect.provide` is likely trying to use a real runtime's internal properties. The `mainRuntime` mock needs to be more functional or the `Effect.provide` calls within the hook need to be handled differently in the test environment.

    A better approach for the test might be to mock the service layer (`NIP28Service`) that `mainRuntime` would provide to the effects in the hook. This way, we test the hook's logic without needing a fully functional runtime.

- **Fix `Effect.runPromiseExit` Mocking:**

  - The error `vi.mocked(...).mockReturnValue is not a function` occurs because `Effect.runPromiseExit` is typically part of the `Effect` namespace/module, not `Runtime.mainRuntime`.
  - Ensure `Effect.runPromiseExit` is correctly spied upon or mocked if you intend to control its behavior directly:
    ```typescript
    // At the top of your test file, within the vi.mock('effect', ...) block:
    // ...
    // Effect: {
    //  ...actual.Effect, // Spread other Effect functions
    //  runPromiseExit: vi.fn(), // Mock runPromiseExit
    //  flatMap: vi.fn((effect, f) => f(effect.value)), // Simplified mock for flatMap
    //  succeed: vi.fn(value => ({ _tag: "Success", value })),
    //  fail: vi.fn(error => ({ _tag: "Failure", error })),
    //  // Add other Effect functions used by the hook if necessary
    // },
    // ...
    ```
    Then, in `beforeEach`:
    ```typescript
    vi.mocked(Effect.runPromiseExit).mockImplementation(
      async (effectProvided) => {
        // Simulate the successful execution of the effect for sending a message
        // This is a simplified simulation.
        if (typeof effectProvided === "object" && effectProvided !== null) {
          // Simulate resolving the effect's value for sendChannelMessage
          return Exit.succeed({
            id: "test-event-id-from-nostr",
            kind: 42,
            created_at: Math.floor(Date.now() / 1000),
            pubkey: "mock-user-pk",
            tags: [],
            content: "mock-encrypted-content",
            sig: "mock-sig",
          } as NostrEvent);
        }
        return Exit.fail("Mocked effect was not an object");
      },
    );
    ```

- **Mock Service Dependencies:**
  The hook `useNostrChannelChat` depends on `NIP28Service`. Ensure this service is thoroughly mocked so that when `Effect.provide(getMessagesEffect, mainRuntime)` or `Effect.provide(sendMessageEffect, mainRuntime)` are called, the effects resolve to these mocks.

  ```typescript
  // src/tests/unit/hooks/useNostrChannelChat.test.tsx
  import { NIP28Service } from "@/services/nip28";
  import type { NostrEvent } from "@/services/nostr";
  // ... other imports

  // Mock NIP28Service at the module level
  vi.mock("@/services/nip28", async () => {
    const actualNip28 =
      await vi.importActual<typeof import("@/services/nip28")>(
        "@/services/nip28",
      );
    return {
      ...actualNip28, // Keep other exports like error types
      NIP28Service: Context.GenericTag<NIP28Service>("NIP28Service"), // Ensure the Tag is correctly exported
      // Mock the NIP28ServiceLive layer to return a mocked service instance
      NIP28ServiceLive: Layer.succeed(
        actualNip28.NIP28Service, // Use the actual Tag
        {
          // Mock all methods of NIP28Service
          createChannel: vi.fn(() =>
            Effect.succeed({ id: "mock-channel-event" } as NostrEvent),
          ),
          getChannelMetadata: vi.fn(() =>
            Effect.succeed({
              name: "Test Channel",
              creatorPk: "creator-pk",
              event_id: "channel-id",
              about: "",
              picture: "",
            }),
          ),
          setChannelMetadata: vi.fn(() =>
            Effect.succeed({ id: "mock-metadata-event" } as NostrEvent),
          ),
          sendChannelMessage: vi.fn((params) =>
            Effect.succeed({
              id: `sent-${params.content.substring(0, 5)}-${Date.now()}`,
              kind: 42,
              created_at: Math.floor(Date.now() / 1000),
              pubkey: "test-user-pk",
              tags: [["e", params.channelCreateEventId]],
              content: `encrypted:${params.content}`,
              sig: "mocksig",
            } as NostrEvent),
          ),
          getChannelMessages: vi.fn(() => Effect.succeed([])),
          subscribeToChannelMessages: vi.fn(() =>
            Effect.succeed({ unsub: vi.fn() }),
          ),
        },
      ),
    };
  });
  ```

  This approach ensures that when `mainRuntime` (which should be built with `NIP28ServiceLive` in the actual app) is used via `Effect.provide`, the mocked service methods are called.

**3. Add Test Assertion for `isLoading` State**

- In `src/tests/unit/hooks/useNostrChannelChat.test.tsx`, after fixing the setup issues, add an assertion to the "should not disable text input after sending a message" test:

  ```typescript
  it("should not disable text input after sending a message", async () => {
    const { result } = renderHook(() => useNostrChannelChat({ channelId }));
    const testMessage = "Hello Nostr test!";

    // Initial state check (optional, but good practice)
    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.setUserInput(testMessage);
    });

    // Call sendMessage
    await act(async () => {
      result.current.sendMessage();
    });

    // Assert that isLoading is false immediately after calling sendMessage
    // and optimistic UI updates have occurred.
    // This implicitly tests that the input (disabled by isLoading) is not disabled.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.userInput).toBe(""); // Input should be cleared

    // Optionally, wait for a very short period to ensure no async setIsLoading(true) happens
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current.isLoading).toBe(false);

    // Further assertions can check if the temporary message is present
    expect(
      result.current.messages.some(
        (m) => m.content === testMessage && m.id.startsWith("temp-"),
      ),
    ).toBe(true);
  });
  ```

By making these changes, the text input should remain enabled, providing a much smoother user experience. The test failures need to be addressed by correctly mocking the runtime and service dependencies for the hook.
