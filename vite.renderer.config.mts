import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig((configEnv) => {
  const isDevelopment = configEnv.mode === 'development';
  return {
    server: {
      hmr: false, // Hardcoded disable of hot reload
      // Disable file watching completely in development
      watch: isDevelopment ? null : {
        // Keep the ignore patterns for production/other modes
        ignored: [
          '**/*.md',         // Ignores all .md files in the project
          '**/docs/**',      // Ignores everything in docs folders
          '**/*.log',        // Also ignore log files
          '**/logs/**',      // Ignore log directories
        ],
      },
    },
    plugins: [
      tailwindcss(),
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler"]],
        },
      }),
    ],
    resolve: {
      preserveSymlinks: true,
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
