# Electron subprocess network restrictions limit API access

When subprocesses spawned from Electron's main process attempt network requests, they operate in a restricted security context that differs fundamentally from standalone Node.js, causing tools like Claude CLI to timeout despite successful authentication. The root cause stems from Electron's Chromium-based architecture creating an incompatible network environment for child processes, requiring specific workarounds to restore network functionality.

## Architectural mismatch causes subprocess network failures

Electron inherits Chromium's multi-process architecture, creating distinct security contexts between the main process and spawned subprocesses. When you spawn a subprocess using `child_process` or `node-pty`, Electron automatically sets `ELECTRON_RUN_AS_NODE=1`, which creates several critical limitations:

The **main process** uses Chromium's network service with full access to Electron APIs and certificate handling, while **child processes** run in isolated Node.js environments without access to Electron's network stack. This separation means network requests from child processes cannot access Chromium's certificate stores, proxy configurations, or DNS resolution mechanisms.

The specific technical barriers include **TLS certificate validation failures** where child processes cannot access Electron's certificate error handling (`app.on('certificate-error')`), **limited environment variable inheritance** affecting network configurations, and **signal propagation issues** where SIGTERM may not properly reach child processes, explaining your timeout symptoms.

## Security model enforces strict process isolation

Electron's security architecture enforces process isolation through several mechanisms that directly impact network access:

**Sandboxing inheritance** prevents child processes from accessing the parent's network context, even when the main process has full network permissions. The **ELECTRON_RUN_AS_NODE environment variable** modifies the execution context, preventing `require('electron')` and limiting access to Chromium's network features. Additionally, **certificate chain validation** differs between BoringSSL (used by Electron) and OpenSSL (expected by Node.js processes), causing HTTPS handshake failures.

Research indicates these restrictions manifest as specific error patterns: `SELF_SIGNED_CERT_IN_CHAIN`, `ERR_NETWORK_ACCESS_DENIED`, and the generic timeout with SIGTERM you're experiencing. The subprocess successfully authenticates (`claude --version` works) because it doesn't make network requests, but actual API calls fail due to the restricted network context.

## UtilityProcess API provides the recommended solution

Electron's `utilityProcess` API, introduced as a modern alternative to `child_process`, addresses these network limitations through better integration with Chromium's process model:

```javascript
const { utilityProcess } = require("electron");

const child = utilityProcess.fork(
  path.join(__dirname, "claude-wrapper.js"),
  [],
  {
    serviceName: "claude-cli-service",
    respondToAuthRequestsFromMainProcess: true, // Critical for HTTPS APIs
    stdio: "pipe",
    env: {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      // Preserve necessary environment variables
    },
  },
);
```

The **respondToAuthRequestsFromMainProcess** option enables HTTP 401/407 authentication handling through the main process, essential for API authentication. This approach uses Chromium's Services API instead of Node.js child_process, providing **built-in MessagePort support** for secure IPC, **proper signal handling** through Chromium's lifecycle management, and **network context inheritance** that preserves TLS certificate access.

## External service bridges enable full network access

For cases where utilityProcess doesn't fully resolve the issue, external service bridge patterns provide complete network isolation:

**WebSocket Bridge Pattern:**

```javascript
// Separate Node.js process (not child of Electron)
const WebSocket = require("ws");
const { spawn } = require("child_process");
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const { command, args } = JSON.parse(data);
    const child = spawn(command, args);

    child.stdout.on("data", (output) => {
      ws.send(JSON.stringify({ type: "output", data: output.toString() }));
    });
  });
});

// In Electron main process
const ws = new WebSocket("ws://localhost:8080");
ws.send(JSON.stringify({ command: "claude", args: ["chat", "-m", "Hello"] }));
```

This pattern completely bypasses Electron's security restrictions by running CLI tools in a separate Node.js process with full network access. The external process maintains its own network context, unaffected by Electron's sandboxing.

## macOS-specific debugging reveals platform constraints

On macOS, additional security features compound subprocess issues:

**Code signing and entitlements** affect subprocess behavior, requiring specific entitlements for network access:

```xml
<key>com.apple.security.network.client</key>
<true/>
<key>com.apple.security.cs.allow-dyld-environment-variables</key>
<true/>
```

**Debugging techniques** for macOS include using `dtruss` to trace system calls during network failures:

```bash
sudo dtruss -t socket,connect,sendto,recvfrom -p $(pgrep -f "Electron Helper")
```

The Console.app provides filtered logging with `process:"YourApp" OR process:"Electron Helper"` to identify subprocess failures. Signal handling on macOS may delay SIGTERM delivery, explaining timeout behaviors.

## Best practices for network-dependent CLI integration

Based on extensive research and real-world implementations, follow these practices:

1. **Prefer utilityProcess over child_process** for Electron v22+ applications, always enabling `respondToAuthRequestsFromMainProcess` for API-dependent tools.

2. **Implement timeout and cleanup mechanisms** to handle hung processes:

```javascript
const timeout = setTimeout(() => {
  child.kill("SIGTERM");
  reject(new Error("CLI timeout"));
}, 30000);
```

3. **Use environment variable fixes** for immediate workarounds:

```javascript
env: {
  NODE_TLS_REJECT_UNAUTHORIZED: '0', // For development only
  PATH: process.env.PATH, // Preserve PATH on macOS
}
```

4. **Consider external service patterns** for production applications requiring guaranteed network access, especially when dealing with complex authentication flows or corporate proxies.

5. **Test in packaged environments** early, as development and production behaviors differ significantly due to code signing and sandboxing.

## Conclusion

Electron's subprocess network restrictions result from fundamental architectural differences between Chromium's network service and Node.js's native networking. While these security measures protect users, they create challenges for integrating network-dependent CLI tools. The utilityProcess API offers the most elegant solution for modern Electron applications, while external service bridges provide bulletproof alternatives when full network access is critical. Understanding these limitations and implementing appropriate workarounds ensures reliable CLI tool integration without compromising Electron's security model.
