import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { Effect, Layer, Runtime } from "effect";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { Feature } from "@/services/featureflags/FeatureFlag";
import { FeatureFlagService, FeatureFlagError } from "@/services/featureflags/FeatureFlagService";
import { ConfigError } from "@/services/configuration";
import * as runtimeModule from "@/services/runtime";

describe("useFeatureFlag", () => {
  let mockRuntime: Runtime.Runtime<FeatureFlagService>;
  
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRuntime = (enabledFeatures: Feature[]) => {
    const enabledSet = new Set(enabledFeatures);
    
    const mockService = FeatureFlagService.of({
      isEnabled: (flag: Feature) => Effect.succeed(enabledSet.has(flag)),
      getEnabledFeatures: () => Effect.succeed(enabledFeatures),
    });

    const layer = Layer.succeed(FeatureFlagService, mockService);
    return Runtime.runSync(Effect.runtime<FeatureFlagService>().pipe(
      Effect.provide(layer)
    ));
  };

  it("should return the correct enabled state for a feature", async () => {
    mockRuntime = createMockRuntime([Feature.CODER_PANE, Feature.WALLET_PANE]);
    vi.spyOn(runtimeModule, "getMainRuntime").mockReturnValue(mockRuntime as any);

    const { result } = renderHook(() => useFeatureFlag(Feature.CODER_PANE));

    // Initially loading
    expect(result.current[0]).toBe(false);
    expect(result.current[1]).toBe(true);
    expect(result.current[2]).toBe(null);

    // Wait for effect to complete
    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });

    // Feature should be enabled
    expect(result.current[0]).toBe(true);
    expect(result.current[2]).toBe(null);
  });

  it("should return false for disabled features", async () => {
    mockRuntime = createMockRuntime([Feature.WALLET_PANE]);
    vi.spyOn(runtimeModule, "getMainRuntime").mockReturnValue(mockRuntime as any);

    const { result } = renderHook(() => useFeatureFlag(Feature.CODER_PANE));

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });

    expect(result.current[0]).toBe(false);
    expect(result.current[2]).toBe(null);
  });

  it("should handle runtime not available", async () => {
    vi.spyOn(runtimeModule, "getMainRuntime").mockReturnValue(null);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useFeatureFlag(Feature.CODER_PANE));

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });

    expect(result.current[0]).toBe(false);
    expect(result.current[1]).toBe(false);
    expect(result.current[2]).toBeInstanceOf(FeatureFlagError);
    expect(result.current[2]?.message).toBe("Runtime not available for feature flag check");
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Runtime not available for useFeatureFlag hook. Feature flags will default to disabled."
    );
  });

  it("should handle service errors", async () => {
    const mockService = FeatureFlagService.of({
      isEnabled: () => Effect.fail(new FeatureFlagError({ message: "Service error" })),
      getEnabledFeatures: () => Effect.succeed([]),
    });

    const layer = Layer.succeed(FeatureFlagService, mockService);
    mockRuntime = Runtime.runSync(Effect.runtime<FeatureFlagService>().pipe(
      Effect.provide(layer)
    ));
    
    vi.spyOn(runtimeModule, "getMainRuntime").mockReturnValue(mockRuntime as any);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useFeatureFlag(Feature.WALLET_PANE));

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });

    expect(result.current[0]).toBe(false);
    expect(result.current[2]).toBeInstanceOf(FeatureFlagError);
    expect(result.current[2]?.message).toBe("Service error");
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Error checking feature flag ${Feature.WALLET_PANE}:`,
      expect.any(FeatureFlagError)
    );
  });

  it("should handle config errors", async () => {
    const mockService = FeatureFlagService.of({
      isEnabled: () => Effect.fail(new ConfigError({ message: "Config error" })),
      getEnabledFeatures: () => Effect.succeed([]),
    });

    const layer = Layer.succeed(FeatureFlagService, mockService);
    mockRuntime = Runtime.runSync(Effect.runtime<FeatureFlagService>().pipe(
      Effect.provide(layer)
    ));
    
    vi.spyOn(runtimeModule, "getMainRuntime").mockReturnValue(mockRuntime as any);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useFeatureFlag(Feature.DVM_PROVIDER_PANE));

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });

    expect(result.current[0]).toBe(false);
    expect(result.current[2]?._tag).toBe("ConfigError");
    expect(result.current[2]?.message).toBe("Config error");
  });

  it("should re-check when feature changes", async () => {
    mockRuntime = createMockRuntime([Feature.CODER_PANE]);
    vi.spyOn(runtimeModule, "getMainRuntime").mockReturnValue(mockRuntime as any);

    const { result, rerender } = renderHook(
      ({ feature }) => useFeatureFlag(feature),
      { initialProps: { feature: Feature.CODER_PANE } }
    );

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });

    expect(result.current[0]).toBe(true);

    // Change to a different feature
    rerender({ feature: Feature.WALLET_PANE });

    // Should start loading again
    expect(result.current[1]).toBe(true);

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });

    expect(result.current[0]).toBe(false);
  });

  it("should handle v0.0.5 feature set", async () => {
    const v005Features = [
      Feature.CODER_PANE,
      Feature.DVM_PROVIDER_PANE,
      Feature.WALLET_PANE,
      Feature.DVM_JOB_HISTORY_PANE,
      Feature.PREVIOUS_CHATS_PANE,
      Feature.HAND_TRACKING
    ];
    
    mockRuntime = createMockRuntime(v005Features);
    vi.spyOn(runtimeModule, "getMainRuntime").mockReturnValue(mockRuntime as any);

    // Test enabled feature
    const { result: coderResult } = renderHook(() => useFeatureFlag(Feature.CODER_PANE));
    await waitFor(() => {
      expect(coderResult.current[1]).toBe(false);
    });
    expect(coderResult.current[0]).toBe(true);

    // Test disabled feature
    const { result: agentResult } = renderHook(() => useFeatureFlag(Feature.AGENT_CHAT_PANE));
    await waitFor(() => {
      expect(agentResult.current[1]).toBe(false);
    });
    expect(agentResult.current[0]).toBe(false);
  });
});