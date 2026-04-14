import { ref, computed, type Ref } from 'vue'
import type { User } from '@anchor-sdk/core'

export interface UseMentionsOptions {
  /** The ref/getter for the current text input value. */
  text: Ref<string>
  /** Resolve the list of mentionable users. Called on demand, can return a cached list or fetch. */
  resolveUsers: () => Promise<User[]> | User[]
  /** Optional filter to exclude users (e.g. the current user). */
  filter?: (user: User) => boolean
  /** Maximum number of suggestions to return. Default: 8. */
  limit?: number
}

/**
 * Headless @mention autocomplete.
 *
 * Tracks the text cursor and exposes:
 * - `active` — true when an `@query` token is under the cursor
 * - `query` — the current `@query` text
 * - `suggestions` — filtered users
 * - `selectedIndex` — highlighted suggestion index
 * - `onInput(cursor)` / `onSelect(user, cursor)` / `moveUp()` / `moveDown()` / `close()`
 */
export function useMentions(options: UseMentionsOptions) {
  const { text, resolveUsers, filter, limit = 8 } = options

  const active = ref(false)
  const query = ref('')
  const users = ref<User[]>([])
  const loading = ref(false)
  const selectedIndex = ref(0)
  const tokenStart = ref(-1)
  let usersCache: User[] | null = null

  const suggestions = computed<User[]>(() => {
    const q = query.value.toLowerCase()
    let list = users.value
    if (filter) list = list.filter(filter)
    if (q)
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q))
    return list.slice(0, limit)
  })

  async function ensureUsers() {
    if (usersCache) return
    loading.value = true
    try {
      const result = await resolveUsers()
      usersCache = result
      users.value = result
    } finally {
      loading.value = false
    }
  }

  function extractMentionToken(value: string, cursor: number) {
    const before = value.slice(0, cursor)
    const at = before.lastIndexOf('@')
    if (at === -1) return null
    if (at > 0 && !/\s/.test(before[at - 1]!)) return null
    const afterAt = before.slice(at + 1)
    if (/\s/.test(afterAt)) return null
    return { start: at, query: afterAt }
  }

  async function onInput(cursor: number) {
    const token = extractMentionToken(text.value, cursor)
    if (!token) {
      active.value = false
      query.value = ''
      tokenStart.value = -1
      return
    }
    tokenStart.value = token.start
    query.value = token.query
    active.value = true
    await ensureUsers()
    if (selectedIndex.value >= suggestions.value.length) selectedIndex.value = 0
  }

  function moveUp() {
    if (!suggestions.value.length) return
    selectedIndex.value =
      (selectedIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  }

  function moveDown() {
    if (!suggestions.value.length) return
    selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length
  }

  /**
   * Apply the selected user (or an explicit one) to the text.
   * Returns the new text and the new cursor position.
   */
  function select(
    cursor: number,
    user?: User,
  ): { text: string; cursor: number; user: User } | null {
    const pick = user ?? suggestions.value[selectedIndex.value]
    if (!pick || tokenStart.value < 0) return null
    const before = text.value.slice(0, tokenStart.value)
    const after = text.value.slice(cursor)
    const insert = `@${pick.name} `
    const newText = before + insert + after
    const newCursor = before.length + insert.length
    active.value = false
    query.value = ''
    tokenStart.value = -1
    return { text: newText, cursor: newCursor, user: pick }
  }

  function close() {
    active.value = false
    query.value = ''
    tokenStart.value = -1
  }

  function resetCache() {
    usersCache = null
    users.value = []
  }

  return {
    active,
    query,
    loading,
    suggestions,
    selectedIndex,
    onInput,
    moveUp,
    moveDown,
    select,
    close,
    resetCache,
  }
}
