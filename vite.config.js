import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:8087",
        changeOrigin: true
      },
      "/init": {
        target: "http://localhost:8087",
        changeOrigin: true
      },
      "/stream": {
        target: "http://localhost:8087",
        changeOrigin: true
      }
    }
  }
});
