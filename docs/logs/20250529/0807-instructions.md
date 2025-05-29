Okay, agent, the core issue is that `tool_executions` records are not being successfully inserted into the database by the `claude-bridge-service.js`, even though `main-claude-websocket.ts` sends the requests. This causes the subsequent `updateToolCallResult` operations to fail because they can't find the records to update, leading to missing tool results on page refresh.

We need to make the `saveToolCall` operation in `claude-bridge-service.js` robust and ensure it correctly inserts records and reports its status.

Here are the specific instructions:

**Target File: `src/services/claude-bridge-service.js`**

**1. Modify the `saveToolCall` case in `handleDatabaseOperation`:**

Update the `case 'saveToolCall':` block to:
   - Use `await db.query()` for the `INSERT` statement.
   - Check the `affectedRows` property from the result of `db.query()`.
   - Add comprehensive logging for parameters, SQL execution, `affectedRows`, and any errors encountered during the `INSERT`.
   - If the `INSERT` affects 0 rows, log a warning and perform a `SELECT` query to check if the record somehow exists (e.g., due to a race or prior attempt) or if the foreign key `message_id` is invalid.
   - Send a detailed success/failure status back to the `main-claude-websocket.ts`.

```javascript
// Inside claude-bridge-service.js, within handleDatabaseOperation function:

      // ... other cases like saveSession, saveMessage ...

      case 'saveToolCall':
        log(`[DB Bridge] Processing 'saveToolCall' for tool ID: ${params.id}, message ID: ${params.message_id}`);
        if (!params.id || !params.message_id || !params.tool_name || typeof params.arguments_json !== 'string' || !params.status || typeof params.created_at !== 'number' || typeof params.updated_at !== 'number') {
          log(`[DB Bridge] ERROR: Invalid parameters for saveToolCall: ${JSON.stringify(params)}`);
          result = { success: false, error: "Invalid parameters for saveToolCall", toolCallId: params.id };
          break;
        }

        const insertSql = `INSERT INTO tool_executions (id, message_id, tool_name, arguments_json, result_json, status, created_at, updated_at)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        const insertParams = [
          params.id,
          params.message_id,
          params.tool_name,
          params.arguments_json,
          params.result_json || null, // Ensure result_json is null for pending
          params.status,
          params.created_at,
          params.updated_at
        ];

        log(`[DB Bridge] Executing INSERT for toolCallId ${params.id}: SQL: ${insertSql}`);
        log(`[DB Bridge] Params: ${JSON.stringify(insertParams)}`);

        try {
          const insertResult = await db.query(insertSql, insertParams);
          const rowsAffected = insertResult.affectedRows || 0;
          log(`[DB Bridge] INSERT for toolCallId ${params.id} completed: affectedRows = ${rowsAffected}, lastID = ${insertResult.lastID}`);

          if (rowsAffected > 0) {
            result = { success: true, toolCallId: params.id, rowsAffected };
            log(`[DB Bridge] SUCCESS: Tool call ${params.id} saved. Rows affected: ${rowsAffected}`);

            // Verification SELECT
            const verify = await db.query(`SELECT id FROM tool_executions WHERE id = $1`, [params.id]);
            if (verify.rows && verify.rows.length > 0) {
              log(`[DB Bridge] VERIFY SUCCESS: Tool call ${params.id} found in DB after insert.`);
            } else {
              log(`[DB Bridge] VERIFY WARNING: Tool call ${params.id} NOT found in DB after insert reported ${rowsAffected} affected rows.`);
              result = { ...result, success: false, error: "Verification select failed after insert." };
            }
          } else {
            log(`[DB Bridge] WARNING: No rows inserted for toolCallId ${params.id}. Checking for existing message_id...`);
            const msgCheck = await db.query(`SELECT id FROM messages WHERE id = $1`, [params.message_id]);
            if (msgCheck.rows && msgCheck.rows.length > 0) {
              log(`[DB Bridge] Parent message ${params.message_id} exists. Insert might have failed for other reasons (e.g., duplicate tool ID).`);
              result = { success: false, toolCallId: params.id, error: "Insert affected 0 rows, parent message exists." };
            } else {
              log(`[DB Bridge] ERROR: Parent message ${params.message_id} for toolCallId ${params.id} does NOT exist. FK constraint likely failed.`);
              result = { success: false, toolCallId: params.id, error: "Insert affected 0 rows, parent message_id not found (FK constraint failure)." };
            }
          }
        } catch (dbError) {
          log(`[DB Bridge] ERROR inserting tool_execution for toolCallId ${params.id}: ${dbError.message}`);
          log(`[DB Bridge] Stack trace: ${dbError.stack}`);
          result = { success: false, toolCallId: params.id, error: dbError.message };
        }
        break;

      case 'updateToolCallResult':
        // The existing enhanced 'updateToolCallResult' case (from 0759-log.md / your previous fix) should remain here.
        // Ensure it uses `await db.query(...)` and checks `affectedRows`.
        log(`[DB Bridge] Processing 'updateToolCallResult' for toolCallId: ${params.toolCallId}`);
        if (!params.toolCallId || typeof params.resultJson !== 'string' || !params.status) {
          log(`[DB Bridge] ERROR: Invalid parameters for updateToolCallResult: ${JSON.stringify(params)}`);
          result = { success: false, error: "Invalid parameters for updateToolCallResult", toolCallId: params.toolCallId };
          break;
        }

        const updateTimestamp = Math.floor(Date.now() / 1000);
        const updateSql = `UPDATE tool_executions
                           SET result_json = $1,
                               status = $2,
                               updated_at = $3
                           WHERE id = $4`;
        const updateQueryParams = [
          params.resultJson,
          params.status,
          updateTimestamp,
          params.toolCallId
        ];

        log(`[DB Bridge] Executing UPDATE for toolCallId: ${params.toolCallId}, status: ${params.status}, timestamp: ${updateTimestamp}`);
        log(`[DB Bridge] Result JSON preview: ${params.resultJson.substring(0,100)}...`);

        try {
          const updateOpResult = await db.query(updateSql, updateQueryParams);
          const rowsAffectedUpdate = updateOpResult.affectedRows || 0;
          log(`[DB Bridge] UPDATE completed for toolCallId ${params.toolCallId}: affectedRows = ${rowsAffectedUpdate}`);

          if (rowsAffectedUpdate > 0) {
            result = { success: true, toolCallId: params.toolCallId, status: params.status, rowsAffected: rowsAffectedUpdate };
            log(`[DB Bridge] SUCCESS: Tool call ${params.toolCallId} updated successfully. Rows affected: ${rowsAffectedUpdate}`);

            const verifyUpdate = await db.query(
              `SELECT id, status, result_json IS NOT NULL as has_result FROM tool_executions WHERE id = $1`,
              [params.toolCallId]
            );
            if (verifyUpdate.rows && verifyUpdate.rows.length > 0) {
              log(`[DB Bridge] VERIFY UPDATE: Tool ${params.toolCallId} - status: ${verifyUpdate.rows[0].status}, has_result: ${verifyUpdate.rows[0].has_result}`);
            } else {
               log(`[DB Bridge] VERIFY UPDATE WARNING: Tool ${params.toolCallId} NOT found after update.`);
            }
          } else {
            result = { success: false, toolCallId: params.toolCallId, status: params.status, rowsAffected: 0, error: "No rows updated. ToolCallId might not exist." };
            log(`[DB Bridge] WARNING: No rows updated for toolCallId ${params.toolCallId}. Checking if record exists...`);
            const checkResult = await db.query(
              `SELECT id, status FROM tool_executions WHERE id = $1`,
              [params.toolCallId]
            );
            if (checkResult.rows && checkResult.rows.length > 0) {
              log(`[DB Bridge] Record EXISTS with status: ${checkResult.rows[0].status}. Update may have been redundant or failed for other reasons.`);
            } else {
              log(`[DB Bridge] ERROR: No tool_execution record found with id: ${params.toolCallId} to update.`);
            }
          }
        } catch (dbError) {
          log(`[DB Bridge] ERROR updating tool_executions for toolCallId ${params.toolCallId}: ${dbError.message}`);
          log(`[DB Bridge] Stack trace: ${dbError.stack}`);
          result = { success: false, toolCallId: params.toolCallId, error: dbError.message };
        }
        break;

      // ... other cases ...
