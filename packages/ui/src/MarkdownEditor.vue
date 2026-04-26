<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { renderMarkdown } from './markdown'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    minRows?: number
    maxRows?: number
    disabled?: boolean
    ariaLabel?: string
    mentions?: { id: string; name: string; type: 'agent' | 'user' }[]
  }>(),
  {
    placeholder: 'Write a message… (markdown supported)',
    minRows: 2,
    maxRows: 8,
    disabled: false,
    ariaLabel: 'Message',
    mentions: () => [{ id: 'agent', name: 'agent', type: 'agent' }],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  input: [event: Event]
  keydown: [event: KeyboardEvent]
}>()

const mode = ref<'write' | 'preview'>('write')
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const mentionDropdown = ref(false)
const mentionFilter = ref('')
const mentionIndex = ref(0)
const mentionStartPos = ref(0)
const mentionDropdownRef = ref<HTMLDivElement | null>(null)
const mentionDropdownStyle = computed(() => {
  if (!textareaEl.value) return {}
  const rect = textareaEl.value.getBoundingClientRect()
  return {
    position: 'fixed' as const,
    left: `${rect.left}px`,
    top: `${rect.bottom + 4}px`,
    width: `${rect.width}px`,
    zIndex: '100000',
  }
})

const preview = computed(() => renderMarkdown(props.modelValue))
const isEmpty = computed(() => !props.modelValue.trim())

const filteredMentions = computed(() => {
  if (!mentionFilter.value) return props.mentions
  const filter = mentionFilter.value.toLowerCase()
  return props.mentions.filter((m) => m.name.toLowerCase().includes(filter))
})

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  const value = target.value
  emit('update:modelValue', value)
  emit('input', e)

  // 检测 @ 符号
  checkMention(value, target.selectionStart ?? 0)
}

function checkMention(value: string, cursorPos: number) {
  // 找到光标前最近的 @ 符号
  const lastAtIndex = value.lastIndexOf('@', cursorPos - 1)

  if (lastAtIndex !== -1) {
    // 检查 @ 后面是否是空格或行首
    const charAfterAtIndex = value[lastAtIndex + 1]
    if (!charAfterAtIndex || charAfterAtIndex === ' ' || charAfterAtIndex === '\n') {
      // 新的 @，显示下拉列表
      mentionStartPos.value = lastAtIndex
      mentionFilter.value = ''
      mentionIndex.value = 0
      mentionDropdown.value = true
      return
    }

    // 检查 @ 和光标之间是否只有字母数字
    const textAfterAt = value.substring(lastAtIndex + 1, cursorPos)
    if (/^[a-zA-Z0-9\u4e00-\u9fa5]*$/.test(textAfterAt)) {
      // 更新过滤词
      mentionFilter.value = textAfterAt
      mentionIndex.value = 0
      mentionDropdown.value = true
      return
    }
  }

  // 没有有效的 @，隐藏下拉列表
  mentionDropdown.value = false
}

function selectMention(mention: { id: string; name: string }) {
  const ta = textareaEl.value
  if (!ta) return

  const start = mentionStartPos.value
  const end = start + 1 + mentionFilter.value.length
  const newValue =
    props.modelValue.slice(0, start) + `@${mention.name} ` + props.modelValue.slice(end)

  emit('update:modelValue', newValue)
  mentionDropdown.value = false
  mentionFilter.value = ''

  // 将光标移动到插入位置之后
  nextTick(() => {
    ta.focus()
    ta.setSelectionRange(start + mention.name.length + 2, start + mention.name.length + 2)
  })
}

function closeMentionDropdown() {
  mentionDropdown.value = false
  mentionFilter.value = ''
}

function handleClickOutside(e: MouseEvent) {
  const dropdown = document.querySelector('.anchor-md-mention-dropdown')
  const editor = document.querySelector('.anchor-md-editor')
  if (
    dropdown &&
    editor &&
    !dropdown.contains(e.target as Node) &&
    !editor.contains(e.target as Node)
  ) {
    closeMentionDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true)
})

