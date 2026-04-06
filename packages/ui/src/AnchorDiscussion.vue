<script setup lang="ts">
import { ref, computed } from 'vue'
import { Anchor, useThreads } from '@anchor-sdk/vue'
import CommentButton from './CommentButton.vue'
import ThreadPopover from './ThreadPopover.vue'

const props = defineProps<{ anchorId: string }>()

const { threads, createThread, addMessage } = useThreads(props.anchorId)
const open = ref(false)
const anchorRef = ref<HTMLElement | null>(null)

const messageCount = computed(() => threads.value.reduce((sum, t) => sum + t.messages.length, 0))

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
        @click="open = !open"
      />
    </template>
  </Anchor>

  <ThreadPopover
    v-if="open"
    :threads="threads"
    :reference-el="anchorRef"
    @send="handleSend"
    @close="open = false"
  />
</template>
