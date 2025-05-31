import { Effect, Layer } from "effect";
import { SWEBenchEnvironmentSetupService, type EnvironmentSetupConfig } from "./SWEBenchEnvironmentSetupService";
import type { SWEBenchTask } from "./types";
import { TelemetryService } from "@/services/telemetry";

// Repository-specific environment configurations
// This mimics the logic from official SWE-Bench's create_dockerfile.py
const REPO_CONFIGS: Record<string, Partial<EnvironmentSetupConfig>> = {
  "django/django": {
    systemPackages: ["libpq-dev", "postgresql-client"],
    setupCommands: [
      "apt-get update",
      "apt-get install -y libpq-dev postgresql-client"
    ]
  },
  "scikit-learn/scikit-learn": {
    systemPackages: ["build-essential", "gfortran", "libopenblas-dev"],
    setupCommands: [
      "apt-get update", 
      "apt-get install -y build-essential gfortran libopenblas-dev"
    ]
  },
  "matplotlib/matplotlib": {
    systemPackages: ["libfreetype6-dev", "pkg-config"],
    setupCommands: [
      "apt-get update",
      "apt-get install -y libfreetype6-dev pkg-config"
    ]
  },
  "sympy/sympy": {
    systemPackages: [],
    pipPackages: ["mpmath>=0.19"]
  },
  "pytest-dev/pytest": {
    systemPackages: [],
    pipPackages: ["setuptools>=40.0", "attrs>=17.4.0", "more-itertools>=4.0"]
  },
  "pallets/flask": {
    systemPackages: [],
    pipPackages: ["werkzeug>=0.15", "jinja2>=2.10.1", "click>=5.1"]
  },
  "psf/requests": {
    systemPackages: [],
    pipPackages: ["urllib3>=1.21.1,<1.27", "certifi>=2017.4.17", "chardet>=3.0.2,<6", "idna>=2.5,<4"]
  }
};

// Python version mapping for common repositories
const PYTHON_VERSION_MAP: Record<string, Record<string, string>> = {
  "django/django": {
    "3.0": "3.6",
    "3.1": "3.6", 
    "3.2": "3.6",
    "4.0": "3.8",
    "4.1": "3.8",
    "4.2": "3.8"
  },
  "scikit-learn/scikit-learn": {
    "0.20": "3.5",
    "0.21": "3.5",
    "0.22": "3.5",
    "0.23": "3.6",
    "0.24": "3.6",
    "1.0": "3.7",
    "1.1": "3.8",
    "1.2": "3.8"
  }
};

