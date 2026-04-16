import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@anchor-sdk/core': resolve(__dirname, '../../packages/core/src'),
      '@anchor-sdk/vue': resolve(__dirname, '../../packages/vue/src'),
      '@anchor-sdk/ui': resolve(__dirname, '../../packages/ui/src'),
    },
  },
})
