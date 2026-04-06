# @anchor-sdk/ui

Pre-built UI components for discussions.

## Components

### `<AnchorDiscussion>`

All-in-one discussion component. Integrates `Anchor` + `CommentButton` + `ThreadPopover`.

```vue
<AnchorDiscussion anchor-id="order-123">
  <div>Order #123</div>
</AnchorDiscussion>
```

| Prop       | Type     | Required | Description              |
| ---------- | -------- | -------- | ------------------------ |
| `anchorId` | `string` | Yes      | Unique anchor identifier |

**Slot:** Default slot for anchor content.

**Behavior:**

- Shows comment button on hover or when comments exist
- Displays message count badge
- Manages thread creation and messaging automatically

### `<CommentButton>`

Floating comment button with optional count badge.

```vue
<CommentButton :count="3" @click="handleClick" />
```

| Prop    | Type     | Required | Description              |
| ------- | -------- | -------- | ------------------------ |
| `count` | `number` | No       | Comment count to display |

| Event   | Payload | Description             |
| ------- | ------- | ----------------------- |
| `click` | —       | Emitted on button click |

### `<ThreadPopover>`

Discussion popover positioned with `@floating-ui/vue`.

```vue
<ThreadPopover
  :threads="threads"
  :reference-el="anchorEl"
  @send="handleSend"
  @close="handleClose"
/>
```

| Prop          | Type                  | Required | Description                   |
| ------------- | --------------------- | -------- | ----------------------------- |
| `threads`     | `Thread[]`            | Yes      | Threads to display            |
| `referenceEl` | `HTMLElement \| null` | Yes      | Positioning reference element |

| Event   | Payload           | Description             |
| ------- | ----------------- | ----------------------- |
| `send`  | `content: string` | User sends a message    |
| `close` | —                 | User closes the popover |
