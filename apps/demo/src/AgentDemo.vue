<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { createClient, createMemoryAdapter, createOfflineQueue } from '@anchor-sdk/core'
import type { User } from '@anchor-sdk/core'
import { createAgentPlugin } from '@anchor-sdk/core/agent'
import type { KnowledgeBaseConfig } from '@anchor-sdk/core/agent'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'
import { useAnchor, usePresence } from '@anchor-sdk/vue'
import { DEMO_USERS } from './api/users'
import { knowledgeBaseContent } from './knowledge-base-content'

/** Shared identity object */
const activeUser = reactive<User>({ ...DEMO_USERS[0] })

const rawAdapter = createMemoryAdapter(activeUser)
const offlineQueue = createOfflineQueue({ adapter: rawAdapter })

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
  prompt: `你是一个专业的AI助手，帮助用户分析和解决问题。
你可以使用以下工具：
1. web_search：网络搜索，获取最新信息
2. knowledge_base：查询知识库，获取产品文档和FAQ
3. calculator：数学计算，处理算术运算
4. data_analysis：数据分析，进行统计计算、趋势分析等

请根据用户的问题选择合适的工具来回答。`,
  tools: ['web_search', 'knowledge_base', 'calculator', 'data_analysis'],
  knowledgeBase: knowledgeBaseConfig,
  mockMode: !import.meta.env.VITE_ARK_API_KEY,
})

const client = createClient({
  adapter: offlineQueue.adapter,
  user: activeUser,
  plugins: [agentPlugin],
})

/** Demo sections for each functionality */
const demoSections = [
  {
    id: 'knowledge-base-demo',
    title: '知识库查询',
    body: '测试指令：\n- @agent Anchor SDK 的核心价值是什么？\n- @agent Anchor SDK 的项目架构是什么？\n- @agent 如何安装 Anchor SDK？\n- @agent Anchor SDK 支持哪些工具？\n- @agent Anchor SDK 的环境要求是什么？\n- @agent AI Agent 模块包含哪些组件？\n- @agent REST API 规范有哪些？\n- @agent Anchor SDK 当前版本是多少？\n- @agent 如何启动演示应用？\n- @agent 插件系统的作用是什么？',
  },
  {
    id: 'calculation-demo',
    title: '数学计算',
    body: '测试指令：\n- @agent 计算 123 + 456\n- @agent 计算 987 * 654\n- @agent 计算 sqrt(16)\n- @agent 计算 sin(30)',
  },
  {
    id: 'data-analysis-demo',
    title: '数据分析',
    body: '测试指令：\n- @agent 分析数据 [10, 20, 30, 40, 50] 的描述性统计\n- @agent 分析数据 [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100] 的异常值\n- @agent 分析数据 [5, 8, 12, 15, 20, 25] 的趋势',
  },
  {
    id: 'visualization-demo',
    title: '数据可视化',
    body: '测试指令：\n- @agent 生成柱状图，标题为"季度收入"，数据为 [{name:"Q1",value:100},{name:"Q2",value:150},{name:"Q3",value:180},{name:"Q4",value:220}]\n- @agent 生成饼图，标题为"市场份额"，数据为 [{name:"A公司",value:40},{name:"B公司",value:30},{name:"C公司",value:30}]',
  },
  {
    id: 'chat-analysis-demo',
    title: '对话分析',
    body: '测试步骤：\n1. 先发送几条消息\n2. 然后发送：@agent 分析我们的对话\n3. 再发送：@agent 总结对话内容',
  },
]

/** Headless Demo Section */
const headlessAnchorId = 'headless-demo'

const {
  threads: headlessThreads,
  loading: headlessLoading,
  error: headlessError,
  agentIsLoading: headlessAgentIsLoading,
  unreadCount: headlessUnreadCount,
  currentUser: headlessCurrentUser,
  send: headlessSend,
  editMessage: headlessEditMessage,
  deleteMessage: headlessDeleteMessage,
  resolveThread: headlessResolveThread,
  reopenThread: headlessReopenThread,
  deleteThread: headlessDeleteThread,
  addReaction: headlessAddReaction,
  removeReaction: headlessRemoveReaction,
} = useAnchor(headlessAnchorId)

const {
  presence: headlessPresence,
  typingUsers: headlessTypingUsers,
  startTyping: headlessStartTyping,
  stopTyping: headlessStopTyping,
} = usePresence(headlessAnchorId)

const headlessInput = ref('')
const headlessEditInput = ref('')
const headlessEditingId = ref<string | null>(null)

const headlessTotalMessages = computed(() =>
  headlessThreads.value.reduce((n, t) => n + t.messages.length, 0),
)

