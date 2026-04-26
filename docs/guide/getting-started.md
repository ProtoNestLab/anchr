# Getting Started

## Try Online

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/ProtoNestLab/anchr/tree/main/apps/demo?file=src/App.vue)

## Installation

```bash
pnpm add @anchor-sdk/core @anchor-sdk/vue @anchor-sdk/ui
```

## Quick Start

```vue
<script setup lang="ts">
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'

const client = createClient({
  adapter: createMemoryAdapter(),
  user: { id: 'u1', name: 'Alice' },
})
</script>

<template>
  <CollabProvider :client="client">
    <AnchorDiscussion anchor-id="my-element">
      <div>This element can be discussed</div>
    </AnchorDiscussion>
  </CollabProvider>
</template>
```

This gives you:

- Hover to show a comment button with unread indicator
- Click to open a discussion popover
- Create, edit, and delete messages
- Resolve/reopen threads
- Emoji reactions
- Markdown rendering
- Keyboard navigation (Esc to close, Enter to send)

## With a REST Backend

```ts
import { createClient, createRestAdapter } from '@anchor-sdk/core'

const client = createClient({
  adapter: createRestAdapter({
    baseUrl: 'https://api.example.com',
    headers: { Authorization: `Bearer ${token}` },
  }),
  user: { id: currentUser.id, name: currentUser.name },
})
```

## With WebSocket (Real-Time)

```ts
import { createClient, createWebSocketAdapter } from '@anchor-sdk/core'

const client = createClient({
  adapter: createWebSocketAdapter({
    url: 'wss://api.example.com/ws',
    restBaseUrl: 'https://api.example.com',
    headers: { Authorization: `Bearer ${token}` },
  }),
  user: { id: currentUser.id, name: currentUser.name },
})
```

This gives you live thread updates, presence indicators, and typing indicators over WebSocket, with automatic reconnect.

## Full Example

```vue
<script setup lang="ts">
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'

const client = createClient({
  adapter: createMemoryAdapter(),
  user: { id: 'u1', name: 'Alice' },
})

const orders = [
  { id: 1, name: 'Order A', status: 'Pending' },
  { id: 2, name: 'Order B', status: 'Shipped' },
]
</script>

<template>
  <CollabProvider :client="client">
    <div v-for="order in orders" :key="order.id">
      <AnchorDiscussion :anchor-id="`order-${order.id}`">
        <div class="order-card">
          <h3>{{ order.name }}</h3>
          <span>{{ order.status }}</span>
        </div>
      </AnchorDiscussion>
    </div>
  </CollabProvider>
</template>
```

## With AI Agent

Anchor SDK v1.5 新增 AI Agent 功能，支持通过 `@agent` 指令调用 AI 能力：

```vue
<script setup lang="ts">
import { createClient, createMemoryAdapter, createOfflineQueue } from '@anchor-sdk/core'
import { createAgentPlugin } from '@anchor-sdk/core/agent'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'

const rawAdapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
const offlineQueue = createOfflineQueue({ adapter: rawAdapter })

const agentPlugin = createAgentPlugin({
  kimiApiKey: import.meta.env.VITE_ARK_API_KEY || '',
  prompt: '你是一个专业的AI助手',
  tools: ['knowledge_base'],
  knowledgeBase: {
    id: 'demo-knowledge-base',
    name: '产品知识库',
    documents: [
      {
        id: 'doc-1',
        name: '产品手册.md',
        type: 'md',
        content: '# 产品手册\n\n## 产品功能\n- 功能A\n- 功能B',
      },
    ],
  },
  mockMode: !import.meta.env.VITE_ARK_API_KEY,
})

const client = createClient({
  adapter: offlineQueue.adapter,
  user: { id: 'u1', name: 'Alice' },
  plugins: [agentPlugin],
})
</script>

<template>
  <CollabProvider :client="client">
    <AnchorDiscussion anchor-id="my-discussion">
      <div>讨论内容</div>
    </AnchorDiscussion>
  </CollabProvider>
</template>
```

使用方式：在讨论中输入 `@agent 你的问题` 即可触发 AI 助手。

## Next Steps

- [AI Agent](/guide/agent) — Integrate Kimi LLM, knowledge base, tools
- [Real-Time Collaboration](/guide/real-time) — WebSocket, presence, typing, offline support
- [Custom Adapter](/guide/custom-adapter) — Connect to your own backend
- [Plugins](/guide/plugins) — Hook into message lifecycle
- [Theming](/guide/theming) — Customize colors and dark mode
- [Headless Mode](/guide/headless) — Build fully custom UI
