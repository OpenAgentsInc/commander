# Fix: Library Abstraction Bypass Pattern

## Problem

When using complex library abstractions like @effect/ai's AiModel → Provider pattern, you may encounter persistent internal service errors that cannot be resolved through normal means. Even after correctly using the library's API, errors like "Service not found" may persist due to execution context isolation or internal service management issues.

### Error Message
```
Error: Service not found: @effect/ai-openai/OpenAiLanguageModel/Config (defined at ...)
```

This error persisted even when:
- Using the AiModel API correctly
- Providing all required services
- Following the library's documentation

## Root Cause

Some library abstractions create isolated execution contexts that:
1. Don't inherit services from parent contexts
2. Manage their own internal services in ways that conflict with your application
3. Create complex service dependency chains that are difficult to satisfy
4. Use patterns like `provider.use()` that create new execution scopes

In the case of @effect/ai:
- The AiModel creates its own Config service internally
- The `provider.use()` method creates an isolated execution context
- This context doesn't have access to the Config service the library expects
- No amount of service provision from the outside can fix this

## Solution

When a library's abstraction becomes an obstacle rather than a help, consider bypassing it entirely and using lower-level APIs directly.

### Before (Using the Abstraction)
```typescript
// This creates internal service dependency issues
const model = OpenAiLanguageModel.model(modelName, config);
const provider = yield* _(model);

return makeAgentLanguageModel({
  generateText: (options) =>
    provider.use(
      Effect.gen(function* (_) {
        const languageModel = yield* _(AiLanguageModel);
        // This fails with "Service not found: Config"
        return yield* _(languageModel.generateText(options));
      })
    )
});
```

### After (Direct Client Usage)
```typescript
// Bypass the abstraction entirely
const client = yield* _(OpenAiClient.OpenAiClient);

return makeAgentLanguageModel({
  generateText: (options) =>
    Effect.gen(function* (_) {
      // Use the client directly - no complex service contexts
      const response = yield* _(
        client.client.createChatCompletion({
          model: modelName,
          messages: parseMessages(options.prompt),
          temperature: options.temperature,
          max_tokens: options.maxTokens
        })
      );
      
      return new AiResponse({
        parts: [new TextPart({ text: response.choices[0]?.message?.content || "" })]
      });
    })
});
```

## Why This Pattern is Appropriate

1. **Simplicity**: Direct API usage is often simpler than complex abstractions
2. **Control**: You have full control over the execution context
3. **Debuggability**: Fewer layers of abstraction make debugging easier
4. **Compatibility**: You can still implement the required interfaces

## Complete Example

```typescript
export const OllamaAgentLanguageModelLive = Effect.gen(function* (_) {
  const client = yield* _(OpenAiClient.OpenAiClient);
  const configService = yield* _(ConfigurationService);
  
  const modelName = yield* _(
    configService.get("OLLAMA_MODEL_NAME").pipe(
      Effect.orElseSucceed(() => "llama2")
    )
  );

  // Helper to parse messages from prompt
  const parseMessages = (prompt: string) => {
    try {
      const parsed = JSON.parse(prompt);
      return parsed.messages || [];
    } catch {
      return [{ role: "user", content: prompt }];
    }
  };

  return makeAgentLanguageModel({
    generateText: (options) =>
      Effect.gen(function* (_) {
        const response = yield* _(
          client.client.createChatCompletion({
            model: modelName,
            messages: parseMessages(options.prompt),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048
          })
        );
        
        return new AiResponse({
          parts: [new TextPart({ text: response.choices[0]?.message?.content || "" })]
        });
      }),

    streamText: (options) => {
      const messages = parseMessages(options.prompt);
      return client.stream({
        model: modelName,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048
      }).pipe(
        Stream.map((chunk) => new AiResponse({
          parts: chunk.parts
        }))
      );
    }
  });
});
```

## When to Apply This Pattern

Consider bypassing a library abstraction when:

1. **Persistent Internal Errors**: You get errors about missing internal services
2. **Context Isolation Issues**: The library creates execution contexts you can't control
3. **Documentation Gaps**: The library's intended usage isn't clear or documented
4. **Type System Fights**: You need unsafe casts like `as any` to use the API
5. **Debugging Difficulty**: You can't trace through the abstraction layers
6. **Simple Alternative Exists**: The lower-level API is straightforward to use

## Trade-offs

### Pros
- Eliminates complex service dependency issues
- Simpler, more maintainable code
- Better error messages and debugging
- Full control over execution context

### Cons
- May lose some features the abstraction provides
- Need to implement more functionality yourself
- May need updates if the lower-level API changes
- Less abstraction means more boilerplate in some cases

## Related Issues

- [019 - AiModel API Misuse](./019-aimodel-api-misuse.md) - The initial attempt to fix the usage
- [020 - Config Service Context Isolation](./020-config-service-context-isolation.md) - Why manual provision failed
- Effect's execution context isolation patterns
- Library abstractions that create their own service contexts

## Key Lessons

1. **Not All Abstractions Add Value**: Sometimes they add complexity instead
2. **Understand Before Bypassing**: Make sure you understand why the abstraction fails
3. **Document the Decision**: Explain why you bypassed the abstraction for future maintainers
4. **Keep the Interface**: Implement the same interface so consumers don't need to change
5. **Consider Maintenance**: Weigh the trade-offs between abstraction complexity and direct usage