const headlessOtherPresence = computed(() =>
  headlessPresence.value.filter((p) => p.user.id !== headlessCurrentUser.id),
)

const headlessOtherTyping = computed(() =>
  headlessTypingUsers.value.filter((u) => u.id !== headlessCurrentUser.id),
)

function headlessAvatarStyle(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  const hue = Math.abs(h) % 360
  return {
    background: `linear-gradient(145deg, hsl(${hue}, 48%, 44%), hsl(${(hue + 40) % 360}, 52%, 36%))`,
  }
}

function headlessInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function headlessFormatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function headlessHandleSend() {
  const text = headlessInput.value.trim()
  if (!text) return
  await headlessStopTyping()
  await headlessSend(text)
  headlessInput.value = ''
}

function headlessHandleInput() {
  void headlessStartTyping()
}

function headlessHandleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void headlessHandleSend()
  }
}

function headlessGroupReactions(reactions: { emoji: string; userId: string }[]) {
  const map = new Map<string, string[]>()
  for (const r of reactions) {
    if (!map.has(r.emoji)) map.set(r.emoji, [])
    map.get(r.emoji)!.push(r.userId)
  }
  return Array.from(map.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    active: userIds.includes(headlessCurrentUser.id),
  }))
}

function headlessCanReactTo(msg: { user: { id: string } }) {
  return msg.user.id !== headlessCurrentUser.id
}

function headlessToggleReaction(
  messageId: string,
  emoji: string,
  reactions: { emoji: string; userId: string }[],
  authorId: string,
) {
  if (authorId === headlessCurrentUser.id) return
  const hasReacted = reactions.some((r) => r.emoji === emoji && r.userId === headlessCurrentUser.id)
  if (hasReacted) void headlessRemoveReaction(messageId, emoji)
  else void headlessAddReaction(messageId, emoji)
}

function headlessStartEdit(msg: { id: string; content: string }) {
  headlessEditingId.value = msg.id
  headlessEditInput.value = msg.content
}

async function headlessConfirmEdit(messageId: string) {
  const text = headlessEditInput.value.trim()
  if (text) await headlessEditMessage(messageId, text)
  headlessEditingId.value = null
}

function headlessCancelEdit() {
  headlessEditingId.value = null
}

async function headlessHandleDeleteMessage(threadId: string, messageId: string) {
  await headlessDeleteMessage(threadId, messageId)
}

async function headlessHandleResolve(threadId: string) {
  await headlessResolveThread(threadId)
}

async function headlessHandleReopen(threadId: string) {
  await headlessReopenThread(threadId)
}

async function headlessHandleDeleteThread(threadId: string) {
  await headlessDeleteThread(threadId)
}
</script>