```

**2. Modify `main-claude-websocket.ts` (`saveToolCallToDatabase` helper):**

Update this helper function to check the `success` field from the bridge service's response and log an error if the save operation failed in the bridge.

```javascript
// Inside main-claude-websocket.ts

async function saveToolCallToDatabase(toolCall: any): Promise<void> {
  const ws = new WebSocket(BRIDGE_SERVICE_URL);
  return new Promise((resolve, reject) => {
    const requestId = `db-save-toolcall-${Date.now()}`;
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'db',
        id: requestId, // Use unique ID for this request
        operation: 'saveToolCall',
        params: toolCall
      }));
    });

    ws.on('message', (data: string) => {
      const response = JSON.parse(data);
      if (response.id === requestId) { // Ensure response matches request
        ws.close();
        if (response.type === 'db_result' && response.result.success) {
          console.log(`[Main Process] Tool call ${toolCall.id} reported as saved by bridge.`);
          resolve();
        } else {
          // Log the error from the bridge service
          const errorMessage = response.error || (response.result && response.result.error) || 'Unknown error from bridge during saveToolCall';
          console.error(`[Main Process] Bridge service failed to save tool call ${toolCall.id}: ${errorMessage}`);
          console.error(`[Main Process] Bridge response details: ${JSON.stringify(response.result)}`);
          reject(new Error(`Bridge failed to save tool call ${toolCall.id}: ${errorMessage}`));
        }
      }
    });

    ws.on('error', (err) => {
      console.error(`[Main Process] WebSocket error for saveToolCall ${toolCall.id}:`, err);
      reject(err);
    });
  });
}
```

**Explanation of Changes:**
*   **`claude-bridge-service.js` (`saveToolCall`):**
    *   Added parameter validation at the beginning.
    *   Logs the SQL and parameters before execution.
    *   `await db.query()` is used for the `INSERT`.
    *   The `affectedRows` property of the result from `db.query()` is checked.
    *   If `affectedRows` is 0, it attempts to determine why (e.g., missing parent `message_id` due to FK constraint).
    *   Detailed logs are added for success, failure, and verification steps.
    *   The `result` sent back to `main-claude-websocket.ts` now includes more details on failure.
*   **`claude-bridge-service.js` (`updateToolCallResult`):**
    *   Ensured this case also uses `await db.query()` and robustly checks `affectedRows`, similar to the corrected `saveToolCall`. Includes verification SELECT.
*   **`main-claude-websocket.ts` (`saveToolCallToDatabase`):**
    *   The WebSocket response is now checked for `response.result.success`.
    *   If `success` is false, an error is logged in the main process, making it clear that the bridge failed to save the tool call.

**Testing Steps:**
1.  Ensure the `claude-bridge-service.js` file is updated with the changes.
2.  Restart both the Commander application and the `claude-bridge-service.js`.
3.  In Commander's `CoderPane`, execute a command that involves multiple tool calls (e.g., "Glob all markdown files in `docs/claude-code/` then Read the first one").
4.  **Monitor `claude-bridge-service.log`:**
    *   Look for `[DB Bridge] Processing 'saveToolCall' ...` for each tool call ID.
    *   Verify `[DB Bridge] INSERT for toolCallId ... completed: affectedRows = 1 ...`.
    *   Verify `[DB Bridge] VERIFY SUCCESS: Tool call ... found in DB after insert.`
    *   Later, when results come back, look for `[DB Bridge] Processing 'updateToolCallResult' ...`.
    *   Verify `[DB Bridge] UPDATE completed for toolCallId ...: affectedRows = 1`.
    *   Verify `[DB Bridge] VERIFY UPDATE: Tool ... - status: executed_success, has_result: true`.
5.  **Monitor `main.log` (Electron main process console output):**
    *   Look for `[Main Process] Tool call ... reported as saved by bridge.` messages.
    *   Ensure no "Bridge service failed to save tool call..." errors appear.
6.  After the interaction is complete in `CoderPane`:
    *   Refresh the Commander application (Cmd/Ctrl+R).
    *   Verify that all tool calls and their *results* are displayed correctly and in the original order.
    *   Check the PGlite database file directly to confirm that `tool_executions` table has rows with populated `result_json` and `status='executed_success'`.

This approach targets the `INSERT` operation's reliability in the bridge service, which is the current most likely point of failure based on the logs.Okay, Agent, it's clear the root of the persistence problem lies in the `tool_executions` records not being inserted correctly by the `claude-bridge-service.js`. The `updateToolCallResult` logic seems to be trying to update non-existent records.

Let's fortify the `saveToolCall` operation in `claude-bridge-service.js` to ensure records are inserted and to get clear feedback if they are not. We'll also slightly improve the `updateToolCallResult` with similar robustness checks.

**Target File: `src/services/claude-bridge-service.js`**

**1. Enhance `saveToolCall` and `updateToolCallResult` cases in `handleDatabaseOperation`:**

Modify these cases to:
   - Use `await db.query()` for `INSERT` and `UPDATE`.
   - Explicitly check the `affectedRows` property from the result of `db.query()`.
   - Add comprehensive logging for parameters, SQL execution, `affectedRows`, and any errors.
   - If an `INSERT` or `UPDATE` affects 0 rows, log a warning and perform a diagnostic `SELECT` query.
   - Send a detailed success/failure status back to `main-claude-websocket.ts`.

```javascript
// Inside src/services/claude-bridge-service.js, within handleDatabaseOperation function:

      // ... other cases like saveSession, saveMessage ...

      case 'saveToolCall':
        log(`[DB Bridge] Processing 'saveToolCall' for tool ID: ${params.id}, message ID: ${params.message_id}`);
        if (!params.id || !params.message_id || !params.tool_name || typeof params.arguments_json !== 'string' || !params.status || typeof params.created_at !== 'number' || typeof params.updated_at !== 'number') {
          const errorMsg = `[DB Bridge] ERROR: Invalid parameters for saveToolCall: ${JSON.stringify(params)}`;
          log(errorMsg);
          result = { success: false, error: "Invalid parameters for saveToolCall", toolCallId: params.id };
          break;
        }

        const insertSql = `INSERT INTO tool_executions (id, message_id, tool_name, arguments_json, result_json, status, created_at, updated_at)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                           ON CONFLICT(id) DO NOTHING;`; // Added ON CONFLICT to prevent errors if already exists, though affectedRows will be 0
        const insertParams = [
          params.id,
          params.message_id,
          params.tool_name,
          params.arguments_json,
          params.result_json || null,
          params.status,
          params.created_at,
          params.updated_at
        ];

        log(`[DB Bridge] Executing INSERT for toolCallId ${params.id}: SQL: ${insertSql}`);
        log(`[DB Bridge] Params: ${JSON.stringify(insertParams)}`);

        try {
          const insertResult = await db.query(insertSql, insertParams);
          // For PGlite, insertResult might not have affectedRows directly for INSERT like other SQLite libs.
          // We'll rely on the verification SELECT query.
          log(`[DB Bridge] INSERT attempt for toolCallId ${params.id} completed. Result: ${JSON.stringify(insertResult)}`);

          // Verification SELECT query
          const verifyInsert = await db.query(`SELECT id FROM tool_executions WHERE id = $1`, [params.id]);
          if (verifyInsert.rows && verifyInsert.rows.length > 0) {
            result = { success: true, toolCallId: params.id, rowsAffected: 1 }; // Assume 1 row if found
            log(`[DB Bridge] SUCCESS (Verified): Tool call ${params.id} saved. Found in DB.`);
          } else {
            log(`[DB Bridge] ERROR: Tool call ${params.id} NOT found in DB after INSERT attempt. Checking parent message...`);
            const msgCheck = await db.query(`SELECT id FROM messages WHERE id = $1`, [params.message_id]);
            if (msgCheck.rows && msgCheck.rows.length > 0) {
              log(`[DB Bridge] Parent message ${params.message_id} exists. Insert for tool ${params.id} might have failed for other reasons (e.g., duplicate tool ID, or ON CONFLICT did nothing).`);
              result = { success: false, toolCallId: params.id, error: "Insert affected 0 rows or verification failed, parent message exists." };
            } else {
              log(`[DB Bridge] CRITICAL ERROR: Parent message ${params.message_id} for toolCallId ${params.id} does NOT exist. FK constraint likely failed.`);
              result = { success: false, toolCallId: params.id, error: "Insert failed, parent message_id not found (FK constraint failure)." };
            }
          }
        } catch (dbError) {
          log(`[DB Bridge] ERROR inserting tool_execution for toolCallId ${params.id}: ${dbError.message}`);
          log(`[DB Bridge] Stack trace: ${dbError.stack}`);
          result = { success: false, toolCallId: params.id, error: dbError.message };
        }
        break;

      case 'updateToolCallResult':
        log(`[DB Bridge] Processing 'updateToolCallResult' for toolCallId: ${params.toolCallId}`);
        if (!params.toolCallId || typeof params.resultJson !== 'string' || !params.status) {
          const errorMsg = `[DB Bridge] ERROR: Invalid parameters for updateToolCallResult: ${JSON.stringify(params)}`;
          log(errorMsg);
          result = { success: false, error: "Invalid parameters for updateToolCallResult", toolCallId: params.toolCallId };
          break;
        }

        const updateTimestamp = Math.floor(Date.now() / 1000);
        const updateSql = `UPDATE tool_executions
                           SET result_json = $1,
                               status = $2,
                               updated_at = $3
                           WHERE id = $4`;
        const updateQueryParams = [
          params.resultJson,
          params.status,
          updateTimestamp,
          params.toolCallId
        ];

        log(`[DB Bridge] Executing UPDATE for toolCallId: ${params.toolCallId}, status: ${params.status}, timestamp: ${updateTimestamp}`);
        log(`[DB Bridge] Result JSON preview (first 100 chars): ${params.resultJson.substring(0,100)}...`);

        try {
          const updateOpResult = await db.query(updateSql, updateQueryParams);
          // PGlite's `db.query` for UPDATE returns an object that might contain `changes` or similar.
          // For this version of PGlite, it seems `affectedRows` is the property.
          const rowsAffectedUpdate = updateOpResult.affectedRows || 0;
          log(`[DB Bridge] UPDATE completed for toolCallId ${params.toolCallId}: affectedRows = ${rowsAffectedUpdate}. Full result: ${JSON.stringify(updateOpResult)}`);

          if (rowsAffectedUpdate > 0) {
            result = { success: true, toolCallId: params.toolCallId, status: params.status, rowsAffected: rowsAffectedUpdate };
            log(`[DB Bridge] SUCCESS: Tool call ${params.toolCallId} updated. Rows affected: ${rowsAffectedUpdate}`);

            const verifyUpdate = await db.query(
              `SELECT id, status, result_json IS NOT NULL as has_result FROM tool_executions WHERE id = $1`,
              [params.toolCallId]
            );
            if (verifyUpdate.rows && verifyUpdate.rows.length > 0) {
              log(`[DB Bridge] VERIFY UPDATE: Tool ${params.toolCallId} - status: ${verifyUpdate.rows[0].status}, has_result: ${verifyUpdate.rows[0].has_result}`);
            } else {
               log(`[DB Bridge] VERIFY UPDATE WARNING: Tool ${params.toolCallId} NOT found after update reported ${rowsAffectedUpdate} affected rows. This should not happen.`);
               result = { ...result, success: false, error: "Verification SELECT failed after update." };
            }
          } else {
            result = { success: false, toolCallId: params.toolCallId, status: params.status, rowsAffected: 0, error: "No rows updated. ToolCallId might not exist." };
            log(`[DB Bridge] WARNING: No rows updated for toolCallId ${params.toolCallId}. Checking if record exists...`);
            const checkResult = await db.query(
              `SELECT id, status FROM tool_executions WHERE id = $1`,
              [params.toolCallId]
            );
            if (checkResult.rows && checkResult.rows.length > 0) {
              log(`[DB Bridge] Record EXISTS with status: ${checkResult.rows[0].status}. Update target ${params.status} may have been redundant or other issue.`);
            } else {
              log(`[DB Bridge] ERROR: No tool_execution record found with id: ${params.toolCallId} to update.`);
            }
          }
        } catch (dbError) {
          log(`[DB Bridge] ERROR updating tool_executions for toolCallId ${params.toolCallId}: ${dbError.message}`);
          log(`[DB Bridge] Stack trace: ${dbError.stack}`);
          result = { success: false, toolCallId: params.toolCallId, error: dbError.message };
        }
        break;

      // ... other cases ...
