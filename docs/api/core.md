# @anchor-sdk/core

Core package providing types, client factory, adapters, and plugin system.

## Types

### `User`

```ts
type User = {
  id: string
  name: string
  avatar?: string
}
```

### `Reaction`

```ts
type Reaction = {
  emoji: string
  userId: string
}
```

### `Message`

```ts
type Message = {
  id: string
  content: string
  createdAt: number
  updatedAt?: number
  user: User
  reactions: Reaction[]
}
```

### `Thread`

```ts
type Thread = {
  id: string
  anchorId: string
  messages: Message[]
  resolved: boolean
  lastActivityAt: number
}
```

### `Adapter`

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

## Functions

### `createClient(options)`

```ts
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'

const client = createClient({
  adapter: createMemoryAdapter(),
  user: { id: 'u1', name: 'Alice' }, // optional, defaults to Anonymous
  plugins: [myPlugin], // optional
})
```

| Param             | Type       | Required | Description           |
| ----------------- | ---------- | -------- | --------------------- |
| `options.adapter` | `Adapter`  | Yes      | Data adapter          |
| `options.user`    | `User`     | No       | Current user identity |
| `options.plugins` | `Plugin[]` | No       | Plugins to apply      |

### `createMemoryAdapter(user?)`

In-memory adapter for demos and testing.

```ts
const adapter = createMemoryAdapter()
// or with a specific user:
const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
```

### `createRestAdapter(options)`

REST API adapter for connecting to a backend.

```ts
import { createRestAdapter } from '@anchor-sdk/core'

const adapter = createRestAdapter({
  baseUrl: 'https://api.example.com',
  headers: { Authorization: 'Bearer token' },
})
```

See [Custom Adapter](/guide/custom-adapter) for the expected endpoint contract.

## Plugin System

See [Plugins Guide](/guide/plugins) for full documentation.

```ts
import type { Plugin } from '@anchor-sdk/core'

const myPlugin: Plugin = {
  name: 'my-plugin',
  install(ctx) {
    /* ... */
  },
  beforeCreateThread(anchorId, content) {
    /* ... */
  },
  afterCreateThread(thread) {
    /* ... */
  },
  beforeAddMessage(threadId, content) {
    /* ... */
  },
  afterAddMessage(message) {
    /* ... */
  },
}
```
