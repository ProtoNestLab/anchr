import { describe, it, expect } from 'vitest'
import { createClient, createMemoryAdapter } from '../index'

describe('createClient', () => {
  it('should create a client with the given adapter', () => {
    const adapter = createMemoryAdapter()
    const client = createClient({ adapter })
    expect(client.adapter).toBe(adapter)
  })
})
