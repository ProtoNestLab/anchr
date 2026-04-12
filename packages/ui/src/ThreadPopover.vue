<script setup lang="ts">
import { ref, toRef, nextTick } from 'vue'
import { useFloating, offset, flip, shift } from '@floating-ui/vue'
import type { Thread, Message } from '@anchor-sdk/core'
import { renderMarkdown } from './markdown'

const props = defineProps<{
  threads: Thread[]
  referenceEl: HTMLElement | null
  currentUserId?: string
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  send: [content: string]
  close: []
  resolve: [threadId: string]
  reopen: [threadId: string]
  deleteThread: [threadId: string]
  editMessage: [messageId: string, content: string]
  deleteMessage: [threadId: string, messageId: string]
  addReaction: [messageId: string, emoji: string]
  removeReaction: [messageId: string, emoji: string]
}>()

const floating = ref<HTMLElement | null>(null)
const input = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const editingId = ref<string | null>(null)
const editContent = ref('')
const reactionPickerFor = ref<string | null>(null)

const reference = toRef(props, 'referenceEl')

const { floatingStyles } = useFloating(reference, floating, {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({ padding: 8 })],
})

const quickEmojis = ['👍', '👎', '❤️', '😄', '🎉', '😕']

function send() {
  const text = input.value.trim()
  if (!text) return
  emit('send', text)
  input.value = ''
}

function startEdit(msg: Message) {
  editingId.value = msg.id
  editContent.value = msg.content
  nextTick(() => {
    const el = document.querySelector('.edit-input') as HTMLInputElement
    el?.focus()
  })
}

