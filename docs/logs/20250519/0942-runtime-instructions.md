It seems the core issue with `rt.runPromise is not a function` is that the Effect `Runtime` (`rt`) is not being correctly initialized or is unavailable in the execution context of the store action, especially when the app is packaged.

The most robust way to handle Effect-TS runtimes in an application is to create a single, global runtime instance that is initialized once with all necessary services and then imported wherever needed. This avoids potential issues with re-creating runtimes or incorrect layer configurations in different parts of the application.

Here's a step-by-step plan to implement this:

**I. Create a Shared Application Runtime**

1.  **Create the file `src/services/runtime.ts`**:
    This file will be responsible for creating and exporting a single `Runtime` instance for the entire application.

    ```typescript
    import { Layer, Runtime } from 'effect';
    import { NostrService, NostrServiceLive, DefaultNostrServiceConfigLayer } from '@/services/nostr';
    import { NIP19Service, NIP19ServiceLive } from '@/services/nip19';
    import { NIP28Service, NIP28ServiceLive } from '@/services/nip28';
    import { BIP39Service, BIP39ServiceLive } from '@/services/bip39';
    import { BIP32Service, BIP32ServiceLive } from '@/services/bip32';
    import { NIP04Service, NIP04ServiceLive } from '@/services/nip04';
    import { OllamaService, OllamaServiceLive, UiOllamaConfigLive, OllamaServiceConfigTag } from '@/services/ollama/OllamaService';
    import { TelemetryService, TelemetryServiceLive } from '@/services/telemetry';
    import { NodeHttpClient, HttpClient } from "@effect/platform-node"; // Import HttpClient as well

    // Layer for NostrServiceConfig (relays, etc.)
    // DefaultNostrServiceConfigLayer is already defined in src/services/nostr/NostrService.ts
    // and provides NostrServiceConfigTag.

    // Layer for OllamaServiceConfig and HttpClient (needed by OllamaService)
    const ollamaDependenciesLayer = Layer.merge(UiOllamaConfigLive, NodeHttpClient.layer);
    const ollamaLayerFull = Layer.provide(OllamaServiceLive, ollamaDependenciesLayer);

    // Layer for NostrService (depends on NostrServiceConfigTag)
    const nostrLayerFull = Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer);

    // Layer for NIP28Service (depends on NostrService)
    const nip28LayerFull = Layer.provide(NIP28ServiceLive, nostrLayerFull);

    // Other services that might be independent or have simple dependencies
    const nip19LayerFull = NIP19ServiceLive;
    const bip39LayerFull = BIP39ServiceLive;
    const bip32LayerFull = BIP32ServiceLive;
    const nip04LayerFull = NIP04ServiceLive;
    const telemetryLayerFull = TelemetryServiceLive;

    // Combine all service layers into a single application layer
    const appLayer = Layer.mergeAll(
      nostrLayerFull,
      nip19LayerFull,
      nip28LayerFull,
      bip39LayerFull,
      bip32LayerFull,
      nip04LayerFull,
      ollamaLayerFull,
      telemetryLayerFull
    );

    // Define the context type for the application runtime
    // This should include all services provided by appLayer
    export type AppRuntimeContext =
      NostrService |
      NIP19Service |
      NIP28Service |
      BIP39Service |
      BIP32Service |
      NIP04Service |
      OllamaService |
      TelemetryService;

    let mainRuntime: Runtime.Runtime<AppRuntimeContext>;

    try {
      console.log("Attempting to initialize main Effect Runtime...");
      mainRuntime = Runtime.make(appLayer);
      console.log("Main Effect Runtime initialized successfully.");
    } catch (e) {
      console.error("CRITICAL: Failed to initialize main Effect Runtime:", e);
      // In a real application, you might want to display an error to the user or quit.
      // For now, re-throwing will stop the app, which is better than a broken state.
      throw new Error("Failed to initialize main Effect Runtime: " + (e instanceof Error ? e.message : String(e)));
    }

    export { mainRuntime };
    ```
    *Self-correction: Ensured all services are correctly layered and provided. `DefaultNostrServiceConfigLayer` seems to be only for Nostr config, not a general HttpClient provider. `OllamaService` setup now explicitly includes `NodeHttpClient.layer`.*

**II. Update Store Actions and Hooks to Use the Shared Runtime**

