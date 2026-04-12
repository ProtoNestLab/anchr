export type Anchor = {
  id: string
  type?: string
}

export type User = {
  id: string
  name: string
  avatar?: string
}

export type Reaction = {
  emoji: string
  userId: string
}

export type Message = {
  id: string
  content: string
  createdAt: number
  updatedAt?: number
  user: User
  reactions: Reaction[]
}

export type Thread = {
  id: string
  anchorId: string
  messages: Message[]
  resolved: boolean
  lastActivityAt: number
}

export interface Adapter {
  // Threads
  getThreads(anchorId: string): Promise<Thread[]>
  createThread(anchorId: string, content: string): Promise<Thread>
  resolveThread(threadId: string): Promise<Thread>
  reopenThread(threadId: string): Promise<Thread>
  deleteThread(threadId: string): Promise<void>

  // Messages
  addMessage(threadId: string, content: string): Promise<Message>
  editMessage(messageId: string, content: string): Promise<Message>
  deleteMessage(threadId: string, messageId: string): Promise<void>

  // Reactions
  addReaction(messageId: string, emoji: string): Promise<Message>
  removeReaction(messageId: string, emoji: string): Promise<Message>

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

export type PresenceStatus = 'online' | 'away' | 'offline'

export type PresenceInfo = {
  user: User
  status: PresenceStatus
  lastSeen: number
}
