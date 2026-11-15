import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, "public"),
  server: {
    port: 5174,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        remote: resolve(__dirname, "remote.html"),
        models: resolve(__dirname, "models.html"),
      },
    },
  },
});
