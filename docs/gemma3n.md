Gemma 3n Capabilities

Gemma 3n is Google’s newest lightweight generative AI model designed for on-device use. It builds on the Gemini research with innovations (MatFormer architecture, Per-Layer Embeddings, mix‑and‑match layers) to minimize compute and memory. Critically, Gemma 3n is multimodal: it handles text, images, and audio as inputs and produces text outputs. For example, Google notes that Gemma 3n “can understand and process audio, text, and images” and even video, with high‑quality speech‐to‐text and translation ￼ ￼. It supports long context (32K tokens), over 140 languages, and is instruction-tuned with open weights (licensed for responsible use) ￼ ￼. In short, Gemma 3n can be used for text generation, question-answering, summarization, or image analysis on-device, all under an Apache‑style license.

MediaPipe Support for Gemma 3n

Google’s MediaPipe Tasks LLM Inference API enables running LLMs like Gemma locally. It provides Java, Swift, and JavaScript libraries (@mediapipe/tasks-genai) that load a model bundle and perform text‐generation or multimodal inference on-device. In the MediaPipe LLM Inference documentation, Google explicitly lists “MediaPipe-compatible variants” of Gemma 3n: the 2B and 4B effective-parameter models (Gemma‑3n E2B and E4B) are available via HuggingFace ￼. These models come as bundled .task files (TensorFlow Lite model + tokenizer) ready for MediaPipe; for example, the Gemma-3 1B model is distributed on HF as a .task usable directly in MediaPipe ￼. In practice, to use Gemma 3n, you download (or convert) a Litert model and pass its path to the LlmInference task.

By default, MediaPipe’s LLM Inference handles text-only prompts. However, Gemma 3n’s multimodal capabilities can be leveraged by enabling vision inputs. In Android/Java, one sets graphOptions.setEnableVisionModality(true) and adds an image to the inference session. Google’s example shows converting an image to MPImage and doing:

LlmInferenceSession session = LlmInferenceSession.createFromOptions(llmInference, sessionOptions);
session.addQueryChunk("Describe the objects in the image.");
session.addImage(mpImage);
String result = session.generateResponse();

They note that “Gemma‑3n accepts a maximum of one image per session” ￼ ￼. In the JavaScript/Web API (via @mediapipe/tasks-genai), the procedure is analogous: you create a FilesetResolver and LlmInference object, then use methods like .generateResponse() (and potentially an .addImage()-style function if supported) to include images.

Weights and Formats

Google provides Gemma 3n preview weights via Hugging Face in a MediaPipe-compatible LiteRT (.task) format. For example, the Gemma-3n-E2B-it-int4.task file (~3.1 GB) bundles a quantized 2B effective-parameter model ￼. These .task files include the model and tokenizer and can be loaded directly by MediaPipe tasks. There is no official GGUF or safetensors release of Gemma 3n yet – the primary distribution is via MediaPipe Litert/FlatBuffers. (In the future, one could use MediaPipe’s AI Edge Torch tools to convert other formats into .tflite/.task if needed ￼.)

Gemma 3n’s license allows commercial use, and Google points to these as “open weights” ￼. Note the models are large: even the “2B effective” E2B model is ~3 GB on disk, so expect a similar multi-GB footprint for E4B or full (see Google’s preview notes and community comments) ￼. For MediaPipe’s LLM Inference task, you place the downloaded .task model in your app’s files (or serve via URL) and give its path to the API.

MediaPipe/Gemma 3n in Electron/Node

To use Gemma 3n on a desktop via Electron (which is essentially a Chromium browser with Node), you leverage MediaPipe’s JavaScript Tasks libraries. In your project (with React/EffectTS and Node), install the necessary NPM packages:

npm install @mediapipe/tasks-genai @mediapipe/tasks-vision

The core is @mediapipe/tasks-genai (the LLM Inference API) ￼. In your app code, you load the WASM and model with something like:

import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai';

// Load MediaPipe WASM and model
const wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm";
const genaiFileset = await FilesetResolver.forGenAiTasks(wasmPath);
const llm = await LlmInference.createFromModelPath(genaiFileset, "assets/gemma-3n-E2B-it-int4.task");

// Now run inference
const response = await llm.generateResponse("Hello, Gemma 3n!");
console.log(response);

This code example mirrors Google’s own snippet: they use FilesetResolver.forGenAiTasks(...) then LlmInference.createFromModelPath(...) and .generateResponse(...) ￼. In React, do this inside a useEffect or similar so it runs once (and possibly inside a Web Worker to avoid blocking the UI). Because MediaPipe inference is GPU-accelerated, it runs off the main thread, but loading the model may take time ￼ ￼.

