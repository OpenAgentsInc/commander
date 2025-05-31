import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect, Exit, Layer } from 'effect';
import Dockerode from 'dockerode';
import { DockerUtilsService } from '@/services/docker/DockerUtilsService';
import { DockerUtilsServiceLive } from '@/services/docker/DockerUtilsServiceImpl';
import { DockerError, DockerOperationError, DockerConnectionError } from '@/services/docker/errors';
import { ConfigurationService, DefaultDevConfigLayer } from '@/services/configuration';

const mockListContainers = vi.fn();
const mockPull = vi.fn();
const mockModemFollowProgress = vi.fn();
const mockCreateContainer = vi.fn();
const mockGetContainer = vi.fn();
const mockContainerStart = vi.fn();
const mockContainerStop = vi.fn();
const mockContainerRemove = vi.fn();
const mockPing = vi.fn();

vi.mock('dockerode', () => ({
  default: vi.fn().mockImplementation(() => ({
    listContainers: mockListContainers,
    pull: mockPull,
    modem: {
      followProgress: mockModemFollowProgress,
    },
    createContainer: mockCreateContainer,
    getContainer: mockGetContainer,
    ping: mockPing,
  })),
}));

const testLayer = DockerUtilsServiceLive.pipe(
  Layer.provide(DefaultDevConfigLayer)
);

