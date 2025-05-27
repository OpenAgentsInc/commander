import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { Feature } from "@/services/featureflags/FeatureFlag";

describe("Feature enum validation", () => {
  it("should have the expected features", () => {
    const allFeatures = Object.values(Feature);
    console.log("All features:", allFeatures);
    
    expect(allFeatures).toContain("CODER_PANE");
    expect(allFeatures).toContain("WALLET_PANE");
    expect(allFeatures).toContain("HAND_TRACKING");
  });

  it("should correctly validate feature names", () => {
    const testFeatures = ["CODER_PANE", "WALLET_PANE", "INVALID_FEATURE"];
    const validFeatures = testFeatures.filter(f => Object.values(Feature).includes(f as Feature));
    
    console.log("Test features:", testFeatures);
    console.log("Valid features:", validFeatures);
    
    expect(validFeatures).toHaveLength(2);
    expect(validFeatures).toContain("CODER_PANE");
    expect(validFeatures).toContain("WALLET_PANE");
  });

  it("should parse feature flags string correctly", () => {
    const flagsString = "CODER_PANE,WALLET_PANE,HAND_TRACKING";
    const features = flagsString
      .split(',')
      .map(f => f.trim().toUpperCase())
      .filter(f => Object.values(Feature).includes(f as Feature));
    
    console.log("Parsed features:", features);
    
    expect(features).toHaveLength(3);
    expect(features).toContain("CODER_PANE");
    expect(features).toContain("WALLET_PANE");
    expect(features).toContain("HAND_TRACKING");
  });
});