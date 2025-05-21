# Telemetry System Documentation

This document explains the telemetry system implementation in the Commander application, which follows the Effect.js pattern used throughout the codebase.

## Overview

The telemetry system allows the application to collect anonymous usage data to help improve the user experience. It follows these key principles:

- **User Control**: Users can enable or disable telemetry at any time
- **Transparency**: The system is clearly documented and observable
- **Privacy**: Only anonymized data is collected
- **Minimalism**: Only essential information is tracked

## Architecture

The telemetry system is built on Effect.js and follows the service pattern:

1. **Service Interface**: Defines the contract for telemetry operations
2. **Service Implementation**: Implements the interface with concrete logic
3. **Error Handling**: Uses Effect.js for safe, typed error handling
4. **Schema Validation**: Validates event data using Effect Schema

## Directory Structure

```
src/
└── services/
    └── telemetry/
        ├── TelemetryService.ts     # Interface, schemas, and error types
        ├── TelemetryServiceImpl.ts # Implementation
        └── index.ts                # Public exports
```

## Service Interface

The `TelemetryService.ts` file defines:

- **Event Schema**: Structure for telemetry events
- **Error Types**: Custom tagged errors for type-safe error handling
- **Service Interface**: Methods for tracking events and managing preferences

```typescript
// Event schema
export const TelemetryEventSchema = Schema.Struct({
  category: Schema.String, // Required event category
  action: Schema.String, // Required action name
  value: Schema.optional(
    Schema.Union(
      // Optional payload value
      Schema.String,
      Schema.Number,
      Schema.Boolean,
      Schema.Undefined,
    ),
  ),
  label: Schema.optional(Schema.String), // Optional contextual label
  timestamp: Schema.optional(Schema.Number), // Optional timestamp
});

// Error types
export class TelemetryError extends Data.TaggedError("TelemetryError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

export class TrackEventError extends Data.TaggedError("TrackEventError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

// Service interface
export interface TelemetryService {
  trackEvent(event: TelemetryEvent): Effect.Effect<void, TrackEventError>;
  isEnabled(): Effect.Effect<boolean, TelemetryError>;
  setEnabled(enabled: boolean): Effect.Effect<void, TelemetryError>;
}
```

## Service Implementation

The `TelemetryServiceImpl.ts` file implements the interface with:

- **In-memory Storage**: Maintains the telemetry enabled/disabled state
- **Event Tracking**: Logs events to the console (in production would send to a server)
- **Environment Detection**: Skips logging during test execution

```typescript
export function createTelemetryService(): TelemetryService {
  // Default to enabled
  let telemetryEnabled = true;

  const trackEvent = (
    event: TelemetryEvent,
  ): Effect.Effect<void, TrackEventError> => {
    return Effect.gen(function* (_) {
      // Validate the event schema
      yield* _(
        Schema.decodeUnknown(TelemetryEventSchema)(event),
        Effect.mapError(
          (error) =>
            new TrackEventError({
              message: "Invalid event format",
              cause: error,
            }),
        ),
      );

      // Check if telemetry is enabled
      try {
        const enabled = yield* _(
          isEnabled().pipe(
            Effect.mapError(
              (error) =>
                new TrackEventError({
                  message: error.message,
                  cause: error.cause,
                }),
            ),
          ),
        );
        if (!enabled) {
          return; // Skip tracking if disabled
        }
      } catch (error) {
        console.error("Error checking telemetry status:", error);
        // Continue anyway to avoid breaking
      }

      // Add timestamp if not provided
      const eventWithTimestamp = {
        ...event,
        timestamp: event.timestamp || Date.now(),
      };

      // Log the event (in production, would send to server)
      try {
        // Skip logging during tests
        const isTestEnv =
          process.env.NODE_ENV === "test" || process.env.VITEST !== undefined;

        if (!isTestEnv) {
          console.log("[Telemetry]", eventWithTimestamp);
        }
        return;
      } catch (cause) {
        throw new TrackEventError({
          message: "Failed to track event",
          cause,
        });
      }
    });
  };

  // Additional implementation methods...

  return { trackEvent, isEnabled, setEnabled };
}

// Layer for dependency injection
export const TelemetryServiceLive = Layer.succeed(
  TelemetryService,
  createTelemetryService(),
);
```

## Using the Telemetry Service

### In UI Components

