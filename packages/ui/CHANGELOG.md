# @anchor-sdk/ui

## 1.5.0

### Minor Changes

- 79ee2e0: v1.4.0 — rich text, attachments, @mentions, and virtual scrolling

  **core**
  - New `Attachment` and `MessageOptions` types
  - Optional `Adapter.uploadAttachment(file)` plus `attachments` support on `createThread` / `addMessage`
  - Memory, REST, and WebSocket adapters implement the new surface

  **vue**
  - `useThreads().uploadAttachment(file)` with error-state fallback
  - New `useMentions(options)` headless `@mention` autocomplete composable
  - `useAnchor().send(content, options?)` and `useThreads.{createThread,addMessage}` accept `MessageOptions`

  **ui**
  - New `<MarkdownEditor>` with write/preview tabs and ⌘B / ⌘I / ⌘K shortcuts
  - New `<VirtualList>` generic virtual-scrolling list with dynamic row heights
  - `<ThreadPopover>` and `<AnchorDiscussion>` gain `mentionUsers`, `uploadAttachment`, `virtualize`, and `virtualizeThreshold` props; image attachments render inline, other files as download chips

### Patch Changes

- Updated dependencies [79ee2e0]
  - @anchor-sdk/core@1.5.0
  - @anchor-sdk/vue@1.5.0

## 1.4.0

### Minor Changes

- **`<MarkdownEditor>`** — New composer component replacing the plain textarea. Write/preview tabs, a small formatting toolbar (bold, italic, strike, code, link), and keyboard shortcuts: ⌘B / ⌘I wrap the current selection, ⌘K inserts a link. Exposes `focus()` and the underlying `textarea` for cursor-aware integrations (like mentions).

- **`<VirtualList>`** — Generic virtual-scrolling list with dynamic row heights (measured via `ResizeObserver`). Props: `items`, `estimatedHeight`, `overscan`, `getKey`. Exposes `scrollToBottom()` and `scrollToIndex()`.

- **`<ThreadPopover>` / `<AnchorDiscussion>`** — New props: `mentionUsers` (drives `useMentions` autocomplete), `uploadAttachment` (enables file/image attachments; the button is hidden when the adapter doesn't implement it), `virtualize` (default `true`) and `virtualizeThreshold` (default `50`). Image attachments render as thumbnails; other files render as download chips. `send` now emits `(content, { attachments? })`.

- **`<AnchorDiscussion>`** — Automatically passes `client.adapter.uploadAttachment` through when the adapter supports attachments.

## 1.3.0

### Minor Changes

- **Accessibility** — `ThreadPopover` uses `role="dialog"`, buttons have `aria-label`, reaction picker uses `role="listbox"`, error/loading states use `role="alert"` and `aria-live="polite"`. `CommentButton` has dynamic `aria-label` announcing counts. Empty send is disabled.

- **Loading & Error States** — `ThreadPopover` accepts `loading` and `error` props with dedicated UI.

- **Test Coverage** — 23 new tests covering `CommentButton`, `renderMarkdown` (including XSS prevention).

### Patch Changes

- Updated dependencies
  - @anchor-sdk/core@1.3.0
  - @anchor-sdk/vue@1.3.0

## 1.1.0

### Minor Changes

- bb42f7d: **UI**
  - Thread resolve/reopen with visual resolved badge
  - Message edit (inline) and delete for own messages
  - Emoji reaction picker and toggle
  - Markdown rendering (bold, italic, code, links, strikethrough)
  - Unread message indicator on CommentButton
  - Keyboard navigation (Esc to close, Enter to send)
  - CSS custom properties theming (`--anchor-*` variables) with dark mode support

### Patch Changes

- Updated dependencies [bb42f7d]
  - @anchor-sdk/core@1.1.0
  - @anchor-sdk/vue@1.1.0

## 1.0.0

### Major Changes

- 90f5dd3: Initial release of Anchor SDK — a UI anchor-based discussion SDK for Vue 3.

### Minor Changes

- 90f5dd3: **@anchor-sdk/ui**
  - `<AnchorDiscussion>` all-in-one discussion component
  - `<CommentButton>` floating button with count badge
  - `<ThreadPopover>` positioned popover powered by Floating UI

### Patch Changes

- Updated dependencies [90f5dd3]
  - @anchor-sdk/core@1.0.0
  - @anchor-sdk/vue@1.0.0
