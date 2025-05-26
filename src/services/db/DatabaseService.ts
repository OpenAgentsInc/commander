import { Context, Effect, Data } from "effect";
import type { DBSession, DBMessage, DBToolExecution } from "./DatabaseSchemas";

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  message: string;
  cause?: unknown;
  query?: string;
  params?: any[];
}> {}

export interface DatabaseService {
  readonly _tag: "DatabaseService";
  initDB(): Effect.Effect<void, DatabaseError>;

  saveSession(session: DBSession): Effect.Effect<void, DatabaseError>;
  getSession(sessionId: string): Effect.Effect<DBSession | null, DatabaseError>;
  updateSession(sessionId: string, updates: Partial<Omit<DBSession, "id" | "created_at">>): Effect.Effect<void, DatabaseError>;

  saveMessage(message: DBMessage): Effect.Effect<void, DatabaseError>;
  getMessagesForSession(sessionId: string, limit?: number, offset?: number): Effect.Effect<DBMessage[], DatabaseError>;

  saveToolCall(toolCall: DBToolExecution): Effect.Effect<void, DatabaseError>;
  updateToolCallResult(toolCallId: string, resultJson: string, status: "executed_success" | "executed_error"): Effect.Effect<void, DatabaseError>;
  getToolCallsForMessage(messageId: string): Effect.Effect<DBToolExecution[], DatabaseError>;
}
export const DatabaseService = Context.GenericTag<DatabaseService>("DatabaseService");