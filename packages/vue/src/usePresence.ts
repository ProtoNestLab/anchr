import { ref, onMounted, onUnmounted } from 'vue'
import type { PresenceInfo, User } from '@anchor-sdk/core'
import { useClient } from './provider'

/**
 * Composable for presence and typing indicators.
 *
 * Requires an adapter that implements the optional presence/typing methods
 * (e.g. createWebSocketAdapter or createMemoryAdapter).
 */
export function usePresence(anchorId: string) {
  const client = useClient()
  const presence = ref<PresenceInfo[]>([])
  const typingUsers = ref<User[]>([])

  let unsubPresence: (() => void) | undefined
  let unsubTyping: (() => void) | undefined

  async function setOnline() {
    await client.adapter.setPresence?.(anchorId, client.user, 'online')
  }

  async function setAway() {
    await client.adapter.setPresence?.(anchorId, client.user, 'away')
  }

  async function setOffline() {
    await client.adapter.setPresence?.(anchorId, client.user, 'offline')
  }

  async function startTyping() {
    await client.adapter.setTyping?.(anchorId, client.user, true)
  }

  async function stopTyping() {
    await client.adapter.setTyping?.(anchorId, client.user, false)
  }

  onMounted(async () => {
    // Fetch initial presence
    if (client.adapter.getPresence) {
      presence.value = await client.adapter.getPresence(anchorId)
    }

    // Subscribe to presence updates
    if (client.adapter.subscribePresence) {
      unsubPresence = client.adapter.subscribePresence(anchorId, (updated) => {
        presence.value = updated
      })
    }

    // Subscribe to typing updates
    if (client.adapter.subscribeTyping) {
      unsubTyping = client.adapter.subscribeTyping(anchorId, (users) => {
        typingUsers.value = users
      })
    }

    // Set self as online
    await setOnline()
  })

  onUnmounted(async () => {
    unsubPresence?.()
    unsubTyping?.()
    await setOffline()
  })

  return {
    /** Currently present users */
    presence,
    /** Users currently typing */
    typingUsers,
    /** Set current user as online */
    setOnline,
    /** Set current user as away */
    setAway,
    /** Set current user as offline */
    setOffline,
    /** Signal that current user started typing */
    startTyping,
    /** Signal that current user stopped typing */
    stopTyping,
  }
}
