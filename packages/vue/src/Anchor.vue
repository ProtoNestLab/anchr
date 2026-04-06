<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ id: string }>()

const hovered = ref(false)
</script>

<template>
  <div class="anchor-wrapper" @mouseenter="hovered = true" @mouseleave="hovered = false">
    <slot />
    <slot name="overlay" :hovered="hovered" />
  </div>
</template>

<style scoped>
.anchor-wrapper {
  position: relative;
  display: inline-block;
}
</style>
