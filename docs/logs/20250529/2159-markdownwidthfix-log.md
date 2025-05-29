# Markdown Code Block Width Fix

## Problem
When markdown code blocks are rendered in assistant chat messages, the container goes super wide, messing up the whole formatting.

## Solution
Added max-width constraints and overflow handling to prevent code blocks from breaking the layout:

1. **MarkdownRenderer container**: Added `max-w-full overflow-hidden` to the root container
2. **CodeBlock wrapper**: Added `max-w-full overflow-hidden` to the code block wrapper div
3. **Pre element**: Changed `overflow-x-scroll` to `overflow-x-auto` and added `max-w-full`

## Changes Made

### `/src/components/ui/markdown-renderer.tsx`
- Added `max-w-full overflow-hidden` to the MarkdownRenderer container div
- Added `max-w-full` to the pre element class and changed scroll to auto
- Added `max-w-full overflow-hidden` to the code block wrapper div

These changes ensure that:
- Code blocks won't exceed their container width
- Horizontal scrolling is available when needed
- The layout remains stable regardless of code block content width