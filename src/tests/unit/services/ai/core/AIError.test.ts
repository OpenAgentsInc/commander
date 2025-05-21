import { describe, it, expect } from "vitest";
import {
  AIGenericError,
  AIProviderError,
  AIConfigurationError,
  AIToolExecutionError,
  AIContextWindowError,
  AIContentPolicyError,
  fromProviderError
} from "@/services/ai/core/AIError";

describe("Custom AI Error Types", () => {
  describe("AIGenericError", () => {
    it("should construct with message only", () => {
      const error = new AIGenericError({
        message: "Generic AI error"
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error.message).toBe("Generic AI error");
      expect(error._tag).toBe("AIGenericError");
      expect(error.name).toBe("AIGenericError");
      expect(error.cause).toBeUndefined();
      expect(error.context).toBeUndefined();
    });

    it("should construct with message, cause, and context", () => {
      const cause = new Error("Underlying error");
      const context = { operation: "test", metadata: { test: true } };
      const error = new AIGenericError({
        message: "Generic AI error with details",
        cause,
        context
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error.message).toBe("Generic AI error with details");
      expect(error._tag).toBe("AIGenericError");
      expect(error.name).toBe("AIGenericError");
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("AIProviderError", () => {
    it("should construct with required fields", () => {
      const error = new AIProviderError({
        message: "Provider API error",
        provider: "OpenAI"
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error).toBeInstanceOf(AIProviderError);
      expect(error.message).toBe("Provider API error");
      expect(error._tag).toBe("AIProviderError");
      expect(error.name).toBe("AIProviderError");
      expect(error.provider).toBe("OpenAI");
      expect(error.isRetryable).toBeUndefined();
    });

    it("should construct with all fields", () => {
      const cause = new Error("API rate limit exceeded");
      const context = { request: { endpoint: "/v1/chat/completions" } };
      const error = new AIProviderError({
        message: "Provider API error with details",
        provider: "OpenAI",
        cause,
        context,
        isRetryable: true
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error).toBeInstanceOf(AIProviderError);
      expect(error.message).toBe("Provider API error with details");
      expect(error._tag).toBe("AIProviderError");
      expect(error.name).toBe("AIProviderError");
      expect(error.provider).toBe("OpenAI");
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(expect.objectContaining(context));
      expect(error.isRetryable).toBe(true);
    });
  });

  describe("AIConfigurationError", () => {
    it("should construct properly", () => {
      const cause = new Error("Missing configuration file");
      const context = { config: { path: "/config.json" } };
      const error = new AIConfigurationError({
        message: "Configuration error",
        cause,
        context
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error).toBeInstanceOf(AIConfigurationError);
      expect(error.message).toBe("Configuration error");
      expect(error._tag).toBe("AIConfigurationError");
      expect(error.name).toBe("AIConfigurationError");
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("AIToolExecutionError", () => {
    it("should construct with required fields", () => {
      const error = new AIToolExecutionError({
        message: "Tool execution failed",
        toolName: "calculator"
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error).toBeInstanceOf(AIToolExecutionError);
      expect(error.message).toBe("Tool execution failed");
      expect(error._tag).toBe("AIToolExecutionError");
      expect(error.name).toBe("AIToolExecutionError");
      expect(error.toolName).toBe("calculator");
    });

    it("should construct with all fields", () => {
      const cause = new Error("Division by zero");
      const context = { args: { expression: "1/0" } };
      const error = new AIToolExecutionError({
        message: "Tool execution failed with details",
        toolName: "calculator",
        cause,
        context
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error).toBeInstanceOf(AIToolExecutionError);
      expect(error.message).toBe("Tool execution failed with details");
      expect(error._tag).toBe("AIToolExecutionError");
      expect(error.name).toBe("AIToolExecutionError");
      expect(error.toolName).toBe("calculator");
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("AIContextWindowError", () => {
    it("should construct with message only", () => {
      const error = new AIContextWindowError({
        message: "Context window exceeded"
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error).toBeInstanceOf(AIContextWindowError);
      expect(error.message).toBe("Context window exceeded");
      expect(error._tag).toBe("AIContextWindowError");
      expect(error.name).toBe("AIContextWindowError");
      expect(error.limit).toBeUndefined();
      expect(error.current).toBeUndefined();
    });

    it("should construct with all fields", () => {
      const cause = new Error("Token limit exceeded");
      const context = { conversation: { id: "chat123" } };
      const error = new AIContextWindowError({
        message: "Context window exceeded with details",
        limit: 4096,
        current: 4200,
        cause,
        context
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error).toBeInstanceOf(AIContextWindowError);
      expect(error.message).toBe("Context window exceeded with details");
      expect(error._tag).toBe("AIContextWindowError");
      expect(error.name).toBe("AIContextWindowError");
      expect(error.limit).toBe(4096);
      expect(error.current).toBe(4200);
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("AIContentPolicyError", () => {
    it("should construct with required fields", () => {
      const error = new AIContentPolicyError({
        message: "Content policy violation",
        provider: "OpenAI"
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error).toBeInstanceOf(AIContentPolicyError);
      expect(error.message).toBe("Content policy violation");
      expect(error._tag).toBe("AIContentPolicyError");
      expect(error.name).toBe("AIContentPolicyError");
      expect(error.provider).toBe("OpenAI");
      expect(error.flaggedContent).toBeUndefined();
    });

    it("should construct with all fields", () => {
      const cause = new Error("Content moderation flagged");
      const context = { request: { id: "req123" } };
      const flaggedContent = "Inappropriate content";
      const error = new AIContentPolicyError({
        message: "Content policy violation with details",
        provider: "OpenAI",
        flaggedContent,
        cause,
        context
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIGenericError);
      expect(error).toBeInstanceOf(AIContentPolicyError);
      expect(error.message).toBe("Content policy violation with details");
      expect(error._tag).toBe("AIContentPolicyError");
      expect(error.name).toBe("AIContentPolicyError");
      expect(error.provider).toBe("OpenAI");
      expect(error.flaggedContent).toBe(flaggedContent);
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
    });
  });

  describe("fromProviderError", () => {
    it("should convert an Error to AIProviderError", () => {
      const originalError = new Error("API connection timeout");
      const providerError = fromProviderError(originalError, "Ollama", true);

      expect(providerError).toBeInstanceOf(AIProviderError);
      expect(providerError.message).toBe("API connection timeout");
      expect(providerError.provider).toBe("Ollama");
      expect(providerError.cause).toBe(originalError);
      expect(providerError.isRetryable).toBe(true);
    });

    it("should handle non-Error objects", () => {
      const nonErrorObj = { status: 429, message: "Too many requests" };
      const providerError = fromProviderError(nonErrorObj, "Anthropic", true);

      expect(providerError).toBeInstanceOf(AIProviderError);
      expect(providerError.message).toBe("[object Object]"); // Default string conversion
      expect(providerError.provider).toBe("Anthropic");
      expect(providerError.cause).toBe(nonErrorObj);
      expect(providerError.isRetryable).toBe(true);
    });

    it("should convert primitive values", () => {
      const providerError = fromProviderError("Simple error string", "OpenAI");

      expect(providerError).toBeInstanceOf(AIProviderError);
      expect(providerError.message).toBe("Simple error string");
      expect(providerError.provider).toBe("OpenAI");
      expect(providerError.cause).toBe("Simple error string");
      expect(providerError.isRetryable).toBe(false); // Default value
    });
  });
});