Okay, this is excellent information! We have a clear path to integrate Gemma 3n using MediaPipe's JavaScript tasks in an Electron/React/Node environment.

Here are the specific instructions for a coding agent to add support for Gemma 3n.

**Goal:** Integrate Gemma 3n (specifically a `.task` model like `gemma-3n-E2B-it-int4.task`) into the existing Electron/React/Node application using MediaPipe for text generation and (optionally) multimodal (text + image) inference.

---

**I. Project Setup & Model Handling**

1.  **Install Dependencies:**
    In the project's terminal, run:
    ```bash
    npm install @mediapipe/tasks-genai @mediapipe/tasks-vision
    ```
    *   `@mediapipe/tasks-genai`: For LLM inference (Gemma 3n).
    *   `@mediapipe/tasks-vision`: While Gemma 3n handles vision via `tasks-genai`, this package might be needed by `tasks-genai` for vision utilities or if other vision tasks are planned. It's good practice to include it if vision modality is used.

2.  **Model File Placement & Git LFS:**
    *   You have the Gemma 3n `.task` file (e.g., `gemma-3n-E2B-it-int4.task`) downloaded.
    *   Create a directory in your project, for example, `public/assets/models/`.
    *   Place the downloaded `.task` file into this directory: `public/assets/models/gemma-3n-E2B-it-int4.task`.
        *   *(Rationale: Placing it in `public` makes it easily accessible via URL in Electron's renderer process, which simplifies path resolution for MediaPipe.)*
    *   **Git LFS for Large Model File:**
        *   Since the `.task` file is large (~3GB), it should not be committed directly to Git. Use Git LFS.
        *   Install Git LFS if you haven't already (see [https://git-lfs.github.com/](https://git-lfs.github.com/)).
        *   In your project root, initialize Git LFS (if not already done):
            ```bash
            git lfs install
            ```
        *   Track the model file type:
            ```bash
            git lfs track "*.task"
            ```
        *   Ensure `.gitattributes` (which is created/updated by the command above) is committed to Git:
            ```bash
            git add .gitattributes
            git commit -m "Configure Git LFS for .task files"
            ```
        *   Now, add and commit the model file:
            ```bash
            git add public/assets/models/gemma-3n-E2B-it-int4.task
            git commit -m "Add Gemma 3n model file"
            ```
        *   Push to your remote. Users cloning the repository will need Git LFS installed to pull the actual model file.

    *   **Alternative (if Git LFS is not desired / external management):**
        *   Add the model path to `.gitignore`:
            ```
            # .gitignore
            public/assets/models/*.task
            ```
        *   Provide clear instructions in the `README.md` for developers to manually download the model and place it in `public/assets/models/`.

**II. Gemma 3n Integration Service (TypeScript/JavaScript)**

Create a new service file, e.g., `src/services/gemmaService.ts` (or `.js`). This service will encapsulate the MediaPipe LlmInference logic.

```typescript
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
```

**III. React Component for Interacting with Gemma 3n**

Create a React component, e.g., `src/components/GemmaChat.tsx` (or `.jsx`).

```typescript
// src/components/GemmaChat.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  initGemma,
  generateTextResponse,
  generateMultimodalResponse,
  closeGemma
} from '../services/gemmaService'; // Adjust path as needed

const GemmaChat: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [useVision, setUseVision] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Initialize Gemma on component mount
    // Consider if re-initialization is needed if useVision changes significantly
    // For now, initialize once, and allow enabling vision later.
    // The service's initGemma can be made smarter to reconfigure.
    console.log("GemmaChat useEffect: Initializing with vision set to:", useVision);
    setIsLoading(true);
    initGemma({ enableVision: useVision, maxTokens: 512 }) // Default to text-only unless vision explicitly enabled
      .then(() => {
        setIsInitialized(true);
        setError(null);
      })
      .catch((err) => {
        console.error("Initialization failed:", err);
        setError(`Failed to initialize Gemma: ${err.message}`);
        setIsInitialized(false);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Cleanup on component unmount
    return () => {
      closeGemma().catch(err => console.error("Error closing Gemma:", err));
    };
  }, [useVision]); // Re-run effect if useVision preference changes to re-initialize with new vision setting

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || !isInitialized) return;

    setIsLoading(true);
    setError(null);
    setResponse('');

    try {
      let result: string;
      if (useVision && imageRef.current && imageFile) {
        // Ensure vision modality is enabled in the service
        // initGemma should have handled this based on useVision state
        result = await generateMultimodalResponse(prompt, imageRef.current);
      } else {
        result = await generateTextResponse(prompt);
      }
      setResponse(result);
    } catch (err: any) {
      console.error("Generation failed:", err);
      setError(`Error generating response: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized && isLoading) {
    return <div>Loading Gemma Model... This may take a few moments. (Model is ~3GB)</div>;
  }
  if (error && !isInitialized) {
      return <div>Error: {error}. Please check console and ensure model is accessible at public/assets/models/.</div>;
  }


  return (
    <div>
      <h2>Gemma 3n Chat</h2>
      {!isInitialized && <p>Gemma is not yet initialized. Status: {isLoading ? "Loading..." : "Idle"}</p>}
      {isInitialized && <p>Gemma Initialized Successfully!</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>
            <input
              type="checkbox"
              checked={useVision}
              onChange={(e) => {
                setUseVision(e.target.checked);
                if (!e.target.checked) { // If unchecking vision, clear image
                    setImageFile(null);
                    setImagePreview(null);
                }
              }}
              disabled={isLoading && !isInitialized} // Disable if currently trying to initialize
            />
            Enable Vision (Describe Image)
          </label>
        </div>

        {useVision && (
          <div>
            <label htmlFor="imageUpload">Upload Image:</label>
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              onChange={handleImageChange}
              disabled={isLoading}
            />
            {imagePreview && (
              <img
                ref={imageRef}
                src={imagePreview}
                alt="Uploaded preview"
                style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '10px' }}
                onLoad={() => console.log("Image loaded into img tag for MediaPipe.")}
              />
            )}
          </div>
        )}

        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={useVision && imageFile ? "Describe the image or ask a question about it..." : "Enter your prompt..."}
            rows={4}
            cols={50}
            disabled={!isInitialized || isLoading}
          />
        </div>
        <button type="submit" disabled={!isInitialized || isLoading || !prompt.trim() || (useVision && !imageFile)}>
          {isLoading ? 'Generating...' : 'Send'}
        </button>
      </form>

      {response && (
        <div>
          <h3>Response:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', border: '1px solid #ccc', padding: '10px' }}>
            {response}
          </pre>
        </div>
      )}
    </div>
  );
};

