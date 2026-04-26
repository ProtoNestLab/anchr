<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { createClient, createMemoryAdapter, createOfflineQueue } from '@anchor-sdk/core'
import type { User, ConnectionStatus } from '@anchor-sdk/core'
import { createAgentPlugin } from '@anchor-sdk/core/agent'
import type { KnowledgeBaseConfig } from '@anchor-sdk/core/agent'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'
import OrderRow from './components/OrderRow.vue'
import AgentDemo from './AgentDemo.vue'
import { DEMO_USERS, listUsers } from './api/users'
import { knowledgeBaseContent } from './knowledge-base-content'

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

/** AI Agent Configuration */
const knowledgeBaseConfig: KnowledgeBaseConfig = {
  id: 'demo-knowledge-base',
  name: 'Anchor SDK 项目解读知识库',
  documents: [
    {
      id: 'doc-1',
      name: 'Anchor SDK 项目解读.md',
      type: 'md',
      content: knowledgeBaseContent,
    },
  ],
  maxResults: 5,
  similarityThreshold: 0.7,
}

const agentPlugin = createAgentPlugin({
  kimiApiKey: import.meta.env.VITE_ARK_API_KEY || '',
  kimiModel: import.meta.env.VITE_KIMI_MODEL || 'moonshot-v1-8k',
  prompt: `你是一个专业的 Anchor SDK 技术助手，精通该项目的架构和使用方法。

你的知识库中包含完整的 Anchor SDK 项目解读文档，包括：
- 项目定位和核心价值
- 架构设计和模块划分
- 快速开始指南
- 开发和启动命令
- REST API 规范
- AI Agent 功能介绍

当用户询问关于 Anchor SDK 的问题时，请优先使用知识库工具进行检索，以提供准确的答案。

可用工具：
- knowledge_base: 检索知识库中的文档内容
- web_search: 搜索最新的外部信息
- data_analysis: 数据分析和统计

请根据用户问题选择合适的工具：
1. 如果问题涉及 Anchor SDK 的使用、架构、API等，使用知识库工具
2. 如果问题需要最新的外部信息，使用搜索工具
3. 如果需要数据分析，使用数据分析工具

回答时请直接给出答案，不需要使用工具调用格式。`,
  tools: ['knowledge_base', 'web_search', 'data_analysis'],
  knowledgeBase: knowledgeBaseConfig,
  // 如果没有 API key，自动使用 mock 模式
  mockMode: !import.meta.env.VITE_ARK_API_KEY,
})

const client = createClient({
  adapter: offlineQueue.adapter,
  user: activeUser,
  plugins: [agentPlugin],
})

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

/** v1.4 showcase: mention users resolver (async to mimic a real API) */
const teamMembers = () => listUsers()

/** Three tiles to show the all-in-one `<AnchorDiscussion>` with v1.5 features. */
const docSections = [
  {
    id: 'release-notes',
    title: 'Release Notes',
    body: 'v1.5.0 adds AI Agent support! Try @agent to analyze conversations, search for information, and generate visualizations.',
  },
  {
    id: 'roadmap',
    title: 'Roadmap',
    body: 'What should we tackle next? Try @agent 分析这个对话 or @agent 总结一下 to see the AI in action.',
  },
  {
    id: 'incidents',
    title: 'Incident Log',
    body: 'Post-mortems live here. Use @agent to analyze incident patterns and generate summaries.',
  },
]

/** AI Agent Demo Section */
const agentDemoSection = {
  id: 'ai-agent-demo',
  title: 'AI Agent Chat',
  body: 'Try these commands:\n- @agent 分析一下当前的订单情况\n- @agent 总结对话内容\n- @agent 搜索最新的AI技术\n- @agent 帮我分析一下数据',
}

/** Navigation state */
const currentView = ref('main')

function statusTagType(status: string) {
  if (status === 'Pending') return 'warning'
  if (status === 'Shipped') return 'primary'
  if (status === 'Delivered') return 'success'
  return 'info'
}
</script>

