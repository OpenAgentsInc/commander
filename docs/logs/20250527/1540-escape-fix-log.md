# Fix: Escape Key Only Closes Active Coder Pane

## Problem
When pressing Escape key, ALL coder panes were closing instead of just one.

## Root Cause
1. Each CoderPane instance was adding its own escape key listener to the window
2. There was ALSO a global escape handler in HomePage.tsx that closes any active dismissable pane
3. This caused double-closing: the global handler closed one pane, then the CoderPane handler closed another

## Solution
1. Changed `removePane('coder_pane')` to `removePane(paneId)` to close the specific pane
2. Added check in CoderPane's escape handler to only respond if the pane is active:
   ```typescript
   if (currentState.activePaneId === paneId) {
     handleExitCoderMode();
   }
   ```
3. Modified the global escape handler in HomePage.tsx to skip coder panes:
   ```typescript
   if (activePane && activePane.dismissable !== false && activePane.type !== 'coder') {
     // Handle escape for non-coder panes
   }
   ```

## Result
- Escape key now only closes the active coder pane
- Coder panes handle their own escape key behavior
- Other pane types still use the global escape handler
- No more double-closing issues