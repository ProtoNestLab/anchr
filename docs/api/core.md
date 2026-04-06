# @anchor-sdk/core

Core package providing types, client factory, and adapter interface.

## Types

### `Anchor`

```ts
type Anchor = {
  id: string
  type?: string
}
```

### `Message`

```ts
type Message = {
  id: string
  content: string
  createdAt: number
  user: { id: string; name: string }
}
```

### `Thread`

```ts
type Thread = {
  id: string
  anchorId: string
  messages: Message[]
  resolved: boolean
}
```

### `Adapter`

```ts
interface Adapter {
  getThreads(anchorId: string): Promise<Thread[]>
  createThread(anchorId: string, content: string): Promise<Thread>
  addMessage(threadId: string, content: string): Promise<Message>
}
```

## Functions

### `createClient(options)`

Creates an SDK client instance.

```ts
import { createClient } from '@anchor-sdk/core'

const client = createClient({ adapter })
```

| Param             | Type      | Description           |
| ----------------- | --------- | --------------------- |
| `options.adapter` | `Adapter` | Data adapter instance |

**Returns:** `Client` object with an `adapter` property.

### `createMemoryAdapter()`

Creates an in-memory adapter for demos and testing. Data is lost on page refresh.

```ts
import { createMemoryAdapter } from '@anchor-sdk/core'

const adapter = createMemoryAdapter()
```

**Returns:** An `Adapter` implementation.
