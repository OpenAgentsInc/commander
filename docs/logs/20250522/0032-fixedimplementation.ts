import { Effect, Layer } from "effect";

interface TestService {
  sayHello(): Effect.Effect<string, never, never>;
  doThing(): Effect.Effect<number, never, never>;
}

const TestService = Symbol.for("TestService");

export const TestServiceLive = Layer.succeed(
  TestService,
  Effect.gen(function* (_) {
    return {
      sayHello: () => Effect.succeed("Hello"),
      doThing: () => Effect.succeed(42),
    };
  }),
);
