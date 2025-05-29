# Fix ToolResultDisplay Width Issue - 2216

## Problem
When tool results contain long lines (like the server log with JSON unmarshaling error), the text was expanding beyond the container width and breaking the chat layout. The `<pre>` element with `whitespace-pre` was preventing proper horizontal scrolling within its container.

## Solution
Added horizontal scroll handling to the ToolResultDisplay component:

1. Added `overflow-hidden` to the outer container to prevent layout breakage
2. Added `overflow-x-auto` to the `<pre>` element to enable horizontal scrolling for long lines

## Changes Made
- `/src/components/coder/ToolResultDisplay.tsx`:
  - Added `overflow-hidden` class to outer div
  - Added `overflow-x-auto` to the `<pre>` element

## Result
Long lines in tool results now scroll horizontally within their container, preventing the chat window from expanding beyond its intended width while keeping the content accessible.