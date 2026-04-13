import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'Kalimbaba'
const BASE_URL = 'https://kalimbaba.com'
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`

/**
 * Per-page SEO tags.
 * Usage: <SEO title="Song Title" description="..." />
 */
export default function SEO({ title, description, canonicalPath, image }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Free Kalimba Tabs`
  const metaDesc = description ?? 'Free kalimba tabs for beginners and beyond. Learn your favourite songs on the thumb piano with easy number-note tabs.'
  const canonical = `${BASE_URL}${canonicalPath ?? '/'}`
  const ogImage = image ?? DEFAULT_IMAGE

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  )
}
