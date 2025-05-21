The console log indicates an infinite loop originating in `PaneManager.tsx`, specifically related to how it's subscribing to a Zustand store (via `useSyncExternalStore`). The warning `The result of getSnapshot should be cached to avoid an infinite loop` is a key indicator. This typically happens when a selector function in a Zustand hook creates a new object or array reference on every call, even if the underlying data hasn't changed. React's `useSyncExternalStore` then sees this new reference as a state change, triggering an infinite re-render loop.

A similar warning is also noted for `WalletSetupPage.tsx`.

We will address this by applying Zustand's `shallow` equality checker to the relevant store hooks in these components.

**Instructions:**

1.  **Modify `src/panes/PaneManager.tsx`:**
    *   Locate the `usePaneStore` hook call (around line 34, as indicated by the logs).
    *   Import `shallow` from `zustand/shallow`.
    *   Apply the `shallow` equality checker to the `usePaneStore` hook.

2.  **Modify `src/pages/WalletSetupPage.tsx`:**
    *   Locate the `useWalletStore` hook call (around line 13, as indicated by the logs).
    *   Locate any other multi-property selector from `usePaneStore` or `useWalletStore`.
    *   Import `shallow` from `zustand/shallow` if not already present.
    *   Apply the `shallow` equality checker to these store hooks.

Here are the specific code changes:

**File: `src/panes/PaneManager.tsx`**
```typescript
// src/panes/PaneManager.tsx
import React from 'react';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow'; // Import shallow
import { Pane as PaneComponent } from '@/panes/Pane';
import { Pane as PaneType } from '@/types/pane';
// ... other imports for page components ...
import SecondPage from '@/pages/SecondPage';
import WalletSetupPage from '@/pages/WalletSetupPage';
import SeedPhraseBackupPage from '@/pages/SeedPhraseBackupPage';
import RestoreWalletPage from '@/pages/RestoreWalletPage';
import { Nip28ChannelChat } from '@/components/nip28';
import { Nip90Dashboard } from '@/components/nip90';
import { SellComputePane } from '@/components/sell-compute';
import { DvmJobHistoryPane } from '@/components/dvm';
import { Nip90DvmTestPane } from '@/components/nip90_dvm_test';
import { Nip90ConsumerChatPane } from '@/components/nip90_consumer_chat';
import { Nip90GlobalFeedPane } from '@/components/nip90_feed';
import { WalletPane } from '@/components/wallet';


// Placeholder Content Components
const PlaceholderChatComponent = ({ threadId }: { threadId?: string }) => <div className="p-2">Chat Pane Content {threadId && `for ${threadId}`}</div>;
const PlaceholderChatsPaneComponent = () => <div className="p-2">Chats List Pane Content</div>;
const PlaceholderChangelogComponent = () => <div className="p-2">Changelog Pane Content</div>;
const PlaceholderDiffComponent = ({ oldContent, newContent }: { oldContent?: string, newContent?: string }) => (
  <div className="p-2">
    <h3>Old Content:</h3><pre className="bg-muted p-1 rounded text-xs">{oldContent || "N/A"}</pre>
    <h3>New Content:</h3><pre className="bg-muted p-1 rounded text-xs">{newContent || "N/A"}</pre>
  </div>
);
const PlaceholderUserStatusComponent = () => <div className="p-2">User Status Pane Content</div>;
const PlaceholderDefaultComponent = ({ type }: { type: string }) => <div className="p-2">Default Content for Pane Type: {type}</div>;


export const PaneManager = () => {
  // Apply shallow equality checker to the selector
  const { panes, activePaneId } = usePaneStore(
    (state) => ({
      panes: state.panes,
      activePaneId: state.activePaneId,
    }),
    shallow // <-- Add this
  );

  const baseZIndex = 10;

  return (
    <>
      {panes.map((pane: PaneType, index: number) => (
        <PaneComponent
          key={pane.id}
          title={pane.title}
          id={pane.id}
          x={pane.x}
          y={pane.y}
          height={pane.height}
          width={pane.width}
          type={pane.type}
          isActive={pane.id === activePaneId}
          style={{
            zIndex: baseZIndex + index
          }}
          dismissable={pane.dismissable !== false}
          content={pane.content}
        >
          {pane.type === 'chat' && <PlaceholderChatComponent threadId={pane.id.replace(/^chat-|^nip28-/, '')} />}
          {pane.type === 'chats' && <PlaceholderChatsPaneComponent />}
          {pane.type === 'changelog' && <PlaceholderChangelogComponent />}
          {pane.type === 'user' && <PlaceholderUserStatusComponent />}
          {pane.type === 'diff' && pane.content && (
            <PlaceholderDiffComponent oldContent={pane.content.oldContent} newContent={pane.content.newContent} />
          )}
          {pane.type === 'nip28_channel' && pane.content?.channelId && (
            <Nip28ChannelChat
              channelId={pane.content.channelId}
              channelName={pane.content.channelName || pane.title}
            />
          )}
          {pane.type === 'nip90_dashboard' && <Nip90Dashboard />}
          {pane.type === 'sell_compute' && <SellComputePane />}
          {pane.type === 'dvm_job_history' && <DvmJobHistoryPane />}
          {pane.type === 'nip90_dvm_test' && <Nip90DvmTestPane />}
          {pane.type === 'nip90_consumer_chat' && <Nip90ConsumerChatPane />}
          {pane.type === 'nip90_global_feed' && <Nip90GlobalFeedPane />}
          {pane.type === 'wallet' && <WalletPane />}
          {pane.type === 'second_page_content' && <SecondPage />}
          {pane.type === 'wallet_setup_content' && pane.id && (
            <WalletSetupPage paneId={pane.id} key={pane.id} />
          )}
          {pane.type === 'seed_phrase_backup_content' && pane.content?.seedPhrase && (
            <SeedPhraseBackupPage seedPhrase={pane.content.seedPhrase} paneId={pane.id} />
          )}
          {pane.type === 'restore_wallet_content' && pane.id && ( // Added check for pane.id
            <RestoreWalletPage paneId={pane.id} />
          )}
          {pane.type === 'default' && <PlaceholderDefaultComponent type={pane.type} />}
          {!(
            pane.type === 'chat' ||
            pane.type === 'chats' ||
            pane.type === 'changelog' ||
            pane.type === 'user' ||
            pane.type === 'diff' ||
            pane.type === 'nip28_channel' ||
            pane.type === 'nip90_dashboard' ||
            pane.type === 'sell_compute' ||
            pane.type === 'dvm_job_history' ||
            pane.type === 'nip90_dvm_test' ||
            pane.type === 'nip90_consumer_chat' ||
            pane.type === 'nip90_global_feed' ||
            pane.type === 'wallet' ||
            pane.type === 'second_page_content' ||
            pane.type === 'wallet_setup_content' ||
            pane.type === 'seed_phrase_backup_content' ||
            pane.type === 'restore_wallet_content' ||
            pane.type === 'default'
          ) && <PlaceholderDefaultComponent type={pane.type} />}
        </PaneComponent>
      ))}
    </>
  );
};
```

