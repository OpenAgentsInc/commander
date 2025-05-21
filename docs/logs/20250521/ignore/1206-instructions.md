Okay, let's create the instructions to implement a more explicit seed phrase-based wallet management system. This will involve creating several new UI components and a Zustand store to manage the wallet's state (seed phrase, initialization status).

**I. Project Setup (Assumed)**

*   Ensure `BIP39Service` and `SparkService` are available and correctly implemented as per previous Effect-TS patterns.
*   `BIP39Service` should provide `generateMnemonic`, `validateMnemonic`, and `mnemonicToSeed`.
*   `SparkService` needs a way to be initialized with a mnemonic/seed (e.g., `SparkService.initializeWallet(mnemonic: string)` or by dynamically providing its config layer). For these instructions, we'll assume `SparkService.initializeWallet(mnemonic)` can be called.

**II. New Zustand Store for Wallet State**

1.  **Create `src/stores/walletStore.ts`:**
    ```typescript
    // src/stores/walletStore.ts
    import { create } from 'zustand';
    import { persist, createJSONStorage } from 'zustand/middleware';
    import { Effect } from 'effect';
    import { BIP39Service } from '@/services/bip39';
    // Import SparkService and its error type if you have specific initialization logic here
    // import { SparkService, SparkError } from '@/services/spark';
    import { getMainRuntime } from '@/services/runtime'; // To run Effects

    interface WalletState {
      seedPhrase: string | null;
      isInitialized: boolean;
      isLoading: boolean;
      error: string | null;
      hasSeenSelfCustodyNotice: boolean;
    }

    interface WalletActions {
      generateNewWallet: () => Promise<string | null>; // Returns seed phrase or null on error
      restoreWallet: (mnemonic: string) => Promise<boolean>; // Returns true on success, false on error
      getSeedPhrase: () => string | null;
      logout: () => void;
      setHasSeenSelfCustodyNotice: () => void;
      clearError: () => void;
      // Placeholder for initializing dependent services like Spark
      _initializeServices: (mnemonic: string) => Promise<void>;
    }

    export const useWalletStore = create<WalletState & WalletActions>()(
      persist(
        (set, get) => ({
          seedPhrase: null,
          isInitialized: false,
          isLoading: false,
          error: null,
          hasSeenSelfCustodyNotice: false,

          generateNewWallet: async () => {
            set({ isLoading: true, error: null });
            const runtime = getMainRuntime();
            const program = Effect.flatMap(BIP39Service, bip39 => bip39.generateMnemonic({ strength: 128 }));
            const result = await Effect.runPromiseExit(Effect.provide(program, runtime));

            if (result._tag === 'Success') {
              const newSeedPhrase = result.value;
              // DO NOT set isInitialized or seedPhrase here yet.
              // This will be done after user confirms backup.
              set({ isLoading: false });
              return newSeedPhrase;
            } else {
              const error = Effect.Cause.squash(result.cause);
              console.error("Failed to generate mnemonic:", error);
              set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to generate seed phrase" });
              return null;
            }
          },

          // This action is called AFTER user confirms backup of a NEWLY generated seed
          // or after successful RESTORE.
          _initializeWalletWithSeed: async (mnemonic: string, isNewWallet: boolean) => {
            set({ isLoading: true, error: null });
            // Here, you would typically also initialize other services like SparkService
            // For example:
            // const runtime = getMainRuntime();
            // const sparkInitProgram = Effect.flatMap(SparkService, spark => spark.initializeWallet(mnemonic));
            // const sparkResult = await Effect.runPromiseExit(Effect.provide(sparkInitProgram, runtime));
            // if (sparkResult._tag === 'Failure') {
            //   const error = Effect.Cause.squash(sparkResult.cause);
            //   set({ isLoading: false, error: `Failed to initialize Spark: ${error.message}` });
            //   return false;
            // }
            // console.log("SparkService initialized with new/restored seed.");

            // Simulate service initialization delay
            await new Promise(resolve => setTimeout(resolve, 500));

            set({
              seedPhrase: mnemonic, // Now store the seed
              isInitialized: true,
              isLoading: false,
              error: null,
              hasSeenSelfCustodyNotice: isNewWallet ? false : get().hasSeenSelfCustodyNotice, // Reset notice for new wallet
            });
            return true;
          },

          restoreWallet: async (mnemonic: string) => {
            set({ isLoading: true, error: null });
            const runtime = getMainRuntime();
            const validateProgram = Effect.flatMap(BIP39Service, bip39 => bip39.validateMnemonic(mnemonic.trim()));
            const validationResult = await Effect.runPromiseExit(Effect.provide(validateProgram, runtime));

            if (validationResult._tag === 'Success' && validationResult.value) {
              // Mnemonic is valid, now finalize by calling _initializeWalletWithSeed
              return get()._initializeWalletWithSeed(mnemonic.trim(), false);
            } else {
              const errorMsg = (validationResult._tag === 'Failure')
                ? (Effect.Cause.squash(validationResult.cause) as Error).message
                : "Invalid seed phrase.";
              set({ isLoading: false, error: errorMsg });
              return false;
            }
          },

          getSeedPhrase: () => get().seedPhrase,

          logout: () => {
            // Placeholder: In a real app, you'd also clear other sensitive data and services
            console.log("Logging out, clearing seed phrase and initialization state.");
            set({ seedPhrase: null, isInitialized: false, isLoading: false, error: null });
            // Potentially clear other stores or trigger service cleanups
          },

          setHasSeenSelfCustodyNotice: () => {
            set({ hasSeenSelfCustodyNotice: true });
          },
          clearError: () => {
            set({ error: null });
          },
           _initializeServices: async (mnemonic: string) => {
            // This is a conceptual placeholder. Actual implementation depends on SparkService.
            console.log(`WalletStore: Initializing services with mnemonic starting with: ${mnemonic.substring(0,5)}...`);
            // Example:
            // const runtime = getMainRuntime();
            // const program = Effect.flatMap(SparkService, service => service.initializeWallet(mnemonic));
            // await Effect.runPromise(Effect.provide(program, runtime));
            await new Promise(r => setTimeout(r, 500)); // Simulate async
            console.log("WalletStore: Services initialized.");
          },
        }),
        {
          name: 'commander-wallet-store',
          storage: createJSONStorage(() => localStorage), // Or Electron secure storage via IPC
          partialize: (state) => ({ // Only persist these fields
            seedPhrase: state.seedPhrase, // Consider encrypting this
            isInitialized: state.isInitialized,
            hasSeenSelfCustodyNotice: state.hasSeenSelfCustodyNotice,
          }),
          onRehydrateStorage: () => (state) => {
            // When rehydrating, if a seed phrase exists, ensure services are initialized.
            if (state?.seedPhrase && state?.isInitialized) {
              console.log("Rehydrating wallet store, found existing seed phrase. Initializing services...");
              state._initializeServices(state.seedPhrase);
            }
          }
        }
      )
    );
    ```

