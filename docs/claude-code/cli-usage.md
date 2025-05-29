# CLI Usage

## Command-line flags

Customize Claude Code's behavior with these command-line flags:

| Flag | Description | Example |
|------|-------------|---------|
| `--print`, `-p` | Print response without interactive mode (see SDK documentation for programmatic usage details) | `claude -p "query"` |
| `--output-format` | Specify output format for print mode (options: text, json, stream-json) | `claude -p "query" --output-format json` |
| `--verbose` | Enable verbose logging, shows full turn-by-turn output (helpful for debugging in both print and interactive modes) | `claude --verbose` |
| `--max-turns` | Limit the number of agentic turns in non-interactive mode | `claude -p --max-turns 3 "query"` |
| `--model` | Sets the model for the current session with an alias for the latest model (sonnet or opus) or a model's full name | `claude --model claude-sonnet-4-20250514` |
| `--permission-prompt-tool` | Specify an MCP tool to handle permission prompts in non-interactive mode | `claude -p --permission-prompt-tool mcp_auth_tool "query"` |
| `--resume` | Resume a specific session by ID, or by choosing in interactive mode | `claude --resume abc123 "query"` |
| `--continue` | Load the most recent conversation in the current directory | `claude --continue` |
| `--dangerously-skip-permissions` | Skip permission prompts (use with caution) | `claude --dangerously-skip-permissions` |

## Basic Commands

```bash
# Start interactive REPL
claude

# Start REPL with initial prompt
claude "write a hello world program"

# Run one-off query and exit
claude -p "what is the capital of France?"

# Process piped content
cat file.txt | claude -p "summarize this file"

# Continue most recent conversation
claude -c

# Resume specific session by ID
claude -r "<session-id>" "continue where we left off"

# Configure settings
claude config

# Update to latest version
claude update

# Configure Model Context Protocol servers
claude mcp
```

## Slash Commands

The following commands are available within the Claude Code REPL:

- `/bug`: Report bugs
- `/clear`: Clear conversation history
- `/compact`: Compact conversation
- `/config`: View/modify configuration
- `/cost`: Show token usage
- `/doctor`: Check Claude Code installation
- `/help`: Get usage help
- `/init`: Initialize project
- `/login`: Switch Anthropic accounts
- `/logout`: Sign out
- `/memory`: Edit memory files
- `/model`: Change AI model
- `/pr_comments`: View PR comments
- `/review`: Request code review
- `/status`: View account/system status
- `/terminal-setup`: Install key bindings
- `/vim`: Enter Vim mode

## Special Shortcuts

- Quick memory with `#`
- Line breaks: `\` or Option+Enter
- Vim mode keybindings supported