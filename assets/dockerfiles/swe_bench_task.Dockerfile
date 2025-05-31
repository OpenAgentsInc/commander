# Stage 1: Base environment (official SWE-Bench image)
ARG SWE_BENCH_BASE_IMAGE=swebench/swe-eval:latest
FROM ${SWE_BENCH_BASE_IMAGE} as base

# Stage 2: Task-specific repository setup
FROM base as instance
ARG REPO_URL_ARG
ARG BASE_COMMIT_ARG
ARG CONTAINER_REPO_PATH_ARG=/opt/swe-bench/repo

ENV REPO_URL=${REPO_URL_ARG}
ENV BASE_COMMIT=${BASE_COMMIT_ARG}
ENV CONTAINER_REPO_PATH=${CONTAINER_REPO_PATH_ARG}

RUN apt-get update && apt-get install -y --no-install-recommends git-lfs && rm -rf /var/lib/apt/lists/*

# Clone the specific repository and checkout the base commit
# Ensure git-lfs is available if needed by some repos
RUN git clone ${REPO_URL} ${CONTAINER_REPO_PATH} && \
    cd ${CONTAINER_REPO_PATH} && \
    git checkout ${BASE_COMMIT} && \
    (git lfs pull || true) # Attempt lfs pull, ignore if it fails or not configured

# Set the working directory for subsequent commands in the harness
WORKDIR /swe_bench_workdir
# The eval.sh script will be copied here and will cd into CONTAINER_REPO_PATH

# Default command (can be overridden by docker run)
CMD ["/bin/bash"]