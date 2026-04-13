/**
 * Thin wrapper around GA4's gtag().
 * Replace G-XXXXXXXXXX in index.html with your real Measurement ID.
 */

function gtag(...args) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args)
  }
}

/** Call on every route change to track page views. */
export function trackPageView(path, title) {
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
  })
}

/** Track a custom event, e.g. trackEvent('play_song', { song: 'Yankee Doodle' }) */
export function trackEvent(eventName, params = {}) {
  gtag('event', eventName, params)
}
