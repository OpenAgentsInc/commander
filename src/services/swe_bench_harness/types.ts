import { Schema } from "effect";

export const SWEBenchTaskSchema = Schema.Struct({
  instance_id: Schema.String,
  repo: Schema.String,
  base_commit: Schema.String,
  problem_statement: Schema.String,
  hints_text: Schema.optional(Schema.String),
  test_patch: Schema.String, // Content of the test patch
  version: Schema.String,
  FAIL_TO_PASS: Schema.Array(Schema.String),
  PASS_TO_PASS: Schema.Array(Schema.String),
  // Add other fields from swe-bench task definition if needed
  patch: Schema.optional(Schema.String), // Gold patch, if available in dataset
});

export type SWEBenchTask = Schema.Schema.Type<typeof SWEBenchTaskSchema>;

export const EvaluationReportSchema = Schema.Struct({
  instance_id: Schema.String,
  patch_applied_successfully: Schema.Boolean,
  tests_passed: Schema.Boolean,
  resolved: Schema.Boolean,
  test_output_log_path: Schema.optional(Schema.String), // Path to test output log on host after copy
  // More detailed test statuses can be added later
});

export type EvaluationReport = Schema.Schema.Type<typeof EvaluationReportSchema>;

export interface ContainerContext {
  readonly containerId: string;
  readonly hostEvalDir: string;          // Absolute path on host for this task's eval files
  readonly containerEvalDir: string;     // Absolute path inside container (mount point of hostEvalDir)
  readonly containerRepoPath: string;    // Absolute path to repo root inside container
}