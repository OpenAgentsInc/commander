# Docker Utilities Service

This service provides Docker container management capabilities for the SWE-Bench harness.

## Features

- Container lifecycle management (create, start, stop, remove)
- Docker image pulling with progress tracking
- Container listing and inspection
- Full Effect-TS integration with proper error handling

## Testing

### Unit Tests (No Docker Required)

The unit tests use mocked implementations and don't require Docker:

```bash
pnpm vitest run DockerUtilsServiceMocked.test.ts
```

### Integration Tests (Docker Required)

To test with real Docker, make sure Docker is installed and running, then:

```bash
# Run the integration test
pnpm test:docker

# Or run directly
node scripts/test-docker.js

# Or with tsx
pnpm tsx src/services/docker/test-docker-integration.ts
```

The integration test will:
1. Check Docker is installed and running
2. List existing containers
3. Pull the `hello-world` test image
4. Create a test container
5. Start the container
6. Stop the container (if still running)
7. Remove the container

### Troubleshooting

If the integration tests fail:

1. **Check Docker is installed:**
   ```bash
   docker --version
   ```

2. **Check Docker daemon is running:**
   ```bash
   docker ps
   ```

3. **Platform-specific checks:**
   - **macOS/Windows:** Make sure Docker Desktop is running
   - **Linux:** Check daemon status with `sudo systemctl status docker`

4. **Permission issues (Linux):**
   ```bash
   # Add your user to the docker group
   sudo usermod -aG docker $USER
   # Log out and back in for changes to take effect
   ```

## Usage Example

```typescript
import { Effect } from "effect";
import { DockerUtilsService } from "./DockerUtilsService";
import { DockerUtilsServiceLive } from "./DockerUtilsServiceImpl";

const program = Effect.gen(function* (_) {
  const docker = yield* _(DockerUtilsService);
  
  // List all containers
  const containers = yield* _(docker.listContainers({ all: true }));
  
  // Pull an image
  yield* _(docker.pullImage("nginx:latest"));
  
  // Create and start a container
  const containerId = yield* _(docker.createContainer({
    Image: "nginx:latest",
    name: "my-nginx",
    ExposedPorts: { "80/tcp": {} },
    HostConfig: {
      PortBindings: { "80/tcp": [{ HostPort: "8080" }] }
    }
  }));
  
  yield* _(docker.startContainer(containerId));
});

// Run with proper layer
const layer = DockerUtilsServiceLive.pipe(
  Layer.provide(YourConfigLayer)
);

Effect.runPromise(program.pipe(Effect.provide(layer)));
```