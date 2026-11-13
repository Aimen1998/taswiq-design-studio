import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** The standalone app (app/) — the published package itself is plain source in src/. */
export default defineConfig({
  root: "app",
  publicDir: "public",
  plugins: [react(), tailwindcss()],
  worker: { format: "es" },
  build: {
    outDir: "../dist", emptyOutDir: true, target: "es2022",
    // Two pages: the landing page (/, no React) and the editor (/editor/).
    rollupOptions: { input: { main: resolve(here, "app/index.html"), editor: resolve(here, "app/editor/index.html") } },
  },
  optimizeDeps: { exclude: ["onnxruntime-web"] },
});
