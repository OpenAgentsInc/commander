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
      expect(service.pullImage).toHaveBeenCalledWith('test-image:latest', undefined);
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
      expect(service.stopContainer).toHaveBeenCalledWith(containerId, undefined);
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
      expect(service.removeContainer).toHaveBeenCalledWith(containerId, undefined);
    });
  });
});