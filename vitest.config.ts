import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@anchor-sdk/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@anchor-sdk/vue': path.resolve(__dirname, 'packages/vue/src/index.ts'),
      '@anchor-sdk/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
  },
})