describe('DockerUtilsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations for success
    mockPing.mockResolvedValue("OK");
  });

  describe('listContainers', () => {
    it('should list containers successfully', async () => {
      const mockContainerList = [{ Id: '123', Names: ['/test'] }] as Dockerode.ContainerInfo[];
      mockListContainers.mockResolvedValue(mockContainerList);

      const program = Effect.flatMap(DockerUtilsService, (service) => service.listContainers());
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        expect(result.value).toEqual(mockContainerList);
      }
      expect(mockListContainers).toHaveBeenCalled();
    });

    it('should return DockerError on failure', async () => {
      mockListContainers.mockRejectedValue(new Error('Docker daemon error'));

      const program = Effect.flatMap(DockerUtilsService, (service) => service.listContainers());
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result)) {
        const error = result.cause.error as DockerError;
        expect(error._tag).toBe('DockerError');
        expect(error.message).toContain('Failed to list containers');
      }
    });
  });

  describe('pullImage', () => {
    it('should pull an image successfully', async () => {
      mockPull.mockImplementation((_imageName, _options, callback) => {
        const mockStream = {
          on: vi.fn().mockReturnThis(), pipe: vi.fn().mockReturnThis()
        };
        mockModemFollowProgress.mockImplementation((stream, onFinished) => {
            onFinished(null, [{ status: 'Downloaded' }]);
        });
        if (typeof callback === 'function') callback(null, mockStream);
        return mockStream;
      });

      const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isSuccess(result)).toBe(true);
      expect(mockPull).toHaveBeenCalledWith('test-image:latest', {}, expect.any(Function));
      expect(mockModemFollowProgress).toHaveBeenCalled();
    });

    it('should return DockerOperationError on pull failure reported by followProgress', async () => {
      mockPull.mockImplementation((_imageName, _options, callback) => {
        const mockStream = { on: vi.fn().mockReturnThis(), pipe: vi.fn().mockReturnThis() };
        mockModemFollowProgress.mockImplementation((stream, onFinished) => {
            onFinished(new Error('Network error during pull'), null);
        });
        if (typeof callback === 'function') callback(null, mockStream);
        return mockStream;
      });

      const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result)) {
        const error = result.cause.error as DockerOperationError;
        expect(error._tag).toBe('DockerOperationError');
        expect(error.message).toContain('Failed to pull image test-image:latest');
        expect(error.operation).toBe('pullImage');
        expect(error.imageName).toBe('test-image:latest');
      }
    });

    it('should return DockerOperationError if pull stream itself errors', async () => {
      mockPull.mockImplementation((_imageName, _options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Stream creation failed'), undefined);
        } else {
          // If Dockerode version returns Promise that might reject for stream
          return Promise.reject(new Error('Stream creation failed'));
        }
        return undefined; // Or mock stream that emits error
      });

      const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result)) {
        const error = result.cause.error as DockerOperationError;
        expect(error._tag).toBe('DockerOperationError');
        expect(error.message).toContain('Docker pull stream error for test-image:latest');
      }
    });

    it('should return DockerOperationError if pull stream is not provided by Dockerode', async () => {
        mockPull.mockImplementation((_imageName, _options, callback) => {
          if (typeof callback === 'function') {
            callback(null, undefined); // Simulate no stream
          }
          return undefined;
        });

        const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
        const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

        expect(Exit.isFailure(result)).toBe(true);
        if (Exit.isFailure(result)) {
          const error = result.cause.error as DockerOperationError;
          expect(error._tag).toBe('DockerOperationError');
          expect(error.message).toContain('No stream returned for pull test-image:latest');
        }
    });

    it('should return DockerOperationError if followProgress output indicates error', async () => {
        mockPull.mockImplementation((_imageName, _options, callback) => {
          const mockStream = { on: vi.fn().mockReturnThis(), pipe: vi.fn().mockReturnThis() };
          mockModemFollowProgress.mockImplementation((stream, onFinished) => {
              onFinished(null, [{ error: 'Image not found', errorDetail: { message: 'Image not found in repository' } }]);
          });
          if (typeof callback === 'function') callback(null, mockStream);
          return mockStream;
        });

        const program = Effect.flatMap(DockerUtilsService, (service) => service.pullImage('test-image:latest'));
        const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

        expect(Exit.isFailure(result)).toBe(true);
        if (Exit.isFailure(result)) {
          const error = result.cause.error as DockerOperationError;
          expect(error._tag).toBe('DockerOperationError');
          expect(error.message).toContain('Failed to pull image test-image:latest: Image not found');
        }
      });
  });

  describe('createContainer', () => {
    const containerOptions: Dockerode.ContainerCreateOptions = { Image: 'test-image' };
    it('should create a container successfully and return its ID', async () => {
      const mockContainerInspect = { id: 'container-id-123' }; // createContainer returns a Container obj, not just id.
      const mockContainerObj = { id: 'container-id-123', inspect: vi.fn().mockResolvedValue(mockContainerInspect) };
      mockCreateContainer.mockResolvedValue(mockContainerObj);

      const program = Effect.flatMap(DockerUtilsService, (service) => service.createContainer(containerOptions));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isSuccess(result)).toBe(true);
      if (Exit.isSuccess(result)) {
        expect(result.value).toBe('container-id-123');
      }
      expect(mockCreateContainer).toHaveBeenCalledWith(containerOptions);
    });

    it('should return DockerOperationError on createContainer failure', async () => {
      mockCreateContainer.mockRejectedValue(new Error('Create container failed'));

      const program = Effect.flatMap(DockerUtilsService, (service) => service.createContainer(containerOptions));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result)) {
        const error = result.cause.error as DockerOperationError;
        expect(error._tag).toBe('DockerOperationError');
        expect(error.message).toContain('Failed to create container');
        expect(error.operation).toBe('createContainer');
      }
    });
  });

  describe('startContainer', () => {
    const containerId = 'container-id-123';

    beforeEach(() => {
        mockGetContainer.mockReturnValue({ start: mockContainerStart });
    });

    it('should start a container successfully', async () => {
      mockContainerStart.mockResolvedValue(undefined);

      const program = Effect.flatMap(DockerUtilsService, (service) => service.startContainer(containerId));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isSuccess(result)).toBe(true);
      expect(mockGetContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainerStart).toHaveBeenCalled();
    });

    it('should return DockerOperationError on startContainer failure', async () => {
      mockContainerStart.mockRejectedValue(new Error('Start container failed'));

      const program = Effect.flatMap(DockerUtilsService, (service) => service.startContainer(containerId));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result)) {
        const error = result.cause.error as DockerOperationError;
        expect(error._tag).toBe('DockerOperationError');
        expect(error.message).toContain('Failed to start container');
        expect(error.containerId).toBe(containerId);
        expect(error.operation).toBe('startContainer');
      }
    });
  });

  describe('stopContainer', () => {
    const containerId = 'container-id-123';

    beforeEach(() => {
        mockGetContainer.mockReturnValue({ stop: mockContainerStop });
    });

    it('should stop a container successfully', async () => {
      mockContainerStop.mockResolvedValue(undefined);

      const program = Effect.flatMap(DockerUtilsService, (service) => service.stopContainer(containerId));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isSuccess(result)).toBe(true);
      expect(mockGetContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainerStop).toHaveBeenCalled();
    });

    it('should return DockerOperationError on stopContainer failure', async () => {
      mockContainerStop.mockRejectedValue(new Error('Stop container failed'));

      const program = Effect.flatMap(DockerUtilsService, (service) => service.stopContainer(containerId));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isFailure(result)).toBe(true);
       if (Exit.isFailure(result)) {
        const error = result.cause.error as DockerOperationError;
        expect(error._tag).toBe('DockerOperationError');
        expect(error.message).toContain('Failed to stop container');
        expect(error.containerId).toBe(containerId);
        expect(error.operation).toBe('stopContainer');
      }
    });
  });

  describe('removeContainer', () => {
    const containerId = 'container-id-123';

    beforeEach(() => {
        mockGetContainer.mockReturnValue({ remove: mockContainerRemove });
    });

    it('should remove a container successfully', async () => {
      mockContainerRemove.mockResolvedValue(undefined);

      const program = Effect.flatMap(DockerUtilsService, (service) => service.removeContainer(containerId));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isSuccess(result)).toBe(true);
      expect(mockGetContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainerRemove).toHaveBeenCalled();
    });

    it('should return DockerOperationError on removeContainer failure', async () => {
      mockContainerRemove.mockRejectedValue(new Error('Remove container failed'));

      const program = Effect.flatMap(DockerUtilsService, (service) => service.removeContainer(containerId));
      const result = await Effect.runPromiseExit(Effect.provide(program, testLayer));

      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result)) {
        const error = result.cause.error as DockerOperationError;
        expect(error._tag).toBe('DockerOperationError');
        expect(error.message).toContain('Failed to remove container');
        expect(error.containerId).toBe(containerId);
        expect(error.operation).toBe('removeContainer');
      }
    });
  });
});