```

**2. Modify `main-claude-websocket.ts` (`saveToolCallToDatabase` and `updateToolCallResultInDatabase` helpers):**

Ensure these helpers rigorously check the `success` field from the bridge service's response and log detailed errors if the bridge reports a failure.

```javascript
// Inside main-claude-websocket.ts

async function saveToolCallToDatabase(toolCall: any): Promise<void> {
  const ws = new WebSocket(BRIDGE_SERVICE_URL);
  return new Promise((resolve, reject) => {
    const requestId = `db-save-toolcall-${Date.now()}-${Math.random().toString(36).substring(2,9)}`;
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'db',
        id: requestId,
        operation: 'saveToolCall',
        params: toolCall
      }));
    };

    ws.onmessage = (event: MessageEvent) => {
      const response = JSON.parse(event.data as string);
      if (response.id === requestId) {
        clearTimeout(timeoutId); // Clear timeout on response
        ws.close();
        if (response.type === 'db_result' && response.result && response.result.success) {
          console.log(`[Main Process] Tool call ${toolCall.id} reported as saved by bridge. Rows affected: ${response.result.rowsAffected || 'N/A'}`);
          resolve();
        } else {
          const errorMessage = response.error || (response.result && response.result.error) || 'Unknown error from bridge during saveToolCall';
          console.error(`[Main Process] Bridge service FAILED to save tool call ${toolCall.id}: ${errorMessage}`);
          console.error(`[Main Process] Bridge saveToolCall response details: ${JSON.stringify(response.result)}`);
          reject(new Error(`Bridge failed to save tool call ${toolCall.id}: ${errorMessage}. Details: ${JSON.stringify(response.result)}`));
        }
      }
    };

    const timeoutId = setTimeout(() => {
      ws.close();
      const errorMsg = `Timeout waiting for bridge response for saveToolCall ${toolCall.id}`;
      console.error(`[Main Process] ${errorMsg}`);
      reject(new Error(errorMsg));
    }, 5000); // 5 second timeout for DB operations

    ws.onerror = (errEv: Event) => { // Type event as ErrorEvent or Event
      clearTimeout(timeoutId);
      const errorMsg = `WebSocket error for saveToolCall ${toolCall.id}: ${(errEv as ErrorEvent).message || 'Unknown WebSocket error'}`;
      console.error(`[Main Process] ${errorMsg}`);
      reject(new Error(errorMsg));
    };
  });
}

