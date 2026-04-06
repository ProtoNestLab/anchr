# @anchor-sdk/vue

Vue 3 integration with components and composables.

## Components

### `<CollabProvider>`

Root provider. Provides the client to all descendants via Vue's dependency injection.

```vue
<CollabProvider :client="client">
  <App />
</CollabProvider>
```

| Prop     | Type     | Required | Description                  |
| -------- | -------- | -------- | ---------------------------- |
| `client` | `Client` | Yes      | Client from `createClient()` |

### `<Anchor>`

Wraps content to make it a discussable anchor point.

```vue
<Anchor id="order-123">
  <div>Order #123</div>
  <template #overlay="{ hovered }">
    <CommentButton v-if="hovered" @click="open" />
  </template>
</Anchor>
```

| Prop | Type     | Required | Description              |
| ---- | -------- | -------- | ------------------------ |
| `id` | `string` | Yes      | Unique anchor identifier |

| Slot      | Scoped Props           | Description            |
| --------- | ---------------------- | ---------------------- |
| `default` | —                      | Content to anchor      |
| `overlay` | `{ hovered: boolean }` | Overlay shown on hover |

## Composables

### `useThreads(anchorId)`

Full thread CRUD for a specific anchor. Auto-fetches on mount. Subscribes to real-time updates if the adapter supports it.

```ts
const {
  threads, // Ref<Thread[]>
  createThread, // (content: string) => Promise<void>
  addMessage, // (threadId, content) => Promise<void>
  editMessage, // (messageId, content) => Promise<Message>
  deleteMessage, // (threadId, messageId) => Promise<void>
  resolveThread, // (threadId) => Promise<void>
  reopenThread, // (threadId) => Promise<void>
  deleteThread, // (threadId) => Promise<void>
  addReaction, // (messageId, emoji) => Promise<void>
  removeReaction, // (messageId, emoji) => Promise<void>
  refresh, // () => Promise<void>
} = useThreads('order-123')
```

### `useAnchor(anchorId)`

Headless composable — all discussion logic with zero UI. See [Headless Mode](/guide/headless).

```ts
const {
  threads,
  open,
  messageCount,
  unreadCount,
  hasThreads,
  currentUser,
  send,
  toggle,
  show,
  hide,
  markAsRead,
  // ...plus all useThreads methods
} = useAnchor('my-element')
```

### `useClient()`

Retrieves the injected client. Must be inside a `<CollabProvider>`.

```ts
const client = useClient()
```

### `provideClient(client)`

Manually provide a client (alternative to `<CollabProvider>`).

```ts
provideClient(client)
```
