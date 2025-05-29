import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig((configEnv) => {
  const isDevelopment = configEnv.mode === 'development';
  return {
    build: {
      // Disable the watcher in development mode to prevent rebuilds
      watch: isDevelopment ? null : undefined,
    },
    // As a safety net, if Vite's dev server were used for preload (less common):
    server: isDevelopment ? {
      watch: null, // Disables watcher for Vite's dev server
    } : undefined,
  };
});
