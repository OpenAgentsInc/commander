export const DB_SERVICE_CHANNEL_PREFIX = "db-service";

export const dbChannels = {
  initDB: `${DB_SERVICE_CHANNEL_PREFIX}:initDB`,
  saveSession: `${DB_SERVICE_CHANNEL_PREFIX}:saveSession`,
  getSession: `${DB_SERVICE_CHANNEL_PREFIX}:getSession`,
  updateSession: `${DB_SERVICE_CHANNEL_PREFIX}:updateSession`,
  saveMessage: `${DB_SERVICE_CHANNEL_PREFIX}:saveMessage`,
  getMessagesForSession: `${DB_SERVICE_CHANNEL_PREFIX}:getMessagesForSession`,
  saveToolCall: `${DB_SERVICE_CHANNEL_PREFIX}:saveToolCall`,
  updateToolCallResult: `${DB_SERVICE_CHANNEL_PREFIX}:updateToolCallResult`,
  getToolCallsForMessage: `${DB_SERVICE_CHANNEL_PREFIX}:getToolCallsForMessage`,
};