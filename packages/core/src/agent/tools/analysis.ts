import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'

interface AnalysisParams {
  operation: 'sum' | 'avg' | 'max' | 'min' | 'count'
  data: number[]
}

export const analysisTool = new DynamicStructuredTool({
  name: 'data_analysis',
  description: '用于数据分析和统计计算，包括求和、平均值、最大值、最小值等',
  schema: z.object({
    operation: z
      .enum(['sum', 'avg', 'max', 'min', 'count'])
      .describe(
        '操作类型：sum（求和）、avg（平均值）、max（最大值）、min（最小值）、count（计数）',
      ),
    data: z.array(z.number()).describe('数字数组'),
  }),
  func: async ({ operation, data }: AnalysisParams) => {
    if (!Array.isArray(data) || data.length === 0) {
      return '请提供有效的数字数组'
    }

    let result: number | undefined
    let description = ''

    switch (operation) {
      case 'sum':
        result = data.reduce((a, b) => a + b, 0)
        description = `数据求和结果`
        break
      case 'avg':
        result = data.reduce((a, b) => a + b, 0) / data.length
        description = `数据平均值`
        break
      case 'max':
        result = Math.max(...data)
        description = `数据最大值`
        break
      case 'min':
        result = Math.min(...data)
        description = `数据最小值`
        break
      case 'count':
        result = data.length
        description = `数据计数`
        break
      default:
        return `未知操作类型: ${operation}`
    }

    return `${description}: ${result}（数据长度: ${data.length}）`
  },
})
