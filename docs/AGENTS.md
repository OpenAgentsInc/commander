# OpenAgents Commander: Agent Onboarding

Welcome to the OpenAgents Commander codebase! This document provides a concise overview to get you started.

## 1. Project Overview

*   **Name**: OpenAgents Commander
*   **Product Name**: Commander
*   **Purpose**: "Command agents, earn bitcoin." (as per `package.json`). This is the flagship app introduced in [episode 170](https://x.com/OpenAgentsInc/status/1919797578452869267).
*   **Base**: Built upon the `electron-shadcn` template.

## 2. Core Technologies

*   **Framework**: Electron (~v35)
*   **Bundler/Dev Server**: Vite (~v6)
*   **UI**: React 19, Shadcn UI, Tailwind CSS v4
*   **Language**: TypeScript (~v5.8)
*   **Routing**: TanStack Router
*   **State Management (Data Fetching)**: React Query (TanStack Query)
*   **Internationalization (i18n)**: i18next
*   **Linting/Formatting**: ESLint (~v9), Prettier
*   **Testing**: Vitest (unit), Playwright (E2E)
*   **Packaging**: Electron Forge
*   **Package Manager**: `pnpm` (specified in `package.json`)

## 3. Directory Structure (`src/`)

*   `assets/`: Static assets like fonts (e.g., `berkeley-mono/`).
*   `components/`:
    *   `ui/`: Shadcn UI components (generated via `npx shadcn@canary add ...`). Configured in `components.json`.
    *   `template/`: Reusable, non-Shadcn UI components, often part of the initial template.
    *   Standalone components like `DragWindowRegion.tsx`, `LangToggle.tsx`, `ToggleTheme.tsx`.
*   `helpers/`: Utility functions.
    *   `ipc/`: Inter-Process Communication logic.
        *   `context-exposer.ts`: Exposes functions from main to renderer via `contextBridge`.
        *   `listeners-register.ts`: Registers IPC handlers in the main process.
        *   `theme/`: IPC channels, context, and listeners for theme management.
        *   `window/`: IPC channels, context, and listeners for custom window controls.
    *   `language_helpers.ts`: Application language switching logic (using `localStorage`).
    *   `theme_helpers.ts`: Application theme switching logic (dark, light, system, using `localStorage` and IPC).
    *   `window_helpers.ts`: Renderer-side functions to invoke window control IPC.
*   `layouts/`: React components structuring page layouts (e.g., `BaseLayout.tsx`).
*   `localization/`: i18n configuration (`i18n.ts`) and language definitions (`langs.ts`, `language.ts`).
*   `pages/`: Top-level React components for different application views/pages.
*   `routes/`: TanStack Router setup.
    *   `__root.tsx`: Defines the root layout for all routes.
    *   `router.tsx`: Router instance creation (uses `createMemoryHistory`).
    *   `routes.tsx`: Defines the application's route tree.
*   `styles/`: Global CSS (`global.css`), font definitions (`fonts.css`).
*   `tests/`:
    *   `e2e/`: Playwright end-to-end tests (config: `playwright.config.ts`).
    *   `unit/`: Vitest unit tests (config: `vitest.config.ts`, setup: `src/tests/unit/setup.ts`).
*   `utils/`: General utility functions (e.g., `tailwind.ts` for `cn` class merging helper).

## 4. Electron Architecture

*   **Main Process**: Entry point `src/main.ts`.
    *   Manages `BrowserWindow` lifecycle, native OS interactions.
    *   Registers IPC listeners via `registerListeners` from `src/helpers/ipc/listeners-register.ts`.
    *   Sets `titleBarStyle: 'hidden'` for a custom title bar.
    *   Installs React DevTools in development.
*   **Renderer Process**: Entry HTML `index.html`, which loads `src/renderer.ts`, which in turn renders `src/App.tsx` (root React component).
    *   Handles all UI rendering and user interaction within a window.
*   **Preload Script**: `src/preload.ts`.
    *   Specified by `webPreferences.preload` in `src/main.ts`.
    *   Runs in a privileged context, bridging main and renderer processes securely.
    *   Exposes IPC functions to the renderer via `contextBridge` (see `src/helpers/ipc/context-exposer.ts`).
*   **Context Isolation**: Enabled (`contextIsolation: true` in `src/main.ts` webPreferences).

## 5. Frontend (Renderer Details)

*   **UI Components**:
    *   Built with React 19 and Shadcn UI.
    *   Shadcn UI components are located in `src/components/ui/`. Configuration: `components.json`.
    *   Path alias for UI components: `@/components/ui`.
*   **Styling**:
    *   Tailwind CSS v4. Configured via `@tailwindcss/vite` in `vite.renderer.config.mts`.
    *   Global styles and Tailwind layers in `src/styles/global.css`.
    *   CSS variables for theming (light/dark modes) defined in `src/styles/global.css`.
    *   Default font: Berkeley Mono, defined in `src/styles/fonts.css` and applied in `global.css`.
*   **Routing**:
    *   TanStack Router. Configuration in `src/routes/`. Uses `createMemoryHistory`.
*   **Internationalization (i18n)**:
    *   Uses `i18next` and `react-i18next`.
    *   Configuration: `src/localization/i18n.ts`.
    *   Language toggle: `src/components/LangToggle.tsx` utilizes `src/helpers/language_helpers.ts`.

## 6. Key Features & Implementations

*   **Custom Title Bar**:
    *   Enabled by `titleBarStyle: 'hidden'` in `src/main.ts`.
    *   Draggable region component: `src/components/DragWindowRegion.tsx`.
    *   Window controls (minimize, maximize, close) are handled via IPC (see `src/helpers/ipc/window/` and `src/helpers/window_helpers.ts`).
*   **Theme Management (Dark/Light/System)**:
    *   IPC-based communication between renderer and main process (see `src/helpers/ipc/theme/`).
    *   Renderer-side logic: `src/helpers/theme_helpers.ts`.
    *   UI toggle component: `src/components/ToggleTheme.tsx`.
    *   Styling implemented using a `dark` class on the `<html>` element and CSS custom properties in `src/styles/global.css`.

## 7. Build & Configuration

*   **`package.json`**: Core project manifest: name (`commander`), scripts, dependencies.
*   **`forge.config.ts`**: Electron Forge configuration.
    *   Integrates Vite for building main, preload, and renderer processes using `@electron-forge/plugin-vite`.
    *   Defines "makers" for creating distributables (e.g., `.exe`, `.dmg`).
    *   Uses `@electron-forge/plugin-fuses` for enhanced security settings.
*   **Vite Configurations**:
    *   `vite.main.config.ts`: For the main process.
    *   `vite.preload.config.ts`: For the preload script.
    *   `vite.renderer.config.mts`: For the renderer process (includes React plugin with React Compiler and Tailwind CSS plugin).
*   **`tsconfig.json`**: TypeScript compiler options. Includes the path alias `@/*` mapping to `src/*`.
*   **`eslint.config.mjs`**: ESLint configuration. Enables `eslint-plugin-react-compiler`.
*   **`components.json`**: Shadcn UI settings (e.g., component paths, Tailwind config).

## 8. Testing

*   **Unit Tests**:
    *   Framework: Vitest, with React Testing Library.
    *   Configuration: `vitest.config.ts`. Tests located in `src/tests/unit/`.
*   **End-to-End (E2E) Tests**:
    *   Framework: Playwright.
    *   Configuration: `playwright.config.ts`. Tests located in `src/tests/e2e/`.

## 9. Important NPM Scripts (from `package.json`)

*   `pnpm start`: Run the app in development mode with hot reloading.
*   `pnpm package`: Package the application into platform-specific bundles.
*   `pnpm make`: Create distributable installers/archives.
*   `pnpm lint`: Check code for linting errors using ESLint.
*   `pnpm format:write`: Format code using Prettier.
*   `pnpm test`: Run Vitest unit tests.
*   `pnpm test:e2e`: Run Playwright E2E tests (requires a prior build via `package` or `make`).
*   `pnpm test:all`: Run both unit and E2E tests.

## 10. Key Conventions & Preferences

*   **Context Isolation**: Enabled for security between main and renderer processes.
*   **React Compiler**: Enabled by default for potential performance optimizations.
*   **Shadcn UI**: Add new components using `npx shadcn@canary add <component-name>` for compatibility with React 19 and Tailwind v4.
*   **Path Aliases**: Use `@/*` to refer to paths relative to the `src/` directory.
*   **Custom Title Bar**: The application uses a custom, frameless window title bar.

This document should provide a solid foundation for understanding and working with the OpenAgents Commander codebase. For more specific details, refer to the individual configuration files mentioned and the original `README-template.md`.
