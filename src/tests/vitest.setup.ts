import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

// Setup mock server
beforeAll(() => {
  // Start mock server
  server.listen({ onUnhandledRequest: 'error' });
  
  // Silence all console output during tests
  // Replace all console methods with no-ops
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
});

afterEach(() => server.resetHandlers());

afterAll(() => {
  // Close server
  server.close();
  
  // Restore console functionality
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  console.debug = originalConsoleDebug;
});