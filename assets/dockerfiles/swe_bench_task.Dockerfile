# Stage 1: Base environment (official SWE-Bench base image)
ARG SWE_BENCH_BASE_IMAGE_ARG=swebench/swe-eval:latest
FROM ${SWE_BENCH_BASE_IMAGE_ARG} as base_env
# Base image has Python 3.8.20 at /usr/local/bin/python

# Stage 2: Task Environment Setup using arguments passed at build time
FROM base_env as task_env
ARG PYTHON_VERSION_ARG=3.8
ARG CONDA_ENV_NAME_ARG=swe_bench_task_env

# For now, we'll use the base Python since the image doesn't have conda
# In a production setup, we might install pyenv or conda here
# Create a virtual environment instead
ENV VIRTUAL_ENV=/opt/venv/${CONDA_ENV_NAME_ARG}
RUN python -m venv ${VIRTUAL_ENV} && \
    echo "Virtual env ${CONDA_ENV_NAME_ARG} created at ${VIRTUAL_ENV}."

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
ENV VIRTUAL_ENV=/opt/venv/${CONDA_ENV_NAME_ARG}
# Add virtual environment's bin to PATH. This makes `python` and `pip` refer to the env's versions.
ENV PATH=${VIRTUAL_ENV}/bin:$PATH

# Verify virtual environment is active for RUN commands
RUN echo "Verifying virtual environment in instance stage:" && \
    which python && \
    python --version && \
    echo "Virtual env: ${VIRTUAL_ENV}"

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
# The virtual environment should already be active due to PATH modification
RUN echo "Attempting to install dependencies from repo at ${CONTAINER_REPO_PATH}..." && \
    cd ${CONTAINER_REPO_PATH} && \
    echo "Current directory: $(pwd)" && \
    echo "Python version: $(python --version)" && \
    echo "Virtual environment: ${VIRTUAL_ENV}" && \
    echo "Which pip: $(which pip)" && \
    (test -f requirements.txt && echo "Found requirements.txt, installing..." && pip install --no-cache-dir -r requirements.txt && echo "requirements.txt installed.") || echo "No requirements.txt in repo, or install failed." && \
    (test -f setup.py && echo "Found setup.py, installing in editable mode..." && pip install --no-cache-dir -e . && echo "setup.py installed.") || echo "No setup.py in repo, or install failed." && \
    echo "Dependency installation phase complete."

# Set the working directory for the eval.sh script which will be copied from host
WORKDIR /swe_bench_workdir
CMD ["/bin/bash"]