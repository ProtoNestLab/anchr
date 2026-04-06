<script setup lang="ts">
import { ref, computed } from 'vue'
import { Anchor, useThreads, useClient } from '@anchor-sdk/vue'
import CommentButton from './CommentButton.vue'
import ThreadPopover from './ThreadPopover.vue'

const props = defineProps<{ anchorId: string }>()

const client = useClient()
const {
  threads,
  createThread,
  addMessage,
  editMessage,
  deleteMessage,
  resolveThread,
  reopenThread,
  deleteThread,
  addReaction,
  removeReaction,
} = useThreads(props.anchorId)

const open = ref(false)
const anchorRef = ref<HTMLElement | null>(null)
const lastSeenCount = ref(0)

const messageCount = computed(() => threads.value.reduce((sum, t) => sum + t.messages.length, 0))

const unreadCount = computed(() => {
  const total = messageCount.value
  return total > lastSeenCount.value ? total - lastSeenCount.value : 0
})

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

function handleSend(content: string) {
  if (threads.value.length > 0) {
    addMessage(threads.value[0].id, content)
  } else {
    createThread(content)
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
