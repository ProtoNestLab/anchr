import { describe, it, expect } from 'vitest'
import { AgentParser } from '../parser'
import { createAgentPlugin } from '../plugin'
import { LangChainAgent } from '../langchain'

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
