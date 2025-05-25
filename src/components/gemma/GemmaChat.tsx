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
