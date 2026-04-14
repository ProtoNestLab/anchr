# Anchor SDK

A Vue 3 SDK for attaching discussion threads to any UI element.

[![CI](https://github.com/ProtoNestLab/anchr/actions/workflows/ci.yml/badge.svg)](https://github.com/ProtoNestLab/anchr/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@anchor-sdk/core)](https://www.npmjs.com/package/@anchor-sdk/core)

**[Documentation](https://protonestlab.github.io/anchr/)** · **[StackBlitz Demo](https://stackblitz.com/github/ProtoNestLab/anchr/tree/main/apps/demo?file=src/App.vue)**

---

## Features

- **Anchor anything** — wrap any UI element to make it discussable
- **Full thread lifecycle** — create, resolve, reopen, delete threads
- **Rich messages** — markdown editor with preview, edit, delete, emoji reactions
- **Attachments** — file/image uploads via adapter extension point
- **@mentions** — autocomplete users while typing, with a headless `useMentions` composable
- **Virtual scrolling** — handle long threads without jank
- **User identity** — configurable current user
- **Real-time sync** — WebSocket adapter with auto-reconnect, or use `subscribe()` for custom transports
- **Presence & typing** — see who's online and who's typing in real time
- **Optimistic updates** — instant UI feedback with automatic rollback on failure
- **Offline support** — queue mutations while offline, auto-flush on reconnect
- **Error handling** — `loading` and `error` states with graceful UI fallbacks
- **Accessible** — ARIA roles, labels, keyboard navigation throughout
- **Plugin system** — lifecycle hooks for mentions, analytics, etc.
- **Theming** — CSS custom properties with dark mode support
- **Headless mode** — `useAnchor()` composable for fully custom UI
- **Backend agnostic** — built-in REST, WebSocket, and memory adapters, or implement your own

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

type Attachment = {
  id: string
  name: string
  url: string
  mimeType: string
  size: number
  width?: number
  height?: number
}

type Message = {
  id: string
  content: string
  createdAt: number
  updatedAt?: number
  user: User
  reactions: Reaction[]
  attachments?: Attachment[]
}

type Thread = {
  id: string
  anchorId: string
  messages: Message[]
  resolved: boolean
  lastActivityAt: number
}

type PresenceStatus = 'online' | 'away' | 'offline'

type PresenceInfo = {
  user: User
  status: PresenceStatus
  lastSeen: number
}
```

### Adapter Interface

```ts
interface MessageOptions {
  attachments?: Attachment[]
}

interface Adapter {
  // Threads
  getThreads(anchorId: string): Promise<Thread[]>
  createThread(anchorId: string, content: string, options?: MessageOptions): Promise<Thread>
  resolveThread(threadId: string): Promise<Thread>
  reopenThread(threadId: string): Promise<Thread>
  deleteThread(threadId: string): Promise<void>

  // Messages
  addMessage(threadId: string, content: string, options?: MessageOptions): Promise<Message>
  editMessage(messageId: string, content: string): Promise<Message>
  deleteMessage(threadId: string, messageId: string): Promise<void>

  // Reactions
  addReaction(messageId: string, emoji: string): Promise<Message>
  removeReaction(messageId: string, emoji: string): Promise<Message>

  // Attachments (optional)
  uploadAttachment?(file: File): Promise<Attachment>

  // Real-time (optional)
  subscribe?(anchorId: string, callback: (threads: Thread[]) => void): () => void

  // Presence (optional)
  setPresence?(anchorId: string, user: User, status: PresenceStatus): Promise<void>
  getPresence?(anchorId: string): Promise<PresenceInfo[]>
  subscribePresence?(anchorId: string, callback: (presence: PresenceInfo[]) => void): () => void

  // Typing indicators (optional)
  setTyping?(anchorId: string, user: User, isTyping: boolean): Promise<void>
  subscribeTyping?(anchorId: string, callback: (users: User[]) => void): () => void

  // Connection lifecycle (optional)
  connect?(): void
  disconnect?(): void
}
```

### Client

```ts
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'

const client = createClient({
  adapter: createMemoryAdapter(), // or createRestAdapter, createWebSocketAdapter
  user: { id: 'u1', name: 'Alice' },
  plugins: [myPlugin],
})
```

### Adapters

#### Memory Adapter

In-memory adapter for development and testing. Supports all features including presence and typing.

```ts
const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
```

#### REST Adapter

```ts
import { createRestAdapter } from '@anchor-sdk/core'

const adapter = createRestAdapter({
  baseUrl: 'https://api.example.com',
  headers: { Authorization: `Bearer ${token}` },
})
```

Expected endpoints:

| Method   | Endpoint                         | Body                                  | Description                              |
| -------- | -------------------------------- | ------------------------------------- | ---------------------------------------- |
| `GET`    | `/threads?anchorId=:id`          | —                                     | List threads                             |
| `POST`   | `/threads`                       | `{ anchorId, content, attachments? }` | Create thread                            |
| `PATCH`  | `/threads/:id/resolve`           | —                                     | Resolve thread                           |
| `PATCH`  | `/threads/:id/reopen`            | —                                     | Reopen thread                            |
| `DELETE` | `/threads/:id`                   | —                                     | Delete thread                            |
| `POST`   | `/threads/:id/messages`          | `{ content, attachments? }`           | Add message                              |
| `PATCH`  | `/messages/:id`                  | `{ content }`                         | Edit message                             |
| `DELETE` | `/threads/:tid/messages/:mid`    | —                                     | Delete message                           |
| `POST`   | `/messages/:id/reactions`        | `{ emoji }`                           | Add reaction                             |
| `DELETE` | `/messages/:id/reactions/:emoji` | —                                     | Remove reaction                          |
| `POST`   | `/attachments`                   | `FormData { file }`                   | Upload attachment (returns `Attachment`) |

#### WebSocket Adapter

Real-time adapter using WebSocket for live updates with REST fallback for mutations.

```ts
import { createWebSocketAdapter } from '@anchor-sdk/core'

const adapter = createWebSocketAdapter({
  url: 'wss://api.example.com/ws',
  restBaseUrl: 'https://api.example.com',
  headers: { Authorization: `Bearer ${token}` },
  reconnectDelay: 1000, // initial reconnect delay (default: 1000ms)
  maxReconnectDelay: 30000, // max reconnect delay (default: 30000ms)
})
```

Features:

- REST mutations + WebSocket real-time subscriptions
- Auto-reconnect with exponential backoff
- Thread, presence, and typing subscriptions
- `connect()` / `disconnect()` lifecycle methods

#### Offline Queue

Wrap any adapter with offline support:

```ts
import { createOfflineQueue, createRestAdapter } from '@anchor-sdk/core'

const { adapter, goOnline, goOffline, status, pending } = createOfflineQueue({
  adapter: createRestAdapter({ baseUrl: '...' }),
  onStatusChange: (status) => console.log('Connection:', status),
})

// Mutations are queued while offline and flushed on goOnline()
```

## Vue Integration

### Components

```vue
<!-- Provider -->
<CollabProvider :client="client">
  <App />
</CollabProvider>

<!-- All-in-one (easiest) -->
<AnchorDiscussion
  anchor-id="order-123"
  :mention-users="teamMembers"
  :virtualize="true"
  :virtualize-threshold="50"
>
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
// Full API with error handling and optimistic updates
const {
  threads, // Ref<Thread[]>
  loading, // Ref<boolean>
  error, // Ref<Error | null>
  createThread, // (content, options?) => Promise — optimistic
  addMessage, // (threadId, content, options?) => Promise — optimistic
  editMessage, // (messageId, content) => Promise — optimistic
  deleteMessage, // (threadId, messageId) => Promise — optimistic
  resolveThread, // (threadId) => Promise — optimistic
  reopenThread, // (threadId) => Promise — optimistic
  deleteThread, // (threadId) => Promise — optimistic
  addReaction, // (messageId, emoji) => Promise — optimistic
  removeReaction, // (messageId, emoji) => Promise — optimistic
  uploadAttachment, // (file) => Promise<Attachment | undefined>
  refresh, // () => Promise<void>
} = useThreads('order-123')

// @mention autocomplete (headless)
const text = ref('')
const mentions = useMentions({
  text,
  resolveUsers: () => [
    { id: 'u1', name: 'Alice' },
    { id: 'u2', name: 'Bob' },
  ],
})
// mentions.onInput(cursor), mentions.moveUp/moveDown, mentions.select(cursor)
// expose: active, query, suggestions, selectedIndex, loading

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

// Presence & typing indicators
const {
  presence, // Ref<PresenceInfo[]>
  typingUsers, // Ref<User[]>
  setOnline,
  setAway,
  setOffline,
  startTyping,
  stopTyping,
} = usePresence('order-123')
```

## Theming

All UI components use CSS custom properties:

```css
:root {
  --anchor-primary: #2563eb;
  --anchor-bg: #ffffff;
  --anchor-text: #0f172a;
  --anchor-border: #e2e8f0;
  --anchor-error-bg: #fef2f2;
  --anchor-error-text: #dc2626;
  --anchor-error-border: #fecaca;
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
pnpm test         # Run tests (139 tests)
pnpm lint         # Lint
pnpm build        # Build all packages
pnpm size         # Check bundle sizes
pnpm docs:dev     # Docs dev server
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT
