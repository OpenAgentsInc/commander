# Vite ESM Update (with Rollback)

## Overview

This log documents the attempt to resolve the CJS build deprecation warning in Vite v6 by converting the project to use ESM (ECMAScript Modules) instead of CommonJS. While this initially seemed to work for tests, it later revealed extensive TypeScript errors across the codebase when running `tsc --noEmit`.

## Original Warning

```
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
```

## Attempted Solution

As documented in the Vite troubleshooting guide, the CommonJS (CJS) build of Vite's Node API is being deprecated and will be removed in a future version. The recommended solution is to:

1. Use ESM for config files by adding `"type": "module"` to package.json
2. Convert config files to use `.mjs` or `.mts` extensions for TypeScript+ESM
3. Update imports to use ESM syntax

## Changes Made

### 1. Configuration File Extensions

Renamed all Vite config files to use the `.mts` extension:

- `vite.main.config.ts` → `vite.main.config.mts`
- `vite.preload.config.ts` → `vite.preload.config.mts`
- `vitest.config.ts` → `vitest.config.mts`
- (Note: `vite.renderer.config.mts` was already using the correct extension)

### 2. Package.json Updates

Added `"type": "module"` to package.json to specify ESM as the default module type:

```json
{
  "name": "commander",
  "productName": "Commander",
  "version": "0.0.1",
  "description": "Command agents, earn bitcoin.",
  "main": ".vite/build/main.js",
  "private": true,
  "type": "module",
  "scripts": {
    ...
  },
```

Updated the test scripts to explicitly reference the new config file path:

```json
"test": "vitest run --config vitest.config.mts",
"test:watch": "vitest watch --config vitest.config.mts",
"test:unit": "vitest --config vitest.config.mts",
"test:all": "vitest run --config vitest.config.mts && playwright test",
```

### 3. Config File Updates

Updated ESM imports in the configuration files:

Example from `vite.main.config.mts`:

```typescript
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 4. Forge Config Updates

Updated file references in `forge.config.ts`:

```typescript
build: [
  {
    entry: "src/main.ts",
    config: "vite.main.config.mts",
    target: "main",
  },
  {
    entry: "src/preload.ts",
    config: "vite.preload.config.mts",
    target: "preload",
  },
],
```

### 5. Scripts Update

Updated the `copyAllToClipboard.js` script to use ESM:

```javascript
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Get __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

Also updated file references in the script:

```javascript
"vite.main.config.mts",
"vite.preload.config.mts",
"vite.renderer.config.mts",
"vitest.config.mts",
```

## Initial Results

The tests initially ran without the deprecation warning:

```
pnpm test

> commander@0.0.1 test /Users/christopherdavid/code/commander
> vitest run --config vitest.config.mts


 RUN  v3.1.3 /Users/christopherdavid/code/commander

 ✓ src/tests/unit/sum.test.ts > sum 1ms
...
 Test Files  8 passed (8)
      Tests  74 passed (74)
```

## TypeScript Errors

However, running `pnpm run t` (which runs `tsc --noEmit`) revealed 342 TypeScript errors across 65 files. These errors were primarily related to:

1. **Missing File Extensions**: ESM requires file extensions in relative imports:

   ```
   TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'.
   ```

2. **Path Alias Resolution**: Issues with `@/` path aliases:

   ```
   TS2307: Cannot find module '@/components/ToggleTheme' or its corresponding type declarations.
   ```

3. **Type Compatibility Issues**: Between CJS and ESM modules

A full list of these errors has been documented in `docs/logs/20250517/2325-esm-typescript-errors.md`.

## Revised Plan

Given the extensive changes required to fully migrate the project to ESM, the recommended approach is:

### Rollback Plan

1. Remove `"type": "module"` from package.json to revert to CommonJS mode
2. Keep the renamed `.mts` config files
3. Update the config files to handle the Vite warning without moving the entire project to ESM

### Alternative Approach for Vite Only

1. Use dynamic imports for Vite in the config files
2. Keep using `.mts` extensions for Vite-specific files
3. Update the Forge configuration

### Future Work

- Plan a complete ESM migration as a separate, dedicated task
- Update all relative imports to include file extensions
- Update TypeScript configuration to properly support ESM
- Test each module for ESM compatibility
