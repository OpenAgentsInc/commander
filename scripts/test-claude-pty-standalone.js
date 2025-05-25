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