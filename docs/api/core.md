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

### `PresenceStatus`

```ts
type PresenceStatus = 'online' | 'away' | 'offline'
```

### `PresenceInfo`

```ts
type PresenceInfo = {
  user: User
  status: PresenceStatus
  lastSeen: number
}
```

### `ConnectionStatus`

```ts
type ConnectionStatus = 'online' | 'offline'
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

In-memory adapter for demos and testing. Supports all features including real-time subscriptions, presence, and typing indicators.

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

### `createWebSocketAdapter(options)`

WebSocket adapter with REST fallback for mutations and real-time subscriptions for threads, presence, and typing.

```ts
import { createWebSocketAdapter } from '@anchor-sdk/core'

const adapter = createWebSocketAdapter({
  url: 'wss://api.example.com/ws',
  restBaseUrl: 'https://api.example.com',
  headers: { Authorization: 'Bearer token' },
  reconnectDelay: 1000, // optional, default: 1000ms
  maxReconnectDelay: 30000, // optional, default: 30000ms
})
```

| Param                       | Type                     | Required | Description                  |
| --------------------------- | ------------------------ | -------- | ---------------------------- |
| `options.url`               | `string`                 | Yes      | WebSocket server URL         |
| `options.restBaseUrl`       | `string`                 | Yes      | REST API base URL            |
| `options.headers`           | `Record<string, string>` | No       | Headers for REST requests    |
| `options.reconnectDelay`    | `number`                 | No       | Initial reconnect delay (ms) |
| `options.maxReconnectDelay` | `number`                 | No       | Max reconnect delay (ms)     |

See [Real-Time Collaboration](/guide/real-time) for the WebSocket protocol specification.

### `createOfflineQueue(options)`

Wraps any adapter with an offline queue. Mutations are queued while offline and flushed when connectivity is restored.

```ts
import { createOfflineQueue, createRestAdapter } from '@anchor-sdk/core'

const { adapter, goOnline, goOffline, flush, status, pending } = createOfflineQueue({
  adapter: createRestAdapter({ baseUrl: '...' }),
  onStatusChange: (status) => console.log(status),
})
```

| Param                    | Type                                 | Required | Description            |
| ------------------------ | ------------------------------------ | -------- | ---------------------- |
| `options.adapter`        | `Adapter`                            | Yes      | Adapter to wrap        |
| `options.onStatusChange` | `(status: ConnectionStatus) => void` | No       | Status change callback |

**Returns:**

| Property    | Type                  | Description                                |
| ----------- | --------------------- | ------------------------------------------ |
| `adapter`   | `Adapter`             | Wrapped adapter with offline support       |
| `goOnline`  | `() => void`          | Switch to online, flush queue              |
| `goOffline` | `() => void`          | Switch to offline, start queuing           |
| `flush`     | `() => Promise<void>` | Manually flush queued operations           |
| `status`    | `ConnectionStatus`    | Current status (`'online'` or `'offline'`) |
| `pending`   | `number`              | Number of queued operations                |

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