If you want to include images (vision prompts), you must enable vision mode in options. In JavaScript, that involves passing enableVisionModality: true in the options (analogous to the Android GraphOptions). Then, before calling generateResponse(), add an image. (In Android it’s session.addImage(mpImage) ￼; in JS you would use the LlmInference.addImage() method on the instance with an HTML <img> or HTMLCanvasElement.) For example:

// (After creating llm as above)
llm.setOptions({ enableVisionModality: true, maxNumImages: 1 });
await llm.addImage(document.getElementById("inputImage"));
const multimodalResponse = await llm.generateResponse("Describe this image");

(The exact JS method names may vary by MediaPipe version, but the principle is to turn on vision mode and supply one image.)

Step-by-Step Setup
	1.	Install MediaPipe Tasks: In your Electron/React project, run:

npm install @mediapipe/tasks-genai @mediapipe/tasks-vision

This brings in the JS libraries for LLM inference and vision.
(You may also add @mediapipe/tasks-audio if you plan to do audio processing.)

	2.	Download Gemma 3n Model: Accept Google’s license on Hugging Face and download the .task file for Gemma 3n E2B or E4B (e.g. gemma-3n-E2B-it-int4.task) ￼. Put it in your app’s assets or load it via URL.
	3.	Load the Model in Code: Use the FilesetResolver to prepare the WASM, then create an LLM Inference instance. Example (with async/await in a React effect):

import { FilesetResolver, LlmInference } from '@mediapipe/tasks-genai';

async function initGemma() {
  // Prepare MediaPipe WASM (this is Google’s CDN path for tasks-genai)
  const genai = await FilesetResolver.forGenAiTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm"
  );
  // Load Gemma 3n model (local or hosted path)
  const llm = await LlmInference.createFromModelPath(genai, "/path/to/gemma-3n-E2B-it-int4.task");
  return llm;
}

// In React, e.g.:
useEffect(() => {
  initGemma().then(llm => {
    // Gemma is ready to use
    llm.generateResponse("Hello, Gemma!").then(console.log);
  });
}, []);

This follows Google’s example code exactly ￼.

	4.	Generate Text: Once the model is loaded, call llmInference.generateResponse(prompt) to get text output. You can configure maxTokens, temperature, etc. through options when creating the task.
	5.	Enable Multimodal (Optional): If you want image input, set enableVisionModality: true and maxNumImages: 1 in the options (see Google’s guide ￼ ￼). Then use llm.addImage() (or similar) before generating the response.
	6.	Platform/Hardware: Ensure your Electron app runs on a WebGPU-capable Chromium engine. MediaPipe’s LLM task requires GPU support (Chrome 113+ or Safari 16+, etc. ￼). The model is large: the 2B‐effective Gemma 3n uses several gigabytes of RAM/storage, so test on machines with >=8–16 GB RAM. On GPUs it will be faster; on CPU it may be slow.

Other Modalities
	•	Vision: While Gemma 3n can process images, in MediaPipe you typically feed an image via the LLM task as above. For pure vision tasks (e.g. object detection), use @mediapipe/tasks-vision (ImageClassifier, ObjectDetector). But to leverage Gemma’s image understanding, include the image in the LLM prompt.
	•	Audio: Gemma 3n supports speech transcription and translation, but MediaPipe does not yet have a built-in end-to-end speech-to-text LLM task. In practice, you’d use a speech recognition model (e.g. MediaPipe’s audio classifiers or an external ASR) to get text, then feed that text to Gemma 3n. Full audio‐to‐Gemma inference will likely be supported in future releases (Gemma 3n’s preview notes mention “coming soon” for full multimodal) ￼.

Summary: Gemma 3n is a powerful on-device multimodal LLM with open weights. You can run it locally in your Electron + React + Node app by using MediaPipe’s GenAI Tasks. Download the LiteRT .task model, install @mediapipe/tasks-genai, load the model with LlmInference.createFromModelPath, and call .generateResponse() on your text prompts. With this setup, you can do 100% local inference with Gemma 3n (no cloud) for text generation or combined text+image prompts.

Sources: Official Google AI/DeepMind documentation on Gemma 3n and MediaPipe LLM Inference ￼ ￼ ￼ ￼ ￼ ￼, and Hugging Face model cards ￼. These cover Gemma 3n’s capabilities, licensing, available formats, and MediaPipe integration.
