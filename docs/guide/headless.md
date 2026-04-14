# Headless Mode

Use `useAnchor()` and `usePresence()` for full control over the UI while keeping all the discussion logic.

## useAnchor(anchorId)

```ts
import { useAnchor } from '@anchor-sdk/vue'

const {
  // State
  threads, // Ref<Thread[]>
  loading, // Ref<boolean>
  error, // Ref<Error | null>
  open, // Ref<boolean>
  messageCount, // ComputedRef<number>
  unreadCount, // ComputedRef<number>
  hasThreads, // ComputedRef<boolean>
  currentUser, // User

  // Quick actions
  send, // (content: string, options?: MessageOptions) => Promise<void>
  toggle, // () => void
  show, // () => void
  hide, // () => void
  markAsRead, // () => void

  // Full thread API (all with optimistic updates)
  createThread, // (content, options?) => Promise<void>
  addMessage, // (threadId, content, options?) => Promise<void>
  editMessage, // (messageId, content) => Promise<Message>
  deleteMessage, // (threadId, messageId) => Promise<void>
  resolveThread, // (threadId) => Promise<void>
  reopenThread, // (threadId) => Promise<void>
  deleteThread, // (threadId) => Promise<void>
  addReaction, // (messageId, emoji) => Promise<void>
  removeReaction, // (messageId, emoji) => Promise<void>
  uploadAttachment, // (file: File) => Promise<Attachment | undefined>
  refresh, // () => Promise<void>
} = useAnchor('my-element')
```

All mutations use optimistic updates — the UI updates instantly and rolls back automatically on error.

## usePresence(anchorId)

```ts
import { usePresence } from '@anchor-sdk/vue'

const {
  presence, // Ref<PresenceInfo[]> — who's online
  typingUsers, // Ref<User[]> — who's typing
  setOnline, // () => Promise<void>
  setAway, // () => Promise<void>
  setOffline, // () => Promise<void>
  startTyping, // () => Promise<void>
  stopTyping, // () => Promise<void>
} = usePresence('my-element')
```

The composable auto-sets the user online on mount and offline on unmount. Requires an adapter with presence support (e.g. `createMemoryAdapter` or `createWebSocketAdapter`).

## useMentions(options)

Headless `@mention` autocomplete. Drives your own suggestion popup using any text input.

```ts
import { useMentions } from '@anchor-sdk/vue'
import { ref } from 'vue'

const text = ref('')
const m = useMentions({
  text,
  resolveUsers: () => teamMembers, // sync or async
  filter: (u) => u.id !== currentUser.id,
})

function onInput(e: Event) {
  const el = e.target as HTMLTextAreaElement
  m.onInput(el.selectionStart ?? el.value.length)
}
</script>

<template>
  <textarea v-model="text" @input="onInput" />
  <ul v-if="m.active.value">
    <li
      v-for="(u, i) in m.suggestions.value"
      :key="u.id"
      :class="{ active: i === m.selectedIndex.value }"
      @mousedown.prevent="
        {
          const r = m.select(textarea.selectionStart ?? 0, u)
          if (r) text = r.text
        }
      "
    >
      @{{ u.name }}
    </li>
  </ul>
</template>
```

The composable only manages state — you own the rendering, positioning, and input binding.

## Attachments

Enable file/image attachments by implementing `uploadAttachment` on your adapter, then:

```ts
const { uploadAttachment, send } = useAnchor('my-element')

async function onFile(file: File) {
  const att = await uploadAttachment(file)
  if (att) await send('see attached', { attachments: [att] })
}
```

If the adapter doesn't implement attachments, `uploadAttachment` returns `undefined` and sets `error`.

## Example: Custom Chat UI

```vue
<script setup lang="ts">
import { useAnchor } from '@anchor-sdk/vue'

const { threads, send, open, toggle, messageCount } = useAnchor('custom-chat')
const input = ref('')

function handleSend() {
  if (input.value.trim()) {
    send(input.value)
    input.value = ''
  }
}
</script>

<template>
  <div class="my-chat">
    <button @click="toggle">Comments ({{ messageCount }})</button>

    <div v-if="open" class="my-chat-panel">
      <div v-for="thread in threads" :key="thread.id">
        <div v-for="msg in thread.messages" :key="msg.id">
          <b>{{ msg.user.name }}</b
          >: {{ msg.content }}
        </div>
      </div>

      <input v-model="input" @keydown.enter="handleSend" />
      <button @click="handleSend">Send</button>
    </div>
  </div>
</template>
```
