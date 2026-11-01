import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    proxy: {
      "/healthz": process.env.DOKIMOS_API_TARGET ?? "http://127.0.0.1:4000",
      "/api": process.env.DOKIMOS_API_TARGET ?? "http://127.0.0.1:4000",
      // Realtime hints: Socket.IO over WebSocket. The API compares Origin with Host, so
      // keep the browser's Host rather than rewriting it to the target.
      "/socket.io": { target: process.env.DOKIMOS_API_TARGET ?? "http://127.0.0.1:4000", ws: true },
    },
  },
});
