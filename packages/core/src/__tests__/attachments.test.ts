import { describe, it, expect } from 'vitest'
import { createMemoryAdapter } from '../memory-adapter'

describe('attachments', () => {
  it('uploads a file and returns an Attachment', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const file = new File(['hello world'], 'note.txt', { type: 'text/plain' })
    const att = await adapter.uploadAttachment!(file)
    expect(att.name).toBe('note.txt')
    expect(att.mimeType).toBe('text/plain')
    expect(att.size).toBe(file.size)
    expect(att.url.startsWith('data:text/plain')).toBe(true)
  })

  it('falls back to application/octet-stream when mimeType missing', async () => {
    const adapter = createMemoryAdapter()
    const file = new File(['abc'], 'raw', { type: '' })
    const att = await adapter.uploadAttachment!(file)
    expect(att.mimeType).toBe('application/octet-stream')
  })

  it('passes attachments through createThread and addMessage', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    const att = await adapter.uploadAttachment!(file)

    const thread = await adapter.createThread('anchor-1', 'see attached', {
      attachments: [att],
    })
    expect(thread.messages[0]!.attachments).toHaveLength(1)
    expect(thread.messages[0]!.attachments![0]!.name).toBe('doc.pdf')

    const msg = await adapter.addMessage(thread.id, 'another', { attachments: [att] })
    expect(msg.attachments).toHaveLength(1)
  })

  it('omits attachments field when none provided', async () => {
    const adapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
    const thread = await adapter.createThread('anchor-x', 'hi')
    expect(thread.messages[0]!.attachments).toBeUndefined()
  })
})
