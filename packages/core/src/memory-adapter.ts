import type {
  Adapter,
  Thread,
  Message,
  User,
  PresenceInfo,
  PresenceStatus,
  Attachment,
  MessageOptions,
} from './types'

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
  const presenceByAnchor = new Map<string, Map<string, PresenceInfo>>()
  const presenceSubscribers = new Map<string, Set<(presence: PresenceInfo[]) => void>>()
  const typingByAnchor = new Map<string, Map<string, User>>()
  const typingSubscribers = new Map<string, Set<(users: User[]) => void>>()

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

    async getAllThreads() {
      return Array.from(threadsByAnchor.values()).flat()
    },

    async createThread(anchorId, content, options?: MessageOptions) {
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
            ...(options?.attachments?.length ? { attachments: options.attachments } : {}),
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
    async addMessage(threadId, content, options?: MessageOptions) {
      const thread = findThread(threadId)
      if (!thread) throw new Error(`Thread ${threadId} not found`)
      const now = Date.now()
      const message: Message = {
        id: uid(),
        content,
        createdAt: now,
        user: options?.user ? snapshotUser(options.user) : snapshotUser(currentUser),
        reactions: [],
        ...(options?.attachments?.length ? { attachments: options.attachments } : {}),
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

    // Presence
    async setPresence(anchorId: string, user: User, status: PresenceStatus) {
      if (!presenceByAnchor.has(anchorId)) {
        presenceByAnchor.set(anchorId, new Map())
      }
      const map = presenceByAnchor.get(anchorId)!
      if (status === 'offline') {
        map.delete(user.id)
      } else {
        map.set(user.id, { user: snapshotUser(user), status, lastSeen: Date.now() })
      }
      const presence = Array.from(map.values())
      presenceSubscribers.get(anchorId)?.forEach((cb) => cb(presence))
    },

    async getPresence(anchorId: string) {
      const map = presenceByAnchor.get(anchorId)
      return map ? Array.from(map.values()) : []
    },

    subscribePresence(anchorId: string, callback: (presence: PresenceInfo[]) => void) {
      if (!presenceSubscribers.has(anchorId)) {
        presenceSubscribers.set(anchorId, new Set())
      }
      presenceSubscribers.get(anchorId)!.add(callback)
      return () => {
        presenceSubscribers.get(anchorId)?.delete(callback)
      }
    },

    // Typing indicators
    async setTyping(anchorId: string, user: User, isTyping: boolean) {
      if (!typingByAnchor.has(anchorId)) {
        typingByAnchor.set(anchorId, new Map())
      }
      const map = typingByAnchor.get(anchorId)!
      if (isTyping) {
        map.set(user.id, snapshotUser(user))
      } else {
        map.delete(user.id)
      }
      const users = Array.from(map.values())
      typingSubscribers.get(anchorId)?.forEach((cb) => cb(users))
    },

    subscribeTyping(anchorId: string, callback: (users: User[]) => void) {
      if (!typingSubscribers.has(anchorId)) {
        typingSubscribers.set(anchorId, new Set())
      }
      typingSubscribers.get(anchorId)!.add(callback)
      return () => {
        typingSubscribers.get(anchorId)?.delete(callback)
      }
    },

    // Attachments: encode as data URL so the in-memory adapter is self-contained
    async uploadAttachment(file: File): Promise<Attachment> {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error)
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      let width: number | undefined
      let height: number | undefined
      if (file.type.startsWith('image/')) {
        try {
          const dims = await loadImageSize(url)
          width = dims.width
          height = dims.height
        } catch {
          /* fallback: dimensions unknown */
        }
      }
      return {
        id: uid(),
        name: file.name,
        url,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        ...(width !== undefined && height !== undefined ? { width, height } : {}),
      }
    },
  }
}

function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('Image constructor unavailable'))
      return
    }
    const img = new Image()
    const timer = setTimeout(() => reject(new Error('Image load timeout')), 500)
    img.onload = () => {
      clearTimeout(timer)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}
