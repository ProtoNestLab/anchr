<script setup lang="ts">
import { reactive } from 'vue'
import { createClient, createMemoryAdapter, createOfflineQueue } from '@anchor-sdk/core'
import type { User } from '@anchor-sdk/core'
import { createAgentPlugin } from '@anchor-sdk/core/agent'
import type { KnowledgeBaseConfig } from '@anchor-sdk/core/agent'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'
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
</style>
