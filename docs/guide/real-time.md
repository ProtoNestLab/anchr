# Real-Time Collaboration

Anchor SDK provides built-in support for real-time collaboration including live thread updates, presence indicators, and typing indicators.

## WebSocket Adapter

The `createWebSocketAdapter` combines REST endpoints for mutations with a WebSocket connection for real-time updates.

```ts
import { createClient, createWebSocketAdapter } from '@anchor-sdk/core'

const client = createClient({
  adapter: createWebSocketAdapter({
    url: 'wss://api.example.com/ws',
    restBaseUrl: 'https://api.example.com',
    headers: { Authorization: `Bearer ${token}` },
  }),
  user: { id: 'u1', name: 'Alice' },
})
```

### Auto-Reconnect

The WebSocket adapter automatically reconnects with exponential backoff:

```ts
const adapter = createWebSocketAdapter({
  url: 'wss://api.example.com/ws',
  restBaseUrl: 'https://api.example.com',
  reconnectDelay: 1000, // initial delay (default: 1000ms)
  maxReconnectDelay: 30000, // max delay (default: 30000ms)
})
```

On reconnect, all active subscriptions are automatically re-established.

### Connection Lifecycle

```ts
adapter.connect() // manually open connection
adapter.disconnect() // close and stop reconnecting
```

### WebSocket Protocol

The adapter expects the server to send/receive JSON messages:

**Client to server:**

```json
{ "type": "subscribe", "anchorId": "order-123" }
{ "type": "unsubscribe", "anchorId": "order-123" }
{ "type": "presence:set", "anchorId": "order-123", "user": {...}, "status": "online" }
{ "type": "typing:set", "anchorId": "order-123", "user": {...}, "isTyping": true }
```

**Server to client:**

```json
{ "type": "threads:updated", "anchorId": "order-123", "threads": [...] }
{ "type": "presence:updated", "anchorId": "order-123", "presence": [...] }
{ "type": "typing:updated", "anchorId": "order-123", "users": [...] }
```

## Presence Indicators

Track who is viewing a discussion in real time.

### usePresence Composable

```ts
import { usePresence } from '@anchor-sdk/vue'

const {
  presence, // Ref<PresenceInfo[]> — users currently present
  typingUsers, // Ref<User[]> — users currently typing
  setOnline, // set current user as online
  setAway, // set current user as away
  setOffline, // set current user as offline
  startTyping, // signal typing started
  stopTyping, // signal typing stopped
} = usePresence('order-123')
```

The composable automatically:

- Sets the user as **online** when the component mounts
- Sets the user as **offline** when the component unmounts
- Subscribes to presence and typing updates from other users

### Display Presence

```vue
<template>
  <div class="presence-bar">
    <span v-for="p in presence" :key="p.user.id" class="presence-dot" :class="p.status">
      {{ p.user.name }}
    </span>
  </div>
</template>
```

### Typing Indicators

```vue
<script setup>
const { typingUsers, startTyping, stopTyping } = usePresence('order-123')
</script>

<template>
  <p v-if="typingUsers.length">
    {{ typingUsers.map((u) => u.name).join(', ') }}
    {{ typingUsers.length === 1 ? 'is' : 'are' }} typing...
  </p>
  <input @input="startTyping" @blur="stopTyping" />
</template>
```

## Optimistic Updates

All mutations in `useThreads` apply changes to the UI immediately, then confirm with the server. If the server request fails, the UI automatically rolls back to the previous state.

```ts
const { threads, error } = useThreads('order-123')

// This updates the UI instantly, then syncs with the server
await createThread('Hello!') // UI shows the new thread immediately

// If it fails, threads.value rolls back and error.value is set
```

This works for all operations: `createThread`, `addMessage`, `editMessage`, `deleteMessage`, `resolveThread`, `reopenThread`, `deleteThread`, `addReaction`, `removeReaction`.

## Offline Support

Wrap any adapter with `createOfflineQueue` to queue mutations while offline:

```ts
import { createOfflineQueue, createRestAdapter } from '@anchor-sdk/core'

const { adapter, goOnline, goOffline, status, pending } = createOfflineQueue({
  adapter: createRestAdapter({ baseUrl: 'https://api.example.com' }),
  onStatusChange: (status) => console.log('Connection:', status),
})

// Use with createClient as normal
const client = createClient({ adapter, user })

// Toggle connection state
goOffline() // mutations are now queued
goOnline() // queued mutations are flushed
```

### With Browser Events

```ts
window.addEventListener('online', () => goOnline())
window.addEventListener('offline', () => goOffline())
```

### Tracking Queue State

```ts
console.log(status) // 'online' | 'offline'
console.log(pending) // number of queued operations
```

## Error Handling

`useThreads` exposes `loading` and `error` refs:

```vue
<script setup>
const { threads, loading, error } = useThreads('order-123')
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error" class="error">{{ error.message }}</div>
  <div v-else>
    <!-- thread list -->
  </div>
</template>
```

The built-in `<ThreadPopover>` component displays loading and error states automatically when the `loading` and `error` props are passed.

## Next Steps

- [Custom Adapter](/guide/custom-adapter) — Implement the presence/typing methods in your own adapter
- [Headless Mode](/guide/headless) — Build custom UI with `usePresence`
- [Theming](/guide/theming) — Style error/loading states with CSS variables
