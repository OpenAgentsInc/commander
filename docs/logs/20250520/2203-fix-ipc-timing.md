# Fix for IPC Registration Timing Issue

## Problem

The application was encountering the following error:

```
SellComputePane.tsx:46 Ollama status check failed: Error: Error invoking remote method 'ollama:status-check': Error: No handler registered for 'ollama:status-check'
```

This error indicates that when the renderer process (specifically `SellComputePane.tsx`) tried to invoke the `'ollama:status-check'` IPC method, the main process didn't have a corresponding handler registered for that channel.

## Root Cause

The issue is related to **timing** in the Electron application lifecycle:

1. The `ollamaServiceLayer` was properly moved inside the `addOllamaEventListeners` function in the previous fix
2. However, the IPC event listeners were still being registered too late in the Electron lifecycle
3. The renderer process was trying to use the IPC channels before they were registered in the main process

## Solution

The key fix is to register the Ollama IPC event listeners as early as possible in the main process, before the renderer process has a chance to use them:

1. Modified `main.ts` to import `addOllamaEventListeners` directly
2. Added code to register the Ollama event listeners at the module level, before any windows are created
3. Updated `listeners-register.ts` to avoid registering the Ollama listeners twice

### Changes Made

1. In `main.ts`:
   - Added direct import of `addOllamaEventListeners`
   - Called `addOllamaEventListeners()` at the module level (before `createWindow()`)
   - Added detailed logging for debugging

2. In `listeners-register.ts`:
   - Removed the call to `addOllamaEventListeners()`
   - Added comments explaining that Ollama listeners are registered earlier in `main.ts`
   - Added logging to clarify what's happening

## Expected Results

These changes ensure that the Ollama IPC event listeners are registered very early in the application lifecycle, before the renderer process has a chance to use them. This should resolve the "No handler registered for 'ollama:status-check'" error.

The solution addresses the fundamental timing issue by prioritizing the registration of Ollama IPC handlers before any window creation or other initialization occurs.