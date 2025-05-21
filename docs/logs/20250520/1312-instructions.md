Okay, this is a significant feature addition! Let's break it down into manageable steps.

**High-Level Plan:**

1.  **UI - Hotbar Implementation:** Create the `Hotbar` component and migrate existing HUD buttons into it.
2.  **UI - "Sell Compute" Pane:**
    *   Define the new pane type and its basic structure.
    *   Integrate it into the pane management system and make it accessible (e.g., via a new Hotbar button).
3.  **"Sell Compute" Pane Logic - Status Checks:**
    *   Implement status checking for Spark Wallet and Ollama.
    *   Update the UI to reflect these statuses.
4.  **"Sell Compute" Pane Logic - "Go Online" Functionality:**
    *   Implement the online/offline toggle.
5.  **Core DVM Logic - NIP-90 Kind 5050 Handling:**
    *   Create a new Effect service (`Kind5050DVMService`) to manage DVM operations.
    *   Subscribe to Kind 5050 events when "online".
    *   Process incoming requests:
        *   Send "processing" feedback (Kind 7000).
        *   Perform inference via `OllamaService`.
        *   Create an invoice via `SparkService`.
        *   Send results (Kind 6050) with payment request.
        *   Send "success" / "error" feedback (Kind 7000).
6.  **Testing and Typechecking:** Ensure all tests and type checks pass at each logical step.

Let's start with the UI changes.

**Step 1: Create the `Hotbar` Component and Refactor HUD Buttons**

*   Create a new Hotbar component.
*   Move existing HUD buttons into the Hotbar.
*   Add a new button to the Hotbar for opening the "Sell Compute" pane.

```typescript
// File: src/components/hud/HotbarItem.tsx
import React from 'react';
import { cn } from '@/utils/tailwind';

interface HotbarItemProps {
  slotNumber: number;
  onClick?: () => void;
  children?: React.ReactNode;
  title?: string;
  isActive?: boolean;
  className?: string;
}

export const HotbarItem: React.FC<HotbarItemProps> = ({
  slotNumber,
  onClick,
  children,
  title,
  isActive,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title || `Hotbar slot ${slotNumber}`}
      className={cn(
        "relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 border border-border/50 bg-background/70 backdrop-blur-sm rounded-sm shadow-md transition-all duration-150 hover:bg-accent hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
        isActive && "bg-primary/20 border-primary ring-1 ring-primary",
        className
      )}
    >
      {children}
      <span className="absolute bottom-0.5 right-0.5 text-[0.5rem] text-muted-foreground px-0.5 bg-background/50 rounded-sm">
        {slotNumber}
      </span>
    </button>
  );
};

// File: src/components/hud/Hotbar.tsx
import React from 'react';
import { cn } from '@/utils/tailwind';
import { HotbarItem } from './HotbarItem';
import { IconRefresh, Hand, MessageSquarePlus, Cpu, Store } from 'lucide-react'; // Store for Sell Compute
import { usePaneStore } from '@/stores/pane';
import { useUIElementsStore } from '@/stores/uiElementsStore'; // Assuming hand tracking toggle state is here or props passed

interface HotbarProps {
  className?: string;
  isHandTrackingActive: boolean; // Prop needed for HandTrackingToggleButton visual state
  onToggleHandTracking: () => void; // Prop for toggling hand tracking
  onOpenSellComputePane: () => void; // Prop to open the sell compute pane
}

export const Hotbar: React.FC<HotbarProps> = ({ className, isHandTrackingActive, onToggleHandTracking, onOpenSellComputePane }) => {
  const resetHUDState = usePaneStore((state) => state.resetHUDState);
  const createNip28Channel = usePaneStore((state) => state.createNip28ChannelPane);
  const openNip90Dashboard = usePaneStore((state) => state.openNip90DashboardPane);
  // Add active pane ID to determine if Sell Compute pane is active
  const activePaneId = usePaneStore((state) => state.activePaneId);
  const SELL_COMPUTE_PANE_ID = 'sell_compute'; // Define this constant

  const handleCreateChannel = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '');
    const defaultName = `Channel ${timestamp}`;
    createNip28Channel(defaultName);
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10000] flex space-x-1 p-1 bg-background/50 border border-border/30 rounded-md shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <HotbarItem slotNumber={1} onClick={resetHUDState} title="Reset HUD Layout">
        <IconRefresh className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={2} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
        <Hand className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={3} onClick={handleCreateChannel} title="New NIP-28 Channel">
        <MessageSquarePlus className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={4} onClick={openNip90Dashboard} title="NIP-90 DVM Dashboard" isActive={activePaneId === 'nip90-dashboard'}>
        <Cpu className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={5} onClick={onOpenSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID}>
        <Store className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {/* Placeholder for slots 6-9 */}
      {Array.from({ length: 4 }).map((_, index) => (
        <HotbarItem key={`empty-${6 + index}`} slotNumber={6 + index} title={`Slot ${6 + index}`} className="opacity-50 cursor-not-allowed">
          {/* Empty or placeholder icon */}
        </HotbarItem>
      ))}
    </div>
  );
};

// File: src/pages/HomePage.tsx
// Modify HomePage.tsx to use the Hotbar
import React, { useState, useEffect, useRef } from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
// Remove old button imports: ResetHUDButton, HandTrackingToggleButton, NewChannelButton, Nip90DashboardButton
import { HandTracking, HandPose } from "@/components/hands";
import { type PinchCoordinates, type HandLandmarks } from "@/components/hands/handPoseTypes";
import { usePaneStore } from "@/stores/pane";
import { Hotbar } from "@/components/hud/Hotbar"; // Import Hotbar

interface HandDataContext { /* ... (as before) ... */ }
const TITLE_BAR_HEIGHT = 32;

// Define SELL_COMPUTE_PANE_ID if it will be used for isActive check
const SELL_COMPUTE_PANE_ID = 'sell_compute';

export default function HomePage() {
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
  const [handData, setHandData] = useState<HandDataContext | null>(null);
  const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
  const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const { panes, bringPaneToFront, updatePanePosition, activePaneId: currentActivePaneId, openSellComputePane } = usePaneStore(
    (state) => ({
      panes: state.panes,
      bringPaneToFront: state.bringPaneToFront,
      updatePanePosition: state.updatePanePosition,
      activePaneId: state.activePaneId,
      openSellComputePane: state.openSellComputePane, // Ensure this action is available
    })
  );

  const toggleHandTracking = () => { /* ... (as before) ... */ };
  const handleHandDataUpdate = (data: HandDataContext) => { /* ... (as before) ... */ };
  useEffect(() => { /* ... (pinch-to-drag logic as before) ... */ }, [isHandTrackingActive, handData, draggingPaneId, panes, bringPaneToFront, updatePanePosition, currentActivePaneId]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <SimpleGrid />
      <PaneManager />
      <HandTracking
        showHandTracking={isHandTrackingActive}
        setShowHandTracking={setIsHandTrackingActive}
        onHandDataUpdate={handleHandDataUpdate}
      />
      {/* Replace individual buttons with the Hotbar */}
      <Hotbar
        isHandTrackingActive={isHandTrackingActive}
        onToggleHandTracking={toggleHandTracking}
        onOpenSellComputePane={() => {
          // Assuming openSellComputePane is an action in your store
          // If not, you need to add it: openSellComputePaneAction in actions, then to store
          openSellComputePane();
        }}
      />
    </div>
  );
}
```

**Step 2: Create the "Sell Compute" Pane**

