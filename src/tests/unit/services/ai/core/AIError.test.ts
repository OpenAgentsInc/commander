import { describe, it, expect } from "vitest";
import * as Data from "effect/Data";
import {
  AiError,
  AiProviderError,
  AiConfigurationError,
  AiToolExecutionError,
  AiContextWindowError,
  AiContentPolicyError,
  mapToAiProviderError,
  mapErrorToAiError,
} from "@/services/ai/core/AIError";

describe("AI Error Types", () => {
  describe("AiError", () => {
    it("should construct with message only", () => {
      const error = new AiError({
        message: "Generic AI error",
      });

      
      
      expect(error.message).toBe("Generic AI error");
      expect(error._tag).toBe("AiError");
      expect(error.cause).toBeUndefined();
      expect(error.context).toBeUndefined();
    });

    it("should construct with message, cause, and context", () => {
      const cause = new Error("Underlying error");
      const context = { operation: "test", metadata: { test: true } };
      const error = new AiError({
        message: "AI error with details",
        cause,
        context,
      });

      
      
      expect(error.message).toBe("AI error with details");
      expect(error._tag).toBe("AiError");
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("AiProviderError", () => {
    it("should construct with required fields", () => {
      const error = new AiProviderError({
        message: "Provider API error",
        provider: "OpenAI",
        isRetryable: true,
      });

      
      
      expect(error).toBeInstanceOf(AiProviderError);
      expect(error.message).toBe("Provider API error");
      expect(error._tag).toBe("AiProviderError");
      expect(error.provider).toBe("OpenAI");
      expect(error.isRetryable).toBe(true);
    });

    it("should construct with all fields", () => {
      const cause = new Error("API rate limit exceeded");
      const context = { request: { endpoint: "/v1/chat/completions" } };
      const error = new AiProviderError({
        message: "Provider API error with details",
        provider: "OpenAI",
        cause,
        context,
        isRetryable: true,
      });

      
      
      expect(error).toBeInstanceOf(AiProviderError);
      expect(error.message).toBe("Provider API error with details");
      expect(error._tag).toBe("AiProviderError");
      expect(error.provider).toBe("OpenAI");
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(expect.objectContaining(context));
      expect(error.isRetryable).toBe(true);
    });
  });

  describe("AiConfigurationError", () => {
    it("should construct properly", () => {
      const cause = new Error("Missing configuration file");
      const context = { config: { path: "/config.json" } };
      const error = new AiConfigurationError({
        message: "Configuration error",
        cause,
        context,
      });

      
      
      expect(error).toBeInstanceOf(AiConfigurationError);
      expect(error.message).toBe("Configuration error");
      expect(error._tag).toBe("AiConfigurationError");
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("AiToolExecutionError", () => {
    it("should construct with required fields", () => {
      const error = new AiToolExecutionError({
        message: "Tool execution failed",
        toolName: "calculator",
      });

      
      
      expect(error).toBeInstanceOf(AiToolExecutionError);
      expect(error.message).toBe("Tool execution failed");
      expect(error._tag).toBe("AiToolExecutionError");
      expect(error.toolName).toBe("calculator");
    });

    it("should construct with all fields", () => {
      const cause = new Error("Division by zero");
      const context = { args: { expression: "1/0" } };
      const error = new AiToolExecutionError({
        message: "Tool execution failed with details",
        toolName: "calculator",
        cause,
        context,
      });

      
      
      expect(error).toBeInstanceOf(AiToolExecutionError);
      expect(error.message).toBe("Tool execution failed with details");
      expect(error._tag).toBe("AiToolExecutionError");
      expect(error.toolName).toBe("calculator");
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("AiContextWindowError", () => {
    it("should construct with message only", () => {
      const error = new AiContextWindowError({
        message: "Context window exceeded",
      });

      
      
      expect(error).toBeInstanceOf(AiContextWindowError);
      expect(error.message).toBe("Context window exceeded");
      expect(error._tag).toBe("AiContextWindowError");
      expect(error.limit).toBeUndefined();
      expect(error.current).toBeUndefined();
    });

    it("should construct with all fields", () => {
      const cause = new Error("Token limit exceeded");
      const context = { conversation: { id: "chat123" } };
      const error = new AiContextWindowError({
        message: "Context window exceeded with details",
        limit: 4096,
        current: 4200,
        cause,
        context,
      });

      
      
      expect(error).toBeInstanceOf(AiContextWindowError);
      expect(error.message).toBe("Context window exceeded with details");
      expect(error._tag).toBe("AiContextWindowError");
      expect(error.limit).toBe(4096);
      expect(error.current).toBe(4200);
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("AiContentPolicyError", () => {
    it("should construct with required fields", () => {
      const error = new AiContentPolicyError({
        message: "Content policy violation",
        provider: "OpenAI",
      });

      
      
      expect(error).toBeInstanceOf(AiContentPolicyError);
      expect(error.message).toBe("Content policy violation");
      expect(error._tag).toBe("AiContentPolicyError");
      expect(error.provider).toBe("OpenAI");
      expect(error.flaggedContent).toBeUndefined();
    });

    it("should construct with all fields", () => {
      const cause = new Error("Content moderation flagged");
      const context = { request: { id: "req123" } };
      const flaggedContent = "Inappropriate content";
      const error = new AiContentPolicyError({
        message: "Content policy violation with details",
        provider: "OpenAI",
        flaggedContent,
        cause,
        context,
      });

      
      
      expect(error).toBeInstanceOf(AiContentPolicyError);
      expect(error.message).toBe("Content policy violation with details");
      expect(error._tag).toBe("AiContentPolicyError");
      expect(error.provider).toBe("OpenAI");
      expect(error.flaggedContent).toBe(flaggedContent);
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("mapToAiProviderError", () => {
    it("should convert an Error to AiProviderError", () => {
      const originalError = new Error("API connection timeout");
      const providerError = mapToAiProviderError(originalError, "Ollama", "test-model", true);

      expect(providerError).toBeInstanceOf(AiProviderError);
      expect(providerError.message).toBe("Provider error for model test-model (Ollama): API connection timeout");
      expect(providerError.provider).toBe("Ollama");
      expect(providerError.cause).toBe(originalError);
      expect(providerError.isRetryable).toBe(true);
    });

    it("should handle non-Error objects", () => {
      const nonErrorObj = { status: 429, message: "Too many requests" };
      const providerError = mapToAiProviderError(nonErrorObj, "Anthropic", "test-model", true);

      expect(providerError).toBeInstanceOf(AiProviderError);
      expect(providerError.message).toBe("Provider error for model test-model (Anthropic): [object Object]"); // Default string conversion
      expect(providerError.provider).toBe("Anthropic");
      expect(providerError.cause).toBe(nonErrorObj);
      expect(providerError.isRetryable).toBe(true);
    });
  });
});
