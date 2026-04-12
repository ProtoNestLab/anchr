<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { createClient, createMemoryAdapter, createOfflineQueue } from '@anchor-sdk/core'
import type { User, ConnectionStatus } from '@anchor-sdk/core'
import { CollabProvider } from '@anchor-sdk/vue'
import OrderRow from './components/OrderRow.vue'
import { DEMO_USERS } from './api/users'

/** Shared identity object: adapter and client both read the same reference so switching user updates “current user” for new messages. */
const activeUser = reactive<User>({ ...DEMO_USERS[0] })
const selectedUserId = ref(DEMO_USERS[0].id)

watch(
  selectedUserId,
  (id) => {
    const u = DEMO_USERS.find((x) => x.id === id)
    if (u) {
      activeUser.id = u.id
      activeUser.name = u.name
    }
  },
  { immediate: true },
)

const rawAdapter = createMemoryAdapter(activeUser)
const offlineQueue = createOfflineQueue({
  adapter: rawAdapter,
  onStatusChange: (s: ConnectionStatus) => {
    connectionStatus.value = s
  },
})
const client = createClient({ adapter: offlineQueue.adapter, user: activeUser })

const connectionStatus = ref<ConnectionStatus>('online')
const isOffline = ref(false)

watch(isOffline, (offline) => {
  if (offline) {
    offlineQueue.goOffline()
  } else {
    offlineQueue.goOnline()
  }
})

const orders = [
  { id: 1, name: 'Order A', status: 'Pending', amount: '$42.00' },
  { id: 2, name: 'Order B', status: 'Shipped', amount: '$128.50' },
  { id: 3, name: 'Order C', status: 'Delivered', amount: '$9.99' },
]

function statusTagType(status: string) {
  if (status === 'Pending') return 'warning'
  if (status === 'Shipped') return 'primary'
  if (status === 'Delivered') return 'success'
  return 'info'
}
</script>

<template>
  <CollabProvider :client="client">
    <el-container class="demo-layout">
      <el-header class="demo-header">
        <div class="demo-header-row">
          <div class="demo-header-intro">
            <h1 class="demo-title">Orders</h1>
            <p class="demo-sub">
              Headless <code>useAnchor()</code> + <code>usePresence()</code> with optimistic
              updates, presence indicators, typing indicators, and offline queue. Pick a user
              top-right to post as different people. Toggle offline mode to test queuing.
            </p>
          </div>
          <div class="demo-controls">
            <div class="demo-user-picker">
              <span class="demo-user-label">Acting as</span>
              <el-select
                v-model="selectedUserId"
                class="demo-user-select"
                size="default"
                placeholder="User"
                aria-label="Current user for comments"
              >
                <el-option v-for="u in DEMO_USERS" :key="u.id" :label="u.name" :value="u.id" />
              </el-select>
            </div>
            <div class="demo-offline-toggle">
              <el-switch v-model="isOffline" active-text="Offline" inactive-text="Online" />
              <el-tag
                v-if="isOffline"
                size="small"
                type="warning"
                effect="dark"
                class="demo-status-tag"
              >
                Queued: {{ offlineQueue.pending }}
              </el-tag>
              <el-tag v-else size="small" type="success" effect="dark" class="demo-status-tag">
                Connected
              </el-tag>
            </div>
          </div>
        </div>
      </el-header>
      <el-main>
        <el-table :data="orders" stripe border style="width: 100%" table-layout="auto">
          <el-table-column prop="name" label="Order" min-width="140" />
          <el-table-column prop="amount" label="Amount" width="120" />
          <el-table-column label="Status" width="130">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Discussion" width="140" align="center">
            <template #default="{ row }">
              <OrderRow :anchor-id="`order-${row.id}`" />
            </template>
          </el-table-column>
        </el-table>
      </el-main>
    </el-container>
  </CollabProvider>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
}
body {
  font-family: var(--el-font-family);
}
</style>

<style scoped>
.demo-layout {
  min-height: 100vh;
  background: var(--el-bg-color-page);
}
.demo-header {
  height: auto !important;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color);
}
.demo-header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px 24px;
}
.demo-header-intro {
  flex: 1;
  min-width: 0;
}
.demo-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}
.demo-sub {
  margin: 0.4rem 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
.demo-sub code {
  font-size: 12px;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
}
.demo-controls {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  padding-top: 2px;
}
.demo-user-picker {
  display: flex;
  align-items: center;
  gap: 10px;
}
.demo-user-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
.demo-user-select {
  width: 168px;
}
.demo-offline-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}
.demo-status-tag {
  font-size: 11px;
}
</style>
