import { Effect, Layer, Ref, Schema } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { ConfigurationService, ConfigError } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";
import { SWEBenchTaskService } from "./SWEBenchTaskService";
import { SWEBenchTask, SWEBenchTaskSchema } from "./types";
import { TaskNotFoundError, DatasetAccessError } from "./errors";
import path from "path";

export const SWEBenchTaskServiceLive = Layer.effect(
  SWEBenchTaskService,
  Effect.gen(function* () {
    const configService = yield* ConfigurationService;
    const fs = yield* FileSystem;
    const telemetry = yield* TelemetryService;
    const taskCache = yield* Ref.make(new Map<string, SWEBenchTask>());

    const getDatasetPath = () => configService.get("SWE_BENCH_DATASET_PATH").pipe(
      Effect.tapError((e) => 
        telemetry.trackEvent({ category: "swe_bench", action: "get_dataset_path_error", value: e.message }).pipe(
          Effect.catchAll(() => Effect.void)
        )
      )
    );

    return SWEBenchTaskService.of({
      getTask: (instanceId: string) => Effect.gen(function* () {
        const cache = yield* Ref.get(taskCache);
        if (cache.has(instanceId)) {
          yield* telemetry.trackEvent({ category: "swe_bench", action: "get_task_cache_hit", label: instanceId }).pipe(
            Effect.catchAll(() => Effect.void)
          );
          return cache.get(instanceId)!;
        }

        const datasetPath = yield* getDatasetPath();
        const filePath = path.join(datasetPath, `${instanceId}.json`);
        yield* telemetry.trackEvent({ category: "swe_bench", action: "get_task_read_file", label: instanceId, value: filePath }).pipe(
          Effect.catchAll(() => Effect.void)
        );

        const content = yield* fs.readFileString(filePath, "utf-8").pipe(
          Effect.mapError((e) => new TaskNotFoundError({ instanceId, pathSearched: filePath, cause: e }))
        );

        const taskData = yield* Effect.try({
          try: () => JSON.parse(content),
          catch: (e) => new DatasetAccessError({ message: `Failed to parse JSON for task ${instanceId}`, path: filePath, cause: e })
        });

        const task = yield* Schema.decodeUnknown(SWEBenchTaskSchema)(taskData).pipe(
          Effect.mapError((e) => new DatasetAccessError({ message: `Invalid task data schema for ${instanceId}`, path: filePath, cause: e }))
        );

        yield* Ref.update(taskCache, (map) => map.set(instanceId, task));
        yield* telemetry.trackEvent({ category: "swe_bench", action: "get_task_success", label: instanceId }).pipe(
          Effect.catchAll(() => Effect.void)
        );
        return task;
      }),

      listAvailableTaskIds: (subset?: string) => // `subset` is for future use
        Effect.gen(function* () {
          const datasetPath = yield* getDatasetPath();
          yield* telemetry.trackEvent({ category: "swe_bench", action: "list_tasks_start", value: datasetPath }).pipe(
            Effect.catchAll(() => Effect.void)
          );

          const files = yield* fs.readDirectory(datasetPath).pipe(
            Effect.mapError((e) => new DatasetAccessError({ message: `Failed to read dataset directory: ${datasetPath}`, path: datasetPath, cause: e }))
          );

          const taskIds = files
            .filter(file => file.endsWith(".json"))
            .map(file => file.replace(".json", ""));

          yield* telemetry.trackEvent({ category: "swe_bench", action: "list_tasks_success", value: `${taskIds.length} tasks found` }).pipe(
            Effect.catchAll(() => Effect.void)
          );
          return taskIds;
        }),
    });
  })
);