**III. New UI Components**

1.  **`src/pages/WalletSetupPage.tsx`**
    *   **Purpose:** Initial screen if no wallet is set up. Offers "Create New" or "Restore".
    *   **Shadcn UI:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Button`.
    *   **Content:**
        *   Title: "Welcome to Commander Wallet"
        *   Description: "Securely manage your funds and agent interactions."
        *   Button 1: "Create New Wallet" (navigates to `/backup-seed-phrase` after generating seed).
        *   Button 2: "Restore Existing Wallet" (navigates to `/restore-wallet`).
    *   **Logic:**
        *   On "Create New Wallet" click:
            1.  Call `useWalletStore.getState().generateNewWallet()`.
            2.  On success, get the `newSeedPhrase`.
            3.  Navigate to `/backup-seed-phrase` route, passing the `newSeedPhrase` via route state or a temporary store.
        *   Loading/error states from `useWalletStore`.

2.  **`src/pages/SeedPhraseBackupPage.tsx`** (Corresponds to image 3)
    *   **Purpose:** Display a newly generated seed phrase for backup.
    *   **Shadcn UI:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `Alert` (for critical warning), `Textarea` (read-only, for displaying words), `Checkbox`, `Button`.
    *   **Content:**
        *   Title: "Your Secret Recovery Phrase"
        *   Description: "Write down these 12 words in order and keep them somewhere safe."
        *   Critical Warning (using `Alert` with `variant="destructive"`): "This is your password to your money. If you lose it, you will lose your money! Never share this phrase with anyone."
        *   Display seed phrase (e.g., numbered list or space-separated words).
        *   Button: "Copy Seed Phrase" (copies to clipboard).
        *   Checkbox: "I have saved my seed phrase securely."
        *   Button: "Continue" (enabled only if checkbox is ticked).
    *   **Logic:**
        *   Receives `newSeedPhrase` (e.g., from route state).
        *   On "Continue" click:
            1.  Call `useWalletStore.getState()._initializeWalletWithSeed(newSeedPhrase, true)`.
            2.  If `!hasSeenSelfCustodyNotice`, show `SelfCustodyNoticeDialog`.
            3.  Else, navigate to main app.

3.  **`src/pages/RestoreWalletPage.tsx`** (Corresponds to image 5)
    *   **Purpose:** Allow user to enter a seed phrase to restore a wallet.
    *   **Shadcn UI:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `Textarea` (for input), `Button`.
    *   **Content:**
        *   Title: "Enter Your Seed Phrase"
        *   Description: "Enter your 12 or 24 word recovery phrase to restore your wallet. Separate words with spaces."
        *   Textarea for seed phrase input.
        *   Button: "Restore Wallet".
    *   **Logic:**
        *   On "Restore Wallet" click:
            1.  Call `useWalletStore.getState().restoreWallet(enteredPhrase)`.
            2.  On success: If `!hasSeenSelfCustodyNotice`, show `SelfCustodyNoticeDialog`. Else, navigate to main app.
            3.  On failure: Display error message from `useWalletStore.error`.
        *   Loading/error states from `useWalletStore`.

4.  **`src/components/wallet/ViewSeedPhraseDialog.tsx`** (Corresponds to image 2/3)
    *   **Purpose:** Dialog to display the current wallet's seed phrase.
    *   **Shadcn UI:** `Dialog`, `DialogTrigger` (this will be the "View Seed Phrase" button), `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `Alert` (for warning), `Textarea` (read-only), `Button` (Copy, Close).
    *   **Content:**
        *   Title: "Your Seed Phrase"
        *   Description: "Keep this phrase safe. Anyone with access to it can control your wallet."
        *   Warning: "Never share this phrase. Losing it means losing access to your funds."
        *   Displays `useWalletStore.getState().getSeedPhrase()`.
    *   **Trigger:** A new "View Seed Phrase" button in `WalletPane.tsx` (or app settings).

