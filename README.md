# Anchor SDK

A Vue 3 SDK for attaching discussion threads to any UI element.

[![CI](https://github.com/ProtoNestLab/anchr/actions/workflows/ci.yml/badge.svg)](https://github.com/ProtoNestLab/anchr/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@anchor-sdk/core)](https://www.npmjs.com/package/@anchor-sdk/core)

**[Documentation](https://protonestlab.github.io/anchr/)** · **[StackBlitz Demo](https://stackblitz.com/github/ProtoNestLab/anchr/tree/main/apps/demo?file=src/App.vue)**

---

## Features

- **Anchor anything** — wrap any UI element to make it discussable
- **Full thread lifecycle** — create, resolve, reopen, delete threads
- **Rich messages** — edit, delete, markdown rendering, emoji reactions
- **User identity** — configurable current user
- **Real-time sync** — optional `subscribe()` for live updates
- **Plugin system** — lifecycle hooks for mentions, analytics, etc.
- **Theming** — CSS custom properties with dark mode support
- **Headless mode** — `useAnchor()` composable for fully custom UI
- **Backend agnostic** — built-in REST adapter or implement your own

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

## Packages

| Package                                                              | Description                            |
| -------------------------------------------------------------------- | -------------------------------------- |
| [`@anchor-sdk/core`](https://www.npmjs.com/package/@anchor-sdk/core) | Types, client, adapters, plugin system |
| [`@anchor-sdk/vue`](https://www.npmjs.com/package/@anchor-sdk/vue)   | Vue 3 components and composables       |
| [`@anchor-sdk/ui`](https://www.npmjs.com/package/@anchor-sdk/ui)     | Pre-built UI components                |

## Core API

### Types

```ts
type User = { id: string; name: string; avatar?: string }
type Reaction = { emoji: string; userId: string }

type Message = {
  id: string
  content: string
  createdAt: number
  updatedAt?: number
  user: User
  reactions: Reaction[]
}

type Thread = {
  id: string
  anchorId: string
  messages: Message[]
  resolved: boolean
  lastActivityAt: number
}
```

### Adapter Interface

```ts
interface Adapter {
  // Threads
  getThreads(anchorId: string): Promise<Thread[]>
  createThread(anchorId: string, content: string): Promise<Thread>
  resolveThread(threadId: string): Promise<Thread>
  reopenThread(threadId: string): Promise<Thread>
  deleteThread(threadId: string): Promise<void>

  // Messages
  addMessage(threadId: string, content: string): Promise<Message>
  editMessage(messageId: string, content: string): Promise<Message>
  deleteMessage(threadId: string, messageId: string): Promise<void>

  // Reactions
  addReaction(messageId: string, emoji: string): Promise<Message>
  removeReaction(messageId: string, emoji: string): Promise<Message>

  // Real-time (optional)
  subscribe?(anchorId: string, callback: (threads: Thread[]) => void): () => void
}
```

### Client

```ts
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'

const client = createClient({
  adapter: createMemoryAdapter(), // or createRestAdapter({ baseUrl, headers })
  user: { id: 'u1', name: 'Alice' },
  plugins: [myPlugin],
})
```

### REST Adapter

```ts
import { createRestAdapter } from '@anchor-sdk/core'

const adapter = createRestAdapter({
  baseUrl: 'https://api.example.com',
  headers: { Authorization: `Bearer ${token}` },
})
```

Expected endpoints:

| Method   | Endpoint                         | Body                    | Description     |
| -------- | -------------------------------- | ----------------------- | --------------- |
| `GET`    | `/threads?anchorId=:id`          | —                       | List threads    |
| `POST`   | `/threads`                       | `{ anchorId, content }` | Create thread   |
| `PATCH`  | `/threads/:id/resolve`           | —                       | Resolve thread  |
| `PATCH`  | `/threads/:id/reopen`            | —                       | Reopen thread   |
| `DELETE` | `/threads/:id`                   | —                       | Delete thread   |
| `POST`   | `/threads/:id/messages`          | `{ content }`           | Add message     |
| `PATCH`  | `/messages/:id`                  | `{ content }`           | Edit message    |
| `DELETE` | `/threads/:tid/messages/:mid`    | —                       | Delete message  |
| `POST`   | `/messages/:id/reactions`        | `{ emoji }`             | Add reaction    |
| `DELETE` | `/messages/:id/reactions/:emoji` | —                       | Remove reaction |

## Vue Integration

### Components

```vue
<!-- Provider -->
<CollabProvider :client="client">
  <App />
</CollabProvider>

<!-- All-in-one (easiest) -->
<AnchorDiscussion anchor-id="order-123">
  <div>Order #123</div>
</AnchorDiscussion>

<!-- Manual composition -->
<Anchor id="order-123">
  <div ref="el">Order #123</div>
  <template #overlay="{ hovered }">
    <CommentButton v-if="hovered" :count="3" @click="open" />
  </template>
</Anchor>
```

### Composables

```ts
// Full API
const {
  threads,
  createThread,
  addMessage,
  editMessage,
  deleteMessage,
  resolveThread,
  reopenThread,
  deleteThread,
  addReaction,
  removeReaction,
  refresh,
} = useThreads('order-123')

// Headless — all logic, zero UI
const {
  threads,
  open,
  messageCount,
  unreadCount,
  hasThreads,
  send,
  toggle,
  show,
  hide,
  markAsRead,
  // ...plus all useThreads methods
} = useAnchor('order-123')
```

## Theming

All UI components use CSS custom properties:

```css
:root {
  --anchor-primary: #2563eb;
  --anchor-bg: #ffffff;
  --anchor-text: #0f172a;
  --anchor-border: #e2e8f0;
  /* See docs for full list */
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --anchor-bg: #1e293b;
    --anchor-text: #f1f5f9;
    --anchor-border: #334155;
  }
}
```

## Plugins

```ts
import type { Plugin } from '@anchor-sdk/core'

const analytics: Plugin = {
  name: 'analytics',
  afterCreateThread(thread) {
    track('thread_created', { anchorId: thread.anchorId })
  },
  afterAddMessage(message) {
    track('message_sent', { userId: message.user.id })
  },
}

const client = createClient({ adapter, plugins: [analytics] })
```

## Development

```bash
pnpm install
pnpm dev          # Start demo app
pnpm test         # Run tests
pnpm lint         # Lint
pnpm build        # Build all packages
pnpm size         # Check bundle sizes
pnpm docs:dev     # Docs dev server
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT
