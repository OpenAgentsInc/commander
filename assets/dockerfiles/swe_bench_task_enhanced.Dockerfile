# Enhanced SWE-Bench Task Dockerfile with setup script support
# Stage 1: Base environment (official SWE-Bench base image)
ARG SWE_BENCH_BASE_IMAGE_ARG=swebench/swe-eval:latest
FROM ${SWE_BENCH_BASE_IMAGE_ARG} as base_env

# Stage 2: Task Environment Setup using arguments passed at build time
FROM base_env as task_env
ARG PYTHON_VERSION_ARG=3.8
ARG CONDA_ENV_NAME_ARG=swe_bench_task_env

# Install system dependencies that might be needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    git-lfs \
    curl \
    wget \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment with the specified Python version
# Note: The base image might not have the exact Python version, so we use pyenv if needed
ENV VIRTUAL_ENV=/opt/venv/${CONDA_ENV_NAME_ARG}
RUN if command -v python${PYTHON_VERSION_ARG} &> /dev/null; then \
        python${PYTHON_VERSION_ARG} -m venv ${VIRTUAL_ENV}; \
    else \
        python -m venv ${VIRTUAL_ENV}; \
    fi && \
    echo "Virtual env ${CONDA_ENV_NAME_ARG} created at ${VIRTUAL_ENV}."

# Stage 3: Task-specific repository setup and final environment
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
ENV PATH=${VIRTUAL_ENV}/bin:$PATH

# Verify virtual environment
RUN echo "Verifying virtual environment:" && \
    which python && \
    python --version && \
    pip --version

# Clone the repository and checkout the base commit
RUN echo "Cloning ${REPO_URL} to ${CONTAINER_REPO_PATH}" && \
    git clone ${REPO_URL} ${CONTAINER_REPO_PATH} && \
    cd ${CONTAINER_REPO_PATH} && \
    git checkout ${BASE_COMMIT} && \
    (git lfs install --skip-repo && git lfs pull || echo "Git LFS skipped")

# Copy setup script if provided (will be added by DockerBuildManagerService)
# The setup script will handle task-specific dependency installation
COPY setup_environment.sh /tmp/setup_environment.sh
RUN chmod +x /tmp/setup_environment.sh

# Run the setup script
RUN echo "Running environment setup script..." && \
    /tmp/setup_environment.sh && \
    rm /tmp/setup_environment.sh

# Final setup
WORKDIR /swe_bench_workdir
CMD ["/bin/bash"]