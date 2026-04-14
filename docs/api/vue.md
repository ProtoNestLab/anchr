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

Full thread CRUD for a specific anchor. Auto-fetches on mount. Subscribes to real-time updates if the adapter supports it. All mutations use **optimistic updates** with automatic rollback on failure.

```ts
const {
  threads, // Ref<Thread[]>
  loading, // Ref<boolean>
  error, // Ref<Error | null>
  createThread, // (content, options?: MessageOptions) => Promise<void>
  addMessage, // (threadId, content, options?: MessageOptions) => Promise<void>
  editMessage, // (messageId, content) => Promise<Message | undefined>
  deleteMessage, // (threadId, messageId) => Promise<void>
  resolveThread, // (threadId) => Promise<void>
  reopenThread, // (threadId) => Promise<void>
  deleteThread, // (threadId) => Promise<void>
  addReaction, // (messageId, emoji) => Promise<void>
  removeReaction, // (messageId, emoji) => Promise<void>
  uploadAttachment, // (file: File) => Promise<Attachment | undefined>
  refresh, // () => Promise<void>
} = useThreads('order-123')
```

**Attachments:** `uploadAttachment(file)` delegates to `adapter.uploadAttachment`. If the adapter does not implement attachments, the method returns `undefined` and `error.value` is set. Pass the returned `Attachment` via `options.attachments` on `createThread` or `addMessage`.

**Optimistic updates:** When you call a mutation (e.g. `createThread`), the UI updates immediately. If the server request fails, the state is rolled back to the previous value and `error` is set.

**Error handling:** The `error` ref is set when any operation fails. It is automatically cleared before the next operation.

### `useAnchor(anchorId)`

Headless composable — all discussion logic with zero UI. See [Headless Mode](/guide/headless).

```ts
const {
  threads,
  loading,
  error,
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

### `usePresence(anchorId)`

Presence and typing indicator composable. Requires an adapter that implements the optional presence/typing methods (e.g. `createMemoryAdapter` or `createWebSocketAdapter`).

```ts
const {
  presence, // Ref<PresenceInfo[]>
  typingUsers, // Ref<User[]>
  setOnline, // () => Promise<void>
  setAway, // () => Promise<void>
  setOffline, // () => Promise<void>
  startTyping, // () => Promise<void>
  stopTyping, // () => Promise<void>
} = usePresence('my-element')
```

**Lifecycle behavior:**

- On mount: sets the current user as `online` and fetches initial presence
- On unmount: sets the current user as `offline` and cleans up subscriptions
- Subscribes to presence and typing updates from other users automatically

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

### `useMentions(options)`

Headless `@mention` autocomplete composable. Tracks the current `@query` before the cursor and exposes filtered user suggestions with keyboard navigation.

```ts
import { useMentions } from '@anchor-sdk/vue'

const text = ref('')
const mentions = useMentions({
  text,
  resolveUsers: () => teamMembers, // or async
  filter: (u) => u.id !== currentUser.id, // optional
  maxSuggestions: 8, // optional, default 8
})

function onInput(e: Event) {
  const el = e.target as HTMLTextAreaElement
  mentions.onInput(el.selectionStart ?? el.value.length)
}

function onKeyDown(e: KeyboardEvent) {
  if (!mentions.active.value) return
  if (e.key === 'ArrowUp') {
    mentions.moveUp()
    e.preventDefault()
  }
  if (e.key === 'ArrowDown') {
    mentions.moveDown()
    e.preventDefault()
  }
  if (e.key === 'Enter') {
    const r = mentions.select((e.target as HTMLTextAreaElement).selectionStart ?? 0)
    if (r) {
      text.value = r.text
      e.preventDefault()
    }
  }
  if (e.key === 'Escape') mentions.close()
}
```

**Returns:**

| Property          | Type                              | Description                                          |
| ----------------- | --------------------------------- | ---------------------------------------------------- |
| `active`          | `Ref<boolean>`                    | `true` when an `@query` is being typed               |
| `query`           | `Ref<string>`                     | The text after `@` (without the `@`)                 |
| `loading`         | `Ref<boolean>`                    | `true` while async `resolveUsers` is resolving       |
| `suggestions`     | `Ref<User[]>`                     | Filtered users (max `maxSuggestions`)                |
| `selectedIndex`   | `Ref<number>`                     | Index of highlighted suggestion                      |
| `onInput`         | `(cursor: number) => Promise`     | Call from input/keyup handlers with cursor offset    |
| `moveUp/moveDown` | `() => void`                      | Wraps selection within suggestions                   |
| `select`          | `(cursor, user?) => Result\|null` | Replaces `@query` — returns `{ text, cursor, user }` |
| `close`           | `() => void`                      | Closes the popup and resets state                    |
| `resetCache`      | `() => void`                      | Force `resolveUsers` to be called again              |
