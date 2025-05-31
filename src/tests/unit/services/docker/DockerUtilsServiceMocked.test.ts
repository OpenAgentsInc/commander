import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Effect, Exit, Layer, Context } from 'effect';
import type Dockerode from 'dockerode';
import { DockerUtilsService } from '@/services/docker/DockerUtilsService';
import { DockerError, DockerOperationError } from '@/services/docker/errors';

// Create a test implementation that doesn't try to connect to Docker
const DockerUtilsServiceTest = Layer.succeed(
  DockerUtilsService,
  DockerUtilsService.of({
    listContainers: vi.fn(),
    pullImage: vi.fn(),
    createContainer: vi.fn(),
    startContainer: vi.fn(),
    stopContainer: vi.fn(),
    removeContainer: vi.fn(),
    copyToContainer: vi.fn(),
    copyFromContainer: vi.fn(),
    execInContainer: vi.fn(),
  })
);

describe('DockerUtilsService with Test Layer', () => {
  let service: DockerUtilsService;

  beforeEach(async () => {
    const serviceEffect = DockerUtilsService.pipe(
      Effect.provide(DockerUtilsServiceTest)
    );
    service = await Effect.runPromise(serviceEffect);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('listContainers', () => {
    it('should list containers successfully', async () => {
      const mockContainerList: Dockerode.ContainerInfo[] = [
        { Id: '123', Names: ['/test'] } as Dockerode.ContainerInfo
      ];
      
      vi.mocked(service.listContainers).mockImplementation(() =>
        Effect.succeed(mockContainerList)
      );

      const result = await Effect.runPromise(service.listContainers());
      expect(result).toEqual(mockContainerList);
      expect(service.listContainers).toHaveBeenCalled();
    });

    it('should return DockerError on failure', async () => {
      vi.mocked(service.listContainers).mockImplementation(() =>
        Effect.fail(new DockerError({ message: "Failed to list containers" }))
      );

      const result = await Effect.runPromiseExit(service.listContainers());
      expect(Exit.isFailure(result)).toBe(true);
      
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        const error = result.cause.error as DockerError;
        expect(error._tag).toBe('DockerError');
        expect(error.message).toBe('Failed to list containers');
      }
    });
  });

  describe('pullImage', () => {
    it('should pull an image successfully', async () => {
      vi.mocked(service.pullImage).mockImplementation(() =>
        Effect.succeed(undefined)
      );

      const result = await Effect.runPromise(service.pullImage('test-image:latest'));
      expect(result).toBeUndefined();
      expect(service.pullImage).toHaveBeenCalledWith('test-image:latest');
    });

    it('should return DockerOperationError on failure', async () => {
      vi.mocked(service.pullImage).mockImplementation(() =>
        Effect.fail(new DockerOperationError({
          message: "Failed to pull image",
          operation: "pullImage",
          imageName: "test-image:latest"
        }))
      );

      const result = await Effect.runPromiseExit(service.pullImage('test-image:latest'));
      expect(Exit.isFailure(result)).toBe(true);
      
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        const error = result.cause.error as DockerOperationError;
        expect(error._tag).toBe('DockerOperationError');
        expect(error.operation).toBe('pullImage');
        expect(error.imageName).toBe('test-image:latest');
      }
    });
  });

  describe('createContainer', () => {
    it('should create a container and return its ID', async () => {
      const containerId = 'container-123';
      vi.mocked(service.createContainer).mockImplementation(() =>
        Effect.succeed(containerId)
      );

      const options: Dockerode.ContainerCreateOptions = { Image: 'test-image' };
      const result = await Effect.runPromise(service.createContainer(options));
      expect(result).toBe(containerId);
      expect(service.createContainer).toHaveBeenCalledWith(options);
    });
  });

  describe('startContainer', () => {
    it('should start a container successfully', async () => {
      vi.mocked(service.startContainer).mockImplementation(() =>
        Effect.succeed(undefined)
      );

      const containerId = 'container-123';
      const result = await Effect.runPromise(service.startContainer(containerId));
      expect(result).toBeUndefined();
      expect(service.startContainer).toHaveBeenCalledWith(containerId);
    });
  });

  describe('stopContainer', () => {
    it('should stop a container successfully', async () => {
      vi.mocked(service.stopContainer).mockImplementation(() =>
        Effect.succeed(undefined)
      );

      const containerId = 'container-123';
      const result = await Effect.runPromise(service.stopContainer(containerId));
      expect(result).toBeUndefined();
      expect(service.stopContainer).toHaveBeenCalledWith(containerId);
    });
  });

  describe('removeContainer', () => {
    it('should remove a container successfully', async () => {
      vi.mocked(service.removeContainer).mockImplementation(() =>
        Effect.succeed(undefined)
      );

      const containerId = 'container-123';
      const result = await Effect.runPromise(service.removeContainer(containerId));
      expect(result).toBeUndefined();
      expect(service.removeContainer).toHaveBeenCalledWith(containerId);
    });
  });

  describe('copyToContainer', () => {
    it('should copy files to container successfully', async () => {
      vi.mocked(service.copyToContainer).mockImplementation(() =>
        Effect.succeed(undefined)
      );

      const containerId = 'container-123';
      const srcPath = '/host/path/file.txt';
      const destPath = '/container/path/file.txt';
      
      const result = await Effect.runPromise(service.copyToContainer(containerId, srcPath, destPath));
      expect(result).toBeUndefined();
      expect(service.copyToContainer).toHaveBeenCalledWith(containerId, srcPath, destPath);
    });

    it('should return DockerOperationError on failure', async () => {
      vi.mocked(service.copyToContainer).mockImplementation(() =>
        Effect.fail(new DockerOperationError({
          message: "Failed to copy to container",
          operation: "copyToContainer",
          containerId: "container-123"
        }))
      );

      const result = await Effect.runPromiseExit(
        service.copyToContainer('container-123', '/src', '/dest')
      );
      expect(Exit.isFailure(result)).toBe(true);
      
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        const error = result.cause.error as DockerOperationError;
        expect(error._tag).toBe('DockerOperationError');
        expect(error.operation).toBe('copyToContainer');
      }
    });
  });

  describe('copyFromContainer', () => {
    it('should copy files from container successfully', async () => {
      const mockStream = { pipe: vi.fn() } as unknown as NodeJS.ReadableStream;
      vi.mocked(service.copyFromContainer).mockImplementation(() =>
        Effect.succeed(mockStream)
      );

      const containerId = 'container-123';
      const srcPath = '/container/path/file.txt';
      
      const result = await Effect.runPromise(service.copyFromContainer(containerId, srcPath));
      expect(result).toBe(mockStream);
      expect(service.copyFromContainer).toHaveBeenCalledWith(containerId, srcPath);
    });

    it('should return DockerOperationError on failure', async () => {
      vi.mocked(service.copyFromContainer).mockImplementation(() =>
        Effect.fail(new DockerOperationError({
          message: "Failed to copy from container",
          operation: "copyFromContainer",
          containerId: "container-123"
        }))
      );

      const result = await Effect.runPromiseExit(
        service.copyFromContainer('container-123', '/src')
      );
      expect(Exit.isFailure(result)).toBe(true);
      
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        const error = result.cause.error as DockerOperationError;
        expect(error._tag).toBe('DockerOperationError');
        expect(error.operation).toBe('copyFromContainer');
      }
    });
  });

  describe('execInContainer', () => {
    it('should execute command in container successfully', async () => {
      const mockExecResult = {
        stdout: 'Hello from container',
        stderr: '',
        exitCode: 0
      };
      vi.mocked(service.execInContainer).mockImplementation(() =>
        Effect.succeed(mockExecResult)
      );

      const containerId = 'container-123';
      const cmd = ['echo', 'Hello from container'];
      
      const result = await Effect.runPromise(service.execInContainer(containerId, cmd));
      expect(result).toEqual(mockExecResult);
      expect(service.execInContainer).toHaveBeenCalledWith(containerId, cmd);
    });

    it('should execute command with options', async () => {
      const mockExecResult = {
        stdout: 'Working dir content',
        stderr: '',
        exitCode: 0
      };
      vi.mocked(service.execInContainer).mockImplementation(() =>
        Effect.succeed(mockExecResult)
      );

      const containerId = 'container-123';
      const cmd = ['ls', '-la'];
      const options = {
        WorkingDir: '/app',
        Env: ['NODE_ENV=test'],
        User: 'node'
      };
      
      const result = await Effect.runPromise(service.execInContainer(containerId, cmd, options));
      expect(result).toEqual(mockExecResult);
      expect(service.execInContainer).toHaveBeenCalledWith(containerId, cmd, options);
    });

    it('should return DockerOperationError on failure', async () => {
      vi.mocked(service.execInContainer).mockImplementation(() =>
        Effect.fail(new DockerOperationError({
          message: "Failed to execute command",
          operation: "execInContainer",
          containerId: "container-123"
        }))
      );

      const result = await Effect.runPromiseExit(
        service.execInContainer('container-123', ['echo', 'test'])
      );
      expect(Exit.isFailure(result)).toBe(true);
      
      if (Exit.isFailure(result) && result.cause._tag === 'Fail') {
        const error = result.cause.error as DockerOperationError;
        expect(error._tag).toBe('DockerOperationError');
        expect(error.operation).toBe('execInContainer');
      }
    });

    it('should handle non-zero exit codes', async () => {
      const mockExecResult = {
        stdout: '',
        stderr: 'Command not found',
        exitCode: 127
      };
      vi.mocked(service.execInContainer).mockImplementation(() =>
        Effect.succeed(mockExecResult)
      );

      const result = await Effect.runPromise(
        service.execInContainer('container-123', ['nonexistent-command'])
      );
      expect(result.exitCode).toBe(127);
      expect(result.stderr).toBe('Command not found');
    });
  });
});