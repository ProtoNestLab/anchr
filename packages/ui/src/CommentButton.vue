<script setup lang="ts">
defineProps<{
  count?: number
  unread?: number
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button class="anchor-comment-btn" title="Open discussion" @click="$emit('click')">
    💬
    <span v-if="count" class="anchor-comment-count">{{ count }}</span>
    <span v-if="unread" class="anchor-unread-dot" />
  </button>
</template>

<style scoped>
.anchor-comment-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--anchor-border, #ddd);
  border-radius: 6px;
  background: var(--anchor-bg, #fff);
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 1px 4px var(--anchor-shadow, rgba(0, 0, 0, 0.1));
  transition: background 0.15s;
}
.anchor-comment-btn:hover {
  background: var(--anchor-hover, #f0f0f0);
}
.anchor-comment-count {
  font-size: 12px;
  color: var(--anchor-text-muted, #666);
}
.anchor-unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--anchor-primary, #4a90d9);
}
</style>
