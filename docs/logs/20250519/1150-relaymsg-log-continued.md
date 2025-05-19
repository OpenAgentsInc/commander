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

## Implementation Plan

1. **Fix `useNostrChannelChat` hook**:
   - Improve message deduplication with a more robust approach
   - Reset isLoading state earlier in the send process
   - Add tests to ensure the behavior works correctly

2. **Modify Subscription Handling**:
   - Ensure subscription doesn't add duplicates of messages that are already in the UI
   - Make sure that subscription handlers properly deduplicate messages (not just by ID)

## Detailed Fix Strategy

1. Create a more reliable message ID system that can be tracked across the temp message and the real message
2. Reset isLoading state as soon as the first successful relay publish occurs
3. Add robust deduplication logic for messages coming from subscription
4. Add proper error handling if a message fails to send to all relays
5. Add tests to verify the fixed behavior works correctly