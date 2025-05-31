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