1.  **File: `src/stores/panes/actions/createNip28ChannelPane.ts`**
    *   Import `mainRuntime` from `src/services/runtime.ts`.
    *   Remove the local `Runtime.make()` call.
    *   Use `mainRuntime` to run the Effect program.
    *   Ensure `NostrEvent` type is correctly imported if used (it seems `channelEvent` is of this type).

    ```typescript
    import { PaneInput } from '@/types/pane';
    import { PaneStoreType, SetPaneStore } from '../types';
    import { addPaneLogic } from './addPane';
    import { Effect, Cause } from 'effect'; // Removed Layer, Runtime
    import { NIP28Service, type CreateChannelParams } from '@/services/nip28';
    import { type NostrEvent } from '@/services/nostr'; // Ensure this is your project's NostrEvent type
    import { hexToBytes } from '@noble/hashes/utils';
    import { getPublicKey } from 'nostr-tools/pure';
    import { mainRuntime } from '@/services/runtime'; // Import the shared runtime

    const DEMO_CHANNEL_CREATOR_SK_HEX = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123";
    const DEMO_CHANNEL_CREATOR_SK = hexToBytes(DEMO_CHANNEL_CREATOR_SK_HEX);

    export function createNip28ChannelPaneAction(set: SetPaneStore, channelNameInput?: string) {
      const rt = mainRuntime; // Use the shared runtime

      if (!rt) {
        console.error("CRITICAL: mainRuntime is not available in createNip28ChannelPaneAction.");
        // Handle this case, perhaps by showing an error pane or logging extensively
        const errorPaneInput: PaneInput = {
            type: 'default', title: 'Runtime Error',
            content: { message: "Effect runtime not initialized. Channel creation failed." }
        };
        set((state: PaneStoreType) => addPaneLogic(state, errorPaneInput));
        return;
      }

      const channelName = channelNameInput?.trim() || `My Channel ${Date.now() % 1000}`;
      const channelParams: CreateChannelParams = {
        name: channelName,
        about: `A new NIP-28 channel: ${channelName}`,
        picture: '',
        secretKey: DEMO_CHANNEL_CREATOR_SK,
      };

      const createAndPublishEffect = Effect.gen(function*(_) {
        const nip28Service = yield* _(NIP28Service);
        console.log("[Action] Creating NIP28 channel with params:", channelParams);
        const channelEvent = yield* _(nip28Service.createChannel(channelParams));
        console.log("[Action] NIP28 channel event created and published, ID:", channelEvent.id);
        return channelEvent;
      });

      rt.runPromise(createAndPublishEffect)
        .then((channelEvent: NostrEvent) => { // Explicitly type channelEvent
          const parsedMetadata = JSON.parse(channelEvent.content) as { name: string, about: string, picture: string };
          const paneTitle = parsedMetadata.name || 'NIP28 Channel';

          const newPaneInput: PaneInput = {
            id: `nip28-${channelEvent.id}`,
            type: 'nip28_channel',
            title: paneTitle,
            content: {
              channelId: channelEvent.id,
              channelName: paneTitle,
            },
          };

          set((state: PaneStoreType) => {
            const changes = addPaneLogic(state, newPaneInput, true);
            return { ...state, ...changes };
          });

        }).catch(error => {
          console.error("Error creating/publishing NIP28 channel:", error, Cause.isCause(error) ? Cause.pretty(error) : String(error));
          const errorPaneInput: PaneInput = {
              type: 'default',
              title: 'Error Creating Channel',
              content: { message: `Failed to create NIP-28 channel: ${(error as Error).message || String(error)}` }
          };
          set((state: PaneStoreType) => {
              const changes = addPaneLogic(state, errorPaneInput);
              return { ...state, ...changes };
          });
        });
    }
    ```