```typescript
// File: src/types/pane.ts
// Add 'sell_compute' to Pane.type
export type Pane = {
  id: string;
  type: 'default' | 'chat' | 'chats' | 'user' | 'diff' | 'changelog' | 'nip28_channel' | 'nip90_dashboard' | 'sell_compute' | string; // Added 'sell_compute'
  // ... rest of the type
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive?: boolean;
  dismissable?: boolean;
  content?: {
    oldContent?: string;
    newContent?: string;
    channelId?: string;
    channelName?: string;
    [key: string]: unknown;
  };
}
// PaneInput remains the same

// File: src/components/sell-compute/SellComputePane.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, HelpCircle, Zap, ZapOff } from 'lucide-react'; // Zap for online, ZapOff for offline

const SellComputePane: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false); // Placeholder
  const [isOllamaConnected, setIsOllamaConnected] = useState(false); // Placeholder
  const [isOnline, setIsOnline] = useState(false);

  const handleGoOnline = () => {
    // Placeholder: Actual logic to go online/offline will be added later
    if (isWalletConnected && isOllamaConnected) {
      setIsOnline(!isOnline);
    } else {
      // Notify user to connect wallet/Ollama
      alert("Please connect your wallet and Ollama to go online.");
    }
  };

  const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
  const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-center">Sell Your Compute</CardTitle>
          <CardDescription className="text-center text-xs">
            To sell compute, connect your wallet and Ollama, then click '{isOnline ? "Go Offline" : "Go Online"}'.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div>
              <p className="font-semibold">Wallet Status</p>
              <p className={walletStatusColor}>
                {isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED'}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" title="Connect Wallet (Not Implemented)">
                <PlusCircle className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Wallet Info (Not Implemented)">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div>
              <p className="font-semibold">Ollama Status</p>
              <p className={ollamaStatusColor}>
                {isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED'}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" title="Connect Ollama (Not Implemented)">
                <PlusCircle className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Ollama Info (Not Implemented)">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleGoOnline}
            className="w-full py-3 text-base"
            variant={isOnline ? "destructive" : "default"}
            disabled={!isWalletConnected || !isOllamaConnected && !isOnline} // Disabled if not connected, unless already online (to go offline)
          >
            {isOnline ? (
              <ZapOff className="mr-2 h-5 w-5" />
            ) : (
              <Zap className="mr-2 h-5 w-5" />
            )}
            {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellComputePane;

// File: src/components/sell-compute/index.ts
export { default as SellComputePane } from './SellComputePane';

// File: src/panes/PaneManager.tsx
// Add SellComputePane to imports and render logic
import { SellComputePane } from '@/components/sell-compute'; // Add this import
// ...
// Inside the map function:
// ...
{pane.type === 'sell_compute' && <SellComputePane />}
// Ensure it's added to the exclusion list for the default placeholder too:
// !( ... || pane.type === 'sell_compute' || ... )
// Add it to the list of known pane types for the final fallback:
/*
  ...
  pane.type === 'nip90_dashboard' ||
  pane.type === 'sell_compute' || // Add this line
  pane.type === 'default'
) && <PlaceholderDefaultComponent type={pane.type} />}
*/

// File: src/stores/panes/actions/openSellComputePane.ts (New file)
import { PaneInput } from '@/types/pane';
import { PaneStoreType, SetPaneStore } from '../types';
import { addPaneActionLogic } from './addPane';

export const SELL_COMPUTE_PANE_ID = 'sell_compute';

export function openSellComputePaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const existingPane = state.panes.find(p => p.id === SELL_COMPUTE_PANE_ID);
    if (existingPane) {
      const newPanes = state.panes
        .map(p => ({ ...p, isActive: p.id === SELL_COMPUTE_PANE_ID }))
        .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1));
      return {
        ...state,
        panes: newPanes,
        activePaneId: SELL_COMPUTE_PANE_ID,
        lastPanePosition: {
          x: existingPane.x,
          y: existingPane.y,
          width: existingPane.width,
          height: existingPane.height
        }
      };
    }

    const newPaneInput: PaneInput = {
      id: SELL_COMPUTE_PANE_ID,
      type: 'sell_compute',
      title: 'Sell Compute Power',
      dismissable: true, // Or false if it should be a permanent fixture when open
      // Position it centrally or make it larger by default
      width: 600,
      height: 450,
    };
    const changes = addPaneActionLogic(state, newPaneInput, true); // true for tiling or specific positioning
    return { ...state, ...changes };
  });
}

// File: src/stores/panes/actions/index.ts
// Add export for the new action
export * from './openSellComputePane';

// File: src/stores/panes/types.ts
// Add the new action to PaneStoreType
export interface PaneStoreType extends PaneState {
  // ... existing actions
  openSellComputePane: () => void; // Add this line
}

// File: src/stores/pane.ts
// Import and add the new action to the store
import { /*...,*/ openSellComputePaneAction } from "./panes/actions";
// ...
export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      // ... existing state and actions
      openSellComputePane: () => openSellComputePaneAction(set), // Add this line
      // ...
    }),
    // ... (rest of persist config)
  )
);
```

**Step 3: "Sell Compute" Pane Logic - Status Checks**

```typescript
// File: src/services/spark/SparkService.ts
// Add checkWalletStatus to the interface
export interface SparkService {
  // ... existing methods
  checkWalletStatus(): Effect.Effect<boolean, SparkError | TrackEventError, never>; // True if wallet seems initialized/ready
}

// File: src/services/spark/SparkServiceImpl.ts
// Implement checkWalletStatus
// ... (imports)
export const SparkServiceLive = Layer.scoped(
  SparkService,
  Effect.gen(function* (_) {
    // ... (wallet initialization)
    return {
      // ... existing methods
      checkWalletStatus: () => Effect.gen(function* (_) {
        // A simple check: try to get balance. If it succeeds without throwing an init error,
        // assume wallet is ready. Could be made more specific if SDK offers a direct status check.
        yield* _(telemetry.trackEvent({
          category: 'spark:status',
          action: 'check_wallet_status_start',
        }).pipe(Effect.ignoreLogged));

        try {
          // The existing getBalance already has telemetry, so we don't double-log start/success here
          // but we do want to log the outcome of *this specific check*
          const balanceInfo = yield* _(
            Effect.tryPromise({
              try: () => wallet.getBalance(),
              catch: (e) => new SparkBalanceError({ message: "getBalance failed during status check", cause: e }),
            })
          );
          yield* _(telemetry.trackEvent({
            category: 'spark:status',
            action: 'check_wallet_status_success',
            label: `Wallet ready, balance: ${balanceInfo.balance}`,
          }).pipe(Effect.ignoreLogged));
          return true;
        } catch (error) {
           // Check if the error is due to wallet not being initialized (e.g. SparkConfigError or specific init errors)
          if (error instanceof SparkConfigError || (error instanceof SparkServiceError && error.message.toLowerCase().includes("initialize"))) {
            yield* _(telemetry.trackEvent({
              category: 'spark:status',
              action: 'check_wallet_status_failure_not_initialized',
              label: (error as Error).message,
            }).pipe(Effect.ignoreLogged));
            return false; // Not initialized
          }
          // For other errors (e.g., network), it might be initialized but unreachable
          yield* _(telemetry.trackEvent({
            category: 'spark:status',
            action: 'check_wallet_status_failure_other',
            label: (error as Error).message,
          }).pipe(Effect.ignoreLogged));
          // Consider this as 'not ready' for selling compute, but wallet might be technically initialized
          return false;
        }
      }),
    };
  })
);


// File: src/services/ollama/OllamaService.ts
// Add checkOllamaStatus to the interface
export interface OllamaService {
  // ... existing methods
  checkOllamaStatus(): Effect.Effect<boolean, OllamaHttpError | OllamaParseError, never>; // True if Ollama is reachable
}

// File: src/services/ollama/OllamaServiceImpl.ts
// Implement checkOllamaStatus
// ... (imports)
export function createOllamaService( /*...*/ ): OllamaService {
  return {
    // ... existing methods
    checkOllamaStatus: () => Effect.gen(function* (_) {
      const url = config.baseURL; // Use the base URL (without /chat/completions)
      // Ollama root often returns a string like "Ollama is running"
      const httpRequest = HttpClientRequest.get(url);

      try {
        const response = yield* _(
          httpClient.execute(httpRequest),
          Effect.mapError(httpClientError =>
            new OllamaHttpError(
              `HTTP request failed for Ollama status check: ${httpClientError._tag || "Unknown error"}`,
              httpRequest,
              httpClientError
            )
          )
        );
        // Ollama root usually returns 200 OK with a plain text message
        if (response.status === 200) {
          const textResponse = yield* _(response.text, Effect.mapError(e => new OllamaParseError("Failed to parse Ollama status text response", e)));
          if (textResponse.toLowerCase().includes("ollama is running")) {
            return true;
          }
          return false; // Unexpected content
        }
        return false; // Unexpected status code
      } catch (error) {
        // This will catch mapped OllamaHttpError or OllamaParseError from above
        return false;
      }
    }),
  };
}

// File: src/components/sell-compute/SellComputePane.tsx
// Update to use status checks
import React, { useState, useEffect } from 'react';
// ... (other imports: Button, Card, icons, etc.)
import { SparkService } from '@/services/spark';
import { OllamaService } from '@/services/ollama';
import { getMainRuntime } from '@/services/runtime';
import { Effect } from 'effect';
import { runPromiseExit, Exit, Cause } from 'effect/Effect';

const SellComputePane: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [statusLoading, setStatusLoading] = useState({ wallet: true, ollama: true });

  const runtime = getMainRuntime();

  const checkStatuses = React.useCallback(async () => {
    setStatusLoading({ wallet: true, ollama: true });

    // Check Wallet Status
    const walletProgram = Effect.flatMap(SparkService, s => s.checkWalletStatus());
    runPromiseExit(Effect.provide(walletProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsWalletConnected(exit.value);
      else console.error("Wallet status check failed:", Cause.squash(exit.cause));
      setStatusLoading(s => ({ ...s, wallet: false }));
    });

    // Check Ollama Status
    const ollamaProgram = Effect.flatMap(OllamaService, s => s.checkOllamaStatus());
    runPromiseExit(Effect.provide(ollamaProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsOllamaConnected(exit.value);
      else console.error("Ollama status check failed:", Cause.squash(exit.cause));
      setStatusLoading(s => ({ ...s, ollama: false }));
    });
  }, [runtime]);

  useEffect(() => {
    checkStatuses();
  }, [checkStatuses]);

  // ... (handleGoOnline, walletStatusColor, ollamaStatusColor, JSX as before, but use statusLoading for UI feedback)
  // Example for status display:
  /*
    <p className={walletStatusColor}>
      {statusLoading.wallet ? 'Checking...' : isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED'}
    </p>
  */
 // ... rest of SellComputePane.tsx implementation ...
  const handleGoOnline = () => {
    if (isWalletConnected && isOllamaConnected) {
      setIsOnline(!isOnline);
      // TODO: Call Kind5050DVMService.startListening() or stopListening()
    } else {
      alert("Please connect your wallet and Ollama to go online.");
    }
  };

  const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
  const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-center">Sell Your Compute</CardTitle>
          <CardDescription className="text-center text-xs">
            To sell compute, connect your wallet and Ollama, then click '{isOnline ? "Go Offline" : "Go Online"}'.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div>
              <p className="font-semibold">Wallet Status</p>
              <p className={walletStatusColor}>{walletStatusText}</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" title="Connect Wallet (Not Implemented)" onClick={checkStatuses} disabled={statusLoading.wallet}>
                {statusLoading.wallet ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div> : <PlusCircle className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Wallet Info (Not Implemented)">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div>
              <p className="font-semibold">Ollama Status</p>
              <p className={ollamaStatusColor}>{ollamaStatusText}</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" title="Connect Ollama (Not Implemented)" onClick={checkStatuses} disabled={statusLoading.ollama}>
                 {statusLoading.ollama ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div> : <PlusCircle className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Ollama Info (Not Implemented)">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleGoOnline}
            className="w-full py-3 text-base"
            variant={isOnline ? "destructive" : "default"}
            disabled={(statusLoading.wallet || statusLoading.ollama || (!isWalletConnected || !isOllamaConnected)) && !isOnline}
          >
            {isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />}
            {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// No default export, already handled in components/sell-compute/index.ts
```

