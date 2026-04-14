# @anchor-sdk/ui

Pre-built UI components with theming support. See [Theming Guide](/guide/theming).

## Components

### `<AnchorDiscussion>`

All-in-one discussion component. Integrates Anchor + CommentButton + ThreadPopover with full feature support.

```vue
<AnchorDiscussion
  anchor-id="order-123"
  :mention-users="teamMembers"
  :virtualize="true"
  :virtualize-threshold="50"
>
  <div>Order #123</div>
</AnchorDiscussion>
```

| Prop                  | Type                                        | Required | Description                                                      |
| --------------------- | ------------------------------------------- | -------- | ---------------------------------------------------------------- |
| `anchorId`            | `string`                                    | Yes      | Unique anchor identifier                                         |
| `mentionUsers`        | `User[] \| () => User[] \| Promise<User[]>` | No       | Users available for `@mention` autocomplete                      |
| `virtualize`          | `boolean`                                   | No       | Enable virtual scrolling (default: `true`)                       |
| `virtualizeThreshold` | `number`                                    | No       | Minimum row count before virtualization kicks in (default: `50`) |

**Slot:** Default slot for anchor content.

**Features:**

- Comment button with message count and unread indicator
- Thread resolve/reopen
- Message edit/delete (own messages only)
- Emoji reactions
- Markdown editor with write/preview tabs and keyboard shortcuts (⌘B / ⌘I / ⌘K)
- File & image attachments (when the adapter implements `uploadAttachment`)
- `@mention` autocomplete with keyboard navigation
- Virtual scrolling for long threads
- Keyboard navigation (Esc to close, Enter to send)
- Real-time updates (when adapter supports it)
- Loading and error states
- Optimistic updates with rollback
- Accessible (ARIA roles, labels, keyboard support)

### `<CommentButton>`

Floating comment button with optional count badge and unread indicator.

```vue
<CommentButton :count="3" :unread="1" @click="handleClick" />
```

| Prop     | Type     | Required | Description                        |
| -------- | -------- | -------- | ---------------------------------- |
| `count`  | `number` | No       | Comment count                      |
| `unread` | `number` | No       | Unread count (shows dot indicator) |

| Event   | Description    |
| ------- | -------------- |
| `click` | Button clicked |

**Accessibility:** The button includes a dynamic `aria-label` that announces the comment count and unread count to screen readers.

### `<ThreadPopover>`

Full-featured discussion popover with error handling and loading states.

```vue
<ThreadPopover
  :threads="threads"
  :reference-el="anchorEl"
  :current-user-id="userId"
  :loading="loading"
  :error="error?.message"
  @send="handleSend"
  @close="handleClose"
  @resolve="resolveThread"
  @reopen="reopenThread"
  @delete-thread="deleteThread"
  @edit-message="editMessage"
  @delete-message="deleteMessage"
  @add-reaction="addReaction"
  @remove-reaction="removeReaction"
/>
```

| Prop            | Type                  | Required | Description                           |
| --------------- | --------------------- | -------- | ------------------------------------- |
| `threads`       | `Thread[]`            | Yes      | Threads to display                    |
| `referenceEl`   | `HTMLElement \| null` | Yes      | Positioning reference                 |
| `currentUserId` | `string`              | No       | Current user ID (enables edit/delete) |
| `loading`       | `boolean`             | No       | Show loading indicator                |
| `error`         | `string`              | No       | Error message to display              |

| Event            | Payload               | Description                                     |
| ---------------- | --------------------- | ----------------------------------------------- |
| `send`           | `content, options?`   | New message (options may include `attachments`) |
| `close`          | —                     | Close popover                                   |
| `resolve`        | `threadId`            | Resolve thread                                  |
| `reopen`         | `threadId`            | Reopen thread                                   |
| `deleteThread`   | `threadId`            | Delete thread                                   |
| `editMessage`    | `messageId, content`  | Edit message                                    |
| `deleteMessage`  | `threadId, messageId` | Delete message                                  |
| `addReaction`    | `messageId, emoji`    | Add reaction                                    |
| `removeReaction` | `messageId, emoji`    | Remove reaction                                 |

