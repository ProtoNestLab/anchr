export type Anchor = {
  id: string
  type?: string
}

export type Message = {
  id: string
  content: string
  createdAt: number
  user: {
    id: string
    name: string
  }
}

export type Thread = {
  id: string
  anchorId: string
  messages: Message[]
  resolved: boolean
}

export interface Adapter {
  getThreads(anchorId: string): Promise<Thread[]>
  createThread(anchorId: string, content: string): Promise<Thread>
  addMessage(threadId: string, content: string): Promise<Message>
}
