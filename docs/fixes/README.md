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

### Effect API Changes
- (Future fixes for Effect API migrations)

### Layer Composition
- (Future fixes for Layer-related type issues)

### Stream vs Effect
- (Future fixes for Stream/Effect confusion)

## Quick Reference

Common patterns that often need fixes:

1. **Deep Generic Inheritance**: When TypeScript can't infer through multiple levels of generic types
2. **Union Type Inference**: When union types break inference in Effect compositions  
3. **Variance Issues**: When `in`/`out`/`in out` variance annotations cause strict type matching
4. **Context/Layer Composition**: When providing layers in complex dependency graphs
5. **Generator Syntax**: When `yield* _()` doesn't infer as expected

## Resources

- [Effect Documentation](https://effect.website/docs)
- [TypeScript Handbook - Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- [@effect/ai API Reference](https://effect-ts.github.io/effect/docs/ai)