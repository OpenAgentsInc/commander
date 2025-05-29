# CLI usage and controls

## Getting started

Claude Code provides two main ways to interact:

- **Interactive mode**: Run `claude` to start a REPL session
- **One-shot mode**: Use `claude -p "query"` for quick commands

```bash
# Start interactive mode
claude

# Start with an initial query
claude "explain this project"

# Run a single command and exit
claude -p "what does this function do?"

# Process piped content
cat logs.txt | claude -p "analyze these errors"
```

## CLI commands

| Command | Description | Example |
|---------|-------------|---------|
| `claude` | Start interactive REPL | `claude` |
| `claude "query"` | Start REPL with initial prompt | `claude "explain this project"` |
| `claude -p "query"` | Run one-off query, then exit | `claude -p "explain this function"` |
| `cat file \| claude -p "query"` | Process piped content | `cat logs.txt \| claude -p "explain"` |
| `claude -c` | Continue most recent conversation | `claude -c` |
| `claude config` | Configure settings | `claude config set --global theme dark` |

(The full document continues with more detailed sections on CLI flags, slash commands, and special shortcuts)