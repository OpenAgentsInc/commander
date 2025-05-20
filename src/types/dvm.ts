// src/types/dvm.ts

export type JobStatus = 'pending_payment' | 'processing' | 'paid' | 'completed' | 'error' | 'cancelled';

export interface JobHistoryEntry {
  id: string; // Unique ID for the history entry (e.g., could be derived from jobRequestEventId or a UUID)
  timestamp: number; // Unix timestamp of when the job request was received or processed
  jobRequestEventId: string; // ID of the original NIP-90 job request event (kind 5xxx)
  requesterPubkey: string; // Pubkey of the user who requested the job
  kind: number; // Original job kind (e.g., 5100)
  inputSummary: string; // A brief summary of the job input (e.g., first 50 chars of a prompt)
  status: JobStatus;
  ollamaModelUsed?: string; // Model used for processing
  tokensProcessed?: number; // If applicable, e.g., for text generation
  invoiceAmountSats?: number; // Amount in sats requested
  paymentReceivedSats?: number; // Amount in sats actually received (for future payment verification)
  resultSummary?: string; // Brief summary of the result or "N/A"
  errorDetails?: string; // If status is 'error', details of the error
}

export interface JobStatistics {
  totalJobsProcessed: number;
  totalSuccessfulJobs: number;
  totalFailedJobs: number;
  totalRevenueSats: number; // Sum of `paymentReceivedSats` for paid/completed jobs
  jobsPendingPayment: number;
  averageProcessingTimeMs?: number; // Optional: For future calculation
  modelUsageCounts?: Record<string, number>; // e.g., { "gemma2:latest": 50, "llama3": 20 }
}