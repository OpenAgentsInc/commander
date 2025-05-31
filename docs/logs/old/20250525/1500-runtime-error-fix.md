# Runtime Error Fix: Claude Code Provider Browser Compatibility

## Issue Identified

The app fails to start due to Claude Code provider attempting to import Node.js modules in the renderer process:

```
Error: Module "child_process" has been externalized for browser compatibility.
Cannot access "child_process.spawn" in client code.
```

## Root Cause

The `ClaudeCliExecutor.ts` imports `child_process` which is a Node.js-only module that cannot run in the browser/renderer process. This violates Electron's security model.

## Solution Strategy

Move Claude Code provider execution to main process only, keeping just the IPC interface in the renderer.

## Implementation Steps

1. Exclude claude_code provider from renderer compilation
2. Ensure IPC communication handles all CLI operations
3. Update imports to only expose IPC interfaces to renderer

This aligns with our original architectural analysis that identified fundamental incompatibilities.
