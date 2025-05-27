# Feature Flag System

## Overview

The Feature Flag System in Commander allows selective enabling and disabling of features at runtime. This system is built using Effect and integrates seamlessly with our configuration and telemetry services.

## Architecture

### Core Components

```
┌─────────────────────┐
│   FeatureFlag.ts    │  ← Feature enum definitions
└──────────┬──────────┘
           │
           │
┌──────────▼──────────┐
│ FeatureFlagService  │  ← Service interface
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│FeatureFlagServiceImpl │  ← Effect layer implementation
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  useFeatureFlag     │  ← React hook for components
└─────────────────────┘
```

### Service Dependencies

```
FeatureFlagService
    ├── ConfigurationService (reads enabled features)
    └── TelemetryService (tracks initialization)
```

## Feature Definitions

All features are defined in the `Feature` enum:

```typescript
export enum Feature {
  // AI Providers
  CLAUDE_CODE_PROVIDER = "CLAUDE_CODE_PROVIDER",
  OLLAMA_PROVIDER = "OLLAMA_PROVIDER",

  // UI Panes
  CODER_PANE = "CODER_PANE",
  HAND_TRACKING = "HAND_TRACKING",
  WALLET_PANE = "WALLET_PANE",
  DVM_PROVIDER_PANE = "DVM_PROVIDER_PANE",
  DVM_JOB_HISTORY_PANE = "DVM_JOB_HISTORY_PANE",
  PREVIOUS_CHATS_PANE = "PREVIOUS_CHATS_PANE",
}
```

## Configuration

Feature flags are configured through the `FEATURE_FLAGS_ENABLED_LIST` configuration key:

```typescript
// In ConfigurationServiceImpl.ts
yield* _(configService.set(
  "FEATURE_FLAGS_ENABLED_LIST",
  "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING"
));
```

The value is a comma-separated list of feature names. Features not in this list are considered disabled.

## Usage

### In React Components

Use the `useFeatureFlag` hook:

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { Feature } from '@/services/featureflags/FeatureFlag';

function MyComponent() {
  const [isWalletEnabled, isLoading, error] = useFeatureFlag(Feature.WALLET_PANE);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;

  return isWalletEnabled ? <WalletUI /> : null;
}
```

### In Effect Services

Inject `FeatureFlagService` and use it directly:

```typescript
const loadProviders = Effect.gen(function* (_) {
  const featureFlagService = yield* _(FeatureFlagService);
  const isOllamaEnabled = yield* _(featureFlagService.isEnabled(Feature.OLLAMA_PROVIDER));

  if (isOllamaEnabled) {
    // Load Ollama provider
  }
});
```

### Conditional UI Rendering

The Hotbar component demonstrates best practices for feature-flagged UI:

```typescript
const [isCoderPaneEnabled] = useFeatureFlag(Feature.CODER_PANE);

return (
  <div className="hotbar">
    {isCoderPaneEnabled ? (
      <HotbarItem slotNumber={1} onClick={onToggleCoderPane}>
        <CodeXml />
      </HotbarItem>
    ) : (
      <HotbarItem slotNumber={1} isGhost>
        <span className="h-5 w-5" />
      </HotbarItem>
    )}
  </div>
);
```

Ghost items maintain consistent slot positions even when features are disabled.

### Keyboard Shortcuts

Keyboard shortcuts should check feature flags before executing:

```typescript
const [isWalletEnabled] = useFeatureFlag(Feature.WALLET_PANE);

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === '3' && event.ctrlKey) {
    if (isWalletEnabled) {
      toggleWalletPane();
    }
  }
};
```

## Implementation Details

### Service Implementation

The `FeatureFlagServiceLive` layer:
1. Reads the enabled features list from configuration on initialization
2. Parses the comma-separated string into a Set of Feature enums
3. Provides O(1) lookup for feature status
4. Tracks initialization via telemetry
5. Handles errors gracefully with proper Effect error types

### Error Handling

The system defines a custom error type:

```typescript
export class FeatureFlagError extends Data.TaggedError("FeatureFlagError")<{
  message: string;
  cause?: unknown;
}> {}
```

### Initialization Flow

1. Service is created when the runtime is built
2. On first feature check, it initializes by reading configuration
3. Initialization is memoized - subsequent checks use cached data
4. Telemetry event is sent with enabled features list

## Best Practices

### 1. Always Handle Loading States

```typescript
const [isEnabled, isLoading, error] = useFeatureFlag(Feature.SOME_FEATURE);

