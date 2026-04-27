import { ref, type Ref } from 'vue'
import type { LangChainAgent, AgentResult, SearchResult } from '@anchor-sdk/core/agent'

export interface UseAgentReturn {
  execute: (query: string, context?: string[]) => Promise<AgentResult | null>
  searchKnowledgeBase: (query: string) => Promise<SearchResult[]>
  isProcessing: Ref<boolean>
  lastResult: Ref<AgentResult | null>
}

export function useAgent(agent?: LangChainAgent): UseAgentReturn {
  const isProcessing = ref(false)
  const lastResult = ref<AgentResult | null>(null)

  async function execute(query: string, context?: string[]): Promise<AgentResult | null> {
    if (!agent) {
      console.warn('[useAgent] Agent 未初始化')
      return null
    }

    isProcessing.value = true
    try {
      const result = await agent.execute(query, context)
      lastResult.value = result
      return result
    } finally {
      isProcessing.value = false
    }
  }

  async function searchKnowledgeBase(query: string): Promise<SearchResult[]> {
    if (!agent) {
      console.warn('[useAgent] Agent 未初始化')
      return []
    }

    const kb = agent.getKnowledgeBase()
    if (!kb) {
      console.warn('[useAgent] 知识库未配置')
      return []
    }

    try {
      return await kb.search(query)
    } catch (error) {
      console.error('[useAgent] 知识库搜索失败:', error)
      return []
    }
  }

  return {
    execute,
    searchKnowledgeBase,
    isProcessing,
    lastResult,
  }
}
