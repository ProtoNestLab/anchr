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
  send, // (content: string) => Promise<void>
  toggle, // () => void
  show, // () => void
  hide, // () => void
  markAsRead, // () => void

  // Full thread API (all with optimistic updates)
  createThread, // (content: string) => Promise<void>
  addMessage, // (threadId: string, content: string) => Promise<void>
  editMessage, // (messageId: string, content: string) => Promise<Message>
  deleteMessage, // (threadId: string, messageId: string) => Promise<void>
  resolveThread, // (threadId: string) => Promise<void>
  reopenThread, // (threadId: string) => Promise<void>
  deleteThread, // (threadId: string) => Promise<void>
  addReaction, // (messageId: string, emoji: string) => Promise<void>
  removeReaction, // (messageId: string, emoji: string) => Promise<void>
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
