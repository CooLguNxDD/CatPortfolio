/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

function serveModelsPlugin() {
  return {
    name: 'serve-models-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url || ''
        if (url.includes('/models/')) {
          const subPath = url.split('/models/')[1]?.split('?')[0]
          if (subPath) {
            const filePath = path.resolve(process.cwd(), 'public/models', subPath)
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              if (filePath.endsWith('.glb')) {
                res.setHeader('Content-Type', 'model/gltf-binary')
              } else if (filePath.endsWith('.png')) {
                res.setHeader('Content-Type', 'image/png')
              } else if (filePath.endsWith('.json')) {
                res.setHeader('Content-Type', 'application/json')
              }
              res.setHeader('Access-Control-Allow-Origin', '*')
              return fs.createReadStream(filePath).pipe(res)
            }
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: "/CatPortfolio/",
  publicDir: path.resolve(import.meta.dirname, "./public"),
  assetsInclude: ["**/*.glb"],
  plugins: [react(), tailwindcss(), serveModelsPlugin()],
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
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/victory-vendor")
          ) {
            return "recharts"
          }
        },
      },
    },
  },
})

