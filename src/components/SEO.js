import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'Kalimbaba'
const BASE_URL = 'https://kalimbaba.com'
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`

/**
 * Per-page SEO tags.
 *
 * Props:
 *   title        – page title (appended with "| Kalimbaba")
 *   description  – meta description
 *   canonicalPath – path portion of the URL, e.g. "/song/yankee-doodle"
 *   image        – absolute OG image URL (defaults to site-wide image)
 *   ogType       – og:type value, default "website"
 *   noIndex      – pass true to block indexing (login, favorites, etc.)
 *   schema       – plain JS object or array rendered as JSON-LD
 */
export default function SEO({
  title,
  description,
  canonicalPath,
  image,
  ogType = 'website',
  noIndex = false,
  schema,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Free Kalimba Tabs`
  const metaDesc = description ?? 'Free kalimba tabs for beginners and beyond. Learn your favourite songs on the thumb piano with easy number-note tabs.'
  const canonical = `${BASE_URL}${canonicalPath ?? '/'}`
  const ogImage = image ?? DEFAULT_IMAGE

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter / X */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD structured data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  )
}
