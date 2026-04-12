import type { Adapter, Thread, Message, User, PresenceInfo } from '../types'

export interface WebSocketAdapterOptions {
  /** WebSocket server URL, e.g. "wss://api.example.com/ws" */
  url: string
  /** REST base URL for HTTP fallback requests, e.g. "https://api.example.com" */
  restBaseUrl: string
  /** Optional headers for REST requests (e.g. Authorization) */
  headers?: Record<string, string>
  /** Reconnect delay in ms (default: 1000). Doubles on each retry up to maxReconnectDelay. */
  reconnectDelay?: number
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number
}

/** Message types sent/received over the WebSocket */
export type WebSocketMessage =
  | { type: 'threads:updated'; anchorId: string; threads: Thread[] }
  | { type: 'presence:updated'; anchorId: string; presence: PresenceInfo[] }
  | { type: 'typing:updated'; anchorId: string; users: User[] }
  | { type: 'subscribe'; anchorId: string }
  | { type: 'unsubscribe'; anchorId: string }
  | { type: 'presence:set'; anchorId: string; user: User; status: string }
  | { type: 'typing:set'; anchorId: string; user: User; isTyping: boolean }

async function request<T>(
  url: string,
  options: { restBaseUrl: string; headers?: Record<string, string> },
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${options.restBaseUrl}${url}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`WebSocket adapter REST: ${res.status} ${res.statusText}`)
  return res.json()
}

/**
 * WebSocket adapter with REST fallback for mutations.
 *
 * Real-time updates (threads, presence, typing) flow through the WebSocket.
 * Mutations (create, update, delete) go through REST endpoints (same as createRestAdapter).
 * The server pushes updated state back through the WebSocket after mutations.
 *
 * WebSocket message protocol:
 *   Client → Server:
 *     { type: "subscribe", anchorId }
 *     { type: "unsubscribe", anchorId }
 *     { type: "presence:set", anchorId, user, status }
 *     { type: "typing:set", anchorId, user, isTyping }
 *   Server → Client:
 *     { type: "threads:updated", anchorId, threads }
 *     { type: "presence:updated", anchorId, presence }
 *     { type: "typing:updated", anchorId, users }
 */
