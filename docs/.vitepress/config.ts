import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Anchor SDK',
  description: 'UI Anchor-based discussion SDK for Vue 3',
  base: '/anchr/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Real-Time Collaboration', link: '/guide/real-time' },
            { text: 'Custom Adapter', link: '/guide/custom-adapter' },
            { text: 'Plugins', link: '/guide/plugins' },
            { text: 'AI Agent', link: '/guide/agent' },
            { text: 'Theming', link: '/guide/theming' },
            { text: 'Headless Mode', link: '/guide/headless' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: '@anchor-sdk/core', link: '/api/core' },
            { text: '@anchor-sdk/vue', link: '/api/vue' },
            { text: '@anchor-sdk/ui', link: '/api/ui' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/ProtoNestLab/anchr' }],
  },
})
