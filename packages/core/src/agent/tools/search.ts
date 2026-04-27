import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'
import axios from 'axios'
import type { SearchResult } from '../types'

interface BaiduSearchParams {
  query: string
  count?: number
}

export const searchTool = new DynamicStructuredTool({
  name: 'web_search',
  description: '用于在网络上搜索信息，获取最新的新闻、资料和知识（使用百度搜索）',
  schema: z.object({
    query: z.string().describe('搜索关键词'),
    count: z.number().optional().describe('返回结果数量，默认为5'),
  }),
  func: async ({ query, count = 5 }: BaiduSearchParams) => {
    try {
      // 使用百度网页搜索（通过代理避免 CORS）
      const baseURL = '/api/baidu'
      const response = await axios.get(`${baseURL}/s`, {
        params: {
          wd: query,
          rn: count,
          ie: 'utf-8',
        },
      })

      const results: SearchResult[] = []

      // 尝试从HTML响应中提取结果
      const html = response.data
      if (typeof html === 'string') {
        // 匹配搜索结果标题和链接
        const titleRegex = /<h3[^>]*class="[^"]*t[^"]*"[^>]*>(.*?)<\/h3>/gi
        const linkRegex = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*t[^"]*"[^>]*>/gi

        const titles: string[] = []
        const links: string[] = []
        let match

        while ((match = titleRegex.exec(html)) !== null) {
          titles.push(match[1].replace(/<[^>]*>/g, '').trim())
        }

        while ((match = linkRegex.exec(html)) !== null) {
          links.push(match[1])
        }

        for (let i = 0; i < Math.min(count, titles.length, links.length); i++) {
          results.push({
            title: titles[i],
            snippet: titles[i],
            url: decodeURIComponent(links[i]),
            source: 'web_search',
          })
        }
      }

      if (results.length === 0) {
        return `未找到关于「${query}」的搜索结果。`
      }

      let summary = `根据搜索结果，以下是关于「${query}」的信息：\n\n`
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        summary += `${i + 1}. **${result.title}**\n`
        summary += `   ${result.snippet.substring(0, 80)}...\n`
        summary += `   来源: ${result.url}\n\n`
      }

      return summary
    } catch (error) {
      console.error('Search failed:', error)
      return `搜索失败：${error instanceof Error ? error.message : '未知错误'}`
    }
  },
})