2.  **File: `src/hooks/useNostrChannelChat.ts`**
    *   Import `mainRuntime` and `AppRuntimeContext`.
    *   Remove the local `useEffect` for runtime initialization.
    *   Use `mainRuntime` directly.

    ```typescript
    import { useState, useEffect, useCallback, useRef } from 'react';
    import { Effect, Stream, Exit, Cause, Runtime } from 'effect'; // Keep Runtime for type, removed Layer, Option
    import { NostrService, type NostrEvent, type NostrFilter } from '@/services/nostr';
    import { NIP19Service } from '@/services/nip19';
    import { NIP28Service, type SendChannelMessageParams } from '@/services/nip28';
    import { type ChatMessageProps } from '@/components/chat/ChatMessage';
    import { hexToBytes } from '@noble/hashes/utils';
    import { getPublicKey } from 'nostr-tools/pure';
    import { mainRuntime, type AppRuntimeContext } from '@/services/runtime'; // Import shared runtime

    const DEMO_USER_SK_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const DEMO_USER_SK = hexToBytes(DEMO_USER_SK_HEX);
    const DEMO_USER_PK = getPublicKey(DEMO_USER_SK);

    interface UseNostrChannelChatOptions {
      channelId: string;
    }

    export function useNostrChannelChat({ channelId }: UseNostrChannelChatOptions) {
      const [messages, setMessages] = useState<ChatMessageProps[]>([]);
      const [isLoading, setIsLoading] = useState(false);
      const [userInput, setUserInput] = useState('');
      const nostrSubscriptionIdRef = useRef<string | null>(null);

      // Use the globally initialized mainRuntime
      const runtimeRef = useRef<Runtime.Runtime<AppRuntimeContext>>(mainRuntime);

      // useEffect for runtime initialization is no longer needed here

      const fetchAndDisplayNpub = useCallback(async (pubkey: string): Promise<string> => {
        const rt = runtimeRef.current;
        if (!rt) {
             console.error("Runtime not available in fetchAndDisplayNpub");
             return pubkey.substring(0, 8) + "...";
        }
        const program = Effect.gen(function*(_) {
          const nip19 = yield* _(NIP19Service);
          return yield* _(nip19.encodeNpub(pubkey));
        });
        const exit = await rt.runPromiseExit(program);
        if (Exit.isSuccess(exit)) return exit.value;
        console.error("Failed to encode npub:", Cause.pretty(exit.cause));
        return pubkey.substring(0, 8) + "...";
      }, []);

      const formatEventAsMessage = useCallback(async (event: NostrEvent): Promise<ChatMessageProps> => {
        const authorDisplay = await fetchAndDisplayNpub(event.pubkey);
        return {
          id: event.id,
          content: event.content,
          role: event.pubkey === DEMO_USER_PK ? 'user' : 'assistant',
          author: authorDisplay,
          timestamp: event.created_at * 1000,
        };
      }, [fetchAndDisplayNpub]);

      useEffect(() => {
        const rt = runtimeRef.current;
        if (!channelId || !rt) {
            console.warn(`useNostrChannelChat: channelId (${channelId}) or runtime not available. Skipping effect.`);
            return;
        }

        setIsLoading(true);
        setMessages([{ id:'loading-system', role: 'system', content: 'Loading channel messages...', timestamp: Date.now() }]);

        const initialFetchProgram = Effect.gen(function*(_) {
          const nip28Service = yield* _(NIP28Service);
          const events = yield* _(nip28Service.getChannelMessages(channelId, { limit: 50 }));
          const formattedMessages = yield* _(Effect.all(events.map(e => Effect.promise(() => formatEventAsMessage(e)))));
          return formattedMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        });

        rt.runPromise(initialFetchProgram).then(initialMsgs => {
          if (initialMsgs.length === 0) {
            setMessages([{
              id: 'no-messages-system',
              role: 'system',
              content: 'No messages yet. Be the first to say something!',
              timestamp: Date.now()
            }]);
          } else {
            setMessages(initialMsgs);
          }
          setIsLoading(false);
        }).catch(error => {
          console.error("Error fetching initial NIP28 messages:", error, Cause.isCause(error) ? Cause.pretty(error) : String(error));
          setIsLoading(false);
          setMessages([{ id: 'error-fetch', role: 'system', content: `Error fetching messages: ${(error as Error).message || String(error)}`, timestamp: Date.now() }]);
        });

        const filter: NostrFilter = {
          kinds: [42],
          '#e': [channelId],
          since: Math.floor(Date.now() / 1000) - 10,
        };
        const subId = `nip28-chat-${channelId}-${Date.now()}`;
        nostrSubscriptionIdRef.current = subId;

        const subscriptionEffect = Effect.gen(function*(_) {
          const nostr = yield* _(NostrService);
          const stream = yield* _(nostr.subscribeEvents([filter], subId));

          yield* _(Stream.runForEach(stream, (event) => Effect.promise(async () => {
            const newMessage = await formatEventAsMessage(event);
            setMessages(prev => {
              if (prev.find(m => m.id === newMessage.id)) return prev;
              const realMessages = prev.filter(m => m.role !== 'system');
              const newMsgArray = [...realMessages, newMessage];
              return newMsgArray.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
            });
          })));
        });

        const fiber = rt.runFork(subscriptionEffect);

        return () => {
          if (nostrSubscriptionIdRef.current && rt) {
            const unsubEffect = Effect.gen(function*(_) {
              const nostr = yield* _(NostrService);
              yield* _(nostr.closeSubscription(nostrSubscriptionIdRef.current!));
            });
            rt.runPromise(unsubEffect).catch(err => console.error("Error closing NIP28 subscription:", err));
            nostrSubscriptionIdRef.current = null;
          }
          fiber.unsafeInterrupt();
        };
      }, [channelId, formatEventAsMessage]);

      const sendMessage = useCallback(async () => {
        const rt = runtimeRef.current;
        if (!userInput.trim() || !channelId || !rt) return;

        setIsLoading(true);
        const tempUserMessageId = `temp-${Date.now()}`;
        const tempUserMessage: ChatMessageProps = {
          id: tempUserMessageId,
          role: 'user',
          content: userInput.trim(),
          author: "Me (sending...)",
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev.filter(m => m.role !== 'system'), tempUserMessage]);
        const currentInput = userInput.trim();
        setUserInput('');

        try {
          const sendParams: SendChannelMessageParams = {
            channelCreateEventId: channelId,
            content: currentInput,
            secretKey: DEMO_USER_SK
          };

          const sendProgram = Effect.gen(function*(_) {
            const nip28Service = yield* _(NIP28Service);
            yield* _(nip28Service.sendChannelMessage(sendParams));
          });

          await rt.runPromise(sendProgram);
          setMessages(prev => prev.filter(m => m.id !== tempUserMessageId));
        } catch (error) {
          console.error("Error sending NIP28 message:", error, Cause.isCause(error) ? Cause.pretty(error) : String(error));
          setMessages(prev => prev.map(m => m.id === tempUserMessageId ? {...m, content: `${m.content} (Error: ${(error as Error).message || String(error)})`, author: "Me (error)" } : m));
        } finally {
          setIsLoading(false);
        }
      }, [userInput, channelId]);

      return { messages, isLoading, userInput, setUserInput, sendMessage };
    }
    ```

