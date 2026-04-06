import { describe, it, expect } from 'vitest'
import { createMemoryAdapter } from '../index'

describe('createMemoryAdapter', () => {
  it('should return empty threads for unknown anchor', async () => {
    const adapter = createMemoryAdapter()
    const threads = await adapter.getThreads('unknown')
    expect(threads).toEqual([])
  })

  it('should create a thread with initial message', async () => {
    const adapter = createMemoryAdapter()
    const thread = await adapter.createThread('anchor-1', 'Hello')

    expect(thread.anchorId).toBe('anchor-1')
    expect(thread.resolved).toBe(false)
    expect(thread.messages).toHaveLength(1)
    expect(thread.messages[0].content).toBe('Hello')
  })

  it('should retrieve created threads by anchorId', async () => {
    const adapter = createMemoryAdapter()
    await adapter.createThread('anchor-1', 'First')
    await adapter.createThread('anchor-1', 'Second')
    await adapter.createThread('anchor-2', 'Other')

    const threads1 = await adapter.getThreads('anchor-1')
    const threads2 = await adapter.getThreads('anchor-2')

    expect(threads1).toHaveLength(2)
    expect(threads2).toHaveLength(1)
  })

  it('should add a message to an existing thread', async () => {
    const adapter = createMemoryAdapter()
    const thread = await adapter.createThread('anchor-1', 'First')
    const message = await adapter.addMessage(thread.id, 'Reply')

    expect(message.content).toBe('Reply')

    const threads = await adapter.getThreads('anchor-1')
    expect(threads[0].messages).toHaveLength(2)
    expect(threads[0].messages[1].content).toBe('Reply')
  })

  it('should throw when adding message to non-existent thread', async () => {
    const adapter = createMemoryAdapter()
    await expect(adapter.addMessage('no-such-thread', 'msg')).rejects.toThrow(
      'Thread no-such-thread not found',
    )
  })
})
