import { describe, it, expect } from 'vitest'
import { AgentParser } from '../parser'
import { createAgentPlugin } from '../plugin'
import { LangChainAgent } from '../langchain'
import { KnowledgeBase } from '../knowledgeBase'

describe('Agent Parser', () => {
  it('should detect agent command', () => {
    expect(AgentParser.isAgentCommand('@agent 分析对话')).toBe(true)
    expect(AgentParser.isAgentCommand('普通消息')).toBe(false)
  })

  it('should extract query from command', () => {
    const query = AgentParser.extractQuery('@agent 分析一下这个订单的问题')
    expect(query).toBe('分析一下这个订单的问题')
  })

  it('should return original content if not agent command', () => {
    const content = '这是一条普通消息'
    const query = AgentParser.extractQuery(content)
    expect(query).toBe(content)
  })
})

describe('LangChain Agent', () => {
  it('should create agent with mock mode', () => {
    const agent = new LangChainAgent({
      kimiApiKey: 'test-api-key',
      mockMode: true,
    })

    expect(agent).toBeDefined()
  })

  it('should get available tools', () => {
    const agent = new LangChainAgent({
      kimiApiKey: 'test-api-key',
      mockMode: true,
      tools: ['calculator', 'data_analysis'],
    })

    expect(agent.getAvailableTools()).toBeDefined()
    expect(agent.getAvailableTools()).toContain('calculator')
    expect(agent.getAvailableTools()).toContain('data_analysis')
  })

  it('should execute in mock mode', async () => {
    const agent = new LangChainAgent({
      kimiApiKey: 'test-api-key',
      mockMode: true,
    })

    const result = await agent.execute('分析一下这个数据')
    expect(result.success).toBe(true)
  })

  it('should get knowledge base', () => {
    const agent = new LangChainAgent({
      kimiApiKey: 'test-api-key',
      mockMode: true,
      knowledgeBase: {
        id: 'test-kb',
        name: 'Test KB',
        documents: [],
      },
    })

    const kb = agent.getKnowledgeBase()
    expect(kb).toBeDefined()
  })
})

describe('Agent Plugin', () => {
  it('should create agent plugin', () => {
    const plugin = createAgentPlugin({
      kimiApiKey: 'test-api-key',
      mockMode: true,
      tools: ['web_search', 'data_analysis'],
    })

    expect(plugin.name).toBe('agent')
    expect(plugin.agent).toBeDefined()
  })

  it('should have beforeAddMessage hook', () => {
    const plugin = createAgentPlugin({
      kimiApiKey: 'test-api-key',
      mockMode: true,
    })

    expect(plugin.beforeAddMessage).toBeDefined()
  })
})

describe('Knowledge Base', () => {
  const testContent = `# Anchor SDK 项目解读

## 一、项目概述

### 1.1 项目定位

**Anchor SDK** 是一个基于 Vue 3 的软件开发工具包，核心目标是为任何 UI 元素附加讨论线程功能。

### 1.2 核心价值

| 维度 | 价值描述 |
|------|----------|
| 可锚定性 | 能够将讨论功能附加到任何 UI 元素上 |
| 全生命周期 | 支持线程的创建、解决、重开、删除完整流程 |
| 富交互 | 支持 markdown 编辑、表情反应、附件上传、@mentions |
| 实时性 | WebSocket 实时同步、在线状态、打字指示器 |
| 健壮性 | 乐观更新、离线队列、错误处理 |
| AI Agent | v1.5 新增：通过 @agent 指令调用 Kimi 大模型、知识库检索、搜索、数据分析 |
| 灵活性 | 支持 Headless 模式和自定义主题 |

## 三、核心模块详解

### 3.1 Core 包

#### 3.1.6 AI Agent 模块（v1.5 新增）

| 组件 | 说明 | 位置 |
|------|------|------|
| AgentParser | @agent 指令解析器 | packages/core/src/agent/parser.ts |
| LangChainAgent | Agent 核心实现，集成 Kimi、工具调用 | packages/core/src/agent/langchain.ts |
| KnowledgeBase | 知识库管理，基于向量检索 | packages/core/src/agent/knowledgeBase.ts |
| AgentPlugin | 插件实现，拦截消息流程 | packages/core/src/agent/plugin.ts |
`

  it('should create knowledge base with documents', () => {
    const kb = new KnowledgeBase({
      id: 'test-kb',
      name: 'Test Knowledge Base',
      documents: [
        {
          id: 'doc-1',
          name: 'Anchor SDK 项目解读.md',
          type: 'md',
          content: testContent,
        },
      ],
    })

    expect(kb).toBeDefined()
    expect(kb.getAllDocuments().length).toBe(1)
    expect(kb.getAllDocuments()[0].name).toBe('Anchor SDK 项目解读.md')
  })

  it('should search relevant paragraphs for "可锚定性" (table content)', () => {
    const kb = new KnowledgeBase({
      id: 'test-kb',
      name: 'Test Knowledge Base',
      documents: [
        {
          id: 'doc-1',
          name: 'Anchor SDK 项目解读.md',
          type: 'md',
          content: testContent,
        },
      ],
    })

    const paragraphs = kb.searchRelevantParagraphs('可锚定性', 3)

    expect(paragraphs.length).toBeGreaterThan(0)
    console.log('\n=== 知识库检索结果 - "可锚定性" ===')
    paragraphs.forEach((para, index) => {
      console.log(`${index + 1}. ${para.substring(0, 100)}...`)
    })
  })

  it('should search relevant paragraphs for "AI Agent"', () => {
    const kb = new KnowledgeBase({
      id: 'test-kb',
      name: 'Test Knowledge Base',
      documents: [
        {
          id: 'doc-1',
          name: 'Anchor SDK 项目解读.md',
          type: 'md',
          content: testContent,
        },
      ],
    })

    const paragraphs = kb.searchRelevantParagraphs('AI Agent', 3)

    expect(paragraphs.length).toBeGreaterThan(0)
    console.log('\n=== 知识库检索结果 - "AI Agent" ===')
    paragraphs.forEach((para, index) => {
      console.log(`${index + 1}. ${para.substring(0, 100)}...`)
    })
  })

  it('should search documents and return results', async () => {
    const kb = new KnowledgeBase({
      id: 'test-kb',
      name: 'Test Knowledge Base',
      documents: [
        {
          id: 'doc-1',
          name: 'Anchor SDK 项目解读.md',
          type: 'md',
          content: testContent,
        },
      ],
    })

    const results = await kb.search('Anchor SDK', { topK: 2 })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].title).toBe('Anchor SDK 项目解读.md')
    expect(results[0].source).toBe('knowledge_base')

    console.log('\n=== simpleSearch 结果 ===')
    console.log(`标题: ${results[0].title}`)
    console.log(`摘要: ${results[0].snippet.substring(0, 150)}...`)
  })

  it('should return empty when no matching content', () => {
    const kb = new KnowledgeBase({
      id: 'test-kb',
      name: 'Test Knowledge Base',
      documents: [
        {
          id: 'doc-1',
          name: 'Anchor SDK 项目解读.md',
          type: 'md',
          content: testContent,
        },
      ],
    })

    const paragraphs = kb.searchRelevantParagraphs('不存在的关键词', 3)

    expect(paragraphs.length).toBe(0)
  })

  it('should integrate with LangChainAgent', () => {
    const agent = new LangChainAgent({
      kimiApiKey: 'test-api-key',
      mockMode: true,
      tools: ['knowledge_base'],
      knowledgeBase: {
        id: 'test-kb',
        name: 'Test KB',
        documents: [
          {
            id: 'doc-1',
            name: 'Anchor SDK 项目解读.md',
            type: 'md',
            content: testContent,
          },
        ],
      },
    })

    const kb = agent.getKnowledgeBase()
    expect(kb).toBeDefined()
    expect(agent.getAvailableTools()).toContain('knowledge_base')
  })
})
