# OpenAgents Commander

Our new flagship app, introduced in [episode 170](https://x.com/OpenAgentsInc/status/1919797578452869267).

## Running a dev build

```bash
git clone https://github.com/OpenAgentsInc/commander.git
cd commander
pnpm i
pnpm dev
```

To chat, you must have [Ollama](https://ollama.com/) running. The current chat model used is `gemma3`, which you can preload in Ollama by running `ollama pull gemma3`.

## Tech Stack

*   **Application Framework:** [Electron](https://www.electronjs.org) (~v35)
*   **Build Tool & Dev Server:** [Vite](https://vitejs.dev) (~v6)
*   **UI Framework:** [React 19](https://reactjs.org)
*   **UI Components & Styling:** [Shadcn UI](https://ui.shadcn.com) & [Tailwind CSS v4](https://tailwindcss.com)
*   **Core Language:** [TypeScript](https://www.typescriptlang.org) (~v5.8)
*   **Routing:** [TanStack Router](https://tanstack.com/router)
*   **Data Fetching & State Management:** [React Query (TanStack Query)](https://tanstack.com/query/latest)
*   **Internationalization (i18n):** [i18next](https://www.i18next.com)
*   **Testing:**
    *   Unit/Integration: [Vitest](https://vitest.dev)
    *   End-to-End (E2E): [Playwright](https://playwright.dev)
*   **Packaging & Distribution:** [Electron Forge](https://www.electronforge.io)
*   **Code Quality:** [ESLint](https://eslint.org) (~v9) & [Prettier](https://prettier.io)
*   **Package Manager:** [pnpm](https://pnpm.io/)

For a more comprehensive overview of the project architecture, specific configurations, and development guidelines, please refer to our [Developer Onboarding Guide](./docs/AGENTS.md).
