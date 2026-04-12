import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../markdown'

describe('renderMarkdown', () => {
  // --- Basic formatting ---

  it('should render bold text', () => {
    expect(renderMarkdown('**bold**')).toBe('<strong>bold</strong>')
  })

  it('should render italic text', () => {
    expect(renderMarkdown('*italic*')).toBe('<em>italic</em>')
  })

  it('should render inline code', () => {
    expect(renderMarkdown('`code`')).toBe('<code>code</code>')
  })

  it('should render code blocks', () => {
    expect(renderMarkdown('```\nconst x = 1\n```')).toBe(
      '<pre><code><br>const x = 1<br></code></pre>',
    )
  })

  it('should render strikethrough', () => {
    expect(renderMarkdown('~~deleted~~')).toBe('<del>deleted</del>')
  })

  it('should render links', () => {
    expect(renderMarkdown('[click](https://example.com)')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener">click</a>',
    )
  })

  it('should render newlines as <br>', () => {
    expect(renderMarkdown('line1\nline2')).toBe('line1<br>line2')
  })

  // --- Combined formatting ---

  it('should handle mixed formatting', () => {
    const result = renderMarkdown('**bold** and *italic* and `code`')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<code>code</code>')
  })

  // --- XSS prevention ---

  it('should escape HTML tags', () => {
    expect(renderMarkdown('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;',
    )
  })

  it('should escape ampersands', () => {
    expect(renderMarkdown('A & B')).toBe('A &amp; B')
  })

  it('should escape angle brackets in content', () => {
    expect(renderMarkdown('<img src=x onerror=alert(1)>')).toContain('&lt;img')
  })

  it('should not allow javascript: links', () => {
    const result = renderMarkdown('[click](javascript:alert(1))')
    expect(result).not.toContain('href="javascript:')
    // The regex only matches https?:// so javascript: links are not rendered as <a>
    expect(result).toBe('[click](javascript:alert(1))')
  })

  it('should only render http/https links', () => {
    const result = renderMarkdown('[click](ftp://example.com)')
    expect(result).not.toContain('<a')
  })

  // --- Edge cases ---

  it('should handle empty string', () => {
    expect(renderMarkdown('')).toBe('')
  })

  it('should handle plain text', () => {
    expect(renderMarkdown('just text')).toBe('just text')
  })

  it('should handle nested bold in italic', () => {
    // This tests the ordering of replacements
    const result = renderMarkdown('***bold italic***')
    expect(result).toContain('<strong>')
    expect(result).toContain('<em>')
  })
})
