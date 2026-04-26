import { Document } from '@langchain/core/documents'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { OpenAIEmbeddings } from '@langchain/openai'
import type { KnowledgeBaseConfig, DocumentConfig, SearchResult } from './types'

export class KnowledgeBase {
  private config: KnowledgeBaseConfig
  private vectorStore: MemoryVectorStore | null = null
  private embeddings: OpenAIEmbeddings | null = null
  private isInitialized = false

  constructor(config: KnowledgeBaseConfig) {
    this.config = config
    if (config.embeddings?.provider === 'openai' && config.embeddings.apiKey) {
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: config.embeddings.apiKey,
        modelName: config.embeddings.model || 'text-embedding-3-small',
      })
    }
  }

  getConfig(): KnowledgeBaseConfig {
    return this.config
  }

  private async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    if (!this.embeddings) {
      console.warn('[KnowledgeBase] Embeddings 未配置，将使用简单文本匹配')
      this.isInitialized = true
      return true
    }

    try {
      const documents = this.config.documents.map(
        (doc) =>
          new Document({
            pageContent: doc.content || `文档: ${doc.name}\n类型: ${doc.type}\nURL: ${doc.url}`,
            metadata: {
              id: doc.id,
              name: doc.name,
              url: doc.url,
              type: doc.type,
              lastModified: doc.lastModified,
              size: doc.size,
            },
          }),
      )

      this.vectorStore = await MemoryVectorStore.fromDocuments(documents, this.embeddings)
      this.isInitialized = true
      console.log('[KnowledgeBase] 初始化成功')
      return true
    } catch (error) {
      console.error('[KnowledgeBase] 初始化失败:', error)
      this.isInitialized = true
      return false
    }
  }

  createRetriever() {
    if (!this.vectorStore) {
      return null
    }
    return this.vectorStore.asRetriever({
      k: this.config.maxResults || 5,
      searchType: 'similarity',
    })
  }

  private simpleSearch(query: string, topK: number): SearchResult[] {
    const queryLower = query.toLowerCase()
    const results: Array<{ doc: DocumentConfig; score: number }> = []

    for (const doc of this.config.documents) {
      let score = 0
      const searchableText = (doc.content || doc.name || doc.url).toLowerCase()

      if (searchableText.includes(queryLower)) {
        score += 1
      }

      const queryWords = queryLower.split(/\s+/)
      for (const word of queryWords) {
        if (word && searchableText.includes(word)) {
          score += 0.5
        }
      }

      if (score > 0) {
        results.push({ doc, score })
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item) => ({
        title: item.doc.name,
        snippet: (item.doc.content || `文档: ${item.doc.name}`).substring(0, 200) + '...',
        url: item.doc.url,
        source: 'knowledge_base' as const,
      }))
  }

  async search(query: string, options?: { topK?: number }): Promise<SearchResult[]> {
    await this.initialize()
    const topK = options?.topK ?? this.config.maxResults ?? 5

    if (!this.vectorStore || !this.embeddings) {
      return this.simpleSearch(query, topK)
    }

    try {
      const results = await this.vectorStore.similaritySearch(query, topK)
      return results.map((doc) => ({
        title: doc.metadata.name as string,
        snippet: doc.pageContent.substring(0, 200) + (doc.pageContent.length > 200 ? '...' : ''),
        url: doc.metadata.url as string,
        source: 'knowledge_base' as const,
      }))
    } catch (error) {
      console.error('[KnowledgeBase] 相似度搜索失败，回退到简单搜索:', error)
      return this.simpleSearch(query, topK)
    }
  }

  async addDocument(doc: DocumentConfig): Promise<void> {
    this.config.documents.push(doc)

    if (this.vectorStore && this.embeddings) {
      const document = new Document({
        pageContent: doc.content || `文档: ${doc.name}\n类型: ${doc.type}\nURL: ${doc.url}`,
        metadata: {
          id: doc.id,
          name: doc.name,
          url: doc.url,
          type: doc.type,
          lastModified: doc.lastModified,
          size: doc.size,
        },
      })

      await this.vectorStore.addDocuments([document])
    }
  }

  removeDocument(docId: string): void {
    this.config.documents = this.config.documents.filter((d) => d.id !== docId)

    if (this.vectorStore) {
      this.vectorStore.delete({ id: docId })
    }
  }

  getDocument(docId: string): DocumentConfig | undefined {
    return this.config.documents.find((d) => d.id === docId)
  }

  getAllDocuments(): DocumentConfig[] {
    return this.config.documents
  }

  async updateEmbeddings(): Promise<void> {
    if (this.embeddings) {
      this.isInitialized = false
      await this.initialize()
    }
  }

  updateConfig(config: Partial<KnowledgeBaseConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.embeddings?.provider === 'openai' && config.embeddings.apiKey) {
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: config.embeddings.apiKey,
        modelName: config.embeddings.model || 'text-embedding-3-small',
      })
      this.isInitialized = false
    }
  }
}