Additional props for the low-level `<ThreadPopover>`:

| Prop                  | Type                                        | Description                                             |
| --------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `mentionUsers`        | `User[] \| () => User[] \| Promise<User[]>` | Users available for `@mention` autocomplete             |
| `uploadAttachment`    | `(file: File) => Promise<Attachment>`       | Pass through from `useThreads` to enable attachments    |
| `virtualize`          | `boolean`                                   | Enable virtual scrolling (default: `true`)              |
| `virtualizeThreshold` | `number`                                    | Minimum row count before virtualization (default: `50`) |

**Accessibility:** The popover uses `role="dialog"`, all buttons have `aria-label`, the reaction picker uses `role="listbox"`, and error/loading states use `role="alert"` and `aria-live="polite"`.

## Utilities

### `renderMarkdown(text)`

Lightweight inline markdown renderer used by ThreadPopover. Supports bold, italic, inline code, strikethrough, links, and code blocks. All output is HTML-sanitized to prevent XSS.

```ts
import { renderMarkdown } from '@anchor-sdk/ui'

renderMarkdown('**hello** *world*')
// → '<strong>hello</strong> <em>world</em>'
```

**Supported syntax:**

| Syntax              | Output                                                        |
| ------------------- | ------------------------------------------------------------- |
| `**bold**`          | `<strong>bold</strong>`                                       |
| `*italic*`          | `<em>italic</em>`                                             |
| `` `code` ``        | `<code>code</code>`                                           |
| `~~strike~~`        | `<del>strike</del>`                                           |
| `[text](https://…)` | `<a href="https://…" target="_blank" rel="noopener">text</a>` |
| ` ```block``` `     | `<pre><code>block</code></pre>`                               |

Only `http://` and `https://` links are rendered — `javascript:` and other protocols are rejected.

### `<MarkdownEditor>`

Textarea with write/preview tabs, a small formatting toolbar, and keyboard shortcuts. Used internally by `ThreadPopover` and exported for custom compositions.

```vue
<MarkdownEditor v-model="text" placeholder="Comment..." :disabled="loading" @keydown="handleKey" />
```

| Prop          | Type      | Required | Description                          |
| ------------- | --------- | -------- | ------------------------------------ |
| `modelValue`  | `string`  | Yes      | Current value                        |
| `placeholder` | `string`  | No       | Textarea placeholder                 |
| `disabled`    | `boolean` | No       | Disable all input                    |
| `rows`        | `number`  | No       | Initial textarea rows (default: `3`) |

| Event               | Payload         | Description                           |
| ------------------- | --------------- | ------------------------------------- |
| `update:modelValue` | `string`        | Two-way binding                       |
| `input`             | `InputEvent`    | Raw input event (with cursor info)    |
| `keydown`           | `KeyboardEvent` | Forwarded keydown (e.g. Enter/Escape) |

**Keyboard shortcuts:** `⌘B` / `Ctrl+B` wraps selection in `**bold**`, `⌘I` in `*italic*`, `⌘K` inserts a link.

**Exposes:** `focus()` and a `textarea` getter returning the underlying element for cursor-aware features like mentions.

### `<VirtualList>`

Generic virtual-scrolling list with dynamic row heights (measured via `ResizeObserver`).

```vue
<VirtualList :items="rows" :estimated-height="60" :overscan="6" :get-key="(row) => row.id">
  <template #default="{ item, index }">
    <MessageRow :row="item" :index="index" />
  </template>
</VirtualList>
```

| Prop              | Type                                   | Required | Description                                    |
| ----------------- | -------------------------------------- | -------- | ---------------------------------------------- |
| `items`           | `T[]`                                  | Yes      | Items to render                                |
| `estimatedHeight` | `number`                               | No       | Default row height estimate (default: `80`)    |
| `overscan`        | `number`                               | No       | Extra rows rendered above/below (default: `4`) |
| `getKey`          | `(item: T, index) => string \| number` | No       | Stable key per item (defaults to index)        |

**Exposes:** `scrollToBottom()`, `scrollToIndex(index)`.
