# MAINNET Verification - 0320

## Summary
Verified that wallet pane is already using MAINNET for invoice generation.

## Investigation
1. Checked WalletPane.tsx - uses `getMainRuntime()` 
2. Traced through runtime.ts - uses `DefaultSparkServiceConfigLayer`
3. Found DefaultSparkServiceConfigLayer in SparkService.ts:
   ```typescript
   export const DefaultSparkServiceConfigLayer = Layer.succeed(
     SparkServiceConfigTag,
     {
       network: "MAINNET",  // Already set to MAINNET
       mnemonicOrSeed: "test test test test test test test test test test test junk",
       accountNumber: 2,
       // ...
     },
   );
   ```

## Conclusion
The wallet pane is already correctly configured to use MAINNET. No changes needed.

The consumer pane was also already updated to MAINNET in the previous work.