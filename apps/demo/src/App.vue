<script setup lang="ts">
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'

const client = createClient({ adapter: createMemoryAdapter() })

const orders = [
  { id: 1, name: 'Order A', status: 'Pending' },
  { id: 2, name: 'Order B', status: 'Shipped' },
  { id: 3, name: 'Order C', status: 'Delivered' },
]
</script>

<template>
  <CollabProvider :client="client">
    <div class="app">
      <h1>Orders</h1>
      <div class="order-list">
        <AnchorDiscussion v-for="order in orders" :key="order.id" :anchor-id="`order-${order.id}`">
          <div class="order-card">
            <strong>{{ order.name }}</strong>
            <span :class="['status', order.status.toLowerCase()]">
              {{ order.status }}
            </span>
          </div>
        </AnchorDiscussion>
      </div>
    </div>
  </CollabProvider>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}
.app {
  max-width: 600px;
  margin: 40px auto;
  padding: 0 20px;
}
h1 {
  margin-bottom: 20px;
}
.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.order-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
.status {
  font-size: 13px;
  padding: 2px 10px;
  border-radius: 12px;
}
.status.pending {
  background: #fff3cd;
  color: #856404;
}
.status.shipped {
  background: #cce5ff;
  color: #004085;
}
.status.delivered {
  background: #d4edda;
  color: #155724;
}
</style>
