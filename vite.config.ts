import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: {
      // acquisition API (server/) — see docker-compose.yml for the containerised pair
      "/api": { target: process.env.ACQ_API_TARGET ?? "http://localhost:4000", changeOrigin: true },
    },
  },
});
