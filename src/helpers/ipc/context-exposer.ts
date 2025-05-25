import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeOllamaContext } from "./ollama/ollama-context";
import { exposeClaudeCodeContext } from "./claude_code/claude-code-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeOllamaContext();
  exposeClaudeCodeContext();
}
