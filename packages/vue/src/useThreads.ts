import { ref, onMounted } from 'vue'
import type { Thread } from '@anchor-sdk/core'
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

  onMounted(refresh)

  return { threads, createThread, addMessage, refresh }
}
