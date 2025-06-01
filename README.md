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

The bridge service is automatically started when you run `pnpm start`. Additional commands:
- `pnpm bridge` - Start bridge service only
- `pnpm bridge:stop` - Stop bridge service
- `pnpm start:app-only` - Start app without bridge service

## SWE-Bench Harness Prerequisites (Optional)

If you plan to use or develop the SWE-Bench evaluation harness:

1.  **Ensure Docker is installed and running:**
    Docker Desktop (for Mac/Windows) or Docker Engine (for Linux) must be installed and the Docker daemon must be running.

2.  **Prepare the SWE-Bench Base Docker Image:**
    Commander's SWE-Bench harness dynamically builds a custom Docker image for each task instance. This process requires a base image that provides the core Python environment and tools. By default, Commander expects this base image to be named `swebench/swe-eval:latest`.

    **To build this base image locally:**
    1. Clone the official SWE-Bench repository:
       ```bash
       git clone https://github.com/princeton-nlp/SWE-bench.git
       cd SWE-bench
       ```
    2. Build their base Docker image (often referred to as `sweb.base`):
       ```bash
       docker build -f dockerfiles/Dockerfile.base -t sweb.base .
       ```
    3. Tag this image so Commander can find it by the default name:
       ```bash
       docker tag sweb.base swebench/swe-eval:latest
       ```

    **Alternatively**, if you use a different name for your locally built base image (e.g., `my-sweb-base:custom`), you must update Commander's configuration by setting the `SWE_BENCH_BASE_IMAGE_NAME` in the configuration service or relevant environment variable to match your custom image name.

    Having this base image prepared locally will speed up the dynamic per-task image builds performed by the Commander harness.

## Running SWE-Bench Evaluations

The project includes tools for running SWE-Bench task evaluations using official data from Hugging Face.

### Using the UI (Recommended)

The easiest way to run evaluations is through the graphical interface. Press **Ctrl+7** to open the Task Browser and get started.

**[📖 Full UI Guide: Running Evaluations with the UI](./docs/swebench/running-evaluations-ui.md)**

### Prerequisites

1. **Python 3 and pip** - Required for downloading task data
2. **Python dependencies** - Install with:
   ```bash
   pip install datasets huggingface_hub
   ```
   **Note:** Some Hugging Face datasets may require authentication. If you encounter issues, you may need to log in using the Hugging Face CLI: `huggingface-cli login`.

   As a dependency-light alternative for downloading tasks, you can use the `scripts/fetch_swebench_tasks.sh` shell script (requires `curl` and `jq`). However, the Python script is recommended for full compatibility with all dataset features.
3. **Docker** - Must be installed and running
4. **SWE-Bench base image** - Pull with:
   ```bash
   docker pull swebench/swe-eval:latest
   ```

### Downloading Task Data

Use the Python script to download official SWE-Bench tasks:

```bash
# Download SWE-Bench Lite (test split) to assets/swe_bench_data
python scripts/download_swe_bench_tasks.py

# Download first 10 tasks from full SWE-Bench
python scripts/download_swe_bench_tasks.py --dataset_name princeton-nlp/SWE-bench --max_tasks 10

# Download to custom directory
python scripts/download_swe_bench_tasks.py --output_dir ./my-tasks
```

### Running Batch Evaluations

Use the TypeScript batch runner to evaluate multiple tasks:

```bash
# Evaluate with gold patches (default)
pnpm tsx scripts/run_swe_bench_batch_env.ts --instance_ids django__django-11099

# Evaluate with empty patches
pnpm tsx scripts/run_swe_bench_batch_env.ts --patch_source empty --instance_ids django__django-11099

# Evaluate with patches generated by Claude Code agent
pnpm tsx scripts/run_swe_bench_batch_env.ts --patch_source agent:claude_code --instance_ids django__django-11099

# Run multiple tasks
pnpm tsx scripts/run_swe_bench_batch_env.ts --instance_ids "django__django-11099,sympy__sympy-13146"

# Run first 5 tasks and stop if one fails
pnpm tsx scripts/run_swe_bench_batch_env.ts --max_tasks 5 --stop_on_failure

# Use custom task directory
pnpm tsx scripts/run_swe_bench_batch_env.ts --tasks_dir ./my-tasks
```

Note: The `run_swe_bench_batch_env.ts` script uses environment variables for configuration to avoid Effect.js layer composition issues in standalone scripts.

**Important for agent evaluation:** When using `--patch_source agent:claude_code`, ensure that:
- Claude CLI is installed and authenticated (`claude auth`)
- The bridge service is running (`pnpm bridge`)
- The `ANTHROPIC_API_KEY` environment variable is set

Results are saved to `./swebench-results/run-<timestamp>/` with individual result files and a summary.

For more details, see [docs/swebench/running-swebench-tasks.md](./docs/swebench/running-swebench-tasks.md).

## Logging and Observability

Commander includes comprehensive file-based logging for better observability:

- **Log Location**: `<userDataPath>/logs/commander-run.log`
  - macOS: `~/Library/Application Support/commander/logs/commander-run.log`
  - Linux: `~/.config/commander/logs/commander-run.log`
  - Windows: `%APPDATA%\commander\logs\commander-run.log`

- **Log Contents**: Structured entries with timestamp, level, category, action, and context
- **Default Level**: INFO (configurable to DEBUG for more verbose output)
- **SWE-Bench Operations**: Docker builds, container execution, test results all logged

See [docs/swebench/running-swebench-tasks.md](./docs/swebench/running-swebench-tasks.md#logging-and-observability) for detailed logging information.

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
