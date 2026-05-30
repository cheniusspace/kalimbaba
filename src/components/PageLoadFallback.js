import './PageLoadFallback.css'

export default function PageLoadFallback() {
  return (
    <div className="page-load-fallback" role="status" aria-live="polite">
      Loading…
    </div>
  )
}
