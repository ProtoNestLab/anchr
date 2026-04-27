export interface AgentOptions {
  kimiApiKey?: string
  kimiApiBase?: string
  kimiModel?: string
  prompt?: string
  /** 可用工具列表：web_search、knowledge_base、data_analysis、visualization、calculator */
  tools?: Array<
    'web_search' | 'knowledge_base' | 'data_analysis' | /*'visualization' |*/ 'calculator'
  >
  knowledgeBase?: KnowledgeBaseConfig
  mockMode?: boolean
  temperature?: number
  maxTokens?: number
  /** 自定义 LLM 调用函数，用于处理 CORS 或其他特殊需求 */
  customLLMCall?: (params: {
    systemPrompt: string
    userMessage: string
    options?: Record<string, unknown>
  }) => Promise<string>
  /** 自定义 API 配置，用于通过代理或其他方式调用 */
  apiConfig?: {
    useProxy?: boolean
    proxyBaseUrl?: string
    customHeaders?: Record<string, string>
  }
  /** 增强功能配置（可选） */
  enhancedTools?: {
    calculator?: boolean
    advancedAnalysis?: boolean
    advancedVisualization?: boolean
    knowledgeBaseEnhanced?: boolean
    multiSearchEngines?: boolean
  }
}

export interface KnowledgeBaseConfig {
  id: string
  name: string
  documents: DocumentConfig[]
  embeddings?: EmbeddingsConfig
  maxResults?: number
  similarityThreshold?: number
  enableCache?: boolean
  cacheExpiry?: number
  enableHybridSearch?: boolean
  hybridSearchConfig?: {
    keywordWeight: number
    semanticWeight: number
  }
}

export type DocumentStatus = 'pending' | 'processing' | 'processed' | 'failed'

export interface DocumentChunk {
  id: string
  content: string
  metadata: {
    source: string
    page?: number
    section?: string
  }
}

export interface DocumentConfig {
  id: string
  name: string
  url?: string
  type: 'pdf' | 'doc' | 'docx' | 'md' | 'txt' | 'csv' | 'json'
  lastModified?: number
  size?: number
  content?: string
  status?: DocumentStatus
  chunks?: DocumentChunk[]
  error?: string
  processingTime?: number
}

export interface EmbeddingsConfig {
  provider: 'sentence-transformers' | 'openai' | 'custom'
  model: string
  apiKey?: string
}

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'area'
  | 'radar'
  | 'heatmap'
  | 'histogram'

export interface ChartData {
  type: ChartType
  title: string
  data: Array<{ name: string; value: number }>
  options?: {
    theme?: 'light' | 'dark'
    colors?: string[]
    legend?: boolean
    labels?: boolean
    width?: number
    height?: number
    exportable?: boolean
  }
}

export interface AgentResult {
  type: 'text' | 'visualization' | 'table' | 'mixed' | 'agent_response'
  content: string
  visualization?: ChartData
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

export interface EnhancedSearchResult extends SearchResult {
  score?: number
  sourceType?: 'knowledge_base' | 'web_search'
  publishedAt?: number
  cacheId?: string
}

export interface SearchResult {
  title: string
  snippet: string
  url: string
  source: 'knowledge_base' | 'web_search'
}

export type AnalysisOperation = 'describe' | 'trend' | 'correlation' | 'pivot' | 'outlier'

export interface CalculatorToolParams {
  expression: string
  options?: {
    precision?: number
  }
}

export interface CalculatorToolResult {
  value: number | string
  expression: string
  formatted?: string
}
