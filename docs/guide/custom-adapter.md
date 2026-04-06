# Custom Adapter

The SDK uses an `Adapter` interface for data persistence. Implement it to connect to any backend.

## Adapter Interface

```ts
interface Adapter {
  getThreads(anchorId: string): Promise<Thread[]>
  createThread(anchorId: string, content: string): Promise<Thread>
  addMessage(threadId: string, content: string): Promise<Message>
}
```

## Example: REST API Adapter

```ts
import type { Adapter } from '@anchor-sdk/core'

const restAdapter: Adapter = {
  async getThreads(anchorId) {
    const res = await fetch(`/api/threads?anchorId=${anchorId}`)
    return res.json()
  },

  async createThread(anchorId, content) {
    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anchorId, content }),
    })
    return res.json()
  },

  async addMessage(threadId, content) {
    const res = await fetch(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    return res.json()
  },
}
```

## Usage

```ts
import { createClient } from '@anchor-sdk/core'

const client = createClient({ adapter: restAdapter })
```
