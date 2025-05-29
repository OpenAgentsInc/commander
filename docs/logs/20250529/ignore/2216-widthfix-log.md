# Fix Markdown Width Issues - 2216

## Problem
When markdown content contains code blocks or long lines, they were expanding beyond the container width and breaking the chat layout. This was particularly noticeable with tool results containing server logs with long JSON lines.

## Issues Identified
1. Code blocks in markdown had `w-full` class forcing them to expand
2. Tables also had `w-full` class
3. The markdown container had `overflow-hidden` preventing proper scrolling
4. Code block wrapper divs had conflicting overflow settings

## Solution
Modified the markdown renderer to properly constrain width while allowing horizontal scrolling:

### Changes Made

1. **MarkdownRenderer Component** (`/src/components/ui/markdown-renderer.tsx`):
   - Changed container from `overflow-hidden` to `overflow-x-auto`
   - This allows horizontal scrolling for any overflowing content

2. **CodeBlock Component**:
   - Removed `w-full` from the `pre` class (line 96)
   - Changed wrapper div from `overflow-hidden` to `overflow-x-auto` (line 101)
   - Removed `w-full` from wrapper div
   
3. **Table Styling**:
   - Removed `w-full` from table component (line 173)
   - Tables now size to content instead of forcing full width

## Result
- Code blocks and tables now properly constrain to the chat window width
- Long content shows horizontal scroll bars instead of breaking layout
- The chat window maintains its fixed width
- Content remains fully accessible via scrolling