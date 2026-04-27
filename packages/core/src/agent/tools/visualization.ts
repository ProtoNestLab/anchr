import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'
import type { ChartType } from '../types'

interface VisualizationParams {
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

export const visualizationTool = new DynamicStructuredTool({
  name: 'visualization',
  description: '用于生成数据可视化图表，支持柱状图、折线图、饼图、面积图、雷达图等',
  schema: z.object({
    type: z
      .enum(['bar', 'line', 'pie', 'scatter', 'area', 'radar', 'heatmap', 'histogram'])
      .describe(
        '图表类型：bar（柱状图）、line（折线图）、pie（饼图）、scatter（散点图）、area（面积图）、radar（雷达图）、heatmap（热力图）、histogram（直方图）',
      ),
    title: z.string().describe('图表标题'),
    data: z
      .array(
        z.object({
          name: z.string(),
          value: z.number(),
        }),
      )
      .describe('数据数组'),
    options: z
      .object({
        theme: z.enum(['light', 'dark']).optional(),
        colors: z.array(z.string()).optional(),
        legend: z.boolean().optional(),
        labels: z.boolean().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        exportable: z.boolean().optional(),
      })
      .optional(),
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
      area: '面积图',
      radar: '雷达图',
      heatmap: '热力图',
      histogram: '直方图',
    }

    // 生成预览信息
    const dataSummary = data.map((d) => `• ${d.name}: ${d.value}`).join('\n')

    const total = data.reduce((sum, d) => sum + d.value, 0)
    const maxValue = Math.max(...data.map((d) => d.value))
    const minValue = Math.min(...data.map((d) => d.value))

    return `已生成${chartTypes[type]}「${title}」

图表配置:
  数据点: ${data.length}
  总和: ${total}
  最大值: ${maxValue}
  最小值: ${minValue}

数据预览:
${dataSummary}`
  },
})
