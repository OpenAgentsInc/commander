import { EventEmitter } from "events";
import { generateSecretKey, getPublicKey } from "@/utils/nostr";
import type { NIP90JobResult, NIP90JobFeedback } from "@/services/nip90";

export interface MockDVMConfig {
  streamingDelay?: number;
  chunkSize?: number;
  errorRate?: number;
  defaultResponse?: string;
}

export class MockDVM extends EventEmitter {
  private readonly privateKey: Uint8Array;
  public readonly publicKey: string;
  private readonly config: Required<MockDVMConfig>;
  private activeJobs: Map<string, NodeJS.Timeout>;

  constructor(config: MockDVMConfig = {}) {
    super();
    this.privateKey = generateSecretKey();
    this.publicKey = getPublicKey(this.privateKey);
    this.activeJobs = new Map();

    // Set default config values
    this.config = {
      streamingDelay: config.streamingDelay ?? 100,
      chunkSize: config.chunkSize ?? 10,
      errorRate: config.errorRate ?? 0,
      defaultResponse: config.defaultResponse ?? "This is a test response from the mock DVM.",
    };
  }

  public async handleJobRequest(
    jobId: string,
    input: string,
    isEncrypted: boolean = false
  ): Promise<void> {
    // Simulate random errors based on errorRate
    if (Math.random() < this.config.errorRate) {
      this.emitError(jobId, "Random error occurred");
      return;
    }

    // Generate response
    const response = this.generateResponse(input);

    // If not streaming, emit result directly
    if (this.config.streamingDelay <= 0) {
      this.emitResult(jobId, response);
      return;
    }

    // Stream response in chunks
    await this.streamResponse(jobId, response);
  }

  public cancelJob(jobId: string): void {
    const timeout = this.activeJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeJobs.delete(jobId);
      this.emitFeedback(jobId, "error", "Job cancelled");
    }
  }

  private generateResponse(input: string): string {
    // Simple response generation logic
    if (input.toLowerCase().includes("error")) {
      throw new Error("Requested error");
    }

    if (input.toLowerCase().includes("long")) {
      return "This is a longer response that will be streamed in multiple chunks. ".repeat(5);
    }

    return this.config.defaultResponse;
  }

  private async streamResponse(jobId: string, response: string): Promise<void> {
    const chunks = this.splitIntoChunks(response, this.config.chunkSize);
    let chunkIndex = 0;

    const sendNextChunk = () => {
      if (chunkIndex < chunks.length) {
        this.emitFeedback(jobId, "partial", chunks[chunkIndex]);
        chunkIndex++;

        const timeout = setTimeout(sendNextChunk, this.config.streamingDelay);
        this.activeJobs.set(jobId, timeout);
      } else {
        this.activeJobs.delete(jobId);
        this.emitResult(jobId, response);
      }
    };

    sendNextChunk();
  }

  private splitIntoChunks(text: string, size: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }

  private emitResult(jobId: string, content: string) {
    const result: NIP90JobResult = {
      id: jobId,
      kind: 6050,
      content,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      pubkey: this.publicKey,
      sig: "mock-sig",
    };
    this.emit("result", result);
  }

  private emitFeedback(jobId: string, status: "partial" | "error" | "success" | "processing" | "payment-required", content: string) {
    const feedback: NIP90JobFeedback = {
      id: jobId,
      kind: 7000,
      content,
      status,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      pubkey: this.publicKey,
      sig: "mock-sig",
    };
    this.emit("feedback", feedback);
  }

  private emitError(jobId: string, error: string) {
    this.emitFeedback(jobId, "error", error);
  }
}

export function createMockDVM(config?: MockDVMConfig): MockDVM {
  return new MockDVM(config);
}
