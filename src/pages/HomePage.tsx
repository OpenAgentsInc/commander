import React, { useState } from "react";
import { Effect, Layer, Cause } from "effect";
import { Button } from "@/components/ui/button";
import { 
  OllamaService, 
  type OllamaChatCompletionRequest, 
  type OllamaChatCompletionResponse, 
  OllamaHttpError, 
  OllamaParseError,
  UiOllamaConfigLive 
} from "@/services/ollama/OllamaService";
import { OllamaServiceLive } from '@/services/ollama/OllamaServiceImpl';
import { HttpClient } from "@effect/platform/HttpClient";

// Define a browser-compatible HttpClient layer using the default fetch implementation
const fetchHttpClientLayer = Layer.succeed(HttpClient, HttpClient.fetch);

// Define a Layer for the UI that combines OllamaServiceLive with its dependencies
const uiOllamaServiceLayer = Layer.provide(
  OllamaServiceLive,
  Layer.merge(UiOllamaConfigLive, fetchHttpClientLayer)
);

export default function HomePage() {
  const [ollamaResponse, setOllamaResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCallOllama = async () => {
    setIsLoading(true);
    setError(null);
    setOllamaResponse(null);

    const requestPayload: OllamaChatCompletionRequest = {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello world!" }
      ],
      stream: false // Adding the required stream property
    };

    const program = Effect.gen(function*(_) {
      const ollama = yield* _(OllamaService);
      return yield* _(ollama.generateChatCompletion(requestPayload as unknown));
    }).pipe(Effect.provide(uiOllamaServiceLayer));

    try {
      const result = await Effect.runPromise(program);
      if (result.choices && result.choices.length > 0) {
        setOllamaResponse(result.choices[0].message.content);
      } else {
        setOllamaResponse("No response choices found.");
      }
    } catch (caughtError: any) {
      console.error("Ollama API call failed", caughtError);
      // Check if it's one of our custom errors directly
      if (caughtError instanceof OllamaHttpError || caughtError instanceof OllamaParseError) {
        setError(`Service Error (${caughtError._tag}): ${caughtError.message}`);
      } else if (caughtError instanceof Error) {
        setError(`Generic Error: ${caughtError.message}`);
      } else {
        setError("An unknown error occurred. Check console.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <span>
          <h1 className="font-mono text-4xl font-bold">OpenAgents</h1>
          <p className="text-center text-lg uppercase text-muted-foreground" data-testid="pageTitle">
            Commander
          </p>
        </span>
        
        <div className="mt-4">
          <Button onClick={handleCallOllama} disabled={isLoading}>
            {isLoading ? "Calling Ollama..." : "Call Ollama (gemma3: Hello world!)"}
          </Button>
        </div>

        {ollamaResponse && (
          <div className="mt-4 p-4 border rounded bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold">Ollama Response:</h3>
            <pre className="whitespace-pre-wrap">{ollamaResponse}</pre>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 border rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
            <h3 className="font-semibold">Error:</h3>
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
