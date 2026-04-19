import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import MarkdownContent from '../components/MarkdownContent'
import './ArticlePage.css'

function formatDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function ArticlePage() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setNotFound(false)
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single()
      if (cancelled) return
      if (error || !data) {
        setArticle(null)
        setNotFound(true)
      } else {
        setArticle(data)
        // Best-effort view count bump
        supabase
          .from('articles')
          .update({ view_count: (data.view_count ?? 0) + 1 })
          .eq('id', data.id)
          .then(() => {})
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return <div className="article-loading">Loading…</div>
  }

  if (notFound || !article) {
    return (
      <div className="article-page">
        <div className="container article-inner">
          <Link to="/resources/articles" className="article-back">
            <ArrowLeft size={14} aria-hidden="true" />
            <span>All articles</span>
          </Link>
          <h1 className="article-title font-title">Article not found</h1>
          <p className="article-meta">
            The article you’re looking for doesn’t exist or hasn’t been published yet.
          </p>
        </div>
      </div>
    )
  }

  const dateText = formatDate(article.published_at || article.created_at)

  return (
    <div className="article-page">
      <SEO
        title={article.title}
        description={article.excerpt || `${article.title} — kalimba article on Kalimbaba.`}
        canonicalPath={`/resources/articles/${article.slug}`}
        ogType="article"
        image={article.cover_image_url || undefined}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt || undefined,
          image: article.cover_image_url || undefined,
          datePublished: article.published_at || article.created_at,
          dateModified: article.updated_at || article.created_at,
          author: article.author
            ? { '@type': 'Person', name: article.author }
            : { '@type': 'Organization', name: 'Kalimbaba' },
          publisher: {
            '@type': 'Organization',
            name: 'Kalimbaba',
            url: 'https://kalimbaba.com',
          },
          mainEntityOfPage: `https://kalimbaba.com/resources/articles/${article.slug}`,
        }}
      />

      <div className="container article-inner">
        <Link to="/resources/articles" className="article-back">
          <ArrowLeft size={14} aria-hidden="true" />
          <span>All articles</span>
        </Link>

        <header className="article-header">
          <h1 className="article-title font-title">{article.title}</h1>
          {(article.author || dateText) && (
            <p className="article-meta">
              {article.author && <span>{article.author}</span>}
              {article.author && dateText && <span aria-hidden="true"> · </span>}
              {dateText && <span>{dateText}</span>}
            </p>
          )}
          {article.excerpt && <p className="article-excerpt">{article.excerpt}</p>}
        </header>

        {article.cover_image_url && (
          <img
            className="article-cover"
            src={article.cover_image_url}
            alt={article.title}
          />
        )}

        <article className="article-body">
          <MarkdownContent content={article.content} />
        </article>
      </div>
    </div>
  )
}