**Next Steps:**

*   Implement the `Kind5050DVMService`.
*   Connect the "GO ONLINE" button to `Kind5050DVMService.startListening()` and `stopListening()`.
*   Flesh out the "Connect Wallet" and "Connect Ollama" UI/flow if needed beyond status checks.
*   Thorough testing.

I will pause here. The DVM logic is substantial and should be a separate step.
The UI for the Hotbar and the basic "Sell Compute" pane with status checks is now in place. The next instructions should focus on the `Kind5050DVMService` implementation.
`pnpm test` and `pnpm run t` should be run. I expect some tests might fail due to changes in `HomePage.tsx` (button removals) and new components needing basic tests. Also, the new service methods need tests.

A quick test for the new Hotbar items and the Sell Compute pane in `HomePage.test.tsx` would be good.
Example:
```typescript
// src/tests/unit/pages/HomePage.test.tsx
// ...
it('renders Hotbar with expected items', () => {
  renderComponent();
  expect(screen.getByRole('button', { name: /Reset HUD Layout/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Enable Hand Tracking/i })).toBeInTheDocument(); // Initial title
  expect(screen.getByRole('button', { name: /New NIP-28 Channel/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /NIP-90 DVM Dashboard/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Sell Compute/i })).toBeInTheDocument();
});

it('opens Sell Compute pane when Hotbar item is clicked', async () => {
  renderComponent();
  const sellComputeButton = screen.getByRole('button', { name: /Sell Compute/i });
  fireEvent.click(sellComputeButton);
  // Check if the usePaneStore().openSellComputePane action was called or if the pane appears
  // This requires mocking usePaneStore or checking for pane content
  // For now, let's assume the action is called.
  // If openSellComputePane is a mock: expect(usePaneStore().openSellComputePane).toHaveBeenCalled();
  // Or, check if the "Sell Your Compute" title appears if the pane is rendered
  await waitFor(() => {
    expect(screen.getByText(/Sell Your Compute/i)).toBeInTheDocument();
  });
});
```
This example test for `HomePage.test.tsx` will need `usePaneStore` to be mocked appropriately, or the `SellComputePane` to be rendered and its title checked.Okay, Agent, the plan and execution are looking good so far. Let's proceed with the new "Sell Compute" feature.

**Implementation Steps:**

**Phase 1: UI - Hotbar and "Sell Compute" Pane Shell**

1.  **Create `Hotbar.tsx` and `HotbarItem.tsx` Components:**
    *   Define `HotbarItemProps` and the `HotbarItem` component.
    *   Define `HotbarProps` and the `Hotbar` component, which will render `HotbarItem`s for existing HUD actions and the new "Sell Compute" action.
2.  **Refactor `HomePage.tsx`:**
    *   Remove the direct rendering of `ResetHUDButton`, `HandTrackingToggleButton`, `NewChannelButton`, `Nip90DashboardButton`.
    *   Import and render the new `Hotbar` component, passing necessary props (like hand tracking state/toggle and the action to open the sell compute pane).
3.  **Define "Sell Compute" Pane Type and Store Actions:**
    *   Add `'sell_compute'` to `Pane.type` in `src/types/pane.ts`.
    *   Create `src/stores/panes/actions/openSellComputePane.ts` with `openSellComputePaneAction` and `SELL_COMPUTE_PANE_ID`. This action should add a new pane of type `'sell_compute'` or bring an existing one to the front.
    *   Export this action from `src/stores/panes/actions/index.ts`.
    *   Add `openSellComputePane: () => void;` to `PaneStoreType` in `src/stores/panes/types.ts`.
    *   Integrate the action into `usePaneStore` in `src/stores/pane.ts`.
4.  **Create `SellComputePane.tsx` Component:**
    *   Implement the basic structure of the "Sell Compute" pane as shown in the image (title, wallet status text, Ollama status text, "GO ONLINE" button, descriptive text). Use placeholder states for `isWalletConnected`, `isOllamaConnected`, `isOnline`.
    *   Use Lucide icons (`PlusCircle`, `HelpCircle`, `Zap`, `ZapOff`) for buttons/indicators.
5.  **Integrate `SellComputePane` into `PaneManager.tsx`:**
    *   Import `SellComputePane`.
    *   Add a case in `PaneManager.tsx` to render `SellComputePane` when `pane.type === 'sell_compute'`.

**Phase 2: "Sell Compute" Pane Logic - Status Checks**

1.  **Enhance `SparkService`:**
    *   Add `checkWalletStatus(): Effect.Effect<boolean, SparkError | TrackEventError, never>` to the `SparkService` interface.
    *   Implement `checkWalletStatus` in `SparkServiceImpl.ts`. This could try a lightweight, non-modifying operation like `getBalance` internally. If successful, return `true`. Log telemetry for the check.
2.  **Enhance `OllamaService`:**
    *   Add `checkOllamaStatus(): Effect.Effect<boolean, OllamaHttpError | OllamaParseError, never>` to the `OllamaService` interface.
    *   Implement `checkOllamaStatus` in `OllamaServiceImpl.ts`. This could make a request to the Ollama base URL (e.g., `http://localhost:11434/`) which usually returns "Ollama is running".
3.  **Update `SellComputePane.tsx`:**
    *   Use `useEffect` and `useCallback` to call `SparkService.checkWalletStatus()` and `OllamaService.checkOllamaStatus()` on mount and when a "refresh status" button (e.g., the `PlusCircle` icon) is clicked.
    *   Update `isWalletConnected` and `isOllamaConnected` state based on the results.
    *   Display "Checking..." or similar loading state while statuses are being fetched.

**Phase 3: "Sell Compute" Pane Logic - "Go Online" Functionality**

1.  **Implement Online/Offline State in `SellComputePane.tsx`:**
    *   The `isOnline` state is already present.
    *   The "GO ONLINE" / "GO OFFLINE" button should toggle this state.
    *   The button should be disabled if `isWalletConnected` or `isOllamaConnected` is `false` (unless `isOnline` is true, allowing the user to go offline).
    *   This state will later control the DVM service's listening activity.

**Phase 4: Core DVM Logic - NIP-90 Kind 5050 Handling (Service Stub)**

1.  **Create `Kind5050DVMService` (Interface and Stub Implementation):**
    *   **File:** `src/services/dvm/Kind5050DVMService.ts`
        *   Define `Kind5050DVMServiceConfig` (e.g., DVM secret key, relays to use, default pricing model).
        *   Define `Kind5050DVMService` interface:
            *   `startListening(): Effect.Effect<void, DVMError, /* Dependencies */>`
            *   `stopListening(): Effect.Effect<void, DVMError, /* Dependencies */>`
            *   `isListening(): Effect.Effect<boolean, DVMError, /* Dependencies */>`
        *   Define `DVMError` types.
    *   **File:** `src/services/dvm/Kind5050DVMServiceImpl.ts`
        *   Create a stub implementation for `Kind5050DVMServiceLive` that depends on `NostrService`, `OllamaService`, `SparkService`, `TelemetryService`, `Kind5050DVMServiceConfig`.
        *   `startListening` would log "DVM started listening".
        *   `stopListening` would log "DVM stopped listening".
        *   `isListening` would return a placeholder boolean.
2.  **Integrate `Kind5050DVMService` into `src/services/runtime.ts`:**
    *   Add it to `FullAppContext` and `FullAppLayer`.
3.  **Update `SellComputePane.tsx` "Go Online" Button:**
    *   When toggling `isOnline`, call `Kind5050DVMService.startListening()` or `stopListening()` via `getMainRuntime()`.

**Phase 5: Implement NIP-90 Kind 5050 Request Processing**

This is the most complex part and will be detailed further if Phase 1-4 are successful. It involves:
*   Subscribing to Nostr kind 5050 events.
*   Parsing job requests.
*   Sending "processing" feedback (Kind 7000).
*   Using `OllamaService` for inference.
*   Using `SparkService` to create invoices.
*   Sending job results (Kind 6050) and final feedback (Kind 7000).

Let's proceed with Phase 1. I will generate the code for the Hotbar and the initial "Sell Compute" pane structure.```typescript
// File: src/components/hud/HotbarItem.tsx
import React from 'react';
import { cn } from '@/utils/tailwind';

interface HotbarItemProps {
  slotNumber: number;
  onClick?: () => void;
  children?: React.ReactNode;
  title?: string;
  isActive?: boolean;
  className?: string;
}

export const HotbarItem: React.FC<HotbarItemProps> = ({
  slotNumber,
  onClick,
  children,
  title,
  isActive,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title || `Hotbar slot ${slotNumber}`}
      className={cn(
        "relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 border border-border/50 bg-background/70 backdrop-blur-sm rounded-sm shadow-md transition-all duration-150 hover:bg-accent hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
        isActive && "bg-primary/20 border-primary ring-1 ring-primary",
        className
      )}
    >
      {children}
      <span className="absolute bottom-0.5 right-0.5 text-[0.5rem] text-muted-foreground px-0.5 bg-background/50 rounded-sm">
        {slotNumber}
      </span>
    </button>
  );
};

// File: src/components/hud/Hotbar.tsx
import React from 'react';
import { cn } from '@/utils/tailwind';
import { HotbarItem } from './HotbarItem';
import { RefreshCw, Hand, MessageSquarePlus, Cpu, Store } from 'lucide-react'; // RefreshCw for reset
import { usePaneStore } from '@/stores/pane';
// Removed useUIElementsStore as hand tracking state will be passed via props

interface HotbarProps {
  className?: string;
  isHandTrackingActive: boolean;
  onToggleHandTracking: () => void;
  onOpenSellComputePane: () => void;
}

export const Hotbar: React.FC<HotbarProps> = ({ className, isHandTrackingActive, onToggleHandTracking, onOpenSellComputePane }) => {
  const resetHUDState = usePaneStore((state) => state.resetHUDState);
  const createNip28Channel = usePaneStore((state) => state.createNip28ChannelPane);
  const openNip90Dashboard = usePaneStore((state) => state.openNip90DashboardPane);
  const activePaneId = usePaneStore((state) => state.activePaneId);
  const SELL_COMPUTE_PANE_ID = 'sell_compute';

  const handleCreateChannel = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '');
    const defaultName = `Channel ${timestamp}`;
    createNip28Channel(defaultName);
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10000] flex space-x-1 p-1 bg-background/50 border border-border/30 rounded-md shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <HotbarItem slotNumber={1} onClick={resetHUDState} title="Reset HUD Layout">
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={2} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
        <Hand className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={3} onClick={handleCreateChannel} title="New NIP-28 Channel">
        <MessageSquarePlus className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={4} onClick={openNip90Dashboard} title="NIP-90 DVM Dashboard" isActive={activePaneId === 'nip90-dashboard'}>
        <Cpu className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={5} onClick={onOpenSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID}>
        <Store className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {Array.from({ length: 4 }).map((_, index) => (
        <HotbarItem key={`empty-${6 + index}`} slotNumber={6 + index} title={`Slot ${6 + index}`} className="opacity-30 cursor-not-allowed hover:bg-background/70">
          <div className="w-5 h-5 text-muted-foreground/50"></div>
        </HotbarItem>
      ))}
    </div>
  );
};

// File: src/pages/HomePage.tsx
import React, { useState, useEffect, useRef } from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
// Removed direct button imports
import { HandTracking, HandPose } from "@/components/hands";
import { type PinchCoordinates, type HandLandmarks } from "@/components/hands/handPoseTypes";
import { usePaneStore } from "@/stores/pane";
import { Hotbar } from "@/components/hud/Hotbar"; // Import Hotbar

interface HandDataContext {
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
  primaryHandLandmarks: HandLandmarks | null;
  trackedHandsCount: number;
}

const TITLE_BAR_HEIGHT = 32;
// const SELL_COMPUTE_PANE_ID = 'sell_compute'; // Defined in Hotbar, can be passed or imported if needed elsewhere

export default function HomePage() {
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
  const [handData, setHandData] = useState<HandDataContext | null>(null);
  const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
  const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const { panes, bringPaneToFront, updatePanePosition, activePaneId, openSellComputePane } = usePaneStore(
    (state) => ({
      panes: state.panes,
      bringPaneToFront: state.bringPaneToFront,
      updatePanePosition: state.updatePanePosition,
      activePaneId: state.activePaneId,
      openSellComputePane: state.openSellComputePane,
    })
  );

  const toggleHandTracking = () => {
    const newState = !isHandTrackingActive;
    setIsHandTrackingActive(newState);
    if (!newState && draggingPaneId) {
      setDraggingPaneId(null);
      initialPinchPositionRef.current = null;
      paneStartPosRef.current = null;
    }
  };

  const prevHandDataRef = useRef<HandDataContext | null>(null);
  const handleHandDataUpdate = (data: HandDataContext) => {
    if (!prevHandDataRef.current ||
        data.activeHandPose !== prevHandDataRef.current.activeHandPose ||
        data.trackedHandsCount !== prevHandDataRef.current.trackedHandsCount ||
        JSON.stringify(data.pinchMidpoint) !== JSON.stringify(prevHandDataRef.current.pinchMidpoint)) {
      prevHandDataRef.current = data;
      setHandData(data);
    }
  };

  useEffect(() => {
    if (!isHandTrackingActive || !handData || !handData.pinchMidpoint || handData.trackedHandsCount === 0) {
      if (draggingPaneId) {
        setDraggingPaneId(null);
        initialPinchPositionRef.current = null;
        paneStartPosRef.current = null;
      }
      return;
    }

    const { activeHandPose, pinchMidpoint } = handData;

    if (activeHandPose === HandPose.PINCH_CLOSED) {
      if (!draggingPaneId) {
        for (let i = panes.length - 1; i >= 0; i--) {
          const pane = panes[i];
          if (
            pinchMidpoint.x >= pane.x &&
            pinchMidpoint.x <= pane.x + pane.width &&
            pinchMidpoint.y >= pane.y &&
            pinchMidpoint.y <= pane.y + TITLE_BAR_HEIGHT
          ) {
            setDraggingPaneId(pane.id);
            paneStartPosRef.current = { x: pane.x, y: pane.y };
            initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
            if (pane.id !== activePaneId) {
              bringPaneToFront(pane.id);
            }
            break;
          }
        }
      } else if (initialPinchPositionRef.current && paneStartPosRef.current) {
        const deltaX = pinchMidpoint.x - initialPinchPositionRef.current.x;
        const deltaY = pinchMidpoint.y - initialPinchPositionRef.current.y;
        if (Math.abs(deltaX) >= 1 || Math.abs(deltaY) >= 1) {
          const newX = paneStartPosRef.current.x + deltaX;
          const newY = paneStartPosRef.current.y + deltaY;
          initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
          paneStartPosRef.current = { x: newX, y: newY };
          updatePanePosition(draggingPaneId, newX, newY);
        }
      }
    } else {
      if (draggingPaneId) {
        setDraggingPaneId(null);
        initialPinchPositionRef.current = null;
        paneStartPosRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHandTrackingActive, handData, draggingPaneId]);


  return (
    <div className="relative w-full h-full overflow-hidden">
      <SimpleGrid />
      <PaneManager />
      <HandTracking
        showHandTracking={isHandTrackingActive}
        setShowHandTracking={setIsHandTrackingActive} // This prop might not be used by HandTracking if toggle is external
        onHandDataUpdate={handleHandDataUpdate}
      />
      <Hotbar
        isHandTrackingActive={isHandTrackingActive}
        onToggleHandTracking={toggleHandTracking}
        onOpenSellComputePane={openSellComputePane}
      />
    </div>
  );
}

// File: src/types/pane.ts
// Add 'sell_compute' to Pane.type
export type Pane = {
  id: string;
  type: 'default' | 'chat' | 'chats' | 'user' | 'diff' | 'changelog' | 'nip28_channel' | 'nip90_dashboard' | 'sell_compute' | string; // Added 'sell_compute'
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive?: boolean;
  dismissable?: boolean;
  content?: {
    oldContent?: string;
    newContent?: string;
    channelId?: string;
    channelName?: string;
    [key: string]: unknown;
  };
}
// PaneInput remains the same

// File: src/stores/panes/actions/openSellComputePane.ts
import { PaneInput } from '@/types/pane';
import { PaneStoreType, SetPaneStore } from '../types';
import { addPaneActionLogic } from './addPane'; // Assuming this provides logic without calling set directly
import { DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT } from '../constants';


export const SELL_COMPUTE_PANE_ID = 'sell_compute';

export function openSellComputePaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const existingPane = state.panes.find(p => p.id === SELL_COMPUTE_PANE_ID);
    if (existingPane) {
      // Bring to front and activate if already exists
      const newPanes = state.panes
        .map(p => ({ ...p, isActive: p.id === SELL_COMPUTE_PANE_ID }))
        .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1)); // crude bring to front

      return {
        ...state,
        panes: newPanes,
        activePaneId: SELL_COMPUTE_PANE_ID,
        lastPanePosition: {
          x: existingPane.x,
          y: existingPane.y,
          width: existingPane.width,
          height: existingPane.height
        }
      };
    }

    // Add new pane - position it centrally or make it larger by default
    const newPaneInput: PaneInput = {
      id: SELL_COMPUTE_PANE_ID,
      type: 'sell_compute',
      title: 'Sell Compute Power',
      dismissable: true,
      width: Math.max(DEFAULT_PANE_WIDTH, 600),  // Larger default
      height: Math.max(DEFAULT_PANE_HEIGHT, 450), // Larger default
      // x, y will be calculated by addPaneActionLogic if not provided
    };
    const changes = addPaneActionLogic(state, newPaneInput, true); // true for tiling or specific positioning logic

    // Ensure new pane is active
    if (changes.panes && changes.activePaneId) {
        changes.panes = changes.panes.map(p => ({...p, isActive: p.id === changes.activePaneId}));
    }

    return { ...state, ...changes };
  });
}