function onKeydown(e: KeyboardEvent) {
  // Mention dropdown navigation
  if (mentionDropdown.value && filteredMentions.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value + 1) % filteredMentions.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionIndex.value =
        mentionIndex.value === 0 ? filteredMentions.value.length - 1 : mentionIndex.value - 1
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      selectMention(filteredMentions.value[mentionIndex.value])
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeMentionDropdown()
      return
    }
  }

  // Common markdown shortcuts
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
    if (e.key === 'b') {
      e.preventDefault()
      wrap('**', '**')
      return
    }
    if (e.key === 'i') {
      e.preventDefault()
      wrap('*', '*')
      return
    }
    if (e.key === 'k') {
      e.preventDefault()
      insertLink()
      return
    }
  }
  emit('keydown', e)
}

function wrap(before: string, after: string) {
  const ta = textareaEl.value
  if (!ta) return
  const start = ta.selectionStart ?? 0
  const end = ta.selectionEnd ?? start
  const value = props.modelValue
  const selected = value.slice(start, end)
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end)
  emit('update:modelValue', newValue)
  // Restore selection around the wrapped text
  requestAnimationFrame(() => {
    if (ta) {
      ta.focus()
      ta.setSelectionRange(start + before.length, end + before.length)
    }
  })
}

function insertLink() {
  const ta = textareaEl.value
  if (!ta) return
  const start = ta.selectionStart ?? 0
  const end = ta.selectionEnd ?? start
  const value = props.modelValue
  const selected = value.slice(start, end) || 'text'
  const insert = `[${selected}](https://)`
  const newValue = value.slice(0, start) + insert + value.slice(end)
  emit('update:modelValue', newValue)
  requestAnimationFrame(() => {
    if (ta) {
      ta.focus()
      const urlStart = start + selected.length + 3
      ta.setSelectionRange(urlStart, urlStart + 8)
    }
  })
}

function toolbarAction(kind: 'bold' | 'italic' | 'code' | 'strike' | 'link') {
  if (mode.value === 'preview') return
  if (kind === 'bold') wrap('**', '**')
  else if (kind === 'italic') wrap('*', '*')
  else if (kind === 'code') wrap('`', '`')
  else if (kind === 'strike') wrap('~~', '~~')
  else if (kind === 'link') insertLink()
}

watch(
  () => props.modelValue,
  (v) => {
    if (!v.trim()) return
  },
)

defineExpose({
  focus() {
    textareaEl.value?.focus()
  },
  get textarea() {
    return textareaEl.value
  },
})
</script>

<template>
  <div class="anchor-md-editor" :class="{ 'is-disabled': disabled }">
    <div class="anchor-md-toolbar" role="toolbar" aria-label="Formatting">
      <button
        v-for="btn in [
          { kind: 'bold' as const, label: 'Bold', hint: '**bold** (⌘B)', text: 'B' },
          { kind: 'italic' as const, label: 'Italic', hint: '*italic* (⌘I)', text: 'I' },
          { kind: 'strike' as const, label: 'Strikethrough', hint: '~~strike~~', text: 'S' },
          { kind: 'code' as const, label: 'Code', hint: '`code`', text: '</>' },
          { kind: 'link' as const, label: 'Link', hint: '[text](url) (⌘K)', text: '🔗' },
        ]"
        :key="btn.kind"
        type="button"
        class="anchor-md-tool-btn"
        :aria-label="btn.label"
        :title="btn.hint"
        :disabled="disabled || mode === 'preview'"
        @click="toolbarAction(btn.kind)"
      >
        {{ btn.text }}
      </button>

      <div class="anchor-md-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'write'"
          class="anchor-md-tab"
          :class="{ 'is-active': mode === 'write' }"
          @click="mode = 'write'"
        >
          Write
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'preview'"
          class="anchor-md-tab"
          :class="{ 'is-active': mode === 'preview' }"
          :disabled="isEmpty"
          @click="mode = 'preview'"
        >
          Preview
        </button>
      </div>
    </div>

    <!-- Mention dropdown -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="mentionDropdown && filteredMentions.length > 0"
          ref="mentionDropdownRef"
          class="anchor-md-mention-dropdown"
          :style="mentionDropdownStyle"
        >
          <div class="anchor-md-mention-header">
            <span v-if="mentionFilter">搜索: "{{ mentionFilter }}"</span>
            <span v-else>选择要提及的对象</span>
          </div>
          <ul class="anchor-md-mention-list">
            <li
              v-for="(mention, index) in filteredMentions"
              :key="mention.id"
              class="anchor-md-mention-item"
              :class="{ 'is-selected': index === mentionIndex }"
              @click="selectMention(mention)"
              @mouseenter="mentionIndex = index"
            >
              <span class="anchor-md-mention-avatar">
                {{ mention.type === 'agent' ? '🤖' : '👤' }}
              </span>
              <div class="anchor-md-mention-info">
                <span class="anchor-md-mention-name">{{ mention.name }}</span>
                <span class="anchor-md-mention-type">
                  {{ mention.type === 'agent' ? 'AI Agent' : '用户' }}
                </span>
              </div>
            </li>
          </ul>
        </div>
      </Transition>
    </Teleport>

    <div class="anchor-md-body">
      <textarea
        v-if="mode === 'write'"
        ref="textareaEl"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-label="ariaLabel"
        class="anchor-md-textarea"
        :style="{ minHeight: minRows * 1.5 + 'em', maxHeight: maxRows * 1.5 + 'em' }"
        @input="onInput"
        @keydown="onKeydown"
        @click="
          (e) => {
            checkMention(modelValue, (e.target as HTMLTextAreaElement).selectionStart ?? 0)
          }
        "
      />
      <div
        v-else
        class="anchor-md-preview"
        role="region"
        aria-label="Markdown preview"
        v-html="preview || '<span class=\'anchor-md-empty\'>Nothing to preview</span>'"
      />
    </div>
  </div>
