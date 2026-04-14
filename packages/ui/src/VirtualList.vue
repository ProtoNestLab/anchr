<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** List of items to render. */
    items: T[]
    /** Estimated item height used before measurement. Default: 80. */
    estimatedHeight?: number
    /** Extra items to render outside the viewport. Default: 4. */
    overscan?: number
    /** Key used to identify items for stable measurement (defaults to index). */
    getKey?: (item: T, index: number) => string | number
  }>(),
  {
    estimatedHeight: 80,
    overscan: 4,
    getKey: undefined,
  },
)

const container = ref<HTMLElement | null>(null)
const measuredHeights = ref<Map<string | number, number>>(new Map())
const scrollTop = ref(0)
const viewportHeight = ref(0)

function keyFor(item: T, index: number): string | number {
  return props.getKey ? props.getKey(item, index) : index
}

function heightFor(item: T, index: number): number {
  const key = keyFor(item, index)
  return measuredHeights.value.get(key) ?? props.estimatedHeight
}

const offsets = computed<number[]>(() => {
  const list: number[] = [0]
  for (let i = 0; i < props.items.length; i++) {
    list.push(list[i]! + heightFor(props.items[i]!, i))
  }
  return list
})

const totalHeight = computed(() => offsets.value[offsets.value.length - 1] ?? 0)

const visibleRange = computed(() => {
  const total = props.items.length
  if (total === 0) return { start: 0, end: 0, offset: 0 }
  const top = scrollTop.value
  const bottom = top + viewportHeight.value
  let start = 0
  while (start < total && offsets.value[start + 1]! <= top) start++
  let end = start
  while (end < total && offsets.value[end]! < bottom) end++
  start = Math.max(0, start - props.overscan)
  end = Math.min(total, end + props.overscan)
  return { start, end, offset: offsets.value[start] ?? 0 }
})

const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return props.items.slice(start, end).map((item, i) => ({
    item,
    index: start + i,
    key: keyFor(item, start + i),
  }))
})

function onScroll() {
  if (container.value) scrollTop.value = container.value.scrollTop
}

let resizeObserver: ResizeObserver | null = null
const itemRefs = new Map<string | number, HTMLElement>()

function setItemRef(key: string | number, el: HTMLElement | null) {
  if (el) {
    itemRefs.set(key, el)
    resizeObserver?.observe(el)
    const h = el.getBoundingClientRect().height
    if (h > 0 && measuredHeights.value.get(key) !== h) {
      const next = new Map(measuredHeights.value)
      next.set(key, h)
      measuredHeights.value = next
    }
  }
}

onMounted(() => {
  if (container.value) {
    viewportHeight.value = container.value.clientHeight
  }
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      let changed = false
      const next = new Map(measuredHeights.value)
      for (const entry of entries) {
        for (const [key, el] of itemRefs.entries()) {
          if (el === entry.target) {
            const h = entry.contentRect.height
            if (h > 0 && next.get(key) !== h) {
              next.set(key, h)
              changed = true
            }
          }
        }
      }
      if (changed) measuredHeights.value = next
    })
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  itemRefs.clear()
})

watch(
  () => props.items.length,
  () => {
    // Prune stale measurements
    const keys = new Set(props.items.map((it, i) => keyFor(it, i)))
    for (const k of measuredHeights.value.keys()) {
      if (!keys.has(k)) measuredHeights.value.delete(k)
    }
  },
)

defineExpose({
  scrollToBottom() {
    if (container.value) container.value.scrollTop = container.value.scrollHeight
  },
  scrollToIndex(index: number) {
    if (container.value) container.value.scrollTop = offsets.value[index] ?? 0
  },
})
</script>

<template>
  <div ref="container" class="anchor-vlist" @scroll="onScroll">
    <div class="anchor-vlist-spacer" :style="{ height: totalHeight + 'px' }">
      <div
        class="anchor-vlist-window"
        :style="{ transform: `translateY(${visibleRange.offset}px)` }"
      >
        <div
          v-for="entry in visibleItems"
          :key="entry.key"
          :ref="(el) => setItemRef(entry.key, el as HTMLElement | null)"
          class="anchor-vlist-item"
        >
          <slot :item="entry.item" :index="entry.index" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.anchor-vlist {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  height: 100%;
}

.anchor-vlist-spacer {
  position: relative;
  width: 100%;
}

.anchor-vlist-window {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}

.anchor-vlist-item {
  width: 100%;
}
</style>
