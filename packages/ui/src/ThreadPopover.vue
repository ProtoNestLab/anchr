<script setup lang="ts">
import { computed, nextTick, ref, toRef } from 'vue'
import { useFloating, offset, flip, shift } from '@floating-ui/vue'
import type { Thread, Message, Attachment, User } from '@anchor-sdk/core'
import { useMentions } from '@anchor-sdk/vue'
import { renderMarkdown } from './markdown'
import MarkdownEditor from './MarkdownEditor.vue'
import VirtualList from './VirtualList.vue'

const props = withDefaults(
  defineProps<{
    threads: Thread[]
    referenceEl: HTMLElement | null
    currentUserId?: string
    loading?: boolean
    error?: string
    /** Users available for @mention autocomplete. */
    mentionUsers?: User[]
    /** Upload handler. If provided, enables the attachment button. */
    uploadAttachment?: (file: File) => Promise<Attachment | undefined>
    /** Render messages in a virtualized list. Default: auto (true when total messages exceed threshold). */
    virtualize?: boolean
    /** Minimum total message count to auto-virtualize. Default: 50. */
    virtualizeThreshold?: number
  }>(),
  {
    currentUserId: undefined,
    loading: false,
    error: undefined,
    mentionUsers: () => [],
    uploadAttachment: undefined,
    virtualize: undefined,
    virtualizeThreshold: 50,
  },
)

const emit = defineEmits<{
  send: [content: string, options?: { attachments?: Attachment[] }]
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
const editorRef = ref<{ focus: () => void; textarea: HTMLTextAreaElement | null } | null>(null)
const editingId = ref<string | null>(null)
const editContent = ref('')
const reactionPickerFor = ref<string | null>(null)
const pendingAttachments = ref<Attachment[]>([])
const uploadingCount = ref(0)
const fileInputEl = ref<HTMLInputElement | null>(null)
const composerEditorRef = ref<HTMLDivElement | null>(null)

const threadMentionStyle = computed(() => {
  if (!composerEditorRef.value) return {}
  const rect = composerEditorRef.value.getBoundingClientRect()
  return {
    position: 'fixed' as const,
    left: `${rect.left}px`,
    bottom: `${window.innerHeight - rect.top + 4}px`,
    width: `${rect.width}px`,
    zIndex: '100000',
  }
})

const reference = toRef(props, 'referenceEl')

const { floatingStyles } = useFloating(reference, floating, {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({ padding: 8 })],
})

const quickEmojis = ['👍', '👎', '❤️', '😄', '🎉', '😕']

const totalMessages = computed(() => props.threads.reduce((sum, t) => sum + t.messages.length, 0))
const shouldVirtualize = computed(() => {
  if (props.virtualize !== undefined) return props.virtualize
  return totalMessages.value >= props.virtualizeThreshold
})

// Flattened render rows for virtualization: one row per thread or message
type Row =
  | { kind: 'thread-start'; thread: Thread; key: string }
  | { kind: 'message'; thread: Thread; message: Message; key: string }
  | { kind: 'thread-end'; thread: Thread; key: string }

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const t of props.threads) {
    out.push({ kind: 'thread-start', thread: t, key: `ts-${t.id}` })
    for (const m of t.messages) {
      out.push({ kind: 'message', thread: t, message: m, key: `m-${m.id}` })
    }
    out.push({ kind: 'thread-end', thread: t, key: `te-${t.id}` })
  }
  return out
})

// --- Mentions ---

const mentions = useMentions({
  text: input,
  resolveUsers: () => props.mentionUsers,
  filter: (u) => u.id !== props.currentUserId,
})

async function onEditorInput() {
  const ta = editorRef.value?.textarea
  if (!ta) return
  const cursor = ta.selectionStart ?? 0
  await mentions.onInput(cursor)
}

function applyMention(user?: User) {
  const ta = editorRef.value?.textarea
  if (!ta) return
  const cursor = ta.selectionStart ?? 0
  const result = mentions.select(cursor, user)
  if (result) {
    input.value = result.text
    nextTick(() => {
      ta.focus()
      ta.setSelectionRange(result.cursor, result.cursor)
    })
  }
}

function onEditorKeydown(e: KeyboardEvent) {
  if (mentions.active.value && mentions.suggestions.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentions.moveDown()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentions.moveUp()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      mentions.close()
      return
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) {
      e.preventDefault()
      applyMention()
      return
    }
  }
  if (e.key === 'Enter' && !e.shiftKey && !(e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    send()
    return
  }
  if (e.key === 'Escape') {
    emit('close')
  }
}

// --- Attachments ---

function openFilePicker() {
  fileInputEl.value?.click()
}