5.  **`src/components/wallet/LogoutWarningDialog.tsx`** (Corresponds to image 1)
    *   **Purpose:** Warn user before logging out.
    *   **Shadcn UI:** `Dialog`, `DialogTrigger` (the "Logout" button), `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `Alert`, `Button` ("Cancel", "Logout Anyway").
    *   **Content:**
        *   Title: "Are you sure you want to logout?"
        *   Description: "If you haven't backed up your seed phrase, you won't be able to access your funds."
        *   Warning (`Alert`): "Make sure you've saved your seed phrase before logging out!"
    *   **Logic:** "Logout Anyway" calls `useWalletStore.getState().logout()`.

6.  **`src/components/wallet/SelfCustodyNoticeDialog.tsx`** (Corresponds to image 4)
    *   **Purpose:** Inform user about self-custody.
    *   **Shadcn UI:** `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `Alert`, `Button` ("I Understand, Continue").
    *   **Content:**
        *   Title: "Important Notice"
        *   Notice (`Alert`): Details about self-custody and user responsibility.
    *   **Logic:** "I Understand, Continue" calls `useWalletStore.getState().setHasSeenSelfCustodyNotice()` and closes dialog, then navigates to main app.

**IV. Router Updates (`src/routes/routes.tsx` and `src/routes/router.tsx`)**

