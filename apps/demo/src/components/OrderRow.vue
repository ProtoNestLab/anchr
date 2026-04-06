<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useAnchor } from '@anchor-sdk/vue'
import type { Message, User } from '@anchor-sdk/core'
import { listUsers } from '../api/users'

const props = defineProps<{
  anchorId: string
}>()

const {
  threads,
  open,
  messageCount,
  unreadCount,
  currentUser,
  send: postToAnchor,
  hide,
  markAsRead,
  refresh,
  editMessage,
  deleteMessage,
  resolveThread,
  reopenThread,
  deleteThread,
  addReaction,
  removeReaction,
} = useAnchor(props.anchorId)

const threadCount = computed(() => threads.value.length)
const totalMessages = computed(() => threads.value.reduce((n, t) => n + t.messages.length, 0))

function avatarStyle(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  const hue = Math.abs(h) % 360
  return {
    background: `linear-gradient(145deg, hsl(${hue}, 48%, 44%), hsl(${(hue + 40) % 360}, 52%, 36%))`,
  }
}

const input = ref('')
const composerInputRef = ref<{ textarea?: HTMLTextAreaElement } | null>(null)
const usersCache = ref<User[] | null>(null)
const mentionActive = ref(false)
const mentionLoading = ref(false)
const mentionUsers = ref<User[]>([])
const mentionSelectedIndex = ref(0)

const editingId = ref<string | null>(null)
const editContent = ref('')
const reactionPickerFor = ref<string | null>(null)

const quickEmojis = ['👍', '👎', '❤️', '😄', '🎉', '😕']

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

async function onPopoverShow() {
  await refresh()
  markAsRead()
}

function onPopoverHide() {
  hide()
}

async function submitSend() {
  mentionActive.value = false
  const text = input.value.trim()
  if (!text) return
  await postToAnchor(text)
  input.value = ''
}

function getTextarea(): HTMLTextAreaElement | null {
  return composerInputRef.value?.textarea ?? null
}

/** `@query` before cursor; query has no whitespace. */
function getMentionState(text: string, cursor: number) {
  const before = text.slice(0, cursor)
  const at = before.lastIndexOf('@')
  if (at === -1) return null
  if (at > 0 && !/\s/.test(before[at - 1]!)) return null
  const afterAt = before.slice(at + 1)
  if (/\s/.test(afterAt)) return null
  return { start: at, query: afterAt }
}

async function ensureUsersLoaded() {
  if (usersCache.value) return
  mentionLoading.value = true
  try {
    usersCache.value = await listUsers()
  } finally {
    mentionLoading.value = false
  }
}

async function onComposerInput() {
  const ta = getTextarea()
  if (!ta) return
  const cursor = ta.selectionStart ?? 0
  const state = getMentionState(input.value, cursor)
  if (!state) {
    mentionActive.value = false
    return
  }
  await ensureUsersLoaded()
  const q = state.query.toLowerCase()
  const list = usersCache.value ?? []
  mentionUsers.value = list.filter(
    (u) =>
      u.id !== currentUser.id &&
      (q === '' || u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)),
  )
  mentionActive.value = true
  if (mentionSelectedIndex.value >= mentionUsers.value.length) mentionSelectedIndex.value = 0
}

watch(mentionUsers, (list) => {
  if (mentionSelectedIndex.value >= list.length) mentionSelectedIndex.value = 0
})

function applyMention(user?: User) {
  const pick = user ?? mentionUsers.value[mentionSelectedIndex.value]
  if (!pick) return
  const ta = getTextarea()
  if (!ta) return
  const cursor = ta.selectionStart ?? 0
  const state = getMentionState(input.value, cursor)
  if (!state) return
  const before = input.value.slice(0, state.start)
  const after = input.value.slice(cursor)
  const insert = `@${pick.name} `
  input.value = before + insert + after
  mentionActive.value = false
  nextTick(() => {
    const pos = before.length + insert.length
    ta.focus()
    ta.setSelectionRange(pos, pos)
  })
}

function onComposerKeydown(e: KeyboardEvent) {
  if (mentionActive.value && mentionUsers.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionSelectedIndex.value = (mentionSelectedIndex.value + 1) % mentionUsers.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionSelectedIndex.value =
        (mentionSelectedIndex.value - 1 + mentionUsers.value.length) % mentionUsers.value.length
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      mentionActive.value = false
      return
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) {
      e.preventDefault()
      applyMention()
      return
    }
  }
  if (e.key !== 'Enter') return
  if (e.shiftKey) return
  e.preventDefault()
  void submitSend()
}

function startEdit(msg: Message) {
  editingId.value = msg.id
  editContent.value = msg.content
  nextTick(() => {
    document.querySelector<HTMLInputElement>('.slack-edit-input')?.focus()
  })
}

async function confirmEdit(messageId: string) {
  const text = editContent.value.trim()
  if (text) await editMessage(messageId, text)
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

function canReactTo(msg: Message) {
  return msg.user.id !== currentUser.id
}

function toggleReactionPicker(messageId: string, msg: Message) {
  if (!canReactTo(msg)) return
  reactionPickerFor.value = reactionPickerFor.value === messageId ? null : messageId
}

function handleReaction(
  messageId: string,
  emoji: string,
  reactions: { emoji: string; userId: string }[],
  messageAuthorId: string,
) {
  if (messageAuthorId === currentUser.id) return
  const hasReacted = reactions.some((r) => r.emoji === emoji && r.userId === currentUser.id)
  if (hasReacted) void removeReaction(messageId, emoji)
  else void addReaction(messageId, emoji)
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
    active: userIds.includes(currentUser.id),
  }))
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function confirmDeleteThread(threadId: string) {
  try {
    await ElMessageBox.confirm('Delete this thread?', 'Confirm', { type: 'warning' })
    await deleteThread(threadId)
  } catch {
    /* cancelled */
  }
}

async function confirmDeleteMessage(threadId: string, messageId: string) {
  try {
    await ElMessageBox.confirm('Delete this message?', 'Confirm', { type: 'warning' })
    await deleteMessage(threadId, messageId)
  } catch {
    /* cancelled */
  }
}

async function onThreadMenuCommand(threadId: string, cmd: string) {
  if (cmd === 'resolve') await resolveThread(threadId)
  else if (cmd === 'reopen') await reopenThread(threadId)
  else if (cmd === 'delete') await confirmDeleteThread(threadId)
}
</script>

