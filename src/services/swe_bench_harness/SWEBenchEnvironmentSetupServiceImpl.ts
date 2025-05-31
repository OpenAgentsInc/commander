import { Effect, Layer } from "effect";
import { SWEBenchEnvironmentSetupService, type EnvironmentSetupConfig } from "./SWEBenchEnvironmentSetupService";
import type { SWEBenchTask } from "./types";
import { TelemetryService } from "@/services/telemetry";
import { ConfigurationService } from "@/services/configuration";

// Repository-specific environment configurations
// This mimics the logic from official SWE-Bench's create_dockerfile.py
const REPO_CONFIGS: Record<string, Partial<EnvironmentSetupConfig>> = {
  "django/django": {
    systemPackages: ["libpq-dev", "postgresql-client", "python3-dev", "libmemcached-dev"],
    condaPackages: [],
    pipPackages: ["tblib", "asgiref>=3.2"],
    setupCommands: [
      "apt-get update",
      "apt-get install -y libpq-dev postgresql-client python3-dev libmemcached-dev"
    ]
  },
  "scikit-learn/scikit-learn": {
    systemPackages: ["build-essential", "gfortran", "libopenblas-dev", "liblapack-dev", "pkg-config"],
    condaPackages: ["numpy", "scipy", "cython"],
    pipPackages: [],
    setupCommands: [
      "apt-get update", 
      "apt-get install -y build-essential gfortran libopenblas-dev liblapack-dev pkg-config"
    ]
  },
  "matplotlib/matplotlib": {
    systemPackages: ["libfreetype6-dev", "pkg-config", "libpng-dev", "libjpeg-dev", "ghostscript", "inkscape"],
    condaPackages: ["numpy"],
    pipPackages: ["cycler>=0.10", "kiwisolver>=1.0.1", "pyparsing>=2.2.1", "python-dateutil>=2.1"],
    setupCommands: [
      "apt-get update",
      "apt-get install -y libfreetype6-dev pkg-config libpng-dev libjpeg-dev ghostscript inkscape"
    ]
  },
  "sympy/sympy": {
    systemPackages: [],
    condaPackages: [],
    pipPackages: ["mpmath>=0.19"],
    setupCommands: []
  },
  "pytest-dev/pytest": {
    systemPackages: [],
    condaPackages: [],
    pipPackages: ["setuptools>=40.0", "attrs>=17.4.0", "more-itertools>=4.0", "pluggy>=0.12,<2.0", "py>=1.8.2"],
    setupCommands: []
  },
  "pallets/flask": {
    systemPackages: [],
    condaPackages: [],
    pipPackages: ["werkzeug>=0.15", "jinja2>=2.10.1", "click>=5.1", "itsdangerous>=0.24"],
    setupCommands: []
  },
  "psf/requests": {
    systemPackages: [],
    condaPackages: [],
    pipPackages: ["urllib3>=1.21.1,<1.27", "certifi>=2017.4.17", "chardet>=3.0.2,<6", "idna>=2.5,<4"],
    setupCommands: []
  },
  "pandas-dev/pandas": {
    systemPackages: ["build-essential", "python3-dev"],
    condaPackages: ["numpy", "cython"],
    pipPackages: ["python-dateutil>=2.8.1", "pytz>=2020.1"],
    setupCommands: [
      "apt-get update",
      "apt-get install -y build-essential python3-dev"
    ]
  },
  "astropy/astropy": {
    systemPackages: ["build-essential", "python3-dev"],
    condaPackages: ["numpy", "cython"],
    pipPackages: ["PyYAML>=3.13", "packaging>=16.0"],
    setupCommands: [
      "apt-get update",
      "apt-get install -y build-essential python3-dev"
    ]
  },
  "sphinx-doc/sphinx": {
    systemPackages: ["graphviz", "imagemagick", "texlive-latex-base", "texlive-latex-extra"],
    condaPackages: [],
    pipPackages: ["docutils>=0.14", "Pygments>=2.0", "alabaster>=0.7,<0.8"],
    setupCommands: [
      "apt-get update",
      "apt-get install -y graphviz imagemagick texlive-latex-base texlive-latex-extra"
    ]
  }
};

