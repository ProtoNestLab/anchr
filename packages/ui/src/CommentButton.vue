<script setup lang="ts">
defineProps<{
  count?: number
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button class="comment-btn" title="Open discussion" @click="$emit('click')">
    💬
    <span v-if="count" class="comment-count">{{ count }}</span>
  </button>
</template>

<style scoped>
.comment-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition: background 0.15s;
}
.comment-btn:hover {
  background: #f0f0f0;
}
.comment-count {
  font-size: 12px;
  color: #666;
}
</style>
