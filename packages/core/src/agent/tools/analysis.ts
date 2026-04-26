import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'
import type { AnalysisOperation } from '../types'

interface AnalysisParams {
  operation: AnalysisOperation | 'sum' | 'avg' | 'max' | 'min' | 'count'
  data: number[]
  options?: {
    groupBy?: string
    sortBy?: string
    topN?: number
  }
}

export const analysisTool = new DynamicStructuredTool({
  name: 'data_analysis',
  description: '用于数据分析和统计计算，包括基础统计、高级分析、趋势分析等',
  schema: z.object({
    operation: z
      .enum(['sum', 'avg', 'max', 'min', 'count', 'describe', 'trend', 'outlier'])
      .describe(
        '操作类型：sum（求和）、avg（平均值）、max（最大值）、min（最小值）、count（计数）、describe（描述性统计）、trend（趋势分析）、outlier（异常值检测）',
      ),
    data: z.array(z.number()).describe('数字数组'),
  }),
  func: async ({ operation, data }: AnalysisParams) => {
    if (!Array.isArray(data) || data.length === 0) {
      return '请提供有效的数字数组'
    }

    switch (operation) {
      case 'sum': {
        const sum = data.reduce((a, b) => a + b, 0)
        return `数据求和结果: ${sum}（数据长度: ${data.length}）`
      }
      case 'avg': {
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        return `数据平均值: ${avg.toFixed(4)}（数据长度: ${data.length}）`
      }
      case 'max':
        return `数据最大值: ${Math.max(...data)}`
      case 'min':
        return `数据最小值: ${Math.min(...data)}`
      case 'count':
        return `数据计数: ${data.length}`
      case 'describe':
        return calculateDescriptiveStats(data)
      case 'trend':
        return calculateTrend(data)
      case 'outlier':
        return detectOutliers(data)
      default:
        return `未知操作类型: ${operation}`
    }
  },
})

function calculateDescriptiveStats(data: number[]): string {
  const sorted = [...data].sort((a, b) => a - b)
  const n = data.length
  const sum = data.reduce((a, b) => a + b, 0)
  const mean = sum / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n
  const stdDev = Math.sqrt(variance)
  const q1 = sorted[Math.floor(n / 4)]
  const q3 = sorted[Math.floor((3 * n) / 4)]

  return `
描述性统计结果:
  样本数: ${n}
  最小值: ${min}
  最大值: ${max}
  平均值: ${mean.toFixed(4)}
  中位数: ${median}
  第一四分位数(Q1): ${q1}
  第三四分位数(Q3): ${q3}
  方差: ${variance.toFixed(4)}
  标准差: ${stdDev.toFixed(4)}
  `.trim()
}

function calculateTrend(data: number[]): string {
  const n = data.length
  if (n < 2) {
    return '数据点不足，无法分析趋势'
  }

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += data[i]
    sumXY += i * data[i]
    sumX2 += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  const trend = slope > 0 ? '上升' : slope < 0 ? '下降' : '平稳'

  return `
趋势分析结果:
  趋势方向: ${trend}
  斜率: ${slope.toFixed(4)}
  截距: ${intercept.toFixed(4)}
  下一个值预测: ${(intercept + slope * n).toFixed(4)}
  `.trim()
}

function detectOutliers(data: number[], threshold: number = 1.5): string {
  const n = data.length
  if (n < 4) {
    return '数据点不足，无法检测异常值'
  }

  const sorted = [...data].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(n / 4)]
  const q3 = sorted[Math.floor((3 * n) / 4)]
  const iqr = q3 - q1

  const lowerBound = q1 - threshold * iqr
  const upperBound = q3 + threshold * iqr
  const outliers = data.filter((x) => x < lowerBound || x > upperBound)

  if (outliers.length === 0) {
    return `没有检测到异常值（使用 ${threshold} * IQR 准则）`
  }

  return `
异常值检测结果:
  下边界: ${lowerBound.toFixed(4)}
  上边界: ${upperBound.toFixed(4)}
  检测到 ${outliers.length} 个异常值: ${outliers.join(', ')}
  `.trim()
}
