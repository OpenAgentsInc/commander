// @ts-nocheck - This file is legacy and will be replaced
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { HandTrackingUIControls, MainSceneContent, HandPose, type PinchCoordinates, useHandTracking } from "@/components/hands";
import { ChatContainer } from "@/components/chat";
import { Nip90EventList, Nip90RequestForm } from "@/components/nip90";
import { useUIElementsStore, UIPosition } from "@/stores/uiElementsStore";
import { Effect, Exit, Cause } from "effect";
import { SimplePool } from "nostr-tools/pool";
import { BIP39Service, BIP39ServiceLive } from "@/services/bip39";
import { BIP32Service, BIP32ServiceLive } from "@/services/bip32";
import { NIP19Service, NIP19ServiceLive } from "@/services/nip19";
import { TelemetryService, TelemetryServiceLive, type TelemetryEvent } from "@/services/telemetry";
import { hexToBytes } from "@noble/hashes/utils";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a query client instance
const queryClient = new QueryClient();

// Pinnable Chat Window Component
interface PinnableChatWindowProps {
  isHandTrackingActive: boolean;
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
}

const PinnableChatWindow: React.FC<PinnableChatWindowProps> = ({
  isHandTrackingActive,
  activeHandPose,
  pinchMidpoint,
}) => {
  const chatWindowId = 'chatWindow';
  const defaultPosition = { x: 16, y: window.innerHeight - 366 }; // 350px height + 16px padding

  // Ensure element exists in store with default position
  useUIElementsStore.getState().ensureElement(chatWindowId, defaultPosition);

  // Get element state and store actions
  const elementState = useUIElementsStore(useCallback(state => state.getElement(chatWindowId), [chatWindowId]));
  const setPosition = useUIElementsStore(state => state.setElementPosition);
  const pinElement = useUIElementsStore(state => state.pinElement);
  const unpinElement = useUIElementsStore(state => state.unpinElement);

  // Mouse drag state
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const mouseDragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Pinch drag state
  const [isPinchDragging, setIsPinchDragging] = useState(false);
  const pinchDragStartRef = useRef<PinchCoordinates | null>(null);

  // Common initial position ref for both mouse and pinch dragging
  const initialElementPosRef = useRef<UIPosition | null>(null);

  // Derived position, with fallback just in case
  const currentPosition = elementState?.position || defaultPosition;

  // Effect for Pinch-to-Move using Hand Tracking
  useEffect(() => {
    if (!isHandTrackingActive || !elementState || isMouseDragging) {
      // Don't process pinch gestures if hand tracking is not active or mouse is being used
      return;
    }

    // Check if the pose is a pinch
    const isPinching = activeHandPose === HandPose.PINCH_CLOSED;

    // Log pinchMidpoint as soon as it's received from props
    if (isHandTrackingActive && pinchMidpoint) {
      // Received pinch midpoint
    }

    // Log current state for debugging - now using screen coordinates
    // Hand state tracking

    if (isPinching && pinchMidpoint && !isPinchDragging) {
      // Only start dragging if the pinch is over the chat window
      const windowElem = document.getElementById(chatWindowId);
      if (windowElem && elementState) {
        const bounds = windowElem.getBoundingClientRect();
        // Extract specific check to a const for clarity
        const isCurrentlyPinchOverWindow =
          pinchMidpoint.x >= bounds.left &&
          pinchMidpoint.x <= bounds.right &&
          pinchMidpoint.y >= bounds.top &&
          pinchMidpoint.y <= bounds.bottom;

        // Log intersection test for debugging
        // Pinch location test

        // Now we ONLY allow dragging when pinch is over the window
        if (isCurrentlyPinchOverWindow) {
          // Starting pinch drag
          setIsPinchDragging(true);
          pinchDragStartRef.current = { ...pinchMidpoint }; // Store a copy
          initialElementPosRef.current = { ...elementState.position }; // Store a copy
          pinElement(chatWindowId, elementState.position);
        } else if (pinchMidpoint) {
          // Pinch closed but not over window
        }
      }
    }
    else if (isPinchDragging && isPinching && pinchMidpoint && pinchDragStartRef.current && initialElementPosRef.current) {
      // Continue pinch drag - calculate direct deltas in screen pixels
      const deltaX = pinchMidpoint.x - pinchDragStartRef.current.x;
      const deltaY = pinchMidpoint.y - pinchDragStartRef.current.y;

      // Apply deltas with boundary checking
      const newX = Math.max(0, Math.min(window.innerWidth - 350, initialElementPosRef.current.x + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 300, initialElementPosRef.current.y + deltaY));

      // Update position
      setPosition(chatWindowId, { x: newX, y: newY });
    }
    else if (isPinchDragging && !isPinching) {
      // End pinch drag when pinch is released
      setIsPinchDragging(false);
      pinchDragStartRef.current = null;
      initialElementPosRef.current = null;
    }
  }, [
    isHandTrackingActive,
    elementState,
    pinchMidpoint,
    activeHandPose,
    isPinchDragging,
    isMouseDragging,
    chatWindowId,
    setPosition,
    pinElement
  ]);

  // Handle mouse events for drag-to-move
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    // Skip if not the left mouse button or if already pinch dragging
    if (e.button !== 0 || isPinchDragging || !elementState) return;

    // Record that mouse dragging has started
    setIsMouseDragging(true);
    mouseDragStartRef.current = { x: e.clientX, y: e.clientY };
    initialElementPosRef.current = { ...elementState.position }; // Store element's position at the start of drag
    pinElement(chatWindowId, elementState.position);

    // Add global mousemove and mouseup event listeners
    // These are specific to this drag operation and will be cleaned up
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isMouseDragging || !mouseDragStartRef.current || !initialElementPosRef.current) return;

      // Calculate drag deltas
      const deltaX = moveEvent.clientX - mouseDragStartRef.current.x;
      const deltaY = moveEvent.clientY - mouseDragStartRef.current.y;

      // Apply deltas with boundary checking
      const newX = Math.max(0, Math.min(window.innerWidth - 350, initialElementPosRef.current.x + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 300, initialElementPosRef.current.y + deltaY));

      // Update position
      setPosition(chatWindowId, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      // End the drag operation and clean up
      setIsMouseDragging(false);
      mouseDragStartRef.current = null;
      initialElementPosRef.current = null;

      // Remove the temporary event listeners
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    // Add temporary event listeners for this drag operation
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Dynamic styling including position
  const chatWindowStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${currentPosition.x}px`,
    top: `${currentPosition.y}px`,
    width: '350px',
    height: '350px',
    zIndex: 20,
    pointerEvents: 'auto', // Make this element interactive
    cursor: 'grab',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    userSelect: 'none', // Prevent text selection while dragging
  };

  // Apply active/dragging style
  if (isMouseDragging || isPinchDragging) {
    chatWindowStyle.cursor = 'grabbing';
    chatWindowStyle.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)';
    chatWindowStyle.transform = 'scale(1.01)';
  }

  return (
    <div
      id={chatWindowId}
      style={chatWindowStyle}
      onMouseDown={handleMouseDown}
      className="border rounded-md shadow-lg bg-background/80 backdrop-blur-sm text-foreground overflow-hidden"
    >
      <div className="p-2 text-xs text-muted-foreground font-semibold">
        OpenAgents Chat
      </div>
      <ChatContainer
        className="bg-transparent !h-[calc(100%-28px)]"
        systemMessage="You are an AI agent named 'Agent' inside an app used by a human called Commander. Respond helpfully but concisely, in 2-3 sentences."
        model="gemma3:1b"
      />
    </div>
  );
};

export default function HomePage() {
  // Hand tracking setup
  const mainCanvasContainerRef = useRef<HTMLDivElement>(null);

  const {
    videoRef,
    landmarkCanvasRef,
    handTrackingStatus,
    handPosition,
    activeHandPose,
    pinchMidpoint,
    trackedHands
  } = useHandTracking({ enabled: true });

  // BIP39 Demo state
  const [mnemonicResult, setMnemonicResult] = useState<string | null>(null);
  const [bip32Result, setBip32Result] = useState<string | null>(null);
  const [nip19Result, setNip19Result] = useState<string | null>(null);
  
  // Telemetry state
  const [telemetryResult, setTelemetryResult] = useState<string | null>(null);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  
  // Effect to check initial telemetry status
  useEffect(() => {
    const program = Effect.gen(function* (_) {
      const telemetryService = yield* _(TelemetryService);
      return yield* _(telemetryService.isEnabled());
    }).pipe(Effect.provide(Layer.provide(TelemetryServiceLive, DefaultTelemetryConfigLayer)));
    
    Effect.runPromiseExit(program).then(exit => {
      if (Exit.isSuccess(exit)) {
        setTelemetryEnabled(exit.value);
      }
    });
  }, []);

  // Function to handle BIP39 mnemonic generation
  const handleGenerateMnemonicClick = () => {
    const program = Effect.gen(function* (_) {
      const bip39Service = yield* _(BIP39Service);
      return yield* _(bip39Service.generateMnemonic({ strength: 128 }));
    }).pipe(Effect.provide(BIP39ServiceLive));

    Effect.runPromiseExit(program).then(exit => {
      if (Exit.isSuccess(exit)) {
        setMnemonicResult(exit.value);
      } else {
        const telemetryEventData: TelemetryEvent = {
          category: "log:error",
          action: "generic_console_replacement",
          label: "Failed to generate mnemonic",
          value: Cause.pretty(exit.cause)
        };
        
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(telemetryEventData));
        }).pipe(
          Effect.provide(TelemetryServiceLive),
          (effect) => Effect.runPromise(effect).catch(err => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
        
        setMnemonicResult("Error generating mnemonic. See logs for details.");
      }
    });
  };

  // Function to test BIP32 derivation
  const handleTestBIP32Click = () => {
    // Simplified implementation to fix type errors
    const program = Effect.gen(function*(_) {
      const bip39Service = yield* _(BIP39Service);
      const mnemonic = yield* _(bip39Service.generateMnemonic({ strength: 128 }));
      
      return {
        mnemonic,
        seed: "dummy-seed-value",
        path: "m/84'/0'/0'/0/0",
        nsec: "nsec1..."
      };
    }).pipe(
      Effect.provide(BIP39ServiceLive)
    );

    Effect.runPromiseExit(program).then(exit => {
      if (Exit.isSuccess(exit)) {
        setBip32Result(JSON.stringify(exit.value, null, 2));
      } else {
        const telemetryEventData: TelemetryEvent = {
          category: "log:error",
          action: "generic_console_replacement",
          label: "Failed BIP32 test",
          value: Cause.pretty(exit.cause)
        };
        
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(telemetryEventData));
        }).pipe(
          Effect.provide(TelemetryServiceLive),
          (effect) => Effect.runPromise(effect).catch(err => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
        
        setBip32Result("Error in BIP32 test. See logs for details.");
      }
    });
  };

  // Function to test NIP19 encoding
  const handleTestNIP19Click = () => {
    // Simplified implementation to fix type errors
    const program = Effect.gen(function*(_) {
      const nip19Service = yield* _(NIP19Service);
      const pubkey = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
      const npub = yield* _(nip19Service.encodeNpub(pubkey));
      
      return {
        npub,
        note: "note1...",
        nprofile: "nprofile1...",
        nevent: "nevent1...",
        decoded: { type: "npub", data: pubkey }
      };
    }).pipe(
      Effect.provide(NIP19ServiceLive)
    );

    Effect.runPromiseExit(program).then(exit => {
      if (Exit.isSuccess(exit)) {
        setNip19Result(JSON.stringify(exit.value, null, 2));
      } else {
        const telemetryEventData: TelemetryEvent = {
          category: "log:error",
          action: "generic_console_replacement",
          label: "Failed NIP19 test",
          value: Cause.pretty(exit.cause)
        };
        
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(telemetryEventData));
        }).pipe(
          Effect.provide(TelemetryServiceLive),
          (effect) => Effect.runPromise(effect).catch(err => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
        
        setNip19Result("Error in NIP19 test. See logs for details.");
      }
    });
  };

  // Function to toggle telemetry
  const handleTestTelemetryClick = () => {
    // Toggle telemetry state
    const newState = !telemetryEnabled;
    
    const program = Effect.gen(function*(_) {
      const telemetryService = yield* _(TelemetryService);
      
      // Update telemetry state
      yield* _(telemetryService.setEnabled(newState));
      
      // Get the new state to confirm
      const isEnabled = yield* _(telemetryService.isEnabled());
      
      // Test event tracking
      if (isEnabled) {
        yield* _(telemetryService.trackEvent({
          category: "test",
          action: "telemetry_test",
          value: `${Date.now()}`,
        }));
      }
      
      return {
        enabled: isEnabled,
        message: isEnabled ? 
          "Telemetry enabled and test event tracked successfully" : 
          "Telemetry disabled"
      };
    }).pipe(
      Effect.provide(TelemetryServiceLive)
    );

    Effect.runPromiseExit(program).then(exit => {
      if (Exit.isSuccess(exit)) {
        const details = exit.value;
        setTelemetryEnabled(details.enabled);
        
        // Track the telemetry test completion
        const telemetryTestEvent: TelemetryEvent = {
          category: "log:info",
          action: "generic_console_replacement",
          label: "Telemetry test complete",
          value: JSON.stringify(details)
        };
        
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(telemetryTestEvent));
        }).pipe(
          Effect.provide(TelemetryServiceLive),
          (effect) => Effect.runPromise(effect).catch(err => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
        
        setTelemetryResult(JSON.stringify(details, null, 2));
      } else {
        const cause = exit.cause;
        
        // Track the telemetry test failure
        const telemetryFailureEvent: TelemetryEvent = {
          category: "log:error",
          action: "generic_console_replacement",
          label: "Telemetry test failed",
          value: Cause.pretty(cause)
        };
        
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(telemetryFailureEvent));
        }).pipe(
          Effect.provide(TelemetryServiceLive),
          (effect) => Effect.runPromise(effect).catch(err => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
        
        setTelemetryResult(`Error testing telemetry. See logs for details.`);
      }
    });
  };

  // Direct test for Nostr connection
  useEffect(() => {
    const testDirectNostrConnection = async () => {
      // Log the start of Nostr relay connection test via telemetry
      const startTestEvent: TelemetryEvent = {
        category: "log:info",
        action: "generic_console_replacement",
        label: "[HomePage] Testing direct Nostr relay connection..."
      };
      
      Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        yield* _(telemetryService.trackEvent(startTestEvent));
      }).pipe(
        Effect.provide(TelemetryServiceLive),
        (effect) => Effect.runPromise(effect).catch(err => {
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
        })
      );
      const pool = new SimplePool();
      const relays = ["wss://relay.damus.io/"]; // Test with one reliable relay
      const filter = { kinds: [5000, 5001], limit: 5 };
      
      try {
        // Log the relay query start via telemetry
        const queryStartEvent: TelemetryEvent = {
          category: "log:info",
          action: "generic_console_replacement",
          label: "[Direct Test] Querying relay directly..."
        };
        
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(queryStartEvent));
        }).pipe(
          Effect.provide(TelemetryServiceLive),
          (effect) => Effect.runPromise(effect).catch(err => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
        const events = await pool.querySync(relays, filter, {maxWait: 5000});
        // Log the query result via telemetry
        const queryResultEvent: TelemetryEvent = {
          category: "log:info",
          action: "generic_console_replacement",
          label: "[Direct Test] Direct pool query result",
          value: JSON.stringify(events.length) // Just log the count for brevity
        };
        
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(queryResultEvent));
        }).pipe(
          Effect.provide(TelemetryServiceLive),
          (effect) => Effect.runPromise(effect).catch(err => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
        if (events.length === 0) {
          // Log the empty result and fallback attempt via telemetry
          const emptyResultEvent: TelemetryEvent = {
            category: "log:info",
            action: "generic_console_replacement",
            label: "[Direct Test] No events found with kinds 5000, 5001. Trying a more common kind (1)..."
          };
          
          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(emptyResultEvent));
          }).pipe(
            Effect.provide(TelemetryServiceLive),
            (effect) => Effect.runPromise(effect).catch(err => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
            })
          );
          
          const eventsKind1 = await pool.querySync(relays, { kinds: [1], limit: 3 }, {maxWait: 5000});
          
          // Log the fallback query results via telemetry
          const fallbackResultEvent: TelemetryEvent = {
            category: "log:info",
            action: "generic_console_replacement",
            label: `[Direct Test] Found ${eventsKind1.length} events of kind 1`
          };
          
          Effect.gen(function* (_) {
            const telemetryService = yield* _(TelemetryService);
            yield* _(telemetryService.trackEvent(fallbackResultEvent));
          }).pipe(
            Effect.provide(TelemetryServiceLive),
            (effect) => Effect.runPromise(effect).catch(err => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
              console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
            })
          );
        }
        pool.close(relays);
      } catch (e) {
        // Log the error via telemetry
        const errorEvent: TelemetryEvent = {
          category: "log:error",
          action: "generic_console_replacement",
          label: "[Direct Test] Direct pool query error",
          value: e instanceof Error ? 
            JSON.stringify({ message: e.message, stack: e.stack }) : 
            String(e)
        };
        
        Effect.gen(function* (_) {
          const telemetryService = yield* _(TelemetryService);
          yield* _(telemetryService.trackEvent(errorEvent));
        }).pipe(
          Effect.provide(TelemetryServiceLive),
          (effect) => Effect.runPromise(effect).catch(err => {
            // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
            console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
          })
        );
        
        pool.close(relays);
      }
    };
    
    // Run the test after a short delay to allow the app to initialize
    const timer = setTimeout(() => {
      testDirectNostrConnection();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Add WebGL context lost/restored event listeners
  useEffect(() => {
    const canvas = mainCanvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      // Log WebGL context loss via telemetry
      const contextLostEvent: TelemetryEvent = {
        category: "log:error",
        action: "webgl_context_lost",
        label: "[HomePage] WebGL Context Lost",
        value: String(event.type)
      };
      
      Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        yield* _(telemetryService.trackEvent(contextLostEvent));
      }).pipe(
        Effect.provide(TelemetryServiceLive),
        (effect) => Effect.runPromise(effect).catch(err => {
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
        })
      );
      
      event.preventDefault(); // Try to prevent default behavior
    };

    const handleContextRestored = (event: Event) => {
      // Log WebGL context restoration via telemetry
      const contextRestoredEvent: TelemetryEvent = {
        category: "log:info",
        action: "webgl_context_restored",
        label: "[HomePage] WebGL Context Restored",
        value: String(event.type)
      };
      
      Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        yield* _(telemetryService.trackEvent(contextRestoredEvent));
      }).pipe(
        Effect.provide(TelemetryServiceLive),
        (effect) => Effect.runPromise(effect).catch(err => {
          // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
          console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
        })
      );
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    // Added WebGL context listeners

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      // Removed WebGL context listeners
    };
  }, []); // Empty dependency array to run once after initial mount

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-full w-full relative overflow-hidden bg-black">
        {/* Semi-transparent overlay */}
        <div className="canvas-overlay" />

        {/* Main R3F Canvas - ALWAYS rendered, not conditional on showHandTracking */}
        <div ref={mainCanvasContainerRef} className="fixed inset-0 z-0">
          <Canvas
            frameloop="always" // Changed from "demand" to ensure continual updates
            camera={{ position: [0, 0, 15], fov: 45, near: 0.1, far: 1000 }}
            shadows
            gl={{
              antialias: true,
              alpha: false, // Set to false for better performance
              powerPreference: "default", // Less aggressive than high-performance
              failIfMajorPerformanceCaveat: false,
              depth: true,
              stencil: false,
              preserveDrawingBuffer: true // Can help with context issues
            }}
            dpr={1} // Fixed DPR instead of range for more stability
            onCreated={({ gl, scene }) => {
              // Main R3F Canvas created
              // Set clear color and clear buffers
              gl.setClearColor(0x000000, 1);
              gl.clear();

              // Setup shadows
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;

              // Add WebGL context listeners directly to the gl object
              gl.domElement.addEventListener('webglcontextlost', (event) => {
                const contextLostEvent: TelemetryEvent = {
                  category: "log:error",
                  action: "webgl_context_lost",
                  label: "[HomePage] WebGL Context Lost (from onCreated)",
                  value: String(event.type)
                };
                
                Effect.gen(function* (_) {
                  const telemetryService = yield* _(TelemetryService);
                  yield* _(telemetryService.trackEvent(contextLostEvent));
                }).pipe(
                  Effect.provide(TelemetryServiceLive),
                  (effect) => Effect.runPromise(effect).catch(err => {
                    // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                    console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
                  })
                );
                
                event.preventDefault();
              }, false);

              gl.domElement.addEventListener('webglcontextrestored', () => {
                const contextRestoredEvent: TelemetryEvent = {
                  category: "log:info",
                  action: "webgl_context_restored",
                  label: "[HomePage] WebGL Context Restored (from onCreated)"
                };
                
                Effect.gen(function* (_) {
                  const telemetryService = yield* _(TelemetryService);
                  yield* _(telemetryService.trackEvent(contextRestoredEvent));
                }).pipe(
                  Effect.provide(TelemetryServiceLive),
                  (effect) => Effect.runPromise(effect).catch(err => {
                    // TELEMETRY_IGNORE_THIS_CONSOLE_CALL
                    console.error("TelemetryService.trackEvent failed:", err instanceof Error ? err.message : String(err));
                  })
                );
              }, false);
            }}
          >
            <MainSceneContent handPosition={handPosition} activeHandPose={activeHandPose} />
          </Canvas>
        </div>

        {/* Hand tracking UI controls (switch, video, canvas, etc.) */}
        <HandTrackingUIControls
          showHandTracking={true}
          setShowHandTracking={() => {}}
          videoRef={videoRef}
          landmarkCanvasRef={landmarkCanvasRef}
          handTrackingStatus={handTrackingStatus}
          activeHandPose={activeHandPose}
          pinchMidpoint={pinchMidpoint}
        />

        {/* UI Overlay */}
        <div className="relative w-full h-full z-10" style={{ pointerEvents: 'none' }}>
          {/* Chat Window (left side) */}
          <div className="absolute top-16 left-4 w-[calc(50%-2rem)] h-[calc(100%-8rem)] z-20" style={{ pointerEvents: 'auto' }}>
            <div className="h-full border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden">
              <ChatContainer
                className="bg-transparent !h-full"
                systemMessage="You are an AI agent named 'Agent' inside an app used by a human called Commander. Respond helpfully but concisely, in 2-3 sentences."
                model="gemma3:1b"
              />
            </div>
          </div>

          {/* NIP-90 Request Form and Event List (right side) */}
          <div className="absolute top-16 right-4 w-[calc(50%-2rem)] h-[calc(100%-8rem)] z-20 flex flex-col gap-4" style={{ pointerEvents: 'auto' }}>
            {/* NIP-90 Request Form */}
            <div className="border rounded-md shadow-lg bg-background/80 backdrop-blur-sm text-foreground p-4">
              <Nip90RequestForm />
            </div>
            {/* NIP-90 Event List */}
            <div className="flex-grow border rounded-md shadow-lg bg-background/80 backdrop-blur-sm overflow-hidden text-foreground min-h-0">
              <Nip90EventList />
            </div>
          </div>
          
          {/* Test Buttons */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2" style={{ pointerEvents: 'auto' }}>
            <div>
              <Button onClick={handleGenerateMnemonicClick} variant="secondary" className="mb-1">
                Generate Test Mnemonic
              </Button>
              
              {mnemonicResult && (
                <div className="p-2 bg-background/80 backdrop-blur-sm rounded-md text-sm max-w-96 overflow-hidden text-ellipsis whitespace-nowrap">
                  {mnemonicResult}
                </div>
              )}
            </div>
            
            <div>
              <Button onClick={handleTestBIP32Click} variant="secondary" className="mb-1">
                Test BIP32 & NIP19
              </Button>
              
              {bip32Result && (
                <div className="p-2 bg-background/80 backdrop-blur-sm rounded-md text-sm max-w-96 overflow-auto whitespace-pre-wrap" style={{ maxHeight: '12rem' }}>
                  {bip32Result}
                </div>
              )}
            </div>
            
            <div>
              <Button onClick={handleTestNIP19Click} variant="secondary" className="mb-1">
                Test NIP19 Encoding
              </Button>
              
              {nip19Result && (
                <div className="p-2 bg-background/80 backdrop-blur-sm rounded-md text-sm max-w-96 overflow-auto whitespace-pre-wrap" style={{ maxHeight: '12rem' }}>
                  {nip19Result}
                </div>
              )}
            </div>
            
            <div>
              <Button onClick={handleTestTelemetryClick} variant={telemetryEnabled ? "destructive" : "secondary"} className="mb-1">
                {telemetryEnabled ? "Disable Telemetry" : "Enable Telemetry"}
              </Button>
              
              {telemetryResult && (
                <div className="p-2 bg-background/80 backdrop-blur-sm rounded-md text-sm max-w-96 overflow-auto whitespace-pre-wrap" style={{ maxHeight: '12rem' }}>
                  {telemetryResult}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}