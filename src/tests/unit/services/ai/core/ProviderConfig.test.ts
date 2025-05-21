import { describe, it, expect } from "vitest";
import { Schema, Effect } from "effect";
import {
  BaseProviderConfigSchema,
  ApiKeyProviderConfigSchema,
  UrlProviderConfigSchema,
  OpenAICompatibleProviderConfigSchema,
  OllamaProviderConfigSchema,
  AnthropicProviderConfigSchema,
  ProviderConfigSchema,
  TypedProviderConfigSchema,
  type BaseProviderConfig,
  type ApiKeyProviderConfig,
  type UrlProviderConfig,
  type OpenAICompatibleProviderConfig,
  type OllamaProviderConfig,
  type AnthropicProviderConfig
} from "@/services/ai/core/ProviderConfig";

describe("ProviderConfig Schemas", () => {
  describe("BaseProviderConfigSchema", () => {
    it("should validate a valid base config", async () => {
      const config: BaseProviderConfig = { modelName: "model-x", isEnabled: true };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(BaseProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should fail if modelName is missing", async () => {
      const config = { isEnabled: true }; // modelName is missing
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(BaseProviderConfigSchema)(config)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should fail if isEnabled is missing", async () => {
      const config = { modelName: "model-x" }; // isEnabled is missing
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(BaseProviderConfigSchema)(config)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should fail with incorrect data types", async () => {
      const config = { modelName: 123, isEnabled: "true" }; // wrong types
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(BaseProviderConfigSchema)(config)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("ApiKeyProviderConfigSchema", () => {
    it("should validate a valid API key config", async () => {
      const config: ApiKeyProviderConfig = {
        modelName: "model-x",
        isEnabled: true,
        apiKey: "sk-12345"
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(ApiKeyProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should fail if apiKey is missing", async () => {
      const config = { modelName: "model-x", isEnabled: true }; // apiKey is missing
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(ApiKeyProviderConfigSchema)(config)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("UrlProviderConfigSchema", () => {
    it("should validate a valid URL config", async () => {
      const config: UrlProviderConfig = {
        modelName: "model-x",
        isEnabled: true,
        baseUrl: "http://localhost:11434"
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(UrlProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should fail if baseUrl is missing", async () => {
      const config = { modelName: "model-x", isEnabled: true }; // baseUrl is missing
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(UrlProviderConfigSchema)(config)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("OpenAICompatibleProviderConfigSchema", () => {
    it("should validate a valid OpenAI config with required fields", async () => {
      const config: OpenAICompatibleProviderConfig = {
        modelName: "gpt-4",
        isEnabled: true,
        apiKey: "sk-12345"
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(OpenAICompatibleProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should validate a valid OpenAI config with optional fields", async () => {
      const config: OpenAICompatibleProviderConfig = {
        modelName: "gpt-4",
        isEnabled: true,
        apiKey: "sk-12345",
        baseUrl: "https://api.openai.com/v1",
        temperature: 0.7,
        maxTokens: 2000
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(OpenAICompatibleProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should fail if required fields are missing", async () => {
      const config = {
        modelName: "gpt-4",
        isEnabled: true,
        // apiKey missing
      };
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(OpenAICompatibleProviderConfigSchema)(config)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("OllamaProviderConfigSchema", () => {
    it("should validate a valid Ollama config with required fields", async () => {
      const config: OllamaProviderConfig = {
        modelName: "llama3",
        isEnabled: true,
        baseUrl: "http://localhost:11434"
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(OllamaProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should validate a valid Ollama config with optional fields", async () => {
      const config: OllamaProviderConfig = {
        modelName: "llama3",
        isEnabled: true,
        baseUrl: "http://localhost:11434",
        temperature: 0.8,
        maxTokens: 1500
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(OllamaProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should fail if baseUrl is missing", async () => {
      const config = {
        modelName: "llama3",
        isEnabled: true,
        // baseUrl missing
      };
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(OllamaProviderConfigSchema)(config)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("AnthropicProviderConfigSchema", () => {
    it("should validate a valid Anthropic config with required fields", async () => {
      const config: AnthropicProviderConfig = {
        modelName: "claude-3-sonnet",
        isEnabled: true,
        apiKey: "sk-ant-12345"
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(AnthropicProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should validate a valid Anthropic config with optional fields", async () => {
      const config: AnthropicProviderConfig = {
        modelName: "claude-3-sonnet",
        isEnabled: true,
        apiKey: "sk-ant-12345",
        baseUrl: "https://api.anthropic.com",
        temperature: 0.7,
        maxTokens: 2000
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(AnthropicProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should fail if apiKey is missing", async () => {
      const config = {
        modelName: "claude-3-sonnet",
        isEnabled: true,
        // apiKey missing
      };
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(AnthropicProviderConfigSchema)(config)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("ProviderConfigSchema", () => {
    it("should validate an OpenAI config", async () => {
      const config: OpenAICompatibleProviderConfig = {
        modelName: "gpt-4",
        isEnabled: true,
        apiKey: "sk-12345"
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(ProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should validate an Ollama config", async () => {
      const config: OllamaProviderConfig = {
        modelName: "llama3",
        isEnabled: true,
        baseUrl: "http://localhost:11434"
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(ProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should validate an Anthropic config", async () => {
      const config: AnthropicProviderConfig = {
        modelName: "claude-3-sonnet",
        isEnabled: true,
        apiKey: "sk-ant-12345"
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(ProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });
  });

  describe("TypedProviderConfigSchema", () => {
    it("should validate a typed OpenAI config", async () => {
      const config = {
        type: "openai" as const,
        config: {
          modelName: "gpt-4",
          isEnabled: true,
          apiKey: "sk-12345"
        }
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(TypedProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should validate a typed Ollama config", async () => {
      const config = {
        type: "ollama" as const,
        config: {
          modelName: "llama3",
          isEnabled: true,
          baseUrl: "http://localhost:11434"
        }
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(TypedProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should validate a typed Anthropic config", async () => {
      const config = {
        type: "anthropic" as const,
        config: {
          modelName: "claude-3-sonnet",
          isEnabled: true,
          apiKey: "sk-ant-12345"
        }
      };
      const result = await Effect.runPromise(
        Schema.decodeUnknown(TypedProviderConfigSchema)(config)
      );
      expect(result).toEqual(config);
    });

    it("should fail with invalid type", async () => {
      const config = {
        type: "invalid" as const,
        config: {
          modelName: "model-x",
          isEnabled: true,
          apiKey: "sk-12345"
        }
      };
      try {
        await Effect.runPromise(
          Schema.decodeUnknown(TypedProviderConfigSchema)(config)
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});