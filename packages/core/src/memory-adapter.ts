import type { Adapter, Thread, Message } from './types'

let counter = 0
function uid(): string {
  return `id_${++counter}_${Date.now()}`
}

const defaultUser = { id: 'user-1', name: 'Anonymous' }

export function createMemoryAdapter(): Adapter {
  const threadsByAnchor = new Map<string, Thread[]>()

  return {
    async getThreads(anchorId) {
      return threadsByAnchor.get(anchorId) ?? []
    },

    async createThread(anchorId, content) {
      const thread: Thread = {
        id: uid(),
        anchorId,
        messages: [
          {
            id: uid(),
            content,
            createdAt: Date.now(),
            user: defaultUser,
          },
        ],
        resolved: false,
      }
      const list = threadsByAnchor.get(anchorId) ?? []
      list.push(thread)
      threadsByAnchor.set(anchorId, list)
      return thread
    },

    async addMessage(threadId, content) {
      const message: Message = {
        id: uid(),
        content,
        createdAt: Date.now(),
        user: defaultUser,
      }
      for (const threads of threadsByAnchor.values()) {
        const thread = threads.find((t) => t.id === threadId)
        if (thread) {
          thread.messages.push(message)
          return message
        }
      }
      throw new Error(`Thread ${threadId} not found`)
    },
  }
}
