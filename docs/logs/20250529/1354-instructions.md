Here are the specific instructions for the coding agent:

**1. Make Tool Results Scrollable**

*   **File:** `src/components/coder/ToolResultDisplay.tsx`
*   **Objective:** Ensure that the content within the `ToolResultDisplay` component is scrollable when it exceeds the `max-h-60` limit, using `src/components/ui/scroll-area.tsx`.

*   **Instructions:**
    1.  Import `ScrollArea` from `@/components/ui/scroll-area`.
        ```diff
        // src/components/coder/ToolResultDisplay.tsx
        import React, { useState } from 'react';
        -import { ScrollArea } from '@/components/ui/scroll-area'; // Already imported, ensure it's used correctly
        +import { ScrollArea } from "@/components/ui/scroll-area";
        import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
        // ... rest of imports
        ```
    2.  In the return statement, locate the `ScrollArea` components that wrap the `<pre>` tag.
    3.  Ensure the `<pre>` tag is the direct child of a `<div>` (or similar block element) which itself is the direct child of `<ScrollArea>`. The `max-h-60` and `overflow-hidden` (or `overflow-auto`) classes should be on the `ScrollArea` or an intermediate div if `ScrollArea`'s styling requires it.

    *   **Verify current structure (it seems correct but let's be explicit):**
        The current structure is:
        ```tsx
        // For collapsible content
        <ScrollArea className="max-h-60 mt-1 overflow-hidden">
          <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-gray-900/50 p-2 rounded break-all`}>
            {resultString}
          </pre>
        </ScrollArea>

        // For non-collapsible content
        <ScrollArea className="max-h-60 overflow-hidden">
          <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-gray-900/50 p-2 rounded break-all`}>
            {resultString}
          </pre>
        </ScrollArea>
        ```
    4.  The `ScrollArea` component from `shadcn/ui` typically renders its own scrollbars. The `overflow-hidden` on `ScrollArea` might be interfering or unnecessary if the internal `pre` tag is not exceeding the height of the `ScrollArea`'s viewport.
    5.  **Modification**: Ensure the `ScrollArea` component is directly making the content scrollable. If the `ScrollArea` itself adds a viewport `div`, that div should have `overflow-y: auto`. The `pre` tag should be allowed to grow naturally within this viewport.
        *   The existing `ScrollArea` component from `shadcn/ui` is designed to work correctly. The issue might be how `max-h-60` is applied.
        *   Change `overflow-hidden` to `overflow-auto` on the `ScrollArea` if it doesn't scroll. Better yet, rely on `ScrollArea`'s default behavior.
        *   Apply `max-h-60` to the `ScrollArea` component itself or to an immediate child wrapper if that's how `ScrollArea` is structured internally.

        Let's assume `src/components/ui/scroll-area.tsx` is a standard Shadcn UI `ScrollArea`. The `max-h-60` should be on the `ScrollArea` component. The `overflow-hidden` is likely fine as `ScrollArea` manages overflow internally.

        The problem description is "it doesnt scroll when in it". This usually means either the content isn't actually overflowing its immediate scrollable container, or the scrollable container is missing `overflow-y: auto` (or similar), or a parent is clipping it.
        Given `ScrollArea` is used, it should handle the `overflow-y: auto`.

        **Specific change:**
        Inside `ToolResultDisplay.tsx`:
        *   For both instances of `ScrollArea`, ensure the class `max-h-60` is applied. Remove `overflow-hidden` if it's causing issues; `ScrollArea` handles its own overflow.
        ```diff
        // src/components/coder/ToolResultDisplay.tsx
        // ...
            <CollapsibleContent>
        -     <ScrollArea className="max-h-60 mt-1 overflow-hidden">
        +     <ScrollArea className="max-h-60 mt-1"> {/* Rely on ScrollArea's overflow */}
                <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-gray-900/50 p-2 rounded break-all`}>
                  {resultString}
                </pre>
              </ScrollArea>
            </CollapsibleContent>
        // ...
        ) : (
          // Direct rendering for non-collapsible or error content
        - <ScrollArea className="max-h-60 overflow-hidden">
        + <ScrollArea className="max-h-60"> {/* Rely on ScrollArea's overflow */}
            <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-gray-900/50 p-2 rounded break-all`}>
              {resultString}
            </pre>
          </ScrollArea>
        )}
        // ...
        ```
        If `src/components/ui/scroll-area.tsx` requires a specific structure (e.g., direct child `div`), ensure that's met. Typically, `ScrollArea` wraps its children in a viewport that handles scrolling. The `max-h-60` on `ScrollArea` should limit its height, and its internal viewport should then scroll.

**2. Remove Duplicate Copy Button on Assistant Messages**

*   **File:** `src/components/ui/chat-message.tsx` (This is `UIChatMessage` as aliased in `CoderMessage.tsx`)
*   **Objective:** Prevent the "corner" copy button from appearing on assistant messages when used within `CoderMessage.tsx`, which has its own "under it" copy button.

*   **Instructions:**
    1.  Add a new optional prop `showCopyButton` (boolean, default `true`) to `ChatMessageProps` in `src/components/chat/ChatMessage.tsx` (since `UIChatMessage` seems to be based on this or is this file itself, path `src/components/ui/chat-message.tsx`).
        *   Looking at `src/components/ui/chat-message.tsx`, it doesn't directly use `ChatMessageProps` from `src/components/chat/ChatMessage.tsx`. It defines its own props. Let's modify `src/components/ui/chat-message.tsx` props.

        ```typescript
        // src/components/ui/chat-message.tsx
        // Add to its existing props interface (if one exists, or define one)
        export interface UIChatMessageProps {
          // ... existing props like id, role, content, animation, showTimeStamp ...
          id: string;
          role: "user" | "assistant" | "system"; // Adjust if using a more specific type
          content: string;
          animation?: string;
          showTimeStamp?: boolean;
        + showCopyButton?: boolean; // New prop
          // Add other props from its usage in CoderMessage if necessary
          parts?: any[]; // From CoderMessage usage
        }
        ```
    2.  In `src/components/ui/chat-message.tsx`, use this `showCopyButton` prop to conditionally render its copy button.
        ```diff
        // src/components/ui/chat-message.tsx
        // Modify the component definition to accept the new prop
        export function ChatMessage({
          // ... existing props ...
          content,
          role,
          isStreaming, // Assuming this prop exists or is derived
        + showCopyButton = true, // Default to true
          // ... other props ...
        }: UIChatMessageProps) { // Use the updated props interface
          // ... component logic ...

          return (
            // ... outer div ...
            <div // This is the message bubble div
              className={cn(
                "mb-1 inline-block max-w-[85%] rounded-md px-2 py-1 text-xs",
                // ... existing classes ...
              )}
            >
              {/* ... author and streaming indicator ... */}
              <div className="text-foreground max-w-full whitespace-pre-wrap">
                {/* Render content, potentially from parts if this component handles it */}
                {/* Example based on CoderMessage structure: */}
                {(props.parts && props.parts.length > 0) ? (
                  props.parts.map((part, idx) => {
                    if (part.type === 'text') return <span key={idx}>{part.text}</span>;
                    if (part.type === 'tool-invocation') {
                      // Render tool invocation summary or placeholder
                      return <div key={idx} className="text-muted-foreground text-xs italic p-1 my-1 border border-dashed rounded">Tool: {part.toolInvocation.toolName}</div>;
                    }
                    return null;
                  })
                ) : (
                  content // Fallback to direct content if no parts
                )}
                {isStreaming && (
                  <span className="text-foreground ml-0.5 animate-pulse">▋</span>
                )}
              </div>
            </div>
            {/* Copy button logic */}
        -   {!isStreaming && content && role !== "system" && (
        +   {showCopyButton && !isStreaming && content && role !== "system" && (
              <div
                className={cn(
                  "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity",
                  role === "user" ? "left-full ml-1" : "right-full mr-1" // This is the "corner" one
                )}
              >
                <CopyButton content={content} copyMessage="Copied message to clipboard" />
              </div>
            )}
            // ...
          )
        }
        ```
    3.  **File:** `src/components/coder/CoderMessage.tsx`
    4.  When `CoderMessage.tsx` renders `UIChatMessage` (which is `src/components/ui/chat-message.tsx`) for assistant message text parts, pass `showCopyButton={false}`.
        ```diff
        // src/components/coder/CoderMessage.tsx
        // ... inside renderParts function or wherever UIChatMessage is used for assistant messages ...
        if (part.type === 'text' && part.text) {
          const cleanedText = part.text.replace(/\[Result:\s*[\s\S]*?\]/g, '').trim();
          if (!cleanedText) return null;

          return (
            <div key={`text-${idx}`} className="prose prose-invert max-w-none">
              <UIChatMessage
                id={`${message.id}-text-${idx}`}
                role={message.role === 'user' ? 'user' : 'assistant'}
                content={cleanedText}
                animation="none"
                showTimeStamp={false}
        +       showCopyButton={message.role === 'user'} // Only show for user, or explicitly false for assistant
              />
            </div>
          );
        // ...
        // Also update the fallback rendering path in CoderMessage.tsx if it uses UIChatMessage:
        // if (message.parts && message.parts.length > 0) { ... }
        // else { // Fallback to standard display for messages without parts
        //   return (
        //     <div className={`coder-chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'} relative group`}>
        //       <UIChatMessage
        //         id={message.id}
        //         role={message.role === 'user' ? 'user' : 'assistant'}
        //         content={textContent}
        //         animation="none"
        //         showTimeStamp={false}
        +         showCopyButton={message.role === 'user'} // Apply here too
        //       />
        //       {/* ... CoderMessage's own copy button and streaming indicator ... */}
        //     </div>
        //   );
        // }
        ```
        A more direct approach if `UIChatMessage` is primarily for text display within `CoderMessage`:
        ```diff
        // src/components/coder/CoderMessage.tsx
        // In the part where UIChatMessage is called:
        if (part.type === 'text' && part.text) {
            // ...
            return (
              <div key={`text-${idx}`} className="prose prose-invert max-w-none">
                <UIChatMessage
                  // ... other props
        +         showCopyButton={false} // Explicitly disable UIChatMessage's copy button for assistant text parts
                />
              </div>
            );
        }
        // ...
        // In the fallback rendering:
        // ...
        // return (
        //   <div className={`coder-chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'} relative group`}>
        //     <UIChatMessage
        //       // ... other props
        +       showCopyButton={message.role === 'user'} // Keep for user, disable for assistant if CoderMessage handles it
        //     />
        ```
        The goal is that `CoderMessage` is responsible for the overall message copy button (the one "under it"), and the `UIChatMessage` instances it uses for rendering text parts should not add their own "corner" copy buttons for assistant messages.

**3. Make Entire Tool Call + Result Block Collapsible**

*   **File:** `src/components/coder/CoderMessage.tsx`
*   **Objective:** Group `ToolCallDisplay` and its corresponding `ToolResultDisplay` into a single collapsible unit.

*   **Instructions:**
    1.  Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`.
    2.  In `CoderMessage.tsx`, locate the `renderParts` function (or similar logic) where `ToolCallDisplay` and `ToolResultDisplay` are rendered for a `tool_call` part.
    3.  Modify the rendering of `tool_call` parts:
        ```diff
        // src/components/coder/CoderMessage.tsx
        // ...
        } else if (part.type === 'tool_call') {
          const hasResult = toolResults.has(part.id);
          const result = toolResults.get(part.id);
        + const isDone = hasResult && !result?.isLoading; // Tool call is "done" if it has a result and isn't loading

        - return (
        -   <div key={`tool-${idx}`} className="space-y-1">
        -     <ToolCallDisplay
        -       toolName={part.name}
        -       args={part.input}
        -       isLoading={!hasResult}
        -     />
        -     {hasResult && result && (
        -       <ToolResultDisplay
        -         toolName={part.name}
        -         result={result.content}
        -         isError={result.isError}
        -       />
        -     )}
        -   </div>
        - );
        + return (
        +   <Collapsible key={`tool-${idx}`} defaultOpen={!isDone} className="space-y-1 border border-muted/50 rounded-lg p-1 my-1">
        +     <CollapsibleTrigger asChild>
        +       {/* ToolCallDisplay acts as the trigger. Pass a prop to indicate it's a trigger, or style it accordingly. */}
        +       {/* Add an icon to ToolCallDisplay to show collapse state if desired. */}
        +       <div className="cursor-pointer"> {/* Make the ToolCallDisplay area clickable */}
        +         <ToolCallDisplay
        +           toolName={part.name}
        +           args={part.input}
        +           isLoading={!hasResult && !result} // Only loading if no result at all
        +         />
        +       </div>
        +     </CollapsibleTrigger>
        +     {isDone && ( /* Only render CollapsibleContent if the tool call is done */
        +       <CollapsibleContent>
        +         {hasResult && result && (
        +           <ToolResultDisplay
        +             toolName={part.name} /* Optional: may not be needed if ToolCallDisplay is always visible */
        +             result={result.content}
        +             isError={result.isError}
        +           />
        +         )}
        +       </CollapsibleContent>
        +     )}
        +     {!isDone && hasResult && result && ( /* If not done but has a result (e.g. result is loading), show it non-collapsible for now */
        +        <ToolResultDisplay
        +          toolName={part.name}
        +          result={result.content}
        +          isError={result.isError}
        +          isLoading={result.isLoading}
        +        />
        +     )}
        +   </Collapsible>
        + );
        ```
    4.  **Styling:** The `Collapsible` root element now has `className="space-y-1 border border-muted/50 rounded-lg p-1 my-1"` to achieve the "all in one border". Adjust padding/margin as needed.
    5.  **Initial State:** `defaultOpen={!isDone}` means the collapsible will be open while the tool is processing or if it has no result yet, and closed by default once it's "done" (has a result and is not loading).
    6.  The `ToolCallDisplay` component might need an optional prop to display a chevron icon indicating expand/collapse state, which can be managed via `Collapsible`'s `open` state if passed down.

**4. Fix Infinite Loop on Command-Click "New Chat"**

*   **File:** `src/hooks/coder/useCoderChat.ts`
*   **Objective:** Prevent the infinite reload loop when a new CoderPane is opened via Command-Click on "New Chat".

*   **Instructions:**
    1.  In the `useEffect` hook that depends on `initialSessionId`, `paneId`, etc., modify the condition that forces a reload.
        ```diff
        // src/hooks/coder/useCoderChat.ts
        useEffect(() => {
          const componentName = `[CoderPane ${paneId?.substring(0, 8) || 'NEW'}]`;
          console.log(`${componentName} Effect for session loading. initialSessionId: ${initialSessionId}, current sessionIdRef: ${sessionIdRef.current}, lastLoaded: ${lastLoadedSessionIdRef.current}`);

          if (initialSessionId && initialSessionId !== lastLoadedSessionIdRef.current) {
            console.log(`${componentName} initialSessionId (${initialSessionId}) differs from lastLoaded (${lastLoadedSessionIdRef.current}). Loading.`);
            loadMessagesForSessionInternal(initialSessionId);
        - } else if (initialSessionId && initialSessionId === lastLoadedSessionIdRef.current && messages.filter(m => m.role !== 'system').length === 0) {
        -   console.log(`${componentName} initialSessionId matches lastLoaded, but UI messages are empty. Forcing reload for ${initialSessionId}.`);
        -   loadMessagesForSessionInternal(initialSessionId);
        + } else if (initialSessionId && initialSessionId === lastLoadedSessionIdRef.current && messages.filter(m => m.role !== 'system').length === 0 && !sessionIdRef.current.startsWith('ui-coder-')) {
        +   // Only force reload if it's NOT a newly generated UI session ID that's expected to be empty.
        +   // This condition is a bit fragile. A better way would be to know if loadMessagesForSessionInternal attempted a DB load.
        +   // For now, assume `ui-coder-` prefixed sessions are new and can be empty.
        +   // A more robust fix would be for loadMessagesForSessionInternal to signal if it's a "new, empty session" vs "existing, empty session".
        +   // However, the simplest way to break the loop identified is to prevent this specific reload.
        +   // The log says: "initialSessionId matches lastLoaded, but UI messages are empty. Forcing reload"
        +   // This condition is problematic for *newly created panes with new session IDs*.
        +   // If a session (initialSessionId) was just loaded (lastLoadedSessionIdRef.current === initialSessionId)
        +   // and it resulted in empty messages (messages.length === 1 with only system message),
        +   // then it *should not* be reloaded. This is the correct state for a new/empty session.
        +   console.log(`${componentName} Session ${initialSessionId} loaded and is empty. Not forcing reload. Current messages count: ${messages.length}`);
          } else if (!initialSessionId && sessionIdRef.current && !lastLoadedSessionIdRef.current) {
            // This handles the case where the hook initializes without an initialSessionId,
            // generates one, and needs to mark it as "loaded" (empty).
            console.log(`${componentName} New pane, initialSessionId is null, sessionIdRef.current is ${sessionIdRef.current}. Setting lastLoaded to match.`);
            lastLoadedSessionIdRef.current = sessionIdRef.current;
            updatePaneContent(paneId, { sessionId: sessionIdRef.current });
            setIsLoading(false);
          } else {
            console.log(`${componentName} No session load required by this effect run. Active session: ${sessionIdRef.current}`);
            setIsLoading(false);
          }
        -}, [initialSessionId, paneId, messages, clearMessages, updatePaneContent, loadMessagesForSessionInternal]);
        +}, [initialSessionId, paneId, /* messages, */ clearMessages, updatePaneContent, loadMessagesForSessionInternal]); // Critically, remove 'messages' from dependencies

        ```
    2.  **Explanation of change:**
        *   The primary change is removing `messages` from the dependency array of this `useEffect`. This `useEffect` should primarily react to changes in `initialSessionId` (e.g., when a new pane is opened or an existing one is loaded with a specific session).
        *   When `loadMessagesForSessionInternal` completes and calls `setMessages`, it should not re-trigger this effect to re-evaluate loading the *same* session.
        *   The "force reload" condition (`else if (initialSessionId && initialSessionId === lastLoadedSessionIdRef.current && messages.filter(m => m.role !== 'system').length === 0)`) has been removed. If a session was loaded and found to be empty (only system message), that's its correct state. It shouldn't be reloaded just because it's empty.
        *   Added a new `else if` for the case where `initialSessionId` is null when the hook starts, a new `sessionIdRef.current` is generated, and we need to mark this new session as "loaded" (empty) by setting `lastLoadedSessionIdRef.current` and persisting the new ID to the pane.

This revised `useEffect` logic in `useCoderChat.ts` should prevent the infinite loop by ensuring that a session, once attempted to load (successfully or resulting in an empty state), isn't reloaded solely due to its `messages` state changing to empty as a result of that load.