// Python version mapping for common repositories
// Extended with more repositories and versions
const PYTHON_VERSION_MAP: Record<string, Record<string, string>> = {
  "django/django": {
    "2.0": "3.5",
    "2.1": "3.5",
    "2.2": "3.5",
    "3.0": "3.6",
    "3.1": "3.6", 
    "3.2": "3.6",
    "4.0": "3.8",
    "4.1": "3.8",
    "4.2": "3.8",
    "5.0": "3.10"
  },
  "scikit-learn/scikit-learn": {
    "0.19": "3.5",
    "0.20": "3.5",
    "0.21": "3.5",
    "0.22": "3.5",
    "0.23": "3.6",
    "0.24": "3.6",
    "1.0": "3.7",
    "1.1": "3.8",
    "1.2": "3.8",
    "1.3": "3.8"
  },
  "matplotlib/matplotlib": {
    "2.0": "3.5",
    "2.1": "3.5",
    "2.2": "3.5",
    "3.0": "3.6",
    "3.1": "3.6",
    "3.2": "3.6",
    "3.3": "3.6",
    "3.4": "3.7",
    "3.5": "3.7",
    "3.6": "3.8",
    "3.7": "3.8"
  },
  "pandas-dev/pandas": {
    "0.24": "3.5",
    "0.25": "3.5", 
    "1.0": "3.6",
    "1.1": "3.6",
    "1.2": "3.7",
    "1.3": "3.7",
    "1.4": "3.8",
    "1.5": "3.8",
    "2.0": "3.8"
  },
  "sympy/sympy": {
    "1.4": "3.5",
    "1.5": "3.5",
    "1.6": "3.6",
    "1.7": "3.6",
    "1.8": "3.6",
    "1.9": "3.8",
    "1.10": "3.8",
    "1.11": "3.8"
  },
  "pytest-dev/pytest": {
    "3.": "3.5",
    "4.": "3.5",
    "5.": "3.5",
    "6.": "3.6",
    "7.": "3.7"
  }
};

