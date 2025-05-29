Okay, I will provide specific instructions to a coding agent to implement collapsible tool results in the `CoderPane`.

**Context:**
We want to modify how tool results are displayed in the `CoderPane`. Currently, long results (like file contents from the `Read` tool) are shown fully. We need to make these results collapsible, defaulting to a collapsed state, if they exceed certain length or line thresholds. We will use the Shadcn UI `Collapsible` component available at `src/components/ui/collapsible.tsx`.

**Instructions for the Coding Agent:**

**1. Define Thresholds for Collapsible Content:**

*   In `src/components/coder/ToolResultDisplay.tsx`, define constants at the top of the file for determining when content is considered "long" and should be made collapsible:
    ```typescript
    const MAX_CHARS_DIRECT_DISPLAY = 300; // Characters
    const MAX_LINES_DIRECT_DISPLAY = 10;  // Lines
    ```

**2. Modify `src/components/coder/ToolResultDisplay.tsx`:**

    *   **Import necessary components:**
        ```typescript
        import React, { useState } from 'react'; // Add useState
        import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
        import { ScrollArea } from '@/components/ui/scroll-area';
        import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'; // Added
        import { ChevronRight, ChevronDown } from 'lucide-react'; // Added for icons
        import { Button } from '@/components/ui/button'; // Added for trigger styling
        ```

    *   **Update `ToolResultDisplayProps` interface:**
        No changes needed for the interface itself.

    *   **Inside the `ToolResultDisplay` functional component:**
        *   Add state for the collapsible section:
            ```typescript
            const [isOpen, setIsOpen] = useState(false);
            ```
        *   Modify how `resultString` is calculated and determine if content is long enough to be collapsible:
            ```typescript
            const resultString = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
            const numLines = resultString.split('\n').length;
            const isContentLong = resultString.length > MAX_CHARS_DIRECT_DISPLAY || numLines > MAX_LINES_DIRECT_DISPLAY;

            // Content should be collapsible if it's long AND not an error.
            const useCollapsible = !isError && isContentLong;
            ```
        *   Determine the trigger label text:
            ```typescript
            let triggerLabel = `Output (${numLines} lines)`;
            if (toolName === 'Read' && typeof result === 'string') {
              triggerLabel = `File Content (${numLines} lines)`;
            } else if (toolName) {
              triggerLabel = `${toolName} Output (${numLines} lines)`;
            }
            ```
        *   Modify the `return` statement's `CardContent` section to use the `Collapsible` components:
            ```typescript
            <CardContent className="p-2">
              {useCollapsible ? (
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="flex items-center justify-start w-full p-1 h-auto text-xs text-muted-foreground hover:text-foreground">
                      {isOpen ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                      {isOpen ? 'Hide' : 'Show'} {triggerLabel}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {/* Add a small top margin to the content when it's collapsible */}
                    <ScrollArea className="max-h-60 mt-1">
                      <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-gray-900/50 p-1 rounded`}>
                        {resultString}
                      </pre>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                // Original rendering for non-collapsible or error content
                <ScrollArea className="max-h-60">
                  <pre className={`text-xs ${contentTextColor} whitespace-pre-wrap bg-gray-900/50 p-1 rounded`}>
                    {resultString}
                  </pre>
                </ScrollArea>
              )}
            </CardContent>
            ```

**3. Verify `src/components/ui/collapsible.tsx`:**

    *   Ensure this file exists and properly exports `Collapsible`, `CollapsibleTrigger`, and `CollapsibleContent` from `@radix-ui/react-collapsible`. The expected content is:
        ```typescript
        // src/components/ui/collapsible.tsx
        "use client"

        import * as React from "react"
        import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

        const Collapsible = CollapsiblePrimitive.Root

        const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

        const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

        export { Collapsible, CollapsibleTrigger, CollapsibleContent }
        ```
        No changes are needed here if it matches this.

**4. Test Scenarios:**

    *   **Long string results (e.g., from `Read` tool):** Should appear collapsed by default. Clicking the "Show..." trigger should expand it. Clicking "Hide..." should collapse it. The line count in the trigger should be accurate.
    *   **Short string results:** Should display directly without a collapsible trigger.
    *   **JSON/Object results:**
        *   If the stringified JSON is long, it should also be collapsible.
        *   If short, it should display directly.
    *   **Error results (`isError === true`):** Should always display fully, not be collapsible, regardless of length.
    *   Ensure styling of the trigger button is appropriate and doesn't break the card layout.
    *   Test with various tool outputs to ensure stability.

This implementation makes long tool results (especially file contents) collapsible by default, improving the readability of the chat flow in `CoderPane`.
