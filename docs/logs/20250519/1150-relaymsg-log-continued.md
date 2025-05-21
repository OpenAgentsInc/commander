# NIP-28 Message UI Fix Implementation Log

## Issue Analysis

After implementing the relay message fix, there are still UI issues with the NIP-28 channel chat experience:

1. **Text Input Disabled**: After sending a message, the text input is disabled (BAD UX)
2. **Message Duplication**: User sees their message immediately, then after a delay, the message appears duplicated before one eventually disappears
3. **Loading State**: The loading state isn't being properly managed, causing the UI to be blocked

## Root Causes

1. **Disabled Input Issue**:

   - In `useNostrChannelChat.ts`, the `isLoading` state is set to `true` when sending a message
   - The state isn't reset until the response comes back from all relays
   - The ChatWindow component disables the input when `isLoading` is true
   - With our relay fix, partial successes are now treated as successes, but the UI isn't updated accordingly

2. **Message Duplication Issue**:
   - Two sources of messages:
     1. The temp message added immediately in the UI when sending (`setMessages(prev => [...prev, tempMessage])`)
     2. The subscription also returns the same message once it's published to relays
     3. Additionally, multiple relays might send the same message, causing multiple duplications
   - The deduplication logic isn't effective because the IDs don't match initially

## Implementation

### 1. Fix Message Sending Process in `useNostrChannelChat.ts`

#### Previous Implementation Issues:

- `isLoading` state was only reset after completion of the entire send operation
- Temporary messages were removed and re-added with new IDs, causing duplication
- Insufficient deduplication logic in subscription handler

#### Changes Made:

1. **Added Content Hash Tracking**:

   ```typescript
   const contentHash = `${contentToSend}-${Date.now()}`;

   const tempMessage: ChatMessageProps = {
     id: tempMessageId,
     role: "user",
     content: contentToSend,
     author: formatPubkeyForDisplay(DEMO_USER_PK),
     timestamp: Date.now(),
     contentHash, // Store hash for matching with real message later
   };
   ```

2. **Improved Loading State Management**:

   ```typescript
   // Release the text input immediately when we get any result
   setIsLoading(false);
   ```

3. **Better Message Handling on Success**:

   ```typescript
   // Replace the temporary message with the real one
   setMessages((prev) => {
     const realEvent = exitResult.value;
     // Find the temp message by contentHash and replace it
     return prev
       .map((m) =>
         m.id === tempMessageId
           ? {
               id: realEvent.id,
               role: "user",
               content: contentToSend,
               author: formatPubkeyForDisplay(DEMO_USER_PK),
               timestamp: realEvent.created_at * 1000,
               contentHash, // Maintain the contentHash for deduplication
               publishedSuccessfully: true, // Mark as successfully published
             }
           : m,
       )
       .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
   });
   ```

4. **Better Error Message Display**:
   - Now updates the temp message in-place rather than removing it
   - Provides visible error feedback directly in the message

### 2. Enhanced Subscription Handler

Implemented a three-layer deduplication strategy:

1. **Exact ID Matching**:

   ```typescript
   // Case 1: We already have this exact message ID
   if (prev.some((m) => m.id === newEvent.id)) {
     console.log("[Hook] Skipping duplicate message with ID:", newEvent.id);
     return prev;
   }
   ```

2. **Temporary Message Matching** (for recently sent messages):

   ```typescript
   // Case 2: Check for temporary message with matching content (recently sent by this user)
   const msgTimestamp = newEvent.created_at * 1000;
   const recentTimeFrame = Date.now() - 10000; // Last 10 seconds
   const matchingTempMessage = prev.find(
     (m) =>
       // If it's a recent message with matching content from the same user
       m.id.startsWith("temp-") &&
       m.content === newEvent.decryptedContent &&
       m.timestamp &&
       m.timestamp > recentTimeFrame &&
       newEvent.pubkey === DEMO_USER_PK,
   );

   if (matchingTempMessage) {
     // Replace the temp message with the real one...
   }
   ```

3. **Content Hash Matching** (for known sent messages):

   ```typescript
   // Case 3: Check for any message with matching content hash
   const matchingHashMessage = prev.find(
     (m) =>
       m.contentHash &&
       newEvent.pubkey === DEMO_USER_PK &&
       m.content === newEvent.decryptedContent,
   );

   if (matchingHashMessage) {
     // Keep what we have without adding duplicates...
     return prev;
   }
   ```

### 3. Added Tests

Created new unit tests that verify:

1. Text input is not disabled after sending a message
2. Message duplication is properly prevented
3. Loading states are managed correctly

## Expected Behavior

With these changes, the user experience is now improved:

1. When a user sends a message:

   - The input field clears immediately and remains enabled
   - A temporary message appears immediately
   - The temporary message is replaced with the real one when published
   - No duplicates appear in the UI

2. Error handling:

   - If the message fails to publish to all relays, the error is shown in-place
   - The input remains enabled, allowing the user to try again

3. The changes maintain compatibility with the previous relay message fix, ensuring that partial successes (messages published to at least one relay) are treated as successes.
