import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeOllamaContext } from "./ollama/ollama-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposeOllamaContext();
}
