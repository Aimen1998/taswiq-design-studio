import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** The standalone app (app/) — the published package itself is plain source in src/. */
export default defineConfig({
  root: "app",
  publicDir: "public",
  plugins: [react(), tailwindcss()],
  worker: { format: "es" },
  build: { outDir: "../dist", emptyOutDir: true, target: "es2022" },
  optimizeDeps: { exclude: ["onnxruntime-web"] },
});
