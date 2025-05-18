import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
