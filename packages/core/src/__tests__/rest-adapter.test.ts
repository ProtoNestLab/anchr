import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRestAdapter } from '../adapters/rest'
import type { Thread, Message } from '../types'

const BASE_URL = 'https://api.example.com'

const mockThread: Thread = {
  id: 't1',
  anchorId: 'anchor-1',
  messages: [
    {
      id: 'm1',
      content: 'Hello',
      createdAt: 1000,
      user: { id: 'u1', name: 'Alice' },
      reactions: [],
    },
  ],
  resolved: false,
  lastActivityAt: 1000,
}

const mockMessage: Message = {
  id: 'm1',
  content: 'Hello',
  createdAt: 1000,
  user: { id: 'u1', name: 'Alice' },
  reactions: [],
}

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Bad Request',
    json: () => Promise.resolve(data),
  })
}

describe('createRestAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // --- getThreads ---

  it('should GET threads by anchorId', async () => {
    const fetch = mockFetch([mockThread])
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    const threads = await adapter.getThreads('anchor-1')

    expect(threads).toEqual([mockThread])
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/threads?anchorId=anchor-1`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('should encode anchorId in getThreads', async () => {
    const fetch = mockFetch([])
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    await adapter.getThreads('anchor with spaces')

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/threads?anchorId=anchor%20with%20spaces`,
      expect.anything(),
    )
  })

  // --- createThread ---

  it('should POST to create a thread', async () => {
    const fetch = mockFetch(mockThread)
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    const thread = await adapter.createThread('anchor-1', 'Hello')

    expect(thread).toEqual(mockThread)
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/threads`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ anchorId: 'anchor-1', content: 'Hello' }),
      }),
    )
  })

  // --- resolveThread ---

  it('should PATCH to resolve a thread', async () => {
    const fetch = mockFetch({ ...mockThread, resolved: true })
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    const thread = await adapter.resolveThread('t1')

    expect(thread.resolved).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/threads/t1/resolve`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  // --- reopenThread ---

  it('should PATCH to reopen a thread', async () => {
    const fetch = mockFetch(mockThread)
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    await adapter.reopenThread('t1')

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/threads/t1/reopen`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  // --- deleteThread ---

  it('should DELETE a thread', async () => {
    const fetch = mockFetch(undefined)
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    await adapter.deleteThread('t1')

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/threads/t1`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  // --- addMessage ---

  it('should POST to add a message', async () => {
    const fetch = mockFetch(mockMessage)
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    const msg = await adapter.addMessage('t1', 'Reply')

    expect(msg).toEqual(mockMessage)
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/threads/t1/messages`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ content: 'Reply' }),
      }),
    )
  })

  // --- editMessage ---

  it('should PATCH to edit a message', async () => {
    const fetch = mockFetch({ ...mockMessage, content: 'Updated' })
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    const msg = await adapter.editMessage('m1', 'Updated')

    expect(msg.content).toBe('Updated')
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/messages/m1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ content: 'Updated' }),
      }),
    )
  })

  // --- deleteMessage ---

  it('should DELETE a message', async () => {
    const fetch = mockFetch(undefined)
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    await adapter.deleteMessage('t1', 'm1')

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/threads/t1/messages/m1`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  // --- addReaction ---

  it('should POST to add a reaction', async () => {
    const reacted = {
      ...mockMessage,
      reactions: [{ emoji: '👍', userId: 'u1' }],
    }
    const fetch = mockFetch(reacted)
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    const msg = await adapter.addReaction('m1', '👍')

    expect(msg.reactions).toHaveLength(1)
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/messages/m1/reactions`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ emoji: '👍' }),
      }),
    )
  })

  // --- removeReaction ---

  it('should DELETE a reaction', async () => {
    const fetch = mockFetch(mockMessage)
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    await adapter.removeReaction('m1', '👍')

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/messages/m1/reactions/${encodeURIComponent('👍')}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  // --- Headers ---

  it('should pass custom headers', async () => {
    const fetch = mockFetch([])
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({
      baseUrl: BASE_URL,
      headers: { Authorization: 'Bearer token123' },
    })
    await adapter.getThreads('a')

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        }),
      }),
    )
  })

  // --- Error handling ---

  it('should throw on non-ok response', async () => {
    const fetch = mockFetch(null, 404)
    vi.stubGlobal('fetch', fetch)

    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    await expect(adapter.getThreads('a')).rejects.toThrow('REST adapter: 404')
  })

  it('should not have subscribe method', () => {
    const adapter = createRestAdapter({ baseUrl: BASE_URL })
    expect(adapter.subscribe).toBeUndefined()
  })
})
