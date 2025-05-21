# AI Phase 2 Implementation - TypeScript Fixes

## Overview

I'm working on the implementation of Phase 2 of the AI roadmap, specifically fixing TypeScript errors in the OpenAI provider implementation.

## Reading the Instructions

I've read the specific instructions from `docs/logs/20250521/1514-phase2-instructions.md`, which outlines the exact fixes needed to resolve TypeScript errors. The key fixes are:

1. Modify the `AgentLanguageModel` interface to use `AIProviderError` instead of `AiError` from `@effect/ai`
2. Fix the Redacted API key handling in `OpenAIClientLive`
3. Fix test file issues (naming, mocking, and Effect usage patterns)

## Implementation Plan

Based on the instructions, I'll:

1. Update `src/services/ai/core/AgentLanguageModel.ts` to use our custom error types
2. Fix `OpenAIClientLive.ts` to use the proper Redacted implementation from Effect
3. Fix all the test files by properly importing dependencies and fixing mock usage
4. Update the runtime tests to use the correct Effect API

I'll now execute these changes according to the provided instructions.