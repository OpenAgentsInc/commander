import { describe, it, expect } from "vitest";
import { Schema } from "effect";
import {
  BaseProviderConfigSchema,
  ApiKeyProviderConfigSchema,
  UrlProviderConfigSchema,
  OpenAICompatibleProviderConfigSchema,
  OllamaProviderConfigSchema,
  AnthropicProviderConfigSchema,
  ProviderConfigSchema,
  TypedProviderConfigSchema
} from "@/services/ai/core/ProviderConfig";

describe("ProviderConfig Schemas", () => {
  describe("BaseProviderConfigSchema", () => {
    it("should validate a valid base config", () => {
      const config = { modelName: "model-x", isEnabled: true };
      const result = Schema.decode(BaseProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
      
      if (result._tag === "Right") {
        expect(result.right).toEqual(config);
      }
    });

    it("should fail if modelName is missing", () => {
      const config = { isEnabled: true }; // modelName is missing
      const result = Schema.decode(BaseProviderConfigSchema)(config);
      expect(result._tag).toBe("Left");
    });

    it("should fail if isEnabled is missing", () => {
      const config = { modelName: "model-x" }; // isEnabled is missing
      const result = Schema.decode(BaseProviderConfigSchema)(config);
      expect(result._tag).toBe("Left");
    });

    it("should fail with incorrect data types", () => {
      const config = { modelName: 123, isEnabled: "true" }; // wrong types
      const result = Schema.decode(BaseProviderConfigSchema)(config);
      expect(result._tag).toBe("Left");
    });
  });

  describe("ApiKeyProviderConfigSchema", () => {
    it("should validate a valid API key config", () => {
      const config = {
        modelName: "model-x",
        isEnabled: true,
        apiKey: "sk-12345"
      };
      const result = Schema.decode(ApiKeyProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
      
      if (result._tag === "Right") {
        expect(result.right).toEqual(config);
      }
    });

    it("should fail if apiKey is missing", () => {
      const config = { modelName: "model-x", isEnabled: true }; // apiKey is missing
      const result = Schema.decode(ApiKeyProviderConfigSchema)(config);
      expect(result._tag).toBe("Left");
    });
  });

  describe("UrlProviderConfigSchema", () => {
    it("should validate a valid URL config", () => {
      const config = {
        modelName: "model-x",
        isEnabled: true,
        baseUrl: "http://localhost:11434"
      };
      const result = Schema.decode(UrlProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
      
      if (result._tag === "Right") {
        expect(result.right).toEqual(config);
      }
    });

    it("should fail if baseUrl is missing", () => {
      const config = { modelName: "model-x", isEnabled: true }; // baseUrl is missing
      const result = Schema.decode(UrlProviderConfigSchema)(config);
      expect(result._tag).toBe("Left");
    });
  });

  describe("OpenAICompatibleProviderConfigSchema", () => {
    it("should validate a valid OpenAI config with required fields", () => {
      const config = {
        modelName: "gpt-4",
        isEnabled: true,
        apiKey: "sk-12345"
      };
      const result = Schema.decode(OpenAICompatibleProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
    });

    it("should validate a valid OpenAI config with optional fields", () => {
      const config = {
        modelName: "gpt-4",
        isEnabled: true,
        apiKey: "sk-12345",
        baseUrl: "https://api.openai.com/v1",
        temperature: 0.7,
        maxTokens: 2000
      };
      const result = Schema.decode(OpenAICompatibleProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
      
      if (result._tag === "Right") {
        expect(result.right).toEqual(config);
      }
    });

    it("should fail if required fields are missing", () => {
      const config = {
        modelName: "gpt-4",
        isEnabled: true,
        // apiKey missing
      };
      const result = Schema.decode(OpenAICompatibleProviderConfigSchema)(config);
      expect(result._tag).toBe("Left");
    });
  });

  describe("OllamaProviderConfigSchema", () => {
    it("should validate a valid Ollama config with required fields", () => {
      const config = {
        modelName: "llama3",
        isEnabled: true,
        baseUrl: "http://localhost:11434"
      };
      const result = Schema.decode(OllamaProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
    });

    it("should validate a valid Ollama config with optional fields", () => {
      const config = {
        modelName: "llama3",
        isEnabled: true,
        baseUrl: "http://localhost:11434",
        temperature: 0.8,
        maxTokens: 1500
      };
      const result = Schema.decode(OllamaProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
      
      if (result._tag === "Right") {
        expect(result.right).toEqual(config);
      }
    });

    it("should fail if baseUrl is missing", () => {
      const config = {
        modelName: "llama3",
        isEnabled: true,
        // baseUrl missing
      };
      const result = Schema.decode(OllamaProviderConfigSchema)(config);
      expect(result._tag).toBe("Left");
    });
  });

  describe("AnthropicProviderConfigSchema", () => {
    it("should validate a valid Anthropic config with required fields", () => {
      const config = {
        modelName: "claude-3-sonnet",
        isEnabled: true,
        apiKey: "sk-ant-12345"
      };
      const result = Schema.decode(AnthropicProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
    });

    it("should validate a valid Anthropic config with optional fields", () => {
      const config = {
        modelName: "claude-3-sonnet",
        isEnabled: true,
        apiKey: "sk-ant-12345",
        baseUrl: "https://api.anthropic.com",
        temperature: 0.7,
        maxTokens: 2000
      };
      const result = Schema.decode(AnthropicProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
      
      if (result._tag === "Right") {
        expect(result.right).toEqual(config);
      }
    });

    it("should fail if apiKey is missing", () => {
      const config = {
        modelName: "claude-3-sonnet",
        isEnabled: true,
        // apiKey missing
      };
      const result = Schema.decode(AnthropicProviderConfigSchema)(config);
      expect(result._tag).toBe("Left");
    });
  });

  describe("ProviderConfigSchema", () => {
    it("should validate an OpenAI config", () => {
      const config = {
        modelName: "gpt-4",
        isEnabled: true,
        apiKey: "sk-12345"
      };
      const result = Schema.decode(ProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
    });

    it("should validate an Ollama config", () => {
      const config = {
        modelName: "llama3",
        isEnabled: true,
        baseUrl: "http://localhost:11434"
      };
      const result = Schema.decode(ProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
    });

    it("should validate an Anthropic config", () => {
      const config = {
        modelName: "claude-3-sonnet",
        isEnabled: true,
        apiKey: "sk-ant-12345"
      };
      const result = Schema.decode(ProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
    });
  });

  describe("TypedProviderConfigSchema", () => {
    it("should validate a typed OpenAI config", () => {
      const config = {
        type: "openai" as const,
        config: {
          modelName: "gpt-4",
          isEnabled: true,
          apiKey: "sk-12345"
        }
      };
      const result = Schema.decode(TypedProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
      
      if (result._tag === "Right") {
        expect(result.right).toEqual(config);
      }
    });

    it("should validate a typed Ollama config", () => {
      const config = {
        type: "ollama" as const,
        config: {
          modelName: "llama3",
          isEnabled: true,
          baseUrl: "http://localhost:11434"
        }
      };
      const result = Schema.decode(TypedProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
      
      if (result._tag === "Right") {
        expect(result.right).toEqual(config);
      }
    });

    it("should validate a typed Anthropic config", () => {
      const config = {
        type: "anthropic" as const,
        config: {
          modelName: "claude-3-sonnet",
          isEnabled: true,
          apiKey: "sk-ant-12345"
        }
      };
      const result = Schema.decode(TypedProviderConfigSchema)(config);
      expect(result._tag).toBe("Right");
      
      if (result._tag === "Right") {
        expect(result.right).toEqual(config);
      }
    });

    it("should fail with invalid type", () => {
      const config = {
        type: "invalid" as const,
        config: {
          modelName: "model-x",
          isEnabled: true,
          apiKey: "sk-12345"
        }
      };
      const result = Schema.decode(TypedProviderConfigSchema)(config);
      expect(result._tag).toBe("Left");
    });
  });
});