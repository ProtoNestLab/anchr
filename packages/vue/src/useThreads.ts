import { ref, onMounted, onUnmounted } from 'vue'
import type { Thread, Message } from '@anchor-sdk/core'
import { useClient } from './provider'

export function useThreads(anchorId: string) {
  const client = useClient()
  const threads = ref<Thread[]>([])

  async function refresh() {
    threads.value = await client.adapter.getThreads(anchorId)
  }

  async function createThread(content: string) {
    await client.adapter.createThread(anchorId, content)
    await refresh()
  }

  async function addMessage(threadId: string, content: string) {
    await client.adapter.addMessage(threadId, content)
    await refresh()
  }

  async function editMessage(messageId: string, content: string): Promise<Message> {
    const msg = await client.adapter.editMessage(messageId, content)
    await refresh()
    return msg
  }

  async function deleteMessage(threadId: string, messageId: string) {
    await client.adapter.deleteMessage(threadId, messageId)
    await refresh()
  }

  async function resolveThread(threadId: string) {
    await client.adapter.resolveThread(threadId)
    await refresh()
  }

  async function reopenThread(threadId: string) {
    await client.adapter.reopenThread(threadId)
    await refresh()
  }

  async function deleteThread(threadId: string) {
    await client.adapter.deleteThread(threadId)
    await refresh()
  }

  async function addReaction(messageId: string, emoji: string) {
    await client.adapter.addReaction(messageId, emoji)
    await refresh()
  }

  async function removeReaction(messageId: string, emoji: string) {
    await client.adapter.removeReaction(messageId, emoji)
    await refresh()
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
    createThread,
    addMessage,
    editMessage,
    deleteMessage,
    resolveThread,
    reopenThread,
    deleteThread,
    addReaction,
    removeReaction,
    refresh,
  }
}
