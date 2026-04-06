# Getting Started

## Installation

```bash
pnpm add @anchor-sdk/core @anchor-sdk/vue @anchor-sdk/ui
```

## Quick Start

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
      <div>This element can be discussed</div>
    </AnchorDiscussion>
  </CollabProvider>
</template>
```

This gives you:

- Hover to show a comment button (💬)
- Click to open a discussion popover
- Create and view discussion threads

## Full Example

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
