# Anchor SDK

A Vue 3 UI anchor discussion SDK: attach comment and discussion threads to any UI element.  
基于 Vue 3 的 UI 锚点讨论 SDK，可将评论/讨论线程附加到任意 UI 元素上。

**[English](#english)** · **[中文](#chinese)**

<a id="english"></a>

---

## Installation

```bash
pnpm add @anchor-sdk/core @anchor-sdk/vue @anchor-sdk/ui
```

---

## Quick start

```vue
<script setup lang="ts">
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'

const client = createClient({ adapter: createMemoryAdapter() })
</script>

<template>
  <CollabProvider :client="client">
    <AnchorDiscussion anchor-id="my-element">
      <div>This element can be commented on</div>
    </AnchorDiscussion>
  </CollabProvider>
</template>
```

This gives you: hover shows a comment button 💬, click opens the discussion panel, with create and read flows for threads.

---

## Packages

| Package            | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| `@anchor-sdk/core` | Core types, client factory, adapter interface                  |
| `@anchor-sdk/vue`  | Vue 3 components (Provider, Anchor) and composables            |
| `@anchor-sdk/ui`   | Ready-made UI (comment button, popover, all-in-one discussion) |

---

## @anchor-sdk/core

### Types

#### `Anchor`

```ts
type Anchor = {
  id: string // Unique anchor id
  type?: string // Optional category
}
```

#### `Message`

```ts
type Message = {
  id: string // Unique message id
  content: string // Message body
  createdAt: number // Created at (ms since epoch)
  user: {
    id: string // User id
    name: string // Display name
  }
}
```

#### `Thread`

```ts
type Thread = {
  id: string // Unique thread id
  anchorId: string // Owning anchor id
  messages: Message[] // Messages in the thread
  resolved: boolean // Resolved flag
}
```

#### `Adapter` (interface)

```ts
interface Adapter {
  getThreads(anchorId: string): Promise<Thread[]>
  createThread(anchorId: string, content: string): Promise<Thread>
  addMessage(threadId: string, content: string): Promise<Message>
}
```

Persistence adapter contract; backend implementations should satisfy this interface.

| Method         | Arguments                           | Returns             | Description                  |
| -------------- | ----------------------------------- | ------------------- | ---------------------------- |
| `getThreads`   | `anchorId: string`                  | `Promise<Thread[]>` | Threads for an anchor        |
| `createThread` | `anchorId: string, content: string` | `Promise<Thread>`   | New thread under an anchor   |
| `addMessage`   | `threadId: string, content: string` | `Promise<Message>`  | Append a message to a thread |

---

### Functions

#### `createClient(options)`

Creates an SDK client.

```ts
import { createClient } from '@anchor-sdk/core'

const client = createClient({
  adapter: myAdapter, // Object implementing Adapter
})
```

| Option            | Type      | Description           |
| ----------------- | --------- | --------------------- |
| `options.adapter` | `Adapter` | Data adapter instance |

**Returns:** A `Client` (includes `adapter`).

---

#### `createMemoryAdapter()`

In-memory adapter for demos and tests; data is lost on refresh.

```ts
import { createMemoryAdapter } from '@anchor-sdk/core'

const adapter = createMemoryAdapter()
```

**Returns:** An object that implements `Adapter`.

---

## @anchor-sdk/vue

### Components

#### `<CollabProvider>`

Root provider: injects the client for descendants via Vue DI.

```vue
<template>
  <CollabProvider :client="client">
    <App />
  </CollabProvider>
</template>
```

| Prop     | Type     | Required | Description                  |
| -------- | -------- | -------- | ---------------------------- |
| `client` | `Client` | Yes      | Client from `createClient()` |

**Slot:** default — app content.

---

#### `<Anchor>`

Wraps content as a discussable anchor. Exposes hover state and an `overlay` slot for custom UI.

```vue
<template>
  <Anchor id="order-123">
    <!-- default: anchored content -->
    <div>Order #123</div>

    <!-- overlay: floating layer -->
    <template #overlay="{ hovered }">
      <CommentButton v-if="hovered" @click="openPopover" />
    </template>
  </Anchor>
</template>
```

| Prop | Type     | Required | Description      |
| ---- | -------- | -------- | ---------------- |
| `id` | `string` | Yes      | Unique anchor id |

| Slot      | Scope                  | Description                       |
| --------- | ---------------------- | --------------------------------- |
| `default` | —                      | Anchored content                  |
| `overlay` | `{ hovered: boolean }` | Overlay; show/hide based on hover |

---

### Composables

#### `useThreads(anchorId)`

Manages threads for an anchor; fetches on mount.

```ts
import { useThreads } from '@anchor-sdk/vue'

const { threads, createThread, addMessage, refresh } = useThreads('order-123')
```

| Argument   | Type     | Description |
| ---------- | -------- | ----------- |
| `anchorId` | `string` | Anchor id   |

**Return value:**

| Property                        | Type                                                   | Description          |
| ------------------------------- | ------------------------------------------------------ | -------------------- |
| `threads`                       | `Ref<Thread[]>`                                        | Reactive thread list |
| `createThread(content)`         | `(content: string) => Promise<void>`                   | Create a thread      |
| `addMessage(threadId, content)` | `(threadId: string, content: string) => Promise<void>` | Add a message        |
| `refresh()`                     | `() => Promise<void>`                                  | Reload threads       |

---

#### `useClient()`

Reads the client from DI. Must be used under `<CollabProvider>`.

```ts
import { useClient } from '@anchor-sdk/vue'

const client = useClient()
// e.g. client.adapter for low-level use
```

**Returns:** `Client`. Throws if no provider.

---

#### `provideClient(client)`

Manually provide the client when not using `<CollabProvider>`.

```ts
import { provideClient } from '@anchor-sdk/vue'
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'

// in setup
const client = createClient({ adapter: createMemoryAdapter() })
provideClient(client)
```

---

## @anchor-sdk/ui

### Components

#### `<AnchorDiscussion>`

All-in-one: `Anchor` + `CommentButton` + `ThreadPopover`. Easiest integration path.

```vue
<template>
  <AnchorDiscussion anchor-id="order-123">
    <div>Order #123</div>
  </AnchorDiscussion>
</template>
```

| Prop       | Type     | Required | Description      |
| ---------- | -------- | -------- | ---------------- |
| `anchorId` | `string` | Yes      | Unique anchor id |

**Slot:** default — anchored content.

**Behavior:**

- Comment button (with count) on hover or when comments exist
- Click opens the discussion popover
- Handles thread creation and sending messages

---

#### `<CommentButton>`

Floating comment button with 💬 and optional count badge.

```vue
<CommentButton :count="3" @click="handleClick" />
```

| Prop    | Type     | Required | Description                     |
| ------- | -------- | -------- | ------------------------------- |
| `count` | `number` | No       | When set, shows a numeric badge |

| Event   | Payload | Description    |
| ------- | ------- | -------------- |
| `click` | —       | Button clicked |

---

#### `<ThreadPopover>`

Discussion popover positioned with `@floating-ui/vue`; lists threads and includes an input.

```vue
<ThreadPopover
  :threads="threads"
  :reference-el="anchorElement"
  @send="handleSend"
  @close="handleClose"
/>
```

| Prop          | Type                  | Required | Description                       |
| ------------- | --------------------- | -------- | --------------------------------- |
| `threads`     | `Thread[]`            | Yes      | Threads to render                 |
| `referenceEl` | `HTMLElement \| null` | Yes      | Reference element for positioning |

| Event   | Payload           | Description                  |
| ------- | ----------------- | ---------------------------- |
| `send`  | `content: string` | User sent a message          |
| `close` | —                 | Closed (e.g. backdrop click) |

**Details:**

- Width 320px, max height 400px
- Empty state when there are no messages
- Messages show user name, time, and body
- Teleported to `<body>`

---

## Custom adapter

Implement `Adapter` to plug in any backend:

```ts
import type { Adapter, Thread, Message } from '@anchor-sdk/core'

const myApiAdapter: Adapter = {
  async getThreads(anchorId) {
    const res = await fetch(`/api/threads?anchorId=${anchorId}`)
    return res.json()
  },

  async createThread(anchorId, content) {
    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anchorId, content }),
    })
    return res.json()
  },

  async addMessage(threadId, content) {
    const res = await fetch(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    return res.json()
  },
}

const client = createClient({ adapter: myApiAdapter })
```

---

## Full examples

### Basic (batteries included)

```vue
<script setup lang="ts">
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'

const client = createClient({ adapter: createMemoryAdapter() })

const orders = [
  { id: 1, name: 'Order A', status: 'Pending' },
  { id: 2, name: 'Order B', status: 'Shipped' },
]
</script>

<template>
  <CollabProvider :client="client">
    <div v-for="order in orders" :key="order.id">
      <AnchorDiscussion :anchor-id="`order-${order.id}`">
        <div class="order-card">
          <h3>{{ order.name }}</h3>
          <span>{{ order.status }}</span>
        </div>
      </AnchorDiscussion>
    </div>
  </CollabProvider>
</template>
```

### Advanced (custom UI)

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { Anchor, useThreads } from '@anchor-sdk/vue'
import { CommentButton, ThreadPopover } from '@anchor-sdk/ui'

const anchorId = 'custom-element'
const { threads, createThread, addMessage } = useThreads(anchorId)

const showPopover = ref(false)
const anchorEl = ref<HTMLElement | null>(null)

const totalMessages = computed(() => threads.value.reduce((sum, t) => sum + t.messages.length, 0))

async function handleSend(content: string) {
  if (threads.value.length > 0) {
    await addMessage(threads.value[0].id, content)
  } else {
    await createThread(content)
  }
}
</script>

<template>
  <Anchor :id="anchorId">
    <div ref="anchorEl">Custom content</div>

    <template #overlay="{ hovered }">
      <CommentButton
        v-if="hovered || threads.length > 0"
        :count="totalMessages"
        @click="showPopover = true"
      />
    </template>
  </Anchor>

  <ThreadPopover
    v-if="showPopover"
    :threads="threads"
    :reference-el="anchorEl"
    @send="handleSend"
    @close="showPopover = false"
  />
</template>
```

---

<a id="chinese"></a>

## 中文文档

### 安装

```bash
pnpm add @anchor-sdk/core @anchor-sdk/vue @anchor-sdk/ui
```

### 快速开始

```vue
<script setup lang="ts">
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'

const client = createClient({ adapter: createMemoryAdapter() })
</script>

<template>
  <CollabProvider :client="client">
    <AnchorDiscussion anchor-id="my-element">
      <div>这个元素可以被评论</div>
    </AnchorDiscussion>
  </CollabProvider>
</template>
```

以上代码即可实现：悬停元素显示评论按钮 💬，点击打开评论面板，支持创建和查看讨论线程。

### 包概览

| 包                 | 说明                                                 |
| ------------------ | ---------------------------------------------------- |
| `@anchor-sdk/core` | 核心类型定义、客户端工厂、适配器接口                 |
| `@anchor-sdk/vue`  | Vue 3 组件（Provider、Anchor）和 Composable          |
| `@anchor-sdk/ui`   | 开箱即用的 UI 组件（评论按钮、弹窗、一体化讨论组件） |

### @anchor-sdk/core

#### 类型定义

##### `Anchor`

```ts
type Anchor = {
  id: string // 锚点唯一标识
  type?: string // 可选的类型分类
}
```

##### `Message`

```ts
type Message = {
  id: string // 消息唯一标识
  content: string // 消息文本内容
  createdAt: number // 创建时间戳（毫秒）
  user: {
    id: string // 用户 ID
    name: string // 用户名称
  }
}
```

##### `Thread`

```ts
type Thread = {
  id: string // 线程唯一标识
  anchorId: string // 所属锚点 ID
  messages: Message[] // 消息列表
  resolved: boolean // 是否已解决
}
```

##### `Adapter`（接口）

```ts
interface Adapter {
  getThreads(anchorId: string): Promise<Thread[]>
  createThread(anchorId: string, content: string): Promise<Thread>
  addMessage(threadId: string, content: string): Promise<Message>
}
```

数据持久化适配器接口，所有后端实现需遵循此接口。

| 方法           | 参数                                | 返回值              | 说明                   |
| -------------- | ----------------------------------- | ------------------- | ---------------------- |
| `getThreads`   | `anchorId: string`                  | `Promise<Thread[]>` | 获取指定锚点的所有线程 |
| `createThread` | `anchorId: string, content: string` | `Promise<Thread>`   | 在锚点下创建新线程     |
| `addMessage`   | `threadId: string, content: string` | `Promise<Message>`  | 向线程添加消息         |

#### 函数

##### `createClient(options)`

创建 SDK 客户端实例。

```ts
import { createClient } from '@anchor-sdk/core'

const client = createClient({
  adapter: myAdapter, // 实现 Adapter 接口的对象
})
```

| 参数              | 类型      | 说明           |
| ----------------- | --------- | -------------- |
| `options.adapter` | `Adapter` | 数据适配器实例 |

**返回值：** `Client` 对象（包含 `adapter` 属性）。

##### `createMemoryAdapter()`

创建一个内存适配器，适用于演示和测试场景，数据存储在内存中，刷新页面后数据丢失。

```ts
import { createMemoryAdapter } from '@anchor-sdk/core'

const adapter = createMemoryAdapter()
```

**返回值：** 符合 `Adapter` 接口的对象。

### @anchor-sdk/vue

#### 组件

##### `<CollabProvider>`

根级 Provider 组件，通过 Vue 依赖注入为所有后代组件提供 Client 实例。

```vue
<template>
  <CollabProvider :client="client">
    <App />
  </CollabProvider>
</template>
```

| Prop     | 类型     | 必填 | 说明                                   |
| -------- | -------- | ---- | -------------------------------------- |
| `client` | `Client` | 是   | 通过 `createClient()` 创建的客户端实例 |

**插槽：** 默认插槽，放置应用内容。

##### `<Anchor>`

将内容包裹为可讨论的锚点区域。提供 hover 状态和 overlay 插槽，用于自定义 UI 交互。

```vue
<template>
  <Anchor id="order-123">
    <!-- 默认插槽：被锚定的内容 -->
    <div>Order #123</div>

    <!-- overlay 插槽：自定义浮层 -->
    <template #overlay="{ hovered }">
      <CommentButton v-if="hovered" @click="openPopover" />
    </template>
  </Anchor>
</template>
```

| Prop | 类型     | 必填 | 说明         |
| ---- | -------- | ---- | ------------ |
| `id` | `string` | 是   | 锚点唯一标识 |

| 插槽      | 作用域参数             | 说明                                    |
| --------- | ---------------------- | --------------------------------------- |
| `default` | —                      | 被锚定的内容                            |
| `overlay` | `{ hovered: boolean }` | 浮层区域，可根据 hover 状态决定显示内容 |

#### Composables

##### `useThreads(anchorId)`

管理指定锚点的讨论线程，组件挂载时自动拉取数据。

```ts
import { useThreads } from '@anchor-sdk/vue'

const { threads, createThread, addMessage, refresh } = useThreads('order-123')
```

| 参数       | 类型     | 说明    |
| ---------- | -------- | ------- |
| `anchorId` | `string` | 锚点 ID |

**返回值：**

| 属性                            | 类型                                                   | 说明             |
| ------------------------------- | ------------------------------------------------------ | ---------------- |
| `threads`                       | `Ref<Thread[]>`                                        | 响应式的线程列表 |
| `createThread(content)`         | `(content: string) => Promise<void>`                   | 创建新线程       |
| `addMessage(threadId, content)` | `(threadId: string, content: string) => Promise<void>` | 向线程添加消息   |
| `refresh()`                     | `() => Promise<void>`                                  | 手动刷新线程数据 |

##### `useClient()`

从依赖注入中获取 Client 实例。需在 `<CollabProvider>` 后代组件中使用。

```ts
import { useClient } from '@anchor-sdk/vue'

const client = useClient()
// 直接访问 client.adapter 进行底层操作
```

**返回值：** `Client` 实例。如果未提供 Provider，将抛出错误。

##### `provideClient(client)`

手动注入 Client 实例（在不使用 `<CollabProvider>` 组件时）。

```ts
import { provideClient } from '@anchor-sdk/vue'
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'

// 在 setup 中调用
const client = createClient({ adapter: createMemoryAdapter() })
provideClient(client)
```

### @anchor-sdk/ui

#### 组件

##### `<AnchorDiscussion>`

一体化讨论组件，内部集成 `Anchor` + `CommentButton` + `ThreadPopover`，是最简单的接入方式。

```vue
<template>
  <AnchorDiscussion anchor-id="order-123">
    <div>Order #123</div>
  </AnchorDiscussion>
</template>
```

| Prop       | 类型     | 必填 | 说明         |
| ---------- | -------- | ---- | ------------ |
| `anchorId` | `string` | 是   | 锚点唯一标识 |

**插槽：** 默认插槽，放置被锚定的内容。

**行为：**

- 悬停或存在评论时显示评论按钮（带消息计数）
- 点击按钮打开评论弹窗
- 自动管理线程创建和消息发送

##### `<CommentButton>`

评论浮动按钮，显示 💬 图标和可选的评论计数。

```vue
<CommentButton :count="3" @click="handleClick" />
```

| Prop    | 类型     | 必填 | 说明                         |
| ------- | -------- | ---- | ---------------------------- |
| `count` | `number` | 否   | 评论数量，传入时显示数字角标 |

| 事件    | 参数 | 说明             |
| ------- | ---- | ---------------- |
| `click` | —    | 按钮被点击时触发 |

##### `<ThreadPopover>`

讨论弹窗，使用 `@floating-ui/vue` 进行定位，展示线程消息列表和输入框。

```vue
<ThreadPopover
  :threads="threads"
  :reference-el="anchorElement"
  @send="handleSend"
  @close="handleClose"
/>
```

| Prop          | 类型                  | 必填 | 说明             |
| ------------- | --------------------- | ---- | ---------------- |
| `threads`     | `Thread[]`            | 是   | 要展示的线程数组 |
| `referenceEl` | `HTMLElement \| null` | 是   | 弹窗定位参考元素 |

| 事件    | 参数              | 说明                               |
| ------- | ----------------- | ---------------------------------- |
| `send`  | `content: string` | 用户发送消息时触发                 |
| `close` | —                 | 用户关闭弹窗时触发（点击背景遮罩） |

**特性：**

- 弹窗宽度 320px，最大高度 400px
- 无评论时显示空状态提示
- 消息展示包含用户名、时间和内容
- 通过 Teleport 渲染到 `<body>`

### 自定义适配器

实现 `Adapter` 接口即可对接任意后端：

```ts
import type { Adapter, Thread, Message } from '@anchor-sdk/core'

const myApiAdapter: Adapter = {
  async getThreads(anchorId) {
    const res = await fetch(`/api/threads?anchorId=${anchorId}`)
    return res.json()
  },

  async createThread(anchorId, content) {
    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anchorId, content }),
    })
    return res.json()
  },

  async addMessage(threadId, content) {
    const res = await fetch(`/api/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    return res.json()
  },
}

const client = createClient({ adapter: myApiAdapter })
```

### 完整示例

#### 基础用法（开箱即用）

```vue
<script setup lang="ts">
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'

const client = createClient({ adapter: createMemoryAdapter() })

const orders = [
  { id: 1, name: 'Order A', status: 'Pending' },
  { id: 2, name: 'Order B', status: 'Shipped' },
]
</script>

<template>
  <CollabProvider :client="client">
    <div v-for="order in orders" :key="order.id">
      <AnchorDiscussion :anchor-id="`order-${order.id}`">
        <div class="order-card">
          <h3>{{ order.name }}</h3>
          <span>{{ order.status }}</span>
        </div>
      </AnchorDiscussion>
    </div>
  </CollabProvider>
</template>
```

#### 高级用法（自定义 UI）

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { Anchor, useThreads } from '@anchor-sdk/vue'
import { CommentButton, ThreadPopover } from '@anchor-sdk/ui'

const anchorId = 'custom-element'
const { threads, createThread, addMessage } = useThreads(anchorId)

const showPopover = ref(false)
const anchorEl = ref<HTMLElement | null>(null)

const totalMessages = computed(() => threads.value.reduce((sum, t) => sum + t.messages.length, 0))

async function handleSend(content: string) {
  if (threads.value.length > 0) {
    await addMessage(threads.value[0].id, content)
  } else {
    await createThread(content)
  }
}
</script>

<template>
  <Anchor :id="anchorId">
    <div ref="anchorEl">自定义内容</div>

    <template #overlay="{ hovered }">
      <CommentButton
        v-if="hovered || threads.length > 0"
        :count="totalMessages"
        @click="showPopover = true"
      />
    </template>
  </Anchor>

  <ThreadPopover
    v-if="showPopover"
    :threads="threads"
    :reference-el="anchorEl"
    @send="handleSend"
    @close="showPopover = false"
  />
</template>
```
