import { Effect } from "effect";
import { SWEBenchEnvironmentSetupService } from "../src/services/swe_bench_harness/SWEBenchEnvironmentSetupService";
import { SWEBenchEnvironmentSetupServiceTestImpl } from "../src/services/swe_bench_harness/SWEBenchEnvironmentSetupServiceTestImpl";

async function test() {
  console.log("Testing SWEBenchEnvironmentSetupService test implementation...");
  
  const program = Effect.gen(function* () {
    const service = yield* SWEBenchEnvironmentSetupService;
    
    const config = yield* service.analyzeTaskEnvironment({
      instance_id: "test",
      repo: "test/repo",
      base_commit: "abc123",
      problem_statement: "Test",
      hints_text: "",
      created_at: "",
      patch: "",
      test_patch: "",
      version: "1.0"
    });
    
    console.log("Environment config:", config);
    
    const script = yield* service.generateSetupScript(
      config,
      "/repo",
      "/venv"
    );
    
    console.log("Setup script:", script);
    
    return "Success!";
  });
  
  const result = await Effect.runPromise(
    program.pipe(Effect.provide(SWEBenchEnvironmentSetupServiceTestImpl))
  );
  
  console.log("Result:", result);
}

test().catch(console.error);