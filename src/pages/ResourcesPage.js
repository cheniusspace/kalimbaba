import { BookOpen, GraduationCap, Headphones, ShoppingBag, ExternalLink } from 'lucide-react'
import SEO from '../components/SEO'
import './ResourcesPage.css'

function OutLink({ href, children }) {
  return (
    <a href={href} className="resource-link" target="_blank" rel="noopener noreferrer">
      <span>{children}</span>
      <ExternalLink size={14} className="resource-link-icon" aria-hidden="true" />
    </a>
  )
}

export default function ResourcesPage() {
  return (
    <div className="hub-page resources-page">
      <SEO
        title="Resources"
        description="Curated kalimba resources: what to buy, where to learn, books and printed collections, and playlists and channels for inspiration."
        canonicalPath="/resources"
      />
      <div className="container hub-page-inner resources-inner">
        <header className="hub-header">
          <p className="hub-kicker font-nav">Kalimbaba</p>
          <h1 className="hub-title font-title">Resources</h1>
          <p className="hub-lead">
            A short, practical list to complement the song catalog—gear to consider, places to learn,
            books worth browsing, and music to listen to. We are not affiliated with sellers or creators
            listed here.
          </p>
        </header>

        <div className="resources-sections">
          <section className="resource-block card" aria-labelledby="res-shop-heading">
            <div className="resource-block-head">
              <span className="resource-block-icon" aria-hidden="true">
                <ShoppingBag size={22} strokeWidth={1.25} />
              </span>
              <h2 id="res-shop-heading" className="resource-block-title font-nav">
                Shopping list
              </h2>
            </div>
            <p className="resource-block-intro">
              Most tabs on this site assume a <strong>17-key kalimba in C major</strong> (the common
              “beginner” layout). When comparing models, check the tuning, number of tines, and whether the
              lowest note is middle C.
            </p>
            <ul className="resource-list">
              <li>
                <strong>Hugh Tracey</strong> — long-running Kalimba Magic line; reliable build and
                documentation.
              </li>
              <li>
                <strong>Gecko / similar wooden 17-key</strong> — widely available entry-level instruments;
                read recent reviews for quality control.
              </li>
              <li>
                <strong>Soft case &amp; tuning hammer</strong> — usually included; a clip-on tuner app on
                your phone is enough for day-to-day tuning.
              </li>
            </ul>
            <p className="resource-block-foot">
              For buyer advice from players, try community spaces such as{' '}
              <OutLink href="https://www.reddit.com/r/kalimba/">r/kalimba</OutLink> or forums linked from
              maker sites.
            </p>
          </section>

          <section className="resource-block card" aria-labelledby="res-learn-heading">
            <div className="resource-block-head">
              <span className="resource-block-icon" aria-hidden="true">
                <GraduationCap size={22} strokeWidth={1.25} />
              </span>
              <h2 id="res-learn-heading" className="resource-block-title font-nav">
                Tutorials &amp; learning
              </h2>
            </div>
            <ul className="resource-links">
              <li>
                <OutLink href="https://www.youtube.com/results?search_query=kalimba+tutorial+beginner">
                  YouTube — beginner kalimba tutorials
                </OutLink>
              </li>
              <li>
                <OutLink href="https://en.wikipedia.org/wiki/Mbira">Wikipedia — mbira / kalimba context</OutLink>
              </li>
              <li>
                <OutLink href="https://www.youtube.com/results?search_query=kalimba+reading+tabs+numbers">
                  YouTube — reading number / tab notation
                </OutLink>
              </li>
            </ul>
          </section>

          <section className="resource-block card" aria-labelledby="res-books-heading">
            <div className="resource-block-head">
              <span className="resource-block-icon" aria-hidden="true">
                <BookOpen size={22} strokeWidth={1.25} />
              </span>
              <h2 id="res-books-heading" className="resource-block-title font-nav">
                Books
              </h2>
            </div>
            <p className="resource-block-intro">
              Method books, song collections, and printed tabs can be a nice complement to online tabs—look
              for titles that match your <strong>17-key C major</strong> tuning if you want to play along
              with the notation style used here.
            </p>
            <ul className="resource-links">
              <li>
                <OutLink href="https://www.amazon.com/s?k=kalimba+book">
                  Amazon — search kalimba books
                </OutLink>
              </li>
              <li>
                <OutLink href="https://www.goodreads.com/search?q=kalimba">
                  Goodreads — kalimba titles &amp; reviews
                </OutLink>
              </li>
              <li>
                <OutLink href="https://www.google.com/search?tbm=bks&q=kalimba+music+book">
                  Google Books — kalimba &amp; mbira books
                </OutLink>
              </li>
            </ul>
          </section>

          <section className="resource-block card" aria-labelledby="res-listen-heading">
            <div className="resource-block-head">
              <span className="resource-block-icon" aria-hidden="true">
                <Headphones size={22} strokeWidth={1.25} />
              </span>
              <h2 id="res-listen-heading" className="resource-block-title font-nav">
                Listen &amp; play-along
              </h2>
            </div>
            <ul className="resource-links">
              <li>
                <OutLink href="https://www.youtube.com/results?search_query=kalimba+cover">
                  YouTube — kalimba covers and performances
                </OutLink>
              </li>
              <li>
                <OutLink href="https://open.spotify.com/search/kalimba%20cover">
                  Spotify — search “kalimba cover”
                </OutLink>
              </li>
              <li>
                <OutLink href="https://www.youtube.com/results?search_query=kalimba+relaxing+music">
                  YouTube — relaxing kalimba playlists
                </OutLink>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
