Okay, I understand the issues. The wallet balance displayed in the "Wallet Pane" and the "Wallet HUD" (top-right display) are not staying synchronized, and you want the balance in both locations to refresh every 1 second.

Here are the specific instructions for a coding agent to implement these changes:

**Objective 1: Synchronize Wallet Balance Display**
Ensure both the Wallet Pane and the Wallet HUD display the same balance value by using a unified React Query key.

**Objective 2: Implement 1-Second Balance Refresh**
Update the balance fetching logic to refresh every 1 second.

---

**Instructions for the Coding Agent:**

**File 1: `src/components/wallet/WalletPane.tsx`**

1.  **Locate the `useQuery` hook** responsible for fetching the wallet balance. It currently looks like this:
    ```typescript
    const {
      data: balanceData,
      isLoading: isLoadingBalance,
      error: balanceError,
      refetch: refetchBalance,
    } = useQuery<BalanceInfo, Error>({
      queryKey: ["walletPaneBitcoinBalance"], // <--- Current key
      queryFn: async () => { /* ... */ },
      refetchInterval: 60000, // <--- Current interval
    });
    ```

2.  **Modify the `queryKey`**:
    *   Change the `queryKey` from `["walletPaneBitcoinBalance"]` to `["walletBalance"]`.
    This standardized key will ensure React Query treats balance data from different components as the same resource.

3.  **Modify the `refetchInterval`**:
    *   Change `refetchInterval: 60000` to `refetchInterval: 1000`.

4.  **Add a performance warning comment**:
    *   Immediately above or below the `refetchInterval: 1000` line, add the following comment:
      ```typescript
      // TODO: Aggressive 1s balance refresh. Monitor performance and API rate limits. Consider websockets or longer intervals for production.
      ```

5.  The modified `useQuery` options should look like this:
    ```typescript
    const {
      data: balanceData,
      isLoading: isLoadingBalance,
      error: balanceError,
      refetch: refetchBalance,
    } = useQuery<BalanceInfo, Error>({
      queryKey: ["walletBalance"], // <--- MODIFIED
      queryFn: async () => { /* ... */ },
      // TODO: Aggressive 1s balance refresh. Monitor performance and API rate limits. Consider websockets or longer intervals for production.
      refetchInterval: 1000, // <--- MODIFIED
    });
    ```

**File 2: `src/components/hud/BitcoinBalanceDisplay.tsx`**

1.  **Locate the `useQuery` hook** responsible for fetching the wallet balance. It currently looks like this (based on its functionality):
    ```typescript
    const {
      data: balanceData,
      isLoading,
      error,
      refetch,
      isFetching,
    } = useQuery<BalanceInfo, Error>({
      queryKey: ["bitcoinBalance"], // <--- Current key
      queryFn: async () => { /* ... */ },
      refetchInterval: 30000, // <--- Current interval
      refetchIntervalInBackground: true,
    });
    ```

2.  **Modify the `queryKey`**:
    *   Change the `queryKey` from `["bitcoinBalance"]` to `["walletBalance"]`.
    This ensures it uses the same React Query cache entry as the `WalletPane.tsx`.

3.  **Modify the `refetchInterval`**:
    *   Change `refetchInterval: 30000` to `refetchInterval: 1000`.

4.  **Add a performance warning comment**:
    *   Immediately above or below the `refetchInterval: 1000` line, add the following comment:
      ```typescript
      // TODO: Aggressive 1s balance refresh. Monitor performance and API rate limits. Consider websockets or longer intervals for production.
      ```

5.  The modified `useQuery` options should look like this:
    ```typescript
    const {
      data: balanceData,
      isLoading,
      error,
      refetch,
      isFetching,
    } = useQuery<BalanceInfo, Error>({
      queryKey: ["walletBalance"], // <--- MODIFIED
      queryFn: async () => { /* ... */ },
      // TODO: Aggressive 1s balance refresh. Monitor performance and API rate limits. Consider websockets or longer intervals for production.
      refetchInterval: 1000, // <--- MODIFIED
      refetchIntervalInBackground: true,
    });
    ```

---

**Verification Steps (for human tester):**

1.  After changes, run the application.
2.  Open both the "Wallet Pane" (if it's a separate pane that can be opened/closed) and ensure the "Wallet HUD" (top-right display) is visible.
3.  Observe the balance in both locations. They should now display the same value and update consistently every 1 second.
4.  If one component triggers a manual refetch (e.g., via the refresh button in `BitcoinBalanceDisplay.tsx`), the other component should also reflect the updated data almost immediately due to the shared query key.
5.  Monitor the application for any performance degradation or excessive network requests in the developer console's network tab. Check for any console warnings related to API rate limits if applicable to the Spark SDK.

**Note on `SparkService` and Mnemonic Usage:**
The existing architecture, particularly the use of `globalWalletConfig` and `reinitializeRuntime` in `src/services/runtime.ts` and `src/stores/walletStore.ts`, should ensure that the `SparkService` instance used by React Query is correctly configured with the user's mnemonic. These changes to query keys and refresh intervals should not interfere with that mechanism. The balance displayed will be from the currently active wallet instance.
