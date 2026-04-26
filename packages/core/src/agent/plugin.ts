import type { Plugin, PluginContext } from '../plugin'
import type { AgentOptions } from './types'
import type { Adapter, Message, Thread, User } from '../types'
import { LangChainAgent } from './langchain'
import { AgentParser } from './parser'

export interface AgentPlugin extends Plugin {
  agent: LangChainAgent
  isLoading: boolean
}

// Agent 用户信息
const AGENT_USER: User = {
  id: 'agent',
  name: 'AI Agent',
  avatar: '🤖',
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

    // 获取历史消息作为上下文
    const adapter = getAdapter()
    const context: string[] = []
    if (adapter) {
      try {
        // 获取所有线程，找到当前线程
        let threads: Thread[] = []
        if (adapter.getAllThreads) {
          threads = await adapter.getAllThreads()
          console.log(`[Agent Plugin] 使用 getAllThreads 获取到 ${threads.length} 个线程`)
        } else {
          // 降级：尝试用空字符串获取
          threads = await adapter.getThreads('')
          console.log(`[Agent Plugin] 使用 getThreads('') 获取到 ${threads.length} 个线程`)
        }

        console.log(`[Agent Plugin] 当前 threadId: ${threadId}`)
        console.log(`[Agent Plugin] 所有线程ID: ${threads.map((t) => t.id).join(', ')}`)

        const currentThread = threads.find((t) => t.id === threadId)
        if (currentThread) {
          console.log(
            `[Agent Plugin] 找到当前线程，消息数量: ${currentThread.messages?.length || 0}`,
          )
          if (currentThread.messages) {
            // 收集除当前消息外的所有历史消息
            for (const msg of currentThread.messages) {
              console.log(
                `[Agent Plugin] 消息: ${msg.user.name}: ${msg.content.substring(0, 50)}...`,
              )
              if (msg.content !== content) {
                const role = msg.user.id === 'agent' ? 'AI Agent' : msg.user.name
                context.push(`${role}: ${msg.content}`)
              }
            }
          }
        } else {
          console.warn(`[Agent Plugin] 未找到线程: ${threadId}`)
        }
        console.log(`[Agent Plugin] 历史消息上下文: ${context.length} 条`)
      } catch (error) {
        console.warn('[Agent Plugin] 获取历史消息失败:', error)
      }
    }

    // 调用 agent.execute() 获取真实响应，传递上下文
    const result = await agent.execute(query, context)

    console.log(`[Agent Plugin] Agent 执行结果: ${result.content.substring(0, 100)}...`)

    if (adapter) {
      // 使用 agent 用户信息添加消息
      await adapter.addMessage(threadId, result.content, { user: AGENT_USER })
    }
  } catch (error) {
    console.error('Agent plugin error:', error)
    const adapter = getAdapter()
    if (adapter) {
      await adapter.addMessage(
        threadId,
        `Agent 执行失败：${error instanceof Error ? error.message : '未知错误'}`,
        { user: AGENT_USER },
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
  let pendingThreadId: string | null = null

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

    beforeAddMessage(threadId: string) {
      if (isLoading) {
        throw new Error('Agent 正在执行中，请等待完成')
      }
      // 保存线程 ID，供 afterAddMessage 使用
      pendingThreadId = threadId
      return undefined
    },

    afterAddMessage(message: Message) {
      if (AgentParser.isAgentCommand(message.content)) {
        const threadId = pendingThreadId || 'unknown'
        handleAgentCommand(agent, getAdapter, threadId, message.content, setLoading)
      }
      // 重置 pendingThreadId
      pendingThreadId = null
    },

    afterCreateThread(thread: Thread) {
      const firstMessage = thread.messages?.[0]
      if (firstMessage && AgentParser.isAgentCommand(firstMessage.content)) {
        handleAgentCommand(agent, getAdapter, thread.id, firstMessage.content, setLoading)
      }
    },
  }
}