function confirmEdit(messageId: string) {
  const text = editContent.value.trim()
  if (text && text !== '') {
    emit('editMessage', messageId, text)
  }
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

function toggleReactionPicker(messageId: string) {
  reactionPickerFor.value = reactionPickerFor.value === messageId ? null : messageId
}

function handleReaction(
  messageId: string,
  emoji: string,
  reactions: { emoji: string; userId: string }[],
) {
  const hasReacted = reactions.some((r) => r.emoji === emoji && r.userId === props.currentUserId)
  if (hasReacted) {
    emit('removeReaction', messageId, emoji)
  } else {
    emit('addReaction', messageId, emoji)
  }
  reactionPickerFor.value = null
}

function groupReactions(reactions: { emoji: string; userId: string }[]) {
  const map = new Map<string, string[]>()
  for (const r of reactions) {
    if (!map.has(r.emoji)) map.set(r.emoji, [])
    map.get(r.emoji)!.push(r.userId)
  }
  return Array.from(map.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    active: userIds.includes(props.currentUserId ?? ''),
  }))
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (editingId.value) {
      cancelEdit()
    } else {
      emit('close')
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="anchor-popover-backdrop"
      role="presentation"
      @click.self="emit('close')"
      @keydown="onKeydown"
    >
      <div
        ref="floating"
        :style="floatingStyles"
        class="anchor-thread-popover"
        role="dialog"
        aria-label="Discussion thread"
        tabindex="-1"
      >
        <div class="anchor-popover-header">
          <span id="anchor-dialog-title">Discussion</span>
          <button class="anchor-close-btn" aria-label="Close discussion" @click="emit('close')">
            ✕
          </button>
        </div>

        <div class="anchor-thread-list">
          <div v-if="error" class="anchor-error" role="alert">
            <span class="anchor-error-icon">⚠</span>
            {{ error }}
          </div>
          <div v-if="loading" class="anchor-loading" aria-live="polite">Loading…</div>
          <template v-if="!loading && !error && threads.length === 0">
            <p class="anchor-empty">No comments yet. Start the conversation!</p>
          </template>
          <template v-for="thread in threads" :key="thread.id">
            <div class="anchor-thread-block" :class="{ 'anchor-resolved': thread.resolved }">
              <div class="anchor-thread-actions" role="toolbar" aria-label="Thread actions">
                <button
                  v-if="!thread.resolved"
                  class="anchor-action-btn"
                  title="Resolve"
                  aria-label="Resolve thread"
                  @click="emit('resolve', thread.id)"
                >
                  ✓
                </button>
                <button
                  v-else
                  class="anchor-action-btn"
                  title="Reopen"
                  aria-label="Reopen thread"
                  @click="emit('reopen', thread.id)"
                >
                  ↺
                </button>
                <button
                  class="anchor-action-btn anchor-danger"
                  title="Delete thread"
                  aria-label="Delete thread"
                  @click="emit('deleteThread', thread.id)"
                >
                  🗑
                </button>
              </div>
              <div v-if="thread.resolved" class="anchor-resolved-badge">Resolved</div>

              <div v-for="msg in thread.messages" :key="msg.id" class="anchor-message">
                <div class="anchor-message-header">
                  <strong>{{ msg.user.name }}</strong>
                  <span class="anchor-time">{{ formatTime(msg.createdAt) }}</span>
                  <span v-if="msg.updatedAt" class="anchor-edited">(edited)</span>
                </div>

                <div
                  v-if="editingId === msg.id"
                  class="anchor-edit-row"
                  role="form"
                  aria-label="Edit message"
                >
                  <input
                    v-model="editContent"
                    class="anchor-edit-input edit-input"
                    aria-label="Edit message content"
                    @keydown.enter="confirmEdit(msg.id)"
                    @keydown.escape="cancelEdit"
                  />
                  <button
                    class="anchor-action-btn"
                    aria-label="Save edit"
                    @click="confirmEdit(msg.id)"
                  >
                    ✓
                  </button>
                  <button class="anchor-action-btn" aria-label="Cancel edit" @click="cancelEdit">
                    ✕
                  </button>
                </div>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <p v-else class="anchor-message-body" v-html="renderMarkdown(msg.content)" />

                <!-- Reactions display -->
                <div v-if="msg.reactions.length > 0" class="anchor-reactions">
                  <button
                    v-for="r in groupReactions(msg.reactions)"
                    :key="r.emoji"
                    class="anchor-reaction-badge"
                    :class="{ 'anchor-reaction-active': r.active }"
                    @click="handleReaction(msg.id, r.emoji, msg.reactions)"
                  >
                    {{ r.emoji }} {{ r.count }}
                  </button>
                </div>

                <!-- Message actions -->
                <div class="anchor-message-actions" role="toolbar" aria-label="Message actions">
                  <button
                    class="anchor-msg-action-btn"
                    title="React"
                    aria-label="Add reaction"
                    :aria-expanded="reactionPickerFor === msg.id"
                    @click="toggleReactionPicker(msg.id)"
                  >
                    😀
                  </button>
                  <button
                    v-if="msg.user.id === currentUserId"
                    class="anchor-msg-action-btn"
                    title="Edit"
                    aria-label="Edit message"
                    @click="startEdit(msg)"
                  >
                    ✏️
                  </button>
                  <button
                    v-if="msg.user.id === currentUserId"
                    class="anchor-msg-action-btn"
                    title="Delete"
                    aria-label="Delete message"
                    @click="emit('deleteMessage', thread.id, msg.id)"
                  >
                    🗑
                  </button>
                </div>

                <!-- Reaction picker -->
                <div
                  v-if="reactionPickerFor === msg.id"
                  class="anchor-reaction-picker"
                  role="listbox"
                  aria-label="Choose a reaction"
                >
                  <button
                    v-for="emoji in quickEmojis"
                    :key="emoji"
                    class="anchor-emoji-btn"
                    role="option"
                    :aria-label="`React with ${emoji}`"
                    @click="handleReaction(msg.id, emoji, msg.reactions)"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <form aria-label="New comment" class="anchor-input-row" @submit.prevent="send">
          <input
            ref="inputEl"
            v-model="input"
            placeholder="Write a comment…"
            class="anchor-comment-input"
            aria-label="Comment text"
            @keydown.escape="emit('close')"
          />
          <button type="submit" class="anchor-send-btn" :disabled="!input.trim()">Send</button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.anchor-popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
}
.anchor-thread-popover {
  width: 360px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  background: var(--anchor-bg, #fff);
  border: 1px solid var(--anchor-border, #ddd);
  border-radius: 8px;
  box-shadow: 0 4px 16px var(--anchor-shadow, rgba(0, 0, 0, 0.12));
  font-size: 14px;
  color: var(--anchor-text, #333);
  z-index: 1001;
}
.anchor-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--anchor-border, #eee);
  font-weight: 600;
}
.anchor-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--anchor-text-muted, #888);
}
.anchor-thread-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}
.anchor-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: var(--anchor-error-bg, #fef2f2);
  color: var(--anchor-error-text, #dc2626);
  border: 1px solid var(--anchor-error-border, #fecaca);
  border-radius: 6px;
  font-size: 13px;
}
.anchor-error-icon {
  flex-shrink: 0;
}
.anchor-loading {
  text-align: center;
  color: var(--anchor-text-muted, #999);
  padding: 16px 0;
  font-size: 13px;
}
.anchor-empty {
  color: var(--anchor-text-muted, #999);
  text-align: center;
  margin: 16px 0;
}
.anchor-thread-block {
  position: relative;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--anchor-border, #eee);
}
.anchor-thread-block.anchor-resolved {
  opacity: 0.7;
}
.anchor-thread-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.anchor-thread-block:hover .anchor-thread-actions {
  opacity: 1;
}
.anchor-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  color: var(--anchor-text-muted, #888);
}
.anchor-action-btn:hover {
  background: var(--anchor-hover, #f0f0f0);
}
.anchor-action-btn.anchor-danger:hover {
  background: #fee;
  color: #c00;
}
.anchor-resolved-badge {
  font-size: 11px;
  color: var(--anchor-success, #28a745);
  font-weight: 600;
  margin-bottom: 4px;
}
.anchor-message {
  margin-bottom: 8px;
}
.anchor-message:last-child {
  margin-bottom: 0;
}
.anchor-message-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.anchor-time {
  font-size: 11px;
  color: var(--anchor-text-muted, #999);
}
.anchor-edited {
  font-size: 11px;
  color: var(--anchor-text-muted, #999);
  font-style: italic;
}
.anchor-message-body {
  margin: 2px 0 0;
  line-height: 1.4;
}
.anchor-message-actions {
  display: flex;
  gap: 2px;
  margin-top: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.anchor-message:hover .anchor-message-actions {
  opacity: 1;
}
.anchor-msg-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 1px 4px;
  border-radius: 4px;
}
.anchor-msg-action-btn:hover {
  background: var(--anchor-hover, #f0f0f0);
}
.anchor-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.anchor-reaction-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px;
  border: 1px solid var(--anchor-border, #ddd);
  border-radius: 12px;
  background: var(--anchor-bg, #fff);
  cursor: pointer;
  font-size: 12px;
}
.anchor-reaction-badge:hover {
  background: var(--anchor-hover, #f0f0f0);
}
.anchor-reaction-badge.anchor-reaction-active {
  border-color: var(--anchor-primary, #4a90d9);
  background: var(--anchor-primary-light, #e8f0fe);
}
.anchor-reaction-picker {
  display: flex;
  gap: 2px;
  margin-top: 4px;
  padding: 4px;
  border: 1px solid var(--anchor-border, #ddd);
  border-radius: 6px;
  background: var(--anchor-bg, #fff);
  box-shadow: 0 2px 8px var(--anchor-shadow, rgba(0, 0, 0, 0.08));
}
.anchor-emoji-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 4px;
  border-radius: 4px;
}
.anchor-emoji-btn:hover {
  background: var(--anchor-hover, #f0f0f0);
}
.anchor-edit-row {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.anchor-edit-input {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid var(--anchor-primary, #4a90d9);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}
.anchor-input-row {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid var(--anchor-border, #eee);
}
.anchor-comment-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--anchor-border, #ddd);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background: var(--anchor-bg, #fff);
  color: var(--anchor-text, #333);
}
.anchor-comment-input:focus {
  border-color: var(--anchor-primary, #4a90d9);
}
.anchor-send-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: var(--anchor-primary, #4a90d9);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}
.anchor-send-btn:hover {
  background: var(--anchor-primary-hover, #3a7bc8);
}
</style>
