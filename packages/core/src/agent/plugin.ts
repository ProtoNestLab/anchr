import type { Plugin, PluginContext } from '../plugin'
import type { AgentOptions, AgentResult } from './types'
import type { Adapter, Message, Thread } from '../types'
import { LangChainAgent } from './langchain'
import { AgentParser } from './parser'

export interface AgentPlugin extends Plugin {
  agent: LangChainAgent
  isLoading: boolean
}

async function handleAgentCommand(
  agent: LangChainAgent,
  getAdapter: () => Adapter | undefined,
  threadId: string,
  content: string,
  setLoading: (loading: boolean) => void,
) {
  setLoading(true)
  try {
    const query = AgentParser.extractQuery(content)

    console.log(`[Agent Plugin] 处理 Agent 命令: ${query}`)

    const result: AgentResult = {
      type: 'text',
      content: `收到你的命令：${query}（模拟响应）`,
    }

    const adapter = getAdapter()
    if (adapter) {
      await adapter.addMessage(threadId, result.content)
    }
  } catch (error) {
    console.error('Agent plugin error:', error)
    const adapter = getAdapter()
    if (adapter) {
      await adapter.addMessage(
        threadId,
        `Agent 执行失败：${error instanceof Error ? error.message : '未知错误'}`,
      )
    }
  } finally {
    setLoading(false)
  }
}

interface ClientType {
  adapter?: Adapter
}

export function createAgentPlugin(options: AgentOptions): AgentPlugin {
  const agent = new LangChainAgent(options)
  let client: ClientType | null = null
  let isLoading = false

  const getAdapter = () => client?.adapter
  const setLoading = (loading: boolean) => {
    isLoading = loading
  }

  return {
    name: 'agent',
    agent,
    get isLoading() {
      return isLoading
    },

    install(ctx: PluginContext) {
      client = ctx.client
    },

    beforeAddMessage() {
      if (isLoading) {
        throw new Error('Agent 正在执行中，请等待完成')
      }
      return undefined
    },

    afterAddMessage(message: Message) {
      if (AgentParser.isAgentCommand(message.content)) {
        const threadId = 'temp' // 暂时使用临时值
        handleAgentCommand(agent, getAdapter, threadId, message.content, setLoading)
      }
    },

    afterCreateThread(thread: Thread) {
      const firstMessage = thread.messages?.[0]
      if (firstMessage && AgentParser.isAgentCommand(firstMessage.content)) {
        handleAgentCommand(agent, getAdapter, thread.id, firstMessage.content, setLoading)
      }
    },
  }
}
