# Effect TypeScript Fixes Documentation

This directory contains detailed documentation for specific TypeScript issues and their solutions when working with Effect and related libraries in the OpenAgents Commander project.

## Purpose

As we work with Effect's sophisticated type system, we encounter various TypeScript inference limitations and edge cases. This documentation serves to:

1. **Preserve Knowledge**: Document solutions to complex type issues for future reference
2. **Share Patterns**: Help team members quickly resolve similar issues
3. **Understand Root Causes**: Provide deep technical explanations of why issues occur
4. **Standardize Solutions**: Ensure consistent approaches across the codebase

## Documented Fixes

### 001 - [AiModel to Provider Type Inference](./001-aimodel-provider-type-inference.md)
**Problem**: TypeScript fails to infer that yielding an `AiModel` produces a `Provider` in Effect generators  
**Solution**: Explicit type cast to help TypeScript understand the inheritance chain  
**Affects**: All AI provider implementations using `@effect/ai-openai`

### 002 - [Provider Service Access Pattern](./002-provider-service-access-pattern.md)
**Problem**: Cannot call methods directly on `Provider<AiLanguageModel>` instances  
**Solution**: Use `provider.use(Effect.gen(...))` to access the wrapped service  
**Affects**: All AI providers that wrap @effect/ai services

### 003 - [Service Tag Access Patterns](./003-service-tag-access-patterns.md)  
**Problem**: Using service classes directly in Effect generators instead of `.Tag` property  
**Solution**: Always use `ServiceName.Tag` when yielding services  
**Affects**: All Effect service access throughout the application (high-impact batch fix)

### 004 - [AiResponse Type Conflicts](./004-airesponse-type-conflicts.md)
**Problem**: Type conflicts between custom AiResponse and @effect/ai's AiResponse  
**Solution**: Use appropriate AiResponse type per context and namespace imports  
**Affects**: Client adapters vs application services that handle AI responses

### 005 - [Effect.provideLayer Migration](./005-effect-providelayer-migration.md)
**Problem**: `Effect.provideLayer` deprecated in newer Effect versions  
**Solution**: Replace all `Effect.provideLayer` with `Effect.provide`  
**Affects**: All test files and application bootstrap code (high-impact batch fix)

## Fix Documentation Template

When adding new fixes, please follow this structure:

```markdown
# Fix: [Brief Title]

## Problem
[Clear description of the issue]

### Error Message
[Exact TypeScript error]

## Root Cause
[Technical explanation of why this happens]

## Solution
[Code example of the fix]

### Why This [Cast/Fix/Pattern] is Safe
[Explanation of type safety]

## Complete Example
[Full working code example]

## When to Apply This Fix
[Conditions that indicate this fix is needed]

## Related Issues
[Other areas where this might appear]
```

## Contributing

When you solve a tricky TypeScript issue with Effect:

1. Create a new numbered file (e.g., `002-your-fix-name.md`)
2. Follow the template structure
3. Add an entry to this README
4. Include both the problem code and the solution
5. Explain why the solution works at the type level

## Categories of Fixes

### Type Inference Issues
- [001 - AiModel to Provider Type Inference](./001-aimodel-provider-type-inference.md)
- [004 - AiResponse Type Conflicts](./004-airesponse-type-conflicts.md)

### Effect API Changes & Patterns
- [002 - Provider Service Access Pattern](./002-provider-service-access-pattern.md)
- [003 - Service Tag Access Patterns](./003-service-tag-access-patterns.md)
- [005 - Effect.provideLayer Migration](./005-effect-providelayer-migration.md)

### High-Impact Batch Fixes
- [003 - Service Tag Access Patterns](./003-service-tag-access-patterns.md) (48+ errors eliminated)
- [005 - Effect.provideLayer Migration](./005-effect-providelayer-migration.md) (10+ errors eliminated)

### AI/Provider Integration
- [001 - AiModel to Provider Type Inference](./001-aimodel-provider-type-inference.md)
- [002 - Provider Service Access Pattern](./002-provider-service-access-pattern.md)
- [004 - AiResponse Type Conflicts](./004-airesponse-type-conflicts.md)

## Quick Reference

Common patterns that often need fixes:

1. **Deep Generic Inheritance**: When TypeScript can't infer through multiple levels of generic types ([001](./001-aimodel-provider-type-inference.md))
2. **Service Access**: Using service classes directly instead of `.Tag` property ([003](./003-service-tag-access-patterns.md))
3. **Provider Methods**: Calling methods directly on Provider instead of using `.use()` ([002](./002-provider-service-access-pattern.md))
4. **Type Conflicts**: Mixing different library types with same names ([004](./004-airesponse-type-conflicts.md))
5. **API Migrations**: Deprecated methods in newer library versions ([005](./005-effect-providelayer-migration.md))
6. **Generator Syntax**: When `yield* _()` doesn't infer as expected
7. **Stream vs Effect**: Using Effect retry patterns on Streams instead of Stream retry

### High-Impact Fixes (Batch Applicable)
- **Service Tag Access**: `yield* _(ServiceName)` → `yield* _(ServiceName.Tag)` 
- **Effect API Migration**: `Effect.provideLayer(layer)` → `Effect.provide(layer)`
- **Error Constructors**: Missing required properties in error constructors

## Resources

- [Effect Documentation](https://effect.website/docs)
- [TypeScript Handbook - Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- [@effect/ai API Reference](https://effect-ts.github.io/effect/docs/ai)