1.  Add new routes for:
    *   `/setup-wallet` (for `WalletSetupPage.tsx`)
    *   `/backup-seed-phrase` (for `SeedPhraseBackupPage.tsx`)
    *   `/restore-wallet` (for `RestoreWalletPage.tsx`)
2.  Modify the root route or a layout route in `router.tsx` or `App.tsx` to check `useWalletStore.isInitialized`.
    *   If `false` and not on a setup/restore path, redirect to `/setup-wallet`.
    *   If `true` and on `/setup-wallet`, redirect to `/` (main app).

**V. Integration in Existing Components**

1.  **`src/pages/HomePage.tsx` (or equivalent main app view):**
    *   Wrap with a component that checks `useWalletStore.isInitialized`. If not, redirect to `/setup-wallet`.
2.  **`src/components/wallet/WalletPane.tsx`:**
    *   Add a "View Seed Phrase" button that triggers `ViewSeedPhraseDialog.tsx`.
    *   Add a "Logout" button that triggers `LogoutWarningDialog.tsx`.
3.  **Main App Initialization (`App.tsx` or `renderer.ts`):**
    *   After `useWalletStore` is rehydrated, if `isInitialized` and `seedPhrase` exist, ensure `SparkService` (and other services) are initialized with this seed. This might be handled by the `_initializeServices` method in the store's `onRehydrateStorage`.

**VI. Tests**

1.  **Unit Tests (Vitest):**
    *   **`walletStore.test.ts`**: Test all actions and state transitions. Mock `BIP39Service` and `SparkService.initializeWallet`.
    *   For each new page/dialog component: Test rendering, user interactions (button clicks, form inputs), and calls to store actions. Mock `useWalletStore`.
2.  **E2E Tests (Playwright):**
    *   **New Wallet Flow:**
        1.  App starts, redirects to `/setup-wallet`.
        2.  Click "Create New Wallet".
        3.  Verify `SeedPhraseBackupPage` shows a seed phrase.
        4.  Tick "I have saved..." checkbox, click "Continue".
        5.  Verify `SelfCustodyNoticeDialog` appears. Click "I Understand...".
        6.  Verify navigation to main app.
        7.  Navigate to `WalletPane`, click "View Seed Phrase", verify dialog and correct seed.
    *   **Restore Wallet Flow:**
        1.  App starts, redirect to `/setup-wallet`.
        2.  Click "Restore Wallet".
        3.  Enter a valid mock seed phrase in `RestoreWalletPage`. Click "Restore Wallet".
        4.  Verify `SelfCustodyNoticeDialog` (if applicable). Click "I Understand...".
        5.  Verify navigation to main app.
        6.  Verify seed phrase in `ViewSeedPhraseDialog`.
    *   **Logout Flow:**
        1.  From main app, trigger logout.
        2.  Verify `LogoutWarningDialog`.
        3.  Click "Logout Anyway".
        4.  Verify redirect to `/setup-wallet`. `localStorage` for wallet should be cleared.

