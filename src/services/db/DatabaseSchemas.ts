import { Schema } from "effect";

export const DBSessionSchema = Schema.Struct({
  id: Schema.String,
  created_at: Schema.Number, // Unix timestamp (seconds)
  last_updated_at: Schema.Number,
  provider_key: Schema.String,
  model_name: Schema.optional(Schema.String),
  system_prompt: Schema.optional(Schema.String),
  metadata_json: Schema.optional(Schema.String),
});
export type DBSession = Schema.Schema.Type<typeof DBSessionSchema>;

// Re-using AgentChatMessage's ToolCallSchema for structure, but this is for DB storage
export const DBToolCallFunctionSchema = Schema.Struct({
  name: Schema.String,
  arguments: Schema.String, // Stored as JSON string
});

export const DBToolCallItemSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.Literal("function"),
  function: DBToolCallFunctionSchema,
});
export type DBToolCallItem = Schema.Schema.Type<typeof DBToolCallItemSchema>;

export const DBMessageSchema = Schema.Struct({
  id: Schema.String,
  session_id: Schema.String,
  role: Schema.Union(
    Schema.Literal("user"),
    Schema.Literal("assistant"),
    Schema.Literal("system"),
    Schema.Literal("tool")
  ),
  content: Schema.NullishOr(Schema.String),
  name: Schema.optional(Schema.String),
  tool_call_id: Schema.optional(Schema.String), // For tool role response
  tool_calls_json: Schema.optional(Schema.String), // Storing tool_calls array as JSON string
  timestamp: Schema.Number, // Unix timestamp (seconds)
  provider_message_id: Schema.optional(Schema.String),
  metadata_json: Schema.optional(Schema.String),
});
export type DBMessage = Schema.Schema.Type<typeof DBMessageSchema>;

export const DBToolExecutionSchema = Schema.Struct({ // Renamed from DBToolCall to avoid confusion
  id: Schema.String, // This is the tool_call.id from the LLM
  message_id: Schema.String, // FK to the assistant message that made the call
  tool_name: Schema.String,
  arguments_json: Schema.String,
  result_json: Schema.optional(Schema.String),
  status: Schema.Union(
    Schema.Literal("pending"),
    Schema.Literal("executed_success"),
    Schema.Literal("executed_error")
  ),
  created_at: Schema.Number,
  updated_at: Schema.Number,
});
export type DBToolExecution = Schema.Schema.Type<typeof DBToolExecutionSchema>;