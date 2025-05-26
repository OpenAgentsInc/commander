# OpenAgents Commander

Our new flagship app, introduced in [episode 170](https://x.com/OpenAgentsInc/status/1919797578452869267).

## Running a dev build

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/OpenAgentsInc/commander.git
    cd commander
    ```

2.  **Install pnpm (if you haven't already):**
    [pnpm](https://pnpm.io/) is the package manager used for this project. If you don't have pnpm installed, you can install it using npm (which comes with Node.js):
    ```bash
    npm install -g pnpm
    ```
    For other installation methods (like Homebrew, or using a specific version), please refer to the [official pnpm installation guide](https://pnpm.io/installation).

3.  **Install dependencies:**
    ```bash
    pnpm i
    ```

4.  **Run the development server:**
    ```bash
    pnpm start
    ```
    This will automatically start both the app and the Claude Bridge Service. To run just the app without the bridge:
    ```bash
    pnpm start:app-only
    ```

To chat, you must have [Ollama](https://ollama.com/) running. The current chat model used is `gemma3:1b`, which you can preload in Ollama by running `ollama pull gemma3:1b`.

### Claude Code Integration

To use Claude Code as an AI provider, you need to:

1. Install the Claude CLI: `npm install -g @anthropic-ai/cli`
2. Authenticate: `claude auth`
3. **(New)** When "Claude Code (CLI)" is selected in the Agent Chat pane, a folder icon button will appear. Click this to select an active project folder. This folder path will be passed to the Claude Code CLI (as `--project-path <path>`) for context.

The bridge service is automatically started when you run `pnpm start`. Additional commands:
- `pnpm bridge` - Start bridge service only
- `pnpm bridge:stop` - Stop bridge service
- `pnpm start:app-only` - Start app without bridge service

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
