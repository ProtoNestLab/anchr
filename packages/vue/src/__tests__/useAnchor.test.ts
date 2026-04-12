import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import CollabProvider from '../CollabProvider.vue'
import { useAnchor } from '../useAnchor'

function createWrapper(anchorId: string, user = { id: 'u1', name: 'Alice' }) {
  const adapter = createMemoryAdapter(user)
  const client = createClient({ adapter, user })

  let composable: ReturnType<typeof useAnchor> | undefined

  const Child = defineComponent({
    setup() {
      composable = useAnchor(anchorId)
      return () => h('div')
    },
  })

  const wrapper = mount(CollabProvider, {
    props: { client },
    slots: { default: () => h(Child) },
  })

  return { wrapper, composable: composable!, client }
}

describe('useAnchor', () => {
  it('should start closed with no threads', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    expect(composable.open.value).toBe(false)
    expect(composable.hasThreads.value).toBe(false)
    expect(composable.messageCount.value).toBe(0)
    expect(composable.unreadCount.value).toBe(0)
  })

  it('should expose currentUser', () => {
    const { composable } = createWrapper('anchor-1')
    expect(composable.currentUser).toEqual({ id: 'u1', name: 'Alice' })
  })

  it('should toggle open state', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    composable.toggle()
    expect(composable.open.value).toBe(true)

    composable.toggle()
    expect(composable.open.value).toBe(false)
  })

  it('should show and hide', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    composable.show()
    expect(composable.open.value).toBe(true)

    composable.hide()
    expect(composable.open.value).toBe(false)
  })

  it('should send creating a new thread when no threads exist', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.send('Hello')
    expect(composable.hasThreads.value).toBe(true)
    expect(composable.messageCount.value).toBe(1)
    expect(composable.threads.value[0].messages[0].content).toBe('Hello')
  })

  it('should send adding a message when a thread exists', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.send('First')
    await composable.send('Second')

    expect(composable.threads.value).toHaveLength(1)
    expect(composable.messageCount.value).toBe(2)
    expect(composable.threads.value[0].messages[1].content).toBe('Second')
  })

  it('should track unread count', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    composable.markAsRead()
    expect(composable.unreadCount.value).toBe(0)

    await composable.send('Hello')
    expect(composable.unreadCount.value).toBe(1)

    composable.markAsRead()
    expect(composable.unreadCount.value).toBe(0)
  })

  it('should mark as read on toggle open', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.send('Hello')
    expect(composable.unreadCount.value).toBe(1)

    composable.toggle() // open
    expect(composable.unreadCount.value).toBe(0)
  })

  it('should mark as read on show', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.send('Hello')
    composable.show()
    expect(composable.unreadCount.value).toBe(0)
  })

  it('should mark as read on hide', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.send('Hello')
    composable.hide()
    expect(composable.unreadCount.value).toBe(0)
  })
})