**III. Ensure Runtime is Imported Early (App Initialization)**

While `mainRuntime` is exported, ensure it's imported somewhere early in your application's lifecycle, e.g., in `src/App.tsx` or `src/renderer.ts`, just to trigger its initialization if module side effects are relied upon. However, explicit initialization is usually better. The `try-catch` in `src/services/runtime.ts` should make its initialization robust.

```typescript
// Example: src/renderer.ts (or src/App.tsx if renderer.ts is minimal)
import "@/App";
import { mainRuntime } from '@/services/runtime'; // Add this import

// You can optionally log to confirm it's initialized
if (mainRuntime) {
  console.log("Main Effect runtime has been referenced/initialized in renderer.");
} else {
  console.error("Main Effect runtime FAILED to initialize or is undefined in renderer.");
}
```
This step helps ensure that the `mainRuntime` module is evaluated and the runtime is created.

**IV. Verify All Service Implementations (`*ServiceImpl.ts`)**

Ensure that all `...ServiceImpl.ts` files correctly define their `Live` layers and dependencies.
For example, `NIP28ServiceImpl.ts` should look something like:
```typescript
// Example structure for a ServiceImpl.ts
import { Effect, Layer, Context } from 'effect';
import { NIP28Service, NostrEvent, CreateChannelParams, SendChannelMessageParams } from './NIP28Service';
import { NostrService } from '../nostr'; // Assuming NostrService is in ../nostr
// ... other imports ...

class NIP28ServiceImpl implements NIP28Service {
  constructor(private nostrService: NostrService) {} // Dependency injection

  createChannel(params: CreateChannelParams): Effect.Effect<NostrEvent, any, NostrService> { // Adjust error type
    // Implementation using this.nostrService
    // ...
    return Effect.succeed(mockEvent as NostrEvent); // Placeholder
  }
  // ... other methods
}

export const NIP28ServiceLive = Layer.effect(
  NIP28Service,
  Effect.map(NostrService, nostrService => new NIP28ServiceImpl(nostrService))
);
```
This is a general pattern. The key is that the `Live` layer correctly requests its dependencies (like `NostrService` for `NIP28ServiceLive`). The `Layer.mergeAll` in `src/services/runtime.ts` should then be able to construct the full dependency graph.

**V. Log Update**
Update the log file to reflect these changes, particularly the introduction of a shared runtime and the modifications to the store action and hook.

These changes should provide a stable, globally accessible Effect runtime, which should resolve the `rt.runPromise is not a function` error. The explicit `try-catch` during the `mainRuntime` creation will also help diagnose if the runtime itself is failing to initialize.