<template>
  <CollabProvider :client="client">
    <div class="agent-demo-container">
      <header class="agent-demo-header">
        <h1>Agent 功能测试</h1>
        <p>测试 agent 的四个核心功能：知识库信息获取分析、聊天上下文分析、计算、数据分析与可视化</p>
      </header>

      <main class="agent-demo-main">
        <section v-for="section in demoSections" :key="section.id" class="demo-section">
          <div class="demo-section-header">
            <h2>{{ section.title }}</h2>
          </div>
          <div class="demo-section-content">
            <AnchorDiscussion :anchor-id="section.id" :virtualize="true" :virtualize-threshold="30">
              <article class="demo-card">
                <h3 class="demo-card-title">{{ section.title }}</h3>
                <pre class="demo-card-body">{{ section.body }}</pre>
              </article>
            </AnchorDiscussion>
          </div>
        </section>

        <section class="demo-section headless-demo-section">
          <div class="demo-section-header">
            <h2>Headless 模式</h2>
            <p class="demo-section-sub">
              使用 <code>useAnchor()</code> 和 <code>usePresence()</code> 实现完全自定义的
              UI，完全控制渲染逻辑，保留所有讨论功能。
            </p>
          </div>
          <div class="demo-section-content">
            <div class="headless-demo-wrapper">
              <div class="headless-panel">
                <div class="headless-panel-header">
                  <h3>Headless Chat</h3>
                  <div class="headless-header-badges">
                    <span class="headless-badge"> {{ headlessTotalMessages }} messages </span>
                    <span v-if="headlessUnreadCount" class="headless-badge headless-badge-unread">
                      {{ headlessUnreadCount }} new
                    </span>
                    <span
                      v-if="headlessOtherPresence.length"
                      class="headless-badge headless-badge-presence"
                    >
                      {{ headlessOtherPresence.length }} online
                    </span>
                  </div>
                </div>

                <div class="headless-panel-body">
                  <div v-if="headlessLoading" class="headless-loading">Loading...</div>
                  <div v-if="headlessError" class="headless-error">
                    {{ headlessError.message }}
                  </div>
                  <div v-if="headlessAgentIsLoading" class="headless-agent-loading">
                    <span class="headless-agent-spinner"></span>
                    Agent 思考中...
                  </div>

                  <div
                    v-if="
                      !headlessLoading &&
                      !headlessError &&
                      !headlessAgentIsLoading &&
                      headlessThreads.length === 0
                    "
                    class="headless-empty"
                  >
                    <p>No messages yet. Start the conversation below!</p>
                  </div>

                  <div v-for="thread in headlessThreads" :key="thread.id" class="headless-thread">
                    <div class="headless-thread-header">
                      <span v-if="thread.resolved" class="headless-thread-resolved">Resolved</span>
                      <button
                        v-if="!thread.resolved"
                        class="headless-btn headless-btn-small"
                        @click="headlessHandleResolve(thread.id)"
                      >
                        Resolve
                      </button>
                      <button
                        v-else
                        class="headless-btn headless-btn-small"
                        @click="headlessHandleReopen(thread.id)"
                      >
                        Reopen
                      </button>
                      <button
                        class="headless-btn headless-btn-small headless-btn-danger"
                        @click="headlessHandleDeleteThread(thread.id)"
                      >
                        Delete
                      </button>
                    </div>

                    <div v-for="msg in thread.messages" :key="msg.id" class="headless-message">
                      <div class="headless-avatar" :style="headlessAvatarStyle(msg.user.name)">
                        {{ headlessInitial(msg.user.name) }}
                      </div>
                      <div class="headless-message-content">
                        <div class="headless-message-meta">
                          <span class="headless-message-author">{{ msg.user.name }}</span>
                          <span class="headless-message-time">{{
                            headlessFormatTime(msg.createdAt)
                          }}</span>
                        </div>

                        <div v-if="headlessEditingId === msg.id" class="headless-edit-mode">
                          <input
                            v-model="headlessEditInput"
                            class="headless-edit-input"
                            @keydown.enter="headlessConfirmEdit(msg.id)"
                            @keydown.escape="headlessCancelEdit"
                          />
                          <button class="headless-btn" @click="headlessConfirmEdit(msg.id)">
                            Save
                          </button>
                          <button class="headless-btn" @click="headlessCancelEdit">Cancel</button>
                        </div>
                        <p v-else class="headless-message-text">{{ msg.content }}</p>

                        <div v-if="msg.reactions.length" class="headless-reactions">
                          <button
                            v-for="r in headlessGroupReactions(msg.reactions)"
                            :key="r.emoji"
                            class="headless-reaction"
                            :class="{ 'is-active': r.active }"
                            @click="
                              headlessToggleReaction(msg.id, r.emoji, msg.reactions, msg.user.id)
                            "
                          >
                            {{ r.emoji }} {{ r.count }}
                          </button>
                        </div>

                        <div class="headless-message-actions">
                          <button
                            v-if="headlessCanReactTo(msg)"
                            class="headless-btn headless-btn-tiny"
                          >
                            React
                          </button>
                          <button
                            v-if="msg.user.id === headlessCurrentUser.id"
                            class="headless-btn headless-btn-tiny"
                            @click="headlessStartEdit(msg)"
                          >
                            Edit
                          </button>
                          <button
                            v-if="msg.user.id === headlessCurrentUser.id"
                            class="headless-btn headless-btn-tiny headless-btn-danger"
                            @click="headlessHandleDeleteMessage(thread.id, msg.id)"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="headlessOtherTyping.length" class="headless-typing">
                    {{ headlessOtherTyping.map((u) => u.name).join(', ') }} typing...
                  </div>
                </div>

                <div class="headless-panel-footer">
                  <input
                    v-model="headlessInput"
                    class="headless-input"
                    :placeholder="
                      headlessUnreadCount ? `Reply... (${headlessUnreadCount} new)` : 'Reply...'
                    "
                    @input="headlessHandleInput"
                    @keydown="headlessHandleKeydown"
                  />
                  <button
                    class="headless-btn headless-btn-primary"
                    :disabled="!headlessInput.trim()"
                    @click="headlessHandleSend"
                  >
                    Send
                  </button>
                </div>
              </div>

              <div class="headless-info">
                <h4>Headless 模式特点</h4>
                <ul>
                  <li><code>useAnchor()</code> - 管理所有讨论状态和操作</li>
                  <li><code>usePresence()</code> - 管理在线状态和输入提示</li>
                  <li>完全自定义 UI 渲染</li>
                  <li>乐观更新 (Optimistic updates)</li>
                  <li>支持创建线程、消息编辑、删除、 reactions</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </CollabProvider>
</template>

