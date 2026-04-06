# @anchor-sdk/ui

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
  - @anchor-sdk/vue@1.0.0
