import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'

interface VisualizationParams {
  type: 'bar' | 'line' | 'pie' | 'scatter'
  title: string
  data: Array<{ name: string; value: number }>
}

export const visualizationTool = new DynamicStructuredTool({
  name: 'visualization',
  description: '用于生成数据可视化图表，包括柱状图、折线图、饼图等',
  schema: z.object({
    type: z
      .enum(['bar', 'line', 'pie', 'scatter'])
      .describe('图表类型：bar（柱状图）、line（折线图）、pie（饼图）、scatter（散点图）'),
    title: z.string().describe('图表标题'),
    data: z
      .array(
        z.object({
          name: z.string(),
          value: z.number(),
        }),
      )
      .describe('数据数组'),
  }),
  func: async ({ type, title, data }: VisualizationParams) => {
    if (!Array.isArray(data) || data.length === 0) {
      return '请提供有效的数据数组'
    }

    const chartTypes: Record<string, string> = {
      bar: '柱状图',
      line: '折线图',
      pie: '饼图',
      scatter: '散点图',
    }

    return `已生成${chartTypes[type]}「${title}」，包含 ${data.length} 个数据点。\n\n数据预览：\n${data.map((d) => `• ${d.name}: ${d.value}`).join('\n')}`
  },
})
