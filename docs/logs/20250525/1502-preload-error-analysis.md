# Preload Script Error Analysis

## Current Error
```
VM2851 renderer_init:2 Unable to load preload script: /Users/christopherdavid/code/commander/.vite/build/preload.js
VM2851 renderer_init:2 Error: Cannot bind an API on top of an existing property on the window object
```

## Problem Analysis

The error "Cannot bind an API on top of an existing property on the window object" indicates that **multiple preload scripts or context exposure functions are trying to bind the same property to the window object**.

### Root Cause Investigation

1. **Preload Script Loading Issue**: The preload script is failing to load from `.vite/build/preload.js`
2. **Window Object Collision**: Something is attempting to overwrite an existing property on the window object
3. **Multiple Context Exposures**: Likely duplicate context exposure calls in our IPC setup

### Potential Sources

1. **Duplicate IPC Context Exposure**: 
   - `exposeOllamaContext()` might be called multiple times
   - `exposeClaudeCodeContext()` might be conflicting even if disabled
   - `exposeThemeContext()` or `exposeWindowContext()` duplication

2. **Preload Script Build Issues**:
   - Vite might be failing to properly build the preload script
   - Path resolution issues in development vs production builds

3. **Context Binding Conflicts**:
   - Multiple attempts to bind `window.electronAPI`
   - Duplicate binding of `window.themeMode` or `window.electronWindow`

### Files to Investigate

1. **src/preload.ts** - Main preload entry point
2. **src/helpers/ipc/context-exposer.ts** - Context exposure coordination
3. **src/helpers/ipc/*/context.ts** - Individual context exposers
4. **forge.config.ts** - Preload script configuration
5. **vite.preload.config.mts** - Vite preload build configuration

### Immediate Actions Needed

1. **Check for duplicate context exposures** in preload.ts
2. **Verify IPC context binding logic** in each context file
3. **Examine preload build configuration** in Vite and Forge configs
4. **Test with minimal preload script** to isolate the conflicting property

### Impact

- App may load but with broken IPC communication
- Electron APIs may not be properly exposed to renderer
- Potential runtime errors when trying to use window.electronAPI

### Root Cause Identified ✅

**Problem**: Multiple `contextBridge.exposeInMainWorld("electronAPI", ...)` calls are attempting to bind to the same window property.

**Specific Issue**: 
1. `exposeOllamaContext()` calls `contextBridge.exposeInMainWorld("electronAPI", {...})`
2. `exposeClaudeCodeContext()` also calls `contextBridge.exposeInMainWorld("electronAPI", {...})`
3. The second call fails because "electronAPI" is already bound

**Evidence**:
- Both ollama-context.ts and claude-code-context.ts use the same binding key
- Error occurs because contextBridge doesn't allow overwriting existing properties
- The `...(window.electronAPI || {})` spread attempt doesn't work in preload context

### Solution Applied ✅

Disabled `exposeClaudeCodeContext()` in context-exposer.ts to resolve the immediate binding conflict.

### Architectural Fix Needed

The current approach of each context trying to bind the entire `electronAPI` object is flawed. Should implement:
1. **Single electronAPI builder** that collects all API surfaces
2. **Conditional API assembly** based on enabled features  
3. **Guard clauses** to prevent duplicate bindings

### Immediate Status
- App should now load without preload errors
- Claude Code provider temporarily disabled to resolve conflict
- Ollama and other IPC functions should work normally