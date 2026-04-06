import { describe, it, expect } from 'vitest'
import { createClient, createMemoryAdapter } from '../index'

describe('createClient', () => {
  it('should create a client with the given adapter', () => {
    const adapter = createMemoryAdapter()
    const client = createClient({ adapter })
    expect(client.adapter).toBe(adapter)
  })

  it('should use default anonymous user when no user provided', () => {
    const client = createClient({ adapter: createMemoryAdapter() })
    expect(client.user).toEqual({ id: 'anonymous', name: 'Anonymous' })
  })

  it('should use provided user', () => {
    const user = { id: 'u1', name: 'Alice' }
    const client = createClient({ adapter: createMemoryAdapter(), user })
    expect(client.user).toEqual(user)
  })
})
