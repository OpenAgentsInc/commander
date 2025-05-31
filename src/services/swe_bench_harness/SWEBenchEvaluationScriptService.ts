import { Context, Effect } from "effect";
import type { SWEBenchTask } from "./types";
import { ScriptBuildError } from "./errors";

export interface SWEBenchEvaluationScriptService {
  /**
   * Builds the content of an evaluation script (eval.sh).
   * @param task The SWEBenchTask definition.
   * @param patchFileNameInContainer The name of the patch file inside the container's evalDir.
   * @param containerEvalDir Absolute path to the evaluation directory inside the container.
   * @param containerRepoPath Absolute path to the cloned repository root inside the container.
   * @param testPatchFileNameInContainer Optional name of the test patch file inside the container's evalDir.
   * @returns Effect<string, ScriptBuildError> - The script content.
   */
  buildEvalScript(
    task: SWEBenchTask,
    patchFileNameInContainer: string,
    containerEvalDir: string,
    containerRepoPath: string,
    testPatchFileNameInContainer?: string
  ): Effect.Effect<string, ScriptBuildError>;
}

export const SWEBenchEvaluationScriptService = Context.GenericTag<SWEBenchEvaluationScriptService>("SWEBenchEvaluationScriptService");