<template>
  <div class="order-discussion-cell">
    <el-popover
      v-model:visible="open"
      trigger="click"
      placement="bottom-start"
      :width="448"
      :show-arrow="false"
      :offset="8"
      popper-class="slack-thread-popper"
      teleported
      @show="onPopoverShow"
      @hide="onPopoverHide"
    >
      <template #reference>
        <el-badge :value="messageCount" :hidden="messageCount === 0" class="slack-trigger-badge">
          <el-button
            circle
            size="small"
            class="slack-trigger-btn"
            :class="{ 'is-active': messageCount > 0 }"
            title="Open thread"
          >
            <span class="slack-trigger-icon" aria-hidden="true">💬</span>
          </el-button>
        </el-badge>
      </template>

      <div class="slack-thread" role="dialog" aria-label="Thread">
        <header class="slack-thread-header">
          <div class="slack-thread-header-top">
            <h2 class="slack-thread-title">Thread</h2>
            <div class="slack-thread-badges">
              <el-tag v-if="totalMessages > 0" size="small" effect="plain" type="info">
                {{ totalMessages }} {{ totalMessages === 1 ? 'message' : 'messages' }}
              </el-tag>
              <el-tag v-if="threadCount > 0" size="small" effect="plain">
                {{ threadCount }} {{ threadCount === 1 ? 'topic' : 'topics' }}
              </el-tag>
              <el-tag v-if="unreadCount" size="small" type="danger" effect="light">
                {{ unreadCount }} new
              </el-tag>
            </div>
          </div>
          <p class="slack-thread-anchor" :title="props.anchorId">
            <span class="slack-thread-anchor-label">Anchor</span>
            <code class="slack-thread-anchor-code">{{ props.anchorId }}</code>
          </p>
        </header>

        <el-scrollbar max-height="380px" class="slack-thread-scroll">
          <div class="slack-thread-body">
            <el-empty v-if="threads.length === 0" :image-size="64" class="slack-empty">
              <template #description>
                <div class="slack-empty-desc">
                  <span class="slack-empty-title">No messages yet</span>
                  <p class="slack-empty-hint">Write a reply in the box below to start.</p>
                </div>
              </template>
            </el-empty>

            <section
              v-for="thread in threads"
              :key="thread.id"
              class="slack-thread-block"
              :class="{ 'is-resolved': thread.resolved }"
            >
              <div class="slack-thread-toolbar">
                <el-tag v-if="thread.resolved" size="small" type="success" effect="plain">
                  Resolved
                </el-tag>
                <span v-else class="slack-thread-toolbar-spacer" />
                <el-dropdown
                  trigger="click"
                  @command="(cmd: string) => onThreadMenuCommand(thread.id, cmd)"
                >
                  <el-button text size="small" class="slack-thread-menu" aria-label="Thread menu">
                    ⋯
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-if="!thread.resolved" command="resolve">
                        Resolve thread
                      </el-dropdown-item>
                      <el-dropdown-item v-else command="reopen">Reopen thread</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>Delete thread</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>

              <div class="slack-thread-messages">
                <article
                  v-for="msg in thread.messages"
                  :key="msg.id"
                  class="slack-msg"
                  :class="{ 'is-own': msg.user.id === currentUser.id }"
                >
                  <div
                    v-if="msg.user.id !== currentUser.id"
                    class="slack-avatar"
                    :style="avatarStyle(msg.user.name)"
                    :title="msg.user.name"
                  >
                    {{ initial(msg.user.name) }}
                  </div>
                  <div class="slack-msg-main">
                    <div class="slack-msg-head">
                      <span class="slack-msg-author">{{ msg.user.name }}</span>
                      <span class="slack-msg-meta">
                        <time class="slack-msg-time" :datetime="String(msg.createdAt)">{{
                          formatTime(msg.createdAt)
                        }}</time>
                        <span v-if="msg.updatedAt" class="slack-msg-edited"> · edited</span>
                      </span>
                    </div>

                    <div class="slack-msg-bubble">
                      <div v-if="editingId === msg.id" class="slack-msg-edit">
                        <el-input
                          v-model="editContent"
                          class="slack-edit-input"
                          size="small"
                          @keydown.enter.prevent="confirmEdit(msg.id)"
                          @keydown.escape="cancelEdit"
                        />
                        <div class="slack-msg-edit-actions">
                          <el-button size="small" type="primary" @click="confirmEdit(msg.id)">
                            Save
                          </el-button>
                          <el-button size="small" @click="cancelEdit">Cancel</el-button>
                        </div>
                      </div>
                      <p v-else class="slack-msg-text">{{ msg.content }}</p>
                    </div>

                    <div v-if="msg.reactions.length" class="slack-reactions">
                      <template v-for="r in groupReactions(msg.reactions)" :key="r.emoji">
                        <button
                          v-if="canReactTo(msg)"
                          type="button"
                          class="slack-reaction-pill"
                          :class="{ 'is-mine': r.active }"
                          @click="handleReaction(msg.id, r.emoji, msg.reactions, msg.user.id)"
                        >
                          <span>{{ r.emoji }}</span>
                          <span class="slack-reaction-count">{{ r.count }}</span>
                        </button>
                        <span
                          v-else
                          class="slack-reaction-pill slack-reaction-pill--readonly"
                          :title="'Reactions on your message'"
                        >
                          <span>{{ r.emoji }}</span>
                          <span class="slack-reaction-count">{{ r.count }}</span>
                        </span>
                      </template>
                    </div>

                    <div class="slack-msg-footer">
                      <el-button
                        v-if="canReactTo(msg)"
                        text
                        size="small"
                        @click="toggleReactionPicker(msg.id, msg)"
                      >
                        Add reaction
                      </el-button>
                      <template v-if="msg.user.id === currentUser.id">
                        <el-button text size="small" @click="startEdit(msg)">Edit</el-button>
                        <el-button
                          text
                          size="small"
                          type="danger"
                          @click="confirmDeleteMessage(thread.id, msg.id)"
                        >
                          Delete
                        </el-button>
                      </template>
                    </div>

                    <div
                      v-if="reactionPickerFor === msg.id && canReactTo(msg)"
                      class="slack-emoji-picker"
                    >
                      <button
                        v-for="emoji in quickEmojis"
                        :key="emoji"
                        type="button"
                        class="slack-emoji-btn"
                        @click="handleReaction(msg.id, emoji, msg.reactions, msg.user.id)"
                      >
                        {{ emoji }}
                      </button>
                    </div>
                  </div>
                  <div
                    v-if="msg.user.id === currentUser.id"
                    class="slack-avatar"
                    :style="avatarStyle(msg.user.name)"
                    :title="msg.user.name"
                  >
                    {{ initial(msg.user.name) }}
                  </div>
                </article>
              </div>
            </section>
          </div>
        </el-scrollbar>

        <footer class="slack-composer">
          <div class="slack-composer-input-wrap">
            <el-input
              ref="composerInputRef"
              v-model="input"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 8 }"
              :placeholder="unreadCount ? `Reply… (${unreadCount} new)` : 'Reply…'"
              resize="none"
              class="slack-composer-input"
              @input="onComposerInput"
              @keydown="onComposerKeydown"
            />
            <div
              v-if="mentionActive"
              class="mention-popover"
              role="listbox"
              :aria-label="'Mention user'"
            >
              <div v-if="mentionLoading" class="mention-loading">Loading users…</div>
              <template v-else-if="mentionUsers.length">
                <button
                  v-for="(u, i) in mentionUsers"
                  :key="u.id"
                  type="button"
                  class="mention-item"
                  :class="{ 'is-active': i === mentionSelectedIndex }"
                  role="option"
                  :aria-selected="i === mentionSelectedIndex"
                  @mousedown.prevent="applyMention(u)"
                  @mouseenter="mentionSelectedIndex = i"
                >
                  <span class="mention-avatar" :style="avatarStyle(u.name)">{{
                    initial(u.name)
                  }}</span>
                  <span class="mention-name">{{ u.name }}</span>
                  <span class="mention-id">{{ u.id }}</span>
                </button>
              </template>
              <div v-else class="mention-empty">No matching users</div>
            </div>
          </div>
          <div class="slack-composer-bar">
            <p class="slack-composer-hint">
              <kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> line · <kbd>@</kbd> mention
            </p>
            <el-button
              type="primary"
              class="slack-send"
              :disabled="!input.trim()"
              @click="submitSend"
            >
              Send
            </el-button>
          </div>
        </footer>
      </div>
    </el-popover>
  </div>
