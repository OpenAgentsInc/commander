# Standalone Node.js PTY Test Script - Claude CLI Isolation Test

## Objective

Create a standalone Node.js script to test if `node-pty` can successfully spawn and communicate with the Claude CLI outside of Electron's environment. This will help isolate whether the subprocess execution failure is specific to Electron or a general Node.js/PTY issue with the Claude CLI.

## Key Findings to Test

Based on the analysis in `1933-analysis.md`:
- The Claude CLI works perfectly in terminal: `claude -p "hi" --output-format stream-json --verbose`
- All subprocess methods (spawn, execFile, exec) fail with timeout/SIGTERM in Electron
- The CLI might be TTY-sensitive and require a pseudo-terminal environment
- Network pre-flight checks or auto-update mechanisms might be hanging

## Script Requirements

Create a file: `scripts/test-claude-pty-standalone.js`

### 1. Dependencies

```bash
# First, ensure node-pty is installed:
cd /Users/christopherdavid/code/commander
pnpm add node-pty
```

### 2. Script Implementation

The script should:

1. **Find Claude CLI Path**
   - Use `which claude` to find the CLI location
   - Fall back to known paths if needed

2. **Set Up Minimal Environment**
   - Start with only essential environment variables
   - Include ANTHROPIC_API_KEY (passed via command line)
   - Set TERM=xterm-256color for PTY compatibility

3. **Spawn Claude with PTY**
   - Use exact working command: `claude -p "hi" --output-format stream-json --verbose`
   - Set PTY dimensions (cols: 120, rows: 30)
   - Use HOME directory as working directory

4. **Handle Output**
   - Log ALL raw PTY data with timestamps
   - Don't attempt to parse JSON initially - just see raw output
   - Track if ANY data is received (to differentiate between immediate failure vs hang)

5. **Handle Exit**
   - Log exit code and signal
   - Report total execution time

6. **Implement Timeout**
   - Kill process after 30 seconds if no exit
   - Report if killed by timeout vs natural exit

### 3. Full Script Code

