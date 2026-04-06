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

### `<ThreadPopover>`

Full-featured discussion popover.

```vue
<ThreadPopover
  :threads="threads"
  :reference-el="anchorEl"
  :current-user-id="userId"
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

## Utilities

### `renderMarkdown(text)`

Lightweight inline markdown renderer used by ThreadPopover. Supports bold, italic, inline code, strikethrough, links, and code blocks.

```ts
import { renderMarkdown } from '@anchor-sdk/ui'

renderMarkdown('**hello** *world*')
// → '<strong>hello</strong> <em>world</em>'
```
