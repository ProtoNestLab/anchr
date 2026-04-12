# @anchor-sdk/ui

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
