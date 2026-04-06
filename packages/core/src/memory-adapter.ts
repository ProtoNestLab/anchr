import type { Adapter, Thread, Message, User } from './types'

let counter = 0
function uid(): string {
  return `id_${++counter}_${Date.now()}`
}

function snapshotUser(u: User): User {
  return { id: u.id, name: u.name, ...(u.avatar ? { avatar: u.avatar } : {}) }
}

export function createMemoryAdapter(user?: User): Adapter {
  const currentUser = user ?? { id: 'user-1', name: 'Anonymous' }
  const threadsByAnchor = new Map<string, Thread[]>()
  const subscribers = new Map<string, Set<(threads: Thread[]) => void>>()

  function allThreads(): Thread[] {
    return Array.from(threadsByAnchor.values()).flat()
  }

  function findThread(threadId: string): Thread | undefined {
    return allThreads().find((t) => t.id === threadId)
  }

  function findMessage(messageId: string): { thread: Thread; message: Message } | undefined {
    for (const thread of allThreads()) {
      const message = thread.messages.find((m) => m.id === messageId)
      if (message) return { thread, message }
    }
    return undefined
  }

  function notify(anchorId: string) {
    const cbs = subscribers.get(anchorId)
    if (cbs) {
      const threads = threadsByAnchor.get(anchorId) ?? []
      cbs.forEach((cb) => cb([...threads]))
    }
  }

  return {
    // Threads
    async getThreads(anchorId) {
      return threadsByAnchor.get(anchorId) ?? []
    },

    async createThread(anchorId, content) {
      const now = Date.now()
      const thread: Thread = {
        id: uid(),
        anchorId,
        messages: [
          {
            id: uid(),
            content,
            createdAt: now,
            user: snapshotUser(currentUser),
            reactions: [],
          },
        ],
        resolved: false,
        lastActivityAt: now,
      }
      const list = threadsByAnchor.get(anchorId) ?? []
      list.push(thread)
      threadsByAnchor.set(anchorId, list)
      notify(anchorId)
      return thread
    },

    async resolveThread(threadId) {
      const thread = findThread(threadId)
      if (!thread) throw new Error(`Thread ${threadId} not found`)
      thread.resolved = true
      thread.lastActivityAt = Date.now()
      notify(thread.anchorId)
      return thread
    },

    async reopenThread(threadId) {
      const thread = findThread(threadId)
      if (!thread) throw new Error(`Thread ${threadId} not found`)
      thread.resolved = false
      thread.lastActivityAt = Date.now()
      notify(thread.anchorId)
      return thread
    },

    async deleteThread(threadId) {
      for (const [anchorId, threads] of threadsByAnchor.entries()) {
        const idx = threads.findIndex((t) => t.id === threadId)
        if (idx !== -1) {
          threads.splice(idx, 1)
          notify(anchorId)
          return
        }
      }
      throw new Error(`Thread ${threadId} not found`)
    },

    // Messages
    async addMessage(threadId, content) {
      const thread = findThread(threadId)
      if (!thread) throw new Error(`Thread ${threadId} not found`)
      const now = Date.now()
      const message: Message = {
        id: uid(),
        content,
        createdAt: now,
        user: snapshotUser(currentUser),
        reactions: [],
      }
      thread.messages.push(message)
      thread.lastActivityAt = now
      notify(thread.anchorId)
      return message
    },

    async editMessage(messageId, content) {
      const found = findMessage(messageId)
      if (!found) throw new Error(`Message ${messageId} not found`)
      found.message.content = content
      found.message.updatedAt = Date.now()
      found.thread.lastActivityAt = Date.now()
      notify(found.thread.anchorId)
      return found.message
    },

    async deleteMessage(threadId, messageId) {
      const thread = findThread(threadId)
      if (!thread) throw new Error(`Thread ${threadId} not found`)
      const idx = thread.messages.findIndex((m) => m.id === messageId)
      if (idx === -1) throw new Error(`Message ${messageId} not found`)
      thread.messages.splice(idx, 1)
      thread.lastActivityAt = Date.now()
      notify(thread.anchorId)
    },

    // Reactions
    async addReaction(messageId, emoji) {
      const found = findMessage(messageId)
      if (!found) throw new Error(`Message ${messageId} not found`)
      const existing = found.message.reactions.find(
        (r) => r.emoji === emoji && r.userId === currentUser.id,
      )
      if (!existing) {
        found.message.reactions.push({ emoji, userId: currentUser.id })
      }
      notify(found.thread.anchorId)
      return found.message
    },

    async removeReaction(messageId, emoji) {
      const found = findMessage(messageId)
      if (!found) throw new Error(`Message ${messageId} not found`)
      found.message.reactions = found.message.reactions.filter(
        (r) => !(r.emoji === emoji && r.userId === currentUser.id),
      )
      notify(found.thread.anchorId)
      return found.message
    },

    // Real-time
    subscribe(anchorId, callback) {
      if (!subscribers.has(anchorId)) {
        subscribers.set(anchorId, new Set())
      }
      subscribers.get(anchorId)!.add(callback)
      return () => {
        subscribers.get(anchorId)?.delete(callback)
      }
    },
  }
}