</template>

<style scoped>
.order-discussion-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 44px;
}

.slack-trigger-badge :deep(.el-badge__content) {
  transform: translate(45%, -35%);
  border: 2px solid var(--el-bg-color);
}

.slack-trigger-btn {
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-blank);
  transition:
    background 0.15s,
    border-color 0.15s;
}
.slack-trigger-btn:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-border-color-hover);
}
.slack-trigger-btn.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.slack-trigger-icon {
  font-size: 16px;
  line-height: 1;
}

/* Slack-like panel (popover content — see global for popper shell) */
.slack-thread {
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: 15px;
  line-height: 1.466;
  color: var(--el-text-color-primary, #1d1c1d);
}

.slack-thread-header {
  flex-shrink: 0;
  padding: 12px 16px 14px;
  background: linear-gradient(180deg, #fafafa 0%, #f3f3f3 100%);
  border-bottom: 1px solid var(--el-border-color-lighter, #e8e8e8);
  border-radius: 10px 10px 0 0;
}

.slack-thread-header-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.slack-thread-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.25px;
  line-height: 1.3;
}

.slack-thread-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.slack-thread-anchor {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.slack-thread-anchor-label {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--el-text-color-secondary, #616061);
  padding-top: 0.2em;
}

.slack-thread-anchor-code {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  font-size: 12px;
  line-height: 1.45;
  word-break: break-all;
  color: var(--el-text-color-regular, #303133);
  background: transparent;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.slack-thread-scroll {
  flex: 1;
  min-height: 0;
  background: var(--el-bg-color, #fff);
}

.slack-thread-scroll :deep(.el-scrollbar__view) {
  padding: 0 8px;
}

.slack-thread-body {
  padding: 10px 0 16px;
}

.slack-empty {
  padding: 8px 0 12px;
}

.slack-empty :deep(.el-empty__image) {
  opacity: 0.88;
}

.slack-empty-desc {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  max-width: 260px;
  margin: 0 auto;
}

.slack-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-regular, #606266);
}

.slack-empty-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary, #909399);
}

.slack-thread-block {
  padding: 4px 4px 14px;
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  background: var(--el-fill-color-blank, #fff);
}
.slack-thread-block:last-of-type {
  margin-bottom: 0;
}
.slack-thread-block.is-resolved {
  border-color: rgba(103, 194, 58, 0.35);
  background: linear-gradient(180deg, #fafafa 0%, #fff 48px);
}

.slack-thread-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 10px 0;
  min-height: 36px;
}

.slack-thread-toolbar-spacer {
  flex: 1;
}

.slack-thread-messages {
  padding: 2px 6px 8px;
}

.slack-thread-menu {
  font-size: 18px;
  line-height: 1;
  color: #616061;
  padding: 2px 6px;
  min-height: auto;
}

.slack-msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
  padding: 4px 4px 12px;
  margin-bottom: 2px;
  border-radius: 8px;
  transition: background 0.12s ease;
}
.slack-msg:not(.is-own) {
  justify-content: flex-start;
}
.slack-msg.is-own {
  justify-content: flex-end;
}
.slack-msg:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}

.slack-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.slack-msg-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: min(320px, 85%);
  flex: 0 1 auto;
}

.slack-msg.is-own .slack-msg-main {
  align-items: flex-end;
  text-align: right;
}

.slack-msg-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin-bottom: 6px;
  width: 100%;
}
.slack-msg.is-own .slack-msg-head {
  justify-content: flex-end;
}

.slack-msg-meta {
  display: inline-flex;
  align-items: center;
  gap: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.slack-msg-bubble {
  display: inline-block;
  max-width: 100%;
  padding: 9px 14px;
  border-radius: 16px;
  line-height: 1.5;
  background: var(--el-fill-color-light, #f0f2f5);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  text-align: left;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.slack-msg:not(.is-own) .slack-msg-bubble {
  border-bottom-left-radius: 6px;
}
.slack-msg.is-own .slack-msg-bubble {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
  border-bottom-right-radius: 6px;
}
.slack-msg.is-own .slack-msg-bubble .slack-msg-text {
  text-align: left;
}

.slack-msg-author {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary, #303133);
  letter-spacing: -0.01em;
}

.slack-msg-time {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: inherit;
}

.slack-msg-edited {
  font-size: 12px;
  color: var(--el-text-color-placeholder, #a8abb2);
  font-style: normal;
}

.slack-msg-text {
  margin: 0;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--el-text-color-primary, #303133);
}

.slack-msg-edit {
  min-width: 180px;
}
.slack-msg-edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.slack-msg.is-own .slack-msg-edit-actions {
  justify-content: flex-end;
}

.slack-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
  width: 100%;
}
.slack-msg.is-own .slack-reactions {
  justify-content: flex-end;
}

.slack-reaction-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 13px;
  line-height: 1.4;
  border: 1px solid #e0e0e0;
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.slack-reaction-pill:hover {
  background: #f5f5f5;
  border-color: #ccc;
}
.slack-reaction-pill.is-mine {
  border-color: #1264a3;
  background: #e8f5fa;
}
.slack-reaction-pill--readonly {
  cursor: default;
  pointer-events: none;
  opacity: 0.95;
}
.slack-reaction-count {
  font-size: 12px;
  color: #616061;
}

.slack-msg-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 4px;
  margin-top: 4px;
  width: 100%;
  opacity: 0;
  transition: opacity 0.12s;
}
.slack-msg.is-own .slack-msg-footer {
  justify-content: flex-end;
}
.slack-msg:hover .slack-msg-footer {
  opacity: 1;
}

.slack-emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  width: fit-content;
  max-width: 100%;
}
.slack-msg.is-own .slack-emoji-picker {
  align-self: flex-end;
}

.slack-emoji-btn {
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
}
.slack-emoji-btn:hover {
  background: #f0f0f0;
}

.slack-composer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 14px;
  background: linear-gradient(180deg, #f6f6f6 0%, #f0f0f0 100%);
  border-top: 1px solid var(--el-border-color-lighter, #e8e8e8);
  border-radius: 0 0 10px 10px;
}

.slack-composer-input-wrap {
  position: relative;
  width: 100%;
}

.mention-popover {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  margin-bottom: 6px;
  max-height: 220px;
  overflow-y: auto;
  z-index: 20;
  padding: 4px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  box-shadow: var(--el-box-shadow-light);
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  color: var(--el-text-color-primary);
  transition: background 0.12s ease;
}

.mention-item.is-active,
.mention-item:hover {
  background: var(--el-fill-color-light);
}

.mention-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.mention-name {
  font-weight: 600;
}

.mention-id {
  margin-left: auto;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  font-family: ui-monospace, monospace;
}

.mention-loading,
.mention-empty {
  padding: 12px 14px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.slack-composer-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.slack-composer-input :deep(.el-textarea__inner) {
  border-radius: 8px;
  font-size: 15px;
  line-height: 1.466;
  padding: 10px 12px;
  border-color: #c5c5c5;
  box-shadow: none;
}
.slack-composer-input :deep(.el-textarea__inner:focus) {
  border-color: #1264a3;
  box-shadow: 0 0 0 1px #1264a3;
}

.slack-composer-hint {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--el-text-color-secondary, #909399);
}
.slack-composer-hint kbd {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  background: var(--el-bg-color, #fff);
  font-family: inherit;
}

.slack-send {
  flex-shrink: 0;
  min-width: 92px;
  border-radius: 8px;
  font-weight: 600;
}
</style>

<style>
/* Popover body is teleported — target wrapper class set via popper-class */
.slack-thread-popper.el-popper {
  padding: 0 !important;
  border-radius: 12px !important;
  border: 1px solid var(--el-border-color, #e4e7ed) !important;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.03) !important;
  overflow: hidden;
  max-width: calc(100vw - 24px);
}
</style>
