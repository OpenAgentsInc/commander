// src/services/gemmaService.ts
import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai';

// --- Configuration ---
const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm";
// Adjust MODEL_ASSET_PATH if your model is located elsewhere or has a different name.
// This path assumes the model is served from the 'public' directory.
const MODEL_ASSET_PATH = "/assets/models/gemma-3n-E2B-it-int4.task"; // Or your specific model file

let llmInference: LlmInference | null = null;
let visionEnabled = false;

interface GemmaOptions {
  enableVision?: boolean;
  // Add other LlmInference options as needed (maxTokens, temperature, etc.)
  // Refer to MediaPipe documentation for available options.
  maxTokens?: number;
  temperature?: number;
  topK?: number;
}

/**
 * Initializes the Gemma 3n LlmInference engine.
 * Must be called before any generation methods.
 * @param options Optional configuration for Gemma.
 */
export async function initGemma(options?: GemmaOptions): Promise<void> {
  if (llmInference) {
    console.log("Gemma already initialized.");
    // If options change, we might need to re-initialize or update options
    // For now, simple re-init if vision flag changes
    if (options?.enableVision !== undefined && visionEnabled !== options.enableVision) {
      llmInference.close(); // Close existing instance
      llmInference = null; // Allow re-initialization
    } else {
      return;
    }
  }

  try {
    console.log("Initializing Gemma 3n...");
    const filesetResolver = await FilesetResolver.forGenAiTasks(WASM_PATH);

    const llmOptions: LlmInference.LlmInferenceOptions = {
      baseOptions: {
        modelAssetPath: MODEL_ASSET_PATH,
      },
      // Apply other default options if any
      maxTokens: options?.maxTokens || 1024, // Default max tokens
      temperature: options?.temperature || 0.7, // Default temperature
      topK: options?.topK || 40, // Default topK
    };

    if (options?.enableVision) {
      // According to docs, vision modality needs to be enabled here or via setOptions
      // LlmInference.createFromOptions might be better for initial setup
      // For now, let's stick to createFromModelPath and then setOptions for vision
      visionEnabled = true;
    }

    llmInference = await LlmInference.createFromModelPath(filesetResolver, MODEL_ASSET_PATH);
    console.log("Gemma 3n LlmInference engine created.");

    if (visionEnabled) {
      await llmInference.setOptions({ enableVisionModality: true, maxNumImages: 1 });
      console.log("Vision modality enabled for Gemma.");
    } else {
      await llmInference.setOptions({ enableVisionModality: false });
      console.log("Vision modality disabled for Gemma.");
    }


  } catch (error) {
    console.error("Error initializing Gemma 3n:", error);
    llmInference = null; // Ensure it's null on failure
    throw error; // Re-throw for UI to handle
  }
}

/**
 * Generates a text response from Gemma 3n based on a prompt.
 * @param prompt The text prompt.
 * @returns The generated text response.
 */
export async function generateTextResponse(prompt: string): Promise<string> {
  if (!llmInference) {
    throw new Error("Gemma 3n not initialized. Call initGemma() first.");
  }
  if (visionEnabled) {
    console.warn("Generating text response while vision modality might be enabled. If an image was added, it might be used.");
  }

  try {
    console.log("Generating text response for prompt:", prompt);
    const result = await llmInference.generateResponse(prompt);
    console.log("Gemma response:", result);
    return result;
  } catch (error) {
    console.error("Error generating text response:", error);
    throw error;
  }
}

/**
 * Generates a text response from Gemma 3n based on a prompt and an image.
 * Requires initGemma({ enableVision: true }) to be called first.
 * @param prompt The text prompt (e.g., "Describe this image.").
 * @param imageElement The HTMLImageElement or HTMLCanvasElement containing the image.
 * @returns The generated text response.
 */
export async function generateMultimodalResponse(
  prompt: string,
  imageElement: HTMLImageElement | HTMLCanvasElement
): Promise<string> {
  if (!llmInference) {
    throw new Error("Gemma 3n not initialized. Call initGemma() first.");
  }
  if (!visionEnabled) {
    throw new Error(
      "Vision modality not enabled. Call initGemma({ enableVision: true }) and ensure it completed successfully."
    );
  }

  try {
    console.log("Generating multimodal response for prompt:", prompt);
    // The docs suggest addImage is on the LlmInference instance, not session.
    // Max 1 image. If multiple calls are made, clear previous images or ensure API handles it.
    // MediaPipe's LlmInference for JS implies it handles one image internally.
    // Re-adding an image likely replaces the previous one if the API is designed sanely.
    // Or, perhaps addImage should only be called once per "session" concept.
    // For simplicity, let's assume addImage can be called before each multimodal generateResponse.

    // Clear previous image state if necessary. The API might do this automatically,
    // or we might need to recreate the session/task for a new image.
    // The provided documentation doesn't specify how to clear images.
    // Let's assume `addImage` effectively sets the image for the next `generateResponse` call.
    // "Gemma-3n accepts a maximum of one image per session" - this implies `addImage` sets THE image.

    await llmInference.addImage(imageElement);
    console.log("Image added for multimodal generation.");

    const result = await llmInference.generateResponse(prompt);
    console.log("Gemma multimodal response:", result);
    return result;
  } catch (error) {
    console.error("Error generating multimodal response:", error);
    throw error;
  }
}

/**
 * Optional: Function to explicitly set LlmInference options after initialization.
 * @param options Options to set.
 */
export async function setGemmaOptions(options: LlmInference.LlmInferenceOptions) {
  if (!llmInference) {
    throw new Error("Gemma 3n not initialized. Call initGemma() first.");
  }
  await llmInference.setOptions(options);
  if (options.enableVisionModality !== undefined) {
    visionEnabled = options.enableVisionModality;
  }
  console.log("Gemma options updated.");
}

/**
 * Closes the LlmInference engine and releases resources.
 */
export async function closeGemma(): Promise<void> {
  if (llmInference) {
    await llmInference.close();
    llmInference = null;
    visionEnabled = false;
    console.log("Gemma LlmInference engine closed.");
  }
}
