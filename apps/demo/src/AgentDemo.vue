<script setup lang="ts">
import { reactive } from 'vue'
import { createClient, createMemoryAdapter, createOfflineQueue } from '@anchor-sdk/core'
import type { User } from '@anchor-sdk/core'
import { createAgentPlugin } from '@anchor-sdk/core/agent'
import type { KnowledgeBaseConfig } from '@anchor-sdk/core/agent'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'
import { DEMO_USERS } from './api/users'

/** Shared identity object */
const activeUser = reactive<User>({ ...DEMO_USERS[0] })

const rawAdapter = createMemoryAdapter(activeUser)
const offlineQueue = createOfflineQueue({ adapter: rawAdapter })

/** AI Agent Configuration */
const knowledgeBaseConfig: KnowledgeBaseConfig = {
  id: 'demo-knowledge-base',
  name: '产品文档知识库',
  documents: [
    {
      id: 'doc-1',
      name: '产品手册.pdf',
      url: 'https://example.com/manual.pdf',
      type: 'pdf',
      content:
        '产品手册内容：\n1. 产品名称：智能助手\n2. 版本：v2.0\n3. 主要功能：\n   - 自然语言处理\n   - 知识库检索\n   - 数据分析\n   - 可视化生成\n4. 系统要求：\n   - 操作系统：Windows 10+，macOS 10.15+\n   - 内存：8GB以上\n   - 存储空间：500MB以上',
    },
    {
      id: 'doc-2',
      name: 'API文档.md',
      url: 'https://example.com/api.md',
      type: 'md',
      content:
        'API文档：\n1. 认证接口：\n   - POST /api/auth/login\n   - GET /api/auth/me\n2. 用户接口：\n   - GET /api/users\n   - POST /api/users\n   - PUT /api/users/:id\n   - DELETE /api/users/:id\n3. 数据分析接口：\n   - POST /api/analysis\n   - GET /api/analysis/:id',
    },
    {
      id: 'doc-3',
      name: 'FAQ文档.txt',
      url: 'https://example.com/faq.txt',
      type: 'txt',
      content:
        '常见问题：\nQ: 如何安装产品？\nA: 下载安装包后双击运行，按照提示完成安装。\n\nQ: 如何重置密码？\nA: 在登录页面点击"忘记密码"，按照提示操作。\n\nQ: 如何联系客服？\nA: 拨打400-123-4567或发送邮件至support@example.com。',
    },
  ],
  maxResults: 5,
  similarityThreshold: 0.7,
  embeddings: {
    provider: 'openai',
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    model: 'text-embedding-3-small',
  },
}

/**
 * 自定义 LLM 调用示例 - 通过代理调用
 */
const customLLMCall = async (prompt: string) => {
  try {
    console.log('[Agent] Calling Kimi API with model:', import.meta.env.VITE_KIMI_MODEL)

    const response = await fetch('/api/kimi/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_ARK_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_KIMI_MODEL || 'moonshot-v1-8k',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', response.status, errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const data = await response.json()
    console.log('[Agent] Kimi API response:', data)
    return data.choices?.[0]?.message?.content || '抱歉，无法生成回复。'
  } catch (error) {
    console.error('Custom LLM call failed:', error)
    throw error
  }
}

const agentPlugin = createAgentPlugin({
  kimiApiKey: import.meta.env.VITE_ARK_API_KEY || '',
  kimiModel: import.meta.env.VITE_KIMI_MODEL || 'moonshot-v1-8k',
  bingApiKey: import.meta.env.VITE_BING_API_KEY,
  prompt: `你是一个专业的AI助手，帮助用户分析和解决问题。
你可以使用以下工具：
1. 搜索工具：用于获取最新信息
2. 知识库：包含产品文档和FAQ
3. 可视化工具：用于生成图表
4. 数据分析工具：用于统计计算

请根据用户的问题选择合适的工具来回答。`,
  tools: ['search', 'knowledge_base', 'visualization', 'analysis'],
  knowledgeBase: knowledgeBaseConfig,
  customLLMCall: import.meta.env.VITE_ARK_API_KEY ? customLLMCall : undefined,
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
    title: '知识库信息获取分析',
    body: '测试指令：\n- @agent 从知识库中查找如何安装产品\n- @agent 知识库中关于API认证的信息\n- @agent 产品的系统要求是什么',
  },
  {
    id: 'context-analysis-demo',
    title: '聊天上下文分析',
    body: '测试步骤：\n1. 先发送几条消息，例如："我想了解产品的功能"、"产品有哪些API"\n2. 然后发送：@agent 分析对话内容\n3. 再发送：@agent 总结一下我们的对话',
  },
  {
    id: 'calculation-demo',
    title: '计算',
    body: '测试指令：\n- @agent 计算 123 + 456\n- @agent 计算 987654321 / 12345\n- @agent 计算 2^10',
  },
  {
    id: 'data-analysis-demo',
    title: '数据分析与可视化',
    body: '测试指令：\n- @agent 分析数据 [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] 的平均值\n- @agent 生成一个柱状图，标题为"月度销售数据"，数据为 [{name: "1月", value: 100}, {name: "2月", value: 150}, {name: "3月", value: 200}]',
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