async function updateToolCallResultInDatabase(toolCallId: string, resultJson: string, status: "executed_success" | "executed_error"): Promise<void> {
  const ws = new WebSocket(BRIDGE_SERVICE_URL);
  return new Promise((resolve, reject) => {
    const requestId = `db-update-toolcall-${Date.now()}-${Math.random().toString(36).substring(2,9)}`;
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'db',
        id: requestId,
        operation: 'updateToolCallResult',
        params: { toolCallId, resultJson, status }
      }));
    };

    ws.onmessage = (event: MessageEvent) => {
      const response = JSON.parse(event.data as string);
      if (response.id === requestId) {
        clearTimeout(timeoutId);
        ws.close();
        if (response.type === 'db_result' && response.result && response.result.success) {
          console.log(`[Main Process] Tool call ${toolCallId} result reported as updated by bridge. Rows affected: ${response.result.rowsAffected || 'N/A'}`);
          resolve();
        } else {
          const errorMessage = response.error || (response.result && response.result.error) || 'Unknown error from bridge during updateToolCallResult';
          console.error(`[Main Process] Bridge service FAILED to update tool call result ${toolCallId}: ${errorMessage}`);
          console.error(`[Main Process] Bridge updateToolCallResult response details: ${JSON.stringify(response.result)}`);
          reject(new Error(`Bridge failed to update tool call ${toolCallId}: ${errorMessage}. Details: ${JSON.stringify(response.result)}`));
        }
      }
    };

    const timeoutId = setTimeout(() => {
      ws.close();
      const errorMsg = `Timeout waiting for bridge response for updateToolCallResult ${toolCallId}`;
      console.error(`[Main Process] ${errorMsg}`);
      reject(new Error(errorMsg));
    }, 5000); // 5 second timeout

    ws.onerror = (errEv: Event) => {
      clearTimeout(timeoutId);
      const errorMsg = `WebSocket error for updateToolCallResult ${toolCallId}: ${(errEv as ErrorEvent).message || 'Unknown WebSocket error'}`;
      console.error(`[Main Process] ${errorMsg}`);
      reject(new Error(errorMsg));
    };
  });
}
```

**Explanation of Key Changes:**
*   **`claude-bridge-service.js` (`saveToolCall`):**
    *   Added `ON CONFLICT(id) DO NOTHING` to the `INSERT` statement. This makes the insert idempotent; if a tool call with the same ID already exists (e.g., due to a retry or race condition from `main-claude-websocket.ts`), it won't throw an error.
    *   After attempting the `INSERT`, it now *always* performs a `SELECT` query to verify if the row exists. This is more reliable than `affectedRows` for PGlite with `ON CONFLICT DO NOTHING`.
    *   Logging is enhanced to clearly state whether the row was found after the insert attempt and to check for the parent message's existence if the insert seems to fail.
*   **`claude-bridge-service.js` (`updateToolCallResult`):**
    *   Also uses `await db.query()` and checks `affectedRows`.
    *   Includes a verification `SELECT` to confirm the update.
    *   Logs detailed information about the update process and any potential issues (e.g., record not found).
*   **`main-claude-websocket.ts` (Both helpers):**
    *   Generates a unique `requestId` for each WebSocket operation to reliably match responses.
    *   Implements a timeout for WebSocket responses to prevent hangs.
    *   Rigorously checks `response.result.success` and `response.result.rowsAffected` (if present) from the bridge.
    *   Logs more detailed error messages in the main process if the bridge reports a failure or if there's a WebSocket error.
    *   Provides typed `ErrorEvent` for `ws.onerror`.

**Testing Steps (Repeat from previous, but with more focus on bridge logs):**
1.  Apply changes and restart both Commander and `claude-bridge-service.js`.
2.  Run a multi-tool command.
3.  **Crucially inspect `claude-bridge-service.log`:**
    *   For `saveToolCall`:
        *   Confirm `[DB Bridge] Executing INSERT for toolCallId ...`
        *   Confirm `[DB Bridge] SUCCESS (Verified): Tool call ... saved. Found in DB.` for each tool call.
        *   If errors, note the FK constraint check or other warnings.
    *   For `updateToolCallResult`:
        *   Confirm `[DB Bridge] Executing UPDATE for toolCallId ...`
        *   Confirm `[DB Bridge] SUCCESS: Tool call ... updated. Rows affected: 1`.
        *   Confirm `[DB Bridge] VERIFY UPDATE: Tool ... - status: executed_success, has_result: true`.
4.  **Inspect `main.log`:**
    *   Confirm `[Main Process] Tool call ... reported as saved by bridge.`
    *   Confirm `[Main Process] Tool call ... result reported as updated by bridge.`
    *   Ensure no "Bridge service FAILED..." messages.
5.  Refresh Commander and verify tool results are fully persisted and displayed correctly.
6.  Check the PGlite database directly.

This robust logging and verification at both the bridge and main process levels should pinpoint exactly where the save/update is failing, if it still does, or confirm that it's now working correctly. The `ON CONFLICT DO NOTHING` for inserts adds robustness against potential duplicate `saveToolCall` requests for the same tool ID.
