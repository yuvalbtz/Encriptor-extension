import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync } from 'fs'
import sharp from 'sharp'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-assets',
      closeBundle() {
        // Copy manifest.json to dist
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json'),

        ),
          copyFileSync(
            resolve(__dirname, 'rules.json'),
            resolve(__dirname, 'dist/rules.json')
          )

        // Generate and copy icons
        const sizes = [16, 48, 128]
        sizes.forEach(size => {
          sharp(resolve(__dirname, 'public/icon.svg'))
            .resize(size, size)
            .toFile(resolve(__dirname, `dist/icon${size}.png`))
            .catch((err: Error) => console.error(`Error generating icon${size}.png:`, err))
        })
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    target: 'esnext',
    assetsDir: '',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
