import { Effect, Layer, Stream } from "effect";
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

export const SWEBenchPythonBridgeServiceTelemetryLive = Layer.effect(
  SWEBenchPythonBridgeService,
  Effect.gen(function* () {
    const telemetry = yield* TelemetryService;
    const fs = yield* FileSystem;
    
    let initialized = false;
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || "python3";
    const projectRoot = process.cwd();
    
    // Use the telemetry-enabled Python script
    const pythonScript = path.join(
      projectRoot,
      "src",
      "services",
      "swe_bench_harness",
      "python-bridge",
      "swebench_runner_telemetry.py"
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
                    // Log Python version
                    telemetry.trackEvent({
                      category: "swebench_python_bridge",
                      action: "python_check",
                      label: output.trim(),
                      level: "info"
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
                    PYTHONPATH: path.join(projectRoot, "swebench")
                  }
                });
                
                let stdout = "";
                let stderr = "";
                
                proc.stdout.on("data", (data) => {
                  stdout += data.toString();
                });
                
                proc.stderr.on("data", (data) => {
                  stderr += data.toString();
                });
                
                proc.on("close", (code) => {
                  if (code === 0) {
                    resolve();
                  } else {
                    reject(new Error(`SWE-bench import check failed: ${stderr || stdout}`));
                  }
                });
                
                proc.on("error", (err) => {
                  reject(err);
                });
              });
            },
            catch: (e) => new PythonBridgeError({ message: `SWE-bench module check failed: ${e}`, cause: e })
          });
          
          initialized = true;
          
          yield* telemetry.trackEvent({
            category: "swebench_python_bridge",
            action: "initialized",
            label: pythonScript,
            level: "info"
          }).pipe(
            Effect.mapError(() => new PythonBridgeError({ message: "Failed to track telemetry event" }))
          );
        }),
      
      runEvaluation: (predictions: SWEBenchPrediction[], options?: EvaluationOptions) =>
        Stream.async<EvaluationProgress, PythonBridgeError>((emit) => {
          if (!initialized) {
            emit.fail(new PythonBridgeError({ message: "Python bridge not initialized" }));
            return;
          }
          
          // Spawn the Python process
          const proc = spawn(pythonExecutable, [pythonScript], {
            cwd: projectRoot,
            env: {
              ...process.env,
              PYTHONPATH: path.join(projectRoot, "swebench"),
              PYTHONUNBUFFERED: "1"
            }
          });
          
          // Set up readline interface for JSON parsing
          const rl = readline.createInterface({
            input: proc.stdout!,
            crlfDelay: Infinity
          });
          
          // Handle messages from Python
          rl.on("line", (line) => {
            try {
              const message = JSON.parse(line);
              
              // Handle telemetry events specially
              if (message.type === "telemetry") {
                const telemetryData = message.data;
                Effect.runSync(
                  telemetry.trackEvent({
                    category: telemetryData.category,
                    action: telemetryData.action,
                    label: telemetryData.label,
                    value: telemetryData.value,
                    context: telemetryData.context,
                    level: telemetryData.level || "info",
                    timestamp: telemetryData.timestamp
                  }).pipe(Effect.catchAll(() => Effect.void))
                );
              } else {
                // Regular evaluation progress message
                emit.single(message as EvaluationProgress);
              }
            } catch (err) {
              // Handle non-JSON output
              if (line.trim()) {
                Effect.runSync(
                  telemetry.trackEvent({
                    category: "swebench_python_bridge",
                    action: "non_json_output",
                    context: { output: line },
                    level: "debug"
                  }).pipe(Effect.catchAll(() => Effect.void))
                );
              }
            }
          });
          
          // Handle stderr
          proc.stderr!.on("data", (data) => {
            const error = data.toString();
            emit.single({
              type: "error",
              data: { message: error }
            } as EvaluationProgress);
            
            // Log to telemetry
            Effect.runSync(
              telemetry.trackEvent({
                category: "swebench_python_bridge",
                action: "stderr",
                context: { error },
                level: "error"
              }).pipe(Effect.catchAll(() => Effect.void))
            );
          });
          
          // Handle process exit
          proc.on("close", (code) => {
            if (code !== 0) {
              emit.single({
                type: "error",
                data: { message: `Python process exited with code ${code}` }
              } as EvaluationProgress);
            }
            emit.end();
          });
          
          proc.on("error", (err) => {
            emit.fail(new PythonBridgeError({ 
              message: `Python process error: ${err.message}`,
              cause: err
            }));
          });
          
          // Send the command
          const command = {
            command: "run_evaluation",
            predictions,
            options: options || {}
          };
          
          proc.stdin!.write(JSON.stringify(command) + "\n");
          
          // Return cleanup effect
          return Effect.sync(() => {
            proc.kill();
            rl.close();
          });
        })
    });
  })
);