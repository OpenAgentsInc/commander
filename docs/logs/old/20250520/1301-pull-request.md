# Title: Fix AsyncFiberException in Spark Initialization and Improve Runtime Error Handling

## Summary

This PR addresses a critical initialization error that was causing the application to fall back to a minimal runtime with most services unavailable. The primary issues were:

- An AsyncFiberException during `SparkWallet.initialize` due to invalid account number configuration
- Insufficient error diagnostics for Spark initialization failures
- Redundant React root creation causing console warnings
- Suboptimal fallback runtime creation when primary runtime failed

## Changes

### 1. Fixed Spark Initialization Error

- Fixed the root cause: account numbers 0 and 1 are not allowed by Spark SDK
- Updated default SparkServiceConfig to use account number 2
- Added clear documentation in the SparkServiceConfig interface about this constraint
- Created test cases to verify account number validation

### 2. Enhanced Error Diagnostics

- Added detailed telemetry logging for Spark initialization failures
- Improved error tracking via TelemetryService to capture SDK-level errors
- Expanded error context to better diagnose initialization issues

### 3. Fixed React Duplicate Root Warning

- Removed redundant `createRoot` and `root.render` calls from App.tsx
- Ensured React app is properly rendered once from renderer.ts

### 4. Improved Runtime Fallback Mechanisms

- Created a multi-tiered fallback strategy for runtime initialization failures
- Enhanced fallback telemetry to capture more diagnostic information
- Added more robust error handling for emergency runtime creation

## Test Plan

- All unit tests pass, including new tests for account number validation
- TypeScript checks pass with no errors
- Verified proper initialization of the Spark service in local development
- Confirmed the AsyncFiberException no longer occurs
- Tested runtime fallback mechanism via mock failures

## Technical Notes

- The Spark SDK requires account numbers to be 2 or higher, which was the root cause of our initialization failures
- The previous telemetry enhancements were crucial for identifying this issue
- Fixed several TypeScript types to improve code quality and prevent future errors

## Risk Assessment

- Low: Changes are focused on initialization and error handling
- No changes to core business logic or existing features
- Improved error handling should reduce future instability
