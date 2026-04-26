# AI Agent

Anchor SDK v1.5 新增 AI Agent 功能，支持通过 `@agent` 指令在讨论中调用 AI 能力。

## Quick Start

### 安装依赖

```bash
pnpm add @anchor-sdk/core @anchor-sdk/vue @anchor-sdk/ui
```

### All-in-One 方式

最简单的使用方式，直接使用 UI 组件：

```vue
<script setup lang="ts">
import { createClient, createMemoryAdapter, createOfflineQueue } from '@anchor-sdk/core'
import { createAgentPlugin } from '@anchor-sdk/core/agent'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'

// 创建代理
const rawAdapter = createMemoryAdapter({ id: 'u1', name: 'Alice' })
const offlineQueue = createOfflineQueue({ adapter: rawAdapter })

// 创建 Agent 插件
const agentPlugin = createAgentPlugin({
  kimiApiKey: import.meta.env.VITE_ARK_API_KEY || '',
  prompt: '你是一个专业的AI助手，帮助用户分析和解决问题。',
  tools: ['knowledge_base'],
  knowledgeBase: {
    id: 'demo-knowledge-base',
    name: '产品知识库',
    documents: [
      {
        id: 'doc-1',
        name: '产品手册.md',
        type: 'md',
        content: '# 产品手册\n\n## 产品功能\n- 功能A\n- 功能B',
      },
    ],
  },
  mockMode: !import.meta.env.VITE_ARK_API_KEY,
})

// 创建客户端
const client = createClient({
  adapter: offlineQueue.adapter,
  user: { id: 'u1', name: 'Alice' },
  plugins: [agentPlugin],
})
</script>

<template>
  <CollabProvider :client="client">
    <AnchorDiscussion anchor-id="my-discussion">
      <div>讨论内容</div>
    </AnchorDiscussion>
  </CollabProvider>
</template>
```

### 使用方式

在讨论中输入 `@agent` 后跟问题即可触发 AI 助手：

```
@agent 分析一下这个问题
@agent 总结对话内容
@agent 搜索相关信息
```

## Headless 方式

如果你需要完全自定义 UI，可以使用 Headless API：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import { createAgentPlugin, parseAgentCommand } from '@anchor-sdk/core/agent'

const client = createClient({
  adapter: createMemoryAdapter({ id: 'u1', name: 'Alice' }),
  user: { id: 'u1', name: 'Alice' },
})

// 手动解析 Agent 命令
const messageContent = '@agent 分析一下数据'
const parsed = parseAgentCommand(messageContent)

if (parsed) {
  console.log('Agent 命令:', parsed.command)
  console.log('参数:', parsed.args)
}

// 手动调用 Agent
const agentPlugin = createAgentPlugin({
  kimiApiKey: import.meta.env.VITE_ARK_API_KEY || '',
  prompt: '你是助手',
})

// 注册插件
client.use(agentPlugin)

// 发送消息时自动触发 Agent
client.addMessage('thread-1', '@agent 你好')
</script>
```

## 配置选项

### 基本配置

```ts
const agentPlugin = createAgentPlugin({
  // 必填：Kimi API Key
  kimiApiKey: 'your-api-key',

  // 可选：模型名称，默认为 moonshot-v1-8k
  kimiModel: 'moonshot-v1-8k',

  // 可选：系统提示词
  prompt: '你是一个专业的AI助手...',

  // 可选：启用的工具列表
  tools: ['knowledge_base', 'calculator', 'data_analysis'],

  // 可选：知识库配置
  knowledgeBase: {
    id: 'my-knowledge-base',
    name: '我的知识库',
    documents: [
      {
        id: 'doc-1',
        name: '文档名称',
        type: 'md',
        content: '文档内容',
      },
    ],
    maxResults: 5,
    similarityThreshold: 0.7,
  },

  // 可选：是否使用 Mock 模式
  mockMode: false,

  // 可选：温度参数，控制输出随机性
  temperature: 0.7,

  // 可选：最大令牌数
  maxTokens: 1024,
})
```

### 工具列表

| 工具名称         | 说明                             |
| ---------------- | -------------------------------- |
| `knowledge_base` | 知识库检索，查询产品文档和FAQ    |
| `calculator`     | 数学计算，处理算术运算           |
| `data_analysis`  | 数据分析，进行统计计算、趋势分析 |
| `web_search`     | 网络搜索，获取最新信息           |

### 知识库配置

```ts
const knowledgeBaseConfig = {
  id: 'unique-id', // 知识库唯一标识
  name: '知识库名称', // 知识库显示名称
  documents: [
    // 文档列表
    {
      id: 'doc-1', // 文档唯一标识
      name: '文档名.md', // 文档名称
      type: 'md', // 文档类型：md, txt, pdf, doc, docx, csv, json
      content: '文档内容', // 文档内容
      url: 'https://...', // 可选：文档URL
    },
  ],
  maxResults: 5, // 最大返回结果数
  similarityThreshold: 0.7, // 相似度阈值
}
```

## 高级配置

### 自定义 LLM 调用

如果你需要完全控制 LLM 调用逻辑：

```ts
const customLLMCall = async (params: {
  systemPrompt: string
  userMessage: string
  options?: Record<string, unknown>
}) => {
  const response = await fetch('https://api.example.com/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'my-model',
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
    }),
  })

  const data = await response.json()
  return data.choices[0].message.content
}

