import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// El plugin de Tailwind v4 reemplaza por completo al setup viejo de PostCSS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Alias "@" -> src, requerido por shadcn/ui para sus imports.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
