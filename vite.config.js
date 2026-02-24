import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET?.trim();
  const parsedPort = Number(env.VITE_DEV_PORT);
  const hasValidPort = Number.isInteger(parsedPort) && parsedPort > 0;

  const proxy = proxyTarget
    ? {
        "/api": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/init": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/stream": {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    : undefined;

  return {
    plugins: [react()],
    server: {
      ...(hasValidPort ? { port: parsedPort } : {}),
      ...(proxy ? { proxy } : {})
    }
  };
});
