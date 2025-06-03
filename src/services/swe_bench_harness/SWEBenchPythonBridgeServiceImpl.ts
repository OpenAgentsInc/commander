import { Effect, Layer, Stream, Chunk, Queue, Scope } from "effect";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as readline from "readline";
import { 
  SWEBenchPythonBridgeService, 
  PythonBridgeError, 
  EvaluationProgress,
  SWEBenchPrediction,
  EvaluationOptions 
} from "./SWEBenchPythonBridgeService";
import { TelemetryService } from "@/services/telemetry";
import { FileSystem } from "@effect/platform/FileSystem";

export const SWEBenchPythonBridgeServiceLive = Layer.effect(
  SWEBenchPythonBridgeService,
  Effect.gen(function* () {
    const telemetry = yield* TelemetryService;
    const fs = yield* FileSystem;
    
    let initialized = false;
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || "python3";
    const projectRoot = process.cwd();
    
    // Python script path relative to compiled JS location
    const pythonScript = path.join(
      projectRoot,
      "src",
      "services",
      "swe_bench_harness",
      "python-bridge",
      "swebench_runner.py"
    );
    
    return SWEBenchPythonBridgeService.of({
      isInitialized: () => Effect.succeed(initialized),
      
      initialize: () =>
        Effect.gen(function* () {
          if (initialized) return;
          
          // Check Python is available
          yield* Effect.tryPromise({
            try: () => {
              return new Promise<void>((resolve, reject) => {
                const proc = spawn(pythonExecutable, ["--version"]);
                let output = "";
                
                proc.stdout.on("data", (data) => {
                  output += data.toString();
                });
                
                proc.on("close", (code) => {
                  if (code === 0) {
                    // Log Python version outside of Effect context
                    telemetry.trackEvent({
                      category: "swebench_python_bridge",
                      action: "python_check",
                      label: output.trim()
                    }).pipe(Effect.catchAll(() => Effect.void)).pipe(Effect.runSync);
                    resolve();
                  } else {
                    reject(new Error(`Python not found or returned exit code ${code}`));
                  }
                });
                
                proc.on("error", (err) => {
                  reject(err);
                });
              });
            },
            catch: (e) => new PythonBridgeError({ message: `Python check failed: ${e}`, cause: e })
          });
          
          // Check script exists
          const scriptExists = yield* fs.exists(pythonScript).pipe(
            Effect.mapError(error => new PythonBridgeError({ message: `Failed to check script existence: ${error}`, cause: error }))
          );
          if (!scriptExists) {
            return yield* Effect.fail(
              new PythonBridgeError({ message: `Python script not found at: ${pythonScript}` })
            );
          }
          
          // Check if swebench module can be imported
          yield* Effect.tryPromise({
            try: () => {
              return new Promise<void>((resolve, reject) => {
                const checkCode = `
import sys
try:
    from swebench.harness.run_evaluation import run_instances
    print("SWE-bench module imported successfully")
    sys.exit(0)
except ImportError as e:
    print(f"Failed to import SWE-bench: {e}", file=sys.stderr)
    sys.exit(1)
`;
                const proc = spawn(pythonExecutable, ["-c", checkCode], {
                  cwd: projectRoot,
                  env: {
                    ...process.env,
                    PYTHONPATH: path.join(projectRoot, "swebench") + ":" + (process.env.PYTHONPATH || "")
                  }
                });
                
                let stderr = "";
                proc.stderr.on("data", (data) => {
                  stderr += data.toString();
                });
                
                proc.on("close", (code) => {
                  if (code === 0) {
                    resolve();
                  } else {
                    reject(new Error(`SWE-bench module import failed: ${stderr}`));
                  }
                });
              });
            },
            catch: (e) => new PythonBridgeError({
              message: `SWE-bench module check failed. Make sure to run ./scripts/setup-swebench.sh: ${e}`,
              cause: e
            })
          });
          
          initialized = true;
          
          yield* telemetry.trackEvent({
            category: "swebench_python_bridge",
            action: "initialized",
            label: "success"
          }).pipe(Effect.catchAll(() => Effect.void));
        }),
        
      runEvaluation: (predictions, options = {}) =>
        Stream.unwrapScoped(
          Effect.gen(function* () {
            // Ensure initialized
            if (!initialized) {
              yield* Effect.fail(
                new PythonBridgeError({ message: "Python bridge not initialized. Call initialize() first." })
              );
            }
            
            const queue = yield* Queue.unbounded<EvaluationProgress>();
            
            // Use virtual environment Python if available
            const venvPython = path.join(projectRoot, ".venv", "bin", "python");
            const pythonPath = yield* fs.exists(venvPython).pipe(
              Effect.map(exists => exists ? venvPython : pythonExecutable),
              Effect.mapError(error => new PythonBridgeError({ message: `Failed to check venv python: ${error}`, cause: error }))
            );
            
            // Start Python process
            const proc = spawn(pythonPath, [pythonScript], {
              stdio: ["pipe", "pipe", "pipe"],
              cwd: projectRoot,
              env: {
                ...process.env,
                PYTHONPATH: path.join(projectRoot, "swebench") + ":" + (process.env.PYTHONPATH || ""),
                // Ensure Python doesn't buffer output
                PYTHONUNBUFFERED: "1"
              }
            });
            
            yield* telemetry.trackEvent({
              category: "swebench_python_bridge",
              action: "process_started",
              label: `PID: ${proc.pid}`,
              value: predictions.length
            }).pipe(Effect.catchAll(() => Effect.void));
            
            // Set up readline for parsing JSON lines
            const rl = readline.createInterface({
              input: proc.stdout!,
              crlfDelay: Infinity
            });
            
            // Handle stdout (JSON messages)
            rl.on("line", (line) => {
              try {
                const message = JSON.parse(line);
                Queue.offer(queue, message).pipe(Effect.runSync);
                
                // Log progress messages
                if (message.type === "progress") {
                  telemetry.trackEvent({
                    category: "swebench_python_bridge",
                    action: "evaluation_progress",
                    label: `${message.data.completed}/${message.data.total}`,
                    value: message.data.percentage
                  }).pipe(Effect.catchAll(() => Effect.void)).pipe(Effect.runSync);
                }
              } catch (e) {
                // Log non-JSON lines for debugging
                if (line.trim()) {
                  telemetry.trackEvent({
                    category: "swebench_python_bridge",
                    action: "stdout_non_json",
                    label: line,
                    level: "debug"
                  }).pipe(Effect.catchAll(() => Effect.void)).pipe(Effect.runSync);
                }
              }
            });
            
            // Handle stderr
            proc.stderr!.on("data", (data) => {
              const message = data.toString();
              telemetry.trackEvent({
                category: "swebench_python_bridge",
                action: "stderr",
                label: message,
                level: "warn"
              }).pipe(Effect.catchAll(() => Effect.void)).pipe(Effect.runSync);
            });
            
            // Handle process exit
            proc.on("close", (code) => {
              telemetry.trackEvent({
                category: "swebench_python_bridge",
                action: "process_exit",
                label: `Exit code: ${code}`,
                level: code === 0 ? "info" : "error"
              }).pipe(Effect.catchAll(() => Effect.void)).pipe(Effect.runSync);
              
              if (code !== 0 && code !== null) {
                Queue.offer(queue, {
                  type: "error",
                  data: { 
                    message: `Python process exited with code ${code}`,
                    type: "ProcessExitError"
                  }
                }).pipe(Effect.runSync);
              }
              Queue.shutdown(queue).pipe(Effect.runSync);
            });
            
            // Handle process errors
            proc.on("error", (error) => {
              Queue.offer(queue, {
                type: "error",
                data: { 
                  message: `Process error: ${error.message}`,
                  type: "ProcessError"
                }
              }).pipe(Effect.runSync);
              Queue.shutdown(queue).pipe(Effect.runSync);
            });
            
            // Send configuration
            const config = {
              predictions,
              run_id: options.run_id || `run_${Date.now()}`,
              dataset_name: options.dataset_name || "princeton-nlp/SWE-bench",
              max_workers: options.max_workers || 1,
              timeout: options.timeout || 1800,
              instance_ids: options.instance_ids,
              namespace: options.namespace
            };
            
            proc.stdin!.write(JSON.stringify(config) + "\n");
            proc.stdin!.end();
            
            // Clean up on scope close
            const scope = yield* Scope.Scope;
            yield* Scope.addFinalizer(scope, Effect.sync(() => {
              if (!proc.killed) {
                proc.kill();
              }
            }));
            
            return Stream.fromQueue(queue);
          }).pipe(
            Effect.mapError(error => 
              error instanceof PythonBridgeError 
                ? error 
                : new PythonBridgeError({ message: "Failed to run evaluation", cause: error })
            )
          )
        )
    });
  })
);