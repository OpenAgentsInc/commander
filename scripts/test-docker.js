#!/usr/bin/env node
/**
 * Simple Docker Integration Test
 * 
 * Run with: node scripts/test-docker.js
 * 
 * This tests the Docker service with real Docker daemon
 */

const { execSync } = require('child_process');

console.log('🐳 Docker Integration Test\n');

// First check if Docker is available
try {
  console.log('Checking Docker installation...');
  const version = execSync('docker --version', { encoding: 'utf8' });
  console.log('✓ Docker found:', version.trim());
} catch (error) {
  console.error('❌ Docker not found or not running!');
  console.error('Please install Docker and make sure it\'s running.');
  process.exit(1);
}

// Check if Docker daemon is running
try {
  console.log('\nChecking Docker daemon...');
  execSync('docker ps', { stdio: 'pipe' });
  console.log('✓ Docker daemon is running');
} catch (error) {
  console.error('❌ Docker daemon is not running!');
  console.error('Please start Docker Desktop (macOS/Windows) or docker service (Linux)');
  process.exit(1);
}

// Now run the TypeScript integration test
console.log('\nRunning integration tests...\n');

try {
  // Compile and run the TypeScript test
  execSync('pnpm tsx src/services/docker/test-docker-integration.ts', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('\n❌ Integration tests failed!');
  process.exit(1);
}