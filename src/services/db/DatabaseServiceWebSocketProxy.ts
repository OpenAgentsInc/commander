import { Effect, Layer } from "effect";
import { DatabaseService, DatabaseError } from "./DatabaseService";
import type { DBSession, DBMessage, DBToolExecution } from "./DatabaseSchemas";

const WebSocket = require('ws');
const BRIDGE_SERVICE_URL = 'ws://localhost:45671';

// Generate unique request IDs
function generateRequestId(): string {
  return `db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Send database request through WebSocket
async function sendDatabaseRequest(operation: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BRIDGE_SERVICE_URL);
    const requestId = generateRequestId();
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Database operation timeout: ${operation}`));
    }, 10000); // 10 second timeout
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'db',
        id: requestId,
        operation,
        params
      }));
    });
    
    ws.on('message', (data: string) => {
      try {
        const response = JSON.parse(data);
        if (response.id === requestId) {
          clearTimeout(timeout);
          ws.close();
          
          if (response.type === 'db_result') {
            resolve(response.result);
          } else if (response.type === 'db_error') {
            reject(new Error(response.error));
          }
        }
      } catch (e) {
        clearTimeout(timeout);
        ws.close();
        reject(e);
      }
    });
    
    ws.on('error', (error: any) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

export const DatabaseServiceWebSocketProxyLive = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    _tag: "DatabaseService",
    
    initDB: () => Effect.succeed(undefined), // No-op, DB is initialized in bridge service
    
    saveSession: (session) => Effect.tryPromise({
      try: () => sendDatabaseRequest('saveSession', session),
      catch: (e) => new DatabaseError({ message: `WebSocket saveSession failed: ${e}`, cause: e })
    }),
    
    getSession: (sessionId) => Effect.tryPromise({
      try: () => sendDatabaseRequest('getSession', { sessionId }),
      catch: (e) => new DatabaseError({ message: `WebSocket getSession failed: ${e}`, cause: e })
    }),
    
    updateSession: (sessionId, updates) => Effect.tryPromise({
      try: () => sendDatabaseRequest('updateSession', { sessionId, updates }),
      catch: (e) => new DatabaseError({ message: `WebSocket updateSession failed: ${e}`, cause: e })
    }),
    
    saveMessage: (message) => Effect.tryPromise({
      try: () => sendDatabaseRequest('saveMessage', message),
      catch: (e) => new DatabaseError({ message: `WebSocket saveMessage failed: ${e}`, cause: e })
    }),
    
    getMessagesForSession: (sessionId, limit, offset) => Effect.tryPromise({
      try: () => sendDatabaseRequest('getMessagesForSession', { sessionId, limit, offset }),
      catch: (e) => new DatabaseError({ message: `WebSocket getMessagesForSession failed: ${e}`, cause: e })
    }),
    
    saveToolCall: (toolCall) => Effect.tryPromise({
      try: () => sendDatabaseRequest('saveToolCall', toolCall),
      catch: (e) => new DatabaseError({ message: `WebSocket saveToolCall failed: ${e}`, cause: e })
    }),
    
    updateToolCallResult: (toolCallId, resultJson, status) => Effect.tryPromise({
      try: () => sendDatabaseRequest('updateToolCallResult', { toolCallId, resultJson, status }),
      catch: (e) => new DatabaseError({ message: `WebSocket updateToolCallResult failed: ${e}`, cause: e })
    })
  })
);