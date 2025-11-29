import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          // Proxy all /api requests to backend
          target: env.VITE_API_URL || "http://localhost:4005",
          changeOrigin: true,
        },
      },
    },
  };
});
