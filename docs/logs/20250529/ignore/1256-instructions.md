Okay, I will provide specific instructions for a coding agent to implement the desired resizing behavior for the ProseMirror component in `src/components/coder/CoderProseMirrorInput.tsx` and its parent usage in `src/components/coder/CoderPane.tsx`.

**Assumptions based on provided files:**
*   The ProseMirror editor's content area is styled with `padding: '12px'`.
*   The font size is `0.875rem` (14px) and line height is `1.25rem` (20px).
*   One line height = 20px.
*   Vertical padding = 12px (top) + 12px (bottom) = 24px.

**Calculations:**
*   Initial height (1 line + padding): `20px + 24px = 44px`.
*   Maximum height (5 lines + padding): `(5 * 20px) + 24px = 100px + 24px = 124px`.

Here are the instructions for the coding agent:

---

**Instructions for Modifying ProseMirror Component Resizing**

**Objective:**
Make the ProseMirror input component start at one line high (plus padding), resize vertically based on its content up to a maximum of 5 lines (plus padding), and then scroll.

**File 1: `src/components/coder/CoderProseMirrorInput.tsx`**

1.  **Locate the `AutoFocusEditor` internal component.**
2.  **Modify the `ProseMirrorDoc` component's `as` prop.**
    *   Find the `div` element rendered by the `as` prop:
        ```typescript
        <ProseMirrorDoc
          as={
            <div
              className="prose prose-invert h-full w-full outline-none text-white box-border" // Current className
              spellCheck={false}
              style={{
                minHeight: '100%', // Current style
                padding: '12px',
                opacity: disabled ? 0.5 : 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '0.875rem',
                lineHeight: '1.25rem'
              }}
            />
          }
        />
        ```
    *   **Change the `className` of this `div`:**
        *   Remove `h-full`.
        *   The new `className` should be:
            ```diff
            - className="prose prose-invert h-full w-full outline-none text-white box-border"
            + className="prose prose-invert w-full outline-none text-white box-border"
            ```
    *   **Update the `style` prop of this `div`:**
        *   Remove `minHeight: '100%'`.
        *   Add `minHeight: '44px'`.
        *   Add `maxHeight: '124px'`.
        *   Add `overflowY: 'auto'`.
        *   The resulting `style` object should be:
            ```typescript
            style={{
              // ADDED:
              minHeight: '44px', // 1 line (20px) + padding (12px * 2 = 24px)
              maxHeight: '124px', // 5 lines (100px) + padding (24px)
              overflowY: 'auto', // For scrolling when content exceeds maxHeight
              // KEPT:
              padding: '12px',
              opacity: disabled ? 0.5 : 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '0.875rem',
              lineHeight: '1.25rem'
            }}
            ```

**File 2: `src/components/coder/CoderPane.tsx`**

1.  **Locate the rendering of the `CoderProseMirrorInput` component.**
    *   It is wrapped in a `div` like this:
        ```html
        <div className="flex items-center justify-center pb-4 px-4">
          <div className="h-[50px] w-[750px] overflow-auto rounded border border-white bg-black">
            <CoderProseMirrorInput onSubmit={sendMessage} disabled={isLoading} focusKey={focusKey} />
          </div>
        </div>
        ```
2.  **Modify the `className` of the inner `div` that directly wraps `CoderProseMirrorInput`.**
    *   Remove `h-[50px]` (this fixed height prevents the input from resizing).
    *   Remove `overflow-auto` (scrolling is now handled inside `CoderProseMirrorInput`).
    *   The `className` should change from:
        ```diff
        - className="h-[50px] w-[750px] overflow-auto rounded border border-white bg-black"
        ```
    *   To:
        ```diff
        + className="w-[750px] rounded border border-white bg-black"
        ```
        The surrounding `div` with `flex items-center justify-center pb-4 px-4` should remain unchanged.

**Verification Steps (Manual):**

1.  Run the application in development mode (`pnpm start`).
2.  Open the Coder pane.
3.  The ProseMirror input area should initially be one line high (44px total height including padding).
4.  Start typing. The input area should expand vertically with each new line of text.
5.  Continue typing until you have more than 5 lines of text. The input area should stop expanding vertically at its max height (124px total height).
6.  A vertical scrollbar should appear within the input area, allowing you to scroll through the content.
7.  Deleting text should cause the input area to shrink back down, correctly stopping at the minimum height of one line.

---

These changes will adjust the ProseMirror input to behave as requested. The key is to allow the ProseMirror editor `div` itself to manage its height based on content, with CSS `min-height`, `max-height`, and `overflow-y`, and to ensure its parent container in `CoderPane.tsx` does not impose a fixed height.
