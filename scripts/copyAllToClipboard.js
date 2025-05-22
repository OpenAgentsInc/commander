#!/usr/bin/env node

/**
 * Script to recursively copy the contents of all files in specified directories to the clipboard
 * with proper formatting for documentation purposes.
 *
 * Usage: node copyAllToClipboard.js [options]
 *   --docs: Only copy files from the docs/ directory and its subdirectories
 *   --types: Prepend TypeScript check results (runs "pnpm run t") to the copied content
 *   --tests: Prepend test results (runs "pnpm test") to the copied content
 *   --tt: Prepend both TypeScript check and test results to the copied content
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// In CommonJS, __dirname is available globally

// Directories to recursively scan
const dirsToScan = ["docs", "src", "node_modules/@effect/ai-openai/dist/dts/"];

// Directories to exclude
const dirsToExclude = [
  "src/assets/fonts",
  "docs/logs/20250514",
  "docs/logs/20250515",
  "docs/logs/20250516",
  "docs/logs/20250517",
  "docs/logs/20250518",
  "docs/logs/20250519",
  "docs/logs/20250520",
  "docs/logs/20250521",
  "docs/logs/20250522/ignore",
  // "docs",
  // "src/services/",
  // "src/tests/",
  // "src/components/ui",
];

// Files to explicitly include from root
const rootFilesToInclude = [
  // "node_modules/@effect/ai-openai/dist/dts/OpenAiClient.d.ts",
  // "node_modules/@buildonspark/spark-sdk/src/spark-wallet.ts",
  // "node_modules/@buildonspark/spark-sdk/src/nice-grpc-web.ts",
  // "node_modules/@buildonspark/spark-sdk/src/errors/base.ts",
  // "node_modules/@buildonspark/spark-sdk/src/errors/types.ts",
  // "node_modules/@buildonspark/spark-sdk/src/signer/signer.ts",
  // "node_modules/@buildonspark/spark-sdk/src/services/lightning.ts",
  // "node_modules/@buildonspark/spark-sdk/src/services/config.ts",
  // "node_modules/@buildonspark/spark-sdk/src/services/connection.ts",
  // "node_modules/@buildonspark/spark-sdk/src/services/deposit.ts",
  // "node_modules/@buildonspark/spark-sdk/src/services/transfer.ts",
  // "node_modules/@buildonspark/spark-sdk/src/services/wallet-config.ts",
  // 'node_modules/@effect/platform/dist/dts/HttpClient.d.ts',
  // 'node_modules/@effect/platform/dist/dts/HttpClientRequest.d.ts',
  // 'node_modules/@effect/platform/dist/dts/HttpClientResponse.d.ts',
  // 'node_modules/@effect/platform/dist/dts/HttpBody.d.ts',
  // "node_modules/nostr-tools/README.md",
  // "node_modules/nostr-tools/lib/types/nip04.d.ts",
  // "node_modules/nostr-tools/lib/esm/nip04.js",
  // "node_modules/nostr-tools/lib/types/nip19.d.ts",
  // "node_modules/nostr-tools/lib/esm/nip19.js",
  // "node_modules/nostr-tools/lib/types/core.d.ts",
  // "node_modules/nostr-tools/lib/types/relay.d.ts",
  // "node_modules/nostr-tools/lib/types/abstract-pool.d.ts",
  // "node_modules/nostr-tools/lib/types/abstract-relay.d.ts",
  // "node_modules/@scure/bip32/lib/index.d.ts",
  // "node_modules/@scure/bip32/index.ts",
  // "node_modules/@scure/bip39/index.d.ts",
  // "node_modules/@scure/bip39/src/index.ts",
  "README.md",
  // "README-template.md",
  // "forge.config.ts",
  // "forge.env.d.ts",
  "index.html",
  "package.json",
  "tsconfig.json",
  // "vite.main.config.mts",
  // "vite.preload.config.mts",
  // "vite.renderer.config.mts",
  // "vitest.config.mts",
  // "playwright.config.ts",
  // "components.json",
  // "eslint.config.mjs",
];

// Files to explicitly exclude from root
const rootFilesToExclude = [
  "LICENSE",
  "pnpm-lock.yaml",
  ".gitignore",
  ".npmrc",
  ".prettierignore",
  ".prettierrc",
];

// Function to get file extension
const getFileExtension = (filePath) => {
  return path.extname(filePath).slice(1);
};

// Function to determine the language for markdown code blocks
const getLanguage = (ext) => {
  const languageMap = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    json: "json",
    html: "html",
    css: "css",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
  };
  return languageMap[ext] || "";
};

// Function to run a command and return its output
const runCommand = (command) => {
  try {
    console.log(`Running: ${command}`);
    return execSync(command, { encoding: "utf8" });
  } catch (error) {
    console.error(`Error running ${command}:`, error.message);
    // Return both stdout and stderr from the error
    return `Command failed with exit code ${error.status}:\n\n${error.stdout || ""}\n${error.stderr || ""}\n`;
  }
};

// Function to copy text to clipboard
const copyToClipboard = (text) => {
  // For macOS
  try {
    execSync("pbcopy", { input: text });
    console.log("Content copied to clipboard!");
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
  }
};

// Function to check if a path should be excluded
const shouldExclude = (filePath) => {
  return dirsToExclude.some(
    (excludedDir) =>
      filePath.startsWith(excludedDir) || filePath === excludedDir,
  );
};

// Function to check if a file should be excluded
const shouldExcludeFile = (filePath) => {
  const baseName = path.basename(filePath);
  return rootFilesToExclude.includes(baseName);
};

// Function to recursively collect all files in a directory
const collectFilesRecursively = (dir, fileList = []) => {
  // Skip if this directory should be excluded
  if (shouldExclude(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(process.cwd(), filePath);

    // Skip excluded directories, node_modules, .git directories, hidden files, and excluded root files
    if (
      file.startsWith(".") ||
      file === "node_modules" ||
      shouldExclude(relativePath) ||
      shouldExcludeFile(relativePath)
    ) {
      return;
    }

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      collectFilesRecursively(filePath, fileList);
    } else {
      fileList.push(relativePath);
    }
  });

  return fileList;
};

// Check for command line arguments
const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    docsOnly: args.includes("--docs"),
    runTypes: args.includes("--types") || args.includes("--tt"),
    runTests: args.includes("--tests") || args.includes("--tt"),
  };
};

// Main function to read files and format content
const main = () => {
  const { docsOnly, runTypes, runTests } = parseArgs();
  let allFiles = [];
  let clipboardContent = "";

  if (docsOnly) {
    console.log(
      "📚 Docs mode enabled: copying only files from docs/ directory",
    );
    // Only scan the docs directory
    if (fs.existsSync("docs")) {
      collectFilesRecursively("docs", allFiles);
    } else {
      console.log(`⚠️ Directory not found: docs`);
    }
  } else {
    // Add root files
    rootFilesToInclude.forEach((file) => {
      if (fs.existsSync(file)) {
        allFiles.push(file);
      } else {
        console.log(`⚠️ Root file not found: ${file}`);
      }
    });

    // Recursively collect files from specified directories
    dirsToScan.forEach((dir) => {
      if (fs.existsSync(dir)) {
        collectFilesRecursively(dir, allFiles);
      } else {
        console.log(`⚠️ Directory not found: ${dir}`);
      }
    });
  }

  // Sort files by path for better organization
  allFiles.sort();

  let processedCount = 0;

  // Add a description if running TypeScript checks or tests
  if (runTypes || runTests) {
    clipboardContent += "# Code Quality Report\n\n";
    clipboardContent += "Generated on: " + new Date().toISOString() + "\n\n";
  }

  // Run TypeScript checks if requested
  if (runTypes) {
    console.log("🔍 Running TypeScript checks with 'pnpm run t'...");
    const typeCheckOutput = runCommand("pnpm run t");
    clipboardContent += "## TypeScript Check Results\n\n";
    clipboardContent += "```\n";
    clipboardContent += typeCheckOutput;
    clipboardContent += "```\n\n";

    if (!typeCheckOutput.includes("Command failed")) {
      console.log("✅ TypeScript check completed");
    } else {
      console.log("⚠️ TypeScript check completed with issues");
    }
  }

  // Run tests if requested
  if (runTests) {
    console.log("🧪 Running tests with 'pnpm test'...");
    const testOutput = runCommand("pnpm test");
    clipboardContent += "## Test Results\n\n";
    clipboardContent += "```\n";
    clipboardContent += testOutput;
    clipboardContent += "```\n\n";

    if (!testOutput.includes("Command failed")) {
      console.log("✅ Tests completed");
    } else {
      console.log("⚠️ Tests completed with issues");
    }
  }

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const ext = getFileExtension(filePath);
      const language = getLanguage(ext);

      clipboardContent += `File: ${filePath}\n\n`;
      clipboardContent += "```" + language + "\n";
      clipboardContent += content;
      clipboardContent += "\n```\n\n";

      processedCount++;
      console.log(`✅ Added ${filePath}`);
    } catch (error) {
      console.error(`❌ Error reading ${filePath}:`, error);
    }
  }

  // Copy the formatted content to clipboard
  copyToClipboard(clipboardContent);

  console.log("\nTotal files processed:", processedCount);
  console.log("Total character count:", clipboardContent.length);
};

// Run the main function
main();
