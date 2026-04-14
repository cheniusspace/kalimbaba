import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CatalogPage from './pages/CatalogPage'
import SongPage from './pages/SongPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import FavoritesPage from './pages/FavoritesPage'
import AdminPage from './pages/AdminPage'
import KalimbaPage from './pages/KalimbaPage'
import ToolsPage from './pages/ToolsPage'
import ResourcesPage from './pages/ResourcesPage'
import ContactPage from './pages/ContactPage'
import { trackPageView } from './lib/analytics'
import './styles/global.css'

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
                <Route path="/contact"    element={<ContactPage />} />
              </Routes>
            </main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}
