# ESM Migration Typescript Errors

## Overview

After migrating the Vite configuration to use ESM by adding `"type": "module"` to package.json, we encountered numerous TypeScript errors throughout the codebase. This log documents the nature of these errors and potential approaches to fixing them.

## Error Summary

Executing `pnpm run t` (which runs `tsc --noEmit`) revealed 342 errors across 65 files. These errors fall into several categories:

### 1. Import Path Resolution

The most common error is related to path resolution in ESM mode:

```typescript
TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'.
```

Example:

```typescript
import { server } from './mocks/server';
                       ~~~~~~~~~~~~~~~~
```

### 2. Module Alias Resolution

The project uses path aliases (like `@/components/`) which now have resolution issues:

```typescript
TS2307: Cannot find module '@/components/ToggleTheme' or its corresponding type declarations.
```

Example:

```typescript
import ToggleTheme from "@/components/ToggleTheme";
```

### 3. Type Compatibility Issues

There appear to be some type compatibility issues between CJS and ESM modules:

```typescript
TS2345: Argument of type ... is not assignable to parameter of type ...
```

## Affected Files

The errors are spread across many parts of the codebase, including:

1. Components (UI, chat, hands tracking)
2. Helpers (IPC communication)
3. Services (bip32, bip39, nip19, ollama, telemetry)
4. Tests (unit tests for services and components)
5. Core application files (router, main.ts)

## Root Cause

The root cause is switching from CommonJS to ESM module resolution by adding `"type": "module"` to package.json. This change activates TypeScript's stricter ESM mode which has different import resolution rules than CommonJS:

1. ESM requires file extensions in relative imports
2. Module resolution works differently for path aliases
3. Type compatibility issues between CJS and ESM modules may occur

## Potential Solutions

### Comprehensive Approach (Most Correct)

1. Add extensions to all relative imports:

   ```typescript
   // Before
   import { server } from "./mocks/server";

   // After
   import { server } from "./mocks/server.js"; // Note: Use .js even for .ts files
   ```

2. Update TypeScript configuration to support ESM module resolution:

   ```json
   {
     "compilerOptions": {
       "moduleResolution": "NodeNext", // or "node16"
       "module": "NodeNext", // or "node16"
       "target": "ESNext",
       "allowImportingTsExtensions": true
       // ... other options
     }
   }
   ```

3. Update path alias resolution in tsconfig.json and vite.config.mts

4. Update package imports that might be affected by the CJS/ESM transition

### Pragmatic Approach (Quicker Fix)

Revert the ESM migration partially while keeping the Vite-specific changes:

1. Remove `"type": "module"` from package.json
2. Keep the renamed Vite config files with .mts extension
3. Update the Vite configs to handle both CJS and ESM modes
4. Update the scripts to reference the .mts config files

## Next Steps

Given the extensive nature of the changes required for a full ESM migration, the recommended approach is:

1. Create a separate branch for the ESM migration
2. Roll back the changes in the current branch to just address the Vite warning without full ESM migration
3. Carefully plan a complete ESM migration as a separate task

## References

- [TypeScript ESM/CJS Interoperability](https://www.typescriptlang.org/docs/handbook/esm-node.html)
- [Vite ESM Configuration](https://vitejs.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated)
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
