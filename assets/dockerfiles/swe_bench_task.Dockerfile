# Stage 1: Base Conda environment (official SWE-Bench base image or similar)
ARG SWE_BENCH_BASE_IMAGE_ARG=swebench/swe-eval:latest
FROM ${SWE_BENCH_BASE_IMAGE_ARG} as conda_base
# Base image should have Miniconda at /opt/miniconda and git, git-lfs

# Stage 2: Task Environment Setup using arguments passed at build time
FROM conda_base as task_env
ARG PYTHON_VERSION_ARG=3.8
ARG CONDA_ENV_NAME_ARG=swe_bench_task_env

# Create and activate conda environment with specified Python version
# This RUN command will execute in the context of the base image's default shell
RUN conda create -n ${CONDA_ENV_NAME_ARG} python=${PYTHON_VERSION_ARG} -y && \
    echo "Conda env ${CONDA_ENV_NAME_ARG} with Python ${PYTHON_VERSION_ARG} created."

# Stage 3: Task-specific repository setup and final environment
# This stage uses the task_env as its base
FROM task_env as instance
ARG REPO_URL_ARG
ARG BASE_COMMIT_ARG
ARG CONTAINER_REPO_PATH_ARG=/opt/swe-bench/repo
ARG CONDA_ENV_NAME_ARG

ENV CONDA_ENV_NAME=${CONDA_ENV_NAME_ARG}
ENV REPO_URL=${REPO_URL_ARG}
ENV BASE_COMMIT=${BASE_COMMIT_ARG}
ENV CONTAINER_REPO_PATH=${CONTAINER_REPO_PATH_ARG}
# Add conda environment's bin to PATH. This makes `python` and `pip` refer to the env's versions.
ENV PATH=/opt/miniconda/envs/${CONDA_ENV_NAME}/bin:/opt/miniconda/bin:$PATH

# Set the SHELL to activate conda environment for all subsequent RUN commands
# The '-lc' flags ensure that the shell is a login shell and sources .bashrc (where conda init places its hooks)
SHELL ["/bin/bash", "-lc"]

# Verify conda environment is active for RUN commands
RUN echo "Verifying Conda environment in instance stage:" && \
    which python && \
    python --version && \
    conda env list | grep '*'

# Install git-lfs if not already in base and update package lists
RUN apt-get update && apt-get install -y --no-install-recommends git-lfs && rm -rf /var/lib/apt/lists/*

# Clone the specific repository and checkout the base commit
RUN echo "Cloning ${REPO_URL} to ${CONTAINER_REPO_PATH} and checking out ${BASE_COMMIT}" && \
    git clone ${REPO_URL} ${CONTAINER_REPO_PATH} && \
    cd ${CONTAINER_REPO_PATH} && \
    git checkout ${BASE_COMMIT} && \
    (git lfs install --skip-repo && git lfs pull || echo "Git LFS pull skipped or failed (LFS might not be used by this repo).")

# Install repository-specific dependencies from within the cloned repository
# This step runs AFTER the repo is cloned and correct commit is checked out
# The conda environment specified by CONDA_ENV_NAME should already be active due to the SHELL command
RUN echo "Attempting to install dependencies from repo at ${CONTAINER_REPO_PATH}..." && \
    cd ${CONTAINER_REPO_PATH} && \
    echo "Current directory: $(pwd)" && \
    echo "Python version: $(python --version)" && \
    echo "Conda environment: $CONDA_PREFIX" && \
    (test -f environment.yml && echo "Found environment.yml, installing..." && conda env update -n ${CONDA_ENV_NAME} --file environment.yml && echo "environment.yml installed.") || echo "No environment.yml in repo, or update failed." && \
    (test -f requirements.txt && echo "Found requirements.txt, installing..." && pip install --no-cache-dir -r requirements.txt && echo "requirements.txt installed.") || echo "No requirements.txt in repo, or install failed." && \
    (test -f setup.py && echo "Found setup.py, installing in editable mode..." && pip install --no-cache-dir -e . && echo "setup.py installed.") || echo "No setup.py in repo, or install failed." && \
    echo "Dependency installation phase complete."

# Set the working directory for the eval.sh script which will be copied from host
WORKDIR /swe_bench_workdir
CMD ["/bin/bash"]