export interface AgentOptions {
  kimiApiKey?: string
  kimiApiBase?: string
  kimiModel?: string
  prompt?: string
  /** 可用工具列表：web_search、knowledge_base、data_analysis、visualization、calculator */
  tools?: Array<'web_search' | 'knowledge_base' | 'data_analysis' | 'visualization' | 'calculator'>
  knowledgeBase?: KnowledgeBaseConfig
  mockMode?: boolean
  temperature?: number
  maxTokens?: number
  /** 自定义 LLM 调用函数，用于处理 CORS 或其他特殊需求 */
  customLLMCall?: (prompt: string, options?: Record<string, unknown>) => Promise<string>
  /** 自定义 API 配置，用于通过代理或其他方式调用 */
  apiConfig?: {
    useProxy?: boolean
    proxyBaseUrl?: string
    customHeaders?: Record<string, string>
  }
}

export interface KnowledgeBaseConfig {
  id: string
  name: string
  documents: DocumentConfig[]
  embeddings?: EmbeddingsConfig
  maxResults?: number
  similarityThreshold?: number
}

export interface DocumentConfig {
  id: string
  name: string
  url: string
  type: 'pdf' | 'doc' | 'docx' | 'md' | 'txt'
  lastModified?: number
  size?: number
  content?: string
}

export interface EmbeddingsConfig {
  provider: 'sentence-transformers' | 'openai' | 'custom'
  model: string
  apiKey?: string
}

export interface AgentResult {
  type: 'text' | 'visualization' | 'table' | 'mixed' | 'agent_response'
  content: string
  visualization?: {
    type: 'chart' | 'graph' | 'map'
    data: Record<string, unknown>
    options: Record<string, unknown>
  }
  tables?: Array<{
    columns: string[]
    rows: unknown[][]
  }>
  usedTools?: string[]
  metadata?: {
    model?: string
    tokensUsed?: number
    responseTime?: number
    toolUsage?: string[]
    error?: string
  }
  success?: boolean
}

export interface SearchResult {
  title: string
  snippet: string
  url: string
  source: 'knowledge_base' | 'web_search'
}