if (isLoading) {
  // Show loading state or default to disabled
  return null;
}
```

### 2. Group Related Features

When multiple UI elements depend on the same feature:

```typescript
// Good - single feature check at parent level
function DVMSection() {
  const [isDVMEnabled] = useFeatureFlag(Feature.DVM_PROVIDER_PANE);

  if (!isDVMEnabled) return null;

  return (
    <>
      <DVMProviderUI />
      <DVMHistoryUI />
      <DVMSettingsUI />
    </>
  );
}
```

### 3. Maintain UI Consistency

Use ghost/placeholder elements to maintain layout:

```typescript
{isFeatureEnabled ? (
  <ActiveComponent />
) : (
  <GhostComponent /> // Maintains spacing/layout
)}
```

### 4. Document Feature Dependencies

```typescript
// This component requires both WALLET_PANE and DVM_PROVIDER_PANE
function PaymentFlow() {
  const [isWalletEnabled] = useFeatureFlag(Feature.WALLET_PANE);
  const [isDVMEnabled] = useFeatureFlag(Feature.DVM_PROVIDER_PANE);

  if (!isWalletEnabled || !isDVMEnabled) {
    return <FeatureDisabledMessage />;
  }
  // ...
}
```

## Adding New Features

1. **Add to Feature Enum**
   ```typescript
   export enum Feature {
     // ...existing features...
     MY_NEW_FEATURE = "MY_NEW_FEATURE",
   }
   ```

2. **Update Default Configuration** (if needed)
   ```typescript
   yield* _(configService.set(
     "FEATURE_FLAGS_ENABLED_LIST",
     "EXISTING_FEATURES,MY_NEW_FEATURE"
   ));
   ```

3. **Add Feature Checks**
   ```typescript
   const [isMyFeatureEnabled] = useFeatureFlag(Feature.MY_NEW_FEATURE);
   ```

4. **Update Documentation**
   - Add to this document
   - Update release notes
   - Note in PR description

## Testing

### Unit Testing

Mock the feature flag service:

```typescript
const mockFeatureFlagService: FeatureFlagService = {
  isEnabled: (flag: Feature) => {
    const enabledFeatures = [Feature.CODER_PANE, Feature.HAND_TRACKING];
    return Effect.succeed(enabledFeatures.includes(flag));
  },
  getEnabledFeatures: () => Effect.succeed([Feature.CODER_PANE, Feature.HAND_TRACKING])
};
```

### Manual Testing

1. Modify `FEATURE_FLAGS_ENABLED_LIST` in configuration
2. Restart the application
3. Verify only enabled features appear in UI
4. Check keyboard shortcuts respect flags
5. Confirm telemetry tracks correct features

## Release Configuration Examples

### v0.0.5 - Minimal Release
```typescript
"FEATURE_FLAGS_ENABLED_LIST": "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING"
```

### v0.0.6 - Add Wallet Support
```typescript
"FEATURE_FLAGS_ENABLED_LIST": "CLAUDE_CODE_PROVIDER,CODER_PANE,HAND_TRACKING,WALLET_PANE"
```

### v0.1.0 - Full Feature Set
```typescript
"FEATURE_FLAGS_ENABLED_LIST": "CLAUDE_CODE_PROVIDER,OLLAMA_PROVIDER,CODER_PANE,HAND_TRACKING,WALLET_PANE,DVM_PROVIDER_PANE,DVM_JOB_HISTORY_PANE,PREVIOUS_CHATS_PANE"
```

## Troubleshooting

### Features Not Appearing

1. Check configuration value:
   ```typescript
   const config = yield* _(configService.get("FEATURE_FLAGS_ENABLED_LIST"));
   console.log("Enabled features:", config);
   ```

2. Verify feature name matches enum exactly (case-sensitive)

3. Check for initialization errors in console/telemetry

### Performance Considerations

- Feature checks are O(1) after initialization
- Hook results are not memoized - use `useMemo` if needed
- Consider checking features at component mount rather than render

## Future Enhancements

1. **Dynamic Reloading**: Allow feature flag changes without restart
2. **User Overrides**: Let power users enable experimental features
3. **A/B Testing**: Use feature flags for gradual rollouts
4. **Feature Analytics**: Track feature usage through telemetry
5. **Feature Dependencies**: Define relationships between features
6. **Environment-Specific Defaults**: Different flags for dev/staging/prod