async function onFilesSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  target.value = ''
  if (!files.length || !props.uploadAttachment) return
  for (const file of files) {
    uploadingCount.value++
    try {
      const att = await props.uploadAttachment(file)
      if (att) pendingAttachments.value = [...pendingAttachments.value, att]
    } finally {
      uploadingCount.value--
    }
  }
}

function removePending(id: string) {
  pendingAttachments.value = pendingAttachments.value.filter((a) => a.id !== id)
}

function isImage(att: Attachment) {
  return att.mimeType.startsWith('image/')
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// --- Send / edit ---

function send() {
  const text = input.value.trim()
  if (!text && !pendingAttachments.value.length) return
  const options = pendingAttachments.value.length
    ? { attachments: pendingAttachments.value }
    : undefined
  emit('send', text, options)
  input.value = ''
  pendingAttachments.value = []
  mentions.close()
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
  if (text) emit('editMessage', messageId, text)
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
  if (hasReacted) emit('removeReaction', messageId, emoji)
  else emit('addReaction', messageId, emoji)
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

function onBackdropKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (editingId.value) cancelEdit()
    else emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="anchor-popover-backdrop"
      role="presentation"
      @click.self="emit('close')"
      @keydown="onBackdropKey"
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

        <div class="anchor-thread-list" :class="{ 'is-virtualized': shouldVirtualize }">
          <div v-if="error" class="anchor-error" role="alert">
            <span class="anchor-error-icon">⚠</span>
            {{ error }}
          </div>
          <div v-if="loading" class="anchor-loading" aria-live="polite">Loading…</div>
          <p v-if="!loading && !error && threads.length === 0" class="anchor-empty">
            No comments yet. Start the conversation!
          </p>

          <!-- Virtualized rendering -->
          <VirtualList
            v-if="shouldVirtualize && threads.length > 0"
            :items="rows"
            :get-key="(row: Row) => row.key"
            :estimated-height="72"
            class="anchor-vlist-host"
          >
            <template #default="{ item }">
              <template v-if="item.kind === 'thread-start'">
                <div
                  class="anchor-thread-block anchor-virt-thread-open"
                  :class="{ 'anchor-resolved': item.thread.resolved }"
                >
                  <div class="anchor-thread-actions" role="toolbar" aria-label="Thread actions">
                    <button
                      v-if="!item.thread.resolved"
                      class="anchor-action-btn"
                      title="Resolve"
                      aria-label="Resolve thread"
                      @click="emit('resolve', item.thread.id)"
                    >
                      ✓
                    </button>
                    <button
                      v-else
                      class="anchor-action-btn"
                      title="Reopen"
                      aria-label="Reopen thread"
                      @click="emit('reopen', item.thread.id)"
                    >
                      ↺
                    </button>
                    <button
                      class="anchor-action-btn anchor-danger"
                      title="Delete thread"
                      aria-label="Delete thread"
                      @click="emit('deleteThread', item.thread.id)"
                    >
                      🗑
                    </button>
                  </div>
                  <div v-if="item.thread.resolved" class="anchor-resolved-badge">Resolved</div>
                </div>
              </template>
              <template v-else-if="item.kind === 'message'">
                <div
                  class="anchor-virt-msg-wrapper"
                  :class="{ 'anchor-resolved': item.thread.resolved }"
                >
                  <div class="anchor-message">
                    <div class="anchor-message-header">
                      <strong>{{ item.message.user.name }}</strong>
                      <span class="anchor-time">{{ formatTime(item.message.createdAt) }}</span>
                      <span v-if="item.message.updatedAt" class="anchor-edited">(edited)</span>
                    </div>

                    <div
                      v-if="editingId === item.message.id"
                      class="anchor-edit-row"
                      role="form"
                      aria-label="Edit message"
                    >
                      <input
                        v-model="editContent"
                        class="anchor-edit-input edit-input"
                        aria-label="Edit message content"
                        @keydown.enter="confirmEdit(item.message.id)"
                        @keydown.escape="cancelEdit"
                      />
                      <button
                        class="anchor-action-btn"
                        aria-label="Save edit"
                        @click="confirmEdit(item.message.id)"
                      >
                        ✓
                      </button>
                      <button
                        class="anchor-action-btn"
                        aria-label="Cancel edit"
                        @click="cancelEdit"
                      >
                        ✕
                      </button>
                    </div>
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <p
                      v-else
                      class="anchor-message-body"
                      v-html="renderMarkdown(item.message.content)"
                    />

                    <div
                      v-if="item.message.attachments && item.message.attachments.length"
                      class="anchor-attachments"
                    >
                      <template v-for="att in item.message.attachments" :key="att.id">
                        <a
                          v-if="isImage(att)"
                          :href="att.url"
                          target="_blank"
                          rel="noopener"
                          class="anchor-attachment-image"
                        >
                          <img :src="att.url" :alt="att.name" loading="lazy" />
                        </a>
                        <a
                          v-else
                          :href="att.url"
                          target="_blank"
                          rel="noopener"
                          class="anchor-attachment-file"
                        >
                          <span class="anchor-attachment-icon">📎</span>
                          <span class="anchor-attachment-name">{{ att.name }}</span>
                          <span class="anchor-attachment-size">{{ formatBytes(att.size) }}</span>
                        </a>
                      </template>
                    </div>

                    <div v-if="item.message.reactions.length > 0" class="anchor-reactions">
                      <button
                        v-for="r in groupReactions(item.message.reactions)"
                        :key="r.emoji"
                        class="anchor-reaction-badge"
                        :class="{ 'anchor-reaction-active': r.active }"
                        @click="handleReaction(item.message.id, r.emoji, item.message.reactions)"
                      >
                        {{ r.emoji }} {{ r.count }}
                      </button>
                    </div>

                    <div class="anchor-message-actions" role="toolbar" aria-label="Message actions">
                      <button
                        class="anchor-msg-action-btn"
                        title="React"
                        aria-label="Add reaction"
                        :aria-expanded="reactionPickerFor === item.message.id"
                        @click="toggleReactionPicker(item.message.id)"
                      >
                        😀
                      </button>
                      <button
                        v-if="item.message.user.id === currentUserId"
                        class="anchor-msg-action-btn"
                        title="Edit"
                        aria-label="Edit message"
                        @click="startEdit(item.message)"
                      >
                        ✏️
                      </button>
                      <button
                        v-if="item.message.user.id === currentUserId"
                        class="anchor-msg-action-btn"
                        title="Delete"
                        aria-label="Delete message"
                        @click="emit('deleteMessage', item.thread.id, item.message.id)"
                      >
                        🗑
                      </button>
                    </div>

                    <div
                      v-if="reactionPickerFor === item.message.id"
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
                        @click="handleReaction(item.message.id, emoji, item.message.reactions)"
                      >
                        {{ emoji }}
                      </button>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="anchor-virt-thread-close" />
              </template>
            </template>
          </VirtualList>

          <!-- Standard rendering -->
          <template v-else>
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

                  <div v-if="msg.attachments && msg.attachments.length" class="anchor-attachments">
                    <template v-for="att in msg.attachments" :key="att.id">
                      <a
                        v-if="isImage(att)"
                        :href="att.url"
                        target="_blank"
                        rel="noopener"
                        class="anchor-attachment-image"
                      >
                        <img :src="att.url" :alt="att.name" loading="lazy" />
                      </a>
                      <a
                        v-else
                        :href="att.url"
                        target="_blank"
                        rel="noopener"
                        class="anchor-attachment-file"
                      >
                        <span class="anchor-attachment-icon">📎</span>
                        <span class="anchor-attachment-name">{{ att.name }}</span>
                        <span class="anchor-attachment-size">{{ formatBytes(att.size) }}</span>
                      </a>
                    </template>
                  </div>

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
          </template>
        </div>

        <form aria-label="New comment" class="anchor-composer" @submit.prevent="send">
          <div ref="composerEditorRef" class="anchor-composer-editor">
            <MarkdownEditor
              ref="editorRef"
              v-model="input"
              aria-label="Comment text"
              placeholder="Write a comment… (markdown supported, @mention, ⌘B/⌘I)"
              @input="onEditorInput"
              @keydown="onEditorKeydown"
            />
            <Teleport to="body">
              <Transition name="dropdown">
                <div
                  v-if="mentions.active.value && mentions.suggestions.value.length"
                  class="anchor-mention-popover"
                  role="listbox"
                  aria-label="Mention user"
                  :style="threadMentionStyle"
                >
                  <button
                    v-for="(u, i) in mentions.suggestions.value"
                    :key="u.id"
                    type="button"
                    class="anchor-mention-item"
                    role="option"
                    :aria-selected="i === mentions.selectedIndex.value"
                    :class="{ 'is-active': i === mentions.selectedIndex.value }"
                    @mousedown.prevent="applyMention(u)"
                    @mouseenter="mentions.selectedIndex.value = i"
                  >
                    <span class="anchor-mention-name">{{ u.name }}</span>
                    <span class="anchor-mention-id">{{ u.id }}</span>
                  </button>
                </div>
              </Transition>
            </Teleport>
          </div>

          <div
            v-if="pendingAttachments.length || uploadingCount > 0"
            class="anchor-pending-attachments"
          >
            <div v-for="att in pendingAttachments" :key="att.id" class="anchor-pending-chip">
              <img
                v-if="isImage(att)"
                :src="att.url"
                :alt="att.name"
                class="anchor-pending-thumb"
              />
              <span v-else class="anchor-attachment-icon">📎</span>
              <span class="anchor-pending-name">{{ att.name }}</span>
              <button
                type="button"
                class="anchor-pending-remove"
                :aria-label="`Remove ${att.name}`"
                @click="removePending(att.id)"
              >
                ✕
              </button>
            </div>
            <span v-if="uploadingCount > 0" class="anchor-pending-uploading" aria-live="polite">
              Uploading {{ uploadingCount }}…
            </span>
          </div>

          <div class="anchor-composer-bar">
            <button
              v-if="uploadAttachment !== undefined"
              type="button"
              class="anchor-attach-btn"
              aria-label="Attach file"
              title="Attach file"
              @click="openFilePicker"
            >
              📎
            </button>
            <input ref="fileInputEl" type="file" multiple hidden @change="onFilesSelected" />
            <span class="anchor-composer-hint">Enter to send · Shift+Enter for newline</span>
            <button
              type="submit"
              class="anchor-send-btn"
              :disabled="!input.trim() && pendingAttachments.length === 0"
            >
              Send
            </button>
          </div>
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
  width: 400px;
  max-height: 520px;
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
  min-height: 0;
}
.anchor-thread-list.is-virtualized {
  overflow: hidden;
  padding: 0;
}
.anchor-vlist-host {
  height: 100%;
  padding: 8px 12px;
  box-sizing: border-box;
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
.anchor-virt-thread-open {
  border-bottom: none;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  margin-bottom: 0;
  min-height: 12px;
}
.anchor-virt-thread-close {
  margin-bottom: 12px;
  border-bottom: 1px solid var(--anchor-border, #eee);
  border-left: 1px solid var(--anchor-border, #eee);
  border-right: 1px solid var(--anchor-border, #eee);
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  height: 6px;
}
.anchor-virt-msg-wrapper {
  border-left: 1px solid var(--anchor-border, #eee);
  border-right: 1px solid var(--anchor-border, #eee);
  padding: 2px 8px;
}
.anchor-virt-msg-wrapper.anchor-resolved {
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
  z-index: 1000;
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

/* Attachments in messages */
.anchor-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.anchor-attachment-image {
  display: inline-block;
  max-width: 180px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--anchor-border, #ddd);
}
.anchor-attachment-image img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 180px;
  object-fit: cover;
}
.anchor-attachment-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--anchor-border, #ddd);
  border-radius: 6px;
  background: var(--anchor-bg, #fff);
  font-size: 12px;
  color: var(--anchor-text, #333);
  text-decoration: none;
  max-width: 220px;
}
.anchor-attachment-file:hover {
  background: var(--anchor-hover, #f0f0f0);
}
.anchor-attachment-icon {
  flex-shrink: 0;
}
.anchor-attachment-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.anchor-attachment-size {
  color: var(--anchor-text-muted, #999);
  font-size: 11px;
  flex-shrink: 0;
}

/* Composer */
.anchor-composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid var(--anchor-border, #eee);
}
.anchor-composer-editor {
  position: relative;
}
.anchor-mention-popover {
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
  background: var(--anchor-bg, #fff);
  border: 1px solid var(--anchor-border, #ddd);
  border-radius: 6px;
  box-shadow: 0 4px 12px var(--anchor-shadow, rgba(0, 0, 0, 0.08));
}
.anchor-mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 8px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--anchor-text, #333);
  text-align: left;
}
.anchor-mention-item.is-active,
.anchor-mention-item:hover {
  background: var(--anchor-hover, #f0f0f0);
}
.anchor-mention-name {
  font-weight: 500;
}
.anchor-mention-id {
  margin-left: auto;
  font-size: 11px;
  color: var(--anchor-text-muted, #999);
  font-family: ui-monospace, monospace;
}

/* Pending attachments */
.anchor-pending-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.anchor-pending-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 2px 4px;
  border: 1px solid var(--anchor-border, #ddd);
  border-radius: 14px;
  background: var(--anchor-bg, #fff);
  font-size: 12px;
  max-width: 180px;
}
.anchor-pending-thumb {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  object-fit: cover;
}
.anchor-pending-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.anchor-pending-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--anchor-text-muted, #999);
  font-size: 11px;
  padding: 0 2px;
}
.anchor-pending-remove:hover {
  color: var(--anchor-error-text, #dc2626);
}
.anchor-pending-uploading {
  font-size: 11px;
  color: var(--anchor-text-muted, #999);
  font-style: italic;
}

.anchor-composer-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.anchor-composer-hint {
  flex: 1;
  font-size: 11px;
  color: var(--anchor-text-muted, #999);
  line-height: 1.3;
}
.anchor-attach-btn {
  background: none;
  border: 1px solid var(--anchor-border, #ddd);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 13px;
}
.anchor-attach-btn:hover {
  background: var(--anchor-hover, #f0f0f0);
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
.anchor-send-btn:hover:not(:disabled) {
  background: var(--anchor-primary-hover, #3a7bc8);
}
.anchor-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
