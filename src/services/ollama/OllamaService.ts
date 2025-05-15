import { Effect } from "effect";

// --- Configuration Type ---
export interface OllamaServiceConfig {
    baseURL: string;
    defaultModel: string;
}

// --- API Request/Response Types ---
export type OllamaMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type OllamaChatCompletionRequest = {
    model?: string;
    messages: OllamaMessage[];
    stream?: boolean;
};

export type OllamaChatCompletionChoice = {
    index: number;
    message: OllamaMessage;
    finish_reason: string;
};

export type OllamaChatCompletionUsage = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
};

export type OllamaChatCompletionResponse = {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: OllamaChatCompletionChoice[];
    usage?: OllamaChatCompletionUsage;
};

// --- Custom Error Types ---
export class OllamaError extends Error {
    constructor(message: string, readonly cause?: unknown) {
        super(message);
        this.name = "OllamaError";
    }
}

export class OllamaHttpError extends OllamaError {
    constructor(
        message: string, 
        readonly request: unknown, 
        readonly response: unknown
    ) {
        super(message);
        this.name = "OllamaHttpError";
    }
}

export class OllamaParseError extends OllamaError {
    constructor(
        message: string, 
        readonly data: unknown
    ) {
        super(message);
        this.name = "OllamaParseError";
    }
}

// --- OllamaService Interface ---
export interface OllamaService {
    generateChatCompletion(
        request: OllamaChatCompletionRequest
    ): Effect.Effect<OllamaChatCompletionResponse, OllamaHttpError | OllamaParseError, never>;
}