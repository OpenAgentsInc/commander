import { Effect, Stream, Layer, Schedule, Duration } from "effect";
import { SpawnOptions, spawn } from "child_process";
import { Readable } from "stream";
import { FileSystem } from "@effect/platform";
import * as path from "path";
import * as readline from "readline";
import {
  SWEBenchPythonBridgeService,
  PythonBridgeMessage,
  SWEBenchPrediction,
  EvaluationOptions,
  SWEBenchResult,
  PythonBridgeError
} from "./SWEBenchPythonBridgeService";

export const SWEBenchPythonBridgeServiceTargeted = Layer.effect(
  SWEBenchPythonBridgeService,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    
    let pythonProcess: ReturnType<typeof spawn> | null = null;
    let isInitialized = false;
    
    const initialize = Effect.gen(function* () {
      if (isInitialized) {
        return;
      }
      
      // Check if Python is available
      const pythonExe = process.env.PYTHON_EXECUTABLE || "python3";
      const checkPython = yield* Effect.tryPromise({
        try: () => new Promise<void>((resolve, reject) => {
          const check = spawn(pythonExe, ["--version"], { shell: true });
          check.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Python check failed with code ${code}`));
          });
          check.on("error", reject);
        }),
        catch: (error) => new PythonBridgeError({
          message: `Python not found: ${error}. Make sure Python 3 is installed.`,
          originalError: error
        })
      });
      
      yield* Effect.log("Python check passed");
      
      // Check if swebench module is available
      const bridgeScript = path.join(__dirname, "python-bridge", "swebench_runner_targeted.py");
      const checkScript = yield* fs.exists(bridgeScript);
      if (!checkScript) {
        yield* Effect.fail(new PythonBridgeError({
          message: `Bridge script not found at ${bridgeScript}`
        }));
      }
      
      yield* Effect.log(`Bridge script found at ${bridgeScript}`);
      isInitialized = true;
    });
    
    const runEvaluation = (
      predictions: SWEBenchPrediction[],
      options?: EvaluationOptions
    ): Stream.Stream<PythonBridgeMessage, PythonBridgeError> => {
      return Stream.fromEffect(Effect.gen(function* () {
        // Ensure initialized
        if (!isInitialized) {
          yield* initialize;
        }
        
        const pythonExe = process.env.PYTHON_EXECUTABLE || "python3";
        const bridgeScript = path.join(__dirname, "python-bridge", "swebench_runner_targeted.py");
        
        // Spawn Python process
        const spawnOptions: SpawnOptions = {
          shell: true,
          env: { ...process.env }
        };
        
        pythonProcess = spawn(pythonExe, [bridgeScript], spawnOptions);
        
        if (!pythonProcess.stdout || !pythonProcess.stderr || !pythonProcess.stdin) {
          throw new PythonBridgeError({
            message: "Failed to create Python process streams"
          });
        }
        
        // Send configuration
        const config = {
          predictions,
          run_id: options?.run_id || `run_${Date.now()}`,
          dataset_name: options?.dataset_name || "princeton-nlp/SWE-bench",
          max_workers: options?.max_workers || 1,
          timeout: options?.timeout || 1800,
          instance_ids: options?.instance_ids,
          namespace: options?.namespace
        };
        
        pythonProcess.stdin.write(JSON.stringify(config) + "\n");
        
        // Create message stream
        const messageStream = Stream.async<PythonBridgeMessage>((emit) => {
          const rl = readline.createInterface({
            input: pythonProcess!.stdout as Readable,
            crlfDelay: Infinity
          });
          
          rl.on("line", (line) => {
            try {
              const message = JSON.parse(line) as PythonBridgeMessage;
              emit(Effect.succeed(Stream.make(message)));
            } catch (e) {
              // Prefix non-JSON output with [Python]
              if (line.trim()) {
                console.log(`[Python]: ${line}`);
              }
            }
          });
          
          pythonProcess!.stderr!.on("data", (data) => {
            const error = data.toString();
            if (error.trim()) {
              console.error(`[Python Error]: ${error}`);
            }
          });
          
          pythonProcess!.on("error", (error) => {
            emit(Effect.fail(new PythonBridgeError({
              message: `Python process error: ${error.message}`,
              originalError: error
            })));
          });
          
          pythonProcess!.on("exit", (code) => {
            if (code !== 0 && code !== null) {
              emit(Effect.fail(new PythonBridgeError({
                message: `Python process exited with code ${code}`
              })));
            }
            emit(Effect.fail(None));
          });
        });
        
        return messageStream;
      })).pipe(Stream.flatten);
    };
    
    const shutdown = Effect.gen(function* () {
      if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
      }
      isInitialized = false;
    });
    
    return {
      initialize,
      runEvaluation,
      shutdown
    };
  })
);