import { describe, it, expect, vi } from 'vitest'
import { createMemoryAdapter } from '../index'

describe('createMemoryAdapter', () => {
  // --- Threads ---

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
    expect(thread.messages[0].reactions).toEqual([])
    expect(thread.lastActivityAt).toBeGreaterThan(0)
  })

  it('should retrieve created threads by anchorId', async () => {
    const adapter = createMemoryAdapter()
    await adapter.createThread('anchor-1', 'First')
    await adapter.createThread('anchor-1', 'Second')
    await adapter.createThread('anchor-2', 'Other')

    expect(await adapter.getThreads('anchor-1')).toHaveLength(2)
    expect(await adapter.getThreads('anchor-2')).toHaveLength(1)
  })

  it('should resolve and reopen a thread', async () => {
    const adapter = createMemoryAdapter()
    const thread = await adapter.createThread('a', 'msg')

    const resolved = await adapter.resolveThread(thread.id)
    expect(resolved.resolved).toBe(true)

    const reopened = await adapter.reopenThread(thread.id)
    expect(reopened.resolved).toBe(false)
  })

  it('should delete a thread', async () => {
    const adapter = createMemoryAdapter()
    const thread = await adapter.createThread('a', 'msg')
    await adapter.deleteThread(thread.id)
    expect(await adapter.getThreads('a')).toHaveLength(0)
  })

  it('should throw when resolving non-existent thread', async () => {
    const adapter = createMemoryAdapter()
    await expect(adapter.resolveThread('nope')).rejects.toThrow('Thread nope not found')
  })

  it('should throw when deleting non-existent thread', async () => {
    const adapter = createMemoryAdapter()
    await expect(adapter.deleteThread('nope')).rejects.toThrow('Thread nope not found')
  })

  // --- Messages ---

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

  it('should edit a message', async () => {
    const adapter = createMemoryAdapter()
    const thread = await adapter.createThread('a', 'original')
    const msgId = thread.messages[0].id

    const edited = await adapter.editMessage(msgId, 'updated')
    expect(edited.content).toBe('updated')
    expect(edited.updatedAt).toBeGreaterThan(0)
  })

  it('should throw when editing non-existent message', async () => {
    const adapter = createMemoryAdapter()
    await expect(adapter.editMessage('nope', 'x')).rejects.toThrow('Message nope not found')
  })

  it('should delete a message', async () => {
    const adapter = createMemoryAdapter()
    const thread = await adapter.createThread('a', 'msg1')
    await adapter.addMessage(thread.id, 'msg2')

    const msgId = thread.messages[0].id
    await adapter.deleteMessage(thread.id, msgId)

    const threads = await adapter.getThreads('a')
    expect(threads[0].messages).toHaveLength(1)
    expect(threads[0].messages[0].content).toBe('msg2')
  })

  // --- Reactions ---

  it('should add and remove a reaction', async () => {
    const adapter = createMemoryAdapter()
    const thread = await adapter.createThread('a', 'msg')
    const msgId = thread.messages[0].id

    const withReaction = await adapter.addReaction(msgId, '👍')
    expect(withReaction.reactions).toHaveLength(1)
    expect(withReaction.reactions[0].emoji).toBe('👍')

    const without = await adapter.removeReaction(msgId, '👍')
    expect(without.reactions).toHaveLength(0)
  })

  it('should not duplicate the same reaction', async () => {
    const adapter = createMemoryAdapter()
    const thread = await adapter.createThread('a', 'msg')
    const msgId = thread.messages[0].id

    await adapter.addReaction(msgId, '👍')
    await adapter.addReaction(msgId, '👍')

    const threads = await adapter.getThreads('a')
    expect(threads[0].messages[0].reactions).toHaveLength(1)
  })

  // --- User identity ---

  it('should use provided user in messages', async () => {
    const user = { id: 'u1', name: 'Alice' }
    const adapter = createMemoryAdapter(user)
    const thread = await adapter.createThread('a', 'hello')

    expect(thread.messages[0].user).toEqual(user)
  })

  // --- Subscribe ---

  it('should notify subscribers on changes', async () => {
    const adapter = createMemoryAdapter()
    const callback = vi.fn()

    const unsub = adapter.subscribe!('anchor-1', callback)
    await adapter.createThread('anchor-1', 'msg')

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ anchorId: 'anchor-1' })]),
    )

    unsub()
    await adapter.createThread('anchor-1', 'msg2')
    expect(callback).toHaveBeenCalledTimes(1) // no more calls after unsub
  })
})
