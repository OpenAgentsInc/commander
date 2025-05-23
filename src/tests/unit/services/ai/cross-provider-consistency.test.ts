import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Cross-Provider Pattern Consistency Tests
 * 
 * These tests ensure that all AI providers (Ollama, OpenAI, NIP90) use
 * consistent Effect generator patterns and implementation approaches.
 * 
 * This helps prevent pattern drift where one provider might use a different
 * (potentially buggy) approach than others.
 */

describe("AI Provider Pattern Consistency", () => {
  // Paths to all AI provider implementations
  const providerPaths = {
    ollama: join(__dirname, "../../../services/ai/providers/ollama/OllamaAgentLanguageModelLive.ts"),
    openai: join(__dirname, "../../../services/ai/providers/openai/OpenAIAgentLanguageModelLive.ts"),
    nip90: join(__dirname, "../../../services/ai/providers/nip90/NIP90AgentLanguageModelLive.ts"),
  };

  it("should use identical Effect.gen export patterns across all providers", () => {
    const patterns: Record<string, string> = {};
    
    for (const [name, path] of Object.entries(providerPaths)) {
      try {
        const content = readFileSync(path, 'utf-8');
        patterns[name] = content;
      } catch (error) {
        // If file doesn't exist, skip it but log
        console.log(`Provider ${name} not found at ${path}`);
        continue;
      }
    }

    // Check that all providers use Effect.gen export pattern
    for (const [name, content] of Object.entries(patterns)) {
      expect(content).toMatch(/export const \w+AgentLanguageModelLive = Effect\.gen\(function\* \(_\) \{/);
      console.log(`✅ ${name} uses correct Effect.gen export pattern`);
    }
  });

  it("should use consistent service access patterns", () => {
    const patterns: Record<string, string> = {};
    
    for (const [name, path] of Object.entries(providerPaths)) {
      try {
        const content = readFileSync(path, 'utf-8');
        patterns[name] = content;
      } catch (error) {
        continue;
      }
    }

    // Check service access patterns
    for (const [name, content] of Object.entries(patterns)) {
      // Should yield TelemetryService and ConfigurationService directly (not .Tag)
      if (content.includes("TelemetryService")) {
        expect(content).toMatch(/yield\* _\(TelemetryService\)/);
        expect(content).not.toMatch(/yield\* _\(TelemetryService\.Tag\)/);
        console.log(`✅ ${name} uses correct TelemetryService access pattern`);
      }

      if (content.includes("ConfigurationService")) {
        expect(content).toMatch(/yield\* _\(ConfigurationService\)/);
        expect(content).not.toMatch(/yield\* _\(ConfigurationService\.Tag\)/);
        console.log(`✅ ${name} uses correct ConfigurationService access pattern`);
      }
    }
  });

  it("should NOT use double yield anti-patterns", () => {
    const patterns: Record<string, string> = {};
    
    for (const [name, path] of Object.entries(providerPaths)) {
      try {
        const content = readFileSync(path, 'utf-8');
        patterns[name] = content;
      } catch (error) {
        continue;
      }
    }

    // Check for anti-patterns that cause "yield* not iterable" errors
    for (const [name, content] of Object.entries(patterns)) {
      // Should NOT have double yield patterns
      expect(content).not.toMatch(/const aiModel = yield\* _\([^)]+\);\s*const provider = yield\* _\(\s*aiModel/);
      expect(content).not.toMatch(/yield\* _\(\s*\([^)]+\s+as\s+unknown\)\s+as\s+Effect\.Effect/);
      
      console.log(`✅ ${name} does not use double yield anti-patterns`);
    }
  });

  it("should use consistent provider extraction patterns", () => {
    const patterns: Record<string, string> = {};
    
    for (const [name, path] of Object.entries(providerPaths)) {
      try {
        const content = readFileSync(path, 'utf-8');
        patterns[name] = content;
      } catch (error) {
        continue;
      }
    }

    // Check for consistent provider extraction
    for (const [name, content] of Object.entries(patterns)) {
      if (content.includes("configuredAiModelEffect")) {
        // Should extract provider directly from configured effect
        expect(content).toMatch(/const provider = yield\* _\(configuredAiModelEffect\)/);
        console.log(`✅ ${name} uses correct provider extraction pattern`);
      }
    }
  });

  it("should use consistent makeAgentLanguageModel implementation patterns", () => {
    const patterns: Record<string, string> = {};
    
    for (const [name, path] of Object.entries(providerPaths)) {
      try {
        const content = readFileSync(path, 'utf-8');
        patterns[name] = content;
      } catch (error) {
        continue;
      }
    }

    // Check for consistent makeAgentLanguageModel usage
    for (const [name, content] of Object.entries(patterns)) {
      if (content.includes("makeAgentLanguageModel")) {
        expect(content).toMatch(/return makeAgentLanguageModel\(/);
        
        // Should have generateText, streamText methods
        expect(content).toMatch(/generateText:\s*\([^)]*\)\s*=>/);
        expect(content).toMatch(/streamText:\s*\([^)]*\)\s*=>/);
        
        console.log(`✅ ${name} uses correct makeAgentLanguageModel pattern`);
      }
    }
  });

  it("should use consistent provider.use() patterns where applicable", () => {
    const patterns: Record<string, string> = {};
    
    for (const [name, path] of Object.entries(providerPaths)) {
      try {
        const content = readFileSync(path, 'utf-8');
        patterns[name] = content;
      } catch (error) {
        continue;
      }
    }

    // Check for consistent provider.use() patterns
    for (const [name, content] of Object.entries(patterns)) {
      if (content.includes("provider.use")) {
        // Should use provider.use(Effect.gen(...)) pattern
        expect(content).toMatch(/provider\.use\(\s*Effect\.gen\(function\* \(_\) \{/);
        console.log(`✅ ${name} uses correct provider.use() pattern`);
      }
    }
  });

  it("should use consistent Layer export patterns", () => {
    const patterns: Record<string, string> = {};
    
    for (const [name, path] of Object.entries(providerPaths)) {
      try {
        const content = readFileSync(path, 'utf-8');
        patterns[name] = content;
      } catch (error) {
        continue;
      }
    }

    // Check for consistent Layer export patterns
    for (const [name, content] of Object.entries(patterns)) {
      if (content.includes("LiveLayer")) {
        // Should export Layer using Layer.effect pattern
        expect(content).toMatch(/export const \w+AgentLanguageModelLiveLayer = Layer\.effect\(/);
        expect(content).toMatch(/AgentLanguageModel\.Tag,/);
        console.log(`✅ ${name} uses correct Layer export pattern`);
      }
    }
  });
});