// File: src/stores/panes/actions/index.ts
export * from './addPane';
export * from './removePane';
export * from './updatePanePosition';
export * from './updatePaneSize';
export * from './bringPaneToFront';
export * from './setActivePane';
export * from './openChatPane';
export * from './createNip28ChannelPane';
export * from './openNip90DashboardPane';
export * from './openSellComputePane'; // Add this export

// File: src/stores/panes/types.ts
import { Pane, PaneInput } from '@/types/pane';
// ... (other imports)
export interface PaneStoreType extends PaneState {
  // ... existing actions
  openSellComputePane: () => void; // Add this line
}
// SetPaneStore and GetPaneStore remain the same

// File: src/stores/pane.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// ... (other imports)
import {
  // ...
  openSellComputePaneAction, // Import new action
} from "./panes/actions";
// ... (getInitialPanes, initialState as before, or update to include sell_compute)

export const usePaneStore = create<PaneStoreType>()(
  persist(
    (set, get) => ({
      ...initialState,
      // ... existing actions
      openSellComputePane: () => openSellComputePaneAction(set), // Add this line
    }),
    // ... (rest of persist config)
  )
);


// File: src/components/sell-compute/SellComputePane.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, HelpCircle, Zap, ZapOff, Wifi, WifiOff, RefreshCcw } from 'lucide-react'; // Wifi icons for status
import { SparkService, SparkError } from '@/services/spark';
import { OllamaService, OllamaHttpError, OllamaParseError } from '@/services/ollama';
import { getMainRuntime } from '@/services/runtime';
import { Effect } from 'effect';
import { runPromiseExit, Exit, Cause } from 'effect/Effect';

