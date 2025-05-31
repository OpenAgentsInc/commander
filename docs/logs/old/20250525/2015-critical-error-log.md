# Critical Error in Testing Approach

**Date**: 2025-01-25  
**Time**: 20:15  
**Error**: Attempted to use Electron's utilityProcess in standalone Node.js

## The Mistake

In `scripts/test-utility-process.js`, I tried to:

```javascript
const { app, utilityProcess } = require("electron");
```

Then run it with:

```bash
npx electron scripts/test-utility-process.js
```

This is wrong because:

1. The script runs as the main process
2. utilityProcess is meant to be used FROM an Electron main process
3. The test wasn't actually testing the real implementation in main.ts

## What Actually Needs Testing

The REAL implementation is in `src/main.ts` where:

1. IPC handler receives "claude-code:chat-stream"
2. Uses utilityProcess.fork() to spawn wrapper
3. Wrapper should execute and communicate back

## Correct Testing Approach

Need to:

1. Start the actual Electron app
2. Trigger the IPC call from renderer (or simulate it)
3. Check if utility wrapper executes
4. Debug why wrapper isn't running

## Next Step

Test the actual implementation in main.ts, not a standalone script.
