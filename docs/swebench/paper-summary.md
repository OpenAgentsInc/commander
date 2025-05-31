https://arxiv.org/pdf/2310.06770

This paper introduces **SWE-bench**, a new benchmark designed to evaluate the ability of large language models (LMs) to resolve real-world software engineering issues from GitHub.

The authors argue that existing coding benchmarks are often too simplistic and don't reflect the complexities of real software development, such as navigating large codebases, understanding interactions across multiple files, and dealing with long contexts.

**SWE-bench Construction & Task:**
*   It comprises **2,294 task instances** derived from actual GitHub issues and their corresponding merged pull requests (PRs) across **12 popular Python repositories** (e.g., Django, scikit-learn, Matplotlib).
*   For each task, an LM is provided with the **issue description** and a **snapshot of the entire codebase**.
*   The LM's goal is to **generate a code patch** (an edit to the codebase) that resolves the issue.
*   **Evaluation is execution-based:** The generated patch is applied, and the repository's unit tests (specifically "fail-to-pass" tests identified from the original PR) are run. A task is considered "resolved" if the patch applies successfully and all relevant tests pass.

**Key Features of SWE-bench:**
*   **Realistic Tasks:** Involves understanding and coordinating changes across multiple functions, classes, and files.
*   **Long Contexts:** Requires processing large codebases and detailed issue descriptions.
*   **Robust Evaluation:** Uses real-world unit tests.
*   **Continually Updatable:** The collection process can be applied to new issues.
*   **Diverse Problems:** Covers a range of software engineering challenges beyond simple code generation.
*   **SWE-bench Lite:** A 300-instance subset for faster evaluation.
*   **SWE-bench-train:** A separate training dataset of 19,000 instances from 37 *different* repositories to facilitate open model development without data contamination.

**Experimental Setup & Models:**
*   Due to large codebases, context is provided to LMs via:
    *   **Sparse Retrieval (BM25):** To select relevant files.
    *   **"Oracle" Retrieval:** (For analysis) Provides the exact files edited in the human-written reference PR.
    *   **"Oracle"-collapsed Retrieval:** (For analysis) Oracle files, but non-edited code lines are collapsed to reduce context noise.
*   Models evaluated include state-of-the-art proprietary models (Claude 2, ChatGPT-3.5, GPT-4, Claude 3 Opus) and an open-source model fine-tuned by the authors, **SWE-Llama** (based on CodeLlama 7B and 13B), using the SWE-bench-train dataset.

**Key Findings:**
*   **Current LMs struggle significantly.** With BM25 retrieval, the best-performing model at the time of initial submission, Claude 2, resolved only **1.96%** of issues. The later-added Claude 3 Opus achieved **3.79%**.
*   Performance improves with "oracle" retrieval (Claude 2: 4.8%, Claude 3 Opus: 6.93% reported in appendix) and "oracle"-collapsed retrieval (Claude 2: 5.93%, Claude 3 Opus: 9.39%), highlighting the critical challenge of **identifying relevant context** within large codebases.
*   Models tend to generate **shorter and simpler edits** than the human-written gold patches.
*   Fine-tuned SWE-Llama models are competitive with proprietary models in some oracle settings but are sensitive to context distribution shifts (perform worse with BM25 than oracle if trained on oracle-like context).
*   Difficulty correlates with total context length; longer contexts tend to degrade performance.
*   Performance does *not* strongly correlate with the issue's age, suggesting models aren't simply "cheating" by memorizing solutions from their training data.

**Contributions:**
1.  The **SWE-bench benchmark** itself, offering a challenging and realistic evaluation for LMs in software engineering.
2.  The **SWE-bench-train dataset** to promote open research.
3.  The **SWE-Llama models** as strong open-source baselines.
4.  A thorough evaluation demonstrating the current limitations of LMs on complex, real-world code modification tasks.

The paper concludes that SWE-bench represents a step towards developing LMs that are more practical, intelligent, and autonomous in software engineering.
