import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createClient, createMemoryAdapter, type Adapter } from '@anchor-sdk/core'
import CollabProvider from '../CollabProvider.vue'
import { useThreads } from '../useThreads'

function createWrapper(anchorId: string, adapter: Adapter, user = { id: 'u1', name: 'Alice' }) {
  const client = createClient({ adapter, user })
  let composable: ReturnType<typeof useThreads> | undefined
  const Child = defineComponent({
    setup() {
      composable = useThreads(anchorId)
      return () => h('div')
    },
  })
  mount(CollabProvider, { props: { client }, slots: { default: () => h(Child) } })
  return { composable: composable! }
}

describe('useThreads attachments', () => {
  it('uploads a file through the adapter', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const { composable } = createWrapper('anchor-1', adapter)
    await flushPromises()

    const file = new File(['data'], 'demo.txt', { type: 'text/plain' })
    const att = await composable.uploadAttachment(file)
    expect(att?.name).toBe('demo.txt')
    expect(att?.mimeType).toBe('text/plain')
  })

  it('records error when adapter has no uploadAttachment support', async () => {
    const adapter: Adapter = {
      getThreads: async () => [],
      createThread: async () => ({
        id: 't1',
        anchorId: 'a',
        messages: [],
        resolved: false,
        lastActivityAt: 0,
      }),
      resolveThread: async () => ({
        id: 't1',
        anchorId: 'a',
        messages: [],
        resolved: true,
        lastActivityAt: 0,
      }),
      reopenThread: async () => ({
        id: 't1',
        anchorId: 'a',
        messages: [],
        resolved: false,
        lastActivityAt: 0,
      }),
      deleteThread: async () => {},
      addMessage: async () => ({
        id: 'm1',
        content: '',
        createdAt: 0,
        user: { id: 'u1', name: 'A' },
        reactions: [],
      }),
      editMessage: async () => ({
        id: 'm1',
        content: '',
        createdAt: 0,
        user: { id: 'u1', name: 'A' },
        reactions: [],
      }),
      deleteMessage: async () => {},
      addReaction: async () => ({
        id: 'm1',
        content: '',
        createdAt: 0,
        user: { id: 'u1', name: 'A' },
        reactions: [],
      }),
      removeReaction: async () => ({
        id: 'm1',
        content: '',
        createdAt: 0,
        user: { id: 'u1', name: 'A' },
        reactions: [],
      }),
    }
    const { composable } = createWrapper('anchor-x', adapter)
    await flushPromises()
    const file = new File([''], 'x.txt', { type: 'text/plain' })
    const result = await composable.uploadAttachment(file)
    expect(result).toBeUndefined()
    expect(composable.error.value?.message).toMatch(/does not support/i)
  })

  it('passes attachments to createThread', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const { composable } = createWrapper('anchor-1', adapter)
    await flushPromises()

    const file = new File(['data'], 'img.png', { type: 'image/png' })
    const att = await composable.uploadAttachment(file)
    await composable.createThread('see this', { attachments: [att!] })
    await flushPromises()

    expect(composable.threads.value).toHaveLength(1)
    const msg = composable.threads.value[0]!.messages[0]!
    expect(msg.attachments).toHaveLength(1)
    expect(msg.attachments![0]!.name).toBe('img.png')
  })

  it('passes attachments to addMessage', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const { composable } = createWrapper('anchor-1', adapter)
    await flushPromises()
    await composable.createThread('first')
    await flushPromises()
    const threadId = composable.threads.value[0]!.id

    const file = new File(['data'], 'file.pdf', { type: 'application/pdf' })
    const att = await composable.uploadAttachment(file)
    await composable.addMessage(threadId, 'with attachment', { attachments: [att!] })
    await flushPromises()

    const msgs = composable.threads.value[0]!.messages
    expect(msgs).toHaveLength(2)
    expect(msgs[1]!.attachments![0]!.name).toBe('file.pdf')
  })
})
