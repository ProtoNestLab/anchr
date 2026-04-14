# Custom Adapter

The SDK uses an `Adapter` interface for data persistence. Implement it to connect to any backend.

## Built-in REST Adapter

The quickest way to connect to a backend:

```ts
import { createClient, createRestAdapter } from '@anchor-sdk/core'

const client = createClient({
  adapter: createRestAdapter({
    baseUrl: 'https://api.example.com',
    headers: { Authorization: `Bearer ${token}` },
  }),
})
```

### Expected Endpoints

The REST adapter expects the following endpoints:

| Method   | Endpoint                         | Body                                  | Returns      | Description                |
| -------- | -------------------------------- | ------------------------------------- | ------------ | -------------------------- |
| `GET`    | `/threads?anchorId=:id`          | —                                     | `Thread[]`   | List threads for an anchor |
| `POST`   | `/threads`                       | `{ anchorId, content, attachments? }` | `Thread`     | Create a new thread        |
| `PATCH`  | `/threads/:id/resolve`           | —                                     | `Thread`     | Mark thread as resolved    |
| `PATCH`  | `/threads/:id/reopen`            | —                                     | `Thread`     | Reopen a resolved thread   |
| `DELETE` | `/threads/:id`                   | —                                     | —            | Delete a thread            |
| `POST`   | `/threads/:id/messages`          | `{ content, attachments? }`           | `Message`    | Add message to thread      |
| `PATCH`  | `/messages/:id`                  | `{ content }`                         | `Message`    | Edit a message             |
| `DELETE` | `/threads/:tid/messages/:mid`    | —                                     | —            | Delete a message           |
| `POST`   | `/messages/:id/reactions`        | `{ emoji }`                           | `Message`    | Add emoji reaction         |
| `DELETE` | `/messages/:id/reactions/:emoji` | —                                     | `Message`    | Remove emoji reaction      |
| `POST`   | `/attachments`                   | `FormData { file }`                   | `Attachment` | Upload an attachment       |

### Response Schemas

Your API should return objects matching these types:

```ts
type Thread = {
  id: string
  anchorId: string
  messages: Message[]
  resolved: boolean
  lastActivityAt: number
}

type Message = {
  id: string
  content: string
  createdAt: number
  updatedAt?: number
  user: { id: string; name: string; avatar?: string }
  reactions: { emoji: string; userId: string }[]
}
```

## Adapter Interface

For full control, implement the `Adapter` interface directly:

```ts
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

All methods beyond the core CRUD are optional. Implement only what your backend supports — the SDK gracefully handles missing methods.

## Example: Custom Implementation

```ts
import type { Adapter } from '@anchor-sdk/core'

const myAdapter: Adapter = {
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

  async resolveThread(threadId) {
    const res = await fetch(`/api/threads/${threadId}/resolve`, { method: 'PATCH' })
    return res.json()
  },

  async reopenThread(threadId) {
    const res = await fetch(`/api/threads/${threadId}/reopen`, { method: 'PATCH' })
    return res.json()
  },

  async deleteThread(threadId) {
    await fetch(`/api/threads/${threadId}`, { method: 'DELETE' })
  },

  async addMessage(threadId, content) {
    const res = await fetch(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    return res.json()
  },

  async editMessage(messageId, content) {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    return res.json()
  },

  async deleteMessage(threadId, messageId) {
    await fetch(`/api/threads/${threadId}/messages/${messageId}`, { method: 'DELETE' })
  },

  async addReaction(messageId, emoji) {
    const res = await fetch(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    return res.json()
  },

  async removeReaction(messageId, emoji) {
    const res = await fetch(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  // Optional: real-time updates
  subscribe(anchorId, callback) {
    const es = new EventSource(`/api/threads/stream?anchorId=${anchorId}`)
    es.onmessage = (e) => callback(JSON.parse(e.data))
    return () => es.close()
  },

  // Optional: file/image uploads
  async uploadAttachment(file) {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch('/api/attachments', { method: 'POST', body })
    return res.json() // must match the Attachment schema
  },
}
```

## Attachments

To enable attachments in the default UI, implement `uploadAttachment`. The method receives a `File` and must return an `Attachment`:

```ts
type Attachment = {
  id: string
  name: string
  url: string
  mimeType: string
  size: number
  width?: number // images only
  height?: number // images only
}
```

Store the file (e.g. S3, Cloudinary, or a `/uploads` directory) and return a URL that browsers can load directly. When the adapter does not implement `uploadAttachment`, the UI hides the attachment button and `useThreads().uploadAttachment()` sets an error instead of throwing.

## Usage

```ts
import { createClient } from '@anchor-sdk/core'

const client = createClient({
  adapter: myAdapter,
  user: { id: 'u1', name: 'Alice' },
})
```
