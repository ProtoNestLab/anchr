import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createWebSocketAdapter } from '../adapters/websocket'

// --- Mock WebSocket ---
class MockWebSocket {
  static instances: MockWebSocket[] = []
  readyState = 0 // CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  sent: string[] = []

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
    // Simulate async connection
    setTimeout(() => {
      this.readyState = 1 // OPEN
      this.onopen?.()
    }, 0)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3 // CLOSED
    this.onclose?.()
  }

  // Test helper: simulate receiving a message
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  static reset() {
    MockWebSocket.instances = []
  }
}

// Add static OPEN/CLOSED constants
Object.defineProperty(MockWebSocket, 'OPEN', { value: 1 })
Object.defineProperty(MockWebSocket, 'CONNECTING', { value: 0 })

const BASE_URL = 'https://api.example.com'
const WS_URL = 'wss://api.example.com/ws'

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Bad Request',
    json: () => Promise.resolve(data),
  })
}

describe('createWebSocketAdapter', () => {
  beforeEach(() => {
    MockWebSocket.reset()
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create adapter with REST and WS capabilities', () => {
    const adapter = createWebSocketAdapter({
      url: WS_URL,
      restBaseUrl: BASE_URL,
    })

    expect(adapter.getThreads).toBeTypeOf('function')
    expect(adapter.subscribe).toBeTypeOf('function')
    expect(adapter.setPresence).toBeTypeOf('function')
    expect(adapter.subscribePresence).toBeTypeOf('function')
    expect(adapter.setTyping).toBeTypeOf('function')
    expect(adapter.subscribeTyping).toBeTypeOf('function')
    expect(adapter.connect).toBeTypeOf('function')
    expect(adapter.disconnect).toBeTypeOf('function')
  })

  // --- REST mutations ---

  it('should use REST for getThreads', async () => {
    const fetch = mockFetch([])
    vi.stubGlobal('fetch', fetch)

    const adapter = createWebSocketAdapter({ url: WS_URL, restBaseUrl: BASE_URL })
    const threads = await adapter.getThreads('anchor-1')

    expect(threads).toEqual([])
    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/threads?anchorId=anchor-1`, expect.anything())
  })

  it('should use REST for createThread', async () => {
    const mockThread = { id: 't1', anchorId: 'a', messages: [], resolved: false, lastActivityAt: 0 }
    const fetch = mockFetch(mockThread)
    vi.stubGlobal('fetch', fetch)

    const adapter = createWebSocketAdapter({ url: WS_URL, restBaseUrl: BASE_URL })
    const thread = await adapter.createThread('a', 'Hello')

    expect(thread).toEqual(mockThread)
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/threads`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  // --- WebSocket subscribe ---

  it('should connect WebSocket on subscribe', async () => {
    const adapter = createWebSocketAdapter({ url: WS_URL, restBaseUrl: BASE_URL })

    const callback = vi.fn()
    adapter.subscribe!('anchor-1', callback)

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe(WS_URL)
  })

  it('should forward threads:updated messages to subscribers', async () => {
    const adapter = createWebSocketAdapter({ url: WS_URL, restBaseUrl: BASE_URL })

    const callback = vi.fn()
    adapter.subscribe!('anchor-1', callback)

    // Wait for WS to connect
    await new Promise((r) => setTimeout(r, 10))

    const ws = MockWebSocket.instances[0]
    const threads = [
      { id: 't1', anchorId: 'anchor-1', messages: [], resolved: false, lastActivityAt: 0 },
    ]
    ws.simulateMessage({ type: 'threads:updated', anchorId: 'anchor-1', threads })

    expect(callback).toHaveBeenCalledWith(threads)
  })

  it('should unsubscribe correctly', async () => {
    const adapter = createWebSocketAdapter({ url: WS_URL, restBaseUrl: BASE_URL })

    const callback = vi.fn()
    const unsub = adapter.subscribe!('anchor-1', callback)

    await new Promise((r) => setTimeout(r, 10))

    unsub()
    const ws = MockWebSocket.instances[0]
    ws.simulateMessage({
      type: 'threads:updated',
      anchorId: 'anchor-1',
      threads: [],
    })

    expect(callback).not.toHaveBeenCalled()
  })

  // --- Presence ---

  it('should forward presence updates to subscribers', async () => {
    const adapter = createWebSocketAdapter({ url: WS_URL, restBaseUrl: BASE_URL })

    const callback = vi.fn()
    adapter.subscribePresence!('anchor-1', callback)

    await new Promise((r) => setTimeout(r, 10))

    const ws = MockWebSocket.instances[0]
    const presence = [{ user: { id: 'u1', name: 'Alice' }, status: 'online', lastSeen: 1000 }]
    ws.simulateMessage({ type: 'presence:updated', anchorId: 'anchor-1', presence })

    expect(callback).toHaveBeenCalledWith(presence)
  })

  it('should send presence via WebSocket', async () => {
    const adapter = createWebSocketAdapter({ url: WS_URL, restBaseUrl: BASE_URL })

    // Need to subscribe first to open the connection
    adapter.subscribePresence!('anchor-1', vi.fn())
    await new Promise((r) => setTimeout(r, 10))

    await adapter.setPresence!('anchor-1', { id: 'u1', name: 'Alice' }, 'online')

    const ws = MockWebSocket.instances[0]
    const lastSent = JSON.parse(ws.sent[ws.sent.length - 1])
    expect(lastSent.type).toBe('presence:set')
    expect(lastSent.anchorId).toBe('anchor-1')
    expect(lastSent.user.name).toBe('Alice')
  })

  // --- Typing ---

  it('should forward typing updates to subscribers', async () => {
    const adapter = createWebSocketAdapter({ url: WS_URL, restBaseUrl: BASE_URL })

    const callback = vi.fn()
    adapter.subscribeTyping!('anchor-1', callback)

    await new Promise((r) => setTimeout(r, 10))

    const ws = MockWebSocket.instances[0]
    ws.simulateMessage({
      type: 'typing:updated',
      anchorId: 'anchor-1',
      users: [{ id: 'u1', name: 'Alice' }],
    })

    expect(callback).toHaveBeenCalledWith([{ id: 'u1', name: 'Alice' }])
  })

  it('should send typing via WebSocket', async () => {
    const adapter = createWebSocketAdapter({ url: WS_URL, restBaseUrl: BASE_URL })

    adapter.subscribeTyping!('anchor-1', vi.fn())
    await new Promise((r) => setTimeout(r, 10))

    await adapter.setTyping!('anchor-1', { id: 'u1', name: 'Alice' }, true)

    const ws = MockWebSocket.instances[0]
    const lastSent = JSON.parse(ws.sent[ws.sent.length - 1])
    expect(lastSent.type).toBe('typing:set')
    expect(lastSent.isTyping).toBe(true)
  })

  // --- Connection lifecycle ---

  it('should disconnect and stop reconnecting', async () => {
    const adapter = createWebSocketAdapter({ url: WS_URL, restBaseUrl: BASE_URL })

    adapter.connect!()
    await new Promise((r) => setTimeout(r, 10))

    expect(MockWebSocket.instances).toHaveLength(1)

    adapter.disconnect!()
    expect(MockWebSocket.instances[0].readyState).toBe(3) // CLOSED
  })

  it('should re-subscribe on reconnect', async () => {
    const adapter = createWebSocketAdapter({
      url: WS_URL,
      restBaseUrl: BASE_URL,
      reconnectDelay: 10,
    })

    adapter.subscribe!('anchor-1', vi.fn())
    await new Promise((r) => setTimeout(r, 10))

    // First connection established - check subscribe message sent
    const ws1 = MockWebSocket.instances[0]
    const subscribeMsgs1 = ws1.sent.filter((s) => JSON.parse(s).type === 'subscribe')
    expect(subscribeMsgs1.length).toBeGreaterThan(0)

    // Simulate disconnect (non-intentional)
    ws1.close()

    // Wait for reconnect
    await new Promise((r) => setTimeout(r, 50))

    // A new WebSocket should have been created
    expect(MockWebSocket.instances.length).toBeGreaterThan(1)
  })
})