<template>
  <CollabProvider :client="client">
    <div class="demo-container">
      <!-- Navigation -->
      <nav class="demo-nav">
        <div class="demo-nav-content">
          <h1 class="demo-nav-title">Anchor SDK</h1>
          <div class="demo-nav-links">
            <el-button
              :type="currentView === 'main' ? 'primary' : 'default'"
              @click="currentView = 'main'"
            >
              主Demo
            </el-button>
            <el-button
              :type="currentView === 'agent' ? 'primary' : 'default'"
              @click="currentView = 'agent'"
            >
              Agent功能测试
            </el-button>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <div v-if="currentView === 'main'" class="demo-content">
        <el-container class="demo-layout">
          <el-header class="demo-header">
            <div class="demo-header-row">
              <div class="demo-header-intro">
                <h1 class="demo-title">Orders</h1>
                <p class="demo-sub">
                  Anchor SDK v1.5 — now with AI Agent support! Try typing
                  <code>@agent 分析对话</code>
                  in any discussion to activate the AI assistant. Features: markdown editing,
                  attachments, @mentions, virtual scrolling, presence, typing, offline queue, and AI
                  Agent.
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
            <section class="demo-section">
              <header class="demo-section-head">
                <h2 class="demo-section-title">Headless composables</h2>
                <p class="demo-section-sub">
                  <code>useAnchor()</code> + <code>usePresence()</code> driving a custom popover
                  with Element Plus. Optimistic updates, presence dots, typing indicators, and the
                  offline queue.
                </p>
              </header>
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
            </section>

            <section class="demo-section">
              <header class="demo-section-head">
                <h2 class="demo-section-title">All-in-one &lt;AnchorDiscussion&gt;</h2>
                <p class="demo-section-sub">
                  v1.4 features: markdown editor with preview and keyboard shortcuts, file/image
                  attachments (via the memory adapter's <code>uploadAttachment</code>), @mention
                  autocomplete driven by <code>useMentions</code>, and virtual scrolling for long
                  threads. Hover a card and click the speech-bubble button.
                </p>
              </header>
              <div class="demo-cards">
                <AnchorDiscussion
                  v-for="s in docSections"
                  :key="s.id"
                  :anchor-id="`doc-${s.id}`"
                  :mention-users="teamMembers"
                  :virtualize="true"
                  :virtualize-threshold="30"
                >
                  <article class="demo-card">
                    <h3 class="demo-card-title">{{ s.title }}</h3>
                    <p class="demo-card-body">{{ s.body }}</p>
                  </article>
                </AnchorDiscussion>
              </div>
            </section>

            <section class="demo-section">
              <header class="demo-section-head">
                <h2 class="demo-section-title">AI Agent Demo</h2>
                <p class="demo-section-sub">
                  Type <code>@agent</code> followed by your question to activate the AI assistant.
                  Try: <code>@agent 分析对话</code>, <code>@agent 总结一下</code>, or
                  <code>@agent 搜索最新技术</code>.
                </p>
              </header>
              <div class="demo-agent-card">
                <AnchorDiscussion
                  :anchor-id="`agent-demo`"
                  :mention-users="teamMembers"
                  :virtualize="true"
                  :virtualize-threshold="30"
                >
                  <article class="demo-card agent-card">
                    <div class="agent-icon">🤖</div>
                    <h3 class="demo-card-title">{{ agentDemoSection.title }}</h3>
                    <pre class="demo-card-body agent-body">{{ agentDemoSection.body }}</pre>
                  </article>
                </AnchorDiscussion>
              </div>
            </section>
          </el-main>
        </el-container>
      </div>

      <!-- Agent Demo Content -->
      <div v-else-if="currentView === 'agent'" class="demo-content">
        <AgentDemo />
      </div>
    </div>
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
.demo-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.demo-nav {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: 12px 24px;
}

.demo-nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-nav-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.demo-nav-links {
  display: flex;
  gap: 12px;
}

.demo-content {
  flex: 1;
}

.demo-layout {
  min-height: 100%;
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
  max-width: 1200px;
  margin: 0 auto;
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
.demo-section {
  margin-bottom: 24px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}
.demo-section + .demo-section {
  margin-top: 32px;
}
.demo-section-head {
  margin-bottom: 12px;
}
.demo-section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.demo-section-sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.55;
}
.demo-section-sub code {
  font-size: 11px;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
}
.demo-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.demo-card {
  padding: 16px 18px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  min-height: 110px;
}
.demo-card-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.demo-card-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}
.demo-agent-card {
  max-width: 600px;
}
.agent-card {
  position: relative;
  border: 2px solid #4f46e5;
  background: linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%);
}
.agent-icon {
  position: absolute;
  top: -12px;
  right: 16px;
  font-size: 28px;
}
.agent-body {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 12px;
  color: #64748b;
}

/* Main content container */
el-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

@media (max-width: 768px) {
  .demo-nav-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .demo-nav-links {
    width: 100%;
    justify-content: space-between;
  }

  .demo-nav-links .el-button {
    flex: 1;
  }
}
</style>
