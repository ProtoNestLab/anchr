# @anchor-sdk/vue

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

## 1.4.0

### Minor Changes

- **`useThreads().uploadAttachment(file)`** — Delegates to the adapter's `uploadAttachment` with error-state fallback when the adapter doesn't implement it. `createThread` and `addMessage` now accept an optional `MessageOptions` argument (forwarded into optimistic updates).

- **`useMentions(options)`** — Headless `@mention` autocomplete composable. Tracks the current `@query` before the cursor and exposes filtered user suggestions, keyboard navigation (`moveUp` / `moveDown`), and a `select()` that returns the rewritten text and new cursor offset. Supports sync or async `resolveUsers` and an optional `filter` (e.g. exclude the current user).

- **`useAnchor().send(content, options?)`** — Forwards `MessageOptions` (e.g. `attachments`) to the underlying `createThread`. Re-exports `uploadAttachment` from `useThreads`.

## 1.3.0

### Minor Changes

- **`usePresence()` Composable** — Reactive presence and typing indicators. Auto-sets user online on mount, offline on unmount. Subscribes to real-time presence and typing updates.

- **Optimistic Updates** — `useThreads()` now applies mutations instantly with automatic rollback on failure. All CRUD operations (create, edit, delete, resolve, reopen, reactions) use the snapshot/rollback pattern.

- **Error Handling** — `useThreads()` and `useAnchor()` expose a reactive `error` ref that is set on failure and auto-cleared before the next operation.

- **Test Coverage** — 30 new tests covering `useThreads`, `useAnchor`, `usePresence`, `CollabProvider`, and `Anchor` components.

### Patch Changes

- Updated dependencies
  - @anchor-sdk/core@1.3.0

## 1.1.0

### Minor Changes

- bb42f7d: **Vue**
  - `useThreads()` now exposes all new CRUD methods (edit, delete, resolve, reactions)
  - `useAnchor()` headless composable — all discussion logic, zero UI
  - Auto real-time subscription when adapter supports `subscribe()`

### Patch Changes

- Updated dependencies [bb42f7d]
  - @anchor-sdk/core@1.1.0

## 1.0.0

### Major Changes

- 90f5dd3: Initial release of Anchor SDK — a UI anchor-based discussion SDK for Vue 3.

### Minor Changes

- 90f5dd3: **@anchor-sdk/vue**
  - `<CollabProvider>` component for dependency injection
  - `<Anchor>` component with hover-aware overlay slot
  - `useThreads()` composable for thread CRUD operations
  - `useClient()` / `provideClient()` for manual client access

### Patch Changes

- Updated dependencies [90f5dd3]
  - @anchor-sdk/core@1.0.0