This comprehensive plan should cover the requested features. The agent will need to fill in the component implementations and test details.```markdown
Okay, Agent, your task is to implement a more explicit seed phrase-based wallet management system. This will involve creating new UI components for wallet creation, backup, restoration, and related notices, along with a Zustand store to manage the wallet's state. You'll integrate this with the existing `BIP39Service` and ensure that the `SparkService` can be initialized using the managed seed phrase.

**I. New Zustand Store for Wallet State**

1.  **Create file `src/stores/walletStore.ts`:**
    *   Define `WalletState` interface: `seedPhrase: string | null`, `isInitialized: boolean`, `isLoading: boolean`, `error: string | null`, `hasSeenSelfCustodyNotice: boolean`.
    *   Define `WalletActions` interface:
        *   `generateNewWallet(): Promise<string | null>`: Uses `BIP39Service.generateMnemonic()`. Returns the new seed phrase to be displayed to the user. Does *not* set `isInitialized` or `seedPhrase` in the store yet.
        *   `_initializeWalletWithSeed(mnemonic: string, isNewWallet: boolean): Promise<boolean>`: This internal-like action will be called after user confirms backup (for new wallets) or successful restore. It sets `seedPhrase`, `isInitialized`, and triggers `_initializeServices`. It also resets `hasSeenSelfCustodyNotice` if `isNewWallet` is true. Returns `true` on success.
        *   `restoreWallet(mnemonic: string): Promise<boolean>`: Uses `BIP39Service.validateMnemonic()`. If valid, calls `_initializeWalletWithSeed(mnemonic, false)`. Returns `true` on success.
        *   `getSeedPhrase(): string | null`: Returns `state.seedPhrase`.
        *   `logout(): void`: Clears `seedPhrase`, sets `isInitialized` to `false`.
        *   `setHasSeenSelfCustodyNotice(): void`: Sets `hasSeenSelfCustodyNotice` to `true`.
        *   `clearError(): void`: Sets `error` to `null`.
        *   `_initializeServices(mnemonic: string): Promise<void>`: Placeholder to simulate initializing services like `SparkService` with the mnemonic. This will be called by `_initializeWalletWithSeed` and on store rehydration if `seedPhrase` exists.
    *   Use `persist` middleware for `localStorage` (key: `commander-wallet-store`).
        *   `partialize` to persist `seedPhrase`, `isInitialized`, `hasSeenSelfCustodyNotice`.
        *   Implement `onRehydrateStorage` to call `_initializeServices(state.seedPhrase)` if `state.seedPhrase` and `state.isInitialized` are true upon rehydration.
    *   **Important:** The `seedPhrase` stored in `localStorage` should ideally be encrypted. For this task, plain text storage is acceptable, but note this as a security concern for future improvement.

**II. New Pages and Dialog Components**

Use Shadcn UI components (`Dialog`, `Card`, `Button`, `Input`, `Textarea`, `Checkbox`, `Label`, `Alert`) for these.

1.  **`src/pages/WalletSetupPage.tsx`**:
    *   **UI:** Displays "Welcome", "Create New Wallet" button, and "Restore Existing Wallet" button.
    *   **Logic:**
        *   "Create New Wallet": Calls `useWalletStore.generateNewWallet()`. On success, navigates to `/backup-seed-phrase` passing the generated `newSeedPhrase` via route state (or a temporary mechanism). Handle loading/error states.
        *   "Restore Wallet": Navigates to `/restore-wallet`.

2.  **`src/pages/SeedPhraseBackupPage.tsx`**: (Corresponds to image 3)
    *   **UI:**
        *   Title: "Your Secret Recovery Phrase".
        *   Description: "Write down these 12 words in order and keep them somewhere safe."
        *   `Alert` (variant: `destructive`, with `AlertTriangle` icon): "This is your password to your money. If you lose it, you will lose your money! Never share this phrase with anyone."
        *   Displays the `newSeedPhrase` (received from `WalletSetupPage`) as a numbered list or clearly separated words in a read-only `Textarea` or styled divs.
        *   `Button`: "Copy Seed Phrase".
        *   `Checkbox` with `Label`: "I have saved my seed phrase securely."
        *   `Button`: "Continue" (disabled until checkbox is ticked).
    *   **Logic:**
        *   "Continue" button: Calls `useWalletStore.getState()._initializeWalletWithSeed(newSeedPhrase, true)`.
            *   If successful and `!store.hasSeenSelfCustodyNotice`, open `SelfCustodyNoticeDialog`.
            *   Else, navigate to main app (`/`).
        *   Handle loading/error states from the store.

3.  **`src/pages/RestoreWalletPage.tsx`**: (Corresponds to image 5)
    *   **UI:**
        *   Title: "Enter Your Seed Phrase".
        *   Description: "Enter your 12 or 24 word recovery phrase to restore your wallet. Separate words with spaces."
        *   `Textarea` for seed phrase input.
        *   `Button`: "Restore Wallet".
        *   Display error messages from `useWalletStore.error`.
    *   **Logic:**
        *   "Restore Wallet" button: Calls `useWalletStore.getState().restoreWallet(enteredPhrase)`.
            *   On success: If `!store.hasSeenSelfCustodyNotice`, open `SelfCustodyNoticeDialog`. Else, navigate to main app (`/`).
            *   On failure: Error message is shown.
        *   Handle loading/error states from `useWalletStore`.

4.  **`src/components/wallet/ViewSeedPhraseDialog.tsx`**: (Dialog version of image 2/3)
    *   **UI:** (Use `Dialog` components)
        *   Trigger: A "View Seed Phrase" button (to be added in `WalletPane.tsx`).
        *   `DialogTitle`: "Your Seed Phrase".
        *   `DialogDescription`: "Keep this phrase safe. Anyone with access to it can control your wallet."
        *   `Alert` (variant: `destructive`): "Never share this phrase. Losing it means losing access to your funds."
        *   Displays `useWalletStore.getState().getSeedPhrase()` in a read-only `Textarea` or styled divs.
        *   `Button`: "Copy Seed Phrase".
        *   `Button`: "Close".
    *   **Logic:** Fetches seed phrase from `useWalletStore`.

5.  **`src/components/wallet/LogoutWarningDialog.tsx`**: (Corresponds to image 1)
    *   **UI:** (Use `Dialog` components)
        *   Trigger: A "Logout" button (e.g., to be added in `WalletPane.tsx`).
        *   `DialogTitle`: "Are you sure you want to logout?"
        *   `DialogDescription`: "If you haven't backed up your seed phrase, you won't be able to access your funds."
        *   `Alert` (variant: `warning`, or default with custom styling for the orange box): "Make sure you've saved your seed phrase before logging out!" (Use an `AlertTriangle` icon or similar).
        *   `Button`: "Cancel".
        *   `Button`: "Logout Anyway" (variant `destructive`).
    *   **Logic:** "Logout Anyway" calls `useWalletStore.getState().logout()`. After logout, the app should redirect to `/setup-wallet`.

6.  **`src/components/wallet/SelfCustodyNoticeDialog.tsx`**: (Corresponds to image 4)
    *   **UI:** (Use `Dialog` components, opened programmatically)
        *   `DialogTitle`: "Important Notice".
        *   `DialogDescription`: "Please read carefully before proceeding."
        *   `Alert` (could use `Info` icon or similar):
            *   ">\_ Self-Custody Wallet"
            *   "OpenAgents wallet is self-custodial."
            *   "OpenAgents cannot access your funds or help recover them if lost."
            *   "You are solely responsible for securing your seed phrase."
        *   `Button`: "I Understand, Continue".
    *   **Logic:** Opened after successful new wallet setup or restore if `!hasSeenSelfCustodyNotice`. "I Understand, Continue" calls `useWalletStore.getState().setHasSeenSelfCustodyNotice()`, closes the dialog, and navigates to main app (`/`).

**III. Router and App Structure Updates**

1.  **`src/routes/routes.tsx`**:
    *   Add new routes:
        *   `/setup-wallet` -> `WalletSetupPage`
        *   `/backup-seed-phrase` -> `SeedPhraseBackupPage`
        *   `/restore-wallet` -> `RestoreWalletPage`
2.  **`src/App.tsx` or a Root Component wrapping `RouterProvider`**:
    *   Use `useEffect` and `useWalletStore` to check `isInitialized`.
    *   If `!isInitialized` and current route is not one of the setup/restore paths, navigate to `/setup-wallet`.
    *   If `isInitialized` and current route *is* `/setup-wallet` (e.g., user tries to go back), navigate to `/`.

**IV. Integration in Existing UI**

1.  **`src/components/wallet/WalletPane.tsx`**:
    *   Add a `Button`: "View/Backup Seed Phrase". On click, opens `ViewSeedPhraseDialog.tsx`.
    *   Add a `Button`: "Logout". On click, opens `LogoutWarningDialog.tsx`.
2.  **`src/services/spark/SparkService.ts` and `SparkServiceImpl.ts`**:
    *   Ensure `SparkServiceConfig` can accept `mnemonicOrSeed`.
    *   The `useWalletStore`'s `_initializeServices` method is the conceptual place where `SparkService` would be initialized/re-initialized with the current seed phrase. For this task, adding a `console.log` inside `_initializeServices` indicating this intent is sufficient. A full re-architecture of Effect layer provisioning is beyond this scope.

**V. Testing**

1.  **Unit Tests (`*.test.tsx` using Vitest):**
    *   Create `src/stores/walletStore.test.ts`:
        *   Mock `BIP39Service`.
        *   Test `generateNewWallet`, `restoreWallet` (valid/invalid seed), `logout`, `setHasSeenSelfCustodyNotice`.
        *   Verify `isLoading` and `error` states are set correctly.
    *   For each new page/dialog component (`SeedPhraseBackupPage.test.tsx`, `RestoreWalletPage.test.tsx`, etc.):
        *   Mock `useWalletStore` and router navigation hooks (`useNavigate`).
        *   Test rendering of all text, warnings, and UI elements.
        *   Test button click handlers call the correct store actions.
        *   Test conditional enabling/disabling of buttons (e.g., "Continue" on backup page).
        *   Test display of seed phrases and error messages.
2.  **E2E Tests (`*.test.ts` in `src/tests/e2e/` using Playwright):**
    *   **New Wallet Flow:**
        1.  Launch app. Should redirect to `/setup-wallet`.
        2.  Click "Create New Wallet".
        3.  On `/backup-seed-phrase`: Verify seed phrase is displayed (capture text). Verify "Continue" is disabled. Tick checkbox. Click "Continue".
        4.  Verify `SelfCustodyNoticeDialog` appears. Click "I Understand...".
        5.  Verify navigation to main app (e.g., `HomePage` at `/`).
        6.  (Open `WalletPane`) -> Click "View Seed Phrase" button. Verify dialog shows the same seed phrase.
    *   **Restore Wallet Flow:**
        1.  (Simulate logged out state or first run) App redirects to `/setup-wallet`.
        2.  Click "Restore Wallet".
        3.  On `/restore-wallet`: Enter a known valid mock seed phrase. Click "Restore Wallet".
        4.  Verify `SelfCustodyNoticeDialog` appears (if it's the first time for this "user"). Click "I Understand...".
        5.  Verify navigation to main app.
        6.  (Open `WalletPane`) -> Click "View Seed Phrase". Verify restored seed is shown.
    *   **Logout Flow:**
        1.  (Start from main app, wallet initialized).
        2.  (Open `WalletPane`) -> Click "Logout".
        3.  Verify `LogoutWarningDialog` appears.
        4.  Click "Cancel". Verify dialog closes, user remains in app.
        5.  Click "Logout" again. Click "Logout Anyway".
        6.  Verify redirect to `/setup-wallet`.
        7.  (Optional) Verify `localStorage` for `commander-wallet-store` has `isInitialized: false` and `seedPhrase: null`.

Remember to use appropriate `data-testid` attributes for E2E testing where necessary.
Focus on making the UI clear, secure (with warnings), and user-friendly for these critical wallet operations.
```
