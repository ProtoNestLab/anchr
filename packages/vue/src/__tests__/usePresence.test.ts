import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import CollabProvider from '../CollabProvider.vue'
import { usePresence } from '../usePresence'

function createWrapper(anchorId: string, user = { id: 'u1', name: 'Alice' }) {
  const adapter = createMemoryAdapter(user)
  const client = createClient({ adapter, user })

  let composable: ReturnType<typeof usePresence> | undefined

  const Child = defineComponent({
    setup() {
      composable = usePresence(anchorId)
      return () => h('div')
    },
  })

  const wrapper = mount(CollabProvider, {
    props: { client },
    slots: { default: () => h(Child) },
  })

  return { wrapper, composable: composable!, client, adapter }
}

describe('usePresence', () => {
  it('should auto-set presence on mount and have empty typing', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    // User is auto-set as online on mount
    expect(composable.presence.value).toHaveLength(1)
    expect(composable.typingUsers.value).toEqual([])
  })

  it('should auto-set user as online on mount', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    // The user should be present as online
    expect(composable.presence.value).toHaveLength(1)
    expect(composable.presence.value[0].user.name).toBe('Alice')
    expect(composable.presence.value[0].status).toBe('online')
  })

  it('should update presence to away', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.setAway()
    expect(composable.presence.value[0].status).toBe('away')
  })

  it('should handle typing indicators', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.startTyping()
    expect(composable.typingUsers.value).toHaveLength(1)
    expect(composable.typingUsers.value[0].name).toBe('Alice')

    await composable.stopTyping()
    expect(composable.typingUsers.value).toHaveLength(0)
  })

  it('should receive presence updates from other users', async () => {
    const user1 = { id: 'u1', name: 'Alice' }
    const user2 = { id: 'u2', name: 'Bob' }
    const { composable, adapter } = createWrapper('anchor-1', user1)
    await flushPromises()

    // Simulate another user coming online
    await adapter.setPresence!('anchor-1', user2, 'online')

    expect(composable.presence.value).toHaveLength(2)
  })

  it('should clean up presence on unmount', async () => {
    const { wrapper, adapter } = createWrapper('anchor-1')
    await flushPromises()

    // Check user is online
    const presence = await adapter.getPresence!('anchor-1')
    expect(presence).toHaveLength(1)

    // Unmount should set offline
    wrapper.unmount()
    await flushPromises()

    const presenceAfter = await adapter.getPresence!('anchor-1')
    expect(presenceAfter).toHaveLength(0)
  })
})
