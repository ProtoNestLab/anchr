---
'@anchor-sdk/core': minor
'@anchor-sdk/vue': minor
'@anchor-sdk/ui': minor
---

### New Features

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
