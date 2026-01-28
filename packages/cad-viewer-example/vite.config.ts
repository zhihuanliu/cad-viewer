import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import type { Plugin, ViteDevServer } from 'vite'
import { Alias, defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'

// Plugin to serve worker files in development mode
function workerFilesPlugin(): Plugin {
  return {
    name: 'worker-files-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/assets', (req, res, next) => {
        const url = req.url || ''
        if (url.endsWith('-worker.js')) {
          // Map URL to actual file paths
          const workerFileMap: Record<string, string> = {
            'dxf-parser-worker.js': resolve(__dirname, 'node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js'),
            'mtext-renderer-worker.js': resolve(__dirname, 'node_modules/@mlightcad/cad-simple-viewer/dist/mtext-renderer-worker.js'),
            'libredwg-parser-worker.js': resolve(__dirname, 'node_modules/@mlightcad/cad-simple-viewer/dist/libredwg-parser-worker.js')
          }

          const fileName = url.split('/').pop() || ''
          const filePath = workerFileMap[fileName]

          if (filePath && existsSync(filePath)) {
            try {
              const content = readFileSync(filePath, 'utf-8')
              res.setHeader('Content-Type', 'application/javascript')
              res.setHeader('Cache-Control', 'no-cache')
              res.end(content)
              return
            } catch (error) {
              console.error(`Failed to read worker file: ${filePath}`, error)
            }
          }
        }
        next()
      })
    }
  }
}

export default defineConfig(({ command, mode }) => {
  const aliases: Alias[] = []
  if (command === 'serve') {
    aliases.push({
      find: /^@mlightcad\/(svg-renderer|three-renderer|cad-simple-viewer|cad-viewer)$/,
      replacement: resolve(__dirname, '../$1/src')
    })
  }

  const plugins = [
    vue(),
    svgLoader(),
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js',
          dest: 'assets'
        },
        {
          src: './node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
          dest: 'assets'
        }
      ]
    })
  ]

  // Add worker files plugin for development mode
  if (command === 'serve') {
    plugins.push(workerFilesPlugin())
  }

  // Add conditional plugins
  if (mode === 'analyze') {
    plugins.push(visualizer())
  }

  return {
    base: './',
    resolve: {
      alias: aliases
    },
    build: {
      outDir: 'dist',
      modulePreload: false,
      rollupOptions: {
        // Main entry point for the app
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: plugins
  }
})
