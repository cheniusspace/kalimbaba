import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import { Analytics } from '@vercel/analytics/react'
import './styles/global.css'

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Analytics />
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
                <Route path="/kalimba"    element={<KalimbaPage />} />
              </Routes>
            </main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}
