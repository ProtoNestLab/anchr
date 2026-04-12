import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import CollabProvider from '../CollabProvider.vue'
import { useThreads } from '../useThreads'

function createWrapper(anchorId: string, user = { id: 'u1', name: 'Alice' }) {
  const adapter = createMemoryAdapter(user)
  const client = createClient({ adapter, user })

  let composable: ReturnType<typeof useThreads> | undefined

  const Child = defineComponent({
    setup() {
      composable = useThreads(anchorId)
      return () => h('div')
    },
  })

  const wrapper = mount(CollabProvider, {
    props: { client },
    slots: { default: () => h(Child) },
  })

  return { wrapper, composable: composable!, client, adapter }
}

describe('useThreads', () => {
  it('should start with empty threads', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()
    expect(composable.threads.value).toEqual([])
  })

  it('should create a thread and refresh', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.createThread('Hello')
    expect(composable.threads.value).toHaveLength(1)
    expect(composable.threads.value[0].messages[0].content).toBe('Hello')
  })

  it('should add a message to a thread', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.createThread('First')
    const threadId = composable.threads.value[0].id

    await composable.addMessage(threadId, 'Reply')
    expect(composable.threads.value[0].messages).toHaveLength(2)
    expect(composable.threads.value[0].messages[1].content).toBe('Reply')
  })

  it('should edit a message', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.createThread('Original')
    const msgId = composable.threads.value[0].messages[0].id

    const edited = await composable.editMessage(msgId, 'Edited')
    expect(edited!.content).toBe('Edited')
    expect(composable.threads.value[0].messages[0].content).toBe('Edited')
  })

  it('should delete a message', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.createThread('msg1')
    const threadId = composable.threads.value[0].id
    await composable.addMessage(threadId, 'msg2')

    const msgId = composable.threads.value[0].messages[0].id
    await composable.deleteMessage(threadId, msgId)
    expect(composable.threads.value[0].messages).toHaveLength(1)
  })

  it('should resolve and reopen a thread', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.createThread('msg')
    const threadId = composable.threads.value[0].id

    await composable.resolveThread(threadId)
    expect(composable.threads.value[0].resolved).toBe(true)

    await composable.reopenThread(threadId)
    expect(composable.threads.value[0].resolved).toBe(false)
  })

  it('should delete a thread', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.createThread('msg')
    const threadId = composable.threads.value[0].id

    await composable.deleteThread(threadId)
    expect(composable.threads.value).toHaveLength(0)
  })

  it('should add and remove reactions', async () => {
    const { composable } = createWrapper('anchor-1')
    await flushPromises()

    await composable.createThread('msg')
    const msgId = composable.threads.value[0].messages[0].id

    await composable.addReaction(msgId, '👍')
    expect(composable.threads.value[0].messages[0].reactions).toHaveLength(1)

    await composable.removeReaction(msgId, '👍')
    expect(composable.threads.value[0].messages[0].reactions).toHaveLength(0)
  })

  it('should refresh threads', async () => {
    const { composable, adapter } = createWrapper('anchor-1')
    await flushPromises()

    // Create thread directly via adapter (simulating external change)
    await adapter.createThread('anchor-1', 'External')

    await composable.refresh()
    expect(composable.threads.value).toHaveLength(1)
  })
})
