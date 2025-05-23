// Debug test to reproduce the runtime issue
import { Effect, Layer, Stream } from "effect";
import { getMainRuntime } from "./src/services/runtime";
import { AgentLanguageModel } from "./src/services/ai/core";

// Reproduce the exact same call pattern as useAgentChat
const debugTest = Effect.gen(function* (_) {
  console.log("Getting AgentLanguageModel from runtime...");
  const agentLM = yield* _(AgentLanguageModel.Tag);
  console.log("Got AgentLanguageModel:", agentLM);
  
  console.log("Calling generateText...");
  const response = yield* _(agentLM.generateText({
    prompt: JSON.stringify({
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: "Hello" }
      ]
    })
  }));
  
  console.log("Response:", response);
  return response;
});

async function runDebugTest() {
  try {
    console.log("Initializing runtime...");
    const { initializeMainRuntime } = await import("./src/services/runtime");
    await initializeMainRuntime();
    
    console.log("Getting runtime...");
    const runtime = getMainRuntime();
    
    console.log("Running debug test...");
    const result = await Effect.runPromise(
      debugTest.pipe(Effect.provide(runtime))
    );
    
    console.log("Debug test completed successfully:", result);
  } catch (error) {
    console.error("Debug test failed:", error);
    
    if (error instanceof Error && error.message.includes("Service not found: @effect/ai-openai/OpenAiLanguageModel/Config")) {
      console.error("CONFIRMED: This is the exact runtime error we're trying to fix!");
    }
  }
}

runDebugTest();