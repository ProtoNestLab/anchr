import { ref, onMounted, onUnmounted } from 'vue'
import type { Thread, Message, Attachment, MessageOptions } from '@anchor-sdk/core'
import { useClient } from './provider'

export function useThreads(anchorId: string) {
  const client = useClient()
  const threads = ref<Thread[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)

  function snapshot(): Thread[] {
    return JSON.parse(JSON.stringify(threads.value))
  }

  async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T | undefined> {
    error.value = null
    try {
      return await fn()
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      return undefined
    }
  }

  async function withOptimistic<T>(
    optimisticUpdate: () => void,
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    const prev = snapshot()
    optimisticUpdate()
    error.value = null
    try {
      const result = await fn()
      return result
    } catch (e) {
      // Rollback on failure
      threads.value = prev
      error.value = e instanceof Error ? e : new Error(String(e))
      return undefined
    }
  }

  async function refresh() {
    loading.value = true
    await withErrorHandling(async () => {
      threads.value = await client.adapter.getThreads(anchorId)
    })
    loading.value = false
  }

  async function createThread(content: string, options?: MessageOptions) {
    const now = Date.now()
    const tempId = `temp_${now}`
    const optimisticThread: Thread = {
      id: tempId,
      anchorId,
      messages: [
        {
          id: `temp_msg_${now}`,
          content,
          createdAt: now,
          user: { ...client.user },
          reactions: [],
          ...(options?.attachments?.length ? { attachments: options.attachments } : {}),
        },
      ],
      resolved: false,
      lastActivityAt: now,
    }

    await withOptimistic(
      () => {
        threads.value = [...threads.value, optimisticThread]
      },
      async () => {
        await client.adapter.createThread(anchorId, content, options)
        await refresh()
      },
    )
  }

  async function addMessage(threadId: string, content: string, options?: MessageOptions) {
    const now = Date.now()
    const optimisticMsg: Message = {
      id: `temp_msg_${now}`,
      content,
      createdAt: now,
      user: { ...client.user },
      reactions: [],
      ...(options?.attachments?.length ? { attachments: options.attachments } : {}),
    }

    await withOptimistic(
      () => {
        threads.value = threads.value.map((t) =>
          t.id === threadId
            ? { ...t, messages: [...t.messages, optimisticMsg], lastActivityAt: now }
            : t,
        )
      },
      async () => {
        await client.adapter.addMessage(threadId, content, options)
        await refresh()
      },
    )
  }

  async function uploadAttachment(file: File): Promise<Attachment | undefined> {
    if (!client.adapter.uploadAttachment) {
      error.value = new Error('Adapter does not support file uploads')
      return undefined
    }
    return withErrorHandling(() => client.adapter.uploadAttachment!(file))
  }

  async function editMessage(messageId: string, content: string): Promise<Message | undefined> {
    const now = Date.now()

    return await withOptimistic(
      () => {
        threads.value = threads.value.map((t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === messageId ? { ...m, content, updatedAt: now } : m,
          ),
        }))
      },
      async () => {
        const msg = await client.adapter.editMessage(messageId, content)
        await refresh()
        return msg
      },
    )
  }

  async function deleteMessage(threadId: string, messageId: string) {
    await withOptimistic(
      () => {
        threads.value = threads.value.map((t) =>
          t.id === threadId ? { ...t, messages: t.messages.filter((m) => m.id !== messageId) } : t,
        )
      },
      async () => {
        await client.adapter.deleteMessage(threadId, messageId)
        await refresh()
      },
    )
  }

  async function resolveThread(threadId: string) {
    await withOptimistic(
      () => {
        threads.value = threads.value.map((t) =>
          t.id === threadId ? { ...t, resolved: true, lastActivityAt: Date.now() } : t,
        )
      },
      async () => {
        await client.adapter.resolveThread(threadId)
        await refresh()
      },
    )
  }

  async function reopenThread(threadId: string) {
    await withOptimistic(
      () => {
        threads.value = threads.value.map((t) =>
          t.id === threadId ? { ...t, resolved: false, lastActivityAt: Date.now() } : t,
        )
      },
      async () => {
        await client.adapter.reopenThread(threadId)
        await refresh()
      },
    )
  }

  async function deleteThread(threadId: string) {
    await withOptimistic(
      () => {
        threads.value = threads.value.filter((t) => t.id !== threadId)
      },
      async () => {
        await client.adapter.deleteThread(threadId)
        await refresh()
      },
    )
  }

  async function addReaction(messageId: string, emoji: string) {
    await withOptimistic(
      () => {
        threads.value = threads.value.map((t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === messageId
              ? { ...m, reactions: [...m.reactions, { emoji, userId: client.user.id }] }
              : m,
          ),
        }))
      },
      async () => {
        await client.adapter.addReaction(messageId, emoji)
        await refresh()
      },
    )
  }

  async function removeReaction(messageId: string, emoji: string) {
    await withOptimistic(
      () => {
        threads.value = threads.value.map((t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: m.reactions.filter(
                    (r) => !(r.emoji === emoji && r.userId === client.user.id),
                  ),
                }
              : m,
          ),
        }))
      },
      async () => {
        await client.adapter.removeReaction(messageId, emoji)
        await refresh()
      },
    )
  }

  // Real-time subscription
  let unsubscribe: (() => void) | undefined

  onMounted(() => {
    refresh()
    if (client.adapter.subscribe) {
      unsubscribe = client.adapter.subscribe(anchorId, (updated) => {
        threads.value = updated
      })
    }
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return {
    threads,
    loading,
    error,
    createThread,
    addMessage,
    editMessage,
    deleteMessage,
    resolveThread,
    reopenThread,
    deleteThread,
    addReaction,
    removeReaction,
    uploadAttachment,
    refresh,
  }
}
