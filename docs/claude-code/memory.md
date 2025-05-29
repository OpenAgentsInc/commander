# Manage Claude's memory

Claude Code can remember your preferences across sessions, like style guidelines and common commands in your workflow.

## Determine memory type

Claude Code offers three memory locations, each serving a different purpose:

| Memory Type | Location | Purpose | Use Case Examples |
|------------|----------|---------|-------------------|
| **Project memory** | `./CLAUDE.md` | Team-shared instructions for the project | Project architecture, coding standards, common workflows |
| **User memory** | `~/.claude/CLAUDE.md` | Personal preferences for all projects | Code styling preferences, personal tooling shortcuts |
| **Project memory (local)** | `./CLAUDE.local.md` | Personal project-specific preferences | *(Deprecated)* Your sandbox URLs, preferred test data |

All memory files are automatically loaded into Claude Code's context when launched.

## CLAUDE.md imports

CLAUDE.md files can import additional files using `@path/to/import` syntax:

```
See @README for project overview and @package.json for available npm commands for this project.

# Additional Instructions
- git workflow @docs/git-instructions.md
```

Both relative and absolute paths are allowed. Importing files in the user's home directory is convenient for individual instructions.

## How Claude looks up memories

Claude Code reads memories recursively:
- Starts in the current working directory
- Recurses up to root (/) reading CLAUDE.md or CLAUDE.local.md files
- Discovers CLAUDE.md in subtrees, loading them when reading files in those subtrees

## Quickly add memories with the `#` shortcut

Start your input with `#` to quickly add a memory. You'll be prompted to select which memory file to store it in.

## Directly edit memories with `/memory`

Use the `/memory` slash command to open any memory file in your system editor.

## Memory best practices

- **Be specific**: "Use 2-space indentation" is better than "Format code properly"
- **Use structure to organize**: Format memories as bullet points under descriptive headings
- **Review periodically**: Update memories as your project evolves