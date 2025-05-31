# SWE-bench Docker Image Building Testing Guide

This guide covers comprehensive testing approaches for the SWE-bench Docker image building system in Commander.

## Overview

The SWE-bench Docker integration builds custom Docker images for running benchmark tasks. This guide covers unit testing, integration testing, and manual testing approaches.

## 1. Unit Test Commands

### Running All Docker-Related Tests

```bash
# Run all Docker service tests
pnpm vitest run DockerUtilsService

# Run in watch mode for development
pnpm vitest -t "DockerUtilsService" --watch

# Run with coverage
pnpm vitest run --coverage DockerUtilsService
```

### Running Specific Test Suites

```bash
# Test Docker connection
pnpm vitest -t "Docker connection tests"

# Test image building
pnpm vitest -t "buildImage"

# Test container management
pnpm vitest -t "container operations"

# Test SWE-bench specific functionality
pnpm vitest -t "SWEBenchTaskService"
```

### Debugging Tests

```bash
# Run with verbose output
DEBUG=commander:docker pnpm vitest run DockerUtilsService

# Run single test with debugging
pnpm vitest -t "should build Docker image with proper tags" --reporter=verbose
```

## 2. Integration Test Setup and Execution

### Prerequisites

1. **Docker Daemon**: Ensure Docker Desktop or Docker Engine is running
2. **Test Images**: Pull required base images

```bash
# Pull test base images
docker pull ubuntu:20.04
docker pull python:3.8-slim

# Verify Docker is accessible
docker info
```

### Setting Up Integration Tests

Create a test environment configuration:

```typescript
// test-docker-integration.ts
import { Effect, Layer } from "effect"
import { DockerUtilsService } from "@/services/docker"
import { ConfigurationService } from "@/services/configuration"

const testConfig = Layer.succeed(
  ConfigurationService,
  ConfigurationService.of({
    get: Effect.succeed,
    set: Effect.succeed,
    getAll: Effect.succeed({
      docker: {
        socketPath: "/var/run/docker.sock",
        buildTimeout: 300000
      }
    })
  })
)

const DockerTestLayer = DockerUtilsService.Live.pipe(
  Layer.provide(testConfig)
)
```

### Running Integration Tests

```bash
# Run integration tests (requires Docker)
INTEGRATION_TEST=true pnpm vitest run test-docker-integration

# Run with specific Docker socket
DOCKER_HOST=unix:///var/run/docker.sock pnpm test:integration

# Run with custom timeout
DOCKER_BUILD_TIMEOUT=600000 pnpm test:integration
```

## 3. Manual Testing Steps

### Testing Docker Connection

```bash
# 1. Check Docker daemon status
docker version

# 2. Test socket permissions
ls -la /var/run/docker.sock

# 3. Run connection test from app
pnpm tsx scripts/test-docker-connection.ts
```

### Testing Image Building

```bash
# 1. Create a test Dockerfile
cat > test.Dockerfile << 'EOF'
FROM ubuntu:20.04
RUN apt-get update && apt-get install -y python3
WORKDIR /app
COPY . .
CMD ["python3", "--version"]
EOF

# 2. Build using the service
pnpm tsx -e "
import { Effect } from 'effect'
import { DockerUtilsService } from './src/services/docker'
import { runtime } from './src/services/runtime'

const program = Effect.gen(function* () {
  const docker = yield* DockerUtilsService
  const result = yield* docker.buildImage({
    dockerfile: './test.Dockerfile',
    tag: 'commander-test:latest',
    buildArgs: {}
  })
  console.log('Build result:', result)
})

Effect.runPromise(program.pipe(Effect.provide(runtime)))
"

# 3. Verify the image
docker images | grep commander-test
```

### Testing Container Operations

```bash
# 1. Run a test container
docker run -d --name test-container ubuntu:20.04 sleep 3600

# 2. Test container operations via service
pnpm tsx scripts/test-container-ops.ts

# 3. Clean up
docker rm -f test-container
```

## 4. Creating Mock SWE-bench Base Images

### Building a Mock Base Image

Create a mock SWE-bench base image for testing without the full dataset:

```dockerfile
# mock-swebench-base.Dockerfile
FROM python:3.8-slim

# Install basic SWE-bench dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create SWE-bench directory structure
RUN mkdir -p /workspace /swe-bench/tasks

# Add mock task data
COPY mock-task.json /swe-bench/tasks/

# Install Python test dependencies
RUN pip install pytest pytest-cov

WORKDIR /workspace

# Add entrypoint script
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

### Building the Mock Image

```bash
# 1. Create mock task data
cat > mock-task.json << 'EOF'
{
  "instance_id": "test-001",
  "repo": "test/repo",
  "base_commit": "abc123",
  "problem_statement": "Fix the bug in test.py",
  "test_patch": "def test_fix():\n    assert True"
}
EOF

