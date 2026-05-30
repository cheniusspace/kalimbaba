import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PageLoadFallback from './components/PageLoadFallback'
import CatalogPage from './pages/CatalogPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import FavoritesPage from './pages/FavoritesPage'
import { trackPageView } from './lib/analytics'
import './styles/global.css'

const SongPage = lazy(() => import('./pages/SongPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const KalimbaPage = lazy(() => import('./pages/KalimbaPage'))
const ToolsPage = lazy(() => import('./pages/ToolsPage'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'))
const ArticlePage = lazy(() => import('./pages/ArticlePage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))

function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    trackPageView(location.pathname + location.search, document.title)
  }, [location])

  return null
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <RouteTracker />
            <Navbar />
            <main>
              <Suspense fallback={<PageLoadFallback />}>
                <Routes>
                  <Route path="/"           element={<CatalogPage />} />
                  <Route path="/catalog"    element={<CatalogPage />} />
                  <Route path="/song/:slug" element={<SongPage />} />
                  <Route path="/login"      element={<LoginPage />} />
                  <Route path="/signup"     element={<SignupPage />} />
                  <Route path="/favorites"  element={<FavoritesPage />} />
                  <Route path="/admin"      element={<AdminPage />} />
                  <Route path="/tools" element={<ToolsPage />} />
                  <Route path="/tools/virtual-kalimba" element={<KalimbaPage />} />
                  <Route path="/kalimba" element={<Navigate to="/tools/virtual-kalimba" replace />} />
                  <Route path="/resources" element={<ResourcesPage />} />
                  <Route path="/resources/articles" element={<ArticlesPage />} />
                  <Route path="/resources/articles/:slug" element={<ArticlePage />} />
                  <Route path="/contact"    element={<ContactPage />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}