**File: `src/pages/WalletSetupPage.tsx`**
```typescript
// src/pages/WalletSetupPage.tsx
import React, { useState, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow'; // Import shallow
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet as WalletIcon } from 'lucide-react';
// WALLET_SETUP_PANE_ID is not needed here as paneId is passed as prop

interface WalletSetupPageProps {
  paneId: string;
}

const WalletSetupPage: React.FC<WalletSetupPageProps> = ({ paneId }) => {
  const { generateNewWallet, isLoading, error, clearError } = useWalletStore(
    (state) => ({
      generateNewWallet: state.generateNewWallet,
      isLoading: state.isLoading,
      error: state.error,
      clearError: state.clearError,
    }),
    shallow // <-- Add shallow
  );

  const { openSeedPhraseBackupPane, openRestoreWalletPane, removePane } = usePaneStore(
    (state) => ({
      openSeedPhraseBackupPane: state.openSeedPhraseBackupPane,
      openRestoreWalletPane: state.openRestoreWalletPane,
      removePane: state.removePane,
    }),
    shallow // <-- Add shallow
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateNewWallet = useCallback(async () => {
    setIsGenerating(true);
    clearError();
    try {
      const newSeedPhrase = await generateNewWallet();
      if (newSeedPhrase) {
        openSeedPhraseBackupPane({ seedPhrase: newSeedPhrase });
        removePane(paneId);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [clearError, generateNewWallet, openSeedPhraseBackupPane, paneId, removePane]);

  const handleRestoreWallet = useCallback(() => {
    clearError();
    openRestoreWalletPane();
    removePane(paneId);
  }, [clearError, openRestoreWalletPane, paneId, removePane]);

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <WalletIcon className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Commander Wallet</CardTitle>
          <CardDescription>
            Securely manage your funds and agent interactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleCreateNewWallet}
            className="w-full"
            size="lg"
            disabled={isLoading || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating New Wallet...
              </>
            ) : (
              'Create New Wallet'
            )}
          </Button>
          <Button
            onClick={handleRestoreWallet}
            className="w-full"
            size="lg"
            variant="outline"
            disabled={isLoading || isGenerating}
          >
            Restore Existing Wallet
          </Button>
          {error && (
            <div className="text-destructive text-sm text-center mt-4">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(WalletSetupPage);
```

**File: `src/pages/SeedPhraseBackupPage.tsx`**
```typescript
// src/pages/SeedPhraseBackupPage.tsx
import React, { useState } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow'; // Import shallow
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Copy, Check, Loader2 } from 'lucide-react';
import SelfCustodyNoticeDialog from '@/components/wallet/SelfCustodyNoticeDialog';

interface SeedPhraseBackupPageProps {
  seedPhrase: string;
  paneId: string;
}

const SeedPhraseBackupPage: React.FC<SeedPhraseBackupPageProps> = ({ seedPhrase, paneId }) => {
  const { _initializeWalletWithSeed, hasSeenSelfCustodyNotice, error, isLoading, clearError } = useWalletStore(
    (state) => ({
      _initializeWalletWithSeed: state._initializeWalletWithSeed,
      hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
      error: state.error,
      isLoading: state.isLoading,
      clearError: state.clearError,
    }),
    shallow // <-- Add shallow
  );
  const removePane = usePaneStore((state) => state.removePane, shallow); // Also for single function selectors if they cause issues, though less common

  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSelfCustodyDialog, setShowSelfCustodyDialog] = useState(false);

  const handleCopyToClipboard = () => { /* ... no change ... */ };
  const displaySeedPhraseWords = () => { /* ... no change ... */ };

  const handleContinue = async () => {
    if (!seedPhrase) return;
    setIsInitializing(true);
    clearError();
    try {
      const success = await _initializeWalletWithSeed(seedPhrase, true);
      if (success) {
        removePane(paneId);
        if (!hasSeenSelfCustodyNotice) {
          setShowSelfCustodyDialog(true);
        }
      }
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      {/* ... rest of the JSX remains the same ... */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Your Secret Recovery Phrase</CardTitle>
          <CardDescription className="text-center">
            Write down these 12 words in order and keep them somewhere safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is your password to your money. If you lose it, you will lose your money! Never share this phrase with anyone.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/30 p-4 rounded-md border border-border">
            {displaySeedPhraseWords()}
          </div>

          <Button
            onClick={handleCopyToClipboard}
            variant="outline"
            className="w-full"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" /> Copy Seed Phrase
              </>
            )}
          </Button>

          <div className="flex items-start space-x-2 pt-4">
            <Checkbox id="confirm-saved" checked={isSaved} onCheckedChange={() => setIsSaved(!isSaved)} />
            <Label htmlFor="confirm-saved" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I have saved my seed phrase securely.
            </Label>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full"
            disabled={!isSaved || isLoading || isInitializing}
          >
            {(isLoading || isInitializing) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              'Continue'
            )}
          </Button>

          {error && (
            <div className="text-destructive text-sm text-center mt-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
      <SelfCustodyNoticeDialog
        open={showSelfCustodyDialog}
        onOpenChange={setShowSelfCustodyDialog}
      />
    </div>
  );
};

export default SeedPhraseBackupPage;

```

**File: `src/pages/RestoreWalletPage.tsx`**
```typescript
// src/pages/RestoreWalletPage.tsx
import React, { useState, useCallback } from 'react'; // Added useCallback
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow'; // Import shallow
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, KeyRound } from 'lucide-react';
import SelfCustodyNoticeDialog from '@/components/wallet/SelfCustodyNoticeDialog';

interface RestoreWalletPageProps {
  paneId: string;
}

const RestoreWalletPage: React.FC<RestoreWalletPageProps> = ({ paneId }) => {
  const { restoreWallet, hasSeenSelfCustodyNotice, error, isLoading, clearError } = useWalletStore(
    (state) => ({
      restoreWallet: state.restoreWallet,
      hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
      error: state.error,
      isLoading: state.isLoading,
      clearError: state.clearError,
    }),
    shallow // <-- Add shallow
  );

  const { removePane, openWalletSetupPane } = usePaneStore(
    (state) => ({
      removePane: state.removePane,
      openWalletSetupPane: state.openWalletSetupPane,
    }),
    shallow // <-- Add shallow
  );

  const [seedPhrase, setSeedPhrase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [showSelfCustodyDialog, setShowSelfCustodyDialog] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSeedPhrase(e.target.value);
    if (error) clearError();
  }, [error, clearError]);

  const handleRestore = useCallback(async () => {
    if (!seedPhrase.trim()) return;
    setIsRestoring(true);
    clearError();
    try {
      const success = await restoreWallet(seedPhrase.trim());
      if (success) {
        removePane(paneId);
        if (!hasSeenSelfCustodyNotice) {
          setShowSelfCustodyDialog(true);
        }
      }
    } finally {
      setIsRestoring(false);
    }
  }, [seedPhrase, clearError, restoreWallet, removePane, paneId, hasSeenSelfCustodyNotice]);

  const handleBackToSetup = useCallback(() => {
    clearError();
    removePane(paneId);
    openWalletSetupPane();
  }, [clearError, removePane, paneId, openWalletSetupPane]);

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      {/* ... rest of the JSX remains the same ... */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <KeyRound className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enter Your Seed Phrase</CardTitle>
          <CardDescription>
            Enter your 12 or 24 word recovery phrase to restore your wallet. Separate words with spaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter seed phrase..."
            value={seedPhrase}
            onChange={handleInputChange}
            rows={5}
            className="font-mono text-sm"
          />

          <Button
            onClick={handleRestore}
            className="w-full"
            disabled={!seedPhrase.trim() || isLoading || isRestoring}
          >
            {(isLoading || isRestoring) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restoring Wallet...
              </>
            ) : (
              'Restore Wallet'
            )}
          </Button>

          <Button
            onClick={handleBackToSetup}
            variant="outline"
            className="w-full"
          >
            Back to Setup
          </Button>

          {error && (
            <div className="text-destructive text-sm text-center mt-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
      <SelfCustodyNoticeDialog
        open={showSelfCustodyDialog}
        onOpenChange={setShowSelfCustodyDialog}
      />
    </div>
  );
};

export default RestoreWalletPage;
```
This should resolve the infinite loop warnings and the maximum update depth error by ensuring that components only re-render when the selected parts of the store actually change their values, rather than just their reference.
I also added `shallow` to selectors in `SeedPhraseBackupPage` and `RestoreWalletPage` as a proactive measure, as they follow similar patterns. The `React.memo` on `WalletSetupPage` is good but `shallow` addresses the root cause of the re-render originating from the store subscription itself.