const agentPlugin = createAgentPlugin({
  kimiApiKey: 'your-key',
  customLLMCall,
})
```

### API 代理配置

开发环境下使用 Vite 代理避免 CORS 问题：

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/kimi': {
        target: 'https://api.moonshot.cn/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kimi/, ''),
      },
    },
  },
})
```

然后在 Agent 配置中启用代理：

```ts
const agentPlugin = createAgentPlugin({
  kimiApiKey: import.meta.env.VITE_ARK_API_KEY || '',
  apiConfig: {
    useProxy: true, // 启用代理
    proxyBaseUrl: '/api/kimi', // 代理路径
  },
})
```

## 事件钩子

Agent 插件支持以下生命周期钩子：

```ts
const agentPlugin = createAgentPlugin({
  kimiApiKey: 'your-key',

  // Agent 开始执行前
  beforeExecute: (command, context) => {
    console.log('Agent 即将执行:', command)
    return { command, context }
  },

  // Agent 执行完成后
  afterExecute: (result) => {
    console.log('Agent 执行结果:', result)
    return result
  },

  // Agent 执行失败时
  onError: (error) => {
    console.error('Agent 执行错误:', error)
  },
})
```

## 使用示例

### 示例 1：知识库查询

```ts
const knowledgeBaseConfig = {
  id: 'product-docs',
  name: '产品文档',
  documents: [
    {
      id: 'faq',
      name: 'FAQ.md',
      type: 'md',
      content: `常见问题：
Q: 如何安装产品？
A: 下载安装包后双击运行。

Q: 如何联系客服？
A: 拨打400-123-4567。`,
    },
  ],
}

const agentPlugin = createAgentPlugin({
  kimiApiKey: 'your-key',
  tools: ['knowledge_base'],
  knowledgeBase: knowledgeBaseConfig,
})
```

### 示例 2：数学计算

```ts
const agentPlugin = createAgentPlugin({
  kimiApiKey: 'your-key',
  tools: ['calculator'],
})
```

使用方式：

```
@agent 计算 123 + 456
@agent 计算 sqrt(16)
@agent 计算 sin(30)
```

### 示例 3：数据分析

```ts
const agentPlugin = createAgentPlugin({
  kimiApiKey: 'your-key',
  tools: ['data_analysis'],
})
```

使用方式：

```
@agent 分析数据 [10, 20, 30, 40, 50] 的描述性统计
@agent 分析数据 [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100] 的异常值
```

## 注意事项

1. **API Key 安全**：请妥善保管 API Key，不要硬编码在前端代码中
2. **Mock 模式**：开发环境可以设置 `mockMode: true` 进行测试
3. **知识库大小**：建议单个文档不超过 10KB，总知识库不超过 100KB
4. **性能优化**：大量文档时建议使用向量检索（需要额外配置）

## 故障排除

### CORS 错误

确保在 `vite.config.ts` 中配置了代理，并且 `apiConfig.useProxy` 为 `true`。

### API Key 无效

检查环境变量 `VITE_ARK_API_KEY` 是否正确设置。

### Agent 不响应

检查浏览器控制台是否有错误信息，确保 Agent 插件已正确注册。
