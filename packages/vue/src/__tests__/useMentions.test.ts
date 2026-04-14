import { describe, it, expect, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useMentions } from '../useMentions'
import type { User } from '@anchor-sdk/core'

const USERS: User[] = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
  { id: 'u3', name: 'Charlie' },
]

describe('useMentions', () => {
  let text: ReturnType<typeof createText>

  function createText() {
    return ref('')
  }

  beforeEach(() => {
    text = createText()
  })

  it('activates when cursor is inside an @token', async () => {
    text.value = 'hello @al'
    const m = useMentions({ text, resolveUsers: () => USERS })
    await m.onInput(text.value.length)
    await nextTick()
    expect(m.active.value).toBe(true)
    expect(m.query.value).toBe('al')
    expect(m.suggestions.value[0]!.name).toBe('Alice')
  })

  it('does not activate when @ is mid-word', async () => {
    text.value = 'email@example'
    const m = useMentions({ text, resolveUsers: () => USERS })
    await m.onInput(text.value.length)
    expect(m.active.value).toBe(false)
  })

  it('closes when @token contains a space', async () => {
    text.value = '@alice ok'
    const m = useMentions({ text, resolveUsers: () => USERS })
    await m.onInput(text.value.length)
    expect(m.active.value).toBe(false)
  })

  it('filters users by name and id', async () => {
    text.value = '@bo'
    const m = useMentions({ text, resolveUsers: () => USERS })
    await m.onInput(text.value.length)
    expect(m.suggestions.value).toHaveLength(1)
    expect(m.suggestions.value[0]!.id).toBe('u2')
  })

  it('respects the filter option (excludes current user)', async () => {
    text.value = '@'
    const m = useMentions({
      text,
      resolveUsers: () => USERS,
      filter: (u) => u.id !== 'u1',
    })
    await m.onInput(text.value.length)
    expect(m.suggestions.value.find((u) => u.id === 'u1')).toBeUndefined()
  })

  it('moveUp/moveDown wraps selection index', async () => {
    text.value = '@'
    const m = useMentions({ text, resolveUsers: () => USERS })
    await m.onInput(text.value.length)
    expect(m.selectedIndex.value).toBe(0)
    m.moveDown()
    expect(m.selectedIndex.value).toBe(1)
    m.moveUp()
    m.moveUp()
    expect(m.selectedIndex.value).toBe(m.suggestions.value.length - 1)
  })

  it('select() replaces the @token with the mention', async () => {
    text.value = 'hello @al'
    const m = useMentions({ text, resolveUsers: () => USERS })
    await m.onInput(text.value.length)
    const result = m.select(text.value.length)
    expect(result).not.toBeNull()
    expect(result!.text).toBe('hello @Alice ')
    expect(result!.user.id).toBe('u1')
    expect(m.active.value).toBe(false)
  })

  it('close() resets state', async () => {
    text.value = '@al'
    const m = useMentions({ text, resolveUsers: () => USERS })
    await m.onInput(text.value.length)
    expect(m.active.value).toBe(true)
    m.close()
    expect(m.active.value).toBe(false)
    expect(m.query.value).toBe('')
  })

  it('supports async resolveUsers', async () => {
    text.value = '@'
    const m = useMentions({
      text,
      resolveUsers: async () => {
        await new Promise((r) => setTimeout(r, 5))
        return USERS
      },
    })
    await m.onInput(text.value.length)
    expect(m.suggestions.value.length).toBe(USERS.length)
  })
})
