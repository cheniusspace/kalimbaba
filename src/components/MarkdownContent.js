import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import './MarkdownContent.css'

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: false,
  mangle: false,
})

export default function MarkdownContent({ content, className = '' }) {
  const html = useMemo(() => {
    if (!content) return ''
    const raw = marked.parse(String(content))
    return DOMPurify.sanitize(raw, {
      ADD_ATTR: ['target', 'rel'],
    })
  }, [content])

  if (!html) return null

  return (
    <div
      className={`markdown-body ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