# 2. Create entrypoint script
cat > entrypoint.sh << 'EOF'
#!/bin/bash
echo "SWE-bench mock environment ready"
exec "$@"
EOF

# 3. Build the mock image
docker build -f mock-swebench-base.Dockerfile -t swebench-mock:latest .

# 4. Test the mock image
docker run --rm swebench-mock:latest python --version
```

### Using Mock Images in Tests

```typescript
// In your test files
const mockDockerService = DockerUtilsService.of({
  buildImage: ({ tag }) => 
    Effect.succeed({
      imageId: "mock-image-123",
      tag: tag || "swebench-mock:latest",
      size: 100000000,
      created: new Date().toISOString()
    })
})
```

## 5. Testing with Real SWE-bench Tasks

### Setting Up Real Task Testing

```bash
# 1. Pull official SWE-bench base image (if available)
docker pull swebench/base:latest

# 2. Download a real task dataset
wget https://github.com/princeton-nlp/SWE-bench/raw/main/data/test/django__django-11999.json
```

### Running Real Task Tests

```typescript
// test-real-swebench-task.ts
import { Effect } from "effect"
import { SWEBenchTaskService } from "@/services/swe_bench_harness"
import { runtime } from "@/services/runtime"

const testRealTask = Effect.gen(function* () {
  const taskService = yield* SWEBenchTaskService
  
  // Load real task
  const task = {
    instance_id: "django__django-11999",
    repo: "django/django",
    base_commit: "419a78300f7cd27611196e1e464d50fd0385ff27",
    problem_statement: "...",
    test_patch: "..."
  }
  
  // Build environment
  const buildResult = yield* taskService.buildTaskEnvironment(task)
  console.log("Build completed:", buildResult)
  
  // Run tests
  const testResult = yield* taskService.runTaskTests(
    task.instance_id,
    "def test_solution():\n    pass"
  )
  console.log("Test results:", testResult)
})

Effect.runPromise(testRealTask.pipe(Effect.provide(runtime)))
```

### Performance Testing

```bash
# 1. Test build performance
time docker build -f swebench.Dockerfile -t test-build .

# 2. Monitor resource usage
docker stats --no-stream

# 3. Test parallel builds
parallel -j 4 docker build -t "test-{}" ::: 1 2 3 4
```

## Troubleshooting

### Common Issues

1. **Docker socket permission denied**
   ```bash
   # Fix on Linux
   sudo usermod -aG docker $USER
   newgrp docker
   
   # Fix on macOS
   # Ensure Docker Desktop is running
   ```

2. **Build timeout errors**
   ```bash
   # Increase timeout in tests
   DOCKER_BUILD_TIMEOUT=600000 pnpm test
   ```

3. **Out of space errors**
   ```bash
   # Clean up Docker resources
   docker system prune -a
   docker volume prune
   ```

### Debug Logging

Enable detailed logging for troubleshooting:

```typescript
// In your test setup
import { Logger } from "effect"

const DebugLayer = Logger.minimumLogLevel(Logger.Level.Debug)

// Apply to your test runtime
const testRuntime = runtime.pipe(
  Layer.provide(DebugLayer)
)
```

## CI/CD Integration

### GitHub Actions Setup

```yaml
# .github/workflows/docker-tests.yml
name: Docker Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      docker:
        image: docker:dind
        options: --privileged
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Docker
        run: |
          docker info
          docker pull ubuntu:20.04
      
      - name: Run Docker tests
        run: |
          pnpm install
          pnpm test:docker:integration
```

## Best Practices

1. **Test Isolation**: Always clean up containers and images after tests
2. **Mock First**: Use mocks for unit tests, real Docker for integration tests
3. **Resource Limits**: Set memory and CPU limits for test containers
4. **Parallel Testing**: Be careful with parallel tests that might conflict
5. **Error Handling**: Always test error cases (daemon down, build failures, etc.)

## Additional Resources

- [Docker API Documentation](https://docs.docker.com/engine/api/)
- [SWE-bench Repository](https://github.com/princeton-nlp/SWE-bench)
- [Effect Testing Guide](https://effect.website/docs/guides/testing)
- [Vitest Documentation](https://vitest.dev/)