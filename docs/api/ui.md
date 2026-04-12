# @anchor-sdk/ui

Pre-built UI components with theming support. See [Theming Guide](/guide/theming).

## Components

### `<AnchorDiscussion>`

All-in-one discussion component. Integrates Anchor + CommentButton + ThreadPopover with full feature support.

```vue
<AnchorDiscussion anchor-id="order-123">
  <div>Order #123</div>
</AnchorDiscussion>
```

| Prop       | Type     | Required | Description              |
| ---------- | -------- | -------- | ------------------------ |
| `anchorId` | `string` | Yes      | Unique anchor identifier |

**Slot:** Default slot for anchor content.

**Features:**

- Comment button with message count and unread indicator
- Thread resolve/reopen
- Message edit/delete (own messages only)
- Emoji reactions
- Markdown rendering
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

| Event            | Payload               | Description     |
| ---------------- | --------------------- | --------------- |
| `send`           | `content`             | New message     |
| `close`          | —                     | Close popover   |
| `resolve`        | `threadId`            | Resolve thread  |
| `reopen`         | `threadId`            | Reopen thread   |
| `deleteThread`   | `threadId`            | Delete thread   |
| `editMessage`    | `messageId, content`  | Edit message    |
| `deleteMessage`  | `threadId, messageId` | Delete message  |
| `addReaction`    | `messageId, emoji`    | Add reaction    |
| `removeReaction` | `messageId, emoji`    | Remove reaction |

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