<style scoped>
.agent-demo-container {
  min-height: 100vh;
  background: var(--el-bg-color-page);
  padding: 24px;
}

.agent-demo-header {
  margin-bottom: 32px;
  text-align: center;
}

.agent-demo-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
}

.agent-demo-header p {
  font-size: 1rem;
  color: var(--el-text-color-secondary);
  max-width: 600px;
  margin: 0 auto;
}

.agent-demo-main {
  max-width: 800px;
  margin: 0 auto;
}

.demo-section {
  margin-bottom: 40px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.demo-section-header {
  padding: 16px 24px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color);
}

.demo-section-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.demo-section-content {
  padding: 24px;
}

.demo-card {
  padding: 20px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  min-height: 150px;
}

.demo-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 12px;
}

.demo-card-body {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
}

@media (max-width: 768px) {
  .agent-demo-container {
    padding: 16px;
  }

  .demo-section-content {
    padding: 16px;
  }

  .demo-card {
    padding: 16px;
  }
}

.headless-demo-section .demo-section-sub code {
  font-size: 11px;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
}

.headless-demo-wrapper {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.headless-panel {
  flex: 1;
  min-width: 320px;
  max-width: 500px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  overflow: hidden;
  background: var(--el-bg-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.headless-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: linear-gradient(180deg, #f8f9fa 0%, #f1f3f5 100%);
  border-bottom: 1px solid var(--el-border-color-light);
}

.headless-panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.headless-header-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.headless-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}

.headless-badge-unread {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.headless-badge-presence {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.headless-panel-body {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
}

.headless-loading,
.headless-error,
.headless-empty {
  text-align: center;
  padding: 24px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.headless-agent-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 24px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.headless-agent-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--el-border-color);
  border-top: 2px solid var(--el-color-primary);
  border-radius: 50%;
  animation: headless-spin 1s linear infinite;
}

@keyframes headless-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.headless-error {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-radius: 8px;
  padding: 12px;
}

.headless-thread {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}

.headless-thread:last-child {
  margin-bottom: 0;
}

.headless-thread-resolved {
  font-size: 12px;
  color: var(--el-color-success);
  font-weight: 500;
}

.headless-thread-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.headless-message {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.headless-message:last-child {
  margin-bottom: 0;
}

.headless-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.headless-message-content {
  flex: 1;
  min-width: 0;
}

.headless-message-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.headless-message-author {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.headless-message-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.headless-message-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  word-break: break-word;
}

.headless-edit-mode {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.headless-edit-input {
  flex: 1;
  min-width: 120px;
  padding: 6px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  font-size: 14px;
}

.headless-edit-input:focus {
  outline: none;
  border-color: var(--el-color-primary);
}

.headless-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.headless-reaction {
  padding: 2px 8px;
  font-size: 13px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-bg-color);
  cursor: pointer;
  transition: all 0.15s;
}

.headless-reaction:hover {
  background: var(--el-fill-color-light);
}

.headless-reaction.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.headless-message-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.headless-message:hover .headless-message-actions {
  opacity: 1;
}

.headless-typing {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  font-style: italic;
  padding: 8px 0;
}

.headless-panel-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--el-fill-color-lighter);
  border-top: 1px solid var(--el-border-color-light);
}

.headless-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--el-bg-color);
}

.headless-input:focus {
  outline: none;
  border-color: var(--el-color-primary);
}

.headless-btn {
  padding: 6px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-bg-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--el-text-color-regular);
}

.headless-btn:hover {
  background: var(--el-fill-color-light);
}

.headless-btn-small {
  padding: 3px 8px;
  font-size: 11px;
}

.headless-btn-tiny {
  padding: 2px 6px;
  font-size: 11px;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary);
}

.headless-btn-tiny:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.headless-btn-primary {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
  font-weight: 500;
}

.headless-btn-primary:hover {
  background: var(--el-color-primary-light-3);
}

.headless-btn-primary:disabled {
  background: var(--el-color-primary-light-5);
  border-color: var(--el-color-primary-light-5);
  cursor: not-allowed;
}

.headless-btn-danger {
  color: var(--el-color-danger);
}

.headless-btn-danger:hover {
  background: var(--el-color-danger-light-9);
}

.headless-info {
  flex: 0 0 240px;
  padding: 20px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--el-fill-color-light);
}

.headless-info h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.headless-info ul {
  margin: 0;
  padding-left: 20px;
}

.headless-info li {
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}

.headless-info code {
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--el-fill-color);
  color: var(--el-color-primary);
}

@media (max-width: 600px) {
  .headless-demo-wrapper {
    flex-direction: column;
  }

  .headless-panel {
    max-width: none;
  }

  .headless-info {
    flex: none;
  }
}
</style>