```typescript
import { TelemetryService, TelemetryServiceLive } from "@/services/telemetry";
import { Effect, Exit, Cause } from "effect";

// Within your component
const handleAction = async () => {
  const program = Effect.gen(function* (_) {
    const telemetryService = yield* _(TelemetryService);

    // Track an event
    yield* _(
      telemetryService.trackEvent({
        category: "user_interaction",
        action: "button_click",
        label: "submit_form",
        value: Date.now(),
      }),
    );

    return "success";
  }).pipe(Effect.provide(TelemetryServiceLive));

  const result = await Effect.runPromiseExit(program);

  Exit.match(result, {
    onSuccess: () => {
      // Handle success
    },
    onFailure: (cause) => {
      console.error("Telemetry failed:", Cause.pretty(cause));
    },
  });
};
```

### Checking and Setting Telemetry State

```typescript
// Check if telemetry is enabled
const checkTelemetryStatus = async () => {
  const program = Effect.gen(function* (_) {
    const telemetryService = yield* _(TelemetryService);
    return yield* _(telemetryService.isEnabled());
  }).pipe(Effect.provide(TelemetryServiceLive));

  const isEnabled = await Effect.runPromise(program);
  return isEnabled;
};

// Enable or disable telemetry
const setTelemetryStatus = async (enabled: boolean) => {
  const program = Effect.gen(function* (_) {
    const telemetryService = yield* _(TelemetryService);
    return yield* _(telemetryService.setEnabled(enabled));
  }).pipe(Effect.provide(TelemetryServiceLive));

  await Effect.runPromise(program);
};
```

## Event Categories

The telemetry system uses a consistent categorization system:

| Category      | Description                 | Example Actions                              |
| ------------- | --------------------------- | -------------------------------------------- |
| `ui`          | User interface interactions | `open_panel`, `close_dialog`, `toggle_theme` |
| `navigation`  | Navigation events           | `page_view`, `tab_change`                    |
| `feature`     | Feature usage               | `use_tool_x`, `configure_setting_y`          |
| `performance` | Performance metrics         | `load_time`, `render_duration`               |
| `error`       | Error conditions            | `api_error`, `validation_failed`             |

## Extending the Telemetry Service

To extend the system for production use:

1. **Persistent Storage**: Replace the in-memory storage with persistent settings storage using the Electron settings API
2. **Transport Layer**: Add a transport mechanism to send events to your analytics backend
3. **Batching**: Add event batching to reduce network requests
4. **Queue**: Implement an event queue with retry logic for network failures
5. **Sampling**: Add sampling logic for high-frequency events

Example:

```typescript
// Add persistent storage
import { settings } from "electron";

const isEnabled = (): Effect.Effect<boolean, TelemetryError> => {
  return Effect.try({
    try: () => {
      // Use persistent storage
      return settings.getSync("telemetry.enabled") || false;
    },
    catch: (cause) =>
      new TelemetryError({
        message: "Failed to check if telemetry is enabled",
        cause,
      }),
  });
};

// Add network transport
const sendTelemetryData = (events: TelemetryEvent[]): Promise<void> => {
  return fetch("https://analytics.example.com/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  }).then((response) => {
    if (!response.ok) throw new Error("Failed to send telemetry");
  });
};
```

## Compliance Considerations

When implementing telemetry in a production environment, consider:

- **GDPR**: Ensure compliance with data protection regulations
- **Privacy Policy**: Update your privacy policy to disclose data collection
- **Data Retention**: Implement appropriate data retention policies
- **User Consent**: Implement opt-in consent flow for regions that require it
- **Data Minimization**: Only collect what you need
- **Anonymization**: Ensure user data is properly anonymized

## Testing

The telemetry system includes comprehensive tests to ensure all functionality works as expected:

- **Unit Tests**: Test each method in isolation
- **Mock Implementation**: Uses a special mock for testing
- **Environment Detection**: Prevents console logging during tests

Test structure:

```
src/
└── tests/
    └── unit/
        └── services/
            └── telemetry/
                └── TelemetryService.test.ts
```

## Future Improvements

Potential future improvements for the telemetry system:

1. **User Sessions**: Track events within user sessions
2. **Event Correlation**: Link related events together
3. **Custom Dimensions**: Add support for custom dimensions and metrics
4. **Telemetry Dashboard**: Add a developer dashboard for viewing telemetry data
5. **Automatic Event Tracking**: Framework-level integration for automatic tracking of common events