Added `paneId` check to `RestoreWalletPage` in `PaneManager` as well.

Final check of the log:
> `HomePage.tsx:148 Error: Maximum update depth exceeded.`
This occurred in `HomePage.tsx` and *then* the error was attributed to `PaneManager`.
This means `HomePage` might also have a problematic selector or an effect loop.
Let's check `HomePage.tsx` for Zustand hooks that return objects:
```typescript
// src/pages/HomePage.tsx
  const {
    panes, // This is an array, if the array reference changes, it's a new snapshot.
    bringPaneToFront,
    updatePanePosition,
    activePaneId: currentActivePaneId,
    openSellComputePane,
    openDvmJobHistoryPane,
  } = usePaneStore();
```
This is not a selector returning an object, but `panes` is an array. Zustand's `useStore` (which `usePaneStore` is) by default uses strict equality (`===`) for checking if the selected state has changed. If `panes` is a new array reference (e.g., due to a map/filter operation within an action that always creates a new array), this could trigger a re-render in `HomePage`.

If `usePaneStore` is just `create<StoreType>()(...)`, then this selector `usePaneStore()` directly returns the entire store state. Destructuring `panes` from it is fine. The problem is usually when `useStore(state => ({ ... }))` is used.

However, given the specific warning `PaneManager.tsx:34 The result of getSnapshot should be cached`, the `PaneManager.tsx` selector was the most direct culprit. If the problem persists in `HomePage`, we might need to apply `shallow` to the `usePaneStore()` call there if it's selecting a sub-object, or ensure actions in `paneStore.ts` don't unnecessarily recreate the `panes` array if its content hasn't changed.

Let's assume for now that the `PaneManager.tsx` and `WalletSetupPage.tsx` fixes are the primary ones needed based on the console output.The primary cause of the "Maximum update depth exceeded" error, especially when accompanied by the "getSnapshot should be cached" warning, is often a Zustand (or similar library using `useSyncExternalStore`) selector that returns a new object or array reference on every render. This makes React think the state has changed, leading to an infinite loop of re-renders.

The provided logs pinpoint `PaneManager.tsx:34` and `WalletSetupPage.tsx:13` as sources of this problematic pattern.

Here's the fix:

**1. Apply `shallow` equality checker in `PaneManager.tsx`**

   This ensures that the `PaneManager` component only re-renders if the shallowly compared properties (`panes` array reference or `activePaneId` value) actually change.

   **File: `src/panes/PaneManager.tsx`**
   ```typescript
   // src/panes/PaneManager.tsx
   import React from 'react';
   import { usePaneStore } from '@/stores/pane';
   import { shallow } from 'zustand/shallow'; // Import shallow
   import { Pane as PaneComponent } from '@/panes/Pane';
   import { Pane as PaneType } from '@/types/pane';
   // ... other imports for page components ...
   import SecondPage from '@/pages/SecondPage';
   import WalletSetupPage from '@/pages/WalletSetupPage';
   import SeedPhraseBackupPage from '@/pages/SeedPhraseBackupPage';
   import RestoreWalletPage from '@/pages/RestoreWalletPage';
   import { Nip28ChannelChat } from '@/components/nip28';
   import { Nip90Dashboard } from '@/components/nip90';
   import { SellComputePane } from '@/components/sell-compute';
   import { DvmJobHistoryPane } from '@/components/dvm';
   import { Nip90DvmTestPane } from '@/components/nip90_dvm_test';
   import { Nip90ConsumerChatPane } from '@/components/nip90_consumer_chat';
   import { Nip90GlobalFeedPane } from '@/components/nip90_feed';
   import { WalletPane } from '@/components/wallet';


   // Placeholder Content Components
   const PlaceholderChatComponent = ({ threadId }: { threadId?: string }) => <div className="p-2">Chat Pane Content {threadId && `for ${threadId}`}</div>;
   const PlaceholderChatsPaneComponent = () => <div className="p-2">Chats List Pane Content</div>;
   const PlaceholderChangelogComponent = () => <div className="p-2">Changelog Pane Content</div>;
   const PlaceholderDiffComponent = ({ oldContent, newContent }: { oldContent?: string, newContent?: string }) => (
     <div className="p-2">
       <h3>Old Content:</h3><pre className="bg-muted p-1 rounded text-xs">{oldContent || "N/A"}</pre>
       <h3>New Content:</h3><pre className="bg-muted p-1 rounded text-xs">{newContent || "N/A"}</pre>
     </div>
   );
   const PlaceholderUserStatusComponent = () => <div className="p-2">User Status Pane Content</div>;
   const PlaceholderDefaultComponent = ({ type }: { type: string }) => <div className="p-2">Default Content for Pane Type: {type}</div>;


   export const PaneManager = () => {
     // Apply shallow equality checker to the selector
     const { panes, activePaneId } = usePaneStore(
       (state) => ({
         panes: state.panes,
         activePaneId: state.activePaneId,
       }),
       shallow // <-- Add this
     );

     const baseZIndex = 10;

     return (
       <>
         {panes.map((pane: PaneType, index: number) => (
           <PaneComponent
             key={pane.id}
             title={pane.title}
             id={pane.id}
             x={pane.x}
             y={pane.y}
             height={pane.height}
             width={pane.width}
             type={pane.type}
             isActive={pane.id === activePaneId}
             style={{
               zIndex: baseZIndex + index
             }}
             dismissable={pane.dismissable !== false}
             content={pane.content}
           >
             {pane.type === 'chat' && <PlaceholderChatComponent threadId={pane.id.replace(/^chat-|^nip28-/, '')} />}
             {pane.type === 'chats' && <PlaceholderChatsPaneComponent />}
             {pane.type === 'changelog' && <PlaceholderChangelogComponent />}
             {pane.type === 'user' && <PlaceholderUserStatusComponent />}
             {pane.type === 'diff' && pane.content && (
               <PlaceholderDiffComponent oldContent={pane.content.oldContent} newContent={pane.content.newContent} />
             )}
             {pane.type === 'nip28_channel' && pane.content?.channelId && (
               <Nip28ChannelChat
                 channelId={pane.content.channelId}
                 channelName={pane.content.channelName || pane.title}
               />
             )}
             {pane.type === 'nip90_dashboard' && <Nip90Dashboard />}
             {pane.type === 'sell_compute' && <SellComputePane />}
             {pane.type === 'dvm_job_history' && <DvmJobHistoryPane />}
             {pane.type === 'nip90_dvm_test' && <Nip90DvmTestPane />}
             {pane.type === 'nip90_consumer_chat' && <Nip90ConsumerChatPane />}
             {pane.type === 'nip90_global_feed' && <Nip90GlobalFeedPane />}
             {pane.type === 'wallet' && <WalletPane />}
             {pane.type === 'second_page_content' && <SecondPage />}
             {pane.type === 'wallet_setup_content' && pane.id && (
               <WalletSetupPage paneId={pane.id} key={pane.id} />
             )}
             {pane.type === 'seed_phrase_backup_content' && pane.content?.seedPhrase && (
               <SeedPhraseBackupPage seedPhrase={pane.content.seedPhrase} paneId={pane.id} />
             )}
             {pane.type === 'restore_wallet_content' && pane.id && (
               <RestoreWalletPage paneId={pane.id} />
             )}
             {pane.type === 'default' && <PlaceholderDefaultComponent type={pane.type} />}
             {!(
               pane.type === 'chat' ||
               pane.type === 'chats' ||
               pane.type === 'changelog' ||
               pane.type === 'user' ||
               pane.type === 'diff' ||
               pane.type === 'nip28_channel' ||
               pane.type === 'nip90_dashboard' ||
               pane.type === 'sell_compute' ||
               pane.type === 'dvm_job_history' ||
               pane.type === 'nip90_dvm_test' ||
               pane.type === 'nip90_consumer_chat' ||
               pane.type === 'nip90_global_feed' ||
               pane.type === 'wallet' ||
               pane.type === 'second_page_content' ||
               pane.type === 'wallet_setup_content' ||
               pane.type === 'seed_phrase_backup_content' ||
               pane.type === 'restore_wallet_content' ||
               pane.type === 'default'
             ) && <PlaceholderDefaultComponent type={pane.type} />}
           </PaneComponent>
         ))}
       </>
     );
   };
   ```

