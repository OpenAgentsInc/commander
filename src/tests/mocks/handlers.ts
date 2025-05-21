import { http, HttpResponse } from "msw";
import type {
  OllamaChatCompletionRequest,
  OllamaChatCompletionResponse,
} from "../../services/ollama/OllamaService";

// Helper to get baseURL from config if you make it dynamic in tests
const getBaseUrl = (defaultUrl = "http://localhost:11434/v1") => {
  // In a real test setup, you might inject config or read it
  return defaultUrl;
};

export const handlers = [
  http.post(`${getBaseUrl()}/chat/completions`, async ({ request }) => {
    const body = (await request.json()) as OllamaChatCompletionRequest;

    if (body.model === "nonexistent-model") {
      return HttpResponse.json({ error: "Model not found" }, { status: 404 });
    }
    if (body.model === "server-error-model") {
      return HttpResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    if (body.model === "malformed-response-model") {
      return new HttpResponse("this is not json", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    if (body.model === "invalid-schema-model") {
      // Return structurally invalid JSON (missing required fields)
      return HttpResponse.json({
        id: `chatcmpl-${Date.now()}`,
        // Missing required 'object', 'created', and 'model' fields
        choices: [
          {
            // Missing required 'index' field
            message: {
              // Missing required 'role' field
              content: "This response is missing required schema fields",
            },
            // Missing required 'finish_reason' field
          },
        ],
      });
    }
    if (body.model === "network-error-model") {
      return HttpResponse.error();
    }

    // Happy path
    const response: OllamaChatCompletionResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model ?? "default-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: `Mock response for model ${body.model ?? "default-model"} to query: ${body.messages[body.messages.length - 1]?.content || "N/A"}`,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        // Optional
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
    return HttpResponse.json(response);
  }),
];
