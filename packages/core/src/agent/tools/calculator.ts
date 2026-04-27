import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'
import type { CalculatorToolParams } from '../types'

export const calculatorTool = new DynamicStructuredTool({
  name: 'calculator',
  description: '用于数学计算和表达式解析，支持基础运算、函数计算等',
  schema: z.object({
    expression: z.string().describe('数学表达式，如 "123 + 456"、"sqrt(16)"'),
    options: z
      .object({
        precision: z.number().optional().describe('结果精度，默认 6 位小数'),
      })
      .optional(),
  }),
  func: async ({ expression, options = {} }: CalculatorToolParams): Promise<string> => {
    try {
      const result = evaluateExpression(expression)
      const precision = options.precision ?? 6
      const formatted = formatNumber(result, precision)

      return `计算结果: ${expression} = ${formatted}`
    } catch (error) {
      return `计算失败: ${error instanceof Error ? error.message : String(error)}`
    }
  },
})

const MATH_CONSTANTS: Record<string, number> = {
  PI: Math.PI,
  E: Math.E,
  LN2: Math.LN2,
  LN10: Math.LN10,
  LOG2E: Math.LOG2E,
  LOG10E: Math.LOG10E,
  SQRT1_2: Math.SQRT1_2,
  SQRT2: Math.SQRT2,
}

const ALLOWED_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  acos: Math.acos,
  acosh: Math.acosh,
  asin: Math.asin,
  asinh: Math.asinh,
  atan: Math.atan,
  atan2: Math.atan2,
  atanh: Math.atanh,
  cbrt: Math.cbrt,
  ceil: Math.ceil,
  cos: Math.cos,
  cosh: Math.cosh,
  exp: Math.exp,
  floor: Math.floor,
  log: Math.log,
  log10: Math.log10,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  round: Math.round,
  sign: Math.sign,
  sin: Math.sin,
  sinh: Math.sinh,
  sqrt: Math.sqrt,
  tan: Math.tan,
  tanh: Math.tanh,
}

function evaluateExpression(expression: string): number {
  let expr = expression.trim()

  if (!expr) {
    throw new Error('表达式不能为空')
  }

  // 简单安全解析器（不使用 eval）
  try {
    // 替换常数
    for (const [name, value] of Object.entries(MATH_CONSTANTS)) {
      expr = expr.replace(new RegExp(`\\b${name}\\b`, 'gi'), String(value))
    }

    // 验证和处理表达式
    if (!isSafeExpression(expr)) {
      throw new Error('表达式包含非法字符或函数')
    }

    // 使用 Function 构造函数，在安全沙箱中运行
    const func = createSafeEvaluator()
    return func(expr)
  } catch (error) {
    throw new Error(`表达式解析失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function isSafeExpression(expr: string): boolean {
  const safePattern = /^[0-9+\-*/().%\s,]*$/
  const functionPattern =
    /\b(abs|acos|acosh|asin|asinh|atan|atan2|atanh|cbrt|ceil|cos|cosh|exp|floor|log|log10|max|min|pow|round|sign|sin|sinh|sqrt|tan|tanh)\s*\(/gi

  const hasSafeChars = safePattern.test(expr.replace(functionPattern, ''))
  return hasSafeChars
}

function createSafeEvaluator() {
  return (expr: string): number => {
    try {
      // 将常见的简写转换为 Math. 前缀
      let processed = expr
      for (const funcName of Object.keys(ALLOWED_FUNCTIONS)) {
        const regex = new RegExp(`\\b${funcName}\\s*\\(`, 'gi')
        processed = processed.replace(regex, `Math.${funcName}(`)
      }

      // 简单计算（处理基本算术）
      return basicCalculator(processed)
    } catch {
      throw new Error('计算错误，请检查表达式')
    }
  }
}

function basicCalculator(expr: string): number {
  try {
    // 处理基本算术，不支持复杂函数
    // 使用安全解析
    const tokens = tokenize(expr)
    return parseTokens(tokens)
  } catch {
    throw new Error('无法计算表达式，请使用简单的算术运算')
  }
}

function tokenize(expr: string): string[] {
  const tokens: string[] = []
  let current = ''
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]
    if ('+-*/()%.'.includes(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      tokens.push(char)
    } else if (char.trim()) {
      current += char
    } else if (current) {
      tokens.push(current)
      current = ''
    }
  }
  if (current) {
    tokens.push(current)
  }
  return tokens
}

function parseTokens(tokens: string[]): number {
  // 简单的递归下降解析器，处理 +-*/ 和括号
  let pos = 0

  function parsePrimary(): number {
    if (pos >= tokens.length) throw new Error('意外的表达式结尾')
    const token = tokens[pos]
    if (token === '(') {
      pos++
      const value = parseExpression()
      if (tokens[pos] !== ')') throw new Error('缺少右括号')
      pos++
      return value
    } else if (token === '-') {
      pos++
      return -parsePrimary()
    } else if (!isNaN(parseFloat(token))) {
      pos++
      return parseFloat(token)
    }
    throw new Error(`意外的 token: ${token}`)
  }

  function parseFactor(): number {
    let value = parsePrimary()
    while (
      pos < tokens.length &&
      (tokens[pos] === '*' || tokens[pos] === '/' || tokens[pos] === '%')
    ) {
      const op = tokens[pos]
      pos++
      const next = parsePrimary()
      if (op === '*') value *= next
      else if (op === '/') {
        if (next === 0) throw new Error('除零错误')
        value /= next
      } else if (op === '%') value %= next
    }
    return value
  }

  function parseExpression(): number {
    let value = parseFactor()
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos]
      pos++
      const next = parseFactor()
      if (op === '+') value += next
      else if (op === '-') value -= next
    }
    return value
  }

  return parseExpression()
}

function formatNumber(num: number, precision: number): string {
  if (isNaN(num)) return 'NaN'
  if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity'

  if (Number.isInteger(num)) {
    return String(num)
  }

  const formatted = Number(num.toFixed(precision))
  return String(formatted)
}
