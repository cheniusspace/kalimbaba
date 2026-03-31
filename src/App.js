import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import SongPage from './pages/SongPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import FavoritesPage from './pages/FavoritesPage'
import AdminPage from './pages/AdminPage'
import './styles/global.css'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/"           element={<HomePage />} />
            <Route path="/catalog"    element={<CatalogPage />} />
            <Route path="/song/:slug" element={<SongPage />} />
            <Route path="/login"      element={<LoginPage />} />
            <Route path="/signup"     element={<SignupPage />} />
            <Route path="/favorites"  element={<FavoritesPage />} />
            <Route path="/admin"      element={<AdminPage />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
