import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'
import axios from 'axios'
import type { SearchResult } from '../types'

interface DuckDuckGoSearchParams {
  query: string
  count?: number
}

export const searchTool = new DynamicStructuredTool({
  name: 'web_search',
  description:
    '用于在网络上搜索信息，获取最新的新闻、资料和知识（使用 DuckDuckGo，免费无需 API key）',
  schema: z.object({
    query: z.string().describe('搜索关键词'),
    count: z.number().optional().describe('返回结果数量，默认为5'),
  }),
  func: async ({ query, count = 5 }: DuckDuckGoSearchParams) => {
    try {
      // 使用 DuckDuckGo 的免费搜索 API
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1,
        },
      })

      const results: SearchResult[] = []
      const relatedTopics = response.data.related_topics ?? []

      for (let i = 0; i < Math.min(count, relatedTopics.length); i++) {
        const topic = relatedTopics[i]
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text,
            snippet: topic.Result || topic.Text,
            url: topic.FirstURL,
            source: 'web_search',
          })
        }
      }

      if (results.length === 0) {
        return `未找到关于「${query}」的搜索结果。`
      }

      let summary = `根据 DuckDuckGo 搜索结果，以下是关于「${query}」的信息：\n\n`
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        summary += `${i + 1}. **${result.title}**\n`
        summary += `   ${result.snippet.substring(0, 100)}...\n`
        summary += `   来源: ${result.url}\n\n`
      }

      return summary
    } catch (error) {
      console.error('DuckDuckGo search failed:', error)
      return `搜索失败：${error instanceof Error ? error.message : '未知错误'}`
    }
  },
})
