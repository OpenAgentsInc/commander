#!/usr/bin/env node

/**
 * Script to typecheck a specific file or the entire project.
 * Usage: node typecheckFile.js [filepath]
 */

const { execSync } = require('child_process');

// Get the file path from command line arguments
const filePath = process.argv[2];

try {
  if (filePath) {
    console.log(`Typechecking file: ${filePath}`);
    execSync(`tsc --noEmit ${filePath}`, { stdio: 'inherit' });
  } else {
    console.log('Typechecking entire project...');
    execSync('tsc --noEmit', { stdio: 'inherit' });
  }
} catch (error) {
  // The execSync will already print the error output
  process.exit(1);
}