<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { renderMarkdown } from './markdown'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    minRows?: number
    maxRows?: number
    disabled?: boolean
    ariaLabel?: string
  }>(),
  {
    placeholder: 'Write a message… (markdown supported)',
    minRows: 2,
    maxRows: 8,
    disabled: false,
    ariaLabel: 'Message',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  input: [event: Event]
  keydown: [event: KeyboardEvent]
}>()

const mode = ref<'write' | 'preview'>('write')
const textareaEl = ref<HTMLTextAreaElement | null>(null)

const preview = computed(() => renderMarkdown(props.modelValue))
const isEmpty = computed(() => !props.modelValue.trim())

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  emit('input', e)
}

function onKeydown(e: KeyboardEvent) {
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
</style>