const SellComputePane: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [statusLoading, setStatusLoading] = useState({ wallet: false, ollama: false });

  const runtime = getMainRuntime();

  const checkWalletStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, wallet: true }));
    const walletProgram = Effect.flatMap(SparkService, s => s.checkWalletStatus());
    runPromiseExit(Effect.provide(walletProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsWalletConnected(exit.value);
      else {
        console.error("Wallet status check failed:", Cause.squash(exit.cause));
        setIsWalletConnected(false);
      }
      setStatusLoading(s => ({ ...s, wallet: false }));
    });
  }, [runtime]);

  const checkOllamaStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, ollama: true }));
    const ollamaProgram = Effect.flatMap(OllamaService, s => s.checkOllamaStatus());
    runPromiseExit(Effect.provide(ollamaProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsOllamaConnected(exit.value);
      else {
        console.error("Ollama status check failed:", Cause.squash(exit.cause));
        setIsOllamaConnected(false);
      }
      setStatusLoading(s => ({ ...s, ollama: false }));
    });
  }, [runtime]);

  useEffect(() => {
    checkWalletStatus();
    checkOllamaStatus();
  }, [checkWalletStatus, checkOllamaStatus]);

  const handleGoOnline = () => {
    if (isWalletConnected && isOllamaConnected) {
      setIsOnline(!isOnline);
      // TODO: Call Kind5050DVMService.startListening() or stopListening()
      console.log(`Compute selling ${!isOnline ? 'started' : 'stopped'}`);
    } else {
      alert("Please connect your wallet and Ollama to go online.");
    }
  };

  const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
  const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-center text-lg">Sell Compute Power</CardTitle> {/* Larger Title */}
        </CardHeader>
        <CardContent className="space-y-4"> {/* Reduced space-y */}
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
              {isWalletConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Wallet</p>
                <p className={cn("text-xs", walletStatusColor)}>{walletStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Wallet Status" onClick={checkWalletStatus} disabled={statusLoading.wallet}>
                 {statusLoading.wallet ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              {/* Replace PlusCircle with a more relevant icon or action if connection is manual */}
              <Button variant="ghost" size="icon" title="Connect Wallet (Not Implemented)"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
             {isOllamaConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Ollama</p>
                <p className={cn("text-xs", ollamaStatusColor)}>{ollamaStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Ollama Status" onClick={checkOllamaStatus} disabled={statusLoading.ollama}>
                 {statusLoading.ollama ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Ollama Info (Not Implemented)"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <CardDescription className="text-center text-xs px-2 pt-2">
            To sell compute, connect your wallet and Ollama, then click '{isOnline ? "Go Offline" : "Go Online"}'.
          </CardDescription>

          <Button
            onClick={handleGoOnline}
            className="w-full py-3 text-base"
            variant={isOnline ? "outline" : "default"} // Changed offline to outline
            disabled={(statusLoading.wallet || statusLoading.ollama || (!isWalletConnected || !isOllamaConnected)) && !isOnline}
          >
            {isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />}
            {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
export default SellComputePane;


// File: src/components/sell-compute/index.ts
export { default as SellComputePane } from './SellComputePane';

// File: src/panes/PaneManager.tsx
import { SellComputePane } from '@/components/sell-compute'; // Add this import
// ...
// Inside the map function:
/*
  ...
  {pane.type === 'sell_compute' && <SellComputePane />}
  ...
*/
// Add 'sell_compute' to the exclusion list for the default placeholder:
/*
  ...
  !(
    pane.type === 'chat' ||
    // ... other types
    pane.type === 'sell_compute' || // Add this
    pane.type === 'default'
  ) && <PlaceholderDefaultComponent type={pane.type} />
*/

// File: src/services/spark/SparkService.ts
// Add checkWalletStatus to the interface
export interface SparkService {
  createLightningInvoice(
    params: CreateLightningInvoiceParams
  ): Effect.Effect<LightningInvoice, SparkError | TrackEventError, never>;

  payLightningInvoice(
    params: PayLightningInvoiceParams
  ): Effect.Effect<LightningPayment, SparkError | TrackEventError, never>;

  getBalance(): Effect.Effect<
    BalanceInfo,
    SparkError | TrackEventError,
    never
  >;

  getSingleUseDepositAddress(): Effect.Effect<string, SparkError | TrackEventError, never>;
  checkWalletStatus(): Effect.Effect<boolean, SparkError | TrackEventError, never>; // Added
}
// Other types and tags remain the same

// File: src/services/spark/SparkServiceImpl.ts
// Implement checkWalletStatus
// ... (imports)
export const SparkServiceLive = Layer.scoped(
  SparkService,
  Effect.gen(function* (_) {
    const sparkConfig = yield* _(SparkServiceConfigTag);
    const telemetry = yield* _(TelemetryService);
    const wallet = yield* _(
      Effect.tryPromise({
        // ... (wallet initialization) ...
      })
    );
    yield* _(Effect.addFinalizer(() => { /* ... */ }));

    return {
      // ... (existing methods createLightningInvoice, payLightningInvoice, getBalance, getSingleUseDepositAddress)
      checkWalletStatus: () => Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({
          category: 'spark:status', action: 'check_wallet_status_start',
        }).pipe(Effect.ignoreLogged));

        try {
          // Attempting getBalance is a reasonable way to check if wallet is operational
          const balanceInfoSDK = yield* _(
            Effect.tryPromise({
              try: () => wallet.getBalance(), // Use the initialized wallet instance
              catch: (e) => new SparkBalanceError({ message: "getBalance failed during status check", cause: e }),
            })
          );
          // If getBalance succeeds, consider wallet connected and ready
          yield* _(telemetry.trackEvent({
            category: 'spark:status', action: 'check_wallet_status_success',
            label: `Wallet ready, balance: ${balanceInfoSDK.balance}`,
          }).pipe(Effect.ignoreLogged));
          return true;
        } catch (error) {
          const sparkError = error as SparkError; // Type assertion
          if (sparkError instanceof SparkConfigError || (sparkError instanceof SparkServiceError && sparkError.message.toLowerCase().includes("initialize"))) {
            yield* _(telemetry.trackEvent({
              category: 'spark:status', action: 'check_wallet_status_failure_not_initialized',
              label: sparkError.message,
            }).pipe(Effect.ignoreLogged));
            return false;
          }
          yield* _(telemetry.trackEvent({
            category: 'spark:status', action: 'check_wallet_status_failure_other',
            label: sparkError.message,
          }).pipe(Effect.ignoreLogged));
          return false;
        }
      }),
    };
  })
);

// File: src/services/ollama/OllamaService.ts
// Add checkOllamaStatus to the interface
export interface OllamaService {
  generateChatCompletion(
    request: OllamaChatCompletionRequest
  ): Effect.Effect<OllamaChatCompletionResponse, OllamaHttpError | OllamaParseError, never>;

  generateChatCompletionStream(
    request: OllamaChatCompletionRequest
  ): Stream.Stream<OllamaOpenAIChatStreamChunk, OllamaHttpError | OllamaParseError, never>;

  checkOllamaStatus(): Effect.Effect<boolean, OllamaHttpError | OllamaParseError, never>; // Added
}
// Other types and tags remain the same

// File: src/services/ollama/OllamaServiceImpl.ts
// Implement checkOllamaStatus
// ... (imports)
export function createOllamaService(
    config: OllamaServiceConfig,
    httpClient: HttpClientService // Use the aliased type
): OllamaService {
    const makeUrl = (path: string) => `${config.baseURL}${path}`;

    return {
      // ... (existing methods generateChatCompletion, generateChatCompletionStream)
      checkOllamaStatus: () => Effect.gen(function* (_) {
        const url = config.baseURL.replace("/v1", ""); // Ollama root is often one level up from /v1
        const httpRequest = HttpClientRequest.get(url);

        try {
          const response = yield* _(
            httpClient.execute(httpRequest), // Use the injected httpClient
            Effect.mapError(httpClientError =>
              new OllamaHttpError(
                `HTTP request failed for Ollama status check: ${httpClientError._tag || "Unknown error"}`,
                httpRequest,
                httpClientError
              )
            )
          );

          if (response.status === 200) {
            const textResponse = yield* _(response.text, Effect.mapError(e => new OllamaParseError("Failed to parse Ollama status text response", e)));
            return textResponse.toLowerCase().includes("ollama is running");
          }
          return false;
        } catch (error) {
          return false; // Any error means not connected/reachable
        }
      }),
    };
}
// OllamaServiceLive remains the same
```

**Notes on the implementation:**

*   **Hotbar:** A new `Hotbar.tsx` and `HotbarItem.tsx` are created. `HomePage.tsx` is updated to use `Hotbar` and passes down `isHandTrackingActive` and `onToggleHandTracking` as props. A new prop `onOpenSellComputePane` is added for the "Sell Compute" button.
*   **Sell Compute Pane:**
    *   `'sell_compute'` type added to `Pane`.
    *   `SellComputePane.tsx` created with placeholders for status and the "GO ONLINE" button.
    *   Integrated into `PaneManager.tsx`.
    *   Store actions (`openSellComputePaneAction`, etc.) added to `usePaneStore`.
*   **Status Checks:**
    *   `SparkService.checkWalletStatus()`: Implemented by attempting `getBalance`. If successful, wallet is considered ready. It logs telemetry.
    *   `OllamaService.checkOllamaStatus()`: Implemented by fetching the Ollama base URL and checking for "Ollama is running" in the response.
    *   `SellComputePane.tsx` uses these new service methods with `useEffect` and `useCallback` to update its local state and UI. Loading states are added. Refresh buttons now use `RefreshCcw` and status indicators use `Wifi`/`WifiOff`.
*   The logic for DVM operations (`Kind5050DVMService`) is deferred to the next step as it's substantial.
*   The placeholder icons in the "Sell Compute" pane for Wallet/Ollama actions have been simplified to a refresh button for status and a help icon. The `PlusCircle` was a bit ambiguous.

**Next Steps:**

1.  **Implement `Kind5050DVMService`:** This will be the core of the compute-selling functionality.
    *   Define its config (DVM Nostr keys, pricing, offered models).
    *   Implement `startListening` to subscribe to kind 5050 events via `NostrService`.
    *   Implement `stopListening`.
    *   Implement `processJobRequest` to handle incoming 5050 events (send feedback, use Ollama, use Spark, send results).
2.  **Connect "GO ONLINE" Button:** Wire it up to `Kind5050DVMService.startListening/stopListening`.
3.  **Testing:** Add unit tests for new services, methods, and components. Update E2E tests if necessary.
4.  **Refinements:** UI for actual wallet/Ollama connection (if not just status), DVM configuration UI, error display improvements.

This completes Phases 1, 2, and 3 (partially, "Go Online" button logic is stubbed). Phase 4 stubs out the DVM service. Phase 5 is next.```mermaid
graph TD
    A[Start] --> B{Parse Image};
    B --> C{Understand Request};
    C --> D{Break Down into Tasks};
    D --> E{Task 1: Hotbar UI};
    E --> F{Create HotbarItem.tsx};
    F --> G{Create Hotbar.tsx};
    G --> H{Refactor HomePage.tsx};
    D --> I{Task 2: Sell Compute Pane UI};
    I --> J{Update types/pane.ts};
    J --> K{Create stores/panes/actions/openSellComputePane.ts};
    K --> L{Update stores/panes/actions/index.ts};
    L --> M{Update stores/panes/types.ts};
    M --> N{Update stores/pane.ts};
    N --> O{Create components/sell-compute/SellComputePane.tsx};
    O --> P{Create components/sell-compute/index.ts};
    P --> Q{Update panes/PaneManager.tsx};
    D --> R{Task 3: Sell Compute Pane Logic - Status};
    R --> S{Enhance SparkService (checkWalletStatus)};
    S --> T{Implement in SparkServiceImpl.ts};
    T --> U{Enhance OllamaService (checkOllamaStatus)};
    U --> V{Implement in OllamaServiceImpl.ts};
    V --> W{Update SellComputePane.tsx with status logic};
    D --> X{Task 4: "Go Online" Logic Stub};
    X --> Y{Update SellComputePane.tsx for isOnline state};
    Y --> Z{Prepare for DVM Service (Conceptual)};
    D --> AA{Task 5: NIP-90 Kind 5050 DVM Service Stub};
    AA --> AB{Create services/dvm/Kind5050DVMService.ts (Interface)};
    AB --> AC{Create services/dvm/Kind5050DVMServiceImpl.ts (Stub)};
    AC --> AD{Integrate into services/runtime.ts};
    AD --> AE{Connect "Go Online" to DVM service stubs};
    AE --> AF{End of Current Batch - Ready for DVM Logic};
    AF --> AG[Output Code];
```

**Phase 1: UI - Hotbar and "Sell Compute" Pane Shell**

**1. Create `Hotbar.tsx` and `HotbarItem.tsx` Components**
**2. Refactor `HomePage.tsx`**
**3. Define "Sell Compute" Pane Type and Store Actions**
**4. Create `SellComputePane.tsx` Component**
**5. Integrate `SellComputePane` into `PaneManager.tsx`**

*(Generating code for Phase 1 based on the detailed plan)*

```typescript
// File: src/components/hud/HotbarItem.tsx
import React from 'react';
import { cn } from '@/utils/tailwind';

interface HotbarItemProps {
  slotNumber: number;
  onClick?: () => void;
  children?: React.ReactNode;
  title?: string;
  isActive?: boolean;
  className?: string;
}

export const HotbarItem: React.FC<HotbarItemProps> = ({
  slotNumber,
  onClick,
  children,
  title,
  isActive,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title || `Hotbar slot ${slotNumber}`}
      className={cn(
        "relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 border border-border/50 bg-background/70 backdrop-blur-sm rounded-sm shadow-md transition-all duration-150 hover:bg-accent hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
        isActive && "bg-primary/20 border-primary ring-1 ring-primary",
        className
      )}
    >
      {children}
      <span className="absolute bottom-0.5 right-0.5 text-[0.5rem] text-muted-foreground px-0.5 bg-background/50 rounded-sm">
        {slotNumber}
      </span>
    </button>
  );
};

// File: src/components/hud/Hotbar.tsx
import React from 'react';
import { cn } from '@/utils/tailwind';
import { HotbarItem } from './HotbarItem';
import { RefreshCw, Hand, MessageSquarePlus, Cpu, Store } from 'lucide-react';
import { usePaneStore } from '@/stores/pane';

interface HotbarProps {
  className?: string;
  isHandTrackingActive: boolean;
  onToggleHandTracking: () => void;
  onOpenSellComputePane: () => void;
}

export const Hotbar: React.FC<HotbarProps> = ({ className, isHandTrackingActive, onToggleHandTracking, onOpenSellComputePane }) => {
  const resetHUDState = usePaneStore((state) => state.resetHUDState);
  const createNip28Channel = usePaneStore((state) => state.createNip28ChannelPane);
  const openNip90Dashboard = usePaneStore((state) => state.openNip90DashboardPane);
  const activePaneId = usePaneStore((state) => state.activePaneId);
  const SELL_COMPUTE_PANE_ID = 'sell_compute';

  const handleCreateChannel = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '');
    const defaultName = `Channel ${timestamp}`;
    createNip28Channel(defaultName);
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10000] flex space-x-1 p-1 bg-background/50 border border-border/30 rounded-md shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <HotbarItem slotNumber={1} onClick={resetHUDState} title="Reset HUD Layout">
        <RefreshCw className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={2} onClick={onToggleHandTracking} title={isHandTrackingActive ? "Disable Hand Tracking" : "Enable Hand Tracking"} isActive={isHandTrackingActive}>
        <Hand className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={3} onClick={handleCreateChannel} title="New NIP-28 Channel">
        <MessageSquarePlus className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={4} onClick={openNip90Dashboard} title="NIP-90 DVM Dashboard" isActive={activePaneId === 'nip90-dashboard'}>
        <Cpu className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      <HotbarItem slotNumber={5} onClick={onOpenSellComputePane} title="Sell Compute" isActive={activePaneId === SELL_COMPUTE_PANE_ID}>
        <Store className="w-5 h-5 text-muted-foreground" />
      </HotbarItem>
      {Array.from({ length: 4 }).map((_, index) => (
        <HotbarItem key={`empty-${6 + index}`} slotNumber={6 + index} title={`Slot ${6 + index}`} className="opacity-30 cursor-not-allowed hover:bg-background/70">
          <div className="w-5 h-5 text-muted-foreground/50"></div>
        </HotbarItem>
      ))}
    </div>
  );
};

