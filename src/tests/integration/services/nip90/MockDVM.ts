import { generatePrivateKey, getPublicKey } from "nostr-tools/pure";
import type { NIP90JobResult, NIP90JobFeedback } from "@/services/nip90";
import { EventEmitter } from "events";

export interface MockDVMConfig {
  streamingDelay?: number;
  chunkSize?: number;
  errorRate?: number;
  defaultResponse?: string;
}

export class MockDVM extends EventEmitter {
  private readonly privateKey: string;
  public readonly publicKey: string;
  private readonly config: Required<MockDVMConfig>;
  private activeJobs: Map<string, NodeJS.Timeout>;

  constructor(config: MockDVMConfig = {}) {
    super();
    this.privateKey = generatePrivateKey();
    this.publicKey = getPublicKey(this.privateKey);
    this.config = {
      streamingDelay: config.streamingDelay ?? 100,
      chunkSize: config.chunkSize ?? 10,
      errorRate: config.errorRate ?? 0,
      defaultResponse: config.defaultResponse ?? "This is a mock DVM response.",
    };
    this.activeJobs = new Map();
  }

  public async handleJobRequest(
    jobId: string,
    input: string,
    isEncrypted: boolean = false
  ): Promise<void> {
    // Simulate random errors based on errorRate
    if (Math.random() < this.config.errorRate) {
      this.emitError(jobId, "Random DVM error occurred");
      return;
    }

    if (isEncrypted) {
      console.log(`[MockDVM] Received encrypted job ${jobId}`);
      // In a real implementation, we would decrypt the input here
    }

    // For testing, we'll generate a response based on the input
    const response = this.generateResponse(input);

    if (this.config.streamingDelay > 0) {
      // Simulate streaming response
      await this.streamResponse(jobId, response);
    } else {
      // Send immediate response
      this.emitResult(jobId, response);
    }
  }

  public cancelJob(jobId: string): void {
    const timeout = this.activeJobs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeJobs.delete(jobId);
      this.emitFeedback(jobId, "cancelled", "Job cancelled by client");
    }
  }

  private generateResponse(input: string): string {
    // Simple response generation - in reality, this would be more sophisticated
    if (input.toLowerCase().includes("error")) {
      throw new Error("Requested error simulation");
    }

    if (input.toLowerCase().includes("hello")) {
      return "Hello! I am a mock DVM. How can I help you today?";
    }

    if (input.toLowerCase().includes("test")) {
      return "This is a test response from the mock DVM.";
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
      kind: 5050,
      content,
    };
    this.emit("result", result);
  }

  private emitFeedback(jobId: string, status: string, content: string) {
    const feedback: NIP90JobFeedback = {
      id: jobId,
      status,
      content,
    };
    this.emit("feedback", feedback);
  }

  private emitError(jobId: string, error: string) {
    this.emitFeedback(jobId, "error", error);
  }
}

// Helper to create a configured mock DVM instance
export function createMockDVM(config?: MockDVMConfig): MockDVM {
  return new MockDVM(config);
}