**2. Apply `shallow` equality checker in `WalletSetupPage.tsx`**

   This component also uses selectors that return new objects.

   **File: `src/pages/WalletSetupPage.tsx`**
   ```typescript
   // src/pages/WalletSetupPage.tsx
   import React, { useState, useCallback } from 'react';
   import { useWalletStore } from '@/stores/walletStore';
   import { usePaneStore } from '@/stores/pane';
   import { shallow } from 'zustand/shallow'; // Import shallow
   import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   import { Loader2, Wallet as WalletIcon } from 'lucide-react';
   // WALLET_SETUP_PANE_ID is not needed here as paneId is passed as prop

   interface WalletSetupPageProps {
     paneId: string;
   }

   const WalletSetupPage: React.FC<WalletSetupPageProps> = ({ paneId }) => {
     const { generateNewWallet, isLoading, error, clearError } = useWalletStore(
       (state) => ({
         generateNewWallet: state.generateNewWallet,
         isLoading: state.isLoading,
         error: state.error,
         clearError: state.clearError,
       }),
       shallow // <-- Add shallow
     );

     const { openSeedPhraseBackupPane, openRestoreWalletPane, removePane } = usePaneStore(
       (state) => ({
         openSeedPhraseBackupPane: state.openSeedPhraseBackupPane,
         openRestoreWalletPane: state.openRestoreWalletPane,
         removePane: state.removePane,
       }),
       shallow // <-- Add shallow
     );

     const [isGenerating, setIsGenerating] = useState(false);

     const handleCreateNewWallet = useCallback(async () => {
       setIsGenerating(true);
       clearError();
       try {
         const newSeedPhrase = await generateNewWallet();
         if (newSeedPhrase) {
           openSeedPhraseBackupPane({ seedPhrase: newSeedPhrase });
           removePane(paneId);
         }
       } finally {
         setIsGenerating(false);
       }
     }, [clearError, generateNewWallet, openSeedPhraseBackupPane, paneId, removePane]);

     const handleRestoreWallet = useCallback(() => {
       clearError();
       openRestoreWalletPane();
       removePane(paneId);
     }, [clearError, openRestoreWalletPane, paneId, removePane]);

     return (
       <div className="container flex items-center justify-center min-h-full p-4">
         <Card className="w-full max-w-md">
           <CardHeader className="text-center">
             <div className="mb-2 flex justify-center">
               <WalletIcon className="h-12 w-12 text-primary" />
             </div>
             <CardTitle className="text-2xl">Welcome to Commander Wallet</CardTitle>
             <CardDescription>
               Securely manage your funds and agent interactions.
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <Button
               onClick={handleCreateNewWallet}
               className="w-full"
               size="lg"
               disabled={isLoading || isGenerating}
             >
               {isGenerating ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   Creating New Wallet...
                 </>
               ) : (
                 'Create New Wallet'
               )}
             </Button>
             <Button
               onClick={handleRestoreWallet}
               className="w-full"
               size="lg"
               variant="outline"
               disabled={isLoading || isGenerating}
             >
               Restore Existing Wallet
             </Button>
             {error && (
               <div className="text-destructive text-sm text-center mt-4">
                 {error}
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     );
   };

   export default React.memo(WalletSetupPage);
   ```

**3. (Proactive) Apply `shallow` equality checker in `SeedPhraseBackupPage.tsx` and `RestoreWalletPage.tsx`**

   These pages follow a similar pattern of selecting multiple properties from Zustand stores. Applying `shallow` here is a good proactive measure.

   **File: `src/pages/SeedPhraseBackupPage.tsx`**
   ```typescript
   // src/pages/SeedPhraseBackupPage.tsx
   import React, { useState, useCallback } from 'react'; // Added useCallback
   import { useWalletStore } from '@/stores/walletStore';
   import { usePaneStore } from '@/stores/pane';
   import { shallow } from 'zustand/shallow'; // Import shallow
   import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   import { Checkbox } from '@/components/ui/checkbox';
   import { Label } from '@/components/ui/label';
   import { Alert, AlertDescription } from '@/components/ui/alert';
   import { AlertTriangle, Copy, Check, Loader2 } from 'lucide-react';
   import SelfCustodyNoticeDialog from '@/components/wallet/SelfCustodyNoticeDialog';

   interface SeedPhraseBackupPageProps {
     seedPhrase: string;
     paneId: string;
   }

   const SeedPhraseBackupPage: React.FC<SeedPhraseBackupPageProps> = ({ seedPhrase, paneId }) => {
     const { _initializeWalletWithSeed, hasSeenSelfCustodyNotice, error, isLoading, clearError } = useWalletStore(
       (state) => ({
         _initializeWalletWithSeed: state._initializeWalletWithSeed,
         hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
         error: state.error,
         isLoading: state.isLoading,
         clearError: state.clearError,
       }),
       shallow // <-- Add shallow
     );
     const removePane = usePaneStore((state) => state.removePane, shallow);

     const [isSaved, setIsSaved] = useState(false);
     const [copied, setCopied] = useState(false);
     const [isInitializing, setIsInitializing] = useState(false);
     const [showSelfCustodyDialog, setShowSelfCustodyDialog] = useState(false);

     const handleCopyToClipboard = useCallback(() => {
        if (seedPhrase) {
          navigator.clipboard.writeText(seedPhrase).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }
      }, [seedPhrase]);

      const displaySeedPhraseWords = useCallback(() => {
        if (!seedPhrase) return null;
        const words = seedPhrase.split(' ');
        return (
          <div className="grid grid-cols-3 gap-2 my-4">
            {words.map((word, index) => (
              <div key={index} className="flex items-center"> {/* Added items-center for better alignment */}
                <span className="bg-muted w-6 h-6 mr-1.5 flex items-center justify-center rounded-sm text-xs"> {/* Adjusted styling */}
                  {index + 1}
                </span>
                <span className="font-mono text-sm">{word}</span> {/* Ensured consistent text size */}
              </div>
            ))}
          </div>
        );
      }, [seedPhrase]);

     const handleContinue = useCallback(async () => {
       if (!seedPhrase) return;
       setIsInitializing(true);
       clearError();
       try {
         const success = await _initializeWalletWithSeed(seedPhrase, true);
         if (success) {
           removePane(paneId);
           if (!hasSeenSelfCustodyNotice) {
             setShowSelfCustodyDialog(true);
           }
         }
       } finally {
         setIsInitializing(false);
       }
     }, [seedPhrase, clearError, _initializeWalletWithSeed, removePane, paneId, hasSeenSelfCustodyNotice]);

     return (
       <div className="container flex items-center justify-center min-h-full p-4">
         {/* ... rest of the JSX remains the same ... */}
         <Card className="w-full max-w-md">
            <CardHeader>
            <CardTitle className="text-2xl text-center">Your Secret Recovery Phrase</CardTitle>
            <CardDescription className="text-center">
                Write down these 12 words in order and keep them somewhere safe.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                This is your password to your money. If you lose it, you will lose your money! Never share this phrase with anyone.
                </AlertDescription>
            </Alert>

            <div className="bg-muted/30 p-4 rounded-md border border-border">
                {displaySeedPhraseWords()}
            </div>

            <Button
                onClick={handleCopyToClipboard}
                variant="outline"
                className="w-full"
                disabled={copied}
            >
                {copied ? (
                <>
                    <Check className="mr-2 h-4 w-4" /> Copied to Clipboard
                </>
                ) : (
                <>
                    <Copy className="mr-2 h-4 w-4" /> Copy Seed Phrase
                </>
                )}
            </Button>

            <div className="flex items-start space-x-2 pt-4">
                <Checkbox id="confirm-saved" checked={isSaved} onCheckedChange={(checked) => setIsSaved(Boolean(checked))} />
                <Label htmlFor="confirm-saved" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I have saved my seed phrase securely.
                </Label>
            </div>

            <Button
                onClick={handleContinue}
                className="w-full"
                disabled={!isSaved || isLoading || isInitializing}
            >
                {(isLoading || isInitializing) ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                </>
                ) : (
                'Continue'
                )}
            </Button>

            {error && (
                <div className="text-destructive text-sm text-center mt-2">
                {error}
                </div>
            )}
            </CardContent>
        </Card>
         <SelfCustodyNoticeDialog
           open={showSelfCustodyDialog}
           onOpenChange={setShowSelfCustodyDialog}
         />
       </div>
     );
   };

   export default SeedPhraseBackupPage;
   ```

   **File: `src/pages/RestoreWalletPage.tsx`**
   ```typescript
   // src/pages/RestoreWalletPage.tsx
   import React, { useState, useCallback } from 'react';
   import { useWalletStore } from '@/stores/walletStore';
   import { usePaneStore } from '@/stores/pane';
   import { shallow } from 'zustand/shallow'; // Import shallow
   import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   import { Textarea } from '@/components/ui/textarea';
   import { Loader2, KeyRound } from 'lucide-react';
   import SelfCustodyNoticeDialog from '@/components/wallet/SelfCustodyNoticeDialog';

   interface RestoreWalletPageProps {
     paneId: string;
   }

   const RestoreWalletPage: React.FC<RestoreWalletPageProps> = ({ paneId }) => {
     const { restoreWallet, hasSeenSelfCustodyNotice, error, isLoading, clearError } = useWalletStore(
       (state) => ({
         restoreWallet: state.restoreWallet,
         hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
         error: state.error,
         isLoading: state.isLoading,
         clearError: state.clearError,
       }),
       shallow // <-- Add shallow
     );

     const { removePane, openWalletSetupPane } = usePaneStore(
       (state) => ({
         removePane: state.removePane,
         openWalletSetupPane: state.openWalletSetupPane,
       }),
       shallow // <-- Add shallow
     );

     const [seedPhrase, setSeedPhrase] = useState('');
     const [isRestoring, setIsRestoring] = useState(false);
     const [showSelfCustodyDialog, setShowSelfCustodyDialog] = useState(false);

     const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
       setSeedPhrase(e.target.value);
       if (error) clearError();
     }, [error, clearError]);

     const handleRestore = useCallback(async () => {
       if (!seedPhrase.trim()) return;
       setIsRestoring(true);
       clearError();
       try {
         const success = await restoreWallet(seedPhrase.trim());
         if (success) {
           removePane(paneId);
           if (!hasSeenSelfCustodyNotice) {
             setShowSelfCustodyDialog(true);
           }
         }
       } finally {
         setIsRestoring(false);
       }
     }, [seedPhrase, clearError, restoreWallet, removePane, paneId, hasSeenSelfCustodyNotice]);

     const handleBackToSetup = useCallback(() => {
       clearError();
       removePane(paneId);
       openWalletSetupPane();
     }, [clearError, removePane, paneId, openWalletSetupPane]);

     return (
       <div className="container flex items-center justify-center min-h-full p-4">
         {/* ... rest of the JSX remains the same ... */}
         <Card className="w-full max-w-md">
            <CardHeader className="text-center">
            <div className="mb-2 flex justify-center">
                <KeyRound className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Enter Your Seed Phrase</CardTitle>
            <CardDescription>
                Enter your 12 or 24 word recovery phrase to restore your wallet. Separate words with spaces.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <Textarea
                placeholder="Enter seed phrase..."
                value={seedPhrase}
                onChange={handleInputChange}
                rows={5}
                className="font-mono text-sm"
            />

            <Button
                onClick={handleRestore}
                className="w-full"
                disabled={!seedPhrase.trim() || isLoading || isRestoring}
            >
                {(isLoading || isRestoring) ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restoring Wallet...
                </>
                ) : (
                'Restore Wallet'
                )}
            </Button>

            <Button
                onClick={handleBackToSetup}
                variant="outline"
                className="w-full"
            >
                Back to Setup
            </Button>

            {error && (
                <div className="text-destructive text-sm text-center mt-2">
                {error}
                </div>
            )}
            </CardContent>
        </Card>
         <SelfCustodyNoticeDialog
           open={showSelfCustodyDialog}
           onOpenChange={setShowSelfCustodyDialog}
         />
       </div>
     );
   };

   export default RestoreWalletPage;
   ```

This should resolve the infinite loop by correctly caching the selectors' results in the identified components. Also made `React.memo` consistent for `WalletSetupPage`. Corrected an issue with `Checkbox` `onCheckedChange` in `SeedPhraseBackupPage` and `useCallback` for handlers.

```

File: src/pages/WalletSetupPage.tsx

```typescript
import React, { useState, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet as WalletIcon } from 'lucide-react';

interface WalletSetupPageProps {
  paneId: string;
}

