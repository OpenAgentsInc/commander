# Service Mocking Patterns in Tests

## Core Patterns

1. **Setup File (`setup.ts`)**
   - Used for global mocks (like localStorage)
   - Sets up test environment configurations

2. **External Dependencies**
   - Use `vi.mock()` to mock external libraries
   - Example: `vi.mock('@buildonspark/spark-sdk', () => ({ ... })`

3. **Service Mocking Approaches**

   ### A. Effect-Based Services (Preferred)
   
   1. Create mock implementations of service interfaces:
      ```typescript
      const mockNostrService: NostrService = {
        publishEvent: vi.fn().mockImplementation(() => Effect.succeed(...)),
        listEvents: vi.fn().mockImplementation(() => Effect.succeed([])),
        // etc.
      };
      ```

   2. Use Effect's Layer system to provide mock dependencies:
      ```typescript
      const testLayer = Layer.provide(
        ServiceUnderTestLive, 
        Layer.succeed(DependencyService, mockDependencyService)
          .pipe(Layer.merge(Layer.succeed(OtherDependency, mockOtherDependency)))
      );
      ```

   3. Create test programs that use these layers:
      ```typescript
      const program = Effect.gen(function* (_) {
        const service = yield* _(ServiceUnderTest);
        return yield* _(service.methodToTest(params));
      }).pipe(Effect.provide(testLayer));
      
      const result = await Effect.runPromise(program);
      ```

   ### B. Class-Based Mock Services

   1. Create a mock implementation class:
      ```typescript
      const createMockService = (): ServiceType => ({
        methodOne: (params) => {
          // Validation logic
          if (!params.valid) {
            return Effect.fail(new ValidationError({ message: "Invalid" }));
          }
          // Return mock data
          return Effect.succeed({ data: "mocked-response" });
        },
        // other methods
      });
      ```

   2. Use helper functions to run tests against the mock:
      ```typescript
      const createTestProgram = <A>(program: (service: ServiceType) => Effect.Effect<A, ErrorType, never>) => {
        const mockService = createMockService();
        return program(mockService);
      };
      ```

4. **Mock Files/Classes**
   - Create separate files for complex mocks (e.g., `mockSdk.ts`)
   - Export mock error classes and functions

## Best Practices

1. **Reset Mocks in Test Lifecycle**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks();
     mockFunction.mockReset();
   });
   
   afterEach(() => {
     vi.restoreAllMocks();
   });
   ```

2. **Helper Functions for Common Operations**
   ```typescript
   // For running Effect-based tests
   function runEffectTest<A, E>(effect: Effect.Effect<A, E, ServiceType>): Effect.Effect<A, E, never> {
     return Effect.provide(effect, testLayer);
   }
   
   // For asserting errors from Effects
   function expectEffectFailure<E extends Error, T extends E>(
     effect: Effect.Effect<unknown, E, never>,
     ErrorClass: new (...args: any[]) => T,
     messagePattern?: string | RegExp,
   ): Promise<T> {
     // implementation
   }
   ```

3. **Testing Error Handling**
   - Mock different error scenarios from dependencies
   - Use assertions to validate correct error propagation
   - Check for telemetry or logging calls when errors occur

4. **Testing with HTTP Client**
   - Create custom mock HTTP clients for testing
   - Use helper functions to generate mock responses
   - Test different response status codes and formats