import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = path.resolve(import.meta.dirname);
const original = path.resolve(root, "../frontend/src");

export default defineConfig({
  plugins: [react(), {
    name: "quotation-api-adapter",
    enforce: "pre",
    async resolveId(source, importer) {
      if ((source === "../lib/api" || source === "./api") && importer?.startsWith(original)) {
        return path.resolve(root, "src/api.js");
      }
      if (importer?.startsWith(original) && /^(react|jspdf|lucide-react|sonner)$/.test(source)) {
        return this.resolve(source, path.resolve(root, "src/main.jsx"), { skipSelf: true });
      }
    },
  }],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: { outDir: "dist" },
});
