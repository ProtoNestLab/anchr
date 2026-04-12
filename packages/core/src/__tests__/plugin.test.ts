import { describe, it, expect, vi } from 'vitest'
import { createClient, createMemoryAdapter } from '../index'
import type { Plugin } from '../plugin'
import type { Thread, Message } from '../types'

describe('Plugin system', () => {
  // --- install ---

  it('should call install with client context', () => {
    const install = vi.fn()
    const plugin: Plugin = { name: 'test-plugin', install }

    const client = createClient({
      adapter: createMemoryAdapter(),
      plugins: [plugin],
    })

    expect(install).toHaveBeenCalledTimes(1)
    expect(install).toHaveBeenCalledWith(expect.objectContaining({ client: expect.any(Object) }))
    expect(client).toBeDefined()
  })

  it('should call install for multiple plugins in order', () => {
    const order: string[] = []
    const p1: Plugin = { name: 'p1', install: () => order.push('p1') }
    const p2: Plugin = { name: 'p2', install: () => order.push('p2') }

    createClient({ adapter: createMemoryAdapter(), plugins: [p1, p2] })
    expect(order).toEqual(['p1', 'p2'])
  })

  // --- beforeCreateThread / afterCreateThread ---

  it('should call beforeCreateThread and allow content modification', async () => {
    const plugin: Plugin = {
      name: 'transform',
      beforeCreateThread: (_anchorId, content) => `[PREFIX] ${content}`,
    }

    const client = createClient({
      adapter: createMemoryAdapter(),
      plugins: [plugin],
    })

    const thread = await client.adapter.createThread('a', 'Hello')
    expect(thread.messages[0].content).toBe('[PREFIX] Hello')
  })

  it('should not modify content when beforeCreateThread returns void', async () => {
    const spy = vi.fn()
    const plugin: Plugin = {
      name: 'logger',
      beforeCreateThread: (anchorId, content) => {
        spy(anchorId, content)
      },
    }

    const client = createClient({
      adapter: createMemoryAdapter(),
      plugins: [plugin],
    })

    const thread = await client.adapter.createThread('a', 'Hello')
    expect(thread.messages[0].content).toBe('Hello')
    expect(spy).toHaveBeenCalledWith('a', 'Hello')
  })

  it('should call afterCreateThread with the created thread', async () => {
    let captured: Thread | undefined
    const plugin: Plugin = {
      name: 'after',
      afterCreateThread: (thread) => {
        captured = thread
      },
    }

    const client = createClient({
      adapter: createMemoryAdapter(),
      plugins: [plugin],
    })

    const thread = await client.adapter.createThread('a', 'Hello')
    expect(captured).toBe(thread)
  })

  it('should chain multiple beforeCreateThread plugins', async () => {
    const p1: Plugin = {
      name: 'p1',
      beforeCreateThread: (_a, content) => `[1]${content}`,
    }
    const p2: Plugin = {
      name: 'p2',
      beforeCreateThread: (_a, content) => `[2]${content}`,
    }

    const client = createClient({
      adapter: createMemoryAdapter(),
      plugins: [p1, p2],
    })

    const thread = await client.adapter.createThread('a', 'msg')
    expect(thread.messages[0].content).toBe('[2][1]msg')
  })

  // --- beforeAddMessage / afterAddMessage ---

  it('should call beforeAddMessage and allow content modification', async () => {
    const plugin: Plugin = {
      name: 'censor',
      beforeAddMessage: (_threadId, content) => content.replace('bad', '***'),
    }

    const client = createClient({
      adapter: createMemoryAdapter(),
      plugins: [plugin],
    })

    const thread = await client.adapter.createThread('a', 'init')
    const msg = await client.adapter.addMessage(thread.id, 'this is bad word')
    expect(msg.content).toBe('this is *** word')
  })

  it('should not modify content when beforeAddMessage returns void', async () => {
    const spy = vi.fn()
    const plugin: Plugin = {
      name: 'logger',
      beforeAddMessage: (threadId, content) => {
        spy(threadId, content)
      },
    }

    const client = createClient({
      adapter: createMemoryAdapter(),
      plugins: [plugin],
    })

    const thread = await client.adapter.createThread('a', 'init')
    const msg = await client.adapter.addMessage(thread.id, 'Hello')
    expect(msg.content).toBe('Hello')
    expect(spy).toHaveBeenCalledWith(thread.id, 'Hello')
  })

  it('should call afterAddMessage with the created message', async () => {
    let captured: Message | undefined
    const plugin: Plugin = {
      name: 'after',
      afterAddMessage: (message) => {
        captured = message
      },
    }

    const client = createClient({
      adapter: createMemoryAdapter(),
      plugins: [plugin],
    })

    const thread = await client.adapter.createThread('a', 'init')
    const msg = await client.adapter.addMessage(thread.id, 'Hello')
    expect(captured).toBe(msg)
  })

  // --- passthrough ---

  it('should pass through non-intercepted adapter methods', async () => {
    const plugin: Plugin = { name: 'noop' }

    const client = createClient({
      adapter: createMemoryAdapter(),
      plugins: [plugin],
    })

    const thread = await client.adapter.createThread('a', 'msg')
    const resolved = await client.adapter.resolveThread(thread.id)
    expect(resolved.resolved).toBe(true)

    const reopened = await client.adapter.reopenThread(thread.id)
    expect(reopened.resolved).toBe(false)

    await client.adapter.deleteThread(thread.id)
    const threads = await client.adapter.getThreads('a')
    expect(threads).toHaveLength(0)
  })

  // --- no plugins ---

  it('should work without plugins', async () => {
    const client = createClient({ adapter: createMemoryAdapter() })
    const thread = await client.adapter.createThread('a', 'Hello')
    expect(thread.messages[0].content).toBe('Hello')
  })
})