const WalletSetupPage: React.FC<WalletSetupPageProps> = ({ paneId }) => {
  const { generateNewWallet, isLoading, error, clearError } = useWalletStore(
    (state) => ({
      generateNewWallet: state.generateNewWallet,
      isLoading: state.isLoading,
      error: state.error,
      clearError: state.clearError,
    }),
    shallow
  );

  const { openSeedPhraseBackupPane, openRestoreWalletPane, removePane } = usePaneStore(
    (state) => ({
      openSeedPhraseBackupPane: state.openSeedPhraseBackupPane,
      openRestoreWalletPane: state.openRestoreWalletPane,
      removePane: state.removePane,
    }),
    shallow
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateNewWallet = useCallback(async () => {
    setIsGenerating(true);
    clearError();
    try {
      const newSeedPhrase = await generateNewWallet();
      if (newSeedPhrase) {
        openSeedPhraseBackupPane({ seedPhrase: newSeedPhrase });
        removePane(paneId);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [clearError, generateNewWallet, openSeedPhraseBackupPane, paneId, removePane]);

  const handleRestoreWallet = useCallback(() => {
    clearError();
    openRestoreWalletPane();
    removePane(paneId);
  }, [clearError, openRestoreWalletPane, paneId, removePane]);

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <WalletIcon className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Commander Wallet</CardTitle>
          <CardDescription>
            Securely manage your funds and agent interactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleCreateNewWallet}
            className="w-full"
            size="lg"
            disabled={isLoading || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating New Wallet...
              </>
            ) : (
              'Create New Wallet'
            )}
          </Button>
          <Button
            onClick={handleRestoreWallet}
            className="w-full"
            size="lg"
            variant="outline"
            disabled={isLoading || isGenerating}
          >
            Restore Existing Wallet
          </Button>
          {error && (
            <div className="text-destructive text-sm text-center mt-4">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(WalletSetupPage); // Keep React.memo for this component
```

File: src/pages/SeedPhraseBackupPage.tsx

```typescript
import React, { useState, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Copy, Check, Loader2 } from 'lucide-react';
import SelfCustodyNoticeDialog from '@/components/wallet/SelfCustodyNoticeDialog';

interface SeedPhraseBackupPageProps {
  seedPhrase: string;
  paneId: string;
}

const SeedPhraseBackupPage: React.FC<SeedPhraseBackupPageProps> = ({ seedPhrase, paneId }) => {
  const { _initializeWalletWithSeed, hasSeenSelfCustodyNotice, error, isLoading, clearError } = useWalletStore(
    (state) => ({
      _initializeWalletWithSeed: state._initializeWalletWithSeed,
      hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
      error: state.error,
      isLoading: state.isLoading,
      clearError: state.clearError,
    }),
    shallow
  );

  // For single function selectors, shallow is often not necessary, but can be kept for consistency
  // or if the store might return a new function reference under certain conditions (unlikely for basic Zustand).
  const removePane = usePaneStore((state) => state.removePane, shallow);

  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSelfCustodyDialog, setShowSelfCustodyDialog] = useState(false);

  const handleCopyToClipboard = useCallback(() => {
    if (seedPhrase) {
      navigator.clipboard.writeText(seedPhrase).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [seedPhrase]);

  const displaySeedPhraseWords = useCallback(() => {
    if (!seedPhrase) return null;
    const words = seedPhrase.split(' ');
    return (
      <div className="grid grid-cols-3 gap-2 my-4">
        {words.map((word, index) => (
          <div key={index} className="flex items-center">
            <span className="bg-muted w-6 h-6 mr-1.5 flex items-center justify-center rounded-sm text-xs">
              {index + 1}
            </span>
            <span className="font-mono text-sm">{word}</span>
          </div>
        ))}
      </div>
    );
  }, [seedPhrase]);

  const handleContinue = useCallback(async () => {
    if (!seedPhrase) return;
    setIsInitializing(true);
    clearError();
    try {
      const success = await _initializeWalletWithSeed(seedPhrase, true);
      if (success) {
        removePane(paneId);
        if (!hasSeenSelfCustodyNotice) {
          setShowSelfCustodyDialog(true);
        }
      }
    } finally {
      setIsInitializing(false);
    }
  }, [seedPhrase, clearError, _initializeWalletWithSeed, removePane, paneId, hasSeenSelfCustodyNotice]);

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Your Secret Recovery Phrase</CardTitle>
          <CardDescription className="text-center">
            Write down these 12 words in order and keep them somewhere safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is your password to your money. If you lose it, you will lose your money! Never share this phrase with anyone.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/30 p-4 rounded-md border border-border">
            {displaySeedPhraseWords()}
          </div>

          <Button
            onClick={handleCopyToClipboard}
            variant="outline"
            className="w-full"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" /> Copy Seed Phrase
              </>
            )}
          </Button>

          <div className="flex items-start space-x-2 pt-4">
            <Checkbox id="confirm-saved" checked={isSaved} onCheckedChange={(checked) => setIsSaved(Boolean(checked))} />
            <Label htmlFor="confirm-saved" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I have saved my seed phrase securely.
            </Label>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full"
            disabled={!isSaved || isLoading || isInitializing}
          >
            {(isLoading || isInitializing) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              'Continue'
            )}
          </Button>

          {error && (
            <div className="text-destructive text-sm text-center mt-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
      <SelfCustodyNoticeDialog
        open={showSelfCustodyDialog}
        onOpenChange={setShowSelfCustodyDialog}
      />
    </div>
  );
};

export default SeedPhraseBackupPage; // React.memo can be added if profiling shows it's beneficial
```

File: src/pages/RestoreWalletPage.tsx

```typescript
import React, { useState, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, KeyRound } from 'lucide-react';
import SelfCustodyNoticeDialog from '@/components/wallet/SelfCustodyNoticeDialog';

interface RestoreWalletPageProps {
  paneId: string;
}

const RestoreWalletPage: React.FC<RestoreWalletPageProps> = ({ paneId }) => {
  const { restoreWallet, hasSeenSelfCustodyNotice, error, isLoading, clearError } = useWalletStore(
    (state) => ({
      restoreWallet: state.restoreWallet,
      hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
      error: state.error,
      isLoading: state.isLoading,
      clearError: state.clearError,
    }),
    shallow
  );

  const { removePane, openWalletSetupPane } = usePaneStore(
    (state) => ({
      removePane: state.removePane,
      openWalletSetupPane: state.openWalletSetupPane,
    }),
    shallow
  );

  const [seedPhrase, setSeedPhrase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [showSelfCustodyDialog, setShowSelfCustodyDialog] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSeedPhrase(e.target.value);
    if (error) clearError();
  }, [error, clearError]);

  const handleRestore = useCallback(async () => {
    if (!seedPhrase.trim()) return;
    setIsRestoring(true);
    clearError();
    try {
      const success = await restoreWallet(seedPhrase.trim());
      if (success) {
        removePane(paneId);
        if (!hasSeenSelfCustodyNotice) {
          setShowSelfCustodyDialog(true);
        }
      }
    } finally {
      setIsRestoring(false);
    }
  }, [seedPhrase, clearError, restoreWallet, removePane, paneId, hasSeenSelfCustodyNotice]);

  const handleBackToSetup = useCallback(() => {
    clearError();
    removePane(paneId);
    openWalletSetupPane();
  }, [clearError, removePane, paneId, openWalletSetupPane]);

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <KeyRound className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enter Your Seed Phrase</CardTitle>
          <CardDescription>
            Enter your 12 or 24 word recovery phrase to restore your wallet. Separate words with spaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter seed phrase..."
            value={seedPhrase}
            onChange={handleInputChange}
            rows={5}
            className="font-mono text-sm"
          />

          <Button
            onClick={handleRestore}
            className="w-full"
            disabled={!seedPhrase.trim() || isLoading || isRestoring}
          >
            {(isLoading || isRestoring) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restoring Wallet...
              </>
            ) : (
              'Restore Wallet'
            )}
          </Button>

          <Button
            onClick={handleBackToSetup}
            variant="outline"
            className="w-full"
          >
            Back to Setup
          </Button>

          {error && (
            <div className="text-destructive text-sm text-center mt-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
      <SelfCustodyNoticeDialog
        open={showSelfCustodyDialog}
        onOpenChange={setShowSelfCustodyDialog}
      />
    </div>
  );
};

export default RestoreWalletPage;
```

This ensures that the identified components are using `shallow` equality for their Zustand selectors that return objects, which is the standard fix for the `getSnapshot should be cached` warning and the resulting infinite loop.

**Final Note:** The error `HomePage.tsx:148 Error: Maximum update depth exceeded.` appearing *after* `PaneManager` might mean that after `PaneManager` is fixed, a similar issue in `HomePage` (or a component it renders directly) becomes the next bottleneck. If the loop persists but the warning moves to `HomePage.tsx`, `HomePage.tsx` would be the next component to examine for its store subscriptions. However, the most direct and explicit warning was for `PaneManager.tsx`.The infinite loop issue, particularly the "Maximum update depth exceeded" error and the "getSnapshot should be cached" warning, is typically caused by Zustand store selectors returning new object or array references on every render. This makes React's `useSyncExternalStore` (which Zustand uses internally) believe the state has changed, triggering a re-render, even if the underlying data values are the same.

The fix involves using `shallow` from `zustand/shallow` as the equality checker for store hooks that select multiple properties or an object/array slice.

Here are the changes:

1.  **`src/panes/PaneManager.tsx`**:
    Applied `shallow` to the `usePaneStore` hook.

2.  **`src/pages/WalletSetupPage.tsx`**:
    Applied `shallow` to both `useWalletStore` and `usePaneStore` hooks.

3.  **`src/pages/SeedPhraseBackupPage.tsx`**:
    Applied `shallow` to `useWalletStore`. The `usePaneStore` selector for `removePane` is a single function, so `shallow` is less critical but added for consistency if future multi-property selections are made.

4.  **`src/pages/RestoreWalletPage.tsx`**:
    Applied `shallow` to both `useWalletStore` and `usePaneStore` hooks.

These changes ensure that the components only re-render when the actual values of the selected state (at a shallow level) change, not just because a new object reference was created by the selector.

```typescript
// src/panes/PaneManager.tsx
import React from 'react';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow'; // Import shallow
import { Pane as PaneComponent } from '@/panes/Pane';
import { Pane as PaneType } from '@/types/pane';
// ... other imports for page components ...
import SecondPage from '@/pages/SecondPage';
import WalletSetupPage from '@/pages/WalletSetupPage';
import SeedPhraseBackupPage from '@/pages/SeedPhraseBackupPage';
import RestoreWalletPage from '@/pages/RestoreWalletPage';
import { Nip28ChannelChat } from '@/components/nip28';
import { Nip90Dashboard } from '@/components/nip90';
import { SellComputePane } from '@/components/sell-compute';
import { DvmJobHistoryPane } from '@/components/dvm';
import { Nip90DvmTestPane } from '@/components/nip90_dvm_test';
import { Nip90ConsumerChatPane } from '@/components/nip90_consumer_chat';
import { Nip90GlobalFeedPane } from '@/components/nip90_feed';
import { WalletPane } from '@/components/wallet';


// Placeholder Content Components
const PlaceholderChatComponent = ({ threadId }: { threadId?: string }) => <div className="p-2">Chat Pane Content {threadId && `for ${threadId}`}</div>;
const PlaceholderChatsPaneComponent = () => <div className="p-2">Chats List Pane Content</div>;
const PlaceholderChangelogComponent = () => <div className="p-2">Changelog Pane Content</div>;
const PlaceholderDiffComponent = ({ oldContent, newContent }: { oldContent?: string, newContent?: string }) => (
  <div className="p-2">
    <h3>Old Content:</h3><pre className="bg-muted p-1 rounded text-xs">{oldContent || "N/A"}</pre>
    <h3>New Content:</h3><pre className="bg-muted p-1 rounded text-xs">{newContent || "N/A"}</pre>
  </div>
);
const PlaceholderUserStatusComponent = () => <div className="p-2">User Status Pane Content</div>;
const PlaceholderDefaultComponent = ({ type }: { type: string }) => <div className="p-2">Default Content for Pane Type: {type}</div>;


export const PaneManager = () => {
  // Apply shallow equality checker to the selector
  const { panes, activePaneId } = usePaneStore(
    (state) => ({
      panes: state.panes,
      activePaneId: state.activePaneId,
    }),
    shallow // <-- Add this
  );

  const baseZIndex = 10;

  return (
    <>
      {panes.map((pane: PaneType, index: number) => (
        <PaneComponent
          key={pane.id}
          title={pane.title}
          id={pane.id}
          x={pane.x}
          y={pane.y}
          height={pane.height}
          width={pane.width}
          type={pane.type}
          isActive={pane.id === activePaneId}
          style={{
            zIndex: baseZIndex + index
          }}
          dismissable={pane.dismissable !== false}
          content={pane.content}
        >
          {pane.type === 'chat' && <PlaceholderChatComponent threadId={pane.id.replace(/^chat-|^nip28-/, '')} />}
          {pane.type === 'chats' && <PlaceholderChatsPaneComponent />}
          {pane.type === 'changelog' && <PlaceholderChangelogComponent />}
          {pane.type === 'user' && <PlaceholderUserStatusComponent />}
          {pane.type === 'diff' && pane.content && (
            <PlaceholderDiffComponent oldContent={pane.content.oldContent} newContent={pane.content.newContent} />
          )}
          {pane.type === 'nip28_channel' && pane.content?.channelId && (
            <Nip28ChannelChat
              channelId={pane.content.channelId}
              channelName={pane.content.channelName || pane.title}
            />
          )}
          {pane.type === 'nip90_dashboard' && <Nip90Dashboard />}
          {pane.type === 'sell_compute' && <SellComputePane />}
          {pane.type === 'dvm_job_history' && <DvmJobHistoryPane />}
          {pane.type === 'nip90_dvm_test' && <Nip90DvmTestPane />}
          {pane.type === 'nip90_consumer_chat' && <Nip90ConsumerChatPane />}
          {pane.type === 'nip90_global_feed' && <Nip90GlobalFeedPane />}
          {pane.type === 'wallet' && <WalletPane />}
          {pane.type === 'second_page_content' && <SecondPage />}
          {pane.type === 'wallet_setup_content' && pane.id && (
            <WalletSetupPage paneId={pane.id} key={pane.id} />
          )}
          {pane.type === 'seed_phrase_backup_content' && pane.content?.seedPhrase && (
            <SeedPhraseBackupPage seedPhrase={pane.content.seedPhrase} paneId={pane.id} />
          )}
          {pane.type === 'restore_wallet_content' && pane.id && (
            <RestoreWalletPage paneId={pane.id} />
          )}
          {pane.type === 'default' && <PlaceholderDefaultComponent type={pane.type} />}
          {!(
            pane.type === 'chat' ||
            pane.type === 'chats' ||
            pane.type === 'changelog' ||
            pane.type === 'user' ||
            pane.type === 'diff' ||
            pane.type === 'nip28_channel' ||
            pane.type === 'nip90_dashboard' ||
            pane.type === 'sell_compute' ||
            pane.type === 'dvm_job_history' ||
            pane.type === 'nip90_dvm_test' ||
            pane.type === 'nip90_consumer_chat' ||
            pane.type === 'nip90_global_feed' ||
            pane.type === 'wallet' ||
            pane.type === 'second_page_content' ||
            pane.type === 'wallet_setup_content' ||
            pane.type === 'seed_phrase_backup_content' ||
            pane.type === 'restore_wallet_content' ||
            pane.type === 'default'
          ) && <PlaceholderDefaultComponent type={pane.type} />}
        </PaneComponent>
      ))}
    </>
  );
};
```

```typescript
// src/pages/WalletSetupPage.tsx
import React, { useState, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow'; // Import shallow
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet as WalletIcon } from 'lucide-react';

interface WalletSetupPageProps {
  paneId: string;
}

const WalletSetupPage: React.FC<WalletSetupPageProps> = ({ paneId }) => {
  const { generateNewWallet, isLoading, error, clearError } = useWalletStore(
    (state) => ({
      generateNewWallet: state.generateNewWallet,
      isLoading: state.isLoading,
      error: state.error,
      clearError: state.clearError,
    }),
    shallow // <-- Add shallow
  );

  const { openSeedPhraseBackupPane, openRestoreWalletPane, removePane } = usePaneStore(
    (state) => ({
      openSeedPhraseBackupPane: state.openSeedPhraseBackupPane,
      openRestoreWalletPane: state.openRestoreWalletPane,
      removePane: state.removePane,
    }),
    shallow // <-- Add shallow
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateNewWallet = useCallback(async () => {
    setIsGenerating(true);
    clearError();
    try {
      const newSeedPhrase = await generateNewWallet();
      if (newSeedPhrase) {
        openSeedPhraseBackupPane({ seedPhrase: newSeedPhrase });
        removePane(paneId);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [clearError, generateNewWallet, openSeedPhraseBackupPane, paneId, removePane]);

  const handleRestoreWallet = useCallback(() => {
    clearError();
    openRestoreWalletPane();
    removePane(paneId);
  }, [clearError, openRestoreWalletPane, paneId, removePane]);

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <WalletIcon className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Commander Wallet</CardTitle>
          <CardDescription>
            Securely manage your funds and agent interactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleCreateNewWallet}
            className="w-full"
            size="lg"
            disabled={isLoading || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating New Wallet...
              </>
            ) : (
              'Create New Wallet'
            )}
          </Button>
          <Button
            onClick={handleRestoreWallet}
            className="w-full"
            size="lg"
            variant="outline"
            disabled={isLoading || isGenerating} // Corrected: also disable if generating
          >
            Restore Existing Wallet
          </Button>
          {error && (
            <div className="text-destructive text-sm text-center mt-4">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default React.memo(WalletSetupPage);
```

```typescript
// src/pages/SeedPhraseBackupPage.tsx
import React, { useState, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow'; // Import shallow
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Copy, Check, Loader2 } from 'lucide-react';
import SelfCustodyNoticeDialog from '@/components/wallet/SelfCustodyNoticeDialog';

interface SeedPhraseBackupPageProps {
  seedPhrase: string;
  paneId: string;
}

const SeedPhraseBackupPage: React.FC<SeedPhraseBackupPageProps> = ({ seedPhrase, paneId }) => {
  const { _initializeWalletWithSeed, hasSeenSelfCustodyNotice, error, isLoading, clearError } = useWalletStore(
    (state) => ({
      _initializeWalletWithSeed: state._initializeWalletWithSeed,
      hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
      error: state.error,
      isLoading: state.isLoading,
      clearError: state.clearError,
    }),
    shallow // <-- Add shallow
  );

  const removePane = usePaneStore((state) => state.removePane, shallow);

  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSelfCustodyDialog, setShowSelfCustodyDialog] = useState(false);

  const handleCopyToClipboard = useCallback(() => {
    if (seedPhrase) {
      navigator.clipboard.writeText(seedPhrase).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [seedPhrase]);

  const displaySeedPhraseWords = useCallback(() => {
    if (!seedPhrase) return null;
    const words = seedPhrase.split(' ');
    return (
      <div className="grid grid-cols-3 gap-2 my-4">
        {words.map((word, index) => (
          <div key={index} className="flex items-center">
            <span className="bg-muted w-6 h-6 mr-1.5 flex items-center justify-center rounded-sm text-xs">
              {index + 1}
            </span>
            <span className="font-mono text-sm">{word}</span>
          </div>
        ))}
      </div>
    );
  }, [seedPhrase]);

  const handleContinue = useCallback(async () => {
    if (!seedPhrase) return;
    setIsInitializing(true);
    clearError();
    try {
      const success = await _initializeWalletWithSeed(seedPhrase, true);
      if (success) {
        removePane(paneId);
        if (!hasSeenSelfCustodyNotice) {
          setShowSelfCustodyDialog(true);
        }
      }
    } finally {
      setIsInitializing(false);
    }
  }, [seedPhrase, clearError, _initializeWalletWithSeed, removePane, paneId, hasSeenSelfCustodyNotice]);

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Your Secret Recovery Phrase</CardTitle>
          <CardDescription className="text-center">
            Write down these 12 words in order and keep them somewhere safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is your password to your money. If you lose it, you will lose your money! Never share this phrase with anyone.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/30 p-4 rounded-md border border-border">
            {displaySeedPhraseWords()}
          </div>

          <Button
            onClick={handleCopyToClipboard}
            variant="outline"
            className="w-full"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" /> Copy Seed Phrase
              </>
            )}
          </Button>

          <div className="flex items-start space-x-2 pt-4">
            <Checkbox id="confirm-saved" checked={isSaved} onCheckedChange={(checked) => setIsSaved(Boolean(checked))} />
            <Label htmlFor="confirm-saved" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I have saved my seed phrase securely.
            </Label>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full"
            disabled={!isSaved || isLoading || isInitializing}
          >
            {(isLoading || isInitializing) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              'Continue'
            )}
          </Button>

          {error && (
            <div className="text-destructive text-sm text-center mt-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
      <SelfCustodyNoticeDialog
        open={showSelfCustodyDialog}
        onOpenChange={setShowSelfCustodyDialog}
      />
    </div>
  );
};

export default SeedPhraseBackupPage;
```

```typescript
// src/pages/RestoreWalletPage.tsx
import React, { useState, useCallback } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { usePaneStore } from '@/stores/pane';
import { shallow } from 'zustand/shallow'; // Import shallow
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, KeyRound } from 'lucide-react';
import SelfCustodyNoticeDialog from '@/components/wallet/SelfCustodyNoticeDialog';

interface RestoreWalletPageProps {
  paneId: string;
}

const RestoreWalletPage: React.FC<RestoreWalletPageProps> = ({ paneId }) => {
  const { restoreWallet, hasSeenSelfCustodyNotice, error, isLoading, clearError } = useWalletStore(
    (state) => ({
      restoreWallet: state.restoreWallet,
      hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
      error: state.error,
      isLoading: state.isLoading,
      clearError: state.clearError,
    }),
    shallow // <-- Add shallow
  );

  const { removePane, openWalletSetupPane } = usePaneStore(
    (state) => ({
      removePane: state.removePane,
      openWalletSetupPane: state.openWalletSetupPane,
    }),
    shallow
  );

  const [seedPhrase, setSeedPhrase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [showSelfCustodyDialog, setShowSelfCustodyDialog] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSeedPhrase(e.target.value);
    if (error) clearError();
  }, [error, clearError]);

  const handleRestore = useCallback(async () => {
    if (!seedPhrase.trim()) return;
    setIsRestoring(true);
    clearError();
    try {
      const success = await restoreWallet(seedPhrase.trim());
      if (success) {
        removePane(paneId);
        if (!hasSeenSelfCustodyNotice) {
          setShowSelfCustodyDialog(true);
        }
      }
    } finally {
      setIsRestoring(false);
    }
  }, [seedPhrase, clearError, restoreWallet, removePane, paneId, hasSeenSelfCustodyNotice]);

  const handleBackToSetup = useCallback(() => {
    clearError();
    removePane(paneId);
    openWalletSetupPane();
  }, [clearError, removePane, paneId, openWalletSetupPane]);

  return (
    <div className="container flex items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <KeyRound className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enter Your Seed Phrase</CardTitle>
          <CardDescription>
            Enter your 12 or 24 word recovery phrase to restore your wallet. Separate words with spaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter seed phrase..."
            value={seedPhrase}
            onChange={handleInputChange}
            rows={5}
            className="font-mono text-sm"
          />

          <Button
            onClick={handleRestore}
            className="w-full"
            disabled={!seedPhrase.trim() || isLoading || isRestoring}
          >
            {(isLoading || isRestoring) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Restoring Wallet...
              </>
            ) : (
              'Restore Wallet'
            )}
          </Button>

          <Button
            onClick={handleBackToSetup}
            variant="outline"
            className="w-full"
          >
            Back to Setup
          </Button>

          {error && (
            <div className="text-destructive text-sm text-center mt-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
      <SelfCustodyNoticeDialog
        open={showSelfCustodyDialog}
        onOpenChange={setShowSelfCustodyDialog}
      />
    </div>
  );
};

export default RestoreWalletPage;
```

**Explanation of Fix:**

The `shallow` equality checker provided by Zustand ensures that when a selector returns an object (like `{ panes: state.panes, activePaneId: state.activePaneId }`), the component will only re-render if the *values* of the properties in the selected object change (or if the `panes` array reference itself changes in the store). It performs a shallow comparison of the properties of the previously selected object and the newly selected object. Without `shallow`, React sees a new object reference on every render (because `state => ({ ... })` creates a new object) and assumes the state has changed, leading to the loop.

The `HomePage.tsx:148 Error: Maximum update depth exceeded.` was likely a cascading effect of the `PaneManager` re-rendering infinitely. Once the `PaneManager`'s store subscription is stabilized with `shallow`, this error in `HomePage` should also resolve, assuming `HomePage` itself isn't introducing another loop through its own store subscriptions or effects. If the error persists but moves to `HomePage.tsx` in the stack trace, `HomePage`'s `usePaneStore()` call would need scrutiny. However, the most prominent warning specifically targeted `PaneManager.tsx`.

The `React.memo` on `WalletSetupPage` is helpful for preventing re-renders if its props don't change, but the `shallow` fix addresses the root cause of the re-renders triggered by the store subscription itself.

One minor correction: In `SeedPhraseBackupPage.tsx`, the `onCheckedChange` prop of `Checkbox` expects a boolean or `CheckedState` (from Radix UI). Passing `setIsSaved(!isSaved)` directly might cause type issues if `isSaved` is boolean and `onCheckedChange` expects a function that takes the new checked state. The correct way is `onCheckedChange={(checked) => setIsSaved(Boolean(checked))}`. This has been applied.
