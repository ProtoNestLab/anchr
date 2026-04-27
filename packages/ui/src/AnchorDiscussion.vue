<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Attachment, User } from '@anchor-sdk/core'
import { Anchor, useThreads, useClient } from '@anchor-sdk/vue'
import CommentButton from './CommentButton.vue'
import ThreadPopover from './ThreadPopover.vue'

const props = withDefaults(
  defineProps<{
    anchorId: string
    /** Users available for @mention autocomplete. */
    mentionUsers?: User[]
    /** Enable virtualized rendering. Default: auto-detect by message count. */
    virtualize?: boolean
    virtualizeThreshold?: number
  }>(),
  {
    mentionUsers: () => [],
    virtualize: undefined,
    virtualizeThreshold: 50,
  },
)

const client = useClient()
const {
  threads,
  loading,
  error,
  agentIsLoading,
  createThread,
  addMessage,
  editMessage,
  deleteMessage,
  resolveThread,
  reopenThread,
  deleteThread,
  addReaction,
  removeReaction,
  uploadAttachment,
} = useThreads(props.anchorId)

const open = ref(false)
const anchorRef = ref<HTMLElement | null>(null)
const lastSeenCount = ref(0)

const messageCount = computed(() => threads.value.reduce((sum, t) => sum + t.messages.length, 0))

const unreadCount = computed(() => {
  const total = messageCount.value
  return total > lastSeenCount.value ? total - lastSeenCount.value : 0
})

const canUpload = computed(() => Boolean(client.adapter.uploadAttachment))

function handleOpen() {
  open.value = !open.value
  if (open.value) {
    lastSeenCount.value = messageCount.value
  }
}

function handleClose() {
  open.value = false
  lastSeenCount.value = messageCount.value
}

function handleSend(content: string, options?: { attachments?: Attachment[] }) {
  if (threads.value.length > 0) {
    addMessage(threads.value[0].id, content, options)
  } else {
    createThread(content, options)
  }
}
</script>

<template>
  <Anchor :id="anchorId">
    <div ref="anchorRef">
      <slot />
    </div>

    <template #overlay="{ hovered }">
      <CommentButton
        v-show="hovered || open || messageCount > 0"
        :count="messageCount"
        :unread="unreadCount"
        @click="handleOpen"
      />
    </template>
  </Anchor>

  <ThreadPopover
    v-if="open"
    :threads="threads"
    :reference-el="anchorRef"
    :current-user-id="client.user.id"
    :loading="loading"
    :error="error?.message"
    :agent-is-loading="agentIsLoading"
    :mention-users="mentionUsers"
    :virtualize="virtualize"
    :virtualize-threshold="virtualizeThreshold"
    :upload-attachment="canUpload ? uploadAttachment : undefined"
    @send="handleSend"
    @close="handleClose"
    @resolve="resolveThread"
    @reopen="reopenThread"
    @delete-thread="deleteThread"
    @edit-message="(id, content) => editMessage(id, content)"
    @delete-message="(tid, mid) => deleteMessage(tid, mid)"
    @add-reaction="(mid, emoji) => addReaction(mid, emoji)"
    @remove-reaction="(mid, emoji) => removeReaction(mid, emoji)"
  />
</template>
