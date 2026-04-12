import { describe, it, expect, vi } from 'vitest'
import { createOfflineQueue } from '../offline-queue'
import { createMemoryAdapter } from '../memory-adapter'

describe('createOfflineQueue', () => {
  it('should pass through operations when online', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const q = createOfflineQueue({ adapter })

    const thread = await q.adapter.createThread('a', 'Hello')
    expect(thread.messages[0].content).toBe('Hello')

    const threads = await q.adapter.getThreads('a')
    expect(threads).toHaveLength(1)
  })

  it('should queue mutations when offline', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const q = createOfflineQueue({ adapter })

    q.goOffline()

    // This should be queued, not executed
    const createPromise = q.adapter.createThread('a', 'Hello')

    // Thread shouldn't exist yet
    const threads = await q.adapter.getThreads('a')
    expect(threads).toHaveLength(0)
    expect(q.pending).toBe(1)

    // Don't await createPromise here — it's pending until goOnline
    void createPromise
  })

  it('should flush queue when going online', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const q = createOfflineQueue({ adapter })

    q.goOffline()
    const createPromise = q.adapter.createThread('a', 'Hello')

    q.goOnline()
    const thread = await createPromise

    expect(thread.messages[0].content).toBe('Hello')

    const threads = await q.adapter.getThreads('a')
    expect(threads).toHaveLength(1)
  })

  it('should queue multiple operations and flush in order', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const q = createOfflineQueue({ adapter })

    q.goOffline()

    const p1 = q.adapter.createThread('a', 'First')
    const p2 = q.adapter.createThread('a', 'Second')
    expect(q.pending).toBe(2)

    q.goOnline()
    await p1
    await p2

    const threads = await q.adapter.getThreads('a')
    expect(threads).toHaveLength(2)
  })

  it('should notify on status change', () => {
    const onStatusChange = vi.fn()
    const adapter = createMemoryAdapter()
    const q = createOfflineQueue({ adapter, onStatusChange })

    q.goOffline()
    expect(onStatusChange).toHaveBeenCalledWith('offline')

    q.goOnline()
    expect(onStatusChange).toHaveBeenCalledWith('online')
  })

  it('should not notify when status does not change', () => {
    const onStatusChange = vi.fn()
    const adapter = createMemoryAdapter()
    const q = createOfflineQueue({ adapter, onStatusChange })

    // Already online
    q.goOnline()
    expect(onStatusChange).not.toHaveBeenCalled()
  })

  it('should report correct status', () => {
    const adapter = createMemoryAdapter()
    const q = createOfflineQueue({ adapter })

    expect(q.status).toBe('online')
    q.goOffline()
    expect(q.status).toBe('offline')
    q.goOnline()
    expect(q.status).toBe('online')
  })

  it('should pass through subscribe', () => {
    const adapter = createMemoryAdapter()
    const q = createOfflineQueue({ adapter })

    expect(q.adapter.subscribe).toBeDefined()
    const unsub = q.adapter.subscribe!('a', vi.fn())
    expect(typeof unsub).toBe('function')
    unsub()
  })

  it('should handle queued operation failures', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const q = createOfflineQueue({ adapter })

    q.goOffline()
    const resolvePromise = q.adapter.resolveThread('nonexistent')

    q.goOnline()
    await expect(resolvePromise).rejects.toThrow()
  })
})
