import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';
import {
  TelemetryService,
  TelemetryServiceLive,
  type TelemetryEvent
} from '@/services/telemetry';

// Since we're using console.log for the implementation placeholder
// let's spy on console.log
const consoleLogSpy = vi.spyOn(console, 'log');

describe('TelemetryService', () => {
  beforeEach(() => {
    consoleLogSpy.mockClear();
  });

  it('TelemetryService tag should be defined', () => {
    expect(TelemetryService).toBeDefined();
  });

  it('TelemetryServiceLive layer should be defined', () => {
    expect(TelemetryServiceLive).toBeDefined();
  });

  it('can access the service via the layer', async () => {
    const program = Effect.gen(function* (_) {
      const telemetryService = yield* _(TelemetryService);
      expect(telemetryService).toBeDefined();
      expect(telemetryService.trackEvent).toBeTypeOf('function');
      expect(telemetryService.isEnabled).toBeTypeOf('function');
      expect(telemetryService.setEnabled).toBeTypeOf('function');
      return "success";
    }).pipe(Effect.provide(TelemetryServiceLive));

    const result = await Effect.runPromise(program);
    expect(result).toBe("success");
  });

  describe('isEnabled & setEnabled', () => {
    it('should be disabled by default', async () => {
      const program = Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        return yield* _(telemetryService.isEnabled());
      }).pipe(Effect.provide(TelemetryServiceLive));

      const isEnabled = await Effect.runPromise(program);
      expect(isEnabled).toBe(false);
    });

    it('should be enabled after calling setEnabled(true)', async () => {
      const program = Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        yield* _(telemetryService.setEnabled(true));
        return yield* _(telemetryService.isEnabled());
      }).pipe(Effect.provide(TelemetryServiceLive));

      const isEnabled = await Effect.runPromise(program);
      expect(isEnabled).toBe(true);
    });

    it('should be disabled after calling setEnabled(false)', async () => {
      const program = Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        // First enable
        yield* _(telemetryService.setEnabled(true));
        // Then disable
        yield* _(telemetryService.setEnabled(false));
        return yield* _(telemetryService.isEnabled());
      }).pipe(Effect.provide(TelemetryServiceLive));

      const isEnabled = await Effect.runPromise(program);
      expect(isEnabled).toBe(false);
    });
  });

  describe('trackEvent', () => {
    it('should not log anything when telemetry is disabled', async () => {
      const validEvent: TelemetryEvent = {
        category: 'test',
        action: 'click'
      };

      const program = Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        // Make sure telemetry is disabled
        yield* _(telemetryService.setEnabled(false));
        // Track an event (should be a no-op)
        yield* _(telemetryService.trackEvent(validEvent));
        return "success";
      }).pipe(Effect.provide(TelemetryServiceLive));

      await Effect.runPromise(program);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log events to console when telemetry is enabled', async () => {
      const validEvent: TelemetryEvent = {
        category: 'test',
        action: 'click'
      };

      const program = Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        // Enable telemetry
        yield* _(telemetryService.setEnabled(true));
        // Track an event
        yield* _(telemetryService.trackEvent(validEvent));
        return "success";
      }).pipe(Effect.provide(TelemetryServiceLive));

      await Effect.runPromise(program);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith("[Telemetry]", expect.objectContaining({
        category: 'test',
        action: 'click',
        timestamp: expect.any(Number)
      }));
    });

    it('should add timestamp if not provided', async () => {
      const validEvent: TelemetryEvent = {
        category: 'test',
        action: 'click'
      };

      const program = Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        yield* _(telemetryService.setEnabled(true));
        yield* _(telemetryService.trackEvent(validEvent));
        return "success";
      }).pipe(Effect.provide(TelemetryServiceLive));

      await Effect.runPromise(program);
      expect(consoleLogSpy).toHaveBeenCalledWith("[Telemetry]", expect.objectContaining({
        timestamp: expect.any(Number)
      }));
    });

    it('should use provided timestamp if available', async () => {
      const fixedTimestamp = 1621234567890;
      const validEvent: TelemetryEvent = {
        category: 'test',
        action: 'click',
        timestamp: fixedTimestamp
      };

      const program = Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        yield* _(telemetryService.setEnabled(true));
        yield* _(telemetryService.trackEvent(validEvent));
        return "success";
      }).pipe(Effect.provide(TelemetryServiceLive));

      await Effect.runPromise(program);
      expect(consoleLogSpy).toHaveBeenCalledWith("[Telemetry]", expect.objectContaining({
        timestamp: fixedTimestamp
      }));
    });

    it('should accept optional values', async () => {
      const validEvent: TelemetryEvent = {
        category: 'test',
        action: 'click',
        value: 123,
        label: 'button'
      };

      const program = Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        yield* _(telemetryService.setEnabled(true));
        yield* _(telemetryService.trackEvent(validEvent));
        return "success";
      }).pipe(Effect.provide(TelemetryServiceLive));

      await Effect.runPromise(program);
      expect(consoleLogSpy).toHaveBeenCalledWith("[Telemetry]", expect.objectContaining({
        value: 123,
        label: 'button'
      }));
    });

    it('should fail with TrackEventError for invalid event (missing required fields)', async () => {
      // @ts-expect-error Testing invalid event
      const invalidEvent = {
        // Missing required 'category' field
        action: 'click'
      };

      const program = Effect.gen(function* (_) {
        const telemetryService = yield* _(TelemetryService);
        yield* _(telemetryService.setEnabled(true));
        // This should fail due to missing required field
        return yield* _(telemetryService.trackEvent(invalidEvent));
      }).pipe(Effect.provide(TelemetryServiceLive));

      try {
        await Effect.runPromise(program);
        expect.fail("Should have thrown an error");
      } catch (e) {
        // Using more general assertions since Effect.js wraps errors
        expect(e).toBeDefined();
        expect(String(e)).toContain("Invalid event format");
      }
    });
  });
});