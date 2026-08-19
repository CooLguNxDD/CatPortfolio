/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: "/CatPortfolio/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 11000,
  },
  preview: {
    port: 11000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
  build: {
    rollupOptions: {
      output: {
        // Keep three and tanstack out of the main index chunk.
        manualChunks(id: string) {
          if (id.includes("node_modules/three")) return "three"
          if (id.includes("node_modules/@tanstack")) return "tanstack"
        },
      },
    },
  },
})

