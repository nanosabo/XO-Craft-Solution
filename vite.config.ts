import { defineConfig, type Plugin } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";

const wsNodeEntry = path.resolve(__dirname, "node_modules/ws/index.js");

// `ws` exports a browser stub under the `browser` condition, and the Electron
// main build is not an SSR build, so that stub wins unless we pin the id.
const nodeWebSocket = (): Plugin => ({
  name: "node-websocket",
  enforce: "pre",
  resolveId(id) {
    if (id === "ws") return wsNodeEntry;

    // Optional native accelerators. Leaving the require in place lets ws fall back to JS.
    if (id === "bufferutil" || id === "utf-8-validate") {
      return { id, external: true };
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main.ts",
        vite: {
          plugins: [nodeWebSocket()],
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts"),
      },
      // Ployfill the Electron and Node.js built-in modules for Renderer process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "./src"),
      "@electron": path.resolve(__dirname, "./electron"),
      "@styles": path.resolve(__dirname, "./src/assets/styles")
    },
  },
});
