import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import './ArticlesPage.css'

function formatDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, cover_image_url, author, tags, published_at, created_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setArticles(data ?? [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="hub-page articles-page">
      <SEO
        title="Articles"
        description="Long-form articles about kalimba: techniques, history, gear deep-dives, and playing tips."
        canonicalPath="/resources/articles"
      />

      <div className="container hub-page-inner articles-inner">
        <header className="hub-header">
          <Link to="/resources" className="articles-back">
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to resources</span>
          </Link>
          <p className="hub-kicker font-nav">Resources</p>
          <h1 className="hub-title font-title">Articles</h1>
          <p className="hub-lead">
            Deeper reading on kalimba — playing technique, history, gear, and tips.
          </p>
        </header>

        {loading ? (
          <p className="articles-empty">Loading articles…</p>
        ) : articles.length === 0 ? (
          <p className="articles-empty">
            No articles yet. Check back soon.
          </p>
        ) : (
          <div className="articles-grid">
            {articles.map((a) => (
              <Link
                key={a.id}
                to={`/resources/articles/${a.slug}`}
                className="article-card card"
              >
                {a.cover_image_url ? (
                  <div
                    className="article-card-cover"
                    style={{ backgroundImage: `url(${a.cover_image_url})` }}
                    aria-hidden="true"
                  />
                ) : (
                  <div className="article-card-cover article-card-cover--placeholder" aria-hidden="true">
                    <BookOpen size={28} strokeWidth={1.25} />
                  </div>
                )}
                <div className="article-card-body">
                  <h2 className="article-card-title font-title">{a.title}</h2>
                  {a.excerpt && <p className="article-card-excerpt">{a.excerpt}</p>}
                  <p className="article-card-meta">
                    {a.author && <span>{a.author}</span>}
                    {a.author && (a.published_at || a.created_at) && <span aria-hidden="true"> · </span>}
                    {(a.published_at || a.created_at) && (
                      <span>{formatDate(a.published_at || a.created_at)}</span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