</template>

<style>
.anchor-md-editor {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--anchor-border, #d0d0d0);
  border-radius: 8px;
  background: var(--anchor-bg, #fff);
  overflow: hidden;
  position: relative;
}
.anchor-md-editor.is-disabled {
  opacity: 0.65;
  pointer-events: none;
}

.anchor-md-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: var(--anchor-toolbar-bg, #fafafa);
  border-bottom: 1px solid var(--anchor-border-light, #ebebeb);
}

.anchor-md-tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 26px;
  padding: 0 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--anchor-text, #333);
  cursor: pointer;
}
.anchor-md-tool-btn:hover:not(:disabled) {
  background: var(--anchor-hover, #ececec);
}
.anchor-md-tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.anchor-md-tabs {
  margin-left: auto;
  display: inline-flex;
  gap: 2px;
}

.anchor-md-tab {
  border: none;
  background: transparent;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--anchor-text-muted, #777);
  border-radius: 4px;
  cursor: pointer;
}
.anchor-md-tab.is-active {
  background: var(--anchor-bg, #fff);
  color: var(--anchor-text, #333);
  box-shadow: 0 0 0 1px var(--anchor-border-light, #ddd);
}
.anchor-md-tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.anchor-md-body {
  display: flex;
  flex-direction: column;
}

.anchor-md-textarea {
  width: 100%;
  padding: 10px 12px;
  border: none;
  outline: none;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: var(--anchor-text, #1d1c1d);
  background: transparent;
}
.anchor-md-textarea::placeholder {
  color: var(--anchor-placeholder, #a8abb2);
}

.anchor-md-preview {
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--anchor-text, #1d1c1d);
  min-height: 3em;
}
.anchor-md-preview .anchor-md-empty {
  color: var(--anchor-placeholder, #a8abb2);
  font-style: italic;
}
.anchor-md-preview pre {
  margin: 4px 0;
  padding: 8px 10px;
  background: var(--anchor-code-bg, #f6f8fa);
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12.5px;
}
.anchor-md-preview code {
  padding: 1px 4px;
  background: var(--anchor-code-bg, #f6f8fa);
  border-radius: 3px;
  font-size: 12.5px;
}

/* Mention dropdown styles */
.anchor-md-mention-dropdown {
  background: var(--anchor-bg, #fff);
  border: 1px solid var(--anchor-border, #d0d0d0);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.anchor-md-mention-header {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--anchor-text-muted, #777);
  border-bottom: 1px solid var(--anchor-border-light, #ebebeb);
  background: var(--anchor-toolbar-bg, #fafafa);
}

.anchor-md-mention-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 200px;
  overflow-y: auto;
}

.anchor-md-mention-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.anchor-md-mention-item:hover,
.anchor-md-mention-item.is-selected {
  background: var(--anchor-hover, #ececec);
}

.anchor-md-mention-avatar {
  font-size: 20px;
  margin-right: 10px;
}

.anchor-md-mention-info {
  display: flex;
  flex-direction: column;
}

.anchor-md-mention-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--anchor-text, #333);
}

.anchor-md-mention-type {
  font-size: 12px;
  color: var(--anchor-text-muted, #777);
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
