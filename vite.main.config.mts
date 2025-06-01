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
      // Completely disable file watching in development mode
      watch: isDevelopment ? false : undefined,
      rollupOptions: {
        external: [
          // Externalize electron
          'electron',
          // Externalize problematic native modules
          'cpu-features',
          'dockerode',
          'docker-modem', 
          'ssh2',
          // Also match any deep imports
          /^cpu-features/,
          /^dockerode/,
          /^docker-modem/,
          /^ssh2/,
        ],
      },
    },
    // As a safety net, if Vite's dev server were used for main (less common):
    server: isDevelopment ? {
      watch: false, // Completely disable file watching
    } : undefined,
  };
});