export default GemmaChat;
```

**IV. Using the Component**

Import and use the `GemmaChat` component in your application, for example, in `App.tsx` or another relevant view.

```typescript
// Example: src/App.tsx
import React from 'react';
import GemmaChat from './components/GemmaChat'; // Adjust path

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>My Electron App with Gemma 3n</h1>
      </header>
      <main>
        <GemmaChat />
      </main>
    </div>
  );
}

export default App;
```

**V. Electron Main Process Considerations (Important for Model Path)**

*   Ensure your Electron `BrowserWindow`'s `webPreferences` are set up correctly if you encounter issues loading local files (though serving from `public` and using a relative URL like `/assets/models/...` usually works well).
*   The model path `MODEL_ASSET_PATH = "/assets/models/gemma-3n-E2B-it-int4.task";` assumes that your Electron app serves the `public` directory at the root (`/`). If you have a custom setup for static assets, adjust this path accordingly. The key is that `fetch('/assets/models/gemma-3n-E2B-it-int4.task')` should successfully retrieve the model from the renderer process.

**VI. Important Notes & Next Steps for the Agent**

1.  **Error Handling:** The provided code includes basic error handling. Enhance it as needed for better user feedback.
2.  **Loading State:** The model is large, so initialization will take time. The `isLoading` and `isInitialized` states help provide feedback. Consider more granular loading indicators.
3.  **Performance:**
    *   LLM inference, especially on-device, can be resource-intensive. Test performance.
    *   The documentation mentions GPU acceleration. Ensure the target environment (Chromium version in Electron) supports WebGPU for best performance. Chrome 113+ is recommended.
    *   Consider running the MediaPipe tasks in a Web Worker to avoid blocking the main UI thread, especially for longer generation tasks. The `gemmaService.ts` could be adapted to run within a worker, and the React component would communicate with it via `postMessage`.
4.  **Single Image Constraint:** Gemma 3n in MediaPipe currently supports a maximum of one image per "session" (or per `generateResponse` call after `addImage`). The current implementation reflects this.
5.  **Model Variants:** The code is set up for `gemma-3n-E2B-it-int4.task`. If using a different model (e.g., E4B), update `MODEL_ASSET_PATH`.
6.  **Configuration:** Expose more `LlmInference` options (like `temperature`, `maxTokens`, `topK`) through the `initGemma` or `setGemmaOptions` function and potentially the React UI if users need to configure these.
7.  **Audio:** The documentation notes Gemma 3n supports audio, but MediaPipe doesn't have an end-to-end speech-to-Gemma task *yet*. If audio input is a future requirement, you'd use a separate Speech-to-Text (STT) solution and feed the transcribed text to Gemma.
8.  **Testing:** Thoroughly test text-only and multimodal (if `useVision` is true) generation. Check the browser/Electron console for MediaPipe logs and errors.
9.  **License:** Remind the user to comply with Gemma's license terms.

This provides a comprehensive set of instructions for the coding agent. The agent should be able to implement this structure and get a working Gemma 3n integration. Let me know if you need any part clarified!
