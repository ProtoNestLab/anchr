# @anchor-sdk/core

## 1.4.0

### Minor Changes

- **Attachments** — New `Attachment` and `MessageOptions` types. `Adapter` interface extended with optional `uploadAttachment(file)`; `createThread` and `addMessage` accept an optional `MessageOptions` with `attachments`.

- **Memory Adapter** — `createMemoryAdapter()` implements `uploadAttachment` by encoding files as data URLs (with image dimension detection, where available) so the adapter remains self-contained for demos and tests.

- **REST & WebSocket Adapters** — `uploadAttachment` posts `FormData` to `/attachments`; `createThread` / `addMessage` forward `attachments` in the request body. See the custom-adapter guide for the endpoint contract.

## 1.3.0

### Minor Changes

- **WebSocket Adapter** — Real-time collaboration via `createWebSocketAdapter()` with REST fallback for mutations, auto-reconnect with exponential backoff, and full support for threads, presence, and typing subscriptions.

- **Offline Queue** — `createOfflineQueue()` wraps any adapter to queue mutations while offline and flush them when connectivity is restored. Exposes `goOnline()`, `goOffline()`, `flush()`, `status`, and `pending` count.

- **Presence & Typing Types** — New `PresenceStatus`, `PresenceInfo`, and `ConnectionStatus` types. Adapter interface extended with optional `setPresence`, `getPresence`, `subscribePresence`, `setTyping`, `subscribeTyping`, `connect`, and `disconnect` methods.

- **Memory Adapter Enhancements** — `createMemoryAdapter()` now supports presence tracking, typing indicators, and real-time subscriptions for all features.

- **Test Coverage** — 66 new tests covering REST adapter, WebSocket adapter, offline queue, plugin system, and memory adapter.

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

  ### Engineering
  - Bundle size tracking with size-limit in CI
  - VitePress docs: plugins, theming, headless mode guides
  - StackBlitz playground link
  - CONTRIBUTING.md

## 1.0.0

### Major Changes

- 90f5dd3: Initial release of Anchor SDK — a UI anchor-based discussion SDK for Vue 3.

### Minor Changes

- 90f5dd3: Initial release of Anchor SDK — a UI anchor-based discussion SDK for Vue 3.

  **@anchor-sdk/core**
  - `Anchor`, `Message`, `Thread` types and `Adapter` interface
  - `createClient()` factory for initializing the SDK
  - `createMemoryAdapter()` for in-memory storage (demos & testing)
