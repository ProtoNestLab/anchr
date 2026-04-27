import type { Client } from './client'
import type { Thread, Message } from './types'

export interface PluginContext {
  client: Client
}

export interface Plugin {
  name: string
  /** Called when client is initialized */
  install?(ctx: PluginContext): void
  /** Called before a thread is created, can modify content */
  beforeCreateThread?(anchorId: string, content: string): string | void
  /** Called after a thread is created */
  afterCreateThread?(thread: Thread): void
  /** Called before a message is added, can modify content */
  beforeAddMessage?(threadId: string, content: string): string | void
  /** Called after a message is added */
  afterAddMessage?(message: Message): void
}

export function applyPlugins(client: Client, plugins: Plugin[]): Client & { plugins: Plugin[] } {
  const originalAdapter = client.adapter

  for (const plugin of plugins) {
    plugin.install?.({ client })
  }

  return {
    ...client,
    plugins,
    adapter: {
      ...originalAdapter,

      async createThread(anchorId, content) {
        let finalContent = content
        for (const p of plugins) {
          const result = p.beforeCreateThread?.(anchorId, finalContent)
          if (typeof result === 'string') finalContent = result
        }
        const thread = await originalAdapter.createThread(anchorId, finalContent)
        for (const p of plugins) {
          p.afterCreateThread?.(thread)
        }
        return thread
      },

      async addMessage(threadId, content) {
        let finalContent = content
        for (const p of plugins) {
          const result = p.beforeAddMessage?.(threadId, finalContent)
          if (typeof result === 'string') finalContent = result
        }
        const message = await originalAdapter.addMessage(threadId, finalContent)
        for (const p of plugins) {
          p.afterAddMessage?.(message)
        }
        return message
      },
    },
  }
}
