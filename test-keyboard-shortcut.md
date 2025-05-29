# Test Instructions for Cmd/Ctrl+N Keyboard Shortcut

## What was added:
- Added keyboard shortcut handler for Cmd/Ctrl+N in the Coder pane
- When the Coder pane is active and you press Cmd+N (Mac) or Ctrl+N (Windows/Linux), it will create a new chat session
- Updated the "New Chat" button tooltip to show the keyboard shortcut

## How to test:
1. Open the app with `pnpm start`
2. Open the Coder pane (Cmd/Ctrl+1)
3. Click on the Coder pane to make sure it's active
4. Press Cmd+N (Mac) or Ctrl+N (Windows/Linux)
5. The current chat should be cleared and a new session should start
6. Hover over the "New Chat" button to see the updated tooltip with the keyboard shortcut

## Code changes:
- Modified keyboard event handler in CoderPane.tsx to listen for 'n' key with Cmd/Ctrl modifier
- Added `isMacOs` import to show OS-specific keyboard shortcut in tooltip
- Updated button tooltip to display the appropriate shortcut based on the operating system