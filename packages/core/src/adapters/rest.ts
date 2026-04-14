import type { Adapter, Thread, Message, Attachment, MessageOptions } from '../types'

export interface RestAdapterOptions {
  /** Base URL of the API, e.g. "https://api.example.com" */
  baseUrl: string
  /** Optional headers (e.g. Authorization) */
  headers?: Record<string, string>
}

async function request<T>(
  url: string,
  options: RestAdapterOptions,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${options.baseUrl}${url}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`REST adapter: ${res.status} ${res.statusText}`)
  return res.json()
}

/**
 * REST API adapter.
 *
 * Expected endpoints:
 *   GET    /threads?anchorId=xxx
 *   POST   /threads              { anchorId, content }
 *   PATCH  /threads/:id/resolve
 *   PATCH  /threads/:id/reopen
 *   DELETE /threads/:id
 *   POST   /threads/:id/messages           { content }
 *   PATCH  /messages/:id                   { content }
 *   DELETE /threads/:tid/messages/:mid
 *   POST   /messages/:id/reactions         { emoji }
 *   DELETE /messages/:id/reactions/:emoji
 */
export function createRestAdapter(options: RestAdapterOptions): Adapter {
  return {
    getThreads: (anchorId) =>
      request<Thread[]>(`/threads?anchorId=${encodeURIComponent(anchorId)}`, options),

    createThread: (anchorId, content, opts?: MessageOptions) =>
      request<Thread>('/threads', options, {
        method: 'POST',
        body: JSON.stringify({ anchorId, content, attachments: opts?.attachments }),
      }),

    resolveThread: (threadId) =>
      request<Thread>(`/threads/${threadId}/resolve`, options, { method: 'PATCH' }),

    reopenThread: (threadId) =>
      request<Thread>(`/threads/${threadId}/reopen`, options, { method: 'PATCH' }),

    deleteThread: (threadId) =>
      request<void>(`/threads/${threadId}`, options, { method: 'DELETE' }),

    addMessage: (threadId, content, opts?: MessageOptions) =>
      request<Message>(`/threads/${threadId}/messages`, options, {
        method: 'POST',
        body: JSON.stringify({ content, attachments: opts?.attachments }),
      }),

    editMessage: (messageId, content) =>
      request<Message>(`/messages/${messageId}`, options, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      }),

    deleteMessage: (threadId, messageId) =>
      request<void>(`/threads/${threadId}/messages/${messageId}`, options, {
        method: 'DELETE',
      }),

    addReaction: (messageId, emoji) =>
      request<Message>(`/messages/${messageId}/reactions`, options, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      }),

    removeReaction: (messageId, emoji) =>
      request<Message>(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, options, {
        method: 'DELETE',
      }),

    async uploadAttachment(file: File): Promise<Attachment> {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${options.baseUrl}/attachments`, {
        method: 'POST',
        headers: { ...options.headers },
        body: form,
      })
      if (!res.ok) throw new Error(`REST adapter: ${res.status} ${res.statusText}`)
      return res.json()
    },
  }
}
