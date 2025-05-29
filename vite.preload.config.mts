import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig((configEnv) => {
  const isDevelopment = configEnv.mode === 'development';
  return {
    build: {
      // Completely disable file watching in development mode
      watch: isDevelopment ? false : undefined,
    },
    // As a safety net, if Vite's dev server were used for preload (less common):
    server: isDevelopment ? {
      watch: false, // Completely disable file watching
    } : undefined,
  };
});
