import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
export default defineConfig((configEnv) => {
  const isDevelopment = configEnv.mode === 'development';
  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Disable the watcher in development mode to prevent rebuilds
      watch: isDevelopment ? null : undefined,
    },
    // As a safety net, if Vite's dev server were used for main (less common):
    server: isDevelopment ? {
      watch: null, // Disables watcher for Vite's dev server
    } : undefined,
  };
});
