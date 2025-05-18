# Telemetry Implementation Log

## Phase 1: Checking the current Telemetry service files

I found that the telemetry service files already exist in the codebase:
- `/src/services/telemetry/TelemetryService.ts` - Contains the interface and type definitions
- `/src/services/telemetry/TelemetryServiceImpl.ts` - Contains the implementation
- `/src/services/telemetry/index.ts` - Exports all the telemetry functionality
- `/src/tests/unit/services/telemetry/TelemetryService.test.ts` - Unit tests for the service

I've examined the current implementation of the Telemetry service. It's already set up with the following features:
- A `TelemetryEvent` schema with category, action, value, label, and timestamp fields
- A `TelemetryService` interface with `trackEvent`, `isEnabled`, and `setEnabled` methods
- An implementation that logs to the console when telemetry is enabled
- Currently telemetry is enabled by default (hardcoded to `true`)

## Phase 2: Modify TelemetryServiceImpl.ts for Dev/Prod Behavior

According to the instructions, I need to modify `TelemetryServiceImpl.ts` so that:
- Telemetry is enabled by default in development mode
- Telemetry is disabled by default in production mode
- The telemetry service should use Vite's `import.meta.env.MODE` to detect the environment

Changes made to `/src/services/telemetry/TelemetryServiceImpl.ts`:
1. Changed the initialization of `telemetryEnabled` to use `import.meta.env.MODE === 'development'` instead of hardcoded `true`
2. Updated the `try/catch` block in `trackEvent` to explicitly handle errors from `isEnabled()` and default to `false` when errors occur
3. Added better error message for telemetry status check errors
4. Added `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL` comments to relevant console.log/error calls so they won't be replaced in phase 2
5. Added a console.log message to `setEnabled` to make it more obvious when telemetry is explicitly toggled
6. Improved the code comments throughout the implementation

## Phase 3: Implement Console Replacement Logic

Next, I need to search for all `console.*` calls in the codebase (excluding specific files) and replace them with calls to the `TelemetryService.trackEvent()`. 

I searched for all console calls in the codebase and found them in the following files:
1. `/Users/christopherdavid/code/commander/src/pages/HomePage.tsx`
2. `/Users/christopherdavid/code/commander/src/components/nip90/Nip90RequestForm.tsx`
3. `/Users/christopherdavid/code/commander/src/services/nostr/NostrServiceImpl.ts`
4. `/Users/christopherdavid/code/commander/src/components/nip90/Nip90EventList.tsx`
5. `/Users/christopherdavid/code/commander/src/services/bip32/BIP32ServiceImpl.ts`
6. `/Users/christopherdavid/code/commander/src/components/hands/useHandTracking.ts`
7. `/Users/christopherdavid/code/commander/src/main.ts`
8. `/Users/christopherdavid/code/commander/src/components/r3f/realism-effects/v2.js`
9. `/Users/christopherdavid/code/commander/src/services/ollama/OllamaServiceImpl.ts`
10. `/Users/christopherdavid/code/commander/src/helpers/ipc/ollama/ollama-listeners.ts`

According to the instructions, I should exclude the following files from modifications:
- `src/services/telemetry/TelemetryServiceImpl.ts` (which I've already updated)
- `src/tests/vitest.setup.ts`
- Any console.error calls that are specifically marked with `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL`

I'll start by checking and replacing console calls in each file, focusing first on the Nip90RequestForm.tsx since the instructions specifically mention the console.error for "Failed to publish NIP-90 request" needs special handling.

### 1. Nip90RequestForm.tsx

This file had several console.log and console.error calls that needed to be replaced:

1. First, I added the import for the TelemetryService at the top of the file:
```typescript
import { TelemetryService, TelemetryServiceLive, type TelemetryEvent } from '@/services/telemetry';
```

2. I added TelemetryServiceLive to the service layer to make it available in the Effect context
```typescript
const fullLayer = Layer.mergeAll(
  Layer.provide(NostrServiceLive, DefaultNostrServiceConfigLayer),
  NIP04ServiceLive,
  TelemetryServiceLive
);
```

3. Replaced several console.log and console.error calls with telemetry tracking:
   - `console.log("Generated Encrypted NIP-90 Request Event:", ...)` -> Using an inline Effect that calls TelemetryService.trackEvent
   - `console.log('Successfully published NIP-90 request. Event ID:', ...)` -> Using a telemetry event with category "log:info" and action "nip90_publish_success"
   - `console.log('Stored request details for later decryption')` -> Using telemetry with "generic_console_replacement" action
   - `console.error('Failed to store request details:', error)` -> Using telemetry with category "log:error"
   
4. Special handling for NIP-90 publish failure:
   - Replaced `console.error('Failed to publish NIP-90 request:', Cause.pretty(exit.cause))` with a telemetry event that has:
     - category: "log:error"
     - action: "nip90_publish_failure" 
     - label: The full error message including the user-facing error message
     - value: The pretty-printed Cause object

5. General error handling:
   - Added similar telemetry tracking for the catch block with structured error information

For all cases, I've added proper error handling for the telemetry calls themselves, with fallback console.error calls marked with `// TELEMETRY_IGNORE_THIS_CONSOLE_CALL` to prevent these from being replaced.

Now, let me move on to the next file.