```javascript
#!/usr/bin/env node
// scripts/test-claude-pty-standalone.js

const pty = require('node-pty');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

// Configuration
const TIMEOUT_MS = 30000; // 30 seconds
const TEST_PROMPT = "hi"; // Same as manual test

// Find Claude CLI path
let claudePath;
try {
    claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
    console.log(`Found claude at: ${claudePath}`);
} catch (e) {
    console.error("ERROR: 'which claude' failed. Trying fallback paths...");
    const fallbackPaths = [
        '/Users/christopherdavid/.npm-global/bin/claude',
        '/usr/local/bin/claude',
        '/opt/homebrew/bin/claude',
        path.join(process.env.HOME, '.local/bin/claude')
    ];

    for (const fallback of fallbackPaths) {
        try {
            if (require('fs').existsSync(fallback)) {
                claudePath = fallback;
                console.log(`Found claude at fallback: ${claudePath}`);
                break;
            }
        } catch (e) {}
    }

    if (!claudePath) {
        console.error("ERROR: Could not find claude CLI in any location");
        process.exit(1);
    }
}

// Test claude --version first
try {
    const version = execSync(`${claudePath} --version`, { encoding: 'utf8' }).trim();
    console.log(`Claude version: ${version}`);
} catch (e) {
    console.error("ERROR: claude --version failed:", e.message);
}

// Prepare arguments
const args = ["-p", TEST_PROMPT, "--output-format", "stream-json", "--verbose"];

// Minimal environment - Claude CLI uses its own auth from 'claude auth'
const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USER: process.env.USER,
    LANG: process.env.LANG || 'en_US.UTF-8',
    LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
    TERM: 'xterm-256color',
    // Try to disable any update checks
    CLAUDE_SKIP_UPDATE_CHECK: 'true',
    CI: 'true', // Sometimes disables interactive features
    NO_UPDATE_CHECK: 'true' // Generic flag some CLIs use
};

console.log("\n=== TEST CONFIGURATION ===");
console.log(`Command: ${claudePath} ${args.join(' ')}`);
console.log(`Working Directory: ${process.env.HOME}`);
console.log(`Environment Variables Set:`, Object.keys(env));
console.log(`Timeout: ${TIMEOUT_MS}ms`);
console.log("\n=== STARTING PTY SPAWN ===");

const startTime = Date.now();
let hasReceivedData = false;
let fullOutput = "";
let exitCode = null;
let timedOut = false;

// Spawn with PTY
const ptyProcess = pty.spawn(claudePath, args, {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: process.env.HOME,
    env: env
});

console.log(`PTY Process spawned with PID: ${ptyProcess.pid}`);

// Set up timeout
const timeoutId = setTimeout(() => {
    if (!exitCode && exitCode !== 0) {
        timedOut = true;
        console.error(`\n=== TIMEOUT REACHED (${TIMEOUT_MS}ms) ===`);
        console.error("Killing PTY process...");
        ptyProcess.kill('SIGTERM');

        // Force kill after 2 seconds if SIGTERM doesn't work
        setTimeout(() => {
            if (!exitCode && exitCode !== 0) {
                console.error("SIGTERM failed, sending SIGKILL...");
                ptyProcess.kill('SIGKILL');
            }
        }, 2000);
    }
}, TIMEOUT_MS);

// Handle PTY data
ptyProcess.onData((data) => {
    const timestamp = Date.now() - startTime;

    if (!hasReceivedData) {
        hasReceivedData = true;
        console.log(`\n=== FIRST DATA RECEIVED at ${timestamp}ms ===`);
    }

    fullOutput += data;

    // Log raw data with escape sequences visible
    const escapedData = data
        .replace(/\x1b/g, '\\x1b')
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n\n'); // Double newline for readability

    console.log(`[${timestamp}ms] RAW DATA (${data.length} bytes):`);
    console.log(escapedData);

    // Also log cleaned data (no ANSI codes)
    const cleanedData = data.replace(/\x1b\[[0-9;]*[mGKHJ]/g, '');
    if (cleanedData.trim()) {
        console.log(`[${timestamp}ms] CLEANED DATA:`);
        console.log(cleanedData);
    }

    // Try to detect JSON lines
    const lines = data.split('\n');
    for (const line of lines) {
        const cleaned = line.trim().replace(/\x1b\[[0-9;]*[mGKHJ]/g, '');
        if (cleaned && cleaned.startsWith('{')) {
            try {
                const json = JSON.parse(cleaned);
                console.log(`[${timestamp}ms] PARSED JSON:`, JSON.stringify(json, null, 2));
            } catch (e) {
                // Not valid JSON, ignore
            }
        }
    }
});

// Handle PTY exit
ptyProcess.onExit(({ exitCode: code, signal }) => {
    exitCode = code;
    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;

    console.log(`\n=== PTY PROCESS EXITED ===`);
    console.log(`Exit Code: ${code}`);
    console.log(`Signal: ${signal}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Timed Out: ${timedOut}`);
    console.log(`Data Received: ${hasReceivedData}`);
    console.log(`Total Output Length: ${fullOutput.length} bytes`);

    if (!hasReceivedData) {
        console.log("\n=== NO DATA RECEIVED ===");
        console.log("The process exited without producing any output.");
    }

    // Save full output to file for analysis
    const outputFile = `claude-pty-output-${Date.now()}.txt`;
    require('fs').writeFileSync(outputFile, fullOutput);
    console.log(`\nFull output saved to: ${outputFile}`);

    // Exit with same code as PTY process
    process.exit(code || (timedOut ? 1 : 0));
});

// Handle script termination
process.on('SIGINT', () => {
    console.log("\n=== INTERRUPTED BY USER ===");
    ptyProcess.kill('SIGTERM');
    process.exit(130);
});
```

### 4. Running the Test

```bash
# From the project directory
cd /Users/christopherdavid/code/commander

# Make the script executable (optional)
chmod +x scripts/test-claude-pty-standalone.js

# Run the test (Claude CLI already authenticated via 'claude auth')
node scripts/test-claude-pty-standalone.js
```

### 5. Expected Outcomes

**If Successful:**
- Should see PTY process spawn with PID
- Should receive data within a few seconds
- Should see raw PTY output (possibly with ANSI codes)
- Should see cleaned JSON lines
- Should exit with code 0
- Output should match what you see in terminal

**If It Fails Like Electron:**
- Will timeout after 30 seconds
- No data received
- Process killed with SIGTERM
- This confirms the issue is not Electron-specific

**If It Works (Unlike Electron):**
- Problem is specific to Electron's process environment
- Can use this working example to debug Electron differences
- May need to use `utilityProcess` or external service approach

### 6. Analysis Points

After running, analyze:

1. **Timing**: How quickly does first data arrive vs timeout?
2. **Output Format**: Is it clean JSON or mixed with terminal codes?
3. **Error Messages**: Any error output before hang/timeout?
4. **Environment Sensitivity**: Try removing/adding env vars to find critical ones
5. **Network Activity**: Run with network monitoring to see if it's making requests

### 7. Next Steps Based on Results

**If PTY test succeeds:**
- Compare exact environment differences with Electron
- Try running same PTY code from Electron's utilityProcess
- Consider PTY service bridge approach

**If PTY test fails:**
- CLI has fundamental issues with programmatic execution
- Try with different Node.js versions
- Consider direct API approach as only viable solution
- Report issue to Anthropic

This standalone test will definitively answer whether `node-pty` can work with the Claude CLI at all, isolating the problem from Electron's specific constraints.