export const SWEBenchEnvironmentSetupServiceLive = Layer.effect(
  SWEBenchEnvironmentSetupService,
  Effect.gen(function* () {
    const telemetry = yield* TelemetryService;

    return SWEBenchEnvironmentSetupService.of({
      analyzeTaskEnvironment: (task) =>
        Effect.gen(function* () {
          // Track telemetry
          yield* telemetry.trackEvent({
            category: "swe_bench",
            action: "environment_analysis_start", 
            label: task.instance_id
          }).pipe(Effect.catchAll(() => Effect.void));

          // Start with defaults
          let config: EnvironmentSetupConfig = {
            pythonVersion: "3.8",
            systemPackages: [],
            condaPackages: [],
            pipPackages: [],
            setupCommands: []
          };

          // Get repository-specific config
          const repoConfig = REPO_CONFIGS[task.repo];
          if (repoConfig) {
            config = { ...config, ...repoConfig };
          }

          // Determine Python version
          if (task.version) {
            // Check if we have a specific mapping
            const versionMap = PYTHON_VERSION_MAP[task.repo];
            if (versionMap && versionMap[task.version]) {
              config.pythonVersion = versionMap[task.version];
            } else if (/^\d+\.\d+(\.\d+)?$/.test(task.version)) {
              // If task.version looks like a Python version, use it
              config.pythonVersion = task.version;
            } else {
              // Try to extract major.minor version
              const match = task.version.match(/(\d+)\.(\d+)/);
              if (match) {
                // For library versions, we'll keep default Python
                // In a real implementation, we'd have more sophisticated mapping
              }
            }
          }

          // Add base setup commands if not already present
          if (config.setupCommands.length === 0 && config.systemPackages.length > 0) {
            config.setupCommands = [
              "apt-get update",
              `apt-get install -y ${config.systemPackages.join(" ")}`
            ];
          }

          return config;
        }),

      generateSetupScript: (config, containerRepoPath, virtualEnvPath) =>
        Effect.gen(function* () {
          const lines: string[] = [
            "#!/bin/bash",
            "set -eo pipefail",
            "",
            "echo '=== Environment Setup Script ==='",
            `echo 'Repository: ${containerRepoPath}'`,
            `echo 'Virtual Environment: ${virtualEnvPath}'`,
            `echo 'Python Version Target: ${config.pythonVersion}'`,
            ""
          ];

          // System packages installation
          if (config.setupCommands.length > 0) {
            lines.push("echo '=== Installing System Packages ==='");
            config.setupCommands.forEach(cmd => {
              lines.push(cmd);
            });
            lines.push("");
          }

          // Virtual environment setup (already created by Dockerfile)
          lines.push("echo '=== Activating Virtual Environment ==='");
          lines.push(`source ${virtualEnvPath}/bin/activate`);
          lines.push("which python");
          lines.push("python --version");
          lines.push("");

          // Navigate to repository
          lines.push(`cd ${containerRepoPath}`);
          lines.push("");

          // Install Python packages
          if (config.pipPackages.length > 0) {
            lines.push("echo '=== Installing Additional Python Packages ==='");
            lines.push(`pip install ${config.pipPackages.join(" ")}`);
            lines.push("");
          }

          // Check for and install from various dependency files
          lines.push("echo '=== Installing Repository Dependencies ==='");
          
          // environment.yml (for conda, but we'll try pip equivalent)
          lines.push("if [ -f environment.yml ]; then");
          lines.push("  echo 'Found environment.yml - extracting pip dependencies'");
          lines.push("  # In a real implementation, we'd parse YAML");
          lines.push("  # For now, we'll skip this");
          lines.push("fi");
          lines.push("");

          // requirements.txt
          lines.push("if [ -f requirements.txt ]; then");
          lines.push("  echo 'Installing from requirements.txt'");
          lines.push("  pip install -r requirements.txt");
          lines.push("elif [ -f requirements-dev.txt ]; then");
          lines.push("  echo 'Installing from requirements-dev.txt'");
          lines.push("  pip install -r requirements-dev.txt");
          lines.push("fi");
          lines.push("");

          // setup.py
          lines.push("if [ -f setup.py ]; then");
          lines.push("  echo 'Installing from setup.py in editable mode'");
          lines.push("  pip install -e .");
          lines.push("fi");
          lines.push("");

          // setup.cfg with pyproject.toml
          lines.push("if [ -f pyproject.toml ]; then");
          lines.push("  echo 'Found pyproject.toml - installing with pip'");
          lines.push("  pip install -e .");
          lines.push("fi");
          lines.push("");

          lines.push("echo '=== Environment Setup Complete ==='");
          lines.push("pip list");

          return lines.join("\n");
        }),

      extractTestTargets: (testPatch) =>
        Effect.gen(function* () {
          const targets: string[] = [];
          
          // Parse the diff to find test files and functions
          const lines = testPatch.split('\n');
          let currentFile: string | null = null;
          
          for (const line of lines) {
            // Check for file headers in diff
            if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
              const match = line.match(/[+-]{3} [ab]\/(.*\.py)$/);
              if (match && match[1].includes('test')) {
                currentFile = match[1];
              }
            }
            
            // Look for test function definitions
            if (currentFile && line.startsWith('+')) {
              const funcMatch = line.match(/\+\s*def\s+(test_\w+)/);
              if (funcMatch) {
                // Add specific test target
                targets.push(`${currentFile}::${funcMatch[1]}`);
              }
              
              const classMatch = line.match(/\+\s*class\s+(Test\w+)/);
              if (classMatch) {
                // Add test class
                targets.push(`${currentFile}::${classMatch[1]}`);
              }
            }
          }
          
          // If no specific targets found, look for test files mentioned
          if (targets.length === 0) {
            const fileMatches = testPatch.matchAll(/(?:---|\+\+\+) [ab]\/(.*test.*\.py)/g);
            for (const match of fileMatches) {
              if (!targets.includes(match[1])) {
                targets.push(match[1]);
              }
            }
          }
          
          return targets;
        })
    });
  })
);