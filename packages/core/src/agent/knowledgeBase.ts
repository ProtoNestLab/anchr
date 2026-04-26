import type { KnowledgeBaseConfig, DocumentConfig, SearchResult } from './types'

export class KnowledgeBase {
  private config: KnowledgeBaseConfig

  constructor(config: KnowledgeBaseConfig) {
    this.config = config
  }

  getConfig(): KnowledgeBaseConfig {
    return this.config
  }

  private simpleSearch(query: string, topK: number): SearchResult[] {
    const queryLower = query.toLowerCase()
    const results: Array<{ doc: DocumentConfig; score: number }> = []

    for (const doc of this.config.documents) {
      let score = 0
      const searchableText = (doc.content || doc.name || doc.url || '').toLowerCase()

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
        url: item.doc.url || '',
        source: 'knowledge_base' as const,
      }))
  }

  searchRelevantParagraphs(query: string, topK: number = 3): string[] {
    const queryLower = query.toLowerCase()
    const results: Array<{ paragraph: string; score: number }> = []

    for (const doc of this.config.documents) {
      if (!doc.content) continue

      const paragraphs = doc.content.split(/\n\n+/).filter((p) => p.trim().length > 20)

      for (const paragraph of paragraphs) {
        let score = 0
        const paraLower = paragraph.toLowerCase()

        if (paraLower.includes(queryLower)) {
          score += 2
        }

        const queryWords = queryLower.split(/\s+/)
        for (const word of queryWords) {
          if (word && paraLower.includes(word)) {
            score += 1
          }
        }

        const docNameLower = doc.name.toLowerCase()
        if (docNameLower.includes(queryLower)) {
          score += 1
        }

        if (score > 0) {
          results.push({ paragraph: paragraph.trim(), score })
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item) => item.paragraph)
  }

  async search(query: string, options?: { topK?: number }): Promise<SearchResult[]> {
    const topK = options?.topK ?? this.config.maxResults ?? 5
    return this.simpleSearch(query, topK)
  }

  async addDocument(doc: DocumentConfig): Promise<void> {
    const enhancedDoc = {
      ...doc,
      status: doc.status || 'processed',
    }
    this.config.documents.push(enhancedDoc)
  }

  async addDocuments(docs: DocumentConfig[]): Promise<void> {
    for (const doc of docs) {
      await this.addDocument(doc)
    }
  }

  removeDocument(docId: string): void {
    this.config.documents = this.config.documents.filter((d) => d.id !== docId)
  }

  getDocument(docId: string): DocumentConfig | undefined {
    return this.config.documents.find((d) => d.id === docId)
  }

  getAllDocuments(): DocumentConfig[] {
    return this.config.documents
  }

  updateConfig(config: Partial<KnowledgeBaseConfig>): void {
    this.config = { ...this.config, ...config }
  }
}