export const SWEBenchEnvironmentSetupServiceLive = Layer.effect(
  SWEBenchEnvironmentSetupService,
  Effect.gen(function* () {
    const telemetry = yield* TelemetryService;
    const config = yield* ConfigurationService;

    return SWEBenchEnvironmentSetupService.of({
      analyzeTaskEnvironment: (task) =>
        Effect.gen(function* () {
          // Track telemetry
          yield* telemetry.trackEvent({
            category: "swe_bench",
            action: "environment_analysis_start", 
            label: task.instance_id,
            context: { 
              repo: task.repo,
              version: task.version 
            }
          }).pipe(Effect.catchAll(() => Effect.void));

          // Get default Python version from config
          const defaultPythonVersion = yield* config.get("SWE_BENCH_DEFAULT_PYTHON_VERSION")
            .pipe(Effect.orElse(() => Effect.succeed("3.8")));

          // Start with defaults
          let envConfig: EnvironmentSetupConfig = {
            pythonVersion: defaultPythonVersion,
            systemPackages: [],
            condaPackages: [],
            pipPackages: [],
            setupCommands: []
          };

          // Get repository-specific config
          const repoConfig = REPO_CONFIGS[task.repo];
          if (repoConfig) {
            envConfig = { ...envConfig, ...repoConfig };
          }

          // Determine Python version
          if (task.version) {
            // Check if we have a specific mapping
            const versionMap = PYTHON_VERSION_MAP[task.repo];
            if (versionMap) {
              // Look for exact match first
              if (versionMap[task.version]) {
                envConfig.pythonVersion = versionMap[task.version];
              } else {
                // Try prefix matching for pytest-like versioning
                const versionPrefix = Object.keys(versionMap).find(key => 
                  task.version?.startsWith(key)
                );
                if (versionPrefix) {
                  envConfig.pythonVersion = versionMap[versionPrefix];
                }
              }
            } else if (/^\d+\.\d+(\.\d+)?$/.test(task.version)) {
              // If task.version looks like a Python version, use it
              envConfig.pythonVersion = task.version;
            }
          }

          // Add base setup commands if not already present
          if (envConfig.setupCommands.length === 0 && envConfig.systemPackages.length > 0) {
            envConfig.setupCommands = [
              "apt-get update",
              `apt-get install -y ${envConfig.systemPackages.join(" ")}`
            ];
          }

          // Track the resolved configuration
          yield* telemetry.trackEvent({
            category: "swe_bench",
            action: "environment_analysis_complete",
            label: task.instance_id,
            context: {
              pythonVersion: envConfig.pythonVersion,
              systemPackagesCount: envConfig.systemPackages.length,
              pipPackagesCount: envConfig.pipPackages.length,
              condaPackagesCount: envConfig.condaPackages.length
            }
          }).pipe(Effect.catchAll(() => Effect.void));

          return envConfig;
        }),

      generateSetupScript: (envConfig, containerRepoPath, virtualEnvPath) =>
        Effect.gen(function* () {
          const lines: string[] = [
            "#!/bin/bash",
            "set -eo pipefail",
            "",
            "echo '=== Environment Setup Script ==='",
            `echo 'Repository: ${containerRepoPath}'`,
            `echo 'Virtual Environment: ${virtualEnvPath}'`,
            `echo 'Python Version Target: ${envConfig.pythonVersion}'`,
            "",
            "# Ensure we're in the right directory",
            `cd ${containerRepoPath}`,
            ""
          ];

          // System packages installation
          if (envConfig.setupCommands.length > 0) {
            lines.push("echo '=== Installing System Packages ==='");
            envConfig.setupCommands.forEach(cmd => {
              lines.push(`${cmd} || { echo 'Warning: System package installation failed, continuing...'; }`);
            });
            lines.push("");
          }

          // Virtual environment activation
          lines.push("echo '=== Activating Virtual Environment ==='");
          // Check if it's a conda environment or venv
          lines.push(`if [ -d "${virtualEnvPath}/bin" ]; then`);
          lines.push(`  source ${virtualEnvPath}/bin/activate`);
          lines.push(`elif [ -f "/opt/miniconda/etc/profile.d/conda.sh" ]; then`);
          lines.push(`  source /opt/miniconda/etc/profile.d/conda.sh`);
          lines.push(`  conda activate \${CONDA_ENV_NAME}`);
          lines.push(`else`);
          lines.push(`  echo "Error: Could not activate virtual environment"`);
          lines.push(`  exit 1`);
          lines.push(`fi`);
          lines.push("");
          lines.push("echo \"Python: $(which python) - $(python --version)\"");
          lines.push("echo \"Pip: $(which pip) - $(pip --version)\"");
          lines.push("");

          // Install Conda packages if specified
          if (envConfig.condaPackages.length > 0) {
            lines.push("echo '=== Installing Conda Packages ==='");
            lines.push(`if command -v conda &> /dev/null; then`);
            lines.push(`  conda install -y ${envConfig.condaPackages.join(" ")} || echo "Warning: Some conda packages failed to install"`);
            lines.push(`else`);
            lines.push(`  echo "Conda not available, trying pip for: ${envConfig.condaPackages.join(" ")}"`);
            lines.push(`  pip install ${envConfig.condaPackages.join(" ")} || echo "Warning: Some packages failed to install via pip"`);
            lines.push(`fi`);
            lines.push("");
          }

          // Install additional pip packages
          if (envConfig.pipPackages.length > 0) {
            lines.push("echo '=== Installing Additional Python Packages ==='");
            lines.push(`pip install ${envConfig.pipPackages.join(" ")} || echo "Warning: Some pip packages failed to install"`);
            lines.push("");
          }

          // Check for and install from various dependency files
          lines.push("echo '=== Installing Repository Dependencies ==='");
          
          // Look for dependency files in order of preference
          lines.push("# Check for test requirements first");
          lines.push("if [ -f test-requirements.txt ]; then");
          lines.push("  echo 'Installing from test-requirements.txt'");
          lines.push("  pip install -r test-requirements.txt || echo 'Warning: test-requirements.txt installation had errors'");
          lines.push("fi");
          lines.push("");

          lines.push("if [ -f requirements-test.txt ]; then");
          lines.push("  echo 'Installing from requirements-test.txt'");
          lines.push("  pip install -r requirements-test.txt || echo 'Warning: requirements-test.txt installation had errors'");
          lines.push("fi");
          lines.push("");

          lines.push("# Development requirements");
          lines.push("if [ -f requirements-dev.txt ]; then");
          lines.push("  echo 'Installing from requirements-dev.txt'");
          lines.push("  pip install -r requirements-dev.txt || echo 'Warning: requirements-dev.txt installation had errors'");
          lines.push("elif [ -f dev-requirements.txt ]; then");
          lines.push("  echo 'Installing from dev-requirements.txt'");
          lines.push("  pip install -r dev-requirements.txt || echo 'Warning: dev-requirements.txt installation had errors'");
          lines.push("fi");
          lines.push("");

          lines.push("# Main requirements");
          lines.push("if [ -f requirements.txt ]; then");
          lines.push("  echo 'Installing from requirements.txt'");
          lines.push("  pip install -r requirements.txt || echo 'Warning: requirements.txt installation had errors'");
          lines.push("fi");
          lines.push("");

          lines.push("# Environment.yml (try to extract pip dependencies)");
          lines.push("if [ -f environment.yml ] || [ -f environment.yaml ]; then");
          lines.push("  echo 'Found environment.yml - attempting to extract pip dependencies'");
          lines.push("  # Simple extraction of pip dependencies from environment.yml");
          lines.push("  if grep -q 'pip:' environment.yml 2>/dev/null || grep -q 'pip:' environment.yaml 2>/dev/null; then");
          lines.push("    echo 'Extracting pip dependencies from environment.yml'");
          lines.push("    # This is a simplified approach - in production would use proper YAML parser");
          lines.push("    awk '/pip:/{flag=1; next} /^[^ ]/{flag=0} flag && /^ *- /{gsub(/^ *- /, \"\"); print}' environment.yml > /tmp/pip_deps.txt 2>/dev/null || true");
          lines.push("    if [ -s /tmp/pip_deps.txt ]; then");
          lines.push("      pip install -r /tmp/pip_deps.txt || echo 'Warning: Some pip dependencies from environment.yml failed'");
          lines.push("    fi");
          lines.push("  fi");
          lines.push("fi");
          lines.push("");

          lines.push("# Setup.py or pyproject.toml");
          lines.push("if [ -f setup.py ]; then");
          lines.push("  echo 'Installing from setup.py in editable mode'");
          lines.push("  pip install -e . || echo 'Warning: setup.py installation had errors'");
          lines.push("elif [ -f pyproject.toml ]; then");
          lines.push("  echo 'Found pyproject.toml - installing in editable mode'");
          lines.push("  pip install -e . || echo 'Warning: pyproject.toml installation had errors'");
          lines.push("fi");
          lines.push("");

          lines.push("# Final pytest installation to ensure it's available");
          lines.push("echo '=== Ensuring pytest is installed ==='");
          lines.push("pip install pytest || echo 'Warning: pytest installation failed'");
          lines.push("");

          lines.push("echo '=== Environment Setup Complete ==='");
          lines.push("echo 'Installed packages:'");
          lines.push("pip list | head -20");
          lines.push("echo '... (truncated)'");
          lines.push("");
          lines.push("echo 'Python executable: '$(which python)");
          lines.push("echo 'Python version: '$(python --version)");

          // Track telemetry
          yield* telemetry.trackEvent({
            category: "swe_bench",
            action: "setup_script_generated",
            label: containerRepoPath,
            context: {
              pythonVersion: envConfig.pythonVersion,
              hasSystemPackages: envConfig.systemPackages.length > 0,
              hasCondaPackages: envConfig.condaPackages.length > 0,
              hasPipPackages: envConfig.pipPackages.length > 0
            }
          }).pipe(Effect.catchAll(() => Effect.void));

          return lines.join("\n");
        }),

      extractTestTargets: (testPatch) =>
        Effect.gen(function* () {
          const targets: string[] = [];
          const seenTargets = new Set<string>();
          
          // Parse the diff to find test files and functions
          const lines = testPatch.split('\n');
          let currentFile: string | null = null;
          let inHunk = false;
          
          for (const line of lines) {
            // Check for file headers in diff
            if (line.startsWith('diff --git')) {
              // Reset for new file
              currentFile = null;
              inHunk = false;
            } else if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
              const match = line.match(/[+-]{3} [ab]\/(.*\.py)$/);
              if (match) {
                // Only consider test files
                const filePath = match[1];
                if (filePath.includes('test') || filePath.includes('Test')) {
                  currentFile = filePath;
                }
              }
            } else if (line.startsWith('@@')) {
              // Entering a hunk
              inHunk = true;
            }
            
            // Look for test definitions in added lines
            if (currentFile && inHunk && line.startsWith('+') && !line.startsWith('+++')) {
              const lineContent = line.substring(1); // Remove the '+' prefix
              
              // Match test functions (including async)
              const funcMatches = [
                // Standard test function
                lineContent.match(/^\s*def\s+(test_\w+)\s*\(/),
                // Async test function
                lineContent.match(/^\s*async\s+def\s+(test_\w+)\s*\(/),
                // Test method in class
                lineContent.match(/^\s+def\s+(test_\w+)\s*\(self/),
                // Async test method in class
                lineContent.match(/^\s+async\s+def\s+(test_\w+)\s*\(self/)
              ];
              
              for (const match of funcMatches) {
                if (match && match[1]) {
                  const target = `${currentFile}::${match[1]}`;
                  if (!seenTargets.has(target)) {
                    targets.push(target);
                    seenTargets.add(target);
                  }
                }
              }
              
              // Match test classes
              const classMatch = lineContent.match(/^class\s+(Test\w+)[\s(:]/);
              if (classMatch && classMatch[1]) {
                const target = `${currentFile}::${classMatch[1]}`;
                if (!seenTargets.has(target)) {
                  targets.push(target);
                  seenTargets.add(target);
                }
              }
              
              // Match unittest style test methods
              const unittestMatch = lineContent.match(/^\s+def\s+(test\w+)\s*\(self/);
              if (unittestMatch && unittestMatch[1] && !unittestMatch[1].startsWith('test_')) {
                // Find the current class context (would need more sophisticated parsing)
                const target = `${currentFile}::${unittestMatch[1]}`;
                if (!seenTargets.has(target)) {
                  targets.push(target);
                  seenTargets.add(target);
                }
              }
            }
          }
          
          // If no specific test functions/classes found, look for modified test files
          if (targets.length === 0) {
            const fileSet = new Set<string>();
            
            // Look for test files in the patch
            const filePatterns = [
              /(?:---|\+\+\+) [ab]\/(.*test.*\.py)/gi,
              /(?:---|\+\+\+) [ab]\/(.*Test.*\.py)/gi,
              /(?:---|\+\+\+) [ab]\/(tests?\/.*\.py)/gi
            ];
            
            for (const pattern of filePatterns) {
              const matches = [...testPatch.matchAll(pattern)];
              for (const match of matches) {
                if (match[1] && !fileSet.has(match[1])) {
                  targets.push(match[1]);
                  fileSet.add(match[1]);
                }
              }
            }
          }
          
          // Track telemetry
          yield* telemetry.trackEvent({
            category: "swe_bench",
            action: "test_targets_extracted",
            label: `${targets.length} targets`,
            context: {
              targetCount: targets.length,
              hasSpecificTargets: targets.some(t => t.includes('::')),
              sampleTargets: targets.slice(0, 3)
            }
          }).pipe(Effect.catchAll(() => Effect.void));
          
          return targets;
        })
    });
  })
);