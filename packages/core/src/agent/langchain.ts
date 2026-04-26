import { ChatOpenAI } from '@langchain/openai'
import type { AgentOptions, AgentResult } from './types'
import { KnowledgeBase } from './knowledgeBase'
import { searchTool, analysisTool, visualizationTool } from './tools'

interface AgentTool {
  description: string
  func: (args: unknown) => Promise<string>
}

export class LangChainAgent {
  private llm: ChatOpenAI | null = null
  private tools: Record<string, AgentTool> = {}
  private knowledgeBase: KnowledgeBase | null = null
  private prompt: string
  private options: AgentOptions

  constructor(options: AgentOptions) {
    this.options = options
    this.prompt = options.prompt || this.getDefaultPrompt()

    if (!options.mockMode && !options.customLLMCall) {
      this.initializeLLM(options)
    }

    if (options.knowledgeBase) {
      this.knowledgeBase = new KnowledgeBase(options.knowledgeBase)
    }

    this.initializeTools(options)
  }

  private initializeLLM(options: AgentOptions) {
    const apiKey = options.kimiApiKey
    if (!apiKey) {
      console.warn('未提供 kimiApiKey，将使用 mock 模式')
      return
    }

    try {
      let baseURL = options.apiConfig?.useProxy
        ? options.apiConfig.proxyBaseUrl
        : options.kimiApiBase || 'https://api.moonshot.cn/v1'

      if (!baseURL || !baseURL.startsWith('http')) {
        baseURL = 'https://api.moonshot.cn/v1'
      }

      console.log('[Agent] Initializing LLM with baseURL:', baseURL, 'model:', options.kimiModel)

      this.llm = new ChatOpenAI({
        modelName: options.kimiModel || 'moonshot-v1-8k',
        temperature: options.temperature || 0.7,
        openAIApiKey: apiKey,
        configuration: {
          baseURL,
          defaultHeaders: options.apiConfig?.customHeaders,
        },
        maxTokens: options.maxTokens || 1024,
      })
    } catch (error) {
      console.error('初始化 LLM 失败，将使用 mock 模式:', error)
      this.llm = null
    }
  }

  private getDefaultPrompt(): string {
    return `你是一个专业的AI助手，帮助用户分析和解决问题。
你可以使用以下工具：
1. web_search：网络搜索，获取最新信息
2. knowledge_base：查询知识库，获取产品文档和FAQ
3. data_analysis：数据分析，进行统计计算
4. visualization：数据可视化，生成图表

请根据用户的问题选择合适的工具来回答。`
  }

  private initializeTools(options: AgentOptions) {
    if (options.tools?.includes('web_search')) {
      this.tools['web_search'] = {
        description: searchTool.description,
        func: async (args: unknown) => searchTool.func(args),
      }
    }

    if (options.tools?.includes('knowledge_base') && this.knowledgeBase) {
      this.tools['knowledge_base'] = {
        description: '查询知识库，获取产品文档、FAQ等信息',
        func: async (args: unknown) => {
          const query = typeof args === 'string' ? args : String(args ?? '')
          const results = await this.knowledgeBase!.search(query)
          if (results.length === 0) {
            return '知识库中未找到相关信息。'
          }
          return results.map((r) => `${r.title}: ${r.snippet}`).join('\n')
        },
      }
    }

    if (options.tools?.includes('data_analysis')) {
      this.tools['data_analysis'] = {
        description: analysisTool.description,
        func: async (args: unknown) => analysisTool.func(args),
      }
    }

    if (options.tools?.includes('visualization')) {
      this.tools['visualization'] = {
        description: visualizationTool.description,
        func: async (args: unknown) => visualizationTool.func(args),
      }
    }

    if (options.tools?.includes('calculator')) {
      this.tools['calculator'] = {
        description: '用于数学计算',
        func: async (args: unknown) => {
          const expression = typeof args === 'string' ? args : String(args ?? '')
          try {
            const result = new Function(`return ${expression}`)()
            return `${expression} = ${result}`
          } catch {
            return `无法计算表达式: ${expression}`
          }
        },
      }
    }
  }

  private getMockResponse(prompt: string): string {
    const responses = [
      '感谢您的问题！我正在为您分析中。虽然这是一个模拟响应，但在实际使用时，您可以通过配置代理或使用 customLLMCall 来获得真实的 AI 回复。',
      '这是一个模拟的 Agent 响应。要使用真实的 AI，请确保配置了正确的 API key 和代理设置。',
      `我理解您想了解: "${prompt.substring(0, 50)}..."。这是一个模拟回复，让您可以测试 UI 而无需实际调用 API。`,
      '🤖 AI Agent 正在工作中！这是一个模拟响应。请配置代理或 customLLMCall 来获得真实的智能回复。',
    ]

    const availableTools = Object.keys(this.tools)
    if (availableTools.length > 0 && Math.random() > 0.5) {
      const randomTool = availableTools[Math.floor(Math.random() * availableTools.length)]
      return `<function name="${randomTool}">测试查询</function>`
    }

    return responses[Math.floor(Math.random() * responses.length)]
  }

  private parseToolCall(response: string): { toolName: string; args: string } | null {
    const match = response.match(/<function name="(\w+)">([\s\S]*?)<\/function>/)
    if (match) {
      return {
        toolName: match[1],
        args: match[2].trim(),
      }
    }
    return null
  }

  private async executeTool(toolName: string, args: string): Promise<string> {
    const tool = this.tools[toolName]
    if (!tool) {
      return `未找到工具: ${toolName}`
    }

    try {
      console.log(`[Agent] 调用工具: ${toolName}, 参数: ${args}`)

      let parsedArgs
      try {
        parsedArgs = JSON.parse(args)
      } catch {
        parsedArgs = args
      }

      const result = await tool.func(parsedArgs)
      console.log(`[Agent] 工具返回: ${result.substring(0, 100)}...`)
      return result
    } catch (error) {
      console.error(`[Agent] 工具调用失败: ${toolName}`, error)
      return `工具调用失败: ${toolName}, 错误: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }

  private buildToolPrompt(input: string): string {
    const availableTools = Object.keys(this.tools)

    if (availableTools.length === 0) {
      return `${this.prompt}\n\n${input}\n\n请直接回答问题。`
    }

    const toolsInfo = availableTools
      .map((name) => `- ${name}: ${this.tools[name].description}`)
      .join('\n')

    return `${this.prompt}

可用工具：
${toolsInfo}

${input}

请按照以下格式回答：
1. 如果需要调用工具，请使用：<function name="工具名">JSON参数</function>
2. 如果直接回答，请直接给出答案，不要使用工具调用格式。`
  }

  async execute(command: string, context?: string[]): Promise<AgentResult> {
    const startTime = Date.now()
    const usedTools: string[] = []

    try {
      const input =
        context && context.length > 0
          ? `上下文：\n${context.join('\n')}\n\n问题：${command}`
          : command

      console.log('[Agent] 开始执行，输入:', input.substring(0, 100))

      let currentPrompt = this.buildToolPrompt(input)
      let content = ''
      let modelName = 'mock'
      let toolCallCount = 0
      const maxToolCalls = 3

      while (toolCallCount < maxToolCalls) {
        console.log(`[Agent] 第 ${toolCallCount + 1} 轮调用`)

        let llmResponse: string

        if (this.options.customLLMCall) {
          console.log('[Agent] 使用自定义 LLM 调用')
          llmResponse = await this.options.customLLMCall(
            currentPrompt,
            this.options as Record<string, unknown>,
          )
          modelName = 'custom'
        } else if (this.options.mockMode || !this.llm) {
          console.log('[Agent] 使用 mock 模式')
          llmResponse = this.getMockResponse(currentPrompt)
          modelName = 'mock'
        } else {
          console.log('[Agent] 使用真实 LLM')
          const result = await this.llm.invoke(currentPrompt)

          if (typeof result === 'string') {
            llmResponse = result
          } else if (result && typeof result.content === 'string') {
            llmResponse = result.content
          } else if (result && typeof result.text === 'string') {
            llmResponse = result.text
          } else {
            llmResponse = JSON.stringify(result)
          }
          modelName = this.llm.modelName
        }

        console.log('[Agent] LLM 响应:', llmResponse.substring(0, 150))

        const toolCall = this.parseToolCall(llmResponse)

        if (toolCall) {
          console.log(`[Agent] 检测到工具调用: ${toolCall.toolName}`)

          const toolResult = await this.executeTool(toolCall.toolName, toolCall.args)
          usedTools.push(toolCall.toolName)
          toolCallCount++

          currentPrompt = `${this.prompt}

对话历史：
用户问题：${input}

工具调用记录：
工具: ${toolCall.toolName}
参数: ${toolCall.args}
结果: ${toolResult}

请基于工具调用结果，继续分析或直接回答用户问题。
如果需要继续调用工具，请使用：<function name="工具名">JSON参数</function>
如果可以直接回答，请直接给出最终答案。`
        } else {
          content = llmResponse
          break
        }
      }

      if (toolCallCount >= maxToolCalls) {
        if (this.options.customLLMCall) {
          content = await this.options.customLLMCall(
            `${this.prompt}\n\n基于以上工具调用结果，请总结回答用户问题：${input}`,
            this.options as Record<string, unknown>,
          )
        } else {
          content = `已完成 ${maxToolCalls} 次工具调用，以下是分析结果：\n\n${currentPrompt}`
        }
      }

      const responseTime = Date.now() - startTime

      return {
        type: 'agent_response',
        content,
        usedTools,
        metadata: {
          model: modelName,
          tokensUsed: 0,
          responseTime,
          toolUsage: usedTools,
        },
        success: true,
      }
    } catch (error) {
      console.error('[Agent] 执行失败:', error)

      const isCorsError =
        error instanceof Error &&
        (error.message.includes('CORS') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError'))

      let errorMessage = ''
      if (isCorsError) {
        errorMessage = `CORS 错误：无法直接从浏览器调用 Kimi API。解决方案：
1. 配置代理（推荐）：在 Vite 配置中添加代理
2. 使用 mock 模式：设置 mockMode: true
3. 使用自定义 LLM 调用：通过 customLLMCall 提供自定义实现
4. 后端代理：通过自己的后端服务器代理 API 请求`
      } else {
        errorMessage = `Agent 执行失败：${error instanceof Error ? error.message : '未知错误'}`
      }

      return {
        type: 'agent_response',
        content: errorMessage,
        metadata: {
          model: this.llm?.modelName || 'unknown',
          tokensUsed: 0,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : '未知错误',
        },
        success: false,
      }
    }
  }

  getAvailableTools(): string[] {
    return Object.keys(this.tools)
  }

  updateKnowledgeBase(config: Parameters<(typeof KnowledgeBase)['prototype']['updateConfig']>[0]) {
    if (this.knowledgeBase) {
      this.knowledgeBase.updateConfig(config)
    } else {
      this.knowledgeBase = new KnowledgeBase({
        id: config.id || 'default',
        name: config.name || 'Default Knowledge Base',
        documents: config.documents || [],
        maxResults: config.maxResults || 5,
        embeddings: config.embeddings,
      })
    }

    if (this.options.tools?.includes('knowledge_base')) {
      this.initializeTools(this.options)
    }
  }

  getKnowledgeBase(): KnowledgeBase | null {
    return this.knowledgeBase
  }
}

export function createLangChainAgent(options: AgentOptions): LangChainAgent {
  return new LangChainAgent(options)
}
