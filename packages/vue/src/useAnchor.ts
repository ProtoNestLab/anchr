import { ref, computed } from 'vue'
import type { MessageOptions } from '@anchor-sdk/core'
import { useThreads } from './useThreads'
import { useClient } from './provider'

/**
 * Headless composable — all discussion logic, zero UI.
 * Use this to build fully custom discussion interfaces.
 */
export function useAnchor(anchorId: string) {
  const client = useClient()
  const threadApi = useThreads(anchorId)

  const open = ref(false)
  const lastSeenCount = ref(0)

  const messageCount = computed(() =>
    threadApi.threads.value.reduce((sum, t) => sum + t.messages.length, 0),
  )

  const unreadCount = computed(() => {
    const total = messageCount.value
    return total > lastSeenCount.value ? total - lastSeenCount.value : 0
  })

  const hasThreads = computed(() => threadApi.threads.value.length > 0)

  function toggle() {
    open.value = !open.value
    if (open.value) markAsRead()
  }

  function show() {
    open.value = true
    markAsRead()
  }

  function hide() {
    open.value = false
    markAsRead()
  }

  function markAsRead() {
    lastSeenCount.value = messageCount.value
  }

  async function send(content: string, options?: MessageOptions) {
    if (threadApi.threads.value.length > 0) {
      await threadApi.addMessage(threadApi.threads.value[0].id, content, options)
    } else {
      await threadApi.createThread(content, options)
    }
  }

  return {
    // State
    ...threadApi,
    open,
    messageCount,
    unreadCount,
    hasThreads,
    currentUser: client.user,

    // Actions
    toggle,
    show,
    hide,
    markAsRead,
    send,
  }
}
