import { describe, it, expect, vi } from "vitest";
import { Effect, Layer, Context } from "effect";
import {
  AgentToolkitManager,
  Tool,
  AiToolkit
} from "@/services/ai/core/AgentToolkitManager";

// Mock Tool implementation for testing
interface CalculatorTool extends Tool<{ expression: string }, number, Error> {
  readonly _tag: "CalculatorTool";
  readonly name: string;
  readonly description: string;
  execute(args: { expression: string }): Effect.Effect<number, Error>;
}

const createCalculatorTool = (): CalculatorTool => ({
  _tag: "CalculatorTool",
  name: "calculator",
  description: "Evaluates simple mathematical expressions",
  execute: (args: { expression: string }) => {
    // Very simple eval-based calculator (just for testing)
    try {
      return Effect.succeed(eval(args.expression));
    } catch (error) {
      return Effect.fail(new Error(`Failed to evaluate expression: ${args.expression}`));
    }
  }
});

// Mock WeatherTool
interface WeatherTool extends Tool<{ location: string }, { temperature: number, conditions: string }, Error> {
  readonly _tag: "WeatherTool";
  readonly name: string;
  readonly description: string;
  execute(args: { location: string }): Effect.Effect<{ temperature: number, conditions: string }, Error>;
}

const createWeatherTool = (): WeatherTool => ({
  _tag: "WeatherTool",
  name: "weather",
  description: "Gets current weather for a location",
  execute: (args: { location: string }) => {
    // Mock weather data
    return Effect.succeed({
      temperature: 22,
      conditions: "Sunny"
    });
  }
});

// Mock implementation of AgentToolkitManager for testing
class MockAgentToolkitManager implements AgentToolkitManager {
  readonly _tag = "AgentToolkitManager";
  private tools: Record<string, Tool> = {};

  constructor(initialTools: Tool[] = []) {
    initialTools.forEach(tool => {
      this.tools[tool._tag] = tool;
    });
  }

  getToolkit = vi.fn(() => {
    return Effect.succeed({
      tools: this.tools
    } as AiToolkit<Tool>);
  });

  registerTool = vi.fn(<I, S, E>(tool: Tool<I, S, E>) => {
    this.tools[tool._tag] = tool;
    return Effect.succeed(void 0);
  });

  executeTool = vi.fn((toolName: string, args: unknown) => {
    const tool = this.tools[toolName];
    
    if (!tool) {
      return Effect.fail(new Error(`Tool not found: ${toolName}`));
    }
    
    // This is a simplification since we can't actually execute the tool
    // in a type-safe way without additional type information
    if (toolName === "CalculatorTool" && args && typeof args === "object") {
      return (tool as CalculatorTool).execute(args as { expression: string });
    }
    
    if (toolName === "WeatherTool" && args && typeof args === "object") {
      return (tool as WeatherTool).execute(args as { location: string });
    }
    
    return Effect.fail(new Error(`Cannot execute tool: ${toolName}`));
  });

  hasTool = vi.fn((toolName: string) => {
    return Effect.succeed(toolName in this.tools);
  });
}

describe("AgentToolkitManager Service", () => {
  it("AgentToolkitManager.Tag should be a valid Context.Tag", () => {
    expect(AgentToolkitManager.Tag).toBeInstanceOf(Context.Tag);
  });

  it("should resolve a mock implementation via Effect context", async () => {
    const calculatorTool = createCalculatorTool();
    const mockService = new MockAgentToolkitManager([calculatorTool]);
    const testLayer = Layer.succeed(AgentToolkitManager.Tag, mockService);
    
    const program = Effect.flatMap(
      AgentToolkitManager.Tag,
      (service) => Effect.succeed(service)
    );

    const resolvedService = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );
    
    expect(resolvedService).toBe(mockService);
  });

  describe("Service methods", () => {
    it("getToolkit should return the current tools", async () => {
      const calculatorTool = createCalculatorTool();
      const mockService = new MockAgentToolkitManager([calculatorTool]);
      const testLayer = Layer.succeed(AgentToolkitManager.Tag, mockService);

      const program = Effect.flatMap(
        AgentToolkitManager.Tag,
        (service) => service.getToolkit()
      );

      const toolkit = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(mockService.getToolkit).toHaveBeenCalled();
      expect(toolkit.tools).toHaveProperty("CalculatorTool");
      expect(toolkit.tools.CalculatorTool).toBe(calculatorTool);
    });

    it("registerTool should add a tool to the toolkit", async () => {
      const mockService = new MockAgentToolkitManager();
      const testLayer = Layer.succeed(AgentToolkitManager.Tag, mockService);
      const weatherTool = createWeatherTool();

      const program = Effect.flatMap(
        AgentToolkitManager.Tag,
        (service) => Effect.flatMap(
          service.registerTool(weatherTool),
          () => service.getToolkit()
        )
      );

      const toolkit = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(mockService.registerTool).toHaveBeenCalledWith(weatherTool);
      expect(toolkit.tools).toHaveProperty("WeatherTool");
      expect(toolkit.tools.WeatherTool).toBe(weatherTool);
    });

    it("hasTool should check if a tool exists", async () => {
      const calculatorTool = createCalculatorTool();
      const mockService = new MockAgentToolkitManager([calculatorTool]);
      const testLayer = Layer.succeed(AgentToolkitManager.Tag, mockService);

      const programExists = Effect.flatMap(
        AgentToolkitManager.Tag,
        (service) => service.hasTool("CalculatorTool")
      );

      const programNotExists = Effect.flatMap(
        AgentToolkitManager.Tag,
        (service) => service.hasTool("NonExistentTool")
      );

      const hasCalculator = await Effect.runPromise(
        programExists.pipe(Effect.provide(testLayer))
      );

      const hasNonExistent = await Effect.runPromise(
        programNotExists.pipe(Effect.provide(testLayer))
      );

      expect(mockService.hasTool).toHaveBeenCalledWith("CalculatorTool");
      expect(mockService.hasTool).toHaveBeenCalledWith("NonExistentTool");
      expect(hasCalculator).toBe(true);
      expect(hasNonExistent).toBe(false);
    });

    it("executeTool should execute a tool with arguments", async () => {
      const calculatorTool = createCalculatorTool();
      const mockService = new MockAgentToolkitManager([calculatorTool]);
      const testLayer = Layer.succeed(AgentToolkitManager.Tag, mockService);

      const program = Effect.flatMap(
        AgentToolkitManager.Tag,
        (service) => service.executeTool("CalculatorTool", { expression: "2 + 3" })
      );

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      );

      expect(mockService.executeTool).toHaveBeenCalledWith(
        "CalculatorTool", 
        { expression: "2 + 3" }
      );
      expect(result).toBe(5);
    });

    it("executeTool should fail when tool doesn't exist", async () => {
      const mockService = new MockAgentToolkitManager();
      const testLayer = Layer.succeed(AgentToolkitManager.Tag, mockService);

      const program = Effect.flatMap(
        AgentToolkitManager.Tag,
        (service) => service.executeTool("NonExistentTool", { arg: "value" })
      );

      const result = await Effect.runPromiseExit(
        program.pipe(Effect.provide(testLayer))
      );

      expect(Effect.isFailure(result)).toBe(true);
      
      if (Effect.isFailure(result)) {
        expect(result.cause.toString()).toContain("Tool not found: NonExistentTool");
      }
    });
  });
});