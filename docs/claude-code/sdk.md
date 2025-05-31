# Claude Code SDK

The Claude Code SDK allows developers to programmatically integrate Claude Code into their applications. It enables running Claude Code as a subprocess, providing a way to build AI-powered coding assistants and tools that leverage Claude's capabilities.

## Key Features

- Command line usage
- Non-interactive mode
- Multi-turn conversations
- Custom system prompts
- Multiple output formats (text, JSON, streaming JSON)
- Model Context Protocol (MCP) configuration

## Basic SDK Usage

```bash
# Run a single prompt and exit (print mode)
$ claude -p "Write a function to calculate Fibonacci numbers"

# Using a pipe to provide stdin
$ echo "Explain this code" | claude -p

# Output in JSON format with metadata
$ claude -p "Generate a hello world function" --output-format json

# Stream JSON output as it arrives
$ claude -p "Build a React component" --output-format stream-json
```

## Advanced Usage

### Multi-turn Conversations

```bash
# Continue the most recent conversation
$ claude --continue

# Resume a specific conversation by session ID
$ claude --resume 550e8400-e29b-41d4-a716-446655440000
```

### Custom System Prompts

```bash
# Override system prompt
$ claude -p "Build a REST API" --system-prompt "You are a senior backend engineer. Focus on security, performance, and maintainability."
```

## Key CLI Options

| Flag              | Description                       | Example                                       |
| ----------------- | --------------------------------- | --------------------------------------------- |
| `--print`, `-p`   | Run in non-interactive mode       | `claude -p "query"`                           |
| `--output-format` | Specify output format             | `claude -p --output-format json`              |
| `--resume`, `-r`  | Resume conversation by session ID | `claude --resume abc123`                      |
| `--system-prompt` | Override system prompt            | `claude --system-prompt "Custom instruction"` |

## Output Formats

1. **Text output (default)**: Returns response text
2. **JSON output**: Returns structured data with metadata
3. **Streaming JSON output**: Streams messages as they are received

## Best Practices

- Use JSON output
