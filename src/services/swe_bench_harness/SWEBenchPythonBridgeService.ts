import { Context, Effect, Layer, Stream, Chunk, Data } from "effect";

export interface SWEBenchPrediction {
  instance_id: string;
  model_name_or_path: string;
  model_patch: string;
}

export interface EvaluationOptions {
  dataset_name?: string;
  max_workers?: number;
  timeout?: number;
  cache_level?: string;
  run_id?: string;
  instance_ids?: string[];
  namespace?: string;
}

export interface EvaluationProgress {
  type: "status" | "progress" | "complete" | "error";
  timestamp?: number;
  data: any;
}

export interface EvaluationSummary {
  total_instances: number;
  evaluated: number;
  resolved: number;
  success_rate: number;
  percentage_complete: number;
}

export interface EvaluationComplete {
  run_id: string;
  results: Record<string, any>;
  summary: EvaluationSummary;
}

export class PythonBridgeError extends Data.TaggedError("PythonBridgeError")<{
  message: string;
  cause?: unknown;
}> {}

export class SWEBenchPythonBridgeService extends Context.Tag("SWEBenchPythonBridgeService")<
  SWEBenchPythonBridgeService,
  {
    readonly initialize: () => Effect.Effect<void, PythonBridgeError>;
    readonly runEvaluation: (
      predictions: SWEBenchPrediction[],
      options?: EvaluationOptions
    ) => Stream.Stream<EvaluationProgress, PythonBridgeError>;
    readonly isInitialized: () => Effect.Effect<boolean, never>;
  }
>() {}