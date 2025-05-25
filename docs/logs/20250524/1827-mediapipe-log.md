We're implementing docs/logs/20250524/1804-mediapipe-analysis.md.

We won't use git-lfs, gitignore approach preferred.

public/assets/models/gemma-3n-E4B-it-int4.task is gitignored and ready to use.

Created gemmaService in src/services/gemma/gemmaService.ts

Note every other service in that folder uses Effect. Ours doesn't, but we'll address that after these initial instructions are followed.

Created GemmaChat component in src/components/gemma/GemmaChat.tsx

Let's put that in a pane. Or put that as an option in our existing chat pane.
