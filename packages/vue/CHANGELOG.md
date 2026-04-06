# @anchor-sdk/vue

## 1.1.0

### Minor Changes

- bb42f7d: ### New Features

  **Core**
  - User identity: `createClient({ user })` — pass current user instead of hardcoded Anonymous
  - Resolve/reopen threads: `resolveThread()`, `reopenThread()`
  - Delete threads and messages: `deleteThread()`, `deleteMessage()`
  - Edit messages: `editMessage()` with `updatedAt` tracking
  - Emoji reactions: `addReaction()`, `removeReaction()` with `Reaction` type
  - Real-time sync: optional `subscribe()` method on Adapter interface
  - Plugin system: `Plugin` interface with lifecycle hooks (`beforeCreateThread`, `afterAddMessage`, etc.)
  - REST adapter: `createRestAdapter()` for connecting to any REST backend

  **Vue**
  - `useThreads()` now exposes all new CRUD methods (edit, delete, resolve, reactions)
  - `useAnchor()` headless composable — all discussion logic, zero UI
  - Auto real-time subscription when adapter supports `subscribe()`

  **UI**
  - Thread resolve/reopen with visual resolved badge
  - Message edit (inline) and delete for own messages
  - Emoji reaction picker and toggle
  - Markdown rendering (bold, italic, code, links, strikethrough)
  - Unread message indicator on CommentButton
  - Keyboard navigation (Esc to close, Enter to send)
  - CSS custom properties theming (`--anchor-*` variables) with dark mode support

  ### Engineering
  - Bundle size tracking with size-limit in CI
  - VitePress docs: plugins, theming, headless mode guides
  - StackBlitz playground link
  - CONTRIBUTING.md

### Patch Changes

- Updated dependencies [bb42f7d]
  - @anchor-sdk/core@1.1.0

## 1.0.0

### Major Changes

- 90f5dd3: Initial release of Anchor SDK — a UI anchor-based discussion SDK for Vue 3.

### Minor Changes

- 90f5dd3: Initial release of Anchor SDK — a UI anchor-based discussion SDK for Vue 3.

  **@anchor-sdk/core**
  - `Anchor`, `Message`, `Thread` types and `Adapter` interface
  - `createClient()` factory for initializing the SDK
  - `createMemoryAdapter()` for in-memory storage (demos & testing)

  **@anchor-sdk/vue**
  - `<CollabProvider>` component for dependency injection
  - `<Anchor>` component with hover-aware overlay slot
  - `useThreads()` composable for thread CRUD operations
  - `useClient()` / `provideClient()` for manual client access

  **@anchor-sdk/ui**
  - `<AnchorDiscussion>` all-in-one discussion component
  - `<CommentButton>` floating button with count badge
  - `<ThreadPopover>` positioned popover powered by Floating UI

### Patch Changes

- Updated dependencies [90f5dd3]
- Updated dependencies [90f5dd3]
  - @anchor-sdk/core@1.0.0
