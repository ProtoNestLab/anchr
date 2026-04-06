<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useFloating, offset, flip, shift } from '@floating-ui/vue'
import type { Thread } from '@anchor-sdk/core'

const props = defineProps<{
  threads: Thread[]
  referenceEl: HTMLElement | null
}>()

const emit = defineEmits<{
  send: [content: string]
  close: []
}>()

const floating = ref<HTMLElement | null>(null)
const input = ref('')

const reference = toRef(props, 'referenceEl')

const { floatingStyles } = useFloating(reference, floating, {
  placement: 'bottom-start',
  middleware: [offset(8), flip(), shift({ padding: 8 })],
})

function send() {
  const text = input.value.trim()
  if (!text) return
  emit('send', text)
  input.value = ''
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <Teleport to="body">
    <div class="popover-backdrop" @click.self="emit('close')">
      <div ref="floating" :style="floatingStyles" class="thread-popover">
        <div class="popover-header">
          <span>Discussion</span>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div class="thread-list">
          <template v-if="threads.length === 0">
            <p class="empty">No comments yet. Start the conversation!</p>
          </template>
          <template v-for="thread in threads" :key="thread.id">
            <div v-for="msg in thread.messages" :key="msg.id" class="message">
              <div class="message-header">
                <strong>{{ msg.user.name }}</strong>
                <span class="time">{{ formatTime(msg.createdAt) }}</span>
              </div>
              <p class="message-body">{{ msg.content }}</p>
            </div>
          </template>
        </div>

        <form class="input-row" @submit.prevent="send">
          <input v-model="input" placeholder="Write a comment…" class="comment-input" />
          <button type="submit" class="send-btn">Send</button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
}
.thread-popover {
  width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  font-size: 14px;
  z-index: 1001;
}
.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  font-weight: 600;
}
.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #888;
}
.thread-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}
.empty {
  color: #999;
  text-align: center;
  margin: 16px 0;
}
.message {
  margin-bottom: 10px;
}
.message-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.time {
  font-size: 11px;
  color: #999;
}
.message-body {
  margin: 2px 0 0;
  line-height: 1.4;
}
.input-row {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid #eee;
}
.comment-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}
.comment-input:focus {
  border-color: #4a90d9;
}
.send-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #4a90d9;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}
.send-btn:hover {
  background: #3a7bc8;
}
</style>
