import type { Adapter } from './types'

export type ConnectionStatus = 'online' | 'offline'

export interface OfflineQueueOptions {
  /** The adapter to wrap with offline support */
  adapter: Adapter
  /** Callback invoked whenever connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void
}

type QueuedOperation = {
  execute: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

/**
 * Wraps an adapter with an offline queue.
 *
 * When offline, mutations are queued and executed when connectivity is restored.
 * Read operations (getThreads) always attempt the adapter directly.
 * Subscribe methods are passed through without queuing.
 *
 * Usage:
 * ```ts
 * const { adapter, goOnline, goOffline, flush, status, pending } = createOfflineQueue({
 *   adapter: createRestAdapter({ baseUrl: '...' }),
 *   onStatusChange: (status) => console.log('Connection:', status),
 * })
 * ```
 */
export function createOfflineQueue(options: OfflineQueueOptions) {
  const { adapter, onStatusChange } = options
  let status: ConnectionStatus = 'online'
  const queue: QueuedOperation[] = []

  function setStatus(newStatus: ConnectionStatus) {
    if (status !== newStatus) {
      status = newStatus
      onStatusChange?.(newStatus)
    }
  }

  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push({
        execute: fn,
        resolve: resolve as (v: unknown) => void,
        reject,
      })
    })
  }

  function wrapMutation<T>(fn: () => Promise<T>): Promise<T> {
    if (status === 'online') {
      return fn()
    }
    return enqueue(fn)
  }

  async function flush() {
    while (queue.length > 0) {
      const op = queue[0]
      try {
        const result = await op.execute()
        op.resolve(result)
      } catch (e) {
        op.reject(e)
      }
      queue.shift()
    }
  }

  function goOnline() {
    setStatus('online')
    flush()
  }

  function goOffline() {
    setStatus('offline')
  }

  const wrappedAdapter: Adapter = {
    // Reads always go through directly (may fail if truly offline)
    getThreads: (anchorId) => adapter.getThreads(anchorId),
    getAllThreads: adapter.getAllThreads ? () => adapter.getAllThreads!() : undefined,

    // Mutations are queued when offline
    createThread: (anchorId, content) =>
      wrapMutation(() => adapter.createThread(anchorId, content)),
    resolveThread: (threadId) => wrapMutation(() => adapter.resolveThread(threadId)),
    reopenThread: (threadId) => wrapMutation(() => adapter.reopenThread(threadId)),
    deleteThread: (threadId) => wrapMutation(() => adapter.deleteThread(threadId)),
    addMessage: (threadId, content, options) =>
      wrapMutation(() => adapter.addMessage(threadId, content, options)),
    editMessage: (messageId, content) =>
      wrapMutation(() => adapter.editMessage(messageId, content)),
    deleteMessage: (threadId, messageId) =>
      wrapMutation(() => adapter.deleteMessage(threadId, messageId)),
    addReaction: (messageId, emoji) => wrapMutation(() => adapter.addReaction(messageId, emoji)),
    removeReaction: (messageId, emoji) =>
      wrapMutation(() => adapter.removeReaction(messageId, emoji)),
  }

  // Pass through optional methods
  if (adapter.subscribe) {
    wrappedAdapter.subscribe = adapter.subscribe.bind(adapter)
  }
  if (adapter.setPresence) {
    wrappedAdapter.setPresence = adapter.setPresence.bind(adapter)
  }
  if (adapter.getPresence) {
    wrappedAdapter.getPresence = adapter.getPresence.bind(adapter)
  }
  if (adapter.subscribePresence) {
    wrappedAdapter.subscribePresence = adapter.subscribePresence.bind(adapter)
  }
  if (adapter.setTyping) {
    wrappedAdapter.setTyping = adapter.setTyping.bind(adapter)
  }
  if (adapter.subscribeTyping) {
    wrappedAdapter.subscribeTyping = adapter.subscribeTyping.bind(adapter)
  }
  if (adapter.connect) {
    wrappedAdapter.connect = adapter.connect.bind(adapter)
  }
  if (adapter.disconnect) {
    wrappedAdapter.disconnect = adapter.disconnect.bind(adapter)
  }

  return {
    /** The wrapped adapter with offline queue support */
    adapter: wrappedAdapter,
    /** Switch to online mode and flush queued operations */
    goOnline,
    /** Switch to offline mode — mutations will be queued */
    goOffline,
    /** Manually flush the queue */
    flush,
    /** Get current connection status */
    get status() {
      return status
    },
    /** Get number of pending operations */
    get pending() {
      return queue.length
    },
  }
}
