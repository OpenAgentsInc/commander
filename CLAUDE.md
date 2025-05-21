# OpenAgents Commander Development Guide

## Project Overview

- Electron app for "Command agents, earn bitcoin"
- Tech stack: React 19, TypeScript, Shadcn UI, Tailwind CSS v4, TanStack Router, i18next

## Build/Test Commands

- `pnpm start` - Run electron app in dev mode
- `pnpm package` - Package app into platform-specific bundles
- `pnpm make` - Create distributable installers
- `pnpm lint` - Run ESLint on codebase
- `pnpm format:write` - Fix formatting with Prettier
- `pnpm test` - Run all unit tests once
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:e2e` - Run end-to-end tests
- Single test: `pnpm vitest run <TestName>` or `pnpm vitest -t "<test description>"`

## Code Style Guidelines

- TypeScript with strict mode enabled
- Path aliases: Use `@/` prefix for imports from src directory
- Components: PascalCase functional components in separate files with `.tsx` extension
- React: Use React 19 with React Compiler enabled
- Electron architecture: Follow context isolation pattern for IPC communication
- Naming: PascalCase for components/types, camelCase for variables/functions
- Formatting: 2-space indentation, single quotes, semicolons
- UI Components: Add new Shadcn components using `pnpm dlx shadcn@latest add <component-name>`
- Tailwind: Use classes directly in JSX, composable utilities in `@/utils/tailwind.ts`
- State Management: Use React Query (TanStack Query) for data fetching
- Internationalization: Use i18next with language helpers
- Error handling: Use try/catch for async operations
- Testing: Vitest for unit tests, Playwright for E2E, descriptive test names
