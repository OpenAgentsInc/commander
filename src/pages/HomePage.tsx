import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { type OllamaChatCompletionRequest } from "@/services/ollama/OllamaService";

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
      stream: false
    };

    try {
      // Call the Ollama service through IPC
      const result = await window.electronAPI.ollama.generateChatCompletion(requestPayload);
      
      // Check if we received an error through IPC
      if (result && result.__error) {
        throw new Error(result.message || "Unknown error occurred");
      }
      
      if (result.choices && result.choices.length > 0) {
        setOllamaResponse(result.choices[0].message.content);
      } else {
        setOllamaResponse("No response choices found.");
      }
    } catch (caughtError: any) {
      console.error("Ollama API call failed", caughtError);
      setError(`Error: ${caughtError.message || "Unknown error occurred"}`);
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
