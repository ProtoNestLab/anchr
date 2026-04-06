# @anchor-sdk/vue

Vue 3 integration package with components and composables.

## Components

### `<CollabProvider>`

Root provider component. Provides the client to all descendant components via Vue's dependency injection.

```vue
<CollabProvider :client="client">
  <App />
</CollabProvider>
```

| Prop     | Type     | Required | Description                           |
| -------- | -------- | -------- | ------------------------------------- |
| `client` | `Client` | Yes      | Client instance from `createClient()` |

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

Manages threads for a specific anchor. Automatically fetches threads on mount.

```ts
const { threads, createThread, addMessage, refresh } = useThreads('order-123')
```

| Return         | Type                                                   | Description              |
| -------------- | ------------------------------------------------------ | ------------------------ |
| `threads`      | `Ref<Thread[]>`                                        | Reactive thread list     |
| `createThread` | `(content: string) => Promise<void>`                   | Create a new thread      |
| `addMessage`   | `(threadId: string, content: string) => Promise<void>` | Add message to thread    |
| `refresh`      | `() => Promise<void>`                                  | Manually refresh threads |

### `useClient()`

Retrieves the injected client. Must be called inside a `<CollabProvider>`.

```ts
const client = useClient()
```

### `provideClient(client)`

Manually provide a client (alternative to `<CollabProvider>`).

```ts
provideClient(client)
```