// File: src/pages/HomePage.tsx
import React, { useState, useEffect, useRef } from "react";
import { PaneManager } from "@/panes/PaneManager";
import { SimpleGrid } from "@/components/home/SimpleGrid";
import { HandTracking, HandPose } from "@/components/hands";
import { type PinchCoordinates, type HandLandmarks } from "@/components/hands/handPoseTypes";
import { usePaneStore } from "@/stores/pane";
import { Hotbar } from "@/components/hud/Hotbar";

interface HandDataContext {
  activeHandPose: HandPose;
  pinchMidpoint: PinchCoordinates | null;
  primaryHandLandmarks: HandLandmarks | null;
  trackedHandsCount: number;
}

const TITLE_BAR_HEIGHT = 32;

export default function HomePage() {
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
  const [handData, setHandData] = useState<HandDataContext | null>(null);
  const [draggingPaneId, setDraggingPaneId] = useState<string | null>(null);
  const initialPinchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const paneStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const { panes, bringPaneToFront, updatePanePosition, activePaneId, openSellComputePane } = usePaneStore(
    (state) => ({
      panes: state.panes,
      bringPaneToFront: state.bringPaneToFront,
      updatePanePosition: state.updatePanePosition,
      activePaneId: state.activePaneId,
      openSellComputePane: state.openSellComputePane,
    })
  );

  const toggleHandTracking = () => {
    const newState = !isHandTrackingActive;
    setIsHandTrackingActive(newState);
    if (!newState && draggingPaneId) {
      setDraggingPaneId(null);
      initialPinchPositionRef.current = null;
      paneStartPosRef.current = null;
    }
  };

  const prevHandDataRef = useRef<HandDataContext | null>(null);
  const handleHandDataUpdate = (data: HandDataContext) => {
    if (!prevHandDataRef.current ||
        data.activeHandPose !== prevHandDataRef.current.activeHandPose ||
        data.trackedHandsCount !== prevHandDataRef.current.trackedHandsCount ||
        JSON.stringify(data.pinchMidpoint) !== JSON.stringify(prevHandDataRef.current.pinchMidpoint)) {
      prevHandDataRef.current = data;
      setHandData(data);
    }
  };

  useEffect(() => {
    if (!isHandTrackingActive || !handData || !handData.pinchMidpoint || handData.trackedHandsCount === 0) {
      if (draggingPaneId) {
        setDraggingPaneId(null);
        initialPinchPositionRef.current = null;
        paneStartPosRef.current = null;
      }
      return;
    }

    const { activeHandPose, pinchMidpoint } = handData;

    if (activeHandPose === HandPose.PINCH_CLOSED) {
      if (!draggingPaneId) {
        for (let i = panes.length - 1; i >= 0; i--) {
          const pane = panes[i];
          if (
            pinchMidpoint.x >= pane.x &&
            pinchMidpoint.x <= pane.x + pane.width &&
            pinchMidpoint.y >= pane.y &&
            pinchMidpoint.y <= pane.y + TITLE_BAR_HEIGHT
          ) {
            setDraggingPaneId(pane.id);
            paneStartPosRef.current = { x: pane.x, y: pane.y };
            initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
            if (pane.id !== activePaneId) {
              bringPaneToFront(pane.id);
            }
            break;
          }
        }
      } else if (initialPinchPositionRef.current && paneStartPosRef.current) {
        const deltaX = pinchMidpoint.x - initialPinchPositionRef.current.x;
        const deltaY = pinchMidpoint.y - initialPinchPositionRef.current.y;
        if (Math.abs(deltaX) >= 1 || Math.abs(deltaY) >= 1) {
          const newX = paneStartPosRef.current.x + deltaX;
          const newY = paneStartPosRef.current.y + deltaY;
          initialPinchPositionRef.current = { x: pinchMidpoint.x, y: pinchMidpoint.y };
          paneStartPosRef.current = { x: newX, y: newY };
          updatePanePosition(draggingPaneId, newX, newY);
        }
      }
    } else {
      if (draggingPaneId) {
        setDraggingPaneId(null);
        initialPinchPositionRef.current = null;
        paneStartPosRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHandTrackingActive, handData, draggingPaneId]);

  // Open the sell compute pane by default if it's not already open
  useEffect(() => {
    const hasSellComputePane = panes.some(p => p.id === 'sell_compute');
    if (!hasSellComputePane) {
      openSellComputePane();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panes]); // Run only when panes array reference changes

  return (
    <div className="relative w-full h-full overflow-hidden">
      <SimpleGrid />
      <PaneManager />
      <HandTracking
        showHandTracking={isHandTrackingActive}
        setShowHandTracking={setIsHandTrackingActive}
        onHandDataUpdate={handleHandDataUpdate}
      />
      <Hotbar
        isHandTrackingActive={isHandTrackingActive}
        onToggleHandTracking={toggleHandTracking}
        onOpenSellComputePane={openSellComputePane}
      />
    </div>
  );
}

// File: src/types/pane.ts
// Add 'sell_compute' to Pane.type
export type Pane = {
  id: string;
  type: 'default' | 'chat' | 'chats' | 'user' | 'diff' | 'changelog' | 'nip28_channel' | 'nip90_dashboard' | 'sell_compute' | string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isActive?: boolean;
  dismissable?: boolean;
  content?: {
    oldContent?: string;
    newContent?: string;
    channelId?: string;
    channelName?: string;
    [key: string]: unknown;
  };
}

export type PaneInput = Omit<Pane, 'x' | 'y' | 'width' | 'height' | 'id' | 'isActive'> & {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

// File: src/stores/panes/actions/openSellComputePane.ts
import { PaneInput } from '@/types/pane';
import { PaneStoreType, SetPaneStore } from '../types';
import { addPaneActionLogic } from './addPane';
import { DEFAULT_PANE_WIDTH, DEFAULT_PANE_HEIGHT, PANE_MARGIN } from '../constants';

export const SELL_COMPUTE_PANE_ID = 'sell_compute';

export function openSellComputePaneAction(set: SetPaneStore) {
  set((state: PaneStoreType) => {
    const existingPane = state.panes.find(p => p.id === SELL_COMPUTE_PANE_ID);
    if (existingPane) {
      const newPanes = state.panes
        .map(p => ({ ...p, isActive: p.id === SELL_COMPUTE_PANE_ID }))
        .sort((a, b) => (a.isActive ? 1 : -1) - (b.isActive ? 1 : -1));

      return {
        ...state,
        panes: newPanes,
        activePaneId: SELL_COMPUTE_PANE_ID,
        lastPanePosition: {
          x: existingPane.x,
          y: existingPane.y,
          width: existingPane.width,
          height: existingPane.height
        }
      };
    }

    // Calculate centered position for the new pane
    const paneWidth = Math.max(DEFAULT_PANE_WIDTH, 600);
    const paneHeight = Math.max(DEFAULT_PANE_HEIGHT, 450);
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    const initialX = Math.max(PANE_MARGIN, (screenWidth - paneWidth) / 2);
    const initialY = Math.max(PANE_MARGIN, (screenHeight - paneHeight) / 3); // A bit higher than center

    const newPaneInput: PaneInput = {
      id: SELL_COMPUTE_PANE_ID,
      type: 'sell_compute',
      title: 'Sell Compute Power',
      dismissable: true,
      x: initialX,
      y: initialY,
      width: paneWidth,
      height: paneHeight,
    };
    // Pass false for shouldTile to use the specific x,y provided
    const changes = addPaneActionLogic(state, newPaneInput, false);

    if (changes.panes && changes.activePaneId) {
        changes.panes = changes.panes.map(p => ({...p, isActive: p.id === changes.activePaneId}));
    }

    return { ...state, ...changes };
  });
}

// File: src/stores/panes/actions/index.ts
export * from './addPane';
export * from './removePane';
export * from './updatePanePosition';
export * from './updatePaneSize';
export * from './bringPaneToFront';
export * from './setActivePane';
export * from './openChatPane';
export * from './createNip28ChannelPane';
export * from './openNip90DashboardPane';
export * from './openSellComputePane';

// File: src/stores/panes/types.ts
import { Pane, PaneInput } from '@/types/pane';
import type { StoreApi } from 'zustand';

export interface PaneState {
  panes: Pane[];
  activePaneId: string | null;
  lastPanePosition: { x: number; y: number; width: number; height: number } | null;
}

export interface PaneStoreType extends PaneState {
  addPane: (newPane: PaneInput, shouldTile?: boolean) => void;
  removePane: (id: string) => void;
  updatePanePosition: (id: string, x: number, y: number) => void;
  updatePaneSize: (id: string, width: number, height: number) => void;
  openChatPane: (newPane: PaneInput, isCommandKeyHeld?: boolean) => void;
  bringPaneToFront: (id: string) => void;
  setActivePane: (id: string | null) => void;
  createNip28ChannelPane: (channelName?: string) => void;
  openNip90DashboardPane: () => void;
  openSellComputePane: () => void;
  resetHUDState: () => void;
}

export type SetPaneStore = StoreApi<PaneStoreType>['setState'];
export type GetPaneStore = () => PaneStoreType;

// File: src/stores/pane.ts
// No change to initialState for now, openSellComputePane in HomePage.tsx useEffect will add it.
// Add `openSellComputePane: () => openSellComputePaneAction(set),` to the store actions.

// File: src/components/sell-compute/SellComputePane.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, HelpCircle, Zap, ZapOff, Wifi, WifiOff, RefreshCcw } from 'lucide-react';
import { SparkService, SparkError } from '@/services/spark';
import { OllamaService, OllamaHttpError, OllamaParseError } from '@/services/ollama';
import { getMainRuntime } from '@/services/runtime';
import { Effect } from 'effect';
import { runPromiseExit, Exit, Cause } from 'effect/Effect';
import { cn } from '@/utils/tailwind';


const SellComputePane: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [statusLoading, setStatusLoading] = useState({ wallet: false, ollama: false });

  const runtime = getMainRuntime();

  const checkWalletStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, wallet: true }));
    const walletProgram = Effect.flatMap(SparkService, s => s.checkWalletStatus());
    runPromiseExit(Effect.provide(walletProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsWalletConnected(exit.value);
      else {
        console.error("Wallet status check failed:", Cause.squash(exit.cause));
        setIsWalletConnected(false);
      }
      setStatusLoading(s => ({ ...s, wallet: false }));
    });
  }, [runtime]);

  const checkOllamaStatus = useCallback(async () => {
    setStatusLoading(s => ({ ...s, ollama: true }));
    const ollamaProgram = Effect.flatMap(OllamaService, s => s.checkOllamaStatus());
    runPromiseExit(Effect.provide(ollamaProgram, runtime)).then(exit => {
      if (Exit.isSuccess(exit)) setIsOllamaConnected(exit.value);
      else {
        console.error("Ollama status check failed:", Cause.squash(exit.cause));
        setIsOllamaConnected(false);
      }
      setStatusLoading(s => ({ ...s, ollama: false }));
    });
  }, [runtime]);

  useEffect(() => {
    checkWalletStatus();
    checkOllamaStatus();
  }, [checkWalletStatus, checkOllamaStatus]);

  const handleGoOnline = () => {
    if (isWalletConnected && isOllamaConnected) {
      setIsOnline(!isOnline);
      // TODO: Call Kind5050DVMService.startListening() or stopListening()
      console.log(`Compute selling ${!isOnline ? 'started' : 'stopped'}`);
    } else {
      alert("Please connect your wallet and Ollama to go online.");
    }
  };

  const walletStatusText = statusLoading.wallet ? 'Checking...' : (isWalletConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const ollamaStatusText = statusLoading.ollama ? 'Checking...' : (isOllamaConnected ? 'CONNECTED' : 'NOT CONNECTED');
  const walletStatusColor = isWalletConnected ? 'text-green-500' : 'text-destructive';
  const ollamaStatusColor = isOllamaConnected ? 'text-green-500' : 'text-destructive';

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-sm">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-center text-lg">Sell Compute Power</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
              {isWalletConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Wallet</p>
                <p className={cn("text-xs", walletStatusColor)}>{walletStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Wallet Status" onClick={checkWalletStatus} disabled={statusLoading.wallet}>
                 {statusLoading.wallet ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Connect Wallet (Not Implemented)"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border border-border/30 rounded-md">
            <div className="flex items-center">
             {isOllamaConnected ? <Wifi className="w-5 h-5 mr-2 text-green-500"/> : <WifiOff className="w-5 h-5 mr-2 text-destructive"/>}
              <div>
                <p className="font-semibold">Ollama</p>
                <p className={cn("text-xs", ollamaStatusColor)}>{ollamaStatusText}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="icon" title="Check Ollama Status" onClick={checkOllamaStatus} disabled={statusLoading.ollama}>
                 {statusLoading.ollama ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div> : <RefreshCcw className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" title="Ollama Info (Not Implemented)"> <HelpCircle className="w-4 h-4" /> </Button>
            </div>
          </div>

          <CardDescription className="text-center text-xs px-2 pt-2">
            To sell compute, connect your wallet and Ollama, then click '{isOnline ? "Go Offline" : "Go Online"}'.
          </CardDescription>

          <Button
            onClick={handleGoOnline}
            className="w-full py-3 text-base"
            variant={isOnline ? "outline" : "default"}
            disabled={(statusLoading.wallet || statusLoading.ollama || (!isWalletConnected || !isOllamaConnected)) && !isOnline}
          >
            {isOnline ? <ZapOff className="mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />}
            {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
export default SellComputePane;

// File: src/components/sell-compute/index.ts
export { default as SellComputePane } from './SellComputePane';

// File: src/panes/PaneManager.tsx
// Add SellComputePane to imports and render logic
import { SellComputePane } from '@/components/sell-compute';
// ...
// Inside the map function:
/*
  ...
  {pane.type === 'sell_compute' && <SellComputePane />}
  ...
*/
// Add 'sell_compute' to the exclusion list for the default placeholder:
/*
  ...
  !(
    // ... other types
    pane.type === 'sell_compute' ||
    pane.type === 'default'
  ) && <PlaceholderDefaultComponent type={pane.type} />}
*/

// File: src/services/spark/SparkService.ts
// Add checkWalletStatus to the interface
// ... (other parts of the interface)
export interface SparkService {
  // ... existing methods
  checkWalletStatus(): Effect.Effect<boolean, SparkError | TrackEventError, never>;
}

// File: src/services/spark/SparkServiceImpl.ts
// Implement checkWalletStatus
// ... (imports)
export const SparkServiceLive = Layer.scoped(
  SparkService,
  Effect.gen(function* (_) {
    const sparkConfig = yield* _(SparkServiceConfigTag);
    const telemetry = yield* _(TelemetryService);
    const wallet = yield* _(
      Effect.tryPromise({
        try: async () => {
          const { wallet } = await SparkWallet.initialize({ /* ... */ });
          return wallet;
        },
        catch: (e) => { /* ... error mapping ... */ }
      })
    );
    yield* _(Effect.addFinalizer(() => { /* ... */ }));

    return {
      // ... (existing methods createLightningInvoice, payLightningInvoice, getBalance, getSingleUseDepositAddress)
      checkWalletStatus: () => Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({
          category: 'spark:status', action: 'check_wallet_status_start',
        }).pipe(Effect.ignoreLogged));

        try {
          const balanceInfoSDK = yield* _(
            Effect.tryPromise({
              try: () => wallet.getBalance(),
              catch: (e) => new SparkBalanceError({ message: "getBalance failed during status check", cause: e }),
            })
          );
          yield* _(telemetry.trackEvent({
            category: 'spark:status', action: 'check_wallet_status_success',
            label: `Wallet ready, balance: ${balanceInfoSDK.balance}`,
          }).pipe(Effect.ignoreLogged));
          return true;
        } catch (error) {
          const sparkError = error as SparkError;
          if (sparkError instanceof SparkConfigError || (sparkError instanceof SparkServiceError && sparkError.message.toLowerCase().includes("initialize"))) {
            yield* _(telemetry.trackEvent({
              category: 'spark:status', action: 'check_wallet_status_failure_not_initialized',
              label: sparkError.message,
            }).pipe(Effect.ignoreLogged));
            return false;
          }
          yield* _(telemetry.trackEvent({
            category: 'spark:status', action: 'check_wallet_status_failure_other',
            label: sparkError.message,
          }).pipe(Effect.ignoreLogged));
          return false;
        }
      }),
    };
  })
);

// File: src/services/ollama/OllamaService.ts
// Add checkOllamaStatus to the interface
// ... (other parts of the interface)
export interface OllamaService {
  // ... existing methods
  checkOllamaStatus(): Effect.Effect<boolean, OllamaHttpError | OllamaParseError, never>;
}

// File: src/services/ollama/OllamaServiceImpl.ts
// Implement checkOllamaStatus
// ... (imports)
export function createOllamaService(
    config: OllamaServiceConfig,
    httpClient: HttpClientService
): OllamaService {
    const makeUrl = (path: string) => `${config.baseURL}${path}`;

    return {
      // ... (existing methods generateChatCompletion, generateChatCompletionStream)
      checkOllamaStatus: () => Effect.gen(function* (_) {
        const url = config.baseURL.replace("/v1", "");
        const httpRequest = HttpClientRequest.get(url);

        try {
          const response = yield* _(
            httpClient.execute(httpRequest),
            Effect.mapError(httpClientError =>
              new OllamaHttpError(
                `HTTP request failed for Ollama status check: ${httpClientError._tag || "Unknown error"}`,
                httpRequest,
                httpClientError
              )
            )
          );

          if (response.status === 200) {
            const textResponse = yield* _(response.text, Effect.mapError(e => new OllamaParseError("Failed to parse Ollama status text response", e)));
            return textResponse.toLowerCase().includes("ollama is running");
          }
          return false;
        } catch (error) {
          return false;
        }
      }),
    };
}
// OllamaServiceLive remains the same
```
