import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { copyFileSync } from 'fs'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-assets',
      closeBundle() {
        // Copy manifest
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        )

        // Generate and copy icons
        const sizes = [16, 48, 128]
        sizes.forEach(size => {
          sharp(resolve(__dirname, 'src/icon.svg'))
            .resize(size, size)
            .toFile(resolve(__dirname, `dist/icon${size}.png`))
            .catch((err: Error) => console.error(`Error generating icon${size}.png:`, err))
        })
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content.js'),
        background: resolve(__dirname, 'src/background.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    target: 'esnext',
    outDir: 'dist',
    assetsDir: '',
    emptyOutDir: true
  }
})
