# SDK - Anthropic

The Claude Code SDK allows developers to programmatically integrate Claude Code into their applications. It enables running Claude Code as a subprocess, providing a way to build AI-powered coding assistants and tools that leverage Claude’s capabilities.

The SDK currently support command line usage. TypeScript and Python SDKs are coming soon.

## Basic SDK usage

The Claude Code SDK allows you to use Claude Code in non-interactive mode from your applications. Here’s a basic example:

## Advanced usage

### Multi-turn conversations

For multi-turn conversations, you can resume conversations or continue from the most recent session:

### Custom system prompts

You can provide custom system prompts to guide Claude’s behavior:

You can also append instructions to the default system prompt:

### MCP Configuration

The Model Context Protocol (MCP) allows you to extend Claude Code with additional tools and resources from external servers. Using the `--mcp-config` flag, you can load MCP servers that provide specialized capabilities like database access, API integrations, or custom tooling.

Create a JSON configuration file with your MCP servers:

Then use it with Claude Code:

Note: When using MCP tools, you must explicitly allow them using the `--allowedTools` flag. MCP tool names follow the pattern `mcp__<serverName>__<toolName>` where:

- `serverName` is the key from your MCP configuration file
- `toolName` is the specific tool provided by that server

This security measure ensures that MCP tools are only used when explicitly permitted.

## Available CLI options

The SDK leverages all the CLI options available in Claude Code. Here are the key ones for SDK usage:

- Flag: --print, -p
  - Description: Run in non-interactive mode
  - Example: claude -p "query"
- Flag: --output-format
  - Description: Specify output format (text, json, stream-json)
  - Example: claude -p --output-format json
- Flag: --resume, -r
  - Description: Resume a conversation by session ID
  - Example: claude --resume abc123
- Flag: --continue, -c
  - Description: Continue the most recent conversation
  - Example: claude --continue
- Flag: --verbose
  - Description: Enable verbose logging
  - Example: claude --verbose
- Flag: --max-turns
  - Description: Limit agentic turns in non-interactive mode
  - Example: claude --max-turns 3
- Flag: --system-prompt
  - Description: Override system prompt (only with --print)
  - Example: claude --system-prompt "Custom instruction"
- Flag: --append-system-prompt
  - Description: Append to system prompt (only with --print)
  - Example: claude --append-system-prompt "Custom instruction"
- Flag: --allowedTools
  - Description: Comma/space-separated list of allowed tools (includes MCP tools)
  - Example: claude --allowedTools "Bash(npm install),mcp**filesystem**\*"
- Flag: --disallowedTools
  - Description: Comma/space-separated list of denied tools
  - Example: claude --disallowedTools "Bash(git commit),mcp**github**\*"
- Flag: --mcp-config
  - Description: Load MCP servers from a JSON file
  - Example: claude --mcp-config servers.json
- Flag: --permission-prompt-tool
  - Description: MCP tool for handling permission prompts (only with --print)
  - Example: claude --permission-prompt-tool mcp**auth**prompt

For a complete list of CLI options and features, see the [CLI usage](https://docs.anthropic.com/en/docs/claude-code/cli-usage) documentation.

## Output formats

The SDK supports multiple output formats:

### Text output (default)

Returns just the response text:

### JSON output

Returns structured data including metadata:

Response format:

### Streaming JSON output

Streams each message as it is received:

Each conversation begins with an initial `init` system message, followed by a list of user and assistant messages, followed by a final `result` system message with stats. Each message is emitted as a separate JSON object.

## Message schema

Messages returned from the JSON API are strictly typed according to the following schema:

We will soon publish these types in a JSONSchema-compatible format. We use semantic versioning for the main Claude Code package to communicate breaking changes to this format.

## Examples

### Simple script integration

### Processing files with Claude

### Session management

## Best practices

1.  **Use JSON output format** for programmatic parsing of responses:

2.  **Handle errors gracefully** - check exit codes and stderr:

3.  **Use session management** for maintaining context in multi-turn conversations

4.  **Consider timeouts** for long-running operations:

5.  **Respect rate limits** when making multiple requests by adding delays between calls

## Real-world applications

The Claude Code SDK enables powerful integrations with your development workflow. One notable example is the [Claude Code GitHub Actions](https://docs.anthropic.com/en/docs/claude-code/github-actions), which uses the SDK to provide automated code review, PR creation, and issue triage capabilities directly in your GitHub workflow.

- [CLI usage and controls](https://docs.anthropic.com/en/docs/claude-code/cli-usage) - Complete CLI documentation
- [GitHub Actions integration](https://docs.anthropic.com/en/docs/claude-code/github-actions) - Automate your GitHub workflow with Claude
- [Tutorials](https://docs.anthropic.com/en/docs/claude-code/tutorials) - Step-by-step guides for common use cases