export function createWebSocketAdapter(options: WebSocketAdapterOptions): Adapter {
  const {
    url,
    restBaseUrl,
    headers,
    reconnectDelay: baseDelay = 1000,
    maxReconnectDelay = 30000,
  } = options

  let ws: WebSocket | null = null
  let reconnectDelay = baseDelay
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let intentionalClose = false

  const threadSubscribers = new Map<string, Set<(threads: Thread[]) => void>>()
  const presenceSubscribers = new Map<string, Set<(presence: PresenceInfo[]) => void>>()
  const typingSubscribers = new Map<string, Set<(users: User[]) => void>>()
  const subscribedAnchors = new Set<string>()

  function send(msg: WebSocketMessage) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  function handleMessage(event: MessageEvent) {
    let data: WebSocketMessage
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }

    if (data.type === 'threads:updated') {
      const cbs = threadSubscribers.get(data.anchorId)
      cbs?.forEach((cb) => cb(data.threads))
    } else if (data.type === 'presence:updated') {
      const cbs = presenceSubscribers.get(data.anchorId)
      cbs?.forEach((cb) => cb(data.presence))
    } else if (data.type === 'typing:updated') {
      const cbs = typingSubscribers.get(data.anchorId)
      cbs?.forEach((cb) => cb(data.users))
    }
  }

  function connectWs() {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return

    ws = new WebSocket(url)

    ws.onopen = () => {
      reconnectDelay = baseDelay
      // Re-subscribe all active anchors
      for (const anchorId of subscribedAnchors) {
        send({ type: 'subscribe', anchorId })
      }
    }

    ws.onmessage = handleMessage

    ws.onclose = () => {
      if (!intentionalClose) {
        scheduleReconnect()
      }
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay)
      connectWs()
    }, reconnectDelay)
  }

  const restOpts = { restBaseUrl, headers }

  return {
    // --- REST mutations (same endpoints as REST adapter) ---

    getThreads: (anchorId) =>
      request<Thread[]>(`/threads?anchorId=${encodeURIComponent(anchorId)}`, restOpts),

    createThread: (anchorId, content) =>
      request<Thread>('/threads', restOpts, {
        method: 'POST',
        body: JSON.stringify({ anchorId, content }),
      }),

    resolveThread: (threadId) =>
      request<Thread>(`/threads/${threadId}/resolve`, restOpts, { method: 'PATCH' }),

    reopenThread: (threadId) =>
      request<Thread>(`/threads/${threadId}/reopen`, restOpts, { method: 'PATCH' }),

    deleteThread: (threadId) =>
      request<void>(`/threads/${threadId}`, restOpts, { method: 'DELETE' }),

    addMessage: (threadId, content) =>
      request<Message>(`/threads/${threadId}/messages`, restOpts, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),

    editMessage: (messageId, content) =>
      request<Message>(`/messages/${messageId}`, restOpts, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      }),

    deleteMessage: (threadId, messageId) =>
      request<void>(`/threads/${threadId}/messages/${messageId}`, restOpts, {
        method: 'DELETE',
      }),

    addReaction: (messageId, emoji) =>
      request<Message>(`/messages/${messageId}/reactions`, restOpts, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      }),

    removeReaction: (messageId, emoji) =>
      request<Message>(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, restOpts, {
        method: 'DELETE',
      }),

    // --- WebSocket real-time ---

    subscribe(anchorId, callback) {
      if (!threadSubscribers.has(anchorId)) {
        threadSubscribers.set(anchorId, new Set())
      }
      threadSubscribers.get(anchorId)!.add(callback)
      subscribedAnchors.add(anchorId)

      connectWs()
      send({ type: 'subscribe', anchorId })

      return () => {
        threadSubscribers.get(anchorId)?.delete(callback)
        if (threadSubscribers.get(anchorId)?.size === 0) {
          threadSubscribers.delete(anchorId)
          // Only unsubscribe from WS if no presence/typing subscribers either
          if (!presenceSubscribers.has(anchorId) && !typingSubscribers.has(anchorId)) {
            subscribedAnchors.delete(anchorId)
            send({ type: 'unsubscribe', anchorId })
          }
        }
      }
    },

    // --- Presence ---

    async setPresence(anchorId, user, status) {
      send({ type: 'presence:set', anchorId, user, status })
    },

    async getPresence(anchorId) {
      return request<PresenceInfo[]>(`/presence?anchorId=${encodeURIComponent(anchorId)}`, restOpts)
    },

    subscribePresence(anchorId, callback) {
      if (!presenceSubscribers.has(anchorId)) {
        presenceSubscribers.set(anchorId, new Set())
      }
      presenceSubscribers.get(anchorId)!.add(callback)
      subscribedAnchors.add(anchorId)

      connectWs()
      send({ type: 'subscribe', anchorId })

      return () => {
        presenceSubscribers.get(anchorId)?.delete(callback)
        if (presenceSubscribers.get(anchorId)?.size === 0) {
          presenceSubscribers.delete(anchorId)
          if (!threadSubscribers.has(anchorId) && !typingSubscribers.has(anchorId)) {
            subscribedAnchors.delete(anchorId)
            send({ type: 'unsubscribe', anchorId })
          }
        }
      }
    },

    // --- Typing indicators ---

    async setTyping(anchorId, user, isTyping) {
      send({ type: 'typing:set', anchorId, user, isTyping })
    },

    subscribeTyping(anchorId, callback) {
      if (!typingSubscribers.has(anchorId)) {
        typingSubscribers.set(anchorId, new Set())
      }
      typingSubscribers.get(anchorId)!.add(callback)
      subscribedAnchors.add(anchorId)

      connectWs()
      send({ type: 'subscribe', anchorId })

      return () => {
        typingSubscribers.get(anchorId)?.delete(callback)
        if (typingSubscribers.get(anchorId)?.size === 0) {
          typingSubscribers.delete(anchorId)
          if (!threadSubscribers.has(anchorId) && !presenceSubscribers.has(anchorId)) {
            subscribedAnchors.delete(anchorId)
            send({ type: 'unsubscribe', anchorId })
          }
        }
      }
    },

    // --- Connection lifecycle ---

    connect() {
      intentionalClose = false
      connectWs()
    },

    disconnect() {
      intentionalClose = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      ws?.close()
      ws = null
    },
  }
}
