import { beforeAll, afterEach, afterAll, vi } from "vitest";
import { server } from "./mocks/server";

// Mock external libraries that might cause problems
vi.mock("@buildonspark/lrc20-sdk", () => ({
  initEccLib: vi.fn(),
}));
vi.mock("bitcoinjs-lib", () => ({
  initEccLib: vi.fn(),
}));
vi.mock("nostr-tools", () => ({}));

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

// Setup mock server
beforeAll(() => {
  // Start mock server
  server.listen({ onUnhandledRequest